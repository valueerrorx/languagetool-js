// Java primitive conversions (JLS 5.1.2/5.1.3): double/float->int/long saturation, narrowing wrap, long->float.
import { roundToFloat } from './floatingDecimal.js';

// Java: (int) double
export function d2i(d) {
  if (d !== d) return 0;
  if (d >= 2147483647) return 2147483647;
  if (d <= -2147483648) return -2147483648;
  return Math.trunc(d) | 0;
}

// Java: (long) double
export function d2l(d) {
  if (d !== d) return 0n;
  if (d >= 9223372036854775807) return 9223372036854775807n;
  if (d <= -9223372036854775808) return -9223372036854775808n;
  return BigInt(Math.trunc(d));
}

// Java: (short) int
export const i2s = (i) => (i << 16) >> 16;
// Java: (byte) int
export const i2b = (i) => (i << 24) >> 24;
// Java: (char) int
export const i2c = (i) => i & 0xffff;
// Java: (short) double
export const d2s = (d) => i2s(d2i(d));
// Java: (byte) double
export const d2b = (d) => i2b(d2i(d));
// Java: (char) double
export const d2c = (d) => i2c(d2i(d));
// Java: (int) long
export const l2i = (l) => Number(BigInt.asIntN(32, l));
// Java: (short) long
export const l2s = (l) => Number(BigInt.asIntN(16, l));
// Java: (byte) long
export const l2b = (l) => Number(BigInt.asIntN(8, l));
// Java: (char) long
export const l2c = (l) => Number(BigInt.asUintN(16, l));
// Java: (double) long
export const l2d = (l) => Number(l);

// Java: (float) long (single rounding to nearest even, no double rounding)
export function l2f(l) {
  const neg = l < 0n;
  return roundToFloat(neg, neg ? -l : l, 0);
}
