// Tests examples/electron-minimal/lt-client.js with node child processes standing in for utilityProcess.
import { afterEach, describe, expect, it } from 'vitest';
import { fork as nodeFork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createLtClient } from '../../examples/electron-minimal/lt-client.js';

const checkerPath = fileURLToPath(new URL('./fixtures/fake-checker.js', import.meta.url));

// utilityProcess-like adapter around child_process.fork
function fork(path, args, opts) {
  const c = nodeFork(path, args, { env: opts.env, stdio: ['ignore', 'inherit', 'inherit', 'ipc'] });
  return {
    postMessage: (m) => c.send(m),
    on: (ev, cb) => c.on(ev, cb),
    kill: () => c.kill('SIGKILL'),
  };
}

const clients = [];
// creates a client with short timings and registers it for cleanup
function make(opts = {}) {
  const c = createLtClient({ checkerPath, fork, languages: ['de-DE', 'en-US'], timeoutMs: 500, restartDelayMs: 20, ...opts });
  clients.push(c);
  return c;
}
// resolves on the next emission of an event
const once = (c, ev) => new Promise((r) => c.once(ev, r));

afterEach(() => { while (clients.length) clients.pop().stop(); });

describe('lt-client', () => {
  it('becomes ready with warm-up languages and answers checks', async () => {
    const c = make();
    expect(c.status()).toBe('stopped');
    const langs = await c.start();
    expect(langs).toEqual(['de-DE', 'en-US']);
    expect(c.status()).toBe('ready');
    expect((await c.check('hi', {})).text).toBe('hi');
    expect(await c.ping()).toBe(true);
  });

  it('rejects a hanging check with timeout and restarts', async () => {
    const c = make();
    await c.start();
    const restarted = once(c, 'restart');
    await expect(c.check('hang', {})).rejects.toThrow('timeout');
    await restarted;
    expect((await c.check('again', {})).text).toBe('again');
    expect(c.status()).toBe('ready');
  });

  it('restarts after a crash and rejects pending requests', async () => {
    const c = make();
    await c.start();
    const p = c.check('crash', {});
    await expect(p).rejects.toThrow('exited');
    expect((await c.check('after', {})).text).toBe('after');
  });

  it('restart() rejects pending with restarted and gives a fresh process', async () => {
    const c = make({ timeoutMs: 5000 });
    await c.start();
    const pid1 = (await c.check('x', {})).pid;
    const p = c.check('hang', {});
    p.catch(() => {});
    await new Promise((r) => setTimeout(r, 50));
    await c.restart();
    await expect(p).rejects.toThrow('restarted');
    expect((await c.check('x', {})).pid).not.toBe(pid1);
  });

  it('check() issued in the same tick as restart() is rejected or answered, never hangs', async () => {
    process.env.LTJS_FAKE_WARMUP_MS = '200';
    try {
      const c = make({ timeoutMs: 3000 });
      await c.start();
      const t0 = Date.now();
      const p = c.check('same-tick', {});
      const r = c.restart();
      const res = await p.then((v) => v, (e) => e);
      expect(Date.now() - t0).toBeLessThan(2500);
      if (res instanceof Error) expect(res.message).toBe('restarted');
      else expect(res.text).toBe('same-tick');
      await r;
      expect(c.status()).toBe('ready');
    } finally { delete process.env.LTJS_FAKE_WARMUP_MS; }
  });

  it('check() during starting is delivered after ready', async () => {
    process.env.LTJS_FAKE_WARMUP_MS = '200';
    try {
      const c = make({ timeoutMs: 3000 });
      const s = c.start();
      await new Promise((r) => setTimeout(r, 30));
      expect(c.status()).toBe('starting');
      expect((await c.check('early', {})).text).toBe('early');
      await s;
    } finally { delete process.env.LTJS_FAKE_WARMUP_MS; }
  });

  it('timeout of an old-generation request does not trigger a restart', async () => {
    const c = make({ timeoutMs: 400 });
    await c.start();
    const p = c.check('hang', {});
    p.catch(() => {});
    await new Promise((r) => setTimeout(r, 50));
    let restarts = 0;
    c.on('restart', () => { restarts++; });
    await c.restart(); // rejects p with 'restarted' before its timeout
    await expect(p).rejects.toThrow('restarted');
    await new Promise((r) => setTimeout(r, 500));
    expect(restarts).toBe(1);
    expect(c.status()).toBe('ready');
  });

  it('stop() does not restart', async () => {
    const c = make();
    await c.start();
    c.stop();
    await new Promise((r) => setTimeout(r, 150));
    expect(c.status()).toBe('stopped');
    await expect(c.check('x', {})).rejects.toThrow('stopped');
  });

  it('emits error after maxRestarts crashes', async () => {
    const c = make({ maxRestarts: 2, timeoutMs: 2000 });
    const err = once(c, 'error');
    await c.start();
    for (let i = 0; i < 3; i++) await c.check('crash', {}).catch(() => {});
    expect((await err).message).toBe('too many restarts');
    expect(c.status()).toBe('crashed');
  });
});
