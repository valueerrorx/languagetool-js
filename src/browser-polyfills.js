// Globals the ported core expects from Node, for browsers/workers (imported first by browser-entry.js; a no-op where they exist):
// Buffer (npm package buffer) and a minimal process (env, cwd, stdout/stderr -> console, hrtime.bigint, exit throws).
import { Buffer } from 'buffer';

if (globalThis.Buffer === undefined) globalThis.Buffer = Buffer;

if (globalThis.process === undefined) {
  const writer = (log) => ({ write: (s) => { log(String(s).replace(/\n$/, '')); return true; } });
  globalThis.process = {
    env: {},
    versions: {}, // no versions.node: Node-only paths stay off
    argv: [],
    platform: 'browser',
    cwd: () => '/',
    stdout: writer(console.log),
    stderr: writer(console.error),
    hrtime: { bigint: () => BigInt(Math.round(performance.now() * 1e6)) },
    exit: (code) => { throw new Error(`process.exit(${code})`); },
  };
}
