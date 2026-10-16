import { describe, it, expect } from 'vitest';
import { formatFixed } from '../../../src/lib/java/Formatter.js';

describe('formatFixed', () => {
  it('%.1f HALF_UP on shortest digits', () => {
    expect(formatFixed(0.15, 1)).toBe('0.2');
    expect(formatFixed(3.25, 1)).toBe('3.3');
    expect(formatFixed(0, 1)).toBe('0.0');
    expect(formatFixed(9.96, 1)).toBe('10.0');
    expect(formatFixed(1234567, 1)).toBe('1234567.0');
    expect(formatFixed(0.04, 1)).toBe('0.0');
    expect(formatFixed(1e-7, 1)).toBe('0.0');
    expect(formatFixed(NaN, 1)).toBe('NaN');
    expect(formatFixed(Infinity, 1)).toBe('Infinity');
    expect(formatFixed(Math.fround(3.2), 1)).toBe('3.2');
  });
});
