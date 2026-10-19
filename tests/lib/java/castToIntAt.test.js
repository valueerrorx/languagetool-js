// Extra test: Java (int) objs[i] cast on an Object[] of boxed config values
import { describe, it, expect } from 'vitest';
import { castToIntAt } from '../../../src/lib/java/casts.js';

describe('castToIntAt', () => {
  it('returns Integer values', () => {
    expect(castToIntAt([5, true], 0)).toBe(5);
  });

  it('throws ClassCastException for Boolean/String', () => {
    expect(() => castToIntAt([true], 0)).toThrow("class java.lang.Boolean cannot be cast to class java.lang.Integer (java.lang.Boolean and java.lang.Integer are in module java.base of loader 'bootstrap')");
    expect(() => castToIntAt(['x'], 0)).toThrow('class java.lang.String cannot be cast to class java.lang.Integer');
  });

  it('throws ArrayIndexOutOfBoundsException for an empty array', () => {
    expect(() => castToIntAt([], 0)).toThrow('Index 0 out of bounds for length 0');
  });
});
