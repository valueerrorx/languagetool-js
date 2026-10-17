import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { JDK, LT, ROOT, pinnedEnv, pinnedJvmFlags } from './env.mjs';

// Runs one long-lived harness JVM; sends all ops as JSON lines, returns raw lines.
export async function runHarness(cs) {
  const workDir = mkdtempSync(path.join(tmpdir(), 'ltjs-oracle-'));
  mkdirSync(path.join(workDir, 'home'));
  mkdirSync(path.join(workDir, 'tmp'));
  const ops = cs.ops.map((o, i) => ({ id: o.id ?? i + 1, ...o }));
  const requests = ops.map((o) => JSON.stringify(o)).join('\n') + '\n';
  const shim = cs.shim ? `${path.join(ROOT, 'oracle/harness/build-shim')}:` : '';
  const cp = `${shim}${path.join(LT, 'languagetool-server.jar')}:${path.join(ROOT, 'oracle/harness/build')}`;
  const args = [...pinnedJvmFlags(workDir, cs.javaOpts ?? []), '-cp', cp, 'ltjs.oracle.Harness'];
  const child = spawn(`${JDK}/bin/java`, args, {
    cwd: workDir, env: pinnedEnv(workDir, cs.env ?? {}), stdio: ['pipe', 'pipe', 'pipe'],
  });
  const out = [];
  const err = [];
  child.stdout.on('data', (d) => out.push(d));
  child.stderr.on('data', (d) => err.push(d));
  const exit = new Promise((res) => child.on('close', (code) => res(code)));
  child.stdin.end(requests);
  const exitCode = await exit;
  const nResp = Buffer.concat(out).toString('utf8').split('\n').filter((l) => l.length > 0).length;
  if (nResp !== ops.length) throw new Error(`harness truncated: ${nResp} responses for ${ops.length} requests (exit ${exitCode})`);
  return {
    workDir, tmpDir: path.join(workDir, 'tmp'), requests,
    responses: Buffer.concat(out).toString('utf8'), stderr: Buffer.concat(err), exitCode,
  };
}
