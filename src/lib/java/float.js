// Java float arithmetic (32 bit via Math.fround) and java.lang.Float / float overloads of java.lang.Math.
import { floatToString } from './toString.js';
import { parseFloat32 } from './floatingDecimal.js';
import { d2i } from './casts.js';
import { drem } from './numbers.js';

const dv = new DataView(new ArrayBuffer(8));
const f32 = Math.fround;

// Java: float + float
export const fadd = (a, b) => f32(a + b);
// Java: float - float
export const fsub = (a, b) => f32(a - b);
// Java: float * float
export const fmul = (a, b) => f32(a * b);
// Java: float / float
export const fdiv = (a, b) => f32(a / b);
// Java: float % float
export const frem = (a, b) => f32(drem(a, b));

// Java: Float.floatToRawIntBits(float)
function floatToRawIntBits(f) {
  dv.setFloat32(0, f);
  return dv.getInt32(0);
}

// Java: java.lang.Float (static methods; boxed Float is a JS number holding a float value)
export const Float = {
  MAX_VALUE: 3.4028234663852886e38,
  MIN_VALUE: 1.401298464324817e-45,

  // Java: Float#parseFloat(String)
  parseFloat(s) {
    return parseFloat32(s);
  },

  // Java: Float#valueOf(String)
  valueOf(s) {
    return parseFloat32(s);
  },

  // Java: Float#toString(float)
  toString(f) {
    return floatToString(f);
  },

  // Java: Float#floatToIntBits(float)
  floatToIntBits(f) {
    return Number.isNaN(f) ? 0x7fc00000 : floatToRawIntBits(f);
  },

  // Java: Float#floatToRawIntBits(float)
  floatToRawIntBits,

  // Java: Float#intBitsToFloat(int)
  intBitsToFloat(bits) {
    dv.setInt32(0, bits);
    return dv.getFloat32(0);
  },

  // Java: Float#hashCode(float)
  hashCode(value) {
    return Float.floatToIntBits(value);
  },

  // Java: Float#compare(float,float)
  compare(f1, f2) {
    if (f1 < f2) return -1;
    if (f1 > f2) return 1;
    const a = Float.floatToIntBits(f1);
    const b = Float.floatToIntBits(f2);
    return a === b ? 0 : a < b ? -1 : 1;
  },

  // Java: Float#isNaN(float)
  isNaN(v) {
    return v !== v;
  },

  // Java: Float#isInfinite(float)
  isInfinite(v) {
    return v === Infinity || v === -Infinity;
  },

  // Java: Float#isFinite(float)
  isFinite(f) {
    return Math.abs(f) <= Float.MAX_VALUE;
  },

  // Java: Float#sum(float,float)
  sum(a, b) {
    return f32(a + b);
  },

  // Java: Float#max(float,float)
  max(a, b) {
    return FloatMath.max(a, b);
  },

  // Java: Float#min(float,float)
  min(a, b) {
    return FloatMath.min(a, b);
  },
};

// Java: java.lang.Math float overloads (abs, min, max, round, ulp, signum)
export const FloatMath = {
  // Java: Math#abs(float)
  abs(a) {
    return Math.abs(a);
  },

  // Java: Math#min(float,float)
  min(a, b) {
    if (a !== a) return a;
    if (b !== b) return b;
    return Math.min(a, b);
  },

  // Java: Math#max(float,float)
  max(a, b) {
    if (a !== a) return a;
    if (b !== b) return b;
    return Math.max(a, b);
  },

  // Java: Math#round(float)
  round(a) {
    const floatBits = floatToRawIntBits(a);
    const biasedExp = (floatBits & 0x7f800000) >> 23;
    const shift = 22 + 127 - biasedExp;
    if ((shift & -32) === 0) {
      let r = (floatBits & 0x007fffff) | 0x00800000;
      if (floatBits < 0) r = -r;
      return (((r >> shift) + 1) >> 1) | 0;
    }
    return d2i(a);
  },

  // Java: Math#ulp(float)
  ulp(f) {
    const bits = floatToRawIntBits(Math.abs(f));
    const exp = (bits >> 23) - 127;
    if (exp === 128) return Math.abs(f);
    if (exp === -127) return Float.MIN_VALUE;
    const e = exp - 23;
    if (e >= -126) {
      dv.setInt32(0, (e + 127) << 23);
      return dv.getFloat32(0);
    }
    dv.setInt32(0, 1 << (e + 149));
    return dv.getFloat32(0);
  },

  // Java: Math#signum(float)
  signum(f) {
    return f === 0 || f !== f ? f : Math.sign(f);
  },
};

// Java: Math#round(double) -> long (BigInt): round half up of the exact value, NaN -> 0, saturating at Long.MIN/MAX_VALUE
export function mathRoundDouble(a) {
  if (a !== a) return 0n;
  if (a >= 9.223372036854776e18) return 9223372036854775807n;
  if (a <= -9.223372036854776e18) return -9223372036854775808n;
  const f = Math.floor(a);
  return BigInt(a - f >= 0.5 ? f + 1 : f);
}
