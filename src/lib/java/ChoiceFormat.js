// java.text.ChoiceFormat (pattern parsing, formatting, toPattern).
import { IllegalArgumentException, ArrayIndexOutOfBoundsException } from './errors.js';
import { Double } from './numbers.js';
import { doubleToString } from './toString.js';

const dv = new DataView(new ArrayBuffer(8));

// Java: Math.nextUp(double) / Math.nextDown(double)
function nextAfter(d, up) {
  if (d !== d) return d;
  if (d === (up ? Infinity : -Infinity)) return d;
  if (d === 0) return up ? Number.MIN_VALUE : -Number.MIN_VALUE;
  dv.setFloat64(0, d);
  let bits = dv.getBigInt64(0);
  bits += (d > 0) === up ? 1n : -1n;
  dv.setBigInt64(0, bits);
  return dv.getFloat64(0);
}

// Java: Math.IEEEremainder(x, 1.0d)
function ieeeRemainder1(x) {
  if (x !== x || !Number.isFinite(x)) return NaN;
  const f = Math.floor(x);
  const diff = x - f;
  let n = f;
  if (diff > 0.5 || (diff === 0.5 && f % 2 !== 0)) n = f + 1;
  return x - n;
}

// Java: java.text.ChoiceFormat
export class ChoiceFormat {
  static FQCN = 'java.text.ChoiceFormat';

  // Java: ChoiceFormat#ChoiceFormat(String)
  constructor(newPattern) {
    this.applyPattern(newPattern);
  }

  // Java: ChoiceFormat#applyPattern(String)
  applyPattern(newPattern) {
    const segments = ['', ''];
    const limits = [];
    const formats = [];
    let part = 0;
    let startValue = 0;
    let oldStartValue = NaN;
    let inQuote = false;
    for (let i = 0; i < newPattern.length; ++i) {
      const ch = newPattern[i];
      if (ch === "'") {
        if (i + 1 < newPattern.length && newPattern[i + 1] === ch) {
          segments[part] += ch;
          ++i;
        } else {
          inQuote = !inQuote;
        }
      } else if (inQuote) {
        segments[part] += ch;
      } else if (ch === '<' || ch === '#' || ch === '≤') {
        if (segments[0].length === 0) throw new IllegalArgumentException('Each interval must contain a number before a format');
        const tempBuffer = segments[0];
        if (tempBuffer === '∞') startValue = Infinity;
        else if (tempBuffer === '-∞') startValue = -Infinity;
        else startValue = Double.parseDouble(tempBuffer);
        if (ch === '<' && startValue !== Infinity && startValue !== -Infinity) startValue = nextAfter(startValue, true);
        if (startValue <= oldStartValue) throw new IllegalArgumentException('Incorrect order of intervals, must be in ascending order');
        segments[0] = '';
        part = 1;
      } else if (ch === '|') {
        limits.push(startValue);
        formats.push(segments[1]);
        oldStartValue = startValue;
        segments[1] = '';
        part = 0;
      } else {
        segments[part] += ch;
      }
    }
    if (part === 1) {
      limits.push(startValue);
      formats.push(segments[1]);
    }
    this.choiceLimits = limits;
    this.choiceFormats = formats;
  }

  // Java: ChoiceFormat#format(double,StringBuffer,FieldPosition)
  formatDouble(number) {
    let i;
    for (i = 0; i < this.choiceLimits.length; ++i) {
      if (!(number >= this.choiceLimits[i])) break;
    }
    --i;
    if (i < 0) i = 0;
    if (i >= this.choiceFormats.length) {
      throw new ArrayIndexOutOfBoundsException(`Index ${i} out of bounds for length ${this.choiceFormats.length}`);
    }
    return this.choiceFormats[i];
  }

  // Java: ChoiceFormat#toPattern()
  toPattern() {
    let result = '';
    for (let i = 0; i < this.choiceLimits.length; ++i) {
      if (i !== 0) result += '|';
      const lim = this.choiceLimits[i];
      const less = nextAfter(lim, false);
      const tryLessOrEqual = Math.abs(ieeeRemainder1(lim));
      const tryLess = Math.abs(ieeeRemainder1(less));
      if (tryLessOrEqual < tryLess) {
        result += doubleToString(lim);
        result += '#';
      } else {
        if (lim === Infinity) result += '∞';
        else if (lim === -Infinity) result += '-∞';
        else result += doubleToString(less);
        result += '<';
      }
      const text = this.choiceFormats[i];
      const needQuote = text.includes('<') || text.includes('#') || text.includes('≤') || text.includes('|');
      if (needQuote) result += "'";
      if (!text.includes("'")) {
        result += text;
      } else {
        for (const c of text) {
          if (c === "'") result += c;
          result += c;
        }
      }
      if (needQuote) result += "'";
    }
    return result;
  }
}
