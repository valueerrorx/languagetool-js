// JS twin of case kind "cli" for the server start cases: runs bin/lt-server.mjs in the work dir (docs/review/F20-oracle.md).
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';
import { snapshotFiles } from '../lib/cli-run.mjs';

const FIXED = '2026-03-15T10:00:00+01:00';

// run(cs, {workDir}) -> {exitCode, stdout, stderr, files}
export async function run(cs, { workDir }) {
  const isServer = cs.mainClass === 'org.languagetool.server.HTTPServer';
  const bin = path.join(ROOT, isServer ? 'bin/lt-server.mjs' : 'bin/lt-cli.mjs');
  if (!isServer && (cs.jar || cs.mainClass || !existsSync(bin))) {
    throw Object.assign(new Error(`cli case ${cs.mainClass ?? cs.jar ?? 'commandline'} not ported`), { notPorted: true });
  }
  mkdirSync(path.join(workDir, 'home'), { recursive: true });
  for (const [rel, content] of Object.entries(cs.files ?? {})) {
    mkdirSync(path.dirname(path.join(workDir, rel)), { recursive: true });
    writeFileSync(path.join(workDir, rel), content);
  }
  for (const [rel, b64] of Object.entries(cs.filesB64 ?? {})) {
    mkdirSync(path.dirname(path.join(workDir, rel)), { recursive: true });
    writeFileSync(path.join(workDir, rel), Buffer.from(b64, 'base64'));
  }
  const before = snapshotFiles(workDir);
  const child = spawn(process.execPath, [bin, ...(cs.args ?? [])], {
    cwd: workDir, env: { ...process.env, LTJS_FIXED_TIME: FIXED, TZ: 'Europe/Vienna', ...(cs.env ?? {}) }, stdio: ['pipe', 'pipe', 'pipe'],
  });
  const out = [];
  const err = [];
  child.stdout.on('data', (d) => out.push(d));
  child.stderr.on('data', (d) => err.push(d));
  const exit = new Promise((res) => child.on('close', (code, signal) => res(signal === 'SIGTERM' ? 143 : (code ?? 1))));
  // long-running server: stop it once the pattern appeared on stdout
  if (cs.stopOnOutput) {
    const re = new RegExp(cs.stopOnOutput);
    const t0 = Date.now();
    const iv = setInterval(() => {
      if (re.test(Buffer.concat(out).toString()) || Date.now() - t0 > 60000) { clearInterval(iv); setTimeout(() => child.kill('SIGTERM'), 300); }
    }, 100);
    child.on('close', () => clearInterval(iv));
  }
  child.stdin.on('error', () => {});
  child.stdin.end(Buffer.from(cs.stdin ?? '', 'utf8'));
  const exitCode = await exit;
  const after = snapshotFiles(workDir);
  const files = {};
  for (const [k, v] of Object.entries(after)) if (before[k] !== v) files[k] = v;
  return { exitCode, stdout: Buffer.concat(out).toString('utf8'), stderr: Buffer.concat(err).toString('utf8'), files };
}
