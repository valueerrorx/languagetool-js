// Tests for StringUtils#getDigits and StringUtils#uncapitalize (src/lib/java/StringUtils.js)
import { describe, it, expect } from 'vitest';
import { getDigits, uncapitalize } from '../../../src/lib/java/StringUtils.js';

describe('StringUtils getDigits/uncapitalize', () => {
  it('getDigits', () => {
    expect(getDigits('ab12c3')).toBe('123');
    expect(getDigits('')).toBe('');
    expect(getDigits(null)).toBeNull();
    expect(getDigits('٣x')).toBe('٣'); // Character.isDigit accepts non-ASCII decimal digits
  });

  it('uncapitalize', () => {
    expect(uncapitalize('Hello')).toBe('hello');
    expect(uncapitalize('hello')).toBe('hello');
    expect(uncapitalize('')).toBe('');
    expect(uncapitalize(null)).toBeNull();
    expect(uncapitalize('Éa')).toBe('éa');
  });
});
