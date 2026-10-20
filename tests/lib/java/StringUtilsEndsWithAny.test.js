// Tests for StringUtils#endsWithAny (src/lib/java/StringUtils.js)
import { describe, it, expect } from 'vitest';
import { endsWithAny } from '../../../src/lib/java/StringUtils.js';

describe('StringUtils endsWithAny', () => {
  it('matches suffixes', () => {
    expect(endsWithAny('Kilogramm', 'gramm', 'Gramm')).toBe(true);
    expect(endsWithAny('Kilogramm', 'Meter', 'meter')).toBe(false);
    expect(endsWithAny('abc', '')).toBe(true);
  });
  it('empty or null input', () => {
    expect(endsWithAny('', 'a')).toBe(false);
    expect(endsWithAny(null, 'a')).toBe(false);
    expect(endsWithAny('abc')).toBe(false);
    expect(endsWithAny('abc', null)).toBe(false);
  });
});
