import { describe, it, expect } from 'vitest';
import { PriorityQueue } from '../../../src/lib/java/collections/PriorityQueue.js';

const item = (k, id) => ({ k, id, compareTo: (o) => (k < o.k ? -1 : k > o.k ? 1 : 0) });

describe('PriorityQueue (F44)', () => {
  it('polls in ascending order and keeps the Java heap order for equal keys', () => {
    const q = new PriorityQueue();
    [3, 1, 2, 1, 3, 1].forEach((k, i) => q.add(item(k, i)));
    const out = [];
    while (q.size() > 0) out.push(q.remove().id);
    // order produced by a real java.util.PriorityQueue (JDK 17) for keys 3,1,2,1,3,1
    expect(out).toEqual([1, 3, 5, 2, 4, 0]);
  });
  it('remove on empty throws NoSuchElementException, poll returns null', () => {
    const q = new PriorityQueue();
    expect(q.poll()).toBeNull();
    expect(() => q.remove()).toThrow();
  });
});
