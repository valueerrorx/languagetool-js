import { describe, expect, it } from 'vitest';
import { binarySearch } from '../../../src/lib/java/arrays.js';
import { commonPrefix } from '../../../src/lib/java/Strings.js';
import { javaCompare } from '../../../src/lib/java/strings.js';

describe('Arrays#binarySearch(T[],T,Comparator)', () => {
  const a = ['abc', 'abd', 'b', 'x'];
  it('finds and returns insertion points', () => {
    expect(binarySearch(a, 'b', javaCompare)).toBe(2);
    expect(binarySearch(a, 'a', javaCompare)).toBe(-1);
    expect(binarySearch(a, 'abe', javaCompare)).toBe(-3);
    expect(binarySearch(a, 'z', javaCompare)).toBe(-5);
    expect(binarySearch([], 'z', javaCompare)).toBe(-1);
  });
});

describe('Strings#commonPrefix', () => {
  it('plain prefixes', () => {
    expect(commonPrefix('abcd', 'abxy')).toBe('ab');
    expect(commonPrefix('abc', 'abc')).toBe('abc');
    expect(commonPrefix('abc', 'xyz')).toBe('');
  });
  it('does not split a surrogate pair', () => {
    expect(commonPrefix('a😀', 'a😁')).toBe('a');
    expect(commonPrefix('a😀', 'a😀x')).toBe('a😀');
  });
});

import { levenshteinDistance } from '../../../src/lib/java/LevenshteinDistance.js';

describe('LevenshteinDistance (commons-text default instance)', () => {
  it('classic cases', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
    expect(levenshteinDistance('', 'abc')).toBe(3);
    expect(levenshteinDistance('abc', '')).toBe(3);
    expect(levenshteinDistance('', '')).toBe(0);
    expect(levenshteinDistance('flaw', 'lawn')).toBe(2);
    expect(levenshteinDistance('abc', 'abc')).toBe(0);
    expect(levenshteinDistance('ab', 'ba')).toBe(2);
  });
});
