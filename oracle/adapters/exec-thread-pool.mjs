// JS twin of harness op "exec-thread-pool" (LtjsBridge#threadPool, CORE-0333).
import { LtThreadPoolFactory } from '../../src/core/tools/LtThreadPoolFactory.js';
import { RejectedExecutionException } from '../../src/lib/java/errors.js';
import { TimeUnit } from '../../src/lib/java/TimeUnit.js';
import { javaCompare } from '../../src/lib/java/strings.js';

// Java: LtjsBridge#err(Throwable)
const err = (t) => ({ class: t.javaClass, message: t.getMessage() });

// Java: LtjsBridge#threadPool(JsonNode); n blocking tasks are submitted, the pool state is read while all are blocked, then released
export async function run(a) {
  const p = a.pool;
  const id = p.identifier;
  const h = () => { };
  let ex;
  if (p.short === true) {
    ex = LtThreadPoolFactory.createFixedThreadPoolExecutor(id, p.maxThreads, p.queue, false, h, p.reuse === true);
  } else {
    ex = LtThreadPoolFactory.createFixedThreadPoolExecutor(id, p.corePool, p.maxThreads, p.queue, p.keepAlive ?? 60, false, h, p.reuse === true);
  }
  const r = {};
  const n = a.tasks;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const threadNames = new Set();
  const submits = [];
  const futures = [];
  for (let i = 0; i < n; i++) {
    const s = { task: i };
    try {
      futures.push(ex.submit(async (thread) => {
        threadNames.add(thread.getName());
        await gate;
      }));
      s.accepted = true;
    } catch (e) {
      if (!(e instanceof RejectedExecutionException)) throw e;
      s.accepted = false;
      const er = err(e);
      // identity hashes and the harness lambda name are not stable: keep the pool state part of the message
      er.message = String(e.getMessage()).replace(/^Task .*? rejected from /, 'Task <T> rejected from ').replace(/@[0-9a-f]+/g, '@<H>');
      s.error = er;
    }
    submits.push(s);
  }
  r.submits = submits;
  r.poolSize = ex.getPoolSize();
  r.activeCount = ex.getActiveCount();
  r.queueSize = ex.getQueue().size();
  r.queueRemainingCapacity = ex.getQueue().remainingCapacity();
  r.queueClass = ex.getQueue().constructor.FQCN;
  r.corePoolSize = ex.getCorePoolSize();
  r.maximumPoolSize = ex.getMaximumPoolSize();
  r.keepAliveSeconds = ex.getKeepAliveTime(TimeUnit.SECONDS);
  r.poolClass = ex.constructor.FQCN;
  r.lookupSame = LtThreadPoolFactory.getFixedThreadPoolExecutor(id) === ex;
  release();
  for (const f of futures) await f.get(30000);
  ex.shutdown();
  r.terminated = await ex.awaitTermination(30000);
  r.completedTaskCount = ex.getCompletedTaskCount();
  r.threadNames = [...threadNames].sort(javaCompare);
  r.unknownPoolFirstThreadName = LtThreadPoolFactory.getFixedThreadPoolExecutor(`no-such-pool-${id}`) !== null ? 'default' : 'none';
  return r;
}
