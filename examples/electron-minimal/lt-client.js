// Electron main side: supervises the LanguageTool utility process (ready, timeout, restart, crash recovery).
import { EventEmitter } from 'node:events';
import { fileURLToPath } from 'node:url';

// Java: none (example code)
export function createLtClient({
  checkerPath = fileURLToPath(new URL('./checker-process.js', import.meta.url)),
  languages = ['de-DE'],
  timeoutMs = 30000,
  maxOldSpaceMb = 3072,
  restartDelayMs = 1000,
  maxRestarts = 5,
  fork,
} = {}) {
  const emitter = new EventEmitter();
  let forkFn = fork;
  let child = null;
  let gen = 0; // identifies the current child; exits of older children are ignored
  let status = 'stopped';
  let nextId = 1;
  let restartTimer = null;
  let restartTimes = [];
  let supportedLanguages = [];
  const pending = new Map(); // id -> { resolve, reject, timer }
  const waiters = []; // { resolve, reject } waiting for ready
  const pings = [];

  // resolves the process fork function (electron only when none was injected)
  async function loadFork() {
    if (!forkFn) forkFn = (await import('electron')).utilityProcess.fork;
  }

  // rejects all in-flight requests with the given error message
  function rejectPending(message) {
    for (const [id, p] of pending) {
      clearTimeout(p.timer);
      pending.delete(id);
      p.reject(new Error(message));
    }
  }

  // rejects everybody waiting for ready
  function rejectWaiters(message) {
    for (const w of waiters.splice(0)) w.reject(new Error(message));
  }

  // resolves when the child is ready (rejects when stopped or restarts are exhausted)
  function whenReady() {
    if (status === 'ready') return Promise.resolve(supportedLanguages);
    if (status === 'stopped') return Promise.reject(new Error('stopped'));
    return new Promise((resolve, reject) => waiters.push({ resolve, reject }));
  }

  // forks the utility process and wires its events
  function spawn() {
    if (child) { try { child.kill(); } catch { /* already gone */ } child = null; }
    const myGen = ++gen;
    status = 'starting';
    const c = forkFn(checkerPath, [], {
      serviceName: 'ltjs',
      execArgv: [`--max-old-space-size=${maxOldSpaceMb}`],
      env: { ...process.env, LTJS_WARMUP: languages.join(',') },
    });
    child = c;
    c.on('message', (msg) => {
      if (myGen !== gen || !msg) return;
      if (msg.type === 'ready') {
        status = 'ready';
        supportedLanguages = msg.languages ?? [];
        emitter.emit('ready', supportedLanguages);
        for (const w of waiters.splice(0)) w.resolve(supportedLanguages);
      } else if (msg.type === 'pong') {
        for (const p of pings.splice(0)) { clearTimeout(p.timer); p.resolve(true); }
      } else if (pending.has(msg.id)) {
        const p = pending.get(msg.id);
        pending.delete(msg.id);
        clearTimeout(p.timer);
        if (msg.error) p.reject(new Error(msg.error));
        else p.resolve(msg.result);
      }
    });
    c.on('exit', (code) => {
      emitter.emit('exit', code);
      if (myGen === gen) onUnexpectedExit();
    });
  }

  // handles a crash/OOM: rejects pending requests, schedules a restart or gives up
  function onUnexpectedExit() {
    status = 'crashed';
    child = null;
    rejectPending('exited');
    const now = Date.now();
    restartTimes = restartTimes.filter((t) => now - t < 60000);
    if (restartTimes.length >= maxRestarts) {
      rejectWaiters('too many restarts');
      if (emitter.listenerCount('error') > 0) emitter.emit('error', new Error('too many restarts'));
      return;
    }
    restartTimes.push(now);
    restartTimer = setTimeout(() => {
      restartTimer = null;
      emitter.emit('restart');
      spawn();
    }, restartDelayMs);
  }

  // kills the current child without triggering the auto restart
  function killChild() {
    clearTimeout(restartTimer);
    restartTimer = null;
    gen++;
    const old = child;
    child = null;
    try { old?.kill(); } catch { /* already gone */ }
  }

  const client = Object.assign(emitter, {
    // starts the utility process, resolves when it is ready (after warm-up)
    async start() {
      if (status === 'stopped') {
        await loadFork();
        restartTimes = [];
        spawn();
      }
      return whenReady();
    },
    // sends a check request; rejects with Error('timeout') and restarts the process when it hangs
    async check(text, options) {
      let timer;
      const limit = new Promise((_, reject) => {
        timer = setTimeout(() => reject(Object.assign(new Error('timeout'), { ltTimeout: true })), timeoutMs);
      });
      let id = 0;
      let postedGen = -1; // generation of the child the request was posted to
      try {
        await Promise.race([whenReady(), limit]);
        // a restart may have begun while the ready promise was resolving: wait again
        while (status !== 'ready' || !child) await Promise.race([whenReady(), limit]);
        id = nextId++;
        postedGen = gen;
        const answer = new Promise((resolve, reject) => {
          pending.set(id, { resolve, reject, timer: null, gen: postedGen });
          child.postMessage({ id, text, options });
        });
        return await Promise.race([answer, limit]);
      } catch (e) {
        if (e?.ltTimeout) {
          pending.delete(id);
          // only restart when the request belonged to the current child
          if (postedGen === gen) client.restart().catch(() => {});
        }
        throw e;
      } finally {
        clearTimeout(timer);
      }
    },
    // health check: resolves true when the child answers a ping in time
    async ping() {
      await whenReady();
      return new Promise((resolve, reject) => {
        const p = { resolve, timer: setTimeout(() => { pings.splice(pings.indexOf(p), 1); reject(new Error('timeout')); }, timeoutMs) };
        pings.push(p);
        child.postMessage({ type: 'ping' });
      });
    },
    // kills the process and starts a fresh one (re-initialises LanguageTool, e.g. after updating resources)
    async restart() {
      killChild();
      status = 'starting';
      rejectPending('restarted');
      await loadFork();
      if (status !== 'starting' || child) return whenReady(); // stopped or superseded meanwhile
      emitter.emit('restart');
      spawn();
      return whenReady();
    },
    // kills the process for good, no auto restart
    stop() {
      killChild();
      status = 'stopped';
      rejectPending('stopped');
      rejectWaiters('stopped');
    },
    // 'starting' | 'ready' | 'stopped' | 'crashed'
    status() {
      return status;
    },
  });
  return client;
}
