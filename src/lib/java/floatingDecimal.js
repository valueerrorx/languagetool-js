// FloatingDecimal parsing (Double/Float.parseDouble/parseFloat) with exact BigInt rounding.
import { NumberFormatException, NullPointerException } from './errors.js';

const dv = new DataView(new ArrayBuffer(8));

// Java: Double.longBitsToDouble(long) for a non-negative BigInt below 2^64
function bitsToDouble(bits) {
  dv.setBigUint64(0, bits);
  return dv.getFloat64(0);
}

// helper (no Java counterpart): bit length of a positive BigInt
function bitLength(n) {
  return n.toString(2).length;
}

// helper (no Java counterpart): rounds neg * mant * 2^e (mant >= 0 BigInt) to nearest-even with p significand bits; minQ = exponent of the smallest subnormal, maxE = largest unbiased exponent
function roundBinary(neg, mant, e, p, minQ, maxE, build) {
  if (mant === 0n) return neg ? -0 : 0;
  const bl = bitLength(mant);
  const E = bl - 1 + e;
  if (E > maxE + 1) return neg ? -Infinity : Infinity;
  const q = Math.max(E - (p - 1), minQ);
  const shift = q - e;
  let r;
  if (shift <= 0) {
    r = mant << BigInt(-shift);
  } else if (shift > bl) {
    r = 0n;
  } else {
    const s = BigInt(shift);
    r = mant >> s;
    const rem = mant & ((1n << s) - 1n);
    const half = 1n << (s - 1n);
    if (rem > half || (rem === half && (r & 1n) === 1n)) r += 1n;
  }
  if (r === 0n) return neg ? -0 : 0;
  let q2 = q;
  if (r === 1n << BigInt(p)) {
    r >>= 1n;
    q2++;
  }
  if (bitLength(r) - 1 + q2 > maxE) return neg ? -Infinity : Infinity;
  return build(neg, r, q2);
}

// builds a double from r * 2^q (exactly representable)
function buildDouble(neg, r, q) {
  const sign = neg ? 1n << 63n : 0n;
  if (r < 1n << 52n) return bitsToDouble(sign | r); // subnormal: q == -1074
  return bitsToDouble(sign | (BigInt(q + 1075) << 52n) | (r - (1n << 52n)));
}

// builds a float (as JS number) from r * 2^q (exactly representable)
function buildFloat(neg, r, q) {
  const sign = neg ? 0x80000000 : 0;
  let bits;
  if (r < 1n << 23n) bits = sign | Number(r);
  else bits = sign | ((q + 150) << 23) | Number(r - (1n << 23n));
  dv.setUint32(0, bits >>> 0);
  return dv.getFloat32(0);
}

// exact value neg * mant * 2^e rounded to a double
export function roundToDouble(neg, mant, e) {
  return roundBinary(neg, mant, e, 53, -1074, 1023, buildDouble);
}

// exact value neg * mant * 2^e rounded to a float (returned as JS number)
export function roundToFloat(neg, mant, e) {
  return roundBinary(neg, mant, e, 24, -149, 127, buildFloat);
}

// decimal value neg * D * 10^e10 rounded with the given binary rounder
function decimalToBinary(neg, D, e10, round) {
  if (e10 >= 0) return round(neg, D * 10n ** BigInt(e10), 0);
  const k = 10n ** BigInt(-e10);
  const s = Math.max(0, 60 + bitLength(k) - bitLength(D));
  const num = D << BigInt(s);
  const q = num / k;
  const sticky = num % k !== 0n ? 1n : 0n;
  return round(neg, (q << 1n) | sticky, -s - 1);
}

const HEX_RE = /^([-+])?0[xX]((([0-9a-fA-F]+)\.?)|(([0-9a-fA-F]*)\.([0-9a-fA-F]+)))[pP]([-+])?([0-9]+)[fFdD]?$/;

// Java: String#trim()
function javaTrim(s) {
  let a = 0;
  let b = s.length;
  while (a < b && s.charCodeAt(a) <= 0x20) a++;
  while (b > a && s.charCodeAt(b - 1) <= 0x20) b--;
  return s.substring(a, b);
}

// Java: FloatingDecimal#parseHexString(String)
function parseHexString(s, round) {
  const m = HEX_RE.exec(s);
  if (m === null) throw new NumberFormatException(`For input string: "${s}"`);
  const neg = m[1] === '-';
  let intDigits;
  let fracDigits;
  if (m[3] !== undefined) {
    intDigits = m[4];
    fracDigits = '';
  } else {
    intDigits = m[6];
    fracDigits = m[7];
  }
  const mant = BigInt(`0x${intDigits}${fracDigits}0`) >> 4n;
  let expVal = BigInt(m[9]);
  if (expVal > 1000000000n) expVal = 1000000000n;
  if (m[8] === '-') expVal = -expVal;
  return round(neg, mant, Number(expVal) - 4 * fracDigits.length);
}

// Java: FloatingDecimal#readJavaFormatString(String) + ASCIIToBinaryConverter#doubleValue()/floatValue()
function parseJava(inp, isFloat) {
  if (inp === null || inp === undefined) throw new NullPointerException('Cannot invoke "String.trim()" because "in" is null');
  const round = isFloat ? roundToFloat : roundToDouble;
  const inS = javaTrim(inp);
  const len = inS.length;
  if (len === 0) throw new NumberFormatException('empty String');
  const bad = () => new NumberFormatException(`For input string: "${inS}"`);
  let isNegative = false;
  let signSeen = false;
  let i = 0;
  const at = (k) => {
    if (k >= len) throw bad();
    return inS[k];
  };
  let c = inS[i];
  if (c === '-' || c === '+') {
    isNegative = c === '-';
    i++;
    signSeen = true;
  }
  c = at(i);
  if (c === 'N') {
    if (len - i === 3 && inS.indexOf('NaN', i) === i) return NaN;
    throw bad();
  } else if (c === 'I') {
    if (len - i === 8 && inS.indexOf('Infinity', i) === i) return isNegative ? -Infinity : Infinity;
    throw bad();
  } else if (c === '0') {
    if (len > i + 1) {
      const ch = inS[i + 1];
      if (ch === 'x' || ch === 'X') return parseHexString(inS, round);
    }
  }
  const digits = [];
  let decSeen = false;
  let nDigits = 0;
  let decPt = 0;
  let nLeadZero = 0;
  let nTrailZero = 0;
  skipLeadingZerosLoop: while (i < len) {
    c = inS[i];
    if (c === '0') nLeadZero++;
    else if (c === '.') {
      if (decSeen) throw new NumberFormatException('multiple points');
      decPt = i;
      if (signSeen) decPt -= 1;
      decSeen = true;
    } else break skipLeadingZerosLoop;
    i++;
  }
  digitLoop: while (i < len) {
    c = inS[i];
    if (c >= '1' && c <= '9') {
      digits[nDigits++] = c;
      nTrailZero = 0;
    } else if (c === '0') {
      digits[nDigits++] = c;
      nTrailZero++;
    } else if (c === '.') {
      if (decSeen) throw new NumberFormatException('multiple points');
      decPt = i;
      if (signSeen) decPt -= 1;
      decSeen = true;
    } else break digitLoop;
    i++;
  }
  nDigits -= nTrailZero;
  const isZero = nDigits === 0;
  if (isZero && nLeadZero === 0) throw bad();
  let decExp;
  if (decSeen) decExp = decPt - nLeadZero;
  else decExp = nDigits + nTrailZero;
  if (i < len && (inS[i] === 'e' || inS[i] === 'E')) {
    let expSign = 1;
    let expVal = 0;
    const reallyBig = 214748364;
    let expOverflow = false;
    i++;
    c = at(i);
    if (c === '-') {
      expSign = -1;
      i++;
    } else if (c === '+') i++;
    const expAt = i;
    expLoop: while (i < len) {
      if (expVal >= reallyBig) expOverflow = true;
      c = inS[i++];
      if (c >= '0' && c <= '9') expVal = (expVal * 10 + (c.charCodeAt(0) - 48)) | 0;
      else {
        i--;
        break expLoop;
      }
    }
    const expLimit = 324 + nDigits + nTrailZero;
    if (expOverflow || expVal > expLimit) decExp = expSign * expLimit;
    else decExp += expSign * expVal;
    if (i === expAt) throw bad();
  }
  if (i < len && (i !== len - 1 || (inS[i] !== 'f' && inS[i] !== 'F' && inS[i] !== 'd' && inS[i] !== 'D'))) throw bad();
  if (isZero) return isNegative ? -0 : 0;
  // value = 0.DIGITS * 10^decExp
  const hi = isFloat ? 40 : 310;
  const lo = isFloat ? -50 : -330;
  if (decExp > hi) return isNegative ? -Infinity : Infinity;
  if (decExp < lo) return isNegative ? -0 : 0;
  const D = BigInt(digits.slice(0, nDigits).join(''));
  const e10 = decExp - nDigits;
  if (!isFloat && nDigits <= 15 && e10 >= -22 && e10 <= 22) {
    const d = Number(D);
    const v = e10 < 0 ? d / 10 ** -e10 : d * 10 ** e10;
    return isNegative ? -v : v;
  }
  return decimalToBinary(isNegative, D, e10, round);
}

// Java: Double#parseDouble(String) / FloatingDecimal#parseDouble(String)
export function parseDouble(s) {
  return parseJava(s, false);
}

// Java: Float#parseFloat(String) / FloatingDecimal#parseFloat(String)
export function parseFloat32(s) {
  return parseJava(s, true);
}

// exact value neg * (N / Dn) * 2^e2 (N, Dn positive BigInt) rounded to a double
export function ratioToDouble(neg, N, Dn, e2) {
  const s = Math.max(0, 60 + bitLength(Dn) - bitLength(N));
  const num = N << BigInt(s);
  const q = num / Dn;
  const sticky = num % Dn !== 0n ? 1n : 0n;
  return roundToDouble(neg, (q << 1n) | sticky, e2 - s - 1);
}

// finite double -> [mantissa, exponent] with |d| = mantissa * 2^exponent
export function decomposeDouble(d) {
  dv.setFloat64(0, Math.abs(d));
  const bits = dv.getBigUint64(0);
  const be = Number((bits >> 52n) & 0x7ffn);
  const frac = bits & 0xfffffffffffffn;
  return be === 0 ? [frac, -1074] : [frac | (1n << 52n), be - 1075];
}
