// StringUtils#countMatches(CharSequence,CharSequence) (commons-lang3 semantics, F56)
import { describe, it, expect } from 'vitest';
import { countMatches } from '../../../src/lib/java/StringUtils.js';

describe('StringUtils#countMatches', () => {
  it('counts non-overlapping occurrences', () => {
    expect(countMatches('Diäten-Erhöhungs-Manie', '-')).toBe(2);
    expect(countMatches('aaaa', 'aa')).toBe(2);
    expect(countMatches('abc', 'd')).toBe(0);
  });
  it('returns 0 for empty arguments', () => {
    expect(countMatches('', '-')).toBe(0);
    expect(countMatches('abc', '')).toBe(0);
    expect(countMatches(null, '-')).toBe(0);
    expect(countMatches('abc', null)).toBe(0);
  });
});
