// Extra tests (no JUnit original): JavaHashSet / JavaHashMap#remove iteration order like java.util.HashSet
import { describe, it, expect } from 'vitest';
import { JavaHashSet } from '../../../src/lib/java/collections/JavaHashSet.js';

describe('JavaHashSet', () => {
  it('iterates in bucket order (Strings of one char: hash = char code)', () => {
    const s = new JavaHashSet();
    for (const c of ['c', 'a', 'b', 'a']) s.add(c);
    expect([...s]).toEqual(['a', 'b', 'c']);
    expect(s.size()).toBe(3);
    expect(s.add('a')).toBe(false);
  });

  it('keeps insertion order inside a bucket and after resize', () => {
    const s = new JavaHashSet();
    // 'a' (97) and 'q' (113) share bucket 1 in a 16 table; 17 elements force a resize to 32 which splits them
    s.add('q');
    s.add('a');
    expect([...s]).toEqual(['q', 'a']);
    for (let i = 0; i < 15; i++) s.add('x' + i);
    expect([...s].indexOf('a')).toBeLessThan([...s].indexOf('q'));
  });

  it('remove, retainAll, addAll, copy constructor', () => {
    const s = new JavaHashSet(['a', 'b', 'c', 'd']);
    expect(s.remove('b')).toBe(true);
    expect(s.remove('b')).toBe(false);
    expect(s.retainAll(new JavaHashSet(['a', 'd', 'z']))).toBe(true);
    expect([...s]).toEqual(['a', 'd']);
    expect(s.addAll(['d', 'e'])).toBe(true);
    expect([...s]).toEqual(['a', 'd', 'e']);
    expect(s.contains('e')).toBe(true);
    expect(s.isEmpty()).toBe(false);
    expect(s.toString()).toBe('[a, d, e]');
  });
});
