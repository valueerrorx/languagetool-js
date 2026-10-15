// Minimal java.math.BigDecimal / BigInteger and java.util.Date value types for MessageFormat arguments.
import { NumberFormatException } from './errors.js';

// Java: java.math.BigInteger (wraps a BigInt)
export class BigInteger {
  static FQCN = 'java.math.BigInteger';

  constructor(v) {
    this.value = typeof v === 'bigint' ? v : BigInt(v);
  }

  // Java: BigInteger#signum()
  signum() {
    return this.value < 0n ? -1 : this.value > 0n ? 1 : 0;
  }

  // Java: BigInteger#bitLength()
  bitLength() {
    const v = this.value < 0n ? -this.value - 1n : this.value;
    return v === 0n ? 0 : v.toString(2).length;
  }

  // Java: BigInteger#doubleValue()
  doubleValue() {
    return Number(this.value);
  }

  // Java: BigInteger#toString()
  toString() {
    return this.value.toString();
  }
}

// Java: java.math.BigDecimal (unscaled BigInt value and scale)
export class BigDecimal {
  static FQCN = 'java.math.BigDecimal';

  // Java: BigDecimal#BigDecimal(String)
  constructor(unscaled, scale = 0) {
    if (typeof unscaled === 'string') {
      const m = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(unscaled);
      if (!m || (m[2] === '' && (m[3] ?? '') === '')) throw new NumberFormatException();
      const frac = m[3] ?? '';
      this.unscaled = BigInt(`${m[1] === '-' ? '-' : ''}${m[2]}${frac}` || '0');
      this.scale = frac.length - (m[4] ? Number(m[4]) : 0);
    } else {
      this.unscaled = unscaled;
      this.scale = scale;
    }
  }

  // Java: BigDecimal#signum()
  signum() {
    return this.unscaled < 0n ? -1 : this.unscaled > 0n ? 1 : 0;
  }

  // Java: BigDecimal#doubleValue() (Double.parseDouble(toString()))
  doubleValue() {
    return Number(`${this.unscaled}e${-this.scale}`);
  }

  // Java: BigDecimal#toString() digits: [negative, digit string without leading zeros, decimal point position]
  digitsAndExponent() {
    const neg = this.unscaled < 0n;
    const s = (neg ? -this.unscaled : this.unscaled).toString();
    return { neg, digits: s === '0' ? '' : s, decimalAt: s === '0' ? 0 : s.length - this.scale };
  }
}

// Java: java.util.Date (milliseconds since the epoch)
export class JavaDate {
  static FQCN = 'java.util.Date';

  constructor(time) {
    this.time = Number(time);
  }

  // Java: Date#getTime()
  getTime() {
    return this.time;
  }
}
