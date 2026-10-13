// Java int arithmetic and java.lang.Integer / int overloads of java.lang.Math (int = JS number wrapped to 32 bits).
import { ArithmeticException, NumberFormatException, NullPointerException } from './errors.js';
import { digit } from './charDigit.js';

// Java: int + int
export const iadd = (a, b) => (a + b) | 0;
// Java: int - int
export const isub = (a, b) => (a - b) | 0;
// Java: int * int
export const imul = (a, b) => Math.imul(a, b);

// Java: int / int
export function idiv(a, b) {
  if (b === 0) throw new ArithmeticException('/ by zero');
  return (a / b) | 0;
}

// Java: int % int
export function irem(a, b) {
  if (b === 0) throw new ArithmeticException('/ by zero');
  return (a % b) | 0;
}

// Java: -int
export const ineg = (a) => -a | 0;
// Java: int << int
export const ishl = (a, n) => a << n;
// Java: int >> int
export const ishr = (a, n) => a >> n;
// Java: int >>> int
export const iushr = (a, n) => (a >>> n) | 0;

// Java: NumberFormatException#forInputString(String,int)
export function forInputString(s, radix) {
  return new NumberFormatException(`For input string: "${s}"${radix === 10 ? '' : ` under radix ${radix}`}`);
}

// Java: Integer#parseInt(String,int)
function parseIntImpl(s, radix) {
  if (s === null || s === undefined) throw new NumberFormatException('Cannot parse null string');
  if (radix < 2) throw new NumberFormatException(`radix ${radix} less than Character.MIN_RADIX`);
  if (radix > 36) throw new NumberFormatException(`radix ${radix} greater than Character.MAX_RADIX`);
  let negative = false;
  let i = 0;
  const len = s.length;
  let limit = 2147483647;
  if (len > 0) {
    const firstChar = s.charCodeAt(0);
    if (firstChar < 0x30) {
      if (firstChar === 0x2d) {
        negative = true;
        limit = 2147483648;
      } else if (firstChar !== 0x2b) throw forInputString(s, radix);
      if (len === 1) throw forInputString(s, radix);
      i++;
    }
    let result = 0;
    while (i < len) {
      const d = digit(s.charCodeAt(i++), radix);
      if (d < 0) throw forInputString(s, radix);
      result = result * radix + d;
      if (result > limit) throw forInputString(s, radix);
    }
    return negative ? -result | 0 : result;
  }
  throw forInputString(s, radix);
}

// Java: java.lang.Integer (static methods; boxed Integer is a JS number)
export const Integer = {
  MIN_VALUE: -2147483648,
  MAX_VALUE: 2147483647,

  // Java: Integer#parseInt(String) / parseInt(String,int)
  parseInt(s, radix = 10) {
    return parseIntImpl(s, radix);
  },

  // Java: Integer#valueOf(String) / valueOf(String,int)
  valueOf(s, radix = 10) {
    return parseIntImpl(s, radix);
  },

  // Java: Integer#decode(String)
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
    // the range parse and the "constant" retry of the JDK accept the same strings; the retry's message is the visible one
    const constant = negative ? `-${nm.substring(index)}` : nm.substring(index);
    return parseIntImpl(constant, radix);
  },

  // Java: Integer#parseUnsignedInt(String) / (String,int)
  parseUnsignedInt(s, radix = 10) {
    if (s === null || s === undefined) throw new NumberFormatException('Cannot parse null string');
    const len = s.length;
    if (len > 0) {
      if (s[0] === '-') throw new NumberFormatException(`Illegal leading minus sign on unsigned string ${s}.`);
      if (len <= 5 || (radix === 10 && len <= 9)) return parseIntImpl(s, radix);
      const ell = parseLongForUnsigned(s, radix);
      if ((ell & 0xffffffff00000000n) === 0n) return Number(BigInt.asIntN(32, ell));
      throw new NumberFormatException(`String value ${s} exceeds range of unsigned int.`);
    }
    throw forInputString(s, radix);
  },

  // Java: Integer#toString(int) / toString(int,int)
  toString(i, radix = 10) {
    if (radix < 2 || radix > 36) radix = 10;
    return i.toString(radix);
  },

  // Java: Integer#toHexString(int)
  toHexString(i) {
    return (i >>> 0).toString(16);
  },

  // Java: Integer#toOctalString(int)
  toOctalString(i) {
    return (i >>> 0).toString(8);
  },

  // Java: Integer#toBinaryString(int)
  toBinaryString(i) {
    return (i >>> 0).toString(2);
  },

  // Java: Integer#toUnsignedString(int) / (int,int)
  toUnsignedString(i, radix = 10) {
    if (radix < 2 || radix > 36) radix = 10;
    return (i >>> 0).toString(radix);
  },

  // Java: Integer#toUnsignedLong(int)
  toUnsignedLong(x) {
    return BigInt(x >>> 0);
  },

  // Java: Integer#compare(int,int)
  compare(x, y) {
    return x < y ? -1 : x === y ? 0 : 1;
  },

  // Java: Integer#compareUnsigned(int,int)
  compareUnsigned(x, y) {
    return Integer.compare((x + -2147483648) | 0, (y + -2147483648) | 0);
  },

  // Java: Integer#divideUnsigned(int,int)
  divideUnsigned(dividend, divisor) {
    if (divisor === 0) throw new ArithmeticException('/ by zero');
    return Math.floor((dividend >>> 0) / (divisor >>> 0)) | 0;
  },

  // Java: Integer#remainderUnsigned(int,int)
  remainderUnsigned(dividend, divisor) {
    if (divisor === 0) throw new ArithmeticException('/ by zero');
    return ((dividend >>> 0) % (divisor >>> 0)) | 0;
  },

  // Java: Integer#signum(int)
  signum(i) {
    return (i >> 31) | (-i >>> 31);
  },

  // Java: Integer#bitCount(int)
  bitCount(i) {
    i = i - ((i >>> 1) & 0x55555555);
    i = (i & 0x33333333) + ((i >>> 2) & 0x33333333);
    i = (i + (i >>> 4)) & 0x0f0f0f0f;
    i = i + (i >>> 8);
    i = i + (i >>> 16);
    return i & 0x3f;
  },

  // Java: Integer#reverse(int)
  reverse(i) {
    i = ((i & 0x55555555) << 1) | ((i >>> 1) & 0x55555555);
    i = ((i & 0x33333333) << 2) | ((i >>> 2) & 0x33333333);
    i = ((i & 0x0f0f0f0f) << 4) | ((i >>> 4) & 0x0f0f0f0f);
    return Integer.reverseBytes(i);
  },

  // Java: Integer#reverseBytes(int)
  reverseBytes(i) {
    return (i << 24) | ((i & 0xff00) << 8) | ((i >>> 8) & 0xff00) | (i >>> 24);
  },

  // Java: Integer#highestOneBit(int)
  highestOneBit(i) {
    return i === 0 ? 0 : (1 << (31 - Math.clz32(i))) | 0;
  },

  // Java: Integer#lowestOneBit(int)
  lowestOneBit(i) {
    return i & -i;
  },

  // Java: Integer#numberOfLeadingZeros(int)
  numberOfLeadingZeros(i) {
    return Math.clz32(i);
  },

  // Java: Integer#numberOfTrailingZeros(int)
  numberOfTrailingZeros(i) {
    return i === 0 ? 32 : 31 - Math.clz32(i & -i);
  },

  // Java: Integer#rotateLeft(int,int)
  rotateLeft(i, distance) {
    return (i << distance) | (i >>> -distance);
  },

  // Java: Integer#rotateRight(int,int)
  rotateRight(i, distance) {
    return (i >>> distance) | (i << -distance);
  },

  // Java: Integer#sum(int,int)
  sum(a, b) {
    return (a + b) | 0;
  },

  // Java: Integer#max(int,int)
  max(a, b) {
    return Math.max(a, b);
  },

  // Java: Integer#min(int,int)
  min(a, b) {
    return Math.min(a, b);
  },

  // Java: Integer#hashCode(int)
  hashCode(value) {
    return value;
  },
};

// Java: Long#parseLong(String,int) as used by Integer#parseUnsignedInt (BigInt result)
function parseLongForUnsigned(s, radix) {
  if (radix < 2) throw new NumberFormatException(`radix ${radix} less than Character.MIN_RADIX`);
  if (radix > 36) throw new NumberFormatException(`radix ${radix} greater than Character.MAX_RADIX`);
  let negative = false;
  let i = 0;
  const len = s.length;
  const R = BigInt(radix);
  let limit = (1n << 63n) - 1n;
  if (len > 0) {
    const firstChar = s.charCodeAt(0);
    if (firstChar < 0x30) {
      if (firstChar === 0x2d) {
        negative = true;
        limit = 1n << 63n;
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

// Java: java.lang.Math int overloads (abs, min, max, floorDiv, floorMod, *Exact)
export const IntMath = {
  // Java: Math#abs(int)
  abs(a) {
    return a < 0 ? -a | 0 : a;
  },

  // Java: Math#min(int,int)
  min(a, b) {
    return a <= b ? a : b;
  },

  // Java: Math#max(int,int)
  max(a, b) {
    return a >= b ? a : b;
  },

  // Java: Math#floorDiv(int,int)
  floorDiv(x, y) {
    const q = idiv(x, y);
    if ((x ^ y) < 0 && Math.imul(q, y) !== x) return q - 1;
    return q;
  },

  // Java: Math#floorMod(int,int)
  floorMod(x, y) {
    const mod = irem(x, y);
    if ((mod ^ y) < 0 && mod !== 0) return (mod + y) | 0;
    return mod;
  },

  // Java: Math#addExact(int,int)
  addExact(x, y) {
    const r = (x + y) | 0;
    if (((x ^ r) & (y ^ r)) < 0) throw new ArithmeticException('integer overflow');
    return r;
  },

  // Java: Math#subtractExact(int,int)
  subtractExact(x, y) {
    const r = (x - y) | 0;
    if (((x ^ y) & (x ^ r)) < 0) throw new ArithmeticException('integer overflow');
    return r;
  },

  // Java: Math#multiplyExact(int,int)
  multiplyExact(x, y) {
    const r = x * y; // |x*y| < 2^62: inexact above 2^53 but the range test below is still exact
    if (r > 2147483647 || r < -2147483648) throw new ArithmeticException('integer overflow');
    return r | 0;
  },

  // Java: Math#incrementExact(int)
  incrementExact(a) {
    if (a === 2147483647) throw new ArithmeticException('integer overflow');
    return a + 1;
  },

  // Java: Math#decrementExact(int)
  decrementExact(a) {
    if (a === -2147483648) throw new ArithmeticException('integer overflow');
    return a - 1;
  },

  // Java: Math#negateExact(int)
  negateExact(a) {
    if (a === -2147483648) throw new ArithmeticException('integer overflow');
    return -a | 0;
  },

  // Java: Math#absExact(int)
  absExact(a) {
    if (a === -2147483648) throw new ArithmeticException('Overflow to represent absolute value of Integer.MIN_VALUE');
    return a < 0 ? -a | 0 : a;
  },
};
