import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { JDK, LT, ROOT, pinnedEnv, pinnedJvmFlags } from './env.mjs';
import { doRequestExtra } from './http-extra.mjs';

const servers = new Map(); // serverArgs JSON -> { port, child, stderr[], workDir }

// ORACLE_PORT_MIN/ORACLE_PORT_MAX restrict the port search (parallel oracle runs).
async function freePort() {
  const lo = Number(process.env.ORACLE_PORT_MIN ?? 0);
  const hi = Number(process.env.ORACLE_PORT_MAX ?? 0);
  if (lo > 0 && hi >= lo) {
    for (let p = lo; p <= hi; p++) {
      const ok = await new Promise((resolve) => { const s = net.createServer(); s.once('error', () => resolve(false)); s.listen(p, '127.0.0.1', () => s.close(() => resolve(true))); });
      if (ok) return p;
    }
    throw new Error('no free port in range');
  }
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
    s.on('error', reject);
  });
}

// One HTTPServer JVM per distinct serverArgs and per oracle run (docs/ORACLE.md 2).
// opts.realLogging: jar's own logback.xml (X-LOGS); opts.isolate: private JVM for this case (log capture includes startup)
export async function getServer(serverArgs = [], env = {}, files = {}, opts = {}) {
  const key = JSON.stringify([serverArgs, env, files, opts]);
  if (servers.has(key)) return servers.get(key);
  const workDir = mkdtempSync(path.join(tmpdir(), 'ltjs-oracle-srv-'));
  mkdirSync(path.join(workDir, 'home'));
  mkdirSync(path.join(workDir, 'tmp'));
  for (const [rel, content] of Object.entries(files)) { mkdirSync(path.dirname(path.join(workDir, rel)), { recursive: true }); writeFileSync(path.join(workDir, rel), content.split('{WORK}').join(workDir)); } // {WORK} in file content: absolute paths (F66)
  const port = await freePort();
  const cp = path.join(LT, 'languagetool-server.jar');
  const args = [...pinnedJvmFlags(workDir, opts.javaOpts ?? [], opts), '-cp', cp, 'org.languagetool.server.HTTPServer', '--port', String(port), ...serverArgs.map((a) => a.split('{WORK}').join(workDir))];
  const child = spawn(`${JDK}/bin/java`, args, { cwd: LT, env: pinnedEnv(workDir, env), stdio: ['ignore', 'pipe', 'pipe'] });
  const stderr = [];
  child.stdout.on('data', (d) => stderr.push(d));
  child.stderr.on('data', (d) => stderr.push(d));
  const srv = { port, child, stderr, startupOutput: () => Buffer.concat(stderr).toString(), workDir, tmpDir: path.join(workDir, 'tmp') };
  servers.set(key, srv);
  const t0 = Date.now();
  for (;;) {
    if (child.exitCode !== null) throw new Error(`server exited early: ${Buffer.concat(stderr).toString()}`);
    try {
      const r = await fetch(`http://127.0.0.1:${port}/v2/healthcheck`);
      if (r.ok) break;
    } catch { /* not up yet */ }
    if (Date.now() - t0 > 60000) throw new Error('server start timeout');
    await new Promise((r) => setTimeout(r, 200));
  }
  return srv;
}

export function stopServers() {
  for (const s of servers.values()) { s.child.kill('SIGKILL'); rmSync(s.workDir, { recursive: true, force: true }); }
  servers.clear();
  for (const d of retired.splice(0)) rmSync(d, { recursive: true, force: true });
}

// isolated servers are stopped right after their case (their work dir stays until stopServers, meta.json refers to it)
const retired = [];
function retireServer(srv) {
  for (const [k, v] of servers) if (v === srv) servers.delete(k);
  srv.child.kill('SIGKILL');
  retired.push(srv.workDir);
}

// request: {method, path, params, body, contentType, headers}; params go in the query (GET) or a form body (POST).
export async function doRequest(base, req) {
  if (req.localAddress || req.hold) return doRequestExtra(base, req, doRequest); // F66/F67: source address, held-open request
  const method = req.method ?? 'GET';
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(req.params ?? {})) for (const x of [].concat(v)) params.append(k, x);
  let url = base + req.path;
  const init = { method, headers: { ...(req.headers ?? {}) } };
  if (method === 'GET' || method === 'HEAD') {
    if ([...params].length) url += (url.includes('?') ? '&' : '?') + params.toString();
  } else if (req.body !== undefined) {
    init.body = req.body;
    init.headers['Content-Type'] = req.contentType ?? 'text/plain; charset=utf-8';
  } else {
    init.body = params.toString();
    init.headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=utf-8';
  }
  let res;
  let text;
  try {
    res = await fetch(url, init);
    text = await res.text();
  } catch {
    // connection closed without response (e.g. /v2/stop): recorded as status 0
    return { status: 0, contentType: '', accessControlAllowOrigin: null, body: '' };
  }
  const ct = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  let body = text;
  if (ct === 'application/json') { try { body = JSON.parse(text); } catch { body = text; } }
  const out = { status: res.status, contentType: ct, accessControlAllowOrigin: res.headers.get('access-control-allow-origin'), body };
  if (req.recordHeaders) out.headers = Object.fromEntries(req.recordHeaders.map((h) => [h.toLowerCase(), res.headers.get(h)])); // selected response headers
  if (req.expect) out.expect = req.expect; // e.g. "dev006": Java result differs from the port by an approved deviation
  if (req.languagesList) out.languagesList = true; // /v2/languages: comparator restricts the Java list to in-scope languages (DEV-006)
  if (req.portLater) out.portLater = true; // language module not ported yet
  return out;
}

// {parallel:[req...], stagger?:ms}: concurrent requests; result {parallel:true, count, statusCounts, bodies:[{status,body,n}]} (sorted, arrival order is not deterministic)
// with stagger the requests start in order, `stagger` ms apart, and the result keeps the request order: {parallel:true, ordered:[response...]}
export async function doParallel(base, group) {
  const out = await Promise.all(group.parallel.map(async (r, i) => {
    if (group.stagger) await new Promise((res) => setTimeout(res, group.stagger * i));
    return doRequest(base, r);
  }));
  if (group.stagger) return { parallel: true, ordered: out };
  const statusCounts = {};
  const bodies = new Map();
  for (const r of out) {
    statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1;
    const k = JSON.stringify([r.status, r.body]);
    bodies.set(k, { status: r.status, body: r.body, n: (bodies.get(k)?.n ?? 0) + 1 });
  }
  return { parallel: true, count: out.length, statusCounts, bodies: [...bodies.values()].sort((a, b) => (JSON.stringify([a.status, a.body]) < JSON.stringify([b.status, b.body]) ? -1 : 1)) };
}

// one request item: plain request, {parallel}, or {sleep: ms} (no response entry)
export async function doItem(base, r) {
  if (r.parallel) return doParallel(base, r);
  return doRequest(base, r);
}

// waits until the server output was quiet for `quietMs`
export async function quietLog(srv, quietMs = 600) {
  let n = -1;
  for (let i = 0; i < 100; i++) {
    const len = Buffer.concat(srv.stderr).length;
    if (len === n) break;
    n = len;
    await new Promise((r) => setTimeout(r, quietMs));
  }
  return srv.startupOutput();
}

export async function runHttp(cs) {
  const srv = await getServer(cs.serverArgs ?? [], cs.env ?? {}, cs.files ?? {}, { ...(cs.realLogging ? { realLogging: true } : {}), ...(cs.javaOpts ? { javaOpts: cs.javaOpts } : {}), ...(cs.isolate ? { isolate: String(cs.isolate) } : {}) });
  const base = `http://127.0.0.1:${srv.port}`;
  const responses = [];
  for (const r of cs.requests) {
    if (r.sleep) { await new Promise((res) => setTimeout(res, r.sleep)); continue; }
    responses.push(await doItem(base, r));
  }
  const log = cs.captureLog ? await quietLog(srv) : undefined;
  if (cs.stopAfter) { srv.child.kill('SIGKILL'); rmSync(srv.workDir, { recursive: true, force: true }); for (const [k, v] of servers) if (v === srv) servers.delete(k); } // F66/F67: many distinct servers per run
  if (cs.isolate) retireServer(srv);
  return { workDir: srv.workDir, tmpDir: srv.tmpDir, responses, log };
}

export { ROOT };
