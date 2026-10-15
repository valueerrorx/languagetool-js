// commons-lang3 StringUtils#abbreviate(String,int) subset (src/lib/java/StringUtils.js)
import { describe, it, expect } from 'vitest';
import { abbreviate } from '../../../src/lib/java/StringUtils.js';

describe('StringUtils.abbreviate', () => {
  it('follows commons-lang3', () => {
    expect(abbreviate(null, 4)).toBe(null);
    expect(abbreviate('', 4)).toBe('');
    expect(abbreviate('abcdefg', 6)).toBe('abc...');
    expect(abbreviate('abcdefg', 7)).toBe('abcdefg');
    expect(abbreviate('abcdefg', 8)).toBe('abcdefg');
    expect(abbreviate('abcdefg', 4)).toBe('a...');
    expect(() => abbreviate('abcdefg', 3)).toThrow('Minimum abbreviation width is 4');
  });
});
