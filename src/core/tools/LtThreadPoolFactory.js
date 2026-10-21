// org.languagetool.tools.LtThreadPoolFactory (named, optionally reused thread pools; queue 0 = unbounded, < 0 = direct hand-off, n = bounded)

import { TimeUnit } from '../../lib/java/TimeUnit.js';
import { AbortPolicy, ArrayBlockingQueue, LinkedBlockingQueue, SynchronousQueue, ThreadPoolExecutor, namedThreadFactory } from '../../lib/java/concurrent/ThreadPoolExecutor.js';
import { LtThreadPoolExecutor } from './LtThreadPoolExecutor.js';
import { LoggerFactory } from '../../lib/slf4j/Logger.js';

const log = LoggerFactory.getLogger('org.languagetool.tools.LtThreadPoolFactory');

const executorServices = new Map();

// Java: LtThreadPoolFactory.LtRejectedExecutionHandler
class LtRejectedExecutionHandler extends AbortPolicy {
  // Java: LtRejectedExecutionHandler#rejectedExecution(Runnable,ThreadPoolExecutor)
  rejectedExecution(runnable, threadPoolExecutor) {
    log.warn("Task rejected from pool '{}' (queue full, all threads exhausted)", threadPoolExecutor.getName());
    super.rejectedExecution(runnable, threadPoolExecutor);
  }
}

const handler = new LtRejectedExecutionHandler();

// Java: LtThreadPoolFactory.defaultPool
const defaultPool = new ThreadPoolExecutor(12, 64, 60, TimeUnit.SECONDS, new LinkedBlockingQueue(), namedThreadFactory('default-lt-pool-%d', null), new AbortPolicy());

// Java: LtThreadPoolFactory#getNewThreadPoolExecutor(...)
function getNewThreadPoolExecutor(identifier, corePool, maxThreads, maxTaskInQueue, keepAliveTimeSeconds, isDaemon, exceptionHandler) {
  let queue;
  if (maxTaskInQueue === 0) {
    queue = new LinkedBlockingQueue();
  } else if (maxTaskInQueue < 0) {
    queue = new SynchronousQueue();
  } else {
    // fair = true helps with respecting keep-alive time
    queue = new ArrayBlockingQueue(maxTaskInQueue);
  }
  const threadFactory = namedThreadFactory(`${identifier}-%d`, exceptionHandler);
  return new LtThreadPoolExecutor(identifier, corePool, maxThreads, keepAliveTimeSeconds, TimeUnit.SECONDS, queue, threadFactory, handler);
}

export class LtThreadPoolFactory {
  static FQCN = 'org.languagetool.tools.LtThreadPoolFactory';
  static SERVER_POOL = 'lt-server-thread';
  static TEXT_CHECKER_POOL = 'lt-text-checker-thread';
  static REMOTE_RULE_EXECUTING_POOL = 'remote-rule-executing-thread';
  static REMOTE_RULE_POOL_SIZE_FACTOR = 4;
  static defaultPool = defaultPool;

  // Java: LtThreadPoolFactory#createFixedThreadPoolExecutor(String,int,int,boolean,UncaughtExceptionHandler,boolean) and the 8-argument form with corePool/keepAlive
  static createFixedThreadPoolExecutor(identifier, ...a) {
    if (a.length === 5) {
      const [maxThreads, maxTaskInQueue, isDaemon, exceptionHandler, reuse] = a;
      return LtThreadPoolFactory.createFixedThreadPoolExecutor(identifier, Math.trunc(maxThreads / 2), maxThreads, maxTaskInQueue, 60, isDaemon, exceptionHandler, reuse);
    }
    const [corePool, maxThreads, maxTaskInQueue, keepAliveTimeSeconds, isDaemon, exceptionHandler, reuse] = a;
    if (reuse) {
      if (!executorServices.has(identifier)) {
        executorServices.set(identifier, getNewThreadPoolExecutor(identifier, corePool, maxThreads, maxTaskInQueue, keepAliveTimeSeconds, isDaemon, exceptionHandler));
      }
      return executorServices.get(identifier);
    }
    return getNewThreadPoolExecutor(identifier, corePool, maxThreads, maxTaskInQueue, keepAliveTimeSeconds, isDaemon, exceptionHandler);
  }

  // Java: LtThreadPoolFactory#getFixedThreadPoolExecutor(String); Optional.of(...) is the pool itself
  static getFixedThreadPoolExecutor(identifier) {
    const value = executorServices.get(identifier);
    if (value === undefined) {
      log.debug(`Request: ${identifier} not found, returning default pool`);
      return defaultPool;
    }
    return value;
  }
}

