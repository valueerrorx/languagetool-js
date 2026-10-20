// Ported from GermanToolsTest
import { describe, it, expect } from 'vitest';
import { isVowel } from '../../../../src/lang/de/rules/GermanTools.js';

describe('GermanToolsTest', () => {
  // Java: GermanToolsTest#testIsVowel
  it('testIsVowel', () => {
    expect(isVowel('a')).toBe(true);
    expect(isVowel('Y')).toBe(true);
    expect(isVowel('A')).toBe(true);
    expect(isVowel('ö')).toBe(true);
    expect(isVowel('b')).toBe(false);
  });
});
