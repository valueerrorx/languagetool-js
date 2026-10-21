// JS: execution backends of the text checker pool: worker threads (server) or the main thread (unit tests, fault injection)
import os from 'node:os';
import { Worker } from 'node:worker_threads';
import { InterruptedException, RuntimeException } from '../../lib/java/errors.js';
import { checkResultsFromDto, configToDto, reviveError, ruleMatchFromDto } from './transport.js';

// JS: maximum number of real worker threads (the pool model of the Java threads is independent of it)
export function maxRealWorkers(poolThreads) {
  const cap = process.env.LTJS_MAX_WORKERS !== undefined ? Number(process.env.LTJS_MAX_WORKERS) : os.availableParallelism();
  return Math.max(1, Math.min(poolThreads, cap));
}

// job = {promise, interrupt()}; promise resolves with the list of CheckResults
export class WorkerBackend {
  // config: HTTPServerConfig; poolThreads: maxTextCheckerThreads
  constructor(config, poolThreads) {
    this.configDto = configToDto(config);
    this.max = maxRealWorkers(poolThreads);
    this.workers = [];
    this.queue = [];
    this.nextId = 1;
    this.closed = false;
  }

  spawn() {
    const flagBuffer = new SharedArrayBuffer(4);
    const w = { worker: null, flag: new Int32Array(flagBuffer), job: null };
    w.worker = new Worker(new URL('./checkWorker.js', import.meta.url), { workerData: { config: this.configDto, flag: flagBuffer } });
    w.worker.unref();
    w.worker.on('message', (msg) => this.onMessage(w, msg));
    const fail = (e) => {
      const i = this.workers.indexOf(w);
      if (i >= 0) this.workers.splice(i, 1);
      const job = w.job;
      w.job = null;
      if (job !== null) job.reject(e instanceof Error ? e : new RuntimeException(String(e)));
      this.schedule();
    };
    w.worker.on('error', fail);
    w.worker.on('exit', (code) => { if (!this.closed) fail(new RuntimeException(`check worker exited with code ${code}`)); });
    this.workers.push(w);
    return w;
  }

  onMessage(w, msg) {
    const job = w.job;
    if (job === null || job.id !== msg.id) return;
    if (msg.t === 'match') {
      job.onMatch(ruleMatchFromDto(msg.dto));
    } else if (msg.t === 'done') {
      w.job = null;
      if (msg.ok) job.resolve(job.prewarm ? msg.results : msg.results.map(checkResultsFromDto));
      else job.reject(reviveError(msg.error));
      this.schedule();
    }
  }

  schedule() {
    while (this.queue.length > 0 && !this.closed) {
      let w = this.workers.find((x) => x.job === null);
      if (w === undefined && this.workers.length < this.max) w = this.spawn();
      if (w === undefined) return;
      const job = this.queue.shift();
      w.job = job;
      w.worker.postMessage(job.message);
    }
  }

  newJob(message, onMatch, prewarm) {
    const id = this.nextId++;
    const job = { id, onMatch, prewarm, message: { ...message, id }, resolve: null, reject: null };
    const promise = new Promise((resolve, reject) => { job.resolve = resolve; job.reject = reject; });
    this.queue.push(job);
    this.schedule();
    return {
      promise,
      interrupt: () => {
        const qi = this.queue.indexOf(job);
        if (qi >= 0) {
          this.queue.splice(qi, 1);
          job.reject(new RuntimeException(new InterruptedException()));
          return;
        }
        const w = this.workers.find((x) => x.job === job);
        if (w !== undefined) Atomics.store(w.flag, 0, 1);
      },
    };
  }

  // Java: executorService.submit(...) body of TextChecker#checkText
  submit(payload, onMatch) {
    return this.newJob({ t: 'job', payload, stream: onMatch !== null }, onMatch, false);
  }

  // Java: TextChecker#prewarmPipelinePool(): the pipelines live in the workers (one worker by default, env LTJS_PREWARM_WORKERS=n: n workers; each holds all languages in memory)
  async prewarm(preferredLanguages) {
    const jobs = [];
    const n = Math.max(1, Math.min(this.max, Number(process.env.LTJS_PREWARM_WORKERS ?? 1)));
    for (let i = 0; i < n; i++) {
      const id = this.nextId++;
      const job = { id, onMatch: null, prewarm: true, message: { t: 'prewarm', id, preferredLanguages }, resolve: null, reject: null };
      job.promise = new Promise((resolve, reject) => { job.resolve = resolve; job.reject = reject; });
      const w = this.spawn();
      w.job = job;
      w.worker.postMessage(job.message);
      jobs.push(job.promise);
    }
    const counts = await Promise.all(jobs);
    return counts[0];
  }

  // Java: ExecutorService#shutdownNow() of the checker pool
  shutdown() {
    this.closed = true;
    for (const w of this.workers) void w.worker.terminate();
    this.workers = [];
    for (const j of this.queue) j.reject(new RuntimeException(new InterruptedException()));
    this.queue = [];
  }
}

// check in the main thread; the pipeline pool is the one of `executor` (tests replace it)
export class InlineBackend {
  constructor(executor) {
    this.executor = executor;
  }

  submit(payload, onMatch) {
    const promise = new Promise((resolve, reject) => {
      setImmediate(() => {
        try {
          const dtos = this.executor.run(payload, onMatch === null ? null : (dto) => onMatch(ruleMatchFromDto(dto)));
          resolve(dtos.map(checkResultsFromDto));
        } catch (e) {
          reject(e);
        }
      });
    });
    return { promise, interrupt: () => { } };
  }

  async prewarm(preferredLanguages) {
    return this.executor.prewarmPipelinePool(preferredLanguages);
  }

  shutdown() { }
}

