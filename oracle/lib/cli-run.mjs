import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { JDK, LT, pinnedEnv, pinnedJvmFlags } from './env.mjs';

// Files below the work dir except home/ and tmp/: relative path -> utf8 text, or "sha256:<hex>" for non-UTF-8 content.
export function snapshotFiles(workDir, skip = ['home', 'tmp']) {
  const out = {};
  const walk = (dir, rel) => {
    for (const name of readdirSync(dir).sort()) {
      const r = rel ? `${rel}/${name}` : name;
      if (!rel && skip.includes(name)) continue;
      const p = path.join(dir, name);
      if (statSync(p).isDirectory()) { walk(p, r); continue; }
      const buf = readFileSync(p);
      const txt = buf.toString('utf8');
      out[r] = Buffer.from(txt, 'utf8').equals(buf) ? txt : `sha256:${createHash('sha256').update(buf).digest('hex')}`;
    }
  };
  walk(workDir, '');
  return out;
}

// Runs the original command line tool: args/stdin/env/input files in a fresh work dir.
// Returns files created or changed (path -> content), stdout/stderr as text.
export async function runCli(cs) {
  const workDir = mkdtempSync(path.join(tmpdir(), 'ltjs-oracle-'));
  mkdirSync(path.join(workDir, 'home'));
  mkdirSync(path.join(workDir, 'tmp'));
  for (const [rel, content] of Object.entries(cs.files ?? {})) {
    mkdirSync(path.dirname(path.join(workDir, rel)), { recursive: true });
    writeFileSync(path.join(workDir, rel), content);
  }
  const before = snapshotFiles(workDir);
  const jar = path.join(LT, cs.jar ?? 'languagetool-commandline.jar');
  const args = [...pinnedJvmFlags(workDir, cs.javaOpts ?? []), '-jar', jar, ...(cs.args ?? [])];
  const child = spawn(`${JDK}/bin/java`, args, { cwd: workDir, env: pinnedEnv(workDir, cs.env ?? {}), stdio: ['pipe', 'pipe', 'pipe'] });
  const out = [];
  const err = [];
  child.stdout.on('data', (d) => out.push(d));
  child.stderr.on('data', (d) => err.push(d));
  const exit = new Promise((res) => child.on('close', (code) => res(code)));
  child.stdin.on('error', () => {});
  child.stdin.end(cs.stdin ?? '');
  const exitCode = await exit;
  const after = snapshotFiles(workDir);
  const files = {};
  for (const [k, v] of Object.entries(after)) if (before[k] !== v) files[k] = v;
  return { workDir, tmpDir: path.join(workDir, 'tmp'), exitCode, stdout: Buffer.concat(out).toString('utf8'), stderr: Buffer.concat(err).toString('utf8'), files };
}
