// java.lang.Thread interrupt flag of the single JS thread (interrupt(), interrupted(), isInterrupted())
let flag = false;

// Java: java.lang.Thread
export class Thread {
  // Java: Thread#currentThread()
  static currentThread() {
    return Thread.CURRENT;
  }

  // Java: Thread#interrupted()
  static interrupted() {
    const r = flag;
    flag = false;
    return r;
  }

  // Java: Thread#interrupt()
  interrupt() {
    flag = true;
  }

  // Java: Thread#isInterrupted()
  isInterrupted() {
    return flag;
  }
}
Thread.CURRENT = new Thread();
