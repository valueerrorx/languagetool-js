// arraySet (Java a[i] = v) and Matcher#replaceAll(null) (F29 helpers)
import { describe, it, expect } from 'vitest';
import { arraySet } from '../../../src/lib/java/arrays.js';
import { NullPointerException } from '../../../src/lib/java/errors.js';
import { Pattern } from '../../../src/lib/java/regex/index.js';

describe('arraySet', () => {
  it('writes within bounds and throws ArrayIndexOutOfBoundsException outside', () => {
    const a = [0, 0];
    arraySet(a, 1, 5);
    expect(a).toEqual([0, 5]);
    expect(() => arraySet(a, 2, 1)).toThrow('Index 2 out of bounds for length 2');
    expect(() => arraySet(a, -1, 1)).toThrow('Index -1 out of bounds for length 2');
  });
});

describe('Matcher#replaceAll(null)', () => {
  it('throws NullPointerException only when something matches (JDK 17)', () => {
    expect(Pattern.compile('x').matcher('abc').replaceAll(null)).toBe('abc');
    expect(() => Pattern.compile('b').matcher('abc').replaceAll(null)).toThrow(NullPointerException);
  });
});
