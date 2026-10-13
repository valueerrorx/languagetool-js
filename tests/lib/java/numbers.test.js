import { describe, it, expect } from 'vitest';
import { Integer, IntMath, idiv, irem, ishl, iushr, ineg } from '../../../src/lib/java/int.js';
import { Long, LongMath, ladd, lmul, lshl, lushr, ldiv } from '../../../src/lib/java/long.js';
import { Float, FloatMath, fadd, frem, } from '../../../src/lib/java/float.js';
import { Double, Short, Byte, JBoolean, JMath, drem } from '../../../src/lib/java/numbers.js';
import { d2i, d2l, d2c, l2f, l2i, i2b, i2c } from '../../../src/lib/java/casts.js';
import { digit, forDigit, getNumericValue } from '../../../src/lib/java/charDigit.js';
import { parseDouble, parseFloat32 } from '../../../src/lib/java/floatingDecimal.js';
import { assertThrowsJava } from '../../support/javaAssert.js';

const NFE = 'java.lang.NumberFormatException';
const AE = 'java.lang.ArithmeticException';

describe('int (S04)', () => {
  it('wraps and divides like Java', () => {
    expect(Math.imul(65536, 65536)).toBe(0);
    expect(idiv(-7, 2)).toBe(-3);
    expect(irem(-7, 2)).toBe(-1);
    expect(Object.is(irem(-2147483648, -1), 0)).toBe(true);
    expect(idiv(-2147483648, -1)).toBe(-2147483648);
    assertThrowsJava(() => idiv(1, 0), AE, '/ by zero');
    assertThrowsJava(() => irem(1, 0), AE, '/ by zero');
    expect(ishl(1, 33)).toBe(2);
    expect(iushr(-1, 28)).toBe(15);
    expect(ineg(-2147483648)).toBe(-2147483648);
  });
  it('Math exact / floor', () => {
    expect(IntMath.floorDiv(-7, 2)).toBe(-4);
    expect(IntMath.floorMod(-7, 2)).toBe(1);
    expect(IntMath.floorMod(7, -2)).toBe(-1);
    assertThrowsJava(() => IntMath.addExact(2147483647, 1), AE, 'integer overflow');
    assertThrowsJava(() => IntMath.multiplyExact(65536, 65536), AE, 'integer overflow');
    assertThrowsJava(() => IntMath.absExact(-2147483648), AE, 'Overflow to represent absolute value of Integer.MIN_VALUE');
    expect(IntMath.abs(-2147483648)).toBe(-2147483648);
  });
  it('parse', () => {
    expect(Integer.parseInt('-2147483648')).toBe(-2147483648);
    expect(Integer.parseInt('+5')).toBe(5);
    expect(Integer.parseInt('٣٤')).toBe(34);
    expect(Integer.parseInt('ff', 16)).toBe(255);
    assertThrowsJava(() => Integer.parseInt('2147483648'), NFE, 'For input string: "2147483648"');
    assertThrowsJava(() => Integer.parseInt('zz', 16), NFE, 'For input string: "zz" under radix 16');
    assertThrowsJava(() => Integer.parseInt(null), NFE, 'Cannot parse null string');
    assertThrowsJava(() => Integer.parseInt('1', 37), NFE, 'radix 37 greater than Character.MAX_RADIX');
    assertThrowsJava(() => Integer.parseInt(' 5'), NFE, 'For input string: " 5"');
    expect(Integer.decode('-0x80000000')).toBe(-2147483648);
    expect(Integer.decode('010')).toBe(8);
    expect(Integer.decode('#FF')).toBe(255);
    assertThrowsJava(() => Integer.decode('08'), NFE, 'For input string: "8" under radix 8');
    assertThrowsJava(() => Integer.decode('+-5'), NFE, 'Sign character in wrong position');
    assertThrowsJava(() => Integer.decode(null), 'java.lang.NullPointerException', 'Cannot invoke "String.isEmpty()" because "nm" is null');
    expect(Integer.parseUnsignedInt('4294967295')).toBe(-1);
    assertThrowsJava(() => Integer.parseUnsignedInt('4294967296'), NFE, 'String value 4294967296 exceeds range of unsigned int.');
    assertThrowsJava(() => Short.parseShort('32768'), NFE, 'Value out of range. Value:"32768" Radix:10');
    expect(Byte.parseByte('-128')).toBe(-128);
  });
  it('toString and bit ops', () => {
    expect(Integer.toHexString(-1)).toBe('ffffffff');
    expect(Integer.toString(-255, 16)).toBe('-ff');
    expect(Integer.toString(5, 99)).toBe('5');
    expect(Integer.toBinaryString(5)).toBe('101');
    expect(Integer.toUnsignedString(-1)).toBe('4294967295');
    expect(Integer.bitCount(-1)).toBe(32);
    expect(Integer.reverse(1)).toBe(-2147483648);
    expect(Integer.highestOneBit(-1)).toBe(-2147483648);
    expect(Integer.numberOfTrailingZeros(0)).toBe(32);
    expect(Integer.compareUnsigned(-1, 1)).toBe(1);
    expect(Integer.divideUnsigned(-1, 2)).toBe(2147483647);
    expect(Integer.signum(-5)).toBe(-1);
  });
});

describe('long (S04)', () => {
  it('wraps with BigInt', () => {
    expect(ladd(9223372036854775807n, 1n)).toBe(-9223372036854775808n);
    expect(lmul(6364136223846793005n, 1442695040888963407n)).toBe(BigInt.asIntN(64, 6364136223846793005n * 1442695040888963407n));
    expect(lshl(1n, 65n)).toBe(2n);
    expect(lushr(-1n, 60n)).toBe(15n);
    expect(ldiv(-9223372036854775808n, -1n)).toBe(-9223372036854775808n);
    assertThrowsJava(() => ldiv(1n, 0n), AE, '/ by zero');
    assertThrowsJava(() => LongMath.addExact(9223372036854775807n, 1n), AE, 'long overflow');
    assertThrowsJava(() => LongMath.toIntExact(2147483648n), AE, 'integer overflow');
    expect(LongMath.multiplyHigh(9223372036854775807n, 9223372036854775807n)).toBe(4611686018427387903n);
    expect(LongMath.floorMod(-7n, 2n)).toBe(1n);
  });
  it('parse and format', () => {
    expect(Long.parseLong('-9223372036854775808')).toBe(-9223372036854775808n);
    assertThrowsJava(() => Long.parseLong('9223372036854775808'), NFE, 'For input string: "9223372036854775808"');
    expect(Long.parseUnsignedLong('18446744073709551615')).toBe(-1n);
    assertThrowsJava(() => Long.parseUnsignedLong('18446744073709551616'), NFE, 'String value 18446744073709551616 exceeds range of unsigned long.');
    expect(Long.decode('0x7fffffffffffffff')).toBe(9223372036854775807n);
    expect(Long.toHexString(-1n)).toBe('ffffffffffffffff');
    expect(Long.toUnsignedString(-1n)).toBe('18446744073709551615');
    expect(Long.hashCode(4294967296n)).toBe(1);
    expect(Long.hashCode(-9223372036854775808n)).toBe(-2147483648);
    expect(Long.numberOfLeadingZeros(1n)).toBe(63);
    expect(Long.rotateLeft(1n, 65)).toBe(2n);
  });
});

describe('float/double (S04)', () => {
  it('float arithmetic rounds to 32 bit', () => {
    expect(fadd(0.1, 0.2)).toBe(Math.fround(Math.fround(0.1) + Math.fround(0.2)));
    expect(l2f(16777217n)).toBe(16777216);
    expect(l2f(9007199791611905n)).toBe(9007200328482816); // direct rounding, Math.fround(Number(l)) would double-round
    expect(Float.parseFloat('1.00000017881393432617187500')).toBe(1.0000002384185791);
    expect(Float.parseFloat('3.4028236e38')).toBe(Infinity);
    expect(Float.parseFloat('1e-45')).toBe(1.401298464324817e-45);
    expect(Float.hashCode(1.5)).toBe(1069547520);
    expect(Float.compare(0.0, -0.0)).toBe(1);
    expect(FloatMath.round(2.5)).toBe(3);
    expect(FloatMath.round(-2.5)).toBe(-2);
    expect(FloatMath.ulp(1.0)).toBe(1.1920928955078125e-7);
  });
  it('parseDouble', () => {
    expect(parseDouble(' 1.5f ')).toBe(1.5);
    expect(parseDouble('0x1.8p1')).toBe(3);
    expect(parseDouble('0x1p-1075')).toBe(0);
    expect(parseDouble('2.4703282292062328e-324')).toBe(5e-324);
    expect(Object.is(parseDouble('-0'), -0)).toBe(true);
    expect(parseDouble('1e400')).toBe(Infinity);
    assertThrowsJava(() => parseDouble(''), NFE, 'empty String');
    assertThrowsJava(() => parseDouble('1e'), NFE, 'For input string: "1e"');
    assertThrowsJava(() => parseDouble('1.2.3'), NFE, 'multiple points');
    assertThrowsJava(() => parseDouble('NaNf'), NFE, 'For input string: "NaNf"');
    assertThrowsJava(() => parseDouble(null), 'java.lang.NullPointerException', 'Cannot invoke "String.trim()" because "in" is null');
    expect(parseFloat32('16777217')).toBe(16777216);
  });
  it('Double statics', () => {
    expect(Double.hashCode(1.5)).toBe(1073217536);
    expect(Double.hashCode(NaN)).toBe(2146959360);
    expect(Double.compare(NaN, 1)).toBe(1);
    expect(Double.compare(0.0, -0.0)).toBe(1);
    expect(Double.toHexString(1.0)).toBe('0x1.0p0');
    expect(Double.toHexString(-0.0)).toBe('-0x0.0p0');
    expect(Double.toHexString(5e-324)).toBe('0x0.0000000000001p-1022');
    expect(Double.toHexString(0.1)).toBe('0x1.999999999999ap-4');
    expect(JBoolean.parseBoolean('TrUe')).toBe(true);
    expect(JBoolean.parseBoolean(null)).toBe(false);
    expect(JBoolean.parseBoolean(' true')).toBe(false);
  });
  it('Math round/rint/min/max/fma/IEEEremainder', () => {
    expect(JMath.round(0.49999999999999994)).toBe(0n);
    expect(JMath.round(-2.5)).toBe(-2n);
    expect(JMath.round(2.5)).toBe(3n);
    expect(JMath.round(NaN)).toBe(0n);
    expect(JMath.round(1e19)).toBe(9223372036854775807n);
    expect(JMath.rint(2.5)).toBe(2);
    expect(Object.is(JMath.rint(-0.4), -0)).toBe(true);
    expect(Object.is(JMath.min(0.0, -0.0), -0)).toBe(true);
    expect(JMath.IEEEremainder(5, 3)).toBe(-1);
    expect(JMath.IEEEremainder(7.5, 2)).toBe(-0.5);
    expect(JMath.fma(0.1, 10, 1.0)).toBe(2);
    expect(JMath.ulp(1.0)).toBe(2.220446049250313e-16);
    expect(JMath.nextUp(1.0)).toBe(1.0000000000000002);
    expect(Object.is(JMath.copySign(3, -0.0), -3)).toBe(true);
    expect(Object.is(drem(-4, 2), -0)).toBe(true);
    expect(frem(5.5, 2)).toBe(1.5);
  });
});

describe('casts (S04)', () => {
  it('saturate and wrap', () => {
    expect(d2i(NaN)).toBe(0);
    expect(d2i(1e10)).toBe(2147483647);
    expect(d2i(-1e10)).toBe(-2147483648);
    expect(d2i(-1.9)).toBe(-1);
    expect(d2l(1e19)).toBe(9223372036854775807n);
    expect(d2l(-1e19)).toBe(-9223372036854775808n);
    expect(d2l(NaN)).toBe(0n);
    expect(d2c(-1)).toBe(65535);
    expect(l2i(4294967297n)).toBe(1);
    expect(i2b(200)).toBe(-56);
    expect(i2c(-1)).toBe(65535);
  });
  it('Character digits', () => {
    expect(digit(0x41, 16)).toBe(10);
    expect(digit(0x663, 10)).toBe(3);
    expect(digit(0xff11, 10)).toBe(1);
    expect(digit(0x7a, 10)).toBe(-1);
    expect(digit(0x7a, 36)).toBe(35);
    expect(forDigit(11, 16)).toBe(0x62);
    expect(forDigit(36, 36)).toBe(0);
    expect(getNumericValue(0x2160)).toBe(1);
    expect(getNumericValue(0xbd)).toBe(-2);
  });
});

describe('int zero results are +0 (review fix)', () => {
  it('never returns -0', () => {
    const zeros = [
      ineg(0), idiv(0, -5), idiv(-1, 5), irem(-4, 2), irem(0, -3), ishl(0, 3), iushr(0, 3),
      IntMath.abs(0), IntMath.negateExact(0), IntMath.absExact(0), IntMath.floorDiv(0, -3), IntMath.floorDiv(-1, 5) + 1,
      IntMath.floorMod(-4, 2), IntMath.floorMod(0, -3), IntMath.multiplyExact(0, -5), IntMath.multiplyExact(-5, 0),
      IntMath.incrementExact(-1), IntMath.decrementExact(1), IntMath.addExact(-1, 1), IntMath.subtractExact(0, 0),
      Integer.remainderUnsigned(0, -3), Integer.divideUnsigned(0, -3), Integer.signum(0), Integer.parseInt('-0'),
      Integer.valueOf('-0'), Integer.decode('-0'), d2i(-0.5), d2i(-0), i2b(0), i2c(0), l2i(0n),
    ];
    for (const z of zeros) expect(Object.is(z, 0)).toBe(true);
  });
  it('parseLong range index check', () => {
    expect(() => Long.parseLong('abc', 2, 1, 10)).toThrow();
  });
});
