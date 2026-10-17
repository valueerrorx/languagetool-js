// Extra tests (no Java original): JavaHashMap#clear and #computeIfAbsent added in F28 for the Unifier
import { describe, it, expect } from 'vitest';
import { JavaHashMap } from '../../../src/lib/java/collections/JavaHashMap.js';
import { readFileSync } from 'node:fs';
import { listSet } from '../../../src/lib/java/arrays.js';

describe('JavaHashMap', () => {
  // Java: HashMap#clear()
  it('clear keeps working and keeps capacity order', () => {
    const m = new JavaHashMap();
    m.put('b', 1);
    m.put('a', 2);
    m.clear();
    expect(m.size()).toBe(0);
    expect(m.entrySet()).toEqual([]);
    m.put('b', 3);
    m.put('a', 4);
    expect(m.entrySet()).toEqual([['a', 4], ['b', 3]]);
    new JavaHashMap().clear();
  });

  // Java: HashMap#computeIfAbsent(Object,Function)
  it('computeIfAbsent', () => {
    const m = new JavaHashMap();
    const s = m.computeIfAbsent('k', () => []);
    expect(m.computeIfAbsent('k', () => ['x'])).toBe(s);
    m.put('n', null);
    expect(m.computeIfAbsent('n', () => 5)).toBe(5);
    expect(m.get('n')).toBe(5);
    expect(m.computeIfAbsent('z', () => null)).toBeNull();
    expect(m.containsKey('z')).toBe(false);
  });

  // Java: ArrayList#set(int,Object)
  it('listSet', () => {
    const l = [1, 2];
    expect(listSet(l, 1, 9)).toBe(2);
    expect(l).toEqual([1, 9]);
    expect(() => listSet(l, 2, 0)).toThrow('Index 2 out of bounds for length 2');
  });

  // Java: HashMap#computeIfAbsent(Object,Function) bin order vs JDK 17 (corpus from the .java.txt probe)
  it('computeIfAbsent/put iteration order equals JDK 17', () => {
    const lines = readFileSync(new URL('./fixtures/JavaHashMap-computeIfAbsent-jdk17.txt', import.meta.url), 'utf8').split('\n').filter(Boolean);
    let checked = 0;
    for (const line of lines) {
      const [ops, keys] = line.split('|');
      const m = new JavaHashMap();
      for (const op of ops.trim().split(' ')) {
        const [o, k] = op.split(':').map(Number);
        if (o === 0) m.computeIfAbsent(k, (x) => x + 1);
        else if (o === 1) m.put(k, k);
        else m.computeIfAbsent(k, () => null);
      }
      if (m.treeBinsNeeded) continue;
      checked++;
      expect(`[${m.keySet().join(', ')}]`).toBe(keys);
    }
    expect(checked).toBeGreaterThan(200);
  });
  // Java: HashMap#compute(Object,BiFunction) bin order vs JDK 17 (corpus from the .java.txt probe)
  it('compute/put iteration order equals JDK 17', () => {
    const lines = readFileSync(new URL('./fixtures/JavaHashMap-compute-jdk17.txt', import.meta.url), 'utf8').split('\n').filter(Boolean);
    let checked = 0;
    for (const line of lines) {
      const [ops, keys] = line.split('|');
      const m = new JavaHashMap();
      for (const op of ops.trim().split(' ')) {
        const [o, k] = op.split(':').map(Number);
        if (o === 0) m.compute(k, (x, v) => (v === null ? 1 : v + 1));
        else if (o === 1) m.put(k, k);
        else if (o === 2) m.compute(k, () => null);
        else m.compute(k, (x, v) => (v === null ? null : v + 5));
      }
      if (m.treeBinsNeeded) continue;
      checked++;
      expect(`[${m.keySet().join(', ')}]`).toBe(keys);
    }
    expect(checked).toBeGreaterThan(200);
  });
});
