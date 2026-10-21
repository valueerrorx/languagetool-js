// Port of LtThreadPoolFactoryTest (the timing tests marked @Ignore in Java are replaced by queue/overload checks without wall-clock assertions).
import { describe, it, expect } from 'vitest';
import { LtThreadPoolFactory } from '../../src/core/tools/LtThreadPoolFactory.js';
import { RejectedExecutionException } from '../../src/lib/java/errors.js';

describe('LtThreadPoolFactory', () => {
  // Java: LtThreadPoolFactoryTest#cachedThreadPoolTest
  it('cachedThreadPoolTest', () => {
    const myThreadPool = LtThreadPoolFactory.createFixedThreadPoolExecutor('Test-Pool-cached', 10, 20, false, () => { }, true);
    expect(LtThreadPoolFactory.getFixedThreadPoolExecutor('Test-Pool-cached')).toBe(myThreadPool);
  });

  // Java: LtThreadPoolFactoryTest#notcachedThreadPoolTest
  it('notcachedThreadPoolTest', () => {
    LtThreadPoolFactory.createFixedThreadPoolExecutor('Test-Pool-notCached', 10, 20, false, () => { }, false);
    expect(LtThreadPoolFactory.getFixedThreadPoolExecutor('Test-Pool-notCached')).toBe(LtThreadPoolFactory.defaultPool);
  });

  // Java: LtThreadPoolFactoryTest#stressedQueueTest / #overloadingUsageThreadPoolTest without timing: rejection once threads and queue are full
  it('overloadingUsageThreadPoolTest', async () => {
    const pool = LtThreadPoolFactory.createFixedThreadPoolExecutor('Test-Pool-osp', 10, 20, false, () => { }, true);
    let release;
    const gate = new Promise((r) => { release = r; });
    const futures = [];
    for (let i = 0; i < 25; i++) futures.push(pool.submit(() => gate)); // core 5 + queue 20
    expect(pool.getActiveCount()).toBe(5);
    expect(pool.getQueue().size()).toBe(20);
    for (let i = 0; i < 5; i++) futures.push(pool.submit(() => gate)); // queue full: up to the maximum of 10 threads
    expect(pool.getActiveCount()).toBe(10);
    expect(() => pool.submit(() => gate)).toThrow(RejectedExecutionException);
    release();
    for (const f of futures) await f.get(5000);
    pool.shutdown();
    expect(await pool.awaitTermination(5000)).toBe(true);
    expect(pool.getCompletedTaskCount()).toBe(30);
  });

  it('a cancelled queued task keeps its queue slot until a thread polls it', async () => {
    const pool = LtThreadPoolFactory.createFixedThreadPoolExecutor('Test-Pool-cancel', 1, 1, 1, 60, false, () => { }, false);
    let release;
    const gate = new Promise((r) => { release = r; });
    const running = pool.submit(() => gate);
    const queued = pool.submit(() => 'queued');
    expect(queued.cancel(true)).toBe(true);
    expect(pool.getQueue().size()).toBe(1);
    expect(() => pool.submit(() => 'x')).toThrow(RejectedExecutionException);
    release();
    await running.get(5000);
    pool.shutdown();
    await pool.awaitTermination(5000);
    expect(queued.isCancelled()).toBe(true);
  });
});
