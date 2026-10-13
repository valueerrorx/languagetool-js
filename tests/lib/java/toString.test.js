import { describe, it, expect } from 'vitest';
import { doubleToString, floatToString, abstractCollectionToString, abstractMapToString } from '../../../src/lib/java/toString.js';

describe('toString (X-NUMFMT)', () => {
  it('Double.toString JDK 17', () => {
    expect(doubleToString(1e23)).toBe('9.999999999999999E22');
    expect(doubleToString(5.684341886080802e-14)).toBe('5.6843418860808015E-14');
    expect(doubleToString(0)).toBe('0.0');
    expect(doubleToString(-0)).toBe('-0.0');
    expect(doubleToString(100)).toBe('100.0');
    expect(doubleToString(1e7)).toBe('1.0E7');
    expect(doubleToString(0.001)).toBe('0.001');
    expect(doubleToString(NaN)).toBe('NaN');
    expect(doubleToString(-Infinity)).toBe('-Infinity');
    expect(doubleToString(Number.MIN_VALUE)).toBe('4.9E-324');
    expect(doubleToString(Number.MAX_VALUE)).toBe('1.7976931348623157E308');
  });
  it('Float.toString', () => {
    expect(floatToString(0.1)).toBe('0.1');
    expect(floatToString(1.1754944e-38)).toBe('1.17549435E-38');
    expect(floatToString(16777216)).toBe('1.6777216E7');
  });
  it('collections and maps', () => {
    expect(abstractCollectionToString([])).toBe('[]');
    expect(abstractCollectionToString([1, 'a', null])).toBe('[1, a, null]');
    expect(abstractMapToString(new Map())).toBe('{}');
    expect(abstractMapToString(new Map([['k', 1], ['j', null]]))).toBe('{k=1, j=null}');
    expect(abstractCollectionToString([-0, 1.5, 2])).toBe('[-0.0, 1.5, 2]');
    const m = new Map();
    m.set('self', m);
    expect(abstractMapToString(m)).toBe('{self=(this Map)}');
  });
});
