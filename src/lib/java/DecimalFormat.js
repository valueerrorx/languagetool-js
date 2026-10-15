// java.text.DecimalFormat for the en_US symbols (as used by MessageFormat): HALF_EVEN, no exponent patterns.
import { IllegalArgumentException } from './errors.js';
import { doubleDigits } from './toString.js';
import { BigDecimal, BigInteger } from './boxed.js';

const MAXIMUM_INTEGER_DIGITS = 2147483647; // Java: DecimalFormat#MAXIMUM_INTEGER_DIGITS
const MAXIMUM_FRACTION_DIGITS = 2147483647; // Java: DecimalFormat#MAXIMUM_FRACTION_DIGITS
const DOUBLE_INTEGER_DIGITS = 309; // Java: DecimalFormat#DOUBLE_INTEGER_DIGITS
const DOUBLE_FRACTION_DIGITS = 340; // Java: DecimalFormat#DOUBLE_FRACTION_DIGITS

// Java: DigitList#shouldRoundUp(int,boolean,boolean) for RoundingMode.HALF_EVEN
function shouldRoundUp(dl, maximumDigits, alreadyRounded, valueExactAsDecimal) {
  const { digits, count } = dl;
  if (maximumDigits < count) {
    const d = digits.charCodeAt(maximumDigits);
    if (d === 0x35) {
      if (maximumDigits === count - 1) {
        if (alreadyRounded) return false;
        if (!valueExactAsDecimal) return true;
        return maximumDigits > 0 && (digits.charCodeAt(maximumDigits - 1) - 0x30) % 2 !== 0;
      }
      for (let i = maximumDigits + 1; i < count; ++i) if (digits[i] !== '0') return true;
      return maximumDigits > 0 && (digits.charCodeAt(maximumDigits - 1) - 0x30) % 2 !== 0;
    } else if (d > 0x35) {
      return true;
    }
  }
  return false;
}

// Java: DigitList#round(int,boolean,boolean)
function round(dl, maximumDigits, alreadyRounded, valueExactAsDecimal) {
  if (maximumDigits >= 0 && maximumDigits < dl.count) {
    if (shouldRoundUp(dl, maximumDigits, alreadyRounded, valueExactAsDecimal)) {
      const arr = dl.digits.split('');
      for (;;) {
        --maximumDigits;
        if (maximumDigits < 0) {
          arr[0] = '1';
          ++dl.decimalAt;
          maximumDigits = 0;
          break;
        }
        arr[maximumDigits] = String.fromCharCode(arr[maximumDigits].charCodeAt(0) + 1);
        if (arr[maximumDigits] <= '9') break;
      }
      ++maximumDigits;
      dl.digits = arr.join('');
    }
    dl.count = maximumDigits;
    while (dl.count > 1 && dl.digits[dl.count - 1] === '0') --dl.count;
  }
}

// Java: DigitList#set(boolean,String,boolean,boolean,int,boolean) on a Java-format number string
function digitListFromString(str, roundedUp, valueExactAsDecimal, maximumDigits, fixedPoint) {
  const dl = { digits: '', count: 0, decimalAt: 0 };
  let decimalAt = -1;
  let exponent = 0;
  let nonZeroSeen = false;
  let digits = '';
  let leadingZerosAfterDecimal = 0;
  for (let i = 0; i < str.length; ++i) {
    const c = str[i];
    if (c === '.') {
      decimalAt = digits.length;
    } else if (c === 'e' || c === 'E') {
      exponent = parseInt(str.substring(i + 1), 10);
      break;
    } else if (!nonZeroSeen) {
      nonZeroSeen = c !== '0';
      if (nonZeroSeen) digits += c;
      else if (decimalAt !== -1) ++leadingZerosAfterDecimal;
    } else {
      digits += c;
    }
  }
  if (decimalAt === -1) decimalAt = digits.length;
  decimalAt -= leadingZerosAfterDecimal;
  decimalAt += exponent;
  if (digits.length === 0) return dl; // zero: count 0
  dl.digits = digits;
  dl.count = digits.length;
  dl.decimalAt = decimalAt;
  if (fixedPoint) {
    if (-dl.decimalAt > maximumDigits) {
      dl.count = 0;
      return dl;
    } else if (-dl.decimalAt === maximumDigits) {
      if (shouldRoundUp(dl, 0, roundedUp, valueExactAsDecimal)) {
        dl.count = 1;
        ++dl.decimalAt;
        dl.digits = '1';
      } else {
        dl.count = 0;
      }
      return dl;
    }
  }
  while (dl.count > 1 && dl.digits[dl.count - 1] === '0') --dl.count;
  round(dl, fixedPoint ? maximumDigits + dl.decimalAt : maximumDigits, roundedUp, valueExactAsDecimal);
  return dl;
}

// Java: DigitList#set(boolean,long,int) / set(boolean,BigInteger,int) (maximumDigits 0 = no rounding)
function digitListFromBigInt(abs) {
  const dl = { digits: '', count: 0, decimalAt: 0 };
  if (abs === 0n) return dl;
  const s = abs.toString();
  dl.digits = s;
  dl.decimalAt = s.length;
  dl.count = s.length;
  while (dl.count > 1 && dl.digits[dl.count - 1] === '0') --dl.count;
  return dl;
}

// Java: BigDecimal#toString() digit string for a non-negative value (plain notation)
function bigDecimalPlain(abs, scale) {
  const s = abs.toString();
  if (scale <= 0) return s + '0'.repeat(-scale);
  if (s.length > scale) return `${s.substring(0, s.length - scale)}.${s.substring(s.length - scale)}`;
  return `0.${'0'.repeat(scale - s.length)}${s}`;
}

// Java: java.text.DecimalFormat
export class DecimalFormat {
  static FQCN = 'java.text.DecimalFormat';

  // Java: DecimalFormat#DecimalFormat(String,DecimalFormatSymbols) (symbols fixed to en_US)
  constructor(pattern) {
    this.groupingSize = 3;
    this.groupingUsed = true;
    this.multiplier = 1;
    this.decimalSeparatorAlwaysShown = false;
    this.minInt = 1;
    this.maxInt = MAXIMUM_INTEGER_DIGITS;
    this.minFra = 0;
    this.maxFra = 3;
    this.applyPattern(pattern);
  }

  // Java: NumberFormat#getInstance(Locale) for en_US
  static getInstance() {
    return new DecimalFormat('#,##0.###');
  }

  // Java: NumberFormat#getIntegerInstance(Locale) for en_US
  static getIntegerInstance() {
    const f = new DecimalFormat('#,##0');
    f.maxFra = 0;
    f.decimalSeparatorAlwaysShown = false;
    return f;
  }

  // Java: NumberFormat#getPercentInstance(Locale) for en_US
  static getPercentInstance() {
    return new DecimalFormat('#,##0%');
  }

  // Java: NumberFormat#getCurrencyInstance(Locale) for en_US
  static getCurrencyInstance() {
    return new DecimalFormat('¤#,##0.00');
  }

  // Java: DecimalFormat#applyPattern(String)
  applyPattern(pattern) {
    const QUOTE = "'";
    let gotNegative = false;
    this.decimalSeparatorAlwaysShown = false;
    let start = 0;
    let posPrefixPattern = '';
    let posSuffixPattern = '';
    let negPrefixPattern = '';
    let negSuffixPattern = '';
    for (let j = 1; j >= 0 && start < pattern.length; --j) {
      let inQuote = false;
      let prefix = '';
      let suffix = '';
      let decimalPos = -1;
      let multiplier = 1;
      let digitLeftCount = 0;
      let zeroDigitCount = 0;
      let digitRightCount = 0;
      let groupingCount = -1;
      let phase = 0;
      let inSuffix = false;
      const app = (s) => { if (inSuffix) suffix += s; else prefix += s; };
      for (let pos = start; pos < pattern.length; ++pos) {
        const ch = pattern[pos];
        if (phase === 0 || phase === 2) {
          if (inQuote) {
            if (ch === QUOTE) {
              if (pos + 1 < pattern.length && pattern[pos + 1] === QUOTE) {
                ++pos;
                app("''");
              } else {
                inQuote = false;
              }
              continue;
            }
          } else {
            if (ch === '#' || ch === '0' || ch === ',' || ch === '.') {
              phase = 1;
              --pos;
              continue;
            } else if (ch === '¤') {
              const doubled = pos + 1 < pattern.length && pattern[pos + 1] === '¤';
              if (doubled) ++pos;
              app(doubled ? "'¤¤" : "'¤");
              continue;
            } else if (ch === QUOTE) {
              if (pos + 1 < pattern.length && pattern[pos + 1] === QUOTE) {
                ++pos;
                app("''");
              } else {
                inQuote = true;
              }
              continue;
            } else if (ch === ';') {
              if (phase === 0 || j === 0) {
                throw new IllegalArgumentException(`Unquoted special character '${ch}' in pattern "${pattern}"`);
              }
              start = pos + 1;
              pos = pattern.length;
              continue;
            } else if (ch === '%') {
              if (multiplier !== 1) throw new IllegalArgumentException(`Too many percent/per mille characters in pattern "${pattern}"`);
              multiplier = 100;
              app("'%");
              continue;
            } else if (ch === '‰') {
              if (multiplier !== 1) throw new IllegalArgumentException(`Too many percent/per mille characters in pattern "${pattern}"`);
              multiplier = 1000;
              app("'‰");
              continue;
            } else if (ch === '-') {
              app("'-");
              continue;
            }
          }
          app(ch);
        } else {
          if (j === 0) {
            while (pos < pattern.length) {
              const n = pattern[pos];
              if (n === '#' || n === '0' || n === ',' || n === '.') {
                ++pos;
              } else if (n === 'E') {
                pos += 1;
              } else {
                --pos;
                phase = 2;
                inSuffix = true;
                break;
              }
            }
            continue;
          }
          if (ch === '#') {
            if (zeroDigitCount > 0) ++digitRightCount; else ++digitLeftCount;
            if (groupingCount >= 0 && decimalPos < 0) ++groupingCount;
          } else if (ch === '0') {
            if (digitRightCount > 0) throw new IllegalArgumentException(`Unexpected '0' in pattern "${pattern}"`);
            ++zeroDigitCount;
            if (groupingCount >= 0 && decimalPos < 0) ++groupingCount;
          } else if (ch === ',') {
            groupingCount = 0;
          } else if (ch === '.') {
            if (decimalPos >= 0) throw new IllegalArgumentException(`Multiple decimal separators in pattern "${pattern}"`);
            decimalPos = digitLeftCount + zeroDigitCount + digitRightCount;
          } else if (ch === 'E') {
            throw new Error('NOT PORTED: DecimalFormat exponent patterns');
          } else {
            phase = 2;
            inSuffix = true;
            --pos;
            continue;
          }
        }
      }
      if (zeroDigitCount === 0 && digitLeftCount > 0 && decimalPos >= 0) {
        let n = decimalPos;
        if (n === 0) ++n;
        digitRightCount = digitLeftCount - n;
        digitLeftCount = n - 1;
        zeroDigitCount = 1;
      }
      if ((decimalPos < 0 && digitRightCount > 0)
        || (decimalPos >= 0 && (decimalPos < digitLeftCount || decimalPos > digitLeftCount + zeroDigitCount))
        || groupingCount === 0 || inQuote) {
        throw new IllegalArgumentException(`Malformed pattern "${pattern}"`);
      }
      if (j === 1) {
        posPrefixPattern = prefix;
        posSuffixPattern = suffix;
        negPrefixPattern = posPrefixPattern;
        negSuffixPattern = posSuffixPattern;
        const digitTotalCount = digitLeftCount + zeroDigitCount + digitRightCount;
        const effectiveDecimalPos = decimalPos >= 0 ? decimalPos : digitTotalCount;
        this.minInt = Math.min(Math.max(0, effectiveDecimalPos - digitLeftCount), MAXIMUM_INTEGER_DIGITS);
        this.maxInt = MAXIMUM_INTEGER_DIGITS;
        this.maxFra = decimalPos >= 0 ? digitTotalCount - decimalPos : 0;
        this.minFra = decimalPos >= 0 ? digitLeftCount + zeroDigitCount - decimalPos : 0;
        if (this.minFra > this.maxFra) this.maxFra = this.minFra;
        this.groupingUsed = groupingCount > 0;
        this.groupingSize = groupingCount > 0 ? groupingCount : 0;
        this.multiplier = multiplier;
        this.decimalSeparatorAlwaysShown = decimalPos === 0 || decimalPos === digitTotalCount;
      } else {
        negPrefixPattern = prefix;
        negSuffixPattern = suffix;
        gotNegative = true;
      }
    }
    if (pattern.length === 0) {
      posPrefixPattern = '';
      posSuffixPattern = '';
      this.minInt = 0;
      this.maxInt = MAXIMUM_INTEGER_DIGITS;
      this.minFra = 0;
      this.maxFra = MAXIMUM_FRACTION_DIGITS;
    }
    if (!gotNegative || (negPrefixPattern === posPrefixPattern && negSuffixPattern === posSuffixPattern)) {
      negSuffixPattern = posSuffixPattern;
      negPrefixPattern = `'-${posPrefixPattern}`;
    }
    this.positivePrefix = DecimalFormat.expandAffix(posPrefixPattern);
    this.positiveSuffix = DecimalFormat.expandAffix(posSuffixPattern);
    this.negativePrefix = DecimalFormat.expandAffix(negPrefixPattern);
    this.negativeSuffix = DecimalFormat.expandAffix(negSuffixPattern);
  }

  // Java: DecimalFormat#expandAffix(String,StringBuffer) with en_US symbols
  static expandAffix(pattern) {
    let buffer = '';
    for (let i = 0; i < pattern.length;) {
      let c = pattern[i++];
      if (c === "'") {
        c = pattern[i++];
        if (c === '¤') {
          if (i < pattern.length && pattern[i] === '¤') {
            ++i;
            buffer += 'USD';
          } else {
            buffer += '$';
          }
          continue;
        } else if (c === '%') {
          c = '%';
        } else if (c === '‰') {
          c = '‰';
        } else if (c === '-') {
          c = '-';
        }
      }
      buffer += c;
    }
    return buffer;
  }

  // Java: DecimalFormat#format(Object,StringBuffer,FieldPosition)
  format(number) {
    if (typeof number === 'bigint') return this.formatLong(number);
    if (number instanceof BigInteger) {
      return number.bitLength() < 64 ? this.formatLong(number.value) : this.formatBigInteger(number);
    }
    if (number instanceof BigDecimal) return this.formatBigDecimal(number);
    if (typeof number === 'number') return this.formatDouble(number);
    throw new IllegalArgumentException('Cannot format given Object as a Number');
  }

  // Java: DecimalFormat#format(double,StringBuffer,FieldPosition)
  formatDouble(number) {
    if (number !== number) return 'NaN';
    let isNegative = (number < 0.0 || (number === 0.0 && 1 / number < 0.0)) !== (this.multiplier < 0);
    if (this.multiplier !== 1) number *= this.multiplier;
    if (number === Infinity || number === -Infinity) {
      return `${isNegative ? this.negativePrefix : this.positivePrefix}∞${isNegative ? this.negativeSuffix : this.positiveSuffix}`;
    }
    if (isNegative) number = -number;
    const maxInt = Math.min(this.maxInt, DOUBLE_INTEGER_DIGITS);
    const maxFra = Math.min(this.maxFra, DOUBLE_FRACTION_DIGITS);
    const buf = doubleDigits(number);
    const dl = digitListFromString(buf.toJavaFormatString(), buf.decimalDigitsRoundedUp, buf.exactDecimalConversion, maxFra, true);
    return this.subformat(dl, isNegative, false, maxInt, this.minInt, maxFra, this.minFra);
  }

  // Java: DecimalFormat#format(long,StringBuffer,FieldPosition)
  formatLong(number) {
    let isNegative = number < 0n;
    if (isNegative) number = -number;
    if (this.multiplier !== 1) number *= BigInt(this.multiplier);
    if (this.multiplier < 0 && number !== 0n) isNegative = !isNegative;
    const dl = digitListFromBigInt(number);
    return this.subformat(dl, isNegative, true, Math.min(this.maxInt, DOUBLE_INTEGER_DIGITS), this.minInt,
      Math.min(this.maxFra, DOUBLE_FRACTION_DIGITS), this.minFra);
  }

  // Java: DecimalFormat#format(BigInteger,StringBuffer,FieldPosition,boolean)
  formatBigInteger(number) {
    let isNegative = number.signum() < 0;
    let n = isNegative ? -number.value : number.value;
    if (this.multiplier !== 1) n *= BigInt(this.multiplier);
    if (this.multiplier < 0 && n !== 0n) isNegative = !isNegative;
    return this.subformat(digitListFromBigInt(n), isNegative, true, this.maxInt, this.minInt, this.maxFra, this.minFra);
  }

  // Java: DecimalFormat#format(BigDecimal,StringBuffer,FieldPosition)
  formatBigDecimal(number) {
    let isNegative = number.signum() === -1;
    let unscaled = number.unscaled < 0n ? -number.unscaled : number.unscaled;
    if (this.multiplier !== 1) unscaled *= BigInt(this.multiplier);
    if (this.multiplier < 0 && unscaled !== 0n) isNegative = !isNegative;
    const dl = digitListFromString(bigDecimalPlain(unscaled, number.scale), false, true, this.maxFra, true);
    return this.subformat(dl, isNegative, false, this.maxInt, this.minInt, this.maxFra, this.minFra);
  }

  // Java: DecimalFormat#subformat(StringBuffer,Delegate,boolean,boolean,int,int,int,int) (no exponent)
  subformat(dl, isNegative, isInteger, maxIntDigits, minIntDigits, maxFraDigits, minFraDigits) {
    let result = isNegative ? this.negativePrefix : this.positivePrefix;
    let count = minIntDigits;
    let digitIndex = 0;
    if (dl.decimalAt > 0 && count < dl.decimalAt) count = dl.decimalAt;
    if (count > maxIntDigits) {
      count = maxIntDigits;
      digitIndex = dl.decimalAt - count;
    }
    const sizeBeforeIntegerPart = result.length;
    for (let i = count - 1; i >= 0; --i) {
      if (i < dl.decimalAt && digitIndex < dl.count) result += dl.digits[digitIndex++];
      else result += '0';
      if (this.groupingUsed && i > 0 && this.groupingSize !== 0 && i % this.groupingSize === 0) result += ',';
    }
    const fractionPresent = minFraDigits > 0 || (!isInteger && digitIndex < dl.count);
    if (!fractionPresent && result.length === sizeBeforeIntegerPart) result += '0';
    if (this.decimalSeparatorAlwaysShown || fractionPresent) result += '.';
    for (let i = 0; i < maxFraDigits; ++i) {
      if (i >= minFraDigits && (isInteger || digitIndex >= dl.count)) break;
      if (-1 - i > dl.decimalAt - 1) {
        result += '0';
        continue;
      }
      if (!isInteger && digitIndex < dl.count) result += dl.digits[digitIndex++];
      else result += '0';
    }
    result += isNegative ? this.negativeSuffix : this.positiveSuffix;
    return result;
  }
}
