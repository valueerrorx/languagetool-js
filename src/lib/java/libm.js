// Correctly rounded exp/log/log10/sin/cos/tan/pow (BigInt fixed point): models the near-exact HotSpot x86_64 Math intrinsics.
import { StrictMath, DEFAULT_NAN } from './StrictMath.js';
import { roundToDouble, ratioToDouble, decomposeDouble } from './floatingDecimal.js';

const P = 300;
const PB = BigInt(P);
const ONE = 1n << PB;
const bl = (n) => n.toString(2).length;
const TINY_SIN = 2 ** -30;

// ln(2) * 2^P via 2*atanh(1/3)
let LN2_FIX = null;
// ln(10) * 2^P
let LN10_FIX = null;
// pi * 2^bits (largest computed precision is cached)
let PI_CACHE = { bits: 0, value: 0n };

// atanh(z) * 2^P for z given as fixed point (|z| < 1/2)
function atanhFix(z) {
  const z2 = (z * z) / ONE;
  let sum = 0n;
  let t = z;
  for (let k = 1n; t !== 0n; k += 2n) {
    sum += t / k;
    t = (t * z2) / ONE;
  }
  return sum;
}

// ln(2) in fixed point
function ln2() {
  if (LN2_FIX === null) LN2_FIX = 2n * atanhFix(ONE / 3n);
  return LN2_FIX;
}

// ln(10) in fixed point (3 ln 2 + ln 1.25)
function ln10() {
  if (LN10_FIX === null) {
    const f = (5n * ONE) / 4n;
    LN10_FIX = 3n * ln2() + 2n * atanhFix(((f - ONE) * ONE) / (f + ONE));
  }
  return LN10_FIX;
}

// pi * 2^bits (Machin)
function piFix(bits) {
  if (PI_CACHE.bits >= bits) return PI_CACHE.value >> BigInt(PI_CACHE.bits - bits);
  const G = bits + 32;
  const one = 1n << BigInt(G);
  const acot = (n) => {
    let sum = 0n;
    let term = one / BigInt(n);
    let k = 1n;
    let sg = 1n;
    const n2 = BigInt(n * n);
    while (term !== 0n) {
      sum += sg * (term / k);
      term /= n2;
      k += 2n;
      sg = -sg;
    }
    return sum;
  };
  const v = (4n * (4n * acot(5) - acot(239))) >> 32n;
  PI_CACHE = { bits, value: v };
  return v;
}

// ln(x) in fixed point for finite positive x (returns BigInt scaled by 2^P)
function lnFix(x) {
  const [m, e] = decomposeDouble(x);
  const bits = bl(m);
  let ex = e + bits;
  let f = (m << PB) >> BigInt(bits);
  if (f < (3n * ONE) / 4n) {
    f <<= 1n;
    ex -= 1;
  }
  const z = ((f - ONE) * ONE) / (f + ONE);
  return 2n * atanhFix(z) + BigInt(ex) * ln2();
}

// exp(r) in fixed point for |r| < ln2 (argument halving 10 times)
function expFix(r) {
  const x = r / 1024n;
  let term = ONE;
  let sum = ONE;
  for (let i = 1n; term !== 0n; i++) {
    term = (term * x) / ONE / i;
    sum += term;
  }
  for (let i = 0; i < 10; i++) sum = (sum * sum) >> PB;
  return sum;
}

// exp of a fixed-point value Y (scaled by 2^P), result rounded to double
function expOfFix(Y) {
  const ln = ln2();
  const kf = BigInt(Math.floor(Number(Y >> BigInt(P - 60)) / 2 ** 60 / 0.6931471805599453 + 0.5));
  const r = Y - kf * ln;
  const ex = expFix(r);
  return roundToDouble(false, ex, -P + Number(kf));
}

// fixed-point value of |x| (scaled by 2^bits)
function absFix(x, bits) {
  const [m, e] = decomposeDouble(x);
  return e >= 0 ? (m << BigInt(e)) << BigInt(bits) : (m << BigInt(bits)) >> BigInt(-e);
}

// Java: Math#exp(double)
export function exp(x) {
  if (x !== x) return x;
  if (x === Infinity) return x;
  if (x === -Infinity) return 0;
  if (x > 710) return Infinity;
  if (x < -746) return 0;
  const X = x < 0 ? -absFix(x, P) : absFix(x, P);
  return expOfFix(X);
}

// Java: Math#log(double)
export function log(x) {
  if (x !== x) return x;
  if (x < 0) return DEFAULT_NAN;
  if (x === 0) return -Infinity;
  if (x === Infinity) return x;
  const total = lnFix(x);
  return roundToDouble(total < 0n, total < 0n ? -total : total, -P);
}

// Java: Math#log10(double)
export function log10(x) {
  if (x !== x) return x;
  if (x < 0) return DEFAULT_NAN;
  if (x === 0) return -Infinity;
  if (x === Infinity) return x;
  const q = (lnFix(x) * ONE) / ln10();
  return roundToDouble(q < 0n, q < 0n ? -q : q, -P);
}

// [n mod 4, sin r, cos r] (fixed point) for r = |x| - n*pi/2
function sincosFix(x) {
  const [m, e] = decomposeDouble(x);
  const extra = Math.max(0, bl(m) + e) + 10;
  const PP = P + extra;
  const X = e >= 0 ? (m << BigInt(e)) << BigInt(PP) : (m << BigInt(PP)) >> BigInt(-e);
  const hp = piFix(PP) / 2n;
  let n = X / hp;
  let r = X - n * hp;
  if (r * 2n > hp) {
    n += 1n;
    r -= hp;
  }
  const rr = r >> BigInt(PP - P);
  const r2 = (rr * rr) / ONE;
  let s = 0n;
  let t = rr;
  for (let i = 1n; t !== 0n; i += 2n) {
    s += t;
    t = -((t * r2) / ONE) / ((i + 1n) * (i + 2n));
  }
  let c = 0n;
  t = ONE;
  for (let i = 0n; t !== 0n; i += 2n) {
    c += t;
    t = -((t * r2) / ONE) / ((i + 1n) * (i + 2n));
  }
  return [Number(n & 3n), s, c];
}

// Java: Math#sin(double)
export function sin(x) {
  if (x !== x) return x;
  if (x === Infinity || x === -Infinity) return DEFAULT_NAN;
  if (Math.abs(x) < TINY_SIN) return x;
  const [q, s, c] = sincosFix(x);
  const v = [s, c, -s, -c][q];
  const neg = v < 0n !== x < 0;
  return roundToDouble(neg, v < 0n ? -v : v, -P);
}

// Java: Math#cos(double)
export function cos(x) {
  if (x !== x) return x;
  if (x === Infinity || x === -Infinity) return DEFAULT_NAN;
  const [q, s, c] = sincosFix(x);
  const v = [c, -s, -c, s][q];
  return roundToDouble(v < 0n, v < 0n ? -v : v, -P);
}

// Java: Math#tan(double)
export function tan(x) {
  if (x !== x) return x;
  if (x === Infinity || x === -Infinity) return DEFAULT_NAN;
  if (Math.abs(x) < TINY_SIN) return x;
  const [q, s, c] = sincosFix(x);
  const [a, b] = q & 1 ? [-c, s] : [s, c];
  const quo = (a * ONE) / b;
  const neg = quo < 0n !== x < 0;
  return roundToDouble(neg, quo < 0n ? -quo : quo, -P);
}

// x^y for finite nonzero x and integer |y| <= 1100, correctly rounded
function powInt(x, y) {
  const [m, e] = decomposeDouble(x);
  const neg = x < 0 && y % 2 !== 0;
  const n = Math.abs(y);
  const mp = m ** BigInt(n);
  const e2 = e * n;
  if (y > 0) return roundToDouble(neg, mp, e2);
  return ratioToDouble(neg, 1n, mp, -e2);
}

// Java: Math#pow(double,double)
export function pow(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || x === 0 || Math.abs(x) === 1 || y === 0 || y === 1) {
    if (Math.abs(x) === 1 && (y === Infinity || y === -Infinity)) return NaN; // the intrinsic returns the canonical NaN here
    return StrictMath.pow(x, y);
  }
  if (Number.isInteger(y) && Math.abs(y) <= 1100) return powInt(x, y);
  const odd = Number.isInteger(y) && y % 2 !== 0;
  if (x < 0 && !Number.isInteger(y)) return DEFAULT_NAN;
  const neg = x < 0 && odd;
  const [my, ey] = decomposeDouble(y);
  const lx = lnFix(Math.abs(x));
  let Y = lx * (y < 0 ? -my : my);
  Y = ey >= 0 ? Y << BigInt(ey) : Y >> BigInt(-ey);
  if (Y > 750n * ONE) return neg ? -Infinity : Infinity;
  if (Y < -760n * ONE) return neg ? -0 : 0;
  const r = expOfFix(Y);
  return neg ? -r : r;
}
