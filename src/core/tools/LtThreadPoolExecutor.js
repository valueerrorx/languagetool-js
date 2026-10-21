// org.languagetool.tools.LtThreadPoolExecutor (ThreadPoolExecutor with a stop-on-OutOfMemoryError rule)
import { OutOfMemoryError } from '../../lib/java/errors.js';
import { ThreadPoolExecutor } from '../../lib/java/concurrent/ThreadPoolExecutor.js';

export class LtThreadPoolExecutor extends ThreadPoolExecutor {
  static FQCN = 'org.languagetool.tools.LtThreadPoolExecutor';

  // Java: LtThreadPoolExecutor#LtThreadPoolExecutor(String,int,int,long,TimeUnit,BlockingQueue,ThreadFactory,RejectedExecutionHandler)
  constructor(name, corePoolSize, maximumPoolSize, keepAliveTime, unit, workQueue, threadFactory, handler) {
    super(corePoolSize, maximumPoolSize, keepAliveTime, unit, workQueue, threadFactory, handler);
    this.name = name;
  }

  // Java: LtThreadPoolExecutor#getName() (lombok @Getter)
  getName() {
    return this.name;
  }

  // Java: LtThreadPoolExecutor#afterExecute(Runnable,Throwable)
  afterExecute(r, t) {
    super.afterExecute(r, t);
    // inherited from removed StoppingThreadPoolExecutor in org.languagetool.server.Server
    if (t !== null && t instanceof OutOfMemoryError) {
      // we prefer to stop instead of being in an unstable state:
      t.printStackTrace();
      process.exit(1);
    }
  }
}
