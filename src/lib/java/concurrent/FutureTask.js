// java.util.concurrent.FutureTask over an async callable (a task never completes before the next macrotask boundary of its callable)
import { CancellationException, ExecutionException, RuntimeException, TimeoutException, isThrowable } from '../errors.js';
import { identityHashHex } from './identity.js';

const NEW = 0;
const NORMAL = 1;
const EXCEPTIONAL = 2;
const CANCELLED = 3;
const INTERRUPTED = 4;

// Java: java.util.concurrent.FutureTask
export class FutureTask {
  static FQCN = 'java.util.concurrent.FutureTask';

  // Java: FutureTask#FutureTask(Callable); callable(thread) may return a value or a promise
  constructor(callable) {
    this.callable = callable;
    this.state = NEW;
    this.outcome = null;
    this.runner = null;
    this.waiters = [];
  }

  // Java: FutureTask#isCancelled()
  isCancelled() {
    return this.state >= CANCELLED;
  }

  // Java: FutureTask#isDone()
  isDone() {
    return this.state !== NEW;
  }

  // Java: FutureTask#cancel(boolean)
  cancel(mayInterruptIfRunning) {
    if (this.state !== NEW) return false;
    this.state = mayInterruptIfRunning ? INTERRUPTED : CANCELLED;
    if (mayInterruptIfRunning && this.runner !== null) this.runner.interrupt();
    this.finishCompletion();
    return true;
  }

  finishCompletion() {
    const w = this.waiters;
    this.waiters = [];
    for (const f of w) f();
  }

  report() {
    if (this.state === NORMAL) return this.outcome;
    if (this.state >= CANCELLED) throw new CancellationException();
    const o = this.outcome;
    if (isThrowable(o)) throw new ExecutionException(o);
    // JS: a task that failed with a non-Java error (e.g. a not-ported marker) keeps it as jsCause
    const ee = new ExecutionException(new RuntimeException(o?.message ?? String(o)));
    ee.jsCause = o;
    throw ee;
  }

  // Java: FutureTask#get() / get(long,TimeUnit); timeoutMs: undefined = wait forever
  async get(timeoutMs) {
    if (this.state === NEW) {
      if (timeoutMs !== undefined && timeoutMs <= 0) throw new TimeoutException();
      await new Promise((resolve) => {
        let timer = null;
        const done = () => { if (timer !== null) clearTimeout(timer); resolve(); };
        this.waiters.push(done);
        if (timeoutMs !== undefined) {
          timer = setTimeout(() => {
            const i = this.waiters.indexOf(done);
            if (i >= 0) this.waiters.splice(i, 1);
            resolve();
          }, timeoutMs);
        }
      });
      if (this.state === NEW) throw new TimeoutException();
    }
    return this.report();
  }

  // Java: FutureTask#run(); thread: the pool thread running the task
  async run(thread) {
    if (this.state !== NEW) return;
    this.runner = thread;
    try {
      let result;
      let ex = null;
      try {
        result = await this.callable(thread);
      } catch (e) {
        ex = e;
      }
      if (this.state === NEW) {
        if (ex !== null) {
          this.outcome = ex;
          this.state = EXCEPTIONAL;
        } else {
          this.outcome = result;
          this.state = NORMAL;
        }
        this.finishCompletion();
      }
    } finally {
      this.runner = null;
    }
  }

  // Java: Object#toString() of the FutureTask
  toString() {
    return `java.util.concurrent.FutureTask@${identityHashHex(this)}[Not completed, task = ${this.callable.name || 'task'}]`;
  }
}
