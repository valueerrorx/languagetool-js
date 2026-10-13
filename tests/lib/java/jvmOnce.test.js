import { describe, it, expect } from 'vitest';
import { Worker } from 'node:worker_threads';
import { jvmOnce, getJvmOnceBuffer } from '../../../src/lib/java/jvmOnce.js';

describe('jvmOnce (X-ERRORS)', () => {
  it('runs once per id', () => {
    let n = 0;
    jvmOnce('test.a', () => n++);
    jvmOnce('test.a', () => n++);
    expect(n).toBe(1);
  });
  it('unknown id throws', () => {
    expect(() => jvmOnce('nope', () => {})).toThrow();
  });
  it('is shared across workers', async () => {
    const code = `
      const { workerData, parentPort } = require('node:worker_threads');
      const gates = new Int32Array(workerData.sab);
      parentPort.postMessage(Atomics.compareExchange(gates, workerData.slot, 0, 1));`;
    const ran = await new Promise((resolve) => {
      const w = new Worker(code, { eval: true, workerData: { sab: getJvmOnceBuffer(), slot: 3 } });
      w.on('message', resolve);
    });
    expect(ran).toBe(0); // gate 3 ('test.b') was free: the worker won it
    let n = 0;
    jvmOnce('test.b', () => n++);
    expect(n).toBe(0); // now taken
  });
});
