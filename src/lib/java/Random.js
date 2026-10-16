// Java: java.util.Random (48-bit LCG kept as two exact 24-bit halves; JDK 17 legacy algorithms)
import { IllegalArgumentException } from './errors.js';
import { StrictMath } from './StrictMath.js';

const TWO24 = 0x1000000;
const MUL_HI = 0x5de; // multiplier 0x5DEECE66D = MUL_HI * 2^24 + MUL_LO
const MUL_LO = 0xece66d;
const ADDEND = 0xb;
const DOUBLE_UNIT = 2 ** -53;

// Java: java.util.Random
export class Random {
  static FQCN = 'java.util.Random';

  // Java: Random#Random(long) (seed as bigint or safe-integer number; initialScramble = (seed ^ multiplier) & mask)
  constructor(seed) {
    this.setSeed(seed);
  }

  // Java: Random#setSeed(long)
  setSeed(seed) {
    const s = (BigInt.asUintN(64, BigInt(seed)) ^ 0x5deece66dn) & 0xffffffffffffn;
    this.hi = Number(s >> 24n);
    this.lo = Number(s & 0xffffffn);
    this.haveNextNextGaussian = false;
    this.nextNextGaussian = 0;
  }

  // Java: Random#next(int)
  next(bits) {
    const p = this.lo * MUL_LO + ADDEND;
    const lo = p % TWO24;
    const hi = (this.hi * MUL_LO + this.lo * MUL_HI + Math.floor(p / TWO24)) % TWO24;
    this.hi = hi;
    this.lo = lo;
    return Math.floor((hi * TWO24 + lo) / 2 ** (48 - bits)) | 0;
  }

  // Java: Random#nextInt()
  nextInt(bound) {
    if (bound === undefined) return this.next(32);
    // Java: Random#nextInt(int)
    if (bound <= 0) throw new IllegalArgumentException('bound must be positive');
    let r = this.next(31);
    const m = bound - 1;
    if ((bound & m) === 0) {
      r = Math.floor((bound * r) / 2 ** 31) | 0; // (int)((bound * (long)r) >> 31), exact: bound is a power of two
    } else {
      for (let u = r; ((u - (r = u % bound) + m) | 0) < 0; u = this.next(31));
    }
    return r;
  }

  // Java: Random#nextLong() (as bigint)
  nextLong() {
    return BigInt.asIntN(64, (BigInt(this.next(32)) << 32n) + BigInt(this.next(32)));
  }

  // Java: Random#nextBoolean()
  nextBoolean() {
    return this.next(1) !== 0;
  }

  // Java: Random#nextDouble()
  nextDouble() {
    return (this.next(26) * 2 ** 27 + this.next(27)) * DOUBLE_UNIT;
  }

  // Java: Random#nextGaussian() (polar method with StrictMath, as JDK 17)
  nextGaussian() {
    if (this.haveNextNextGaussian) {
      this.haveNextNextGaussian = false;
      return this.nextNextGaussian;
    }
    let v1;
    let v2;
    let s;
    do {
      v1 = 2 * this.nextDouble() - 1; // between -1 and 1
      v2 = 2 * this.nextDouble() - 1; // between -1 and 1
      s = v1 * v1 + v2 * v2;
    } while (s >= 1 || s === 0);
    const multiplier = StrictMath.sqrt(-2 * StrictMath.log(s) / s);
    this.nextNextGaussian = v2 * multiplier;
    this.haveNextNextGaussian = true;
    return v1 * multiplier;
  }
}
