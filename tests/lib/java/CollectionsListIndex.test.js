// Extra tests (no JUnit class): Collections list view index fast path (perf round 2)
import { describe, it, expect } from 'vitest';
import { unmodifiableList, asList, emptyList } from '../../../src/lib/java/collections/Collections.js';

describe('Collections.unmodifiableList index access', () => {
  it('reads in-range indices', () => {
    const l = unmodifiableList(['a', 'b', 'c']);
    expect(l[0]).toBe('a');
    expect(l[2]).toBe('c');
    expect(l.length).toBe(3);
    expect([...l]).toEqual(['a', 'b', 'c']);
  });
  it('returns bound methods and values for function elements', () => {
    const l = unmodifiableList([1, 2]);
    expect(l.indexOf(2)).toBe(1);
  });
  it('out-of-range and negative reads yield undefined (no Proxy error, as before the fast path)', () => {
    const l = unmodifiableList(['a']);
    expect(l[1]).toBeUndefined();
    expect(l[-1]).toBeUndefined();
  });
  it('writes are rejected: index set, out-of-range set, negative set, mutators', () => {
    const l = unmodifiableList(['a']);
    expect(() => { l[0] = 'x'; }).toThrow();
    expect(() => { l[5] = 'x'; }).toThrow();
    expect(() => { l[-1] = 'x'; }).toThrow();
    expect(() => l.push('x')).toThrow();
    expect(() => l.sort()).toThrow();
    expect(l[0]).toBe('a');
  });
});

describe('Collections.asList index access (ArrayIndexOutOfBoundsException as in Java)', () => {
  it('reads in-range', () => {
    const l = asList(['a', 'b']);
    expect(l[0]).toBe('a');
    expect(l[1]).toBe('b');
  });
  it('out-of-range read throws', () => {
    const l = asList(['a', 'b']);
    expect(() => l[2]).toThrow(/Index 2 out of bounds for length 2/);
    expect(() => l[100]).toThrow(/out of bounds/);
  });
  it('negative read throws', () => {
    const l = asList(['a', 'b']);
    expect(() => l[-1]).toThrow(/Index -1 out of bounds for length 2/);
  });
  it('set in range allowed, out of range throws', () => {
    const l = asList(['a', 'b']);
    l[1] = 'z';
    expect(l[1]).toBe('z');
    expect(() => { l[2] = 'x'; }).toThrow(/out of bounds/);
    expect(() => { l[-1] = 'x'; }).toThrow(/out of bounds/);
  });
  it('empty list index throws', () => {
    expect(() => asList([])[0]).toThrow(/Index 0 out of bounds for length 0/);
  });
});

describe('Collections.emptyList', () => {
  it('index reads are undefined, sort is a no-op', () => {
    const l = emptyList();
    expect(l[0]).toBeUndefined();
    expect(() => l.sort()).not.toThrow();
  });
});
