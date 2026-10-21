// java.util.concurrent.TimeUnit subset (conversion to nanoseconds, milliseconds)
import { JavaEnum } from './JavaEnum.js';

// Java: java.util.concurrent.TimeUnit
export class TimeUnit extends JavaEnum {
  static FQCN = 'java.util.concurrent.TimeUnit';

  constructor(name, ordinal, nanos) {
    super(name, ordinal);
    this.nanos = nanos;
  }

  // Java: TimeUnit#toNanos(long) (saturating at Long.MAX_VALUE)
  toNanos(d) {
    const r = BigInt(d) * this.nanos;
    return r > 9223372036854775807n ? 9223372036854775807n : r < -9223372036854775808n ? -9223372036854775808n : r;
  }

  // Java: TimeUnit#toMillis(long)
  toMillis(d) {
    return Number((BigInt(d) * this.nanos) / 1000000n);
  }

  // Java: TimeUnit#toSeconds(long)
  toSeconds(d) {
    return Number((BigInt(d) * this.nanos) / 1000000000n);
  }
}
TimeUnit.NANOSECONDS = new TimeUnit('NANOSECONDS', 0, 1n);
TimeUnit.MICROSECONDS = new TimeUnit('MICROSECONDS', 1, 1000n);
TimeUnit.MILLISECONDS = new TimeUnit('MILLISECONDS', 2, 1000000n);
TimeUnit.SECONDS = new TimeUnit('SECONDS', 3, 1000000000n);
TimeUnit.MINUTES = new TimeUnit('MINUTES', 4, 60000000000n);
TimeUnit.HOURS = new TimeUnit('HOURS', 5, 3600000000000n);
TimeUnit.DAYS = new TimeUnit('DAYS', 6, 86400000000000n);
