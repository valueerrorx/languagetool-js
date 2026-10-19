import { describe, it, expect } from 'vitest';
import { StrictMath } from '../../../src/lib/java/StrictMath.js';
import * as libm from '../../../src/lib/java/libm.js';
import { JMath } from '../../../src/lib/java/numbers.js';

const dv = new DataView(new ArrayBuffer(8));
const bits = (d) => {
  dv.setFloat64(0, d);
  return dv.getBigUint64(0).toString(16).padStart(16, '0');
};

describe('StrictMath fdlibm port (S04)', () => {
  it('constants match the fdlibm hex values', () => {
    // decimal literal in the port == bits published in fdlibm sources
    const pairs = [
      [6.93147180369123816490e-01, '3fe62e42fee00000'],
      [1.90821492927058770002e-10, '3dea39ef35793c76'],
      [1.57079632673412561417e+00, '3ff921fb54400000'],
      [6.07710050650619224932e-11, '3dd0b4611a626331'],
      [8.47842766036889956997e-32, '397b839a252049c1'],
      [6.36619772367581382433e-01, '3fe45f306dc9c883'],
      [3.14159265358979311600e+00, '400921fb54442d18'],
      [1.2246467991473531772e-16, '3ca1a62633145c07'],
    ];
    for (const [v, h] of pairs) expect(bits(v)).toBe(h);
  });
  it('matches Java StrictMath results (oracle fixtures)', () => {
    expect(StrictMath.exp(1)).toBe(2.7182818284590455);
    expect(StrictMath.log(10)).toBe(2.302585092994046);
    expect(StrictMath.log10(Math.PI)).toBe(0.4971498726941338);
    expect(StrictMath.sin(1e22)).toBe(-0.8522008497671888);
    expect(StrictMath.cos(0.1)).toBe(0.9950041652780257);
    expect(StrictMath.pow(10, 23)).toBe(9.999999999999999e22);
    expect(bits(StrictMath.pow(1, Infinity))).toBe('fff8000000000000');
    expect(StrictMath.atan2(1e22, -1)).toBe(1.5707963267948968);
    expect(StrictMath.hypot(3, 4)).toBe(5);
    expect(StrictMath.cbrt(27)).toBe(3);
  });
});

describe('Math intrinsics model (S04)', () => {
  it('correctly rounded values seen from the JVM', () => {
    expect(JMath.exp(1)).toBe(Math.E);
    expect(JMath.cos(0.1)).toBe(0.9950041652780258);
    expect(JMath.log10(Math.PI)).toBe(0.49714987269413385);
    expect(JMath.pow(10, 23)).toBe(9.999999999999999e22);
    expect(JMath.pow(10, -3)).toBe(0.001);
    expect(JMath.pow(2, 0.5)).toBe(Math.SQRT2);
    expect(JMath.log(Math.E)).toBe(1);
    expect(JMath.log10(1000)).toBe(3);
    expect(JMath.tan(1e22)).toBe(-1.6287782256068988);
    expect(libm.sin(-1)).toBe(-0.8414709848078965);
    expect(libm.log(0)).toBe(-Infinity);
    expect(bits(libm.log(-1))).toBe('fff8000000000000');
  });
});

describe('StrictMath.expm1 (F44, X-MATH)', () => {
  it('matches Java StrictMath values', () => {
    expect(bits(StrictMath.expm1(1))).toBe('3ffb7e151628aed2');
    expect(StrictMath.expm1(0)).toBe(0);
    expect(Object.is(StrictMath.expm1(-0), -0)).toBe(true);
    expect(StrictMath.expm1(-Infinity)).toBe(-1);
    expect(StrictMath.expm1(710)).toBe(Infinity);
    expect(StrictMath.expm1(-100)).toBe(-1);
  });
});
