// java.text.DateFormat / SimpleDateFormat subset for en_US (MessageFormat date/time arguments); default zone = process TZ.
import { IllegalArgumentException } from './errors.js';
import { JavaDate } from './boxed.js';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Java: DateFormat style constants
export const FULL = 0;
export const LONG = 1;
export const MEDIUM = 2;
export const SHORT = 3;
export const DEFAULT = MEDIUM;

// Java: CLDR en_US date/time patterns (JDK 17)
const DATE_PATTERNS = ['EEEE, MMMM d, y', 'MMMM d, y', 'MMM d, y', 'M/d/yy'];
const TIME_PATTERNS = ['h:mm:ss a zzzz', 'h:mm:ss a z', 'h:mm:ss a', 'h:mm a'];

const pad = (n, w) => String(n).padStart(w, '0');

// Java: java.text.SimpleDateFormat (en_US, subset of pattern letters)
export class SimpleDateFormat {
  static FQCN = 'java.text.SimpleDateFormat';

  // Java: SimpleDateFormat#SimpleDateFormat(String,Locale)
  constructor(pattern) {
    this.pattern = pattern;
    this.compiled = SimpleDateFormat.compile(pattern);
  }

  // Java: SimpleDateFormat#compile(String)
  static compile(pattern) {
    const out = [];
    let inQuote = false;
    let lit = '';
    for (let i = 0; i < pattern.length; ++i) {
      const c = pattern[i];
      if (c === "'") {
        if (i + 1 < pattern.length && pattern[i + 1] === "'") {
          lit += "'";
          ++i;
        } else {
          inQuote = !inQuote;
        }
      } else if (inQuote || !/[A-Za-z]/.test(c)) {
        lit += c;
      } else {
        let n = 1;
        while (i + 1 < pattern.length && pattern[i + 1] === c) { ++i; ++n; }
        if (!'GyYMLwWDdFEuaHkKhmsSzZX'.includes(c)) throw new IllegalArgumentException(`Illegal pattern character '${c}'`);
        if (lit) out.push(lit);
        lit = '';
        out.push({ c, n });
      }
    }
    if (inQuote) throw new IllegalArgumentException('Unterminated quote');
    if (lit) out.push(lit);
    return out;
  }

  // Java: SimpleDateFormat#format(Date,StringBuffer,FieldPosition)
  formatDate(time) {
    const d = new Date(time);
    let r = '';
    for (const p of this.compiled) {
      if (typeof p === 'string') { r += p; continue; }
      const { c, n } = p;
      const h = d.getHours();
      switch (c) {
        case 'y': r += n === 2 ? pad(d.getFullYear() % 100, 2) : pad(d.getFullYear(), n); break;
        case 'M': case 'L': r += n >= 4 ? MONTHS[d.getMonth()] : n === 3 ? MONTHS[d.getMonth()].substring(0, 3) : pad(d.getMonth() + 1, n); break;
        case 'd': r += pad(d.getDate(), n); break;
        case 'E': r += n >= 4 ? DAYS[d.getDay()] : DAYS[d.getDay()].substring(0, 3); break;
        case 'a': r += h < 12 ? 'AM' : 'PM'; break;
        case 'H': r += pad(h, n); break;
        case 'k': r += pad(h === 0 ? 24 : h, n); break;
        case 'K': r += pad(h % 12, n); break;
        case 'h': r += pad(h % 12 === 0 ? 12 : h % 12, n); break;
        case 'm': r += pad(d.getMinutes(), n); break;
        case 's': r += pad(d.getSeconds(), n); break;
        case 'S': r += pad(d.getMilliseconds(), n); break;
        default: throw new Error(`NOT PORTED: SimpleDateFormat pattern letter '${c}'`);
      }
    }
    return r;
  }

  // Java: DateFormat#format(Object,StringBuffer,FieldPosition)
  format(obj) {
    if (obj instanceof JavaDate) return this.formatDate(obj.getTime());
    if (typeof obj === 'bigint' || typeof obj === 'number') return this.formatDate(Number(obj));
    throw new IllegalArgumentException('Cannot format given Object as a Date');
  }
}

// Java: DateFormat#getDateInstance(int,Locale)
export function getDateInstance(style) {
  return new SimpleDateFormat(DATE_PATTERNS[style]);
}

// Java: DateFormat#getTimeInstance(int,Locale)
export function getTimeInstance(style) {
  return new SimpleDateFormat(TIME_PATTERNS[style]);
}

// Java: DateFormat#getDateTimeInstance(int,int,Locale)
export function getDateTimeInstance(dateStyle, timeStyle) {
  const joiner = dateStyle <= LONG ? "{1} 'at' {0}" : '{1}, {0}';
  const f = new SimpleDateFormat(joiner.replace('{1}', DATE_PATTERNS[dateStyle].replace(/'/g, "''")).replace('{0}', TIME_PATTERNS[timeStyle]));
  return f;
}
