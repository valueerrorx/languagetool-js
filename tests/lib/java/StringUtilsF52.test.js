// Extra tests (no Java original) for the commons-lang3 StringUtils subset added in F52
import { describe, it, expect } from 'vitest';
import { capitalize, isAllLowerCase, isAllUpperCase, removeChar, substringAfter } from '../../../src/lib/java/StringUtils.js';

describe('StringUtils (F52 additions)', () => {
  it('isAllUpperCase', () => {
    expect(isAllUpperCase('ABC')).toBe(true);
    expect(isAllUpperCase('ÄÖÜ')).toBe(true);
    expect(isAllUpperCase('ABc')).toBe(false);
    expect(isAllUpperCase('')).toBe(false);
    expect(isAllUpperCase(null)).toBe(false);
    expect(isAllUpperCase('A-B')).toBe(false);
  });

  it('isAllLowerCase', () => {
    expect(isAllLowerCase('abc')).toBe(true);
    expect(isAllLowerCase('äöüß')).toBe(true);
    expect(isAllLowerCase('abC')).toBe(false);
    expect(isAllLowerCase('')).toBe(false);
    expect(isAllLowerCase(null)).toBe(false);
    expect(isAllLowerCase('a b')).toBe(false);
  });

  it('capitalize', () => {
    expect(capitalize('abc')).toBe('Abc');
    expect(capitalize('Abc')).toBe('Abc');
    expect(capitalize('')).toBe('');
    expect(capitalize(null)).toBe(null);
    expect(capitalize('ǆa')).toBe('ǅa'); // title case, not upper case
    expect(capitalize('ßa')).toBe('ßa'); // no single-character title case
  });

  it('removeChar', () => {
    expect(removeChar('a b c', ' ')).toBe('abc');
    expect(removeChar('abc', ' ')).toBe('abc');
    expect(removeChar('', ' ')).toBe('');
    expect(removeChar(null, ' ')).toBe(null);
  });

  it('substringAfter', () => {
    expect(substringAfter('100stel-Millimeter', '-')).toBe('Millimeter');
    expect(substringAfter('a-b-c', '-')).toBe('b-c');
    expect(substringAfter('abc', '-')).toBe('');
    expect(substringAfter('abc', '')).toBe('abc');
    expect(substringAfter('', '-')).toBe('');
    expect(substringAfter(null, '-')).toBe(null);
    expect(substringAfter('abc', null)).toBe('');
  });
});
