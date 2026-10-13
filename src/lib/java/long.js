// Java long arithmetic and java.lang.Long / long overloads of java.lang.Math (long = BigInt wrapped to 64 bits).
import { ArithmeticException, NumberFormatException, NullPointerException, IndexOutOfBoundsException } from './errors.js';
import { digit } from './charDigit.js';
import { forInputString } from './int.js';

const MIN = -(1n << 63n);
const MAX = (1n << 63n) - 1n;

// Java: wrap to long (two's complement 64 bit)
export const wrap = (v) => BigInt.asIntN(64, v);
// Java: long + long
export const ladd = (a, b) => BigInt.asIntN(64, a + b);
// Java: long - long
export const lsub = (a, b) => BigInt.asIntN(64, a - b);
// Java: long * long
export const lmul = (a, b) => BigInt.asIntN(64, a * b);

// Java: long / long
export function ldiv(a, b) {
  if (b === 0n) throw new ArithmeticException('/ by zero');
  return BigInt.asIntN(64, a / b);
}

// Java: long % long
export function lrem(a, b) {
  if (b === 0n) throw new ArithmeticException('/ by zero');
  return a % b;
}

// Java: -long
export const lneg = (a) => BigInt.asIntN(64, -a);
// Java: long << long (count masked to 6 bits)
export const lshl = (a, n) => BigInt.asIntN(64, a << (BigInt(n) & 63n));
// Java: long >> long
export const lshr = (a, n) => a >> (BigInt(n) & 63n);
// Java: long >>> long
export const lushr = (a, n) => BigInt.asIntN(64, BigInt.asUintN(64, a) >> (BigInt(n) & 63n));

// Java: NumberFormatException#forCharSequence(CharSequence,int,int,int)
function forCharSequence(s, beginIndex, endIndex, errorIndex) {
  return new NumberFormatException(`Error at index ${errorIndex - beginIndex} in: "${s.substring(beginIndex, endIndex)}"`);
}

// Java: Long#parseLong(String,int)
function parseLongImpl(s, radix) {
  if (s === null || s === undefined) throw new NumberFormatException('Cannot parse null string');
  if (radix < 2) throw new NumberFormatException(`radix ${radix} less than Character.MIN_RADIX`);
  if (radix > 36) throw new NumberFormatException(`radix ${radix} greater than Character.MAX_RADIX`);
  let negative = false;
  let i = 0;
  const len = s.length;
  let limit = MAX;
  const R = BigInt(radix);
  if (len > 0) {
    const firstChar = s.charCodeAt(0);
    if (firstChar < 0x30) {
      if (firstChar === 0x2d) {
        negative = true;
        limit = -MIN;
      } else if (firstChar !== 0x2b) throw forInputString(s, radix);
      if (len === 1) throw forInputString(s, radix);
      i++;
    }
    let result = 0n;
    while (i < len) {
      const d = digit(s.charCodeAt(i++), radix);
      if (d < 0) throw forInputString(s, radix);
      result = result * R + BigInt(d);
      if (result > limit) throw forInputString(s, radix);
    }
    return negative ? -result : result;
  }
  throw forInputString(s, radix);
}

// Java: Long#parseLong(CharSequence,int,int,int)
function parseLongRange(s, beginIndex, endIndex, radix) {
  if (s === null || s === undefined) throw new NullPointerException();
  if (beginIndex < 0 || beginIndex > endIndex || endIndex > s.length) throw new IndexOutOfBoundsException();
  if (radix < 2) throw new NumberFormatException(`radix ${radix} less than Character.MIN_RADIX`);
  if (radix > 36) throw new NumberFormatException(`radix ${radix} greater than Character.MAX_RADIX`);
  let negative = false;
  let i = beginIndex;
  let limit = MAX;
  const R = BigInt(radix);
  if (i < endIndex) {
    const firstChar = s.charCodeAt(i);
    if (firstChar < 0x30) {
      if (firstChar === 0x2d) {
        negative = true;
        limit = -MIN;
      } else if (firstChar !== 0x2b) throw forCharSequence(s, beginIndex, endIndex, i);
      i++;
      if (i === endIndex) throw forCharSequence(s, beginIndex, endIndex, i);
    }
    let result = 0n;
    while (i < endIndex) {
      const d = digit(s.charCodeAt(i), radix);
      if (d < 0) throw forCharSequence(s, beginIndex, endIndex, i);
      result = result * R + BigInt(d);
      if (result > limit) throw forCharSequence(s, beginIndex, endIndex, i);
      i++;
    }
    return negative ? -result : result;
  }
  throw forInputString('', radix);
}

// Java: java.lang.Long (static methods; boxed Long is a BigInt)
export const Long = {
  MIN_VALUE: MIN,
  MAX_VALUE: MAX,

  // Java: Long#parseLong(String) / parseLong(String,int)
  parseLong(s, radix = 10) {
    return parseLongImpl(s, radix);
  },

  // Java: Long#valueOf(String) / valueOf(String,int)
  valueOf(s, radix = 10) {
    return parseLongImpl(s, radix);
  },

  // Java: Long#decode(String)
  decode(nm) {
    if (nm === null || nm === undefined) throw new NullPointerException('Cannot invoke "String.isEmpty()" because "nm" is null');
    let radix = 10;
    let index = 0;
    let negative = false;
    if (nm.length === 0) throw new NumberFormatException('Zero length string');
    const firstChar = nm[0];
    if (firstChar === '-') {
      negative = true;
      index++;
    } else if (firstChar === '+') index++;
    if (nm.startsWith('0x', index) || nm.startsWith('0X', index)) {
      index += 2;
      radix = 16;
    } else if (nm.startsWith('#', index)) {
      index++;
      radix = 16;
    } else if (nm.startsWith('0', index) && nm.length > 1 + index) {
      index++;
      radix = 8;
    }
    if (nm.startsWith('-', index) || nm.startsWith('+', index)) throw new NumberFormatException('Sign character in wrong position');
    const constant = negative ? `-${nm.substring(index)}` : nm.substring(index);
    return parseLongImpl(constant, radix);
  },

  // Java: Long#parseUnsignedLong(String) / (String,int)
  parseUnsignedLong(s, radix = 10) {
    if (s === null || s === undefined) throw new NumberFormatException('Cannot parse null string');
    const len = s.length;
    if (len > 0) {
      if (s[0] === '-') throw new NumberFormatException(`Illegal leading minus sign on unsigned string ${s}.`);
      if (len <= 12 || (radix === 10 && len <= 18)) return parseLongImpl(s, radix);
      const first = parseLongRange(s, 0, len - 1, radix);
      const second = digit(s.charCodeAt(len - 1), radix);
      if (second < 0) throw new NumberFormatException(`Bad digit at end of ${s}`);
      const result = BigInt.asIntN(64, first * BigInt(radix) + BigInt(second));
      const guard = radix * Number(BigInt.asUintN(64, first) >> 57n);
      if (guard >= 128 || (result >= 0n && guard >= 128 - 36)) throw new NumberFormatException(`String value ${s} exceeds range of unsigned long.`);
      return result;
    }
    throw forInputString(s, radix);
  },

  // Java: Long#toString(long) / toString(long,int)
  toString(i, radix = 10) {
    if (radix < 2 || radix > 36) radix = 10;
    return i.toString(radix);
  },

  // Java: Long#toHexString(long)
  toHexString(i) {
    return BigInt.asUintN(64, i).toString(16);
  },

  // Java: Long#toOctalString(long)
  toOctalString(i) {
    return BigInt.asUintN(64, i).toString(8);
  },

  // Java: Long#toBinaryString(long)
  toBinaryString(i) {
    return BigInt.asUintN(64, i).toString(2);
  },

  // Java: Long#toUnsignedString(long) / (long,int)
  toUnsignedString(i, radix = 10) {
    if (radix < 2 || radix > 36) radix = 10;
    return BigInt.asUintN(64, i).toString(radix);
  },

  // Java: Long#compare(long,long)
  compare(x, y) {
    return x < y ? -1 : x === y ? 0 : 1;
  },

  // Java: Long#compareUnsigned(long,long)
  compareUnsigned(x, y) {
    return Long.compare(BigInt.asUintN(64, x), BigInt.asUintN(64, y));
  },

  // Java: Long#divideUnsigned(long,long)
  divideUnsigned(dividend, divisor) {
    if (divisor === 0n) throw new ArithmeticException('/ by zero');
    return BigInt.asIntN(64, BigInt.asUintN(64, dividend) / BigInt.asUintN(64, divisor));
  },

  // Java: Long#remainderUnsigned(long,long)
  remainderUnsigned(dividend, divisor) {
    if (divisor === 0n) throw new ArithmeticException('/ by zero');
    return BigInt.asIntN(64, BigInt.asUintN(64, dividend) % BigInt.asUintN(64, divisor));
  },

  // Java: Long#signum(long)
  signum(i) {
    return i > 0n ? 1 : i < 0n ? -1 : 0;
  },

  // Java: Long#bitCount(long)
  bitCount(i) {
    let u = BigInt.asUintN(64, i);
    let n = 0;
    while (u !== 0n) {
      n += Number(u & 1n);
      u >>= 1n;
    }
    return n;
  },

  // Java: Long#numberOfLeadingZeros(long)
  numberOfLeadingZeros(i) {
    const u = BigInt.asUintN(64, i);
    return u === 0n ? 64 : 64 - u.toString(2).length;
  },

  // Java: Long#numberOfTrailingZeros(long)
  numberOfTrailingZeros(i) {
    const u = BigInt.asUintN(64, i);
    if (u === 0n) return 64;
    let n = 0;
    let v = u;
    while ((v & 1n) === 0n) {
      v >>= 1n;
      n++;
    }
    return n;
  },

  // Java: Long#rotateLeft(long,int)
  rotateLeft(i, distance) {
    const d = BigInt(distance & 63);
    const u = BigInt.asUintN(64, i);
    return BigInt.asIntN(64, (u << d) | (u >> (64n - d)));
  },

  // Java: Long#rotateRight(long,int)
  rotateRight(i, distance) {
    return Long.rotateLeft(i, -distance);
  },

  // Java: Long#sum(long,long)
  sum(a, b) {
    return BigInt.asIntN(64, a + b);
  },

  // Java: Long#max(long,long)
  max(a, b) {
    return a >= b ? a : b;
  },

  // Java: Long#min(long,long)
  min(a, b) {
    return a <= b ? a : b;
  },

  // Java: Long#hashCode(long)
  hashCode(value) {
    return Number(BigInt.asIntN(32, value ^ (BigInt.asUintN(64, value) >> 32n)));
  },
};

// Java: java.lang.Math long overloads (abs, min, max, floorDiv, floorMod, *Exact, multiplyHigh)
export const LongMath = {
  // Java: Math#abs(long)
  abs(a) {
    return a < 0n ? BigInt.asIntN(64, -a) : a;
  },

  // Java: Math#min(long,long)
  min(a, b) {
    return a <= b ? a : b;
  },

  // Java: Math#max(long,long)
  max(a, b) {
    return a >= b ? a : b;
  },

  // Java: Math#floorDiv(long,long)
  floorDiv(x, y) {
    const q = ldiv(x, y);
    if ((x ^ y) < 0n && lmul(q, y) !== x) return q - 1n;
    return q;
  },

  // Java: Math#floorMod(long,long)
  floorMod(x, y) {
    const mod = lrem(x, y);
    if ((mod ^ y) < 0n && mod !== 0n) return BigInt.asIntN(64, mod + y);
    return mod;
  },

  // Java: Math#addExact(long,long)
  addExact(x, y) {
    const r = x + y;
    if (r > MAX || r < MIN) throw new ArithmeticException('long overflow');
    return r;
  },

  // Java: Math#subtractExact(long,long)
  subtractExact(x, y) {
    const r = x - y;
    if (r > MAX || r < MIN) throw new ArithmeticException('long overflow');
    return r;
  },

  // Java: Math#multiplyExact(long,long)
  multiplyExact(x, y) {
    const r = x * y;
    if (r > MAX || r < MIN) throw new ArithmeticException('long overflow');
    return r;
  },

  // Java: Math#negateExact(long)
  negateExact(a) {
    if (a === MIN) throw new ArithmeticException('long overflow');
    return -a;
  },

  // Java: Math#absExact(long)
  absExact(a) {
    if (a === MIN) throw new ArithmeticException('Overflow to represent absolute value of Long.MIN_VALUE');
    return a < 0n ? -a : a;
  },

  // Java: Math#toIntExact(long)
  toIntExact(value) {
    if (value > 2147483647n || value < -2147483648n) throw new ArithmeticException('integer overflow');
    return Number(value);
  },

  // Java: Math#multiplyHigh(long,long)
  multiplyHigh(x, y) {
    return BigInt.asIntN(64, (x * y) >> 64n);
  },
};
