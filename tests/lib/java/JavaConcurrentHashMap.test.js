// ConcurrentHashMap (JDK 17) iteration order and null handling; expected orders recorded from OpenJDK 17.0.20
import { describe, expect, it } from 'vitest';
import { NullPointerException } from '../../../src/lib/java/errors.js';
import { JavaConcurrentHashMap } from '../../../src/lib/java/collections/JavaConcurrentHashMap.js';

class K {
  constructor(h) { this.h = h; }
  hashCode() { return this.h; }
  equals(o) { return o instanceof K && o.h === this.h; }
}

const keys = (m) => m.keySet().map((k) => (k instanceof K ? k.h : k));

describe('JavaConcurrentHashMap', () => {
  it('rejects null keys like ConcurrentHashMap', () => {
    const m = new JavaConcurrentHashMap();
    expect(() => m.containsKey(null)).toThrow('Cannot invoke "Object.hashCode()" because "key" is null');
    expect(() => m.put(null, 1)).toThrow(NullPointerException);
  });
  it('iterates in table order across resizes', () => {
    const m = new JavaConcurrentHashMap();
    for (let i = 0; i < 13; i++) m.put(`k${(i * 7919) % 1000}x`, i);
    expect(m.size()).toBe(13);
    expect(m.get('k0x')).toBe(0);
    expect(keys(m).join(',')).toBe('k190x,k352x,k271x,k595x,k0x,k676x,k433x,k109x,k28x,k757x,k514x,k838x,k919x');
  });
  it('matches recorded orders for colliding keys (treeifyBin presize and transfer)', () => {
    const run = (mul, n) => {
      const m = new JavaConcurrentHashMap();
      for (let i = 0; i < n; i++) m.put(new K(i * mul), i);
      return keys(m).join(',');
    };
    expect(run(5, 8)).toBe('0,35,20,5,25,10,30,15');
    expect(run(5, 10)).toBe('0,35,20,5,40,25,10,45,30,15');
    expect(run(48, 9)).toBe('0,384,144,288,48,192,336,96,240');
    expect(run(48, 10)).toBe('0,384,144,288,48,432,192,336,96,240');
  });
  it('replaces the value of an existing key without changing the order', () => {
    const m = new JavaConcurrentHashMap();
    m.put('a', 1);
    expect(m.put('a', 2)).toBe(1);
    expect(m.size()).toBe(1);
    expect(m.get('a')).toBe(2);
  });
});
