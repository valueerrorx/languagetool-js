// java.lang.ConditionalSpecialCasing (JDK 17): locale- and context-dependent case mappings for String#toLowerCase/toUpperCase.
import { getType, toLowerCase as charToLowerCase, toUpperCaseFull, toChars, LOWERCASE_LETTER, UPPERCASE_LETTER, TITLECASE_LETTER } from './Character.js';
import { getCombiningClass } from './Normalizer.js';
import { wordBoundaries } from './wordBreak.js';

const FINAL_CASED = 1;
const AFTER_SOFT_DOTTED = 2;
const MORE_ABOVE = 3;
const AFTER_I = 4;
const NOT_BEFORE_DOT = 5;
const COMBINING_CLASS_ABOVE = 230;

// [codePoint, lower chars, upper chars, language or null, condition] (JDK declaration order)
const ENTRIES = [
  [0x03a3, [0x03c2], [0x03a3], null, FINAL_CASED],
  [0x0130, [0x0069, 0x0307], [0x0130], null, 0],
  [0x0307, [0x0307], [], 'lt', AFTER_SOFT_DOTTED],
  [0x0049, [0x0069, 0x0307], [0x0049], 'lt', MORE_ABOVE],
  [0x004a, [0x006a, 0x0307], [0x004a], 'lt', MORE_ABOVE],
  [0x012e, [0x012f, 0x0307], [0x012e], 'lt', MORE_ABOVE],
  [0x00cc, [0x0069, 0x0307, 0x0300], [0x00cc], 'lt', 0],
  [0x00cd, [0x0069, 0x0307, 0x0301], [0x00cd], 'lt', 0],
  [0x0128, [0x0069, 0x0307, 0x0303], [0x0128], 'lt', 0],
  [0x0130, [0x0069], [0x0130], 'tr', 0],
  [0x0130, [0x0069], [0x0130], 'az', 0],
  [0x0307, [], [0x0307], 'tr', AFTER_I],
  [0x0307, [], [0x0307], 'az', AFTER_I],
  [0x0049, [0x0131], [0x0049], 'tr', NOT_BEFORE_DOT],
  [0x0049, [0x0131], [0x0049], 'az', NOT_BEFORE_DOT],
  [0x0069, [0x0069], [0x0130], 'tr', 0],
  [0x0069, [0x0069], [0x0130], 'az', 0],
];

// cp -> entries, language-specific ones first (the JDK iterates a HashSet; at most one specific and one generic entry per cp)
const TABLE = new Map();
for (const e of ENTRIES) {
  const l = TABLE.get(e[0]) ?? [];
  l.push(e);
  TABLE.set(e[0], l);
}
for (const l of TABLE.values()) l.sort((a, b) => (a[3] === null ? 1 : 0) - (b[3] === null ? 1 : 0));

// Java: String#codePointBefore(int)
function codePointBefore(s, i) {
  const c = s.charCodeAt(i - 1);
  if (c >= 0xdc00 && c <= 0xdfff && i - 2 >= 0) {
    const h = s.charCodeAt(i - 2);
    if (h >= 0xd800 && h <= 0xdbff) return ((h - 0xd800) << 10) + (c - 0xdc00) + 0x10000;
  }
  return c;
}

const charCount = (cp) => (cp >= 0x10000 ? 2 : 1);

// Java: ConditionalSpecialCasing#isCased(int)
function isCased(ch) {
  const type = getType(ch);
  if (type === LOWERCASE_LETTER || type === UPPERCASE_LETTER || type === TITLECASE_LETTER) return true;
  if (ch >= 0x02b0 && ch <= 0x02b8) return true;
  if (ch >= 0x02c0 && ch <= 0x02c1) return true;
  if (ch >= 0x02e0 && ch <= 0x02e4) return true;
  if (ch === 0x0345) return true;
  if (ch === 0x037a) return true;
  if (ch >= 0x1d2c && ch <= 0x1d61) return true;
  if (ch >= 0x2160 && ch <= 0x217f) return true;
  if (ch >= 0x24b6 && ch <= 0x24e9) return true;
  return false;
}

// Java: ConditionalSpecialCasing#isSoftDotted(int)
function isSoftDotted(ch) {
  switch (ch) {
    case 0x0069: case 0x006a: case 0x012f: case 0x0268: case 0x0456: case 0x0458: case 0x1d62: case 0x1e2d: case 0x1ecb: case 0x2071:
      return true;
    default:
      return false;
  }
}

// Java: ConditionalSpecialCasing#isFinalCased(String,int,Locale)
function isFinalCased(src, index) {
  const wordBoundary = wordBoundaries(src);
  let ch;
  for (let i = index; i >= 0 && !wordBoundary.has(i); i -= charCount(ch)) {
    ch = codePointBefore(src, i);
    if (isCased(ch)) {
      const len = src.length;
      for (i = index + charCount(src.codePointAt(index)); i < len && !wordBoundary.has(i); i += charCount(ch)) {
        ch = src.codePointAt(i);
        if (isCased(ch)) return false;
      }
      return true;
    }
  }
  return false;
}

// Java: ConditionalSpecialCasing#isAfterSoftDotted(String,int)
function isAfterSoftDotted(src, index) {
  let ch;
  for (let i = index; i > 0; i -= charCount(ch)) {
    ch = codePointBefore(src, i);
    if (isSoftDotted(ch)) return true;
    const cc = getCombiningClass(ch);
    if (cc === 0 || cc === COMBINING_CLASS_ABOVE) return false;
  }
  return false;
}

// Java: ConditionalSpecialCasing#isMoreAbove(String,int)
function isMoreAbove(src, index) {
  let ch;
  const len = src.length;
  for (let i = index + charCount(src.codePointAt(index)); i < len; i += charCount(ch)) {
    ch = src.codePointAt(i);
    const cc = getCombiningClass(ch);
    if (cc === COMBINING_CLASS_ABOVE) return true;
    if (cc === 0) return false;
  }
  return false;
}

// Java: ConditionalSpecialCasing#isAfterI(String,int)
function isAfterI(src, index) {
  let ch;
  for (let i = index; i > 0; i -= charCount(ch)) {
    ch = codePointBefore(src, i);
    if (ch === 0x49) return true;
    const cc = getCombiningClass(ch);
    if (cc === 0 || cc === COMBINING_CLASS_ABOVE) return false;
  }
  return false;
}

// Java: ConditionalSpecialCasing#isBeforeDot(String,int)
function isBeforeDot(src, index) {
  let ch;
  for (let i = index + charCount(src.codePointAt(index)); i < src.length; i += charCount(ch)) {
    ch = src.codePointAt(i);
    if (ch === 0x0307) return true;
    const cc = getCombiningClass(ch);
    if (cc === 0 || cc === COMBINING_CLASS_ABOVE) return false;
  }
  return false;
}

// Java: ConditionalSpecialCasing#isConditionMet(String,int,Locale,int)
function isConditionMet(src, index, condition) {
  switch (condition) {
    case FINAL_CASED: return isFinalCased(src, index);
    case AFTER_SOFT_DOTTED: return isAfterSoftDotted(src, index);
    case MORE_ABOVE: return isMoreAbove(src, index);
    case AFTER_I: return isAfterI(src, index);
    case NOT_BEFORE_DOT: return !isBeforeDot(src, index);
    default: return true;
  }
}

// Java: ConditionalSpecialCasing#lookUpTable(String,int,Locale,boolean); result as string or null
function lookUpTable(src, index, lang, bLowerCasing) {
  const set = TABLE.get(src.codePointAt(index));
  if (set !== undefined) {
    for (const entry of set) {
      if ((entry[3] === null || entry[3] === lang) && isConditionMet(src, index, entry[4])) {
        return String.fromCodePoint(...(bLowerCasing ? entry[1] : entry[2]));
      }
    }
  }
  return null;
}

// Java: ConditionalSpecialCasing#toLowerCaseEx + toLowerCaseCharArray, merged: lower case of the code point at index as a string
export function toLowerCaseAt(src, index, lang) {
  const r = lookUpTable(src, index, lang, true);
  return r !== null ? r : toChars(charToLowerCase(src.codePointAt(index)));
}

// Java: ConditionalSpecialCasing#toUpperCaseEx + toUpperCaseCharArray, merged: upper case of the code point at index as a string
export function toUpperCaseAt(src, index, lang) {
  const r = lookUpTable(src, index, lang, false);
  return r !== null ? r : toUpperCaseFull(src.codePointAt(index));
}
