// JS twin of case kind "http": starts bin/lt-server.mjs per case file and sends cs.requests (docs/review/F20-oracle.md).
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';
import { doRequest } from '../lib/http-run.mjs';

const FIXED = '2026-03-15T10:00:00+01:00';
// endpoints answered by later steps (ApiV2 throws notPortedYet): a case that uses them is notPorted as a whole; remove an entry when its step lands
const LATER_ENDPOINTS = /\/v2\/(languages|info|configinfo|words|words\/add|words\/delete|admin\/refreshUser|users\/me)$/;

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
    s.on('error', reject);
  });
}

// old F03 smoke case X-ORACLE-CHECK/http-check checks default rule sets (spelling, grammar, German) without per-request markers: notPorted until the rule steps land
const NEEDS_FULL_RULES = (cs) => cs.description === '/v2/check de-DE and en-US, error path, languages';

// run(cs, {workDir}) -> {responses}
export async function run(cs, { workDir }) {
  if (NEEDS_FULL_RULES(cs)) throw Object.assign(new Error('case needs the full language rule lists'), { notPorted: true });
  for (const r of cs.requests) {
    if (LATER_ENDPOINTS.test(r.path.split('?')[0])) throw Object.assign(new Error(`endpoint ${r.path} not ported yet`), { notPorted: true });
  }
  for (const [rel, content] of Object.entries(cs.files ?? {})) {
    mkdirSync(path.dirname(path.join(workDir, rel)), { recursive: true });
    writeFileSync(path.join(workDir, rel), content);
  }
  const port = await freePort();
  const args = ['bin/lt-server.mjs', '--port', String(port), ...(cs.serverArgs ?? []).map((a) => a.split('{WORK}').join(workDir))];
  const child = spawn(process.execPath, args, { cwd: ROOT, env: { ...process.env, LTJS_FIXED_TIME: FIXED, TZ: 'Europe/Vienna', ...(cs.env ?? {}) }, stdio: ['ignore', 'pipe', 'pipe'] });
  const log = [];
  child.stdout.on('data', (d) => log.push(d));
  child.stderr.on('data', (d) => log.push(d));
  try {
    const t0 = Date.now();
    for (;;) {
      if (child.exitCode !== null) throw new Error(`server exited early: ${Buffer.concat(log).toString()}`);
      try {
        const r = await fetch(`http://127.0.0.1:${port}/v2/healthcheck`);
        if (r.ok) break;
      } catch { /* not up yet */ }
      if (Date.now() - t0 > 60000) throw new Error('server start timeout');
      await new Promise((r) => setTimeout(r, 100));
    }
    const base = `http://127.0.0.1:${port}`;
    const responses = [];
    for (const r of cs.requests) responses.push(await doRequest(base, r));
    return { responses };
  } finally {
    child.kill('SIGKILL');
  }
}
