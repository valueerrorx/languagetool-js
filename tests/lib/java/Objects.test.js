import { describe, it, expect } from 'vitest';
import { Objects, stringHashCode } from '../../../src/lib/java/Objects.js';
import { assertThrowsJava } from '../../support/javaAssert.js';

describe('Objects (X-ERRORS)', () => {
  it('requireNonNull', () => {
    expect(Objects.requireNonNull('a')).toBe('a');
    assertThrowsJava(() => Objects.requireNonNull(null), 'java.lang.NullPointerException', null);
    assertThrowsJava(() => Objects.requireNonNull(null, 'msg'), 'java.lang.NullPointerException', 'msg');
    assertThrowsJava(() => Objects.requireNonNull(undefined, () => 'sup'), 'java.lang.NullPointerException', 'sup');
  });
  it('equals', () => {
    expect(Objects.equals(null, null)).toBe(true);
    expect(Objects.equals(null, 'a')).toBe(false);
    expect(Objects.equals('a', 'a')).toBe(true);
    expect(Objects.equals({ equals: () => true }, 1)).toBe(true);
    // JDK 17: Objects.equals(NaN, NaN) true, (0.0, -0.0) false, (-0.0, -0.0) true
    expect(Objects.equals(NaN, NaN)).toBe(true);
    expect(Objects.equals(0, -0)).toBe(false);
    expect(Objects.equals(-0, -0)).toBe(true);
    expect(Objects.equals(1, 1)).toBe(true);
    expect(Objects.equals(1, 'a')).toBe(false);
  });
  it('hash matches Java', () => {
    expect(stringHashCode('hello')).toBe(99162322);
    expect(Objects.hash('a', 'b')).toBe(Math.imul(31, 31 + 97) + 98 | 0);
    expect(Objects.hash(1, 2, 3)).toBe(30817);
    expect(Objects.hash()).toBe(1);
    expect(Objects.hash(null)).toBe(31);
    expect(Objects.hash(true)).toBe(31 + 1231);
    expect(Objects.hash(1.5)).toBe(31 + 1073217536);
    // JDK 17 values (non-integral doubles; integral doubles are ambiguous with Integer in JS)
    expect(Objects.hash(null, null)).toBe(961);
    expect(Objects.hash(2.5, null)).toBe(31 * (31 + 1074003968) + 0 | 0);
    expect(Objects.hash(-0)).toBe(-2147483617);
    expect(Objects.hash(NaN)).toBe(2146959391);
    expect(Objects.hash(1e300, 'a', null)).toBe(1184508350);
  });
  it('toString', () => {
    expect(Objects.toString(null)).toBe('null');
    expect(Objects.toString(null, 'd')).toBe('d');
    expect(Objects.toString(7)).toBe('7');
    expect(Objects.toString(0.1)).toBe('0.1');
    expect(Objects.toString(-0)).toBe('-0.0');
    expect(Objects.toString(NaN)).toBe('NaN');
    assertThrowsJava(() => Objects.toString({}), 'java.lang.UnsupportedOperationException');
  });
  it('checkIndex', () => {
    expect(Objects.checkIndex(1, 2)).toBe(1);
    assertThrowsJava(() => Objects.checkIndex(2, 2), 'java.lang.IndexOutOfBoundsException', 'Index 2 out of bounds for length 2');
    assertThrowsJava(() => Objects.checkIndex(-1, 3), 'java.lang.IndexOutOfBoundsException', 'Index -1 out of bounds for length 3');
    assertThrowsJava(() => Objects.checkIndex(5, 3), 'java.lang.IndexOutOfBoundsException', 'Index 5 out of bounds for length 3');
    assertThrowsJava(() => Objects.checkIndex(0, 0), 'java.lang.IndexOutOfBoundsException', 'Index 0 out of bounds for length 0');
    assertThrowsJava(() => Objects.checkIndex(1, -1), 'java.lang.IndexOutOfBoundsException', 'Index 1 out of bounds for length -1');
  });
});
