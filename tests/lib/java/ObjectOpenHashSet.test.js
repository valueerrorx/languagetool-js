import { describe, expect, it } from 'vitest';
import { ObjectOpenHashSet } from '../../../src/lib/java/collections/ObjectOpenHashSet.js';

describe('ObjectOpenHashSet', () => {
  it('dedups and counts', () => {
    const s = new ObjectOpenHashSet();
    for (const x of ['a', 'b', 'a', 'c']) s.add(x);
    expect(s.size).toBe(3);
    expect(s.has('b')).toBe(true);
    expect(s.has('z')).toBe(false);
    expect([...s].sort()).toEqual(['a', 'b', 'c']);
  });
  it('iterates backwards over the mixed-hash table', () => {
    // "a" hash 97, mix(97)&31 = 5 ; "b" hash 98 -> 15 ; "c" 99 -> 2? computed with the Java algorithm below
    const mix = (x) => { const h = Math.imul(x, 0x9E3779B9); return h ^ (h >>> 16); };
    const pos = (c) => mix(c.charCodeAt(0)) & 31;
    const expected = ['a', 'b', 'c'].sort((x, y) => pos(y) - pos(x));
    const s = new ObjectOpenHashSet();
    for (const x of ['a', 'b', 'c']) s.add(x);
    expect([...s]).toEqual(expected);
  });
  it('survives rehash and trim', () => {
    const s = new ObjectOpenHashSet();
    for (let i = 0; i < 100; i++) s.add(`t${i}`);
    expect(s.size).toBe(100);
    for (let i = 0; i < 100; i++) expect(s.has(`t${i}`)).toBe(true);
    s.trim();
    expect([...s].length).toBe(100);
    expect(new Set(s).size).toBe(100);
  });
  it('null element comes first', () => {
    const s = new ObjectOpenHashSet();
    s.add('x'); s.add(null);
    expect([...s]).toEqual([null, 'x']);
  });
});
