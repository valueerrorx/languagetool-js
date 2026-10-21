// java.util.concurrent.ThreadPoolExecutor model on the JS event loop: pool threads are logical (named, interruptible) and run async tasks
import { IllegalArgumentException, NullPointerException, RejectedExecutionException } from '../errors.js';
import { FutureTask } from './FutureTask.js';
import { identityHashHex } from './identity.js';

const RUNNING = 0;
const SHUTDOWN = 1;
const STOP = 2;
const TERMINATED = 3;
const INT_MAX = 2147483647;
const WAKE = Symbol('wake');

// Java: java.util.concurrent.BlockingQueue implementations (LinkedBlockingQueue, ArrayBlockingQueue, SynchronousQueue)
export class BlockingQueue {
  constructor(capacity, synchronous = false) {
    this.capacity = capacity;
    this.synchronous = synchronous;
    this.items = [];
    this.waiters = [];
  }

  // Java: Collection#size()
  size() {
    return this.items.length;
  }

  // Java: Collection#isEmpty()
  isEmpty() {
    return this.items.length === 0;
  }

  // Java: BlockingQueue#remainingCapacity()
  remainingCapacity() {
    return this.synchronous ? 0 : this.capacity - this.items.length;
  }

  // Java: Queue#offer(E)
  offer(x) {
    if (this.waiters.length > 0) {
      this.waiters.shift().deliver(x);
      return true;
    }
    if (this.synchronous || this.items.length >= this.capacity) return false;
    this.items.push(x);
    return true;
  }

  // Java: Queue#poll()
  poll() {
    return this.items.length > 0 ? this.items.shift() : null;
  }

  // Java: BlockingQueue#take() / poll(long,TimeUnit); resolves to null on timeout, WAKE when interrupted
  waitFor(timeoutMs) {
    if (this.items.length > 0) return Promise.resolve(this.items.shift());
    return new Promise((resolve) => {
      let timer = null;
      const waiter = {
        deliver: (x) => { if (timer !== null) clearTimeout(timer); resolve(x); },
      };
      this.waiters.push(waiter);
      if (timeoutMs !== null) {
        timer = setTimeout(() => {
          const i = this.waiters.indexOf(waiter);
          if (i >= 0) this.waiters.splice(i, 1);
          resolve(null);
        }, timeoutMs);
      }
    });
  }

  // wakes all waiting pool threads (ThreadPoolExecutor#interruptIdleWorkers)
  wakeAll() {
    const w = this.waiters;
    this.waiters = [];
    for (const x of w) x.deliver(WAKE);
  }

  // Java: Collection#drainTo(Collection)
  drain() {
    const r = this.items;
    this.items = [];
    return r;
  }
}

// Java: new LinkedBlockingQueue<>()
export class LinkedBlockingQueue extends BlockingQueue {
  static FQCN = 'java.util.concurrent.LinkedBlockingQueue';

  constructor() {
    super(INT_MAX);
  }
}

// Java: new ArrayBlockingQueue<>(capacity, fair)
export class ArrayBlockingQueue extends BlockingQueue {
  static FQCN = 'java.util.concurrent.ArrayBlockingQueue';
}

// Java: new SynchronousQueue<>()
export class SynchronousQueue extends BlockingQueue {
  static FQCN = 'java.util.concurrent.SynchronousQueue';

  constructor() {
    super(0, true);
  }
}

// Java: ThreadPoolExecutor.AbortPolicy
export class AbortPolicy {
  // Java: AbortPolicy#rejectedExecution(Runnable,ThreadPoolExecutor)
  rejectedExecution(r, e) {
    throw new RejectedExecutionException(`Task ${r} rejected from ${e}`);
  }
}

// Java: a pool thread (name from the ThreadFactory, interrupt flag with hooks)
export class PoolThread {
  constructor(name, uncaughtHandler) {
    this.name = name;
    this.uncaughtHandler = uncaughtHandler;
    this.interruptFlag = false;
    this.onInterrupt = null;
  }

  // Java: Thread#getName()
  getName() {
    return this.name;
  }

  // Java: Thread#interrupt()
  interrupt() {
    this.interruptFlag = true;
    if (this.onInterrupt !== null) this.onInterrupt();
  }

  // Java: Thread#isInterrupted()
  isInterrupted() {
    return this.interruptFlag;
  }

  // Java: Thread#interrupted() (read and clear)
  clearInterrupt() {
    const r = this.interruptFlag;
    this.interruptFlag = false;
    return r;
  }
}

// Java: com.google.common.util.concurrent.ThreadFactoryBuilder with setNameFormat("<id>-%d") and an uncaught exception handler
export function namedThreadFactory(nameFormat, uncaughtHandler) {
  let n = 0;
  return () => new PoolThread(nameFormat.replace('%d', String(n++)), uncaughtHandler);
}

// Java: java.util.concurrent.ThreadPoolExecutor
export class ThreadPoolExecutor {
  static FQCN = 'java.util.concurrent.ThreadPoolExecutor';

  // Java: ThreadPoolExecutor#ThreadPoolExecutor(int,int,long,TimeUnit,BlockingQueue,ThreadFactory,RejectedExecutionHandler)
  constructor(corePoolSize, maximumPoolSize, keepAliveTime, unit, workQueue, threadFactory, handler) {
    if (corePoolSize < 0 || maximumPoolSize <= 0 || maximumPoolSize < corePoolSize || keepAliveTime < 0) throw new IllegalArgumentException();
    if (workQueue === null || threadFactory === null || handler === null) throw new NullPointerException();
    this.corePoolSize = corePoolSize;
    this.maximumPoolSize = maximumPoolSize;
    this.keepAliveNanos = unit.toNanos(keepAliveTime);
    this.workQueue = workQueue;
    this.threadFactory = threadFactory;
    this.handler = handler;
    this.runState = RUNNING;
    this.workers = new Set();
    this.completedTasks = 0;
    this.largestPoolSize = 0;
    this.terminationWaiters = [];
  }

  // Java: ThreadPoolExecutor#execute(Runnable)
  execute(command) {
    if (command === null || command === undefined) throw new NullPointerException();
    if (this.workers.size < this.corePoolSize) {
      if (this.addWorker(command, true)) return;
    }
    if (this.runState === RUNNING && this.workQueue.offer(command)) {
      if (this.runState !== RUNNING) {
        // shutdown while queued: the task is not run (Java removes and rejects it)
        this.reject(command);
      } else if (this.workers.size === 0) {
        this.addWorker(null, false);
      }
    } else if (!this.addWorker(command, false)) {
      this.reject(command);
    }
  }

  reject(command) {
    this.handler.rejectedExecution(command, this);
  }

  // Java: ThreadPoolExecutor#addWorker(Runnable,boolean)
  addWorker(firstTask, core) {
    if (this.runState >= STOP || (this.runState === SHUTDOWN && !(firstTask === null && !this.workQueue.isEmpty()))) return false;
    if (this.workers.size >= (core ? this.corePoolSize : this.maximumPoolSize)) return false;
    const thread = this.threadFactory();
    const w = { thread, firstTask, running: false, completedTasks: 0 };
    this.workers.add(w);
    if (this.workers.size > this.largestPoolSize) this.largestPoolSize = this.workers.size;
    void this.runWorker(w);
    return true;
  }

  // Java: ThreadPoolExecutor#runWorker(Worker)
  async runWorker(w) {
    let task = w.firstTask;
    w.firstTask = null;
    let completedAbruptly = false;
    try {
      while (task !== null || (task = await this.getTask(w)) !== null) {
        w.running = true;
        w.thread.clearInterrupt(); // pool not stopping: the thread must not be interrupted when a task starts
        if (this.runState >= STOP) w.thread.interrupt();
        let thrown = null;
        try {
          this.beforeExecute(w.thread, task);
          if (typeof task.run === 'function') await task.run(w.thread);
          else await task(w.thread);
        } catch (e) {
          thrown = e;
        }
        try {
          this.afterExecute(task, thrown);
        } finally {
          task = null;
          w.completedTasks++;
          w.running = false;
        }
        if (thrown !== null) {
          completedAbruptly = true;
          if (w.thread.uncaughtHandler) w.thread.uncaughtHandler(w.thread, thrown);
          break; // the thread dies with the exception
        }
      }
    } finally {
      this.processWorkerExit(w, completedAbruptly);
    }
  }

  // Java: ThreadPoolExecutor#getTask()
  async getTask(w) {
    let timedOut = false;
    for (;;) {
      if (this.runState >= STOP || (this.runState >= SHUTDOWN && this.workQueue.isEmpty())) return null;
      const wc = this.workers.size;
      const timed = wc > this.corePoolSize;
      if ((wc > this.maximumPoolSize || (timed && timedOut)) && (wc > 1 || this.workQueue.isEmpty())) return null;
      const r = await this.workQueue.waitFor(timed ? Number(this.keepAliveNanos / 1000000n) : null);
      if (r === WAKE) continue;
      if (r !== null) return r;
      timedOut = true;
    }
  }

  // Java: ThreadPoolExecutor#processWorkerExit(Worker,boolean)
  processWorkerExit(w, completedAbruptly) {
    this.completedTasks += w.completedTasks;
    this.workers.delete(w);
    this.tryTerminate();
    if (this.runState < STOP) {
      if (!completedAbruptly) {
        let min = this.corePoolSize;
        if (min === 0 && !this.workQueue.isEmpty()) min = 1;
        if (this.workers.size >= min) return;
      }
      this.addWorker(null, false);
    }
  }

  // Java: ThreadPoolExecutor#tryTerminate()
  tryTerminate() {
    if (this.runState === RUNNING || this.runState === TERMINATED || (this.runState === SHUTDOWN && !this.workQueue.isEmpty())) return;
    if (this.workers.size !== 0) {
      this.workQueue.wakeAll(); // interruptIdleWorkers
      return;
    }
    this.runState = TERMINATED;
    const w = this.terminationWaiters;
    this.terminationWaiters = [];
    for (const f of w) f();
  }

  // Java: ThreadPoolExecutor#beforeExecute(Thread,Runnable)
  beforeExecute() {}

  // Java: ThreadPoolExecutor#afterExecute(Runnable,Throwable)
  afterExecute() {}

  // Java: AbstractExecutorService#submit(Callable)
  submit(task) {
    if (task === null || task === undefined) throw new NullPointerException();
    const ftask = new FutureTask(task);
    this.execute(ftask);
    return ftask;
  }

  // Java: ThreadPoolExecutor#shutdown()
  shutdown() {
    if (this.runState < SHUTDOWN) this.runState = SHUTDOWN;
    this.workQueue.wakeAll();
    this.tryTerminate();
  }

  // Java: ThreadPoolExecutor#shutdownNow()
  shutdownNow() {
    if (this.runState < STOP) this.runState = STOP;
    for (const w of this.workers) w.thread.interrupt();
    const tasks = this.workQueue.drain();
    this.workQueue.wakeAll();
    this.tryTerminate();
    return tasks;
  }

  // Java: ThreadPoolExecutor#isShutdown()
  isShutdown() {
    return this.runState >= SHUTDOWN;
  }

  // Java: ThreadPoolExecutor#isTerminated()
  isTerminated() {
    return this.runState === TERMINATED;
  }

  // Java: ThreadPoolExecutor#awaitTermination(long,TimeUnit); timeoutMs
  async awaitTermination(timeoutMs) {
    if (this.runState === TERMINATED) return true;
    await new Promise((resolve) => {
      let timer = null;
      const done = () => { if (timer !== null) clearTimeout(timer); resolve(); };
      this.terminationWaiters.push(done);
      timer = setTimeout(resolve, timeoutMs);
    });
    return this.runState === TERMINATED;
  }

  // Java: ThreadPoolExecutor#getPoolSize()
  getPoolSize() {
    return this.runState === TERMINATED ? 0 : this.workers.size;
  }

  // Java: ThreadPoolExecutor#getActiveCount()
  getActiveCount() {
    let n = 0;
    for (const w of this.workers) if (w.running) n++;
    return n;
  }

  // Java: ThreadPoolExecutor#getLargestPoolSize()
  getLargestPoolSize() {
    return this.largestPoolSize;
  }

  // Java: ThreadPoolExecutor#getCompletedTaskCount()
  getCompletedTaskCount() {
    let n = this.completedTasks;
    for (const w of this.workers) n += w.completedTasks;
    return n;
  }

  // Java: ThreadPoolExecutor#getCorePoolSize()
  getCorePoolSize() {
    return this.corePoolSize;
  }

  // Java: ThreadPoolExecutor#getMaximumPoolSize()
  getMaximumPoolSize() {
    return this.maximumPoolSize;
  }

  // Java: ThreadPoolExecutor#getKeepAliveTime(TimeUnit)
  getKeepAliveTime(unit) {
    return Number(this.keepAliveNanos / unit.nanos);
  }

  // Java: ThreadPoolExecutor#getQueue()
  getQueue() {
    return this.workQueue;
  }

  // Java: ThreadPoolExecutor#toString()
  toString() {
    const rs = this.runState < SHUTDOWN ? 'Running' : this.runState === TERMINATED ? 'Terminated' : 'Shutting down';
    return `${this.constructor.FQCN}@${identityHashHex(this)}[${rs}, pool size = ${this.getPoolSize()}, active threads = ${this.getActiveCount()}, queued tasks = ${this.workQueue.size()}, completed tasks = ${this.getCompletedTaskCount()}]`;
  }
}
