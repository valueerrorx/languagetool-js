// java.lang.Double/Short/Byte/Boolean/Character boxed-number statics and double overloads of java.lang.Math.
import { NumberFormatException } from './errors.js';
import { doubleToString } from './toString.js';
import { parseDouble, roundToDouble, decomposeDouble as decompose } from './floatingDecimal.js';
import { StrictMath, DEFAULT_NAN } from './StrictMath.js';
import * as libm from './libm.js';
import { Integer } from './int.js';
import { d2l } from './casts.js';

const dv = new DataView(new ArrayBuffer(8));

// Java: Double.doubleToRawLongBits(double)
function doubleToRawLongBits(d) {
  dv.setFloat64(0, d);
  return dv.getBigInt64(0);
}

// Java: double % double (HotSpot drem: NaN operand propagates, invalid operation gives the x86 default NaN)
export function drem(x, y) {
  if (x !== x) return x;
  if (y !== y) return y;
  if (y === 0 || x === Infinity || x === -Infinity) {
    return DEFAULT_NAN;
  }
  return x % y;
}

// Java: java.lang.Double (static methods; boxed Double is a JS number)
export const Double = {
  MAX_VALUE: Number.MAX_VALUE,
  MIN_VALUE: Number.MIN_VALUE,
  MIN_NORMAL: 2.2250738585072014e-308,

  // Java: Double#parseDouble(String)
  parseDouble(s) {
    return parseDouble(s);
  },

  // Java: Double#valueOf(String)
  valueOf(s) {
    return parseDouble(s);
  },

  // Java: Double#toString(double)
  toString(d) {
    return doubleToString(d);
  },

  // Java: Double#doubleToRawLongBits(double)
  doubleToRawLongBits,

  // Java: Double#doubleToLongBits(double)
  doubleToLongBits(d) {
    return d !== d ? 0x7ff8000000000000n : doubleToRawLongBits(d);
  },

  // Java: Double#longBitsToDouble(long)
  longBitsToDouble(bits) {
    dv.setBigInt64(0, bits);
    return dv.getFloat64(0);
  },

  // Java: Double#hashCode(double)
  hashCode(value) {
    const bits = Double.doubleToLongBits(value);
    return Number(BigInt.asIntN(32, bits ^ (BigInt.asUintN(64, bits) >> 32n)));
  },

  // Java: Double#compare(double,double)
  compare(d1, d2) {
    if (d1 < d2) return -1;
    if (d1 > d2) return 1;
    const a = Double.doubleToLongBits(d1);
    const b = Double.doubleToLongBits(d2);
    return a === b ? 0 : a < b ? -1 : 1;
  },

  // Java: Double#isNaN(double)
  isNaN(v) {
    return v !== v;
  },

  // Java: Double#isInfinite(double)
  isInfinite(v) {
    return v === Infinity || v === -Infinity;
  },

  // Java: Double#isFinite(double)
  isFinite(d) {
    return Math.abs(d) <= Double.MAX_VALUE;
  },

  // Java: Double#sum(double,double)
  sum(a, b) {
    return a + b;
  },

  // Java: Double#max(double,double)
  max(a, b) {
    return JMath.max(a, b);
  },

  // Java: Double#min(double,double)
  min(a, b) {
    return JMath.min(a, b);
  },

  // Java: Double#toHexString(double)
  toHexString(d) {
    if (!Double.isFinite(d)) return doubleToString(d);
    let answer = '';
    if (JMath.copySign(1.0, d) === -1.0) answer += '-';
    answer += '0x';
    d = Math.abs(d);
    if (d === 0.0) {
      answer += '0.0p0';
    } else {
      const subnormal = d < Double.MIN_NORMAL;
      const signifBits = (doubleToRawLongBits(d) & 0xfffffffffffffn) | 0x1000000000000000n;
      answer += subnormal ? '0.' : '1.';
      const signif = signifBits.toString(16).substring(3, 16);
      answer += signif === '0000000000000' ? '0' : signif.replace(/0{1,12}$/, '');
      answer += 'p';
      answer += subnormal ? -1022 : JMath.getExponent(d);
    }
    return answer;
  },
};

// Java: java.lang.Short (static methods)
export const Short = {
  MIN_VALUE: -32768,
  MAX_VALUE: 32767,

  // Java: Short#parseShort(String) / (String,int)
  parseShort(s, radix = 10) {
    const i = Integer.parseInt(s, radix);
    if (i < -32768 || i > 32767) throw new NumberFormatException(`Value out of range. Value:"${s}" Radix:${radix}`);
    return i;
  },

  // Java: Short#valueOf(String)
  valueOf(s, radix = 10) {
    return Short.parseShort(s, radix);
  },

  // Java: Short#compare(short,short)
  compare(x, y) {
    return x - y;
  },

  // Java: Short#hashCode(short)
  hashCode(value) {
    return value;
  },
};

// Java: java.lang.Byte (static methods)
export const Byte = {
  MIN_VALUE: -128,
  MAX_VALUE: 127,

  // Java: Byte#parseByte(String) / (String,int)
  parseByte(s, radix = 10) {
    const i = Integer.parseInt(s, radix);
    if (i < -128 || i > 127) throw new NumberFormatException(`Value out of range. Value:"${s}" Radix:${radix}`);
    return i;
  },

  // Java: Byte#valueOf(String)
  valueOf(s, radix = 10) {
    return Byte.parseByte(s, radix);
  },

  // Java: Byte#compare(byte,byte)
  compare(x, y) {
    return x - y;
  },

  // Java: Byte#hashCode(byte)
  hashCode(value) {
    return value;
  },
};

// Java: java.lang.Character numeric statics (char = number 0..65535)
export const Char = {
  // Java: Character#compare(char,char)
  compare(x, y) {
    return x - y;
  },

  // Java: Character#hashCode(char)
  hashCode(value) {
    return value;
  },
};

// Java: java.lang.Boolean (static methods)
export const JBoolean = {
  // Java: Boolean#parseBoolean(String)
  parseBoolean(s) {
    return s !== null && s !== undefined && s.length === 4 && s.toLowerCase() === 'true';
  },

  // Java: Boolean#valueOf(String)
  valueOf(s) {
    return JBoolean.parseBoolean(s);
  },

  // Java: Boolean#compare(boolean,boolean)
  compare(x, y) {
    return x === y ? 0 : x ? 1 : -1;
  },

  // Java: Boolean#hashCode(boolean)
  hashCode(value) {
    return value ? 1231 : 1237;
  },
};

// Java: java.lang.Math double overloads (math functions delegate to StrictMath where Java does)
export const JMath = {
  // Java: Math#abs(double)
  abs(a) {
    return Math.abs(a);
  },

  // Java: Math#min(double,double)
  min(a, b) {
    if (a !== a) return a;
    if (b !== b) return b;
    return Math.min(a, b);
  },

  // Java: Math#max(double,double)
  max(a, b) {
    if (a !== a) return a;
    if (b !== b) return b;
    return Math.max(a, b);
  },

  // Java: Math#round(double)
  round(a) {
    const longBits = doubleToRawLongBits(a);
    const biasedExp = (longBits & 0x7ff0000000000000n) >> 52n;
    const shift = 51n + 1023n - biasedExp;
    if ((shift & -64n) === 0n) {
      let r = (longBits & 0xfffffffffffffn) | 0x10000000000000n;
      if (longBits < 0n) r = -r;
      return ((r >> shift) + 1n) >> 1n;
    }
    return d2l(a);
  },

  // Java: Math#rint(double)
  rint(a) {
    const twoToThe52 = 4503599627370496;
    const sign = JMath.copySign(1.0, a);
    a = Math.abs(a);
    if (a < twoToThe52) a = twoToThe52 + a - twoToThe52;
    return sign * a;
  },

  // Java: Math#floor(double)
  floor(a) {
    return Math.floor(a);
  },

  // Java: Math#ceil(double)
  ceil(a) {
    return Math.ceil(a);
  },

  // Java: Math#signum(double)
  signum(d) {
    return d === 0.0 || d !== d ? d : Math.sign(d);
  },

  // Java: Math#copySign(double,double)
  // NaN sign follows the raw bits; V8 may canonicalise NaN so the sign of a NaN argument can differ
  copySign(magnitude, sign) {
    dv.setFloat64(0, sign);
    const neg = (dv.getUint8(0) & 0x80) !== 0;
    const m = Math.abs(magnitude);
    return neg ? -m : m;
  },

  // Java: Math#getExponent(double)
  getExponent(d) {
    dv.setFloat64(0, d);
    return Number((dv.getBigUint64(0) >> 52n) & 0x7ffn) - 1023;
  },

  // Java: Math#ulp(double)
  ulp(d) {
    const exp = JMath.getExponent(d);
    if (exp === 1024) return Math.abs(d);
    if (exp === -1023) return Double.MIN_VALUE;
    const e = exp - 52;
    if (e >= -1022) {
      dv.setBigUint64(0, BigInt(e + 1023) << 52n);
      return dv.getFloat64(0);
    }
    dv.setBigUint64(0, 1n << BigInt(e + 1074));
    return dv.getFloat64(0);
  },

  // Java: Math#nextUp(double)
  nextUp(d) {
    if (d !== d || d === Infinity) return d + 0.0;
    d += 0.0;
    const bits = doubleToRawLongBits(d);
    dv.setBigInt64(0, bits + (d >= 0 ? 1n : -1n));
    return dv.getFloat64(0);
  },

  // Java: Math#IEEEremainder(double,double)
  IEEEremainder(f1, f2) {
    if (f1 !== f1 || f2 !== f2 || f1 === Infinity || f1 === -Infinity || f2 === 0) return (f1 * f2) / (f1 * f2);
    if (f2 === Infinity || f2 === -Infinity) return f1;
    if (f1 === 0) return f1;
    const [mx, ex] = decompose(f1);
    const [my, ey] = decompose(f2);
    const e = Math.min(ex, ey);
    const X = mx << BigInt(ex - e);
    const Y = my << BigInt(ey - e);
    let n = X / Y;
    const rem = X - n * Y;
    const twice = rem * 2n;
    if (twice > Y || (twice === Y && (n & 1n) === 1n)) n += 1n;
    let R = X - n * Y;
    const negX = f1 < 0 || Object.is(f1, -0);
    R = negX ? -R : R;
    if (R === 0n) return negX ? -0 : 0;
    return roundToDouble(R < 0n, R < 0n ? -R : R, e);
  },

  // Java: Math#fma(double,double,double)
  fma(a, b, c) {
    if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c) || a === 0 || b === 0) return a * b + c;
    const [ma, ea] = decompose(a);
    const [mb, eb] = decompose(b);
    let P = ma * mb;
    let eP = ea + eb;
    if (a < 0 !== b < 0) P = -P;
    if (c === 0) return roundToDouble(P < 0n, P < 0n ? -P : P, eP);
    let [mc, ec] = decompose(c);
    if (c < 0) mc = -mc;
    const e = Math.min(eP, ec);
    const S = (P << BigInt(eP - e)) + (mc << BigInt(ec - e));
    eP = e;
    if (S === 0n) return 0;
    return roundToDouble(S < 0n, S < 0n ? -S : S, eP);
  },

  // Java: Math#sqrt(double)
  sqrt(a) {
    return Math.sqrt(a);
  },

  // Java: Math#cbrt(double) (delegates to StrictMath)
  cbrt(a) {
    return StrictMath.cbrt(a);
  },

  // Java: Math#atan(double) (delegates to StrictMath)
  atan(a) {
    return StrictMath.atan(a);
  },

  // Java: Math#atan2(double,double) (delegates to StrictMath)
  atan2(y, x) {
    return StrictMath.atan2(y, x);
  },

  // Java: Math#hypot(double,double) (delegates to StrictMath)
  hypot(x, y) {
    return StrictMath.hypot(x, y);
  },

  // Java: Math#sinh(double) (StrictMath.sinh is fdlibm; V8's Math.sinh is the same algorithm)
  sinh(x) {
    return Math.sinh(x);
  },

  // Java: Math#exp(double) (HotSpot intrinsic, modelled as correctly rounded)
  exp(x) {
    return libm.exp(x);
  },

  // Java: Math#log(double) (HotSpot intrinsic, modelled as correctly rounded)
  log(x) {
    return libm.log(x);
  },

  // Java: Math#log10(double) (HotSpot intrinsic, modelled as correctly rounded)
  log10(x) {
    return libm.log10(x);
  },

  // Java: Math#sin(double) (HotSpot intrinsic, modelled as correctly rounded)
  sin(x) {
    return libm.sin(x);
  },

  // Java: Math#cos(double) (HotSpot intrinsic, modelled as correctly rounded)
  cos(x) {
    return libm.cos(x);
  },

  // Java: Math#tan(double) (HotSpot intrinsic, modelled as correctly rounded)
  tan(x) {
    return libm.tan(x);
  },

  // Java: Math#pow(double,double) (HotSpot intrinsic, modelled as correctly rounded)
  pow(x, y) {
    return libm.pow(x, y);
  },
};
