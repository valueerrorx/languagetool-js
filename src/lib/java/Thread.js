// java.lang.Thread interrupt flag of the current JS thread (interrupt(), interrupted(), isInterrupted()); a check worker shares its flag cell with the main thread
let flag = false;
let shared = null; // Int32Array over a SharedArrayBuffer: cell 0 = interrupt requested (set by the main thread, see src/server/worker)

// Java: Thread
export class Thread {
  // JS: binds the interrupt flag to a cell shared with another JS thread (null: plain flag)
  static useSharedFlag(int32) {
    shared = int32;
  }

  // Java: Thread#currentThread()
  static currentThread() {
    return Thread.CURRENT;
  }

  // Java: Thread#interrupted()
  static interrupted() {
    if (shared !== null) {
      return Atomics.load(shared, 0) !== 0 && Atomics.exchange(shared, 0, 0) === 1;
    }
    const r = flag;
    flag = false;
    return r;
  }

  // Java: Thread#interrupt()
  interrupt() {
    if (shared !== null) Atomics.store(shared, 0, 1);
    else flag = true;
  }

  // Java: Thread#isInterrupted()
  isInterrupted() {
    return shared !== null ? Atomics.load(shared, 0) !== 0 : flag;
  }
}
Thread.CURRENT = new Thread();
