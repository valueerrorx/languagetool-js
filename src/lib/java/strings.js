// java.lang.String / StringBuilder semantics (JDK 17): trim/strip, literal replace, compare, bounds errors, code points.
import {
  NullPointerException, StringIndexOutOfBoundsException, IndexOutOfBoundsException,
  IllegalArgumentException, NegativeArraySizeException, OutOfMemoryError,
} from './errors.js';
import { valueOf } from './Objects.js';
import { doubleToString, floatToString } from './toString.js';
import {
  isHighSurrogate, isLowSurrogate, isSurrogate, isBmpCodePoint, isValidCodePoint, isSupplementaryCodePoint, charCount, toCodePoint,
  toChars, isWhitespace, toUpperCase as charToUpperCase, toLowerCase as charToLowerCase,
} from './Character.js';
import { toLowerCaseAt, toUpperCaseAt } from './specialCasing.js';

export { stringHashCode } from './Objects.js';

// ---- code point helpers (java.lang.Character, chars are numbers; defined in Character.js) ----

export {
  isHighSurrogate, isLowSurrogate, isSurrogate, isBmpCodePoint, isValidCodePoint, isSupplementaryCodePoint, charCount, toCodePoint,
  toChars, isWhitespace,
};

// ---- bounds checks ----

// Java: String#checkIndex(int,int)
function checkIndex(index, length) {
  if (index < 0 || index >= length) throw new StringIndexOutOfBoundsException(`index ${index}, length ${length}`);
}

// Java: String#checkOffset(int,int)
function checkOffset(offset, length) {
  if (offset < 0 || offset > length) throw new StringIndexOutOfBoundsException(`offset ${offset}, length ${length}`);
}

// Java: String#checkBoundsBeginEnd(int,int,int)
function checkBoundsBeginEnd(begin, end, length) {
  if (begin < 0 || begin > end || end > length) {
    throw new StringIndexOutOfBoundsException(`begin ${begin}, end ${end}, length ${length}`);
  }
}

// Java: AbstractStringBuilder#checkRangeSIOOBE(int,int,int)
function checkRangeSIOOBE(start, end, len) {
  if (start < 0 || start > end || end > len) {
    throw new StringIndexOutOfBoundsException(`start ${start}, end ${end}, length ${len}`);
  }
}

// Java: String#isLatin1() (compact strings: every char <= 0xFF)
function isLatin1(s) {
  for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) > 0xff) return false;
  return true;
}

// explicit NPE with the JDK 17 helpful message
function npe(message) {
  return new NullPointerException(message);
}

// ---- trim / strip ----

// Java: String#trim()
export function javaTrim(s) {
  let st = 0;
  let len = s.length;
  while (st < len && s.charCodeAt(st) <= 0x20) st++;
  while (st < len && s.charCodeAt(len - 1) <= 0x20) len--;
  return st > 0 || len < s.length ? s.substring(st, len) : s;
}

// Java: String#stripLeading()
export function stripLeading(s) {
  let i = 0;
  while (i < s.length && isWhitespace(s.charCodeAt(i))) i++;
  return s.substring(i);
}

// Java: String#stripTrailing()
export function stripTrailing(s) {
  let j = s.length;
  while (j > 0 && isWhitespace(s.charCodeAt(j - 1))) j--;
  return s.substring(0, j);
}

// Java: String#strip()
export function javaStrip(s) {
  return stripTrailing(stripLeading(s));
}

// Java: String#isBlank()
export function javaIsBlank(s) {
  for (let i = 0; i < s.length; i++) if (!isWhitespace(s.charCodeAt(i))) return false;
  return true;
}

// Java: String#isEmpty()
export function isEmpty(s) {
  if (s === null || s === undefined) throw npe('Cannot invoke "String.isEmpty()" because "s" is null');
  return s.length === 0;
}

// ---- replace ----

// Java: String#replace(CharSequence,CharSequence)
export function javaReplace(s, target, replacement) {
  if (target === null || target === undefined) throw npe('Cannot invoke "java.lang.CharSequence.toString()" because "target" is null');
  if (replacement === null || replacement === undefined) throw npe('Cannot invoke "java.lang.CharSequence.toString()" because "replacement" is null');
  const trgtStr = String(target);
  const replStr = String(replacement);
  const trgtLen = trgtStr.length;
  if (trgtLen > 0) {
    let result = '';
    let from = 0;
    for (;;) {
      const i = s.indexOf(trgtStr, from);
      if (i < 0) break;
      result += s.substring(from, i) + replStr;
      from = i + trgtLen;
    }
    return from === 0 ? s : result + s.substring(from);
  }
  let r = replStr;
  for (let i = 0; i < s.length; i++) r += s.charAt(i) + replStr;
  return r;
}

// Java: String#replace(char,char)
export function replaceChar(s, oldChar, newChar) {
  if (oldChar === newChar) return s;
  const o = String.fromCharCode(oldChar);
  if (s.indexOf(o) < 0) return s;
  return s.split(o).join(String.fromCharCode(newChar));
}

// ---- compare ----

// Java: String#compareTo(String)
export function javaCompare(a, b) {
  if (b === null || b === undefined) throw npe('Cannot read field "value" because "anotherString" is null');
  const lim = Math.min(a.length, b.length);
  for (let k = 0; k < lim; k++) {
    const c1 = a.charCodeAt(k);
    const c2 = b.charCodeAt(k);
    if (c1 !== c2) return c1 - c2;
  }
  return a.length - b.length;
}

// Java: String.CaseInsensitiveComparator#compare(String,String)
function compareCI(s1, s2) {
  if (s1 === null || s1 === undefined) throw npe('Cannot read field "value" because "s1" is null');
  if (s2 === null || s2 === undefined) throw npe('Cannot read field "value" because "s2" is null');
  const len1 = s1.length;
  const len2 = s2.length;
  const lim = Math.min(len1, len2);
  if (isLatin1(s1) || isLatin1(s2)) {
    // StringLatin1#compareToCI / compareToCI_UTF16: per char
    for (let k = 0; k < lim; k++) {
      let c1 = s1.charCodeAt(k);
      let c2 = s2.charCodeAt(k);
      if (c1 !== c2) {
        c1 = charToUpperCase(c1);
        c2 = charToUpperCase(c2);
        if (c1 !== c2) {
          c1 = charToLowerCase(c1);
          c2 = charToLowerCase(c2);
          if (c1 !== c2) return c1 - c2;
        }
      }
    }
    return len1 - len2;
  }
  // StringUTF16#compareToCI: per code point where the chars differ
  for (let k = 0; k < lim; k++) {
    if (s1.charCodeAt(k) === s2.charCodeAt(k)) continue;
    let cp1 = codePointIncluding(s1, k, len1);
    let cp2 = codePointIncluding(s2, k, len2);
    const pairStart = (isHighSurrogate(s1.charCodeAt(k)) && cp1 > 0xffff) || (isHighSurrogate(s2.charCodeAt(k)) && cp2 > 0xffff);
    if (cp1 !== cp2) {
      cp1 = charToUpperCase(cp1);
      cp2 = charToUpperCase(cp2);
      if (cp1 !== cp2) {
        cp1 = charToLowerCase(cp1);
        cp2 = charToLowerCase(cp2);
        if (cp1 !== cp2) return cp1 - cp2;
      }
    }
    if (pairStart) k++;
  }
  return len1 - len2;
}

// Java: StringUTF16#codePointIncluding(byte[],int,int)
function codePointIncluding(s, i, end, start = 0) {
  const c = s.charCodeAt(i);
  if (isHighSurrogate(c)) {
    if (i + 1 < end) {
      const d = s.charCodeAt(i + 1);
      if (isLowSurrogate(d)) return toCodePoint(c, d);
    }
  } else if (isLowSurrogate(c) && i > start) {
    const h = s.charCodeAt(i - 1);
    if (isHighSurrogate(h)) return toCodePoint(h, c);
  }
  return c;
}

// Java: String#CASE_INSENSITIVE_ORDER
export const CASE_INSENSITIVE_ORDER = compareCI;

// Java: String#compareToIgnoreCase(String)
export function compareToIgnoreCase(a, b) {
  return CASE_INSENSITIVE_ORDER(a, b);
}

// Java: String#equalsIgnoreCase(String)
export function equalsIgnoreCase(a, b) {
  return a === b ? true : b !== null && b !== undefined && b.length === a.length && regionMatchesCI(a, 0, b, 0, a.length);
}

// Java: StringLatin1#regionMatchesCI / StringUTF16#regionMatchesCI
function regionMatchesCI(value, toffset, other, ooffset, len) {
  const last = toffset + len;
  if (isLatin1(value) || isLatin1(other)) {
    while (toffset < last) {
      const c1 = value.charCodeAt(toffset++);
      const c2 = other.charCodeAt(ooffset++);
      if (c1 === c2) continue;
      const u1 = charToUpperCase(c1);
      const u2 = charToUpperCase(c2);
      if (u1 === u2) continue;
      if (charToLowerCase(u1) === charToLowerCase(u2)) continue;
      return false;
    }
    return true;
  }
  const ostart = ooffset;
  const vstart = toffset;
  const olast = ooffset + len;
  while (toffset < last) {
    if (value.charCodeAt(toffset) === other.charCodeAt(ooffset)) {
      toffset++;
      ooffset++;
      continue;
    }
    let cp1 = codePointIncluding(value, toffset, last, vstart);
    let cp2 = codePointIncluding(other, ooffset, olast, ostart);
    const pairStart = (isHighSurrogate(value.charCodeAt(toffset)) && cp1 > 0xffff) || (isHighSurrogate(other.charCodeAt(ooffset)) && cp2 > 0xffff);
    if (cp1 !== cp2) {
      cp1 = charToUpperCase(cp1);
      cp2 = charToUpperCase(cp2);
      if (cp1 !== cp2) {
        cp1 = charToLowerCase(cp1);
        cp2 = charToLowerCase(cp2);
        if (cp1 !== cp2) return false;
      }
    }
    if (pairStart) {
      toffset++;
      ooffset++;
    }
    toffset++;
    ooffset++;
  }
  return true;
}

// Java: String#regionMatches(int,String,int,int) / regionMatches(boolean,int,String,int,int)
export function regionMatches(s, ...args) {
  let ignoreCase = false;
  if (typeof args[0] === 'boolean') ignoreCase = args.shift();
  const [toffset, other, ooffset, len] = args;
  if (!ignoreCase) {
    if (other === null || other === undefined) throw npe('Cannot read field "value" because "other" is null');
    if (ooffset < 0 || toffset < 0 || toffset > s.length - len || ooffset > other.length - len) return false;
    for (let i = 0; i < len; i++) if (s.charCodeAt(toffset + i) !== other.charCodeAt(ooffset + i)) return false;
    return true;
  }
  if (ooffset < 0 || toffset < 0 || toffset > s.length - len) return false;
  if (other === null || other === undefined) throw npe('Cannot invoke "String.length()" because "other" is null');
  if (ooffset > other.length - len) return false;
  return regionMatchesCI(s, toffset, other, ooffset, len);
}

// Java: String#contentEquals(CharSequence)
export function contentEquals(s, cs) {
  if (cs === null || cs === undefined) throw npe('Cannot invoke "java.lang.CharSequence.length()" because "cs" is null');
  return s === String(cs);
}

// ---- indexed access ----

// Java: String#charAt(int)
export function charAt(s, index) {
  if (index < 0 || index >= s.length) {
    if (isLatin1(s)) throw new StringIndexOutOfBoundsException(`String index out of range: ${index}`);
    checkIndex(index, s.length);
  }
  return s.charCodeAt(index);
}

// Java: String#substring(int,int) / substring(int)
export function substring(s, beginIndex, endIndex = s.length) {
  checkBoundsBeginEnd(beginIndex, endIndex, s.length);
  return s.substring(beginIndex, endIndex);
}

// Java: String#subSequence(int,int)
export function subSequence(s, beginIndex, endIndex) {
  return substring(s, beginIndex, endIndex);
}

// Java: String#codePointAt(int)
export function codePointAt(s, index) {
  checkIndex(index, s.length);
  return s.codePointAt(index);
}

// Java: String#codePointBefore(int)
export function codePointBefore(s, index) {
  const i = index - 1;
  if (i < 0 || i >= s.length) throw new StringIndexOutOfBoundsException(`String index out of range: ${index}`);
  const c = s.charCodeAt(i);
  if (isLowSurrogate(c) && i > 0) {
    const h = s.charCodeAt(i - 1);
    if (isHighSurrogate(h)) return toCodePoint(h, c);
  }
  return c;
}

// Java: String#codePointCount(int,int)
export function codePointCount(s, beginIndex, endIndex) {
  if (beginIndex < 0 || beginIndex > endIndex || endIndex > s.length) throw new IndexOutOfBoundsException();
  let n = endIndex - beginIndex;
  for (let i = beginIndex; i < endIndex - 1;) {
    if (isHighSurrogate(s.charCodeAt(i++)) && isLowSurrogate(s.charCodeAt(i))) {
      n--;
      i++;
    }
  }
  return n;
}

// Java: String#offsetByCodePoints(int,int)
export function offsetByCodePoints(s, index, codePointOffset) {
  if (index < 0 || index > s.length) throw new IndexOutOfBoundsException();
  const length = s.length;
  let x = index;
  if (codePointOffset >= 0) {
    let i;
    for (i = 0; x < length && i < codePointOffset; i++) {
      if (isHighSurrogate(s.charCodeAt(x++)) && x < length && isLowSurrogate(s.charCodeAt(x))) x++;
    }
    if (i < codePointOffset) throw new IndexOutOfBoundsException();
  } else {
    let i;
    for (i = codePointOffset; x > 0 && i < 0; i++) {
      if (isLowSurrogate(s.charCodeAt(--x)) && x > 0 && isHighSurrogate(s.charCodeAt(x - 1))) x--;
    }
    if (i < 0) throw new IndexOutOfBoundsException();
  }
  return x;
}

// Java: String#codePoints()
export function codePoints(s) {
  const out = [];
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (isHighSurrogate(c) && i + 1 < s.length && isLowSurrogate(s.charCodeAt(i + 1))) {
      out.push(toCodePoint(c, s.charCodeAt(i + 1)));
      i++;
    } else out.push(c);
  }
  return out;
}

// Java: String#chars()
export function chars(s) {
  const out = [];
  for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i));
  return out;
}

// ---- search ----

// Java: String#indexOf(String,int) / indexOf(String)
export function indexOf(s, str, fromIndex) {
  if (str === null || str === undefined) {
    throw npe(fromIndex === undefined ? 'Cannot invoke "String.coder()" because "str" is null' : 'Cannot read field "value" because "tgtStr" is null');
  }
  if (fromIndex === undefined) fromIndex = 0;
  const srcCount = s.length;
  const tgtCount = str.length;
  if (fromIndex >= srcCount) return tgtCount === 0 ? srcCount : -1;
  if (fromIndex < 0) fromIndex = 0;
  if (tgtCount === 0) return fromIndex;
  if (tgtCount > srcCount) return -1;
  return s.indexOf(str, fromIndex);
}

// Java: String#lastIndexOf(String,int) / lastIndexOf(String)
export function lastIndexOf(s, str, fromIndex = s.length) {
  if (str === null || str === undefined) throw npe('Cannot read field "value" because "tgtStr" is null');
  const rightIndex = s.length - str.length;
  if (fromIndex > rightIndex) fromIndex = rightIndex;
  if (fromIndex < 0) return -1;
  if (str.length === 0) return fromIndex;
  return s.lastIndexOf(str, fromIndex);
}

// Java: String#indexOf(int)
export function indexOfChar(s, ch) {
  if (isBmpCodePoint(ch)) return s.indexOf(String.fromCharCode(ch));
  if (isValidCodePoint(ch)) return s.indexOf(toChars(ch));
  return -1;
}

// Java: String#contains(CharSequence)
export function contains(s, cs) {
  if (cs === null || cs === undefined) throw npe('Cannot invoke "java.lang.CharSequence.toString()" because "s" is null');
  return indexOf(s, String(cs)) >= 0;
}

// Java: String#startsWith(String,int) / startsWith(String)
export function startsWith(s, prefix, toffset = 0) {
  if (prefix === null || prefix === undefined) throw npe('Cannot invoke "String.length()" because "prefix" is null');
  if (toffset < 0 || toffset > s.length - prefix.length) return false;
  return s.startsWith(prefix, toffset);
}

// Java: String#endsWith(String)
export function endsWith(s, suffix) {
  if (suffix === null || suffix === undefined) throw npe('Cannot invoke "String.length()" because "suffix" is null');
  return startsWith(s, suffix, s.length - suffix.length);
}

// Java: String#concat(String)
export function concat(s, str) {
  if (str === null || str === undefined) throw npe('Cannot invoke "String.isEmpty()" because "str" is null');
  return str.length === 0 ? s : s + str;
}

// Java: String#repeat(int)
export function repeat(s, count) {
  if (count < 0) throw new IllegalArgumentException(`count is negative: ${count}`);
  if (count === 1) return s;
  if (s.length === 0 || count === 0) return '';
  if (Math.trunc(2147483647 / s.length) < count) throw new OutOfMemoryError('Required length exceeds implementation limit');
  return s.repeat(count);
}

// Java: String#join(CharSequence,Iterable)
export function join(delimiter, elements) {
  if (delimiter === null || delimiter === undefined || elements === null || elements === undefined) throw new NullPointerException();
  let out = '';
  let first = true;
  for (const e of elements) {
    if (!first) out += String(delimiter);
    first = false;
    out += valueOf(e);
  }
  return out;
}

// Java: String#lines()
export function lines(s) {
  const out = [];
  let start = 0;
  let i = 0;
  while (i < s.length) {
    const c = s.charCodeAt(i);
    if (c === 0x0a || c === 0x0d) {
      out.push(s.substring(start, i));
      if (c === 0x0d && i + 1 < s.length && s.charCodeAt(i + 1) === 0x0a) i++;
      start = i + 1;
    }
    i++;
  }
  if (start < s.length) out.push(s.substring(start));
  return out;
}

// ---- StringBuilder ----

// Java: java.lang.StringBuilder
export class StringBuilder {
  // Java: StringBuilder#StringBuilder() / (int) / (String) / (CharSequence)
  constructor(arg) {
    if (arg === undefined) this._s = '';
    else if (typeof arg === 'number') {
      if (arg < 0) throw new NegativeArraySizeException(String(arg));
      this._s = '';
    } else if (arg === null) throw npe('Cannot invoke "String.length()" because "str" is null');
    else this._s = String(arg);
  }

  // Java: StringBuilder#append(String|Object|boolean|int); long via appendLong, char/double/float via typed variants (P15)
  append(x) {
    if (typeof x === 'number' && !Number.isSafeInteger(x)) throw new TypeError('append(number) takes a Java int; use appendDouble/appendFloat/appendLong (P15)');
    if (typeof x === 'bigint') throw new TypeError('append(bigint): use appendLong (P15)');
    this._s += typeof x === 'string' ? x : valueOf(x);
    return this;
  }

  // Java: StringBuilder#append(long)
  appendLong(v) {
    if (typeof v !== 'bigint') throw new TypeError('appendLong takes a BigInt');
    this._s += BigInt.asIntN(64, v).toString();
    return this;
  }

  // Java: StringBuilder#append(char)
  appendChar(c) {
    this._s += String.fromCharCode(c);
    return this;
  }

  // Java: StringBuilder#append(double)
  appendDouble(d) {
    this._s += doubleToString(d);
    return this;
  }

  // Java: StringBuilder#append(float)
  appendFloat(f) {
    this._s += floatToString(f);
    return this;
  }

  // Java: StringBuilder#appendCodePoint(int)
  appendCodePoint(cp) {
    this._s += toChars(cp);
    return this;
  }

  // Java: StringBuilder#insert(int,String)
  insert(offset, str) {
    if (str !== null && str !== undefined && typeof str !== 'string') throw new TypeError('insert(int,String) takes a string or null (P15)');
    checkOffset(offset, this._s.length);
    if (str === null || str === undefined) str = 'null';
    this._s = this._s.substring(0, offset) + str + this._s.substring(offset);
    return this;
  }

  // Java: StringBuilder#delete(int,int)
  delete(start, end) {
    const count = this._s.length;
    if (end > count) end = count;
    checkRangeSIOOBE(start, end, count);
    if (end > start) this._s = this._s.substring(0, start) + this._s.substring(end);
    return this;
  }

  // Java: StringBuilder#deleteCharAt(int)
  deleteCharAt(index) {
    checkIndex(index, this._s.length);
    this._s = this._s.substring(0, index) + this._s.substring(index + 1);
    return this;
  }

  // Java: StringBuilder#replace(int,int,String)
  replace(start, end, str) {
    if (typeof str !== 'string' && str !== null && str !== undefined) throw new TypeError('replace(int,int,String) takes a string or null (P15)');
    const count = this._s.length;
    if (end > count) end = count;
    checkRangeSIOOBE(start, end, count);
    if (str === null || str === undefined) throw npe('Cannot invoke "String.length()" because "str" is null');
    this._s = this._s.substring(0, start) + str + this._s.substring(end);
    return this;
  }

  // Java: StringBuilder#reverse()
  reverse() {
    const v = chars(this._s);
    const n = v.length - 1;
    let hasSurrogates = false;
    for (let j = (n - 1) >> 1; j >= 0; j--) {
      const k = n - j;
      const cj = v[j];
      const ck = v[k];
      v[j] = ck;
      v[k] = cj;
      if (isSurrogate(cj) || isSurrogate(ck)) hasSurrogates = true;
    }
    if (hasSurrogates) {
      const count = v.length;
      for (let i = 0; i < count - 1; i++) {
        const c2 = v[i];
        if (isLowSurrogate(c2)) {
          const c1 = v[i + 1];
          if (isHighSurrogate(c1)) {
            v[i++] = c1;
            v[i] = c2;
          }
        }
      }
    }
    this._s = v.map((c) => String.fromCharCode(c)).join('');
    return this;
  }

  // Java: StringBuilder#setLength(int)
  setLength(newLength) {
    if (newLength < 0) throw new StringIndexOutOfBoundsException(`String index out of range: ${newLength}`);
    const count = this._s.length;
    this._s = newLength <= count ? this._s.substring(0, newLength) : this._s + '\u0000'.repeat(newLength - count);
  }

  // Java: StringBuilder#setCharAt(int,char)
  setCharAt(index, ch) {
    checkIndex(index, this._s.length);
    this._s = this._s.substring(0, index) + String.fromCharCode(ch) + this._s.substring(index + 1);
  }

  // Java: StringBuilder#charAt(int)
  charAt(index) {
    checkIndex(index, this._s.length);
    return this._s.charCodeAt(index);
  }

  // Java: StringBuilder#substring(int,int) / substring(int)
  substring(start, end = this._s.length) {
    checkRangeSIOOBE(start, end, this._s.length);
    return this._s.substring(start, end);
  }

  // Java: StringBuilder#subSequence(int,int)
  subSequence(start, end) {
    return this.substring(start, end);
  }

  // Java: StringBuilder#indexOf(String,int)
  indexOf(str, fromIndex = 0) {
    return indexOf(this._s, str, fromIndex);
  }

  // Java: StringBuilder#lastIndexOf(String,int)
  lastIndexOf(str, fromIndex = this._s.length) {
    return lastIndexOf(this._s, str, fromIndex);
  }

  // Java: StringBuilder#length()
  length() {
    return this._s.length;
  }

  // Java: StringBuilder#isEmpty()
  isEmpty() {
    return this._s.length === 0;
  }

  // Java: StringBuilder#codePointAt(int)
  codePointAt(index) {
    return codePointAt(this._s, index);
  }

  // Java: StringBuilder#toString()
  toString() {
    return this._s;
  }
}
