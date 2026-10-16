import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { JDK, LT, ROOT, pinnedEnv, pinnedJvmFlags } from './env.mjs';

const servers = new Map(); // serverArgs JSON -> { port, child, stderr[], workDir }

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
    s.on('error', reject);
  });
}

// One HTTPServer JVM per distinct serverArgs and per oracle run (docs/ORACLE.md 2).
export async function getServer(serverArgs = [], env = {}, files = {}) {
  const key = JSON.stringify([serverArgs, env, files]);
  if (servers.has(key)) return servers.get(key);
  const workDir = mkdtempSync(path.join(tmpdir(), 'ltjs-oracle-srv-'));
  mkdirSync(path.join(workDir, 'home'));
  mkdirSync(path.join(workDir, 'tmp'));
  for (const [rel, content] of Object.entries(files)) writeFileSync(path.join(workDir, rel), content);
  const port = await freePort();
  const cp = path.join(LT, 'languagetool-server.jar');
  const args = [...pinnedJvmFlags(workDir), '-cp', cp, 'org.languagetool.server.HTTPServer', '--port', String(port), ...serverArgs.map((a) => a.split('{WORK}').join(workDir))];
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
}

// request: {method, path, params, body, contentType, headers}; params go in the query (GET) or a form body (POST).
export async function doRequest(base, req) {
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
  if (req.expect) out.expect = req.expect; // e.g. "dev006": Java result differs from the port by an approved deviation
  if (req.portLater) out.portLater = true; // language module not ported yet
  return out;
}

export async function runHttp(cs) {
  const srv = await getServer(cs.serverArgs ?? [], cs.env ?? {}, cs.files ?? {});
  const base = `http://127.0.0.1:${srv.port}`;
  const responses = [];
  for (const r of cs.requests) responses.push(await doRequest(base, r));
  return { workDir: srv.workDir, tmpDir: srv.tmpDir, responses };
}

export { ROOT };
