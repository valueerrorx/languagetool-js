// JVM-wide once-only side effects shared across worker threads (ARCHITECTURE.md section 6.2).

// one gate slot per named effect; fixed list so every worker agrees on slot numbers
export const JVM_ONCE_IDS = ['CommonWordsDetector.noCommonWordsFile', 'TextChecker.abRestrictions', 'test.a', 'test.b'];

let gates = new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * 256));

// buffer to hand to workers (workerData)
export function getJvmOnceBuffer() {
  return gates.buffer;
}

// worker bootstrap: adopt the main thread's gate table
export function setJvmOnceBuffer(sab) {
  gates = new Int32Array(sab);
}

// Java: static initialiser / once-only side effect (runs fn iff this is the first caller JVM-wide)
export function jvmOnce(id, fn) {
  const slot = JVM_ONCE_IDS.indexOf(id);
  if (slot < 0) throw new Error(`unknown jvmOnce id: ${id}`);
  if (Atomics.compareExchange(gates, slot, 0, 1) === 0) return fn();
  return undefined;
}
