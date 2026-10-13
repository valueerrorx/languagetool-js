// Double/Float.toString (JDK 17 FloatingDecimal, BigInt for FDBigInteger) and AbstractCollection/AbstractMap toString.
import { valueOf } from './Objects.js';

const EXP_SHIFT = 52;
const FRACT_HOB = 1n << 52n;
const SIGNIF_BIT_MASK = 0x000fffffffffffffn;
const SINGLE_EXP_SHIFT = 23;
const SINGLE_FRACT_HOB = 0x00800000;
const SINGLE_SIGNIF_BIT_MASK = 0x007fffff;
const EXP_BIAS = 1023;
const FLOAT_EXP_BIAS = 127;
const MAX_SMALL_BIN_EXP = 62;
const MIN_SMALL_BIN_EXP = -(63 / 3);
const EXP_ONE = 0x3ff0000000000000n;

// Java: FloatingDecimal#N_5_BITS (bits needed for 5^i, i = 0..26)
const N_5_BITS = Array.from({ length: 27 }, (_, i) => (i === 0 ? 0 : (5n ** BigInt(i)).toString(2).length));

// Java: FloatingDecimal#insignificantDigitsNumber
const INSIGNIFICANT_DIGITS_NUMBER = [0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 6, 7, 7, 7, 8, 8, 8, 9, 9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12, 12, 12, 13, 13, 13, 14, 14, 14, 15, 15, 15, 15, 16, 16, 16, 17, 17, 17, 18, 18, 18, 19];

const dv = new DataView(new ArrayBuffer(8));

// Java: Double.doubleToRawLongBits(double)
function doubleToRawLongBits(d) {
  dv.setFloat64(0, d);
  return dv.getBigUint64(0);
}

// Java: Double.longBitsToDouble(long)
function longBitsToDouble(bits) {
  dv.setBigUint64(0, bits);
  return dv.getFloat64(0);
}

// Java: FloatingDecimal.BinaryToASCIIBuffer#insignificantDigitsForPow2(int)
function insignificantDigitsForPow2(p2) {
  if (p2 > 1 && p2 < INSIGNIFICANT_DIGITS_NUMBER.length) return INSIGNIFICANT_DIGITS_NUMBER[p2];
  return 0;
}

// Java: FloatingDecimal.BinaryToASCIIBuffer#estimateDecExp(long,int)
function estimateDecExp(fractBits, binExp) {
  const d2 = longBitsToDouble(EXP_ONE | (fractBits & SIGNIF_BIT_MASK));
  const d = (d2 - 1.5) * 0.289529654 + 0.176091259 + binExp * 0.301029995663981;
  // the JDK's bit manipulation computes floor(d) (truncating (int)d for exponent >= 52)
  return Math.floor(d);
}

// Java: FloatingDecimal.BinaryToASCIIBuffer (state of one conversion)
class BinaryToASCIIBuffer {
  constructor(isNegative) {
    this.isNegative = isNegative;
    this.digits = []; // decimal digit characters
    this.decExponent = 0;
    this.nDigits = 0;
    this.kind = 'normal'; // normal | zero | inf | nan
  }

  // Java: FloatingDecimal.BinaryToASCIIBuffer#roundup()
  roundup() {
    const digits = this.digits;
    let i = this.nDigits - 1;
    let q = digits[i];
    if (q === '9') {
      while (q === '9' && i > 0) {
        digits[i] = '0';
        q = digits[--i];
      }
      if (q === '9') {
        // carryout! High-order 1, rest 0s, larger exp.
        this.decExponent += 1;
        digits[0] = '1';
        return;
      }
    }
    digits[i] = String.fromCharCode(q.charCodeAt(0) + 1);
  }

  // Java: FloatingDecimal.BinaryToASCIIBuffer#developLongDigits(int,long,int)
  developLongDigits(decExponent, lvalue, insignificantDigits) {
    if (insignificantDigits !== 0) {
      const pow10 = (5n ** BigInt(insignificantDigits)) << BigInt(insignificantDigits);
      const residue = lvalue % pow10;
      lvalue /= pow10;
      decExponent += insignificantDigits;
      if (residue >= pow10 >> 1n) lvalue++;
    }
    let s = lvalue.toString();
    let len = s.length;
    while (s.charCodeAt(len - 1) === 48) len--; // trailing zeros only raise the exponent
    decExponent += s.length - len;
    s = s.slice(0, len);
    // digits after stripping: each stripped position and each digit counted, then +1
    this.digits = s.split('');
    this.decExponent = decExponent + s.length;
    this.nDigits = s.length;
  }

  // Java: FloatingDecimal.BinaryToASCIIBuffer#dtoa(int,long,int,boolean)
  dtoa(binExp, fractBits, nSignificantBits, isCompatibleFormat) {
    const tailZeros = ctz64(fractBits);
    const nFractBits = EXP_SHIFT + 1 - tailZeros;
    const nTinyBits = Math.max(0, nFractBits - binExp - 1);
    if (binExp <= MAX_SMALL_BIN_EXP && binExp >= MIN_SMALL_BIN_EXP) {
      if (nTinyBits < 27 && nFractBits + N_5_BITS[nTinyBits] < 64) {
        if (nTinyBits === 0) {
          let insignificant;
          if (binExp > nSignificantBits) insignificant = insignificantDigitsForPow2(binExp - nSignificantBits - 1);
          else insignificant = 0;
          if (binExp >= EXP_SHIFT) fractBits <<= BigInt(binExp - EXP_SHIFT);
          else fractBits >>= BigInt(EXP_SHIFT - binExp);
          this.developLongDigits(0, fractBits, insignificant);
          return;
        }
      }
    }
    let decExp = estimateDecExp(fractBits, binExp);
    const B5 = Math.max(0, -decExp);
    let B2 = B5 + nTinyBits + binExp;
    const S5 = Math.max(0, decExp);
    let S2 = S5 + nTinyBits;
    const M5 = B5;
    let M2 = B2 - nSignificantBits;
    fractBits >>= BigInt(tailZeros);
    B2 -= nFractBits - 1;
    const common2factor = Math.min(B2, S2);
    B2 -= common2factor;
    S2 -= common2factor;
    M2 -= common2factor;
    if (nFractBits === 1) M2 -= 1;
    if (M2 < 0) {
      B2 -= M2;
      S2 -= M2;
      M2 = 0;
    }
    const digits = [];
    let low;
    let high;
    let lowDigitDifference;
    let q;
    const Bbits = nFractBits + B2 + (B5 < N_5_BITS.length ? N_5_BITS[B5] : B5 * 3);
    const tenSbits = S2 + 1 + (S5 + 1 < N_5_BITS.length ? N_5_BITS[S5 + 1] : (S5 + 1) * 3);
    const big5 = (n) => 5n ** BigInt(n);
    if (Bbits < 64 && tenSbits < 64) {
      // int (32 bit) or long (64 bit) arithmetic with the JVM's wrap-around
      const bits = Bbits < 32 && tenSbits < 32 ? 32 : 64;
      const w = (x) => BigInt.asIntN(bits, x);
      let b = w(w((bits === 32 ? BigInt.asIntN(32, fractBits) : fractBits) * big5(B5)) << BigInt(B2));
      const s = w(big5(S5) << BigInt(S2));
      let m = w(big5(M5) << BigInt(M2));
      const tens = w(s * 10n);
      q = b / s;
      b = w(10n * (b % s));
      m = w(m * 10n);
      low = b < m;
      high = w(b + m) > tens;
      if (q === 0n && !high) {
        decExp--;
      } else {
        digits.push(String(q));
      }
      if (!isCompatibleFormat || decExp < -3 || decExp >= 8) high = low = false;
      while (!low && !high) {
        q = b / s;
        b = w(10n * (b % s));
        m = w(m * 10n);
        if (m > 0n) {
          low = b < m;
          high = w(b + m) > tens;
        } else {
          low = true;
          high = true;
        }
        digits.push(String(q));
      }
      lowDigitDifference = w(w(b << 1n) - tens);
    } else {
      let B = (fractBits * big5(B5)) << BigInt(B2);
      const S = big5(S5) << BigInt(S2);
      let M = big5(M5) << BigInt(M2);
      const tenS = S * 10n;
      q = B / S;
      B = 10n * (B % S);
      M *= 10n;
      low = B < M;
      high = tenS <= B + M;
      if (q === 0n && !high) {
        decExp--;
      } else {
        digits.push(String(q));
      }
      if (!isCompatibleFormat || decExp < -3 || decExp >= 8) high = low = false;
      while (!low && !high) {
        q = B / S;
        B = 10n * (B % S);
        M *= 10n;
        low = B < M;
        high = tenS <= B + M;
        digits.push(String(q));
      }
      lowDigitDifference = (B << 1n) - tenS;
    }
    this.digits = digits;
    this.decExponent = decExp + 1;
    this.nDigits = digits.length;
    if (high) {
      if (low) {
        if (lowDigitDifference === 0n) {
          if ((digits[this.nDigits - 1].charCodeAt(0) & 1) !== 0) this.roundup();
        } else if (lowDigitDifference > 0n) {
          this.roundup();
        }
      } else {
        this.roundup();
      }
    }
  }

  // Java: FloatingDecimal.BinaryToASCIIBuffer#getChars(char[]) / toJavaFormatString()
  toJavaFormatString() {
    if (this.kind === 'nan') return 'NaN';
    const sign = this.isNegative ? '-' : '';
    if (this.kind === 'inf') return `${sign}Infinity`;
    if (this.kind === 'zero') return `${sign}0.0`;
    const { digits, nDigits, decExponent } = this;
    let r = sign;
    if (decExponent > 0 && decExponent < 8) {
      let charLength = Math.min(nDigits, decExponent);
      r += digits.slice(0, charLength).join('');
      if (charLength < decExponent) {
        charLength = decExponent - charLength;
        r += '0'.repeat(charLength);
        r += '.0';
      } else {
        r += '.';
        if (charLength < nDigits) r += digits.slice(charLength, nDigits).join('');
        else r += '0';
      }
    } else if (decExponent <= 0 && decExponent > -3) {
      r += '0.';
      if (decExponent !== 0) r += '0'.repeat(-decExponent);
      r += digits.slice(0, nDigits).join('');
    } else {
      r += `${digits[0]}.`;
      if (nDigits > 1) r += digits.slice(1, nDigits).join('');
      else r += '0';
      r += 'E';
      let e;
      if (decExponent <= 0) {
        r += '-';
        e = -decExponent + 1;
      } else {
        e = decExponent - 1;
      }
      r += String(e);
    }
    return r;
  }
}

// Java: Long.numberOfTrailingZeros(long)
function ctz64(v) {
  let n = 0;
  while ((v & 1n) === 0n) {
    v >>= 1n;
    n++;
  }
  return n;
}

// Java: FloatingDecimal#getBinaryToASCIIConverter(double,boolean)
function getBinaryToASCIIConverterDouble(d, isCompatibleFormat) {
  const dBits = doubleToRawLongBits(d);
  const isNegative = (dBits & 0x8000000000000000n) !== 0n;
  let fractBits = dBits & SIGNIF_BIT_MASK;
  let binExp = Number((dBits & 0x7ff0000000000000n) >> 52n);
  const buf = new BinaryToASCIIBuffer(isNegative);
  if (binExp === 0x7ff) {
    buf.kind = fractBits === 0n ? 'inf' : 'nan';
    return buf;
  }
  let nSignificantBits;
  if (binExp === 0) {
    if (fractBits === 0n) {
      buf.kind = 'zero';
      return buf;
    }
    const leadingZeros = 64 - fractBits.toString(2).length;
    const shift = leadingZeros - (63 - EXP_SHIFT);
    fractBits <<= BigInt(shift);
    binExp = 1 - shift;
    nSignificantBits = 64 - leadingZeros;
  } else {
    fractBits |= FRACT_HOB;
    nSignificantBits = EXP_SHIFT + 1;
  }
  binExp -= EXP_BIAS;
  buf.dtoa(binExp, fractBits, nSignificantBits, isCompatibleFormat);
  return buf;
}

// Java: FloatingDecimal#getBinaryToASCIIConverter(float,boolean)
function getBinaryToASCIIConverterFloat(f, isCompatibleFormat) {
  dv.setFloat32(0, f);
  const fBits = dv.getUint32(0);
  const isNegative = (fBits & 0x80000000) !== 0;
  let fractBits = fBits & SINGLE_SIGNIF_BIT_MASK;
  let binExp = (fBits & 0x7f800000) >>> SINGLE_EXP_SHIFT;
  const buf = new BinaryToASCIIBuffer(isNegative);
  if (binExp === 0xff) {
    buf.kind = fractBits === 0 ? 'inf' : 'nan';
    return buf;
  }
  let nSignificantBits;
  if (binExp === 0) {
    if (fractBits === 0) {
      buf.kind = 'zero';
      return buf;
    }
    const leadingZeros = Math.clz32(fractBits);
    const shift = leadingZeros - (31 - SINGLE_EXP_SHIFT);
    fractBits <<= shift;
    binExp = 1 - shift;
    nSignificantBits = 32 - leadingZeros;
  } else {
    fractBits |= SINGLE_FRACT_HOB;
    nSignificantBits = SINGLE_EXP_SHIFT + 1;
  }
  binExp -= FLOAT_EXP_BIAS;
  buf.dtoa(binExp, BigInt(fractBits) << BigInt(EXP_SHIFT - SINGLE_EXP_SHIFT), nSignificantBits, isCompatibleFormat);
  return buf;
}

// Java: Double#toString(double)
export function doubleToString(d) {
  return getBinaryToASCIIConverterDouble(d, true).toJavaFormatString();
}

// Java: Float#toString(float) (argument is rounded to float32 like a Java float)
export function floatToString(f) {
  return getBinaryToASCIIConverterFloat(f, true).toJavaFormatString();
}

// Java: String#valueOf(Object) for collection elements (shared helper, SEMANTICS P14)
function elementToString(o) {
  return valueOf(o);
}

// Java: AbstractCollection#toString()
export function abstractCollectionToString(coll, elementString = elementToString) {
  const it = coll[Symbol.iterator]();
  let r = it.next();
  if (r.done) return '[]';
  let sb = '[';
  for (;;) {
    const e = r.value;
    sb += e === coll ? '(this Collection)' : elementString(e);
    r = it.next();
    if (r.done) return `${sb}]`;
    sb += ', ';
  }
}

// Java: AbstractMap#toString() (entries = iterable of [key, value])
export function abstractMapToString(map, elementString = elementToString) {
  const it = map.entries()[Symbol.iterator]();
  let r = it.next();
  if (r.done) return '{}';
  let sb = '{';
  for (;;) {
    const [key, value] = r.value;
    sb += key === map ? '(this Map)' : elementString(key);
    sb += '=';
    sb += value === map ? '(this Map)' : elementString(value);
    r = it.next();
    if (r.done) return `${sb}}`;
    sb += ', ';
  }
}
