// Tests for src/lib/java/collections/Collections.js minors (emptyList sort, asList bounds, shuffle)
import { describe, it, expect } from 'vitest';
import { emptyList, asList, unmodifiableList, shuffle } from '../../../src/lib/java/collections/Collections.js';
import { Random } from '../../../src/lib/java/Random.js';
import { ArrayIndexOutOfBoundsException, UnsupportedOperationException } from '../../../src/lib/java/errors.js';
import { JavaHashMap } from '../../../src/lib/java/collections/JavaHashMap.js';

describe('Collections', () => {
  it('emptyList().sort is a no-op, other mutators throw', () => {
    const l = emptyList();
    expect(() => l.sort()).not.toThrow();
    expect(() => l.push('x')).toThrow(UnsupportedOperationException);
  });

  it('unmodifiableList.sort throws', () => {
    expect(() => unmodifiableList(['b', 'a']).sort()).toThrow(UnsupportedOperationException);
  });

  it('Arrays.asList out-of-range get/set -> ArrayIndexOutOfBoundsException, add -> UOE', () => {
    const l = asList(['a', 'b', 'c']);
    expect(() => l[3]).toThrow(ArrayIndexOutOfBoundsException);
    expect(() => l[3]).toThrow('Index 3 out of bounds for length 3');
    expect(() => { l[9] = 'z'; }).toThrow(ArrayIndexOutOfBoundsException);
    expect(() => l.push('d')).toThrow(UnsupportedOperationException);
    l[0] = 'z';
    expect([...l]).toEqual(['z', 'b', 'c']);
    l.sort();
    expect([...l]).toEqual(['b', 'c', 'z']);
  });

  it('shuffle permutes in place (order vs Java checked by X-PROBE-COLLECTIONS/shuffle)', () => {
    const l = ['e0', 'e1', 'e2', 'e3', 'e4', 'e5'];
    shuffle(l, new Random(0));
    expect([...l].sort()).toEqual(['e0', 'e1', 'e2', 'e3', 'e4', 'e5']);
  });
});

describe('JavaHashMap treeifyBin', () => {
  it('a 9th colliding node in a small table resizes instead of treeifying', () => {
    const m = new JavaHashMap();
    for (let i = 0; i < 9; i++) m.put(i * 16, 'v');
    expect(m.table.length).toBe(32);
    expect(m.treeBinsNeeded).toBe(false);
  });
});
