// java.lang.Character (JDK 17, Unicode 13) backed by the generated tables in ./unicode (SEMANTICS P1).
import { IllegalArgumentException } from './errors.js';
import { JavaEnum } from './JavaEnum.js';
import { loadJson, RunTable } from './unicode/tables.js';

export const MIN_RADIX = 2;
export const MAX_RADIX = 36;
export const MIN_CODE_POINT = 0;
export const MAX_CODE_POINT = 0x10ffff;
export const MIN_SUPPLEMENTARY_CODE_POINT = 0x10000;
export const MIN_HIGH_SURROGATE = 0xd800;
export const MAX_HIGH_SURROGATE = 0xdbff;
export const MIN_LOW_SURROGATE = 0xdc00;
export const MAX_LOW_SURROGATE = 0xdfff;

// Character.getType constants
export const UNASSIGNED = 0;
export const UPPERCASE_LETTER = 1;
export const LOWERCASE_LETTER = 2;
export const TITLECASE_LETTER = 3;
export const MODIFIER_LETTER = 4;
export const OTHER_LETTER = 5;
export const NON_SPACING_MARK = 6;
export const ENCLOSING_MARK = 7;
export const COMBINING_SPACING_MARK = 8;
export const DECIMAL_DIGIT_NUMBER = 9;
export const LETTER_NUMBER = 10;
export const OTHER_NUMBER = 11;
export const SPACE_SEPARATOR = 12;
export const LINE_SEPARATOR = 13;
export const PARAGRAPH_SEPARATOR = 14;
export const CONTROL = 15;
export const FORMAT = 16;
export const PRIVATE_USE = 18;
export const SURROGATE = 19;
export const DASH_PUNCTUATION = 20;
export const START_PUNCTUATION = 21;
export const END_PUNCTUATION = 22;
export const CONNECTOR_PUNCTUATION = 23;
export const OTHER_PUNCTUATION = 24;
export const MATH_SYMBOL = 25;
export const CURRENCY_SYMBOL = 26;
export const MODIFIER_SYMBOL = 27;
export const OTHER_SYMBOL = 28;
export const INITIAL_QUOTE_PUNCTUATION = 29;
export const FINAL_QUOTE_PUNCTUATION = 30;

// Character.getDirectionality constants
export const DIRECTIONALITY_UNDEFINED = -1;
export const DIRECTIONALITY_LEFT_TO_RIGHT = 0;
export const DIRECTIONALITY_RIGHT_TO_LEFT = 1;
export const DIRECTIONALITY_RIGHT_TO_LEFT_ARABIC = 2;
export const DIRECTIONALITY_EUROPEAN_NUMBER = 3;
export const DIRECTIONALITY_EUROPEAN_NUMBER_SEPARATOR = 4;
export const DIRECTIONALITY_EUROPEAN_NUMBER_TERMINATOR = 5;
export const DIRECTIONALITY_ARABIC_NUMBER = 6;
export const DIRECTIONALITY_COMMON_NUMBER_SEPARATOR = 7;
export const DIRECTIONALITY_NONSPACING_MARK = 8;
export const DIRECTIONALITY_BOUNDARY_NEUTRAL = 9;
export const DIRECTIONALITY_PARAGRAPH_SEPARATOR = 10;
export const DIRECTIONALITY_SEGMENT_SEPARATOR = 11;
export const DIRECTIONALITY_WHITESPACE = 12;
export const DIRECTIONALITY_OTHER_NEUTRALS = 13;
export const DIRECTIONALITY_LEFT_TO_RIGHT_EMBEDDING = 14;
export const DIRECTIONALITY_LEFT_TO_RIGHT_OVERRIDE = 15;
export const DIRECTIONALITY_RIGHT_TO_LEFT_EMBEDDING = 16;
export const DIRECTIONALITY_RIGHT_TO_LEFT_OVERRIDE = 17;
export const DIRECTIONALITY_POP_DIRECTIONAL_FORMAT = 18;
export const DIRECTIONALITY_LEFT_TO_RIGHT_ISOLATE = 19;
export const DIRECTIONALITY_RIGHT_TO_LEFT_ISOLATE = 20;
export const DIRECTIONALITY_FIRST_STRONG_ISOLATE = 21;
export const DIRECTIONALITY_POP_DIRECTIONAL_ISOLATE = 22;

let props = null;

// loaded property tables (lazy)
function P() {
  if (props === null) {
    const j = loadJson('props');
    props = {
      type: new RunTable(j.type),
      flags: new RunTable(j.flags),
      numeric: new RunTable(j.numeric),
      digit36: new RunTable(j.digit36),
      dir: new RunTable(j.dir),
      script: new RunTable(j.script.runs),
      scriptNames: j.script.names,
      block: new RunTable(j.block.runs),
      blockNames: j.block.names,
      bit: Object.fromEntries(j.flagNames.map((n, i) => [n, 1 << i])),
    };
  }
  return props;
}

// flag test by dump name
const flag = (cp, name) => {
  const p = P();
  return (p.flags.get(cp, 0) & p.bit[name]) !== 0;
};

// ---- surrogates and code points ----

// Java: Character#isHighSurrogate(char)
export const isHighSurrogate = (c) => c >= 0xd800 && c <= 0xdbff;
// Java: Character#isLowSurrogate(char)
export const isLowSurrogate = (c) => c >= 0xdc00 && c <= 0xdfff;
// Java: Character#isSurrogate(char)
export const isSurrogate = (c) => c >= 0xd800 && c <= 0xdfff;
// Java: Character#isSurrogatePair(char,char)
export const isSurrogatePair = (high, low) => isHighSurrogate(high) && isLowSurrogate(low);
// Java: Character#isBmpCodePoint(int)
export const isBmpCodePoint = (cp) => cp >>> 16 === 0;
// Java: Character#isValidCodePoint(int)
export const isValidCodePoint = (cp) => cp >= 0 && cp <= 0x10ffff;
// Java: Character#isSupplementaryCodePoint(int)
export const isSupplementaryCodePoint = (cp) => cp >= 0x10000 && cp <= 0x10ffff;
// Java: Character#charCount(int)
export const charCount = (cp) => (cp >= 0x10000 ? 2 : 1);
// Java: Character#toCodePoint(char,char)
export const toCodePoint = (high, low) => ((high << 10) + low + (0x10000 - (0xd800 << 10) - 0xdc00)) | 0;
// Java: Character#highSurrogate(int)
export const highSurrogate = (cp) => (cp >>> 10) + (0xd800 - (0x10000 >>> 10));
// Java: Character#lowSurrogate(int)
export const lowSurrogate = (cp) => (cp & 0x3ff) + 0xdc00;

// Java: Character#toChars(int)
export function toChars(cp) {
  if (isBmpCodePoint(cp)) return String.fromCharCode(cp);
  if (isValidCodePoint(cp)) return String.fromCharCode(highSurrogate(cp), lowSurrogate(cp));
  throw new IllegalArgumentException(`Not a valid Unicode code point: 0x${(cp >>> 0).toString(16).toUpperCase()}`);
}

// ---- type and predicates ----

// Java: Character#getType(int)
export function getType(cp) {
  return P().type.get(cp, UNASSIGNED);
}

// Java: Character#isLetter(int)
export const isLetter = (cp) => flag(cp, 'isLetter');
// Java: Character#isDigit(int)
export const isDigit = (cp) => flag(cp, 'isDigit');
// Java: Character#isLetterOrDigit(int)
export const isLetterOrDigit = (cp) => flag(cp, 'isLetterOrDigit');
// Java: Character#isWhitespace(int)
export const isWhitespace = (cp) => flag(cp, 'isWhitespace');
// Java: Character#isSpaceChar(int)
export const isSpaceChar = (cp) => flag(cp, 'isSpaceChar');
// Java: Character#isUpperCase(int)
export const isUpperCase = (cp) => flag(cp, 'isUpperCase');
// Java: Character#isLowerCase(int)
export const isLowerCase = (cp) => flag(cp, 'isLowerCase');
// Java: Character#isTitleCase(int)
export const isTitleCase = (cp) => flag(cp, 'isTitleCase');
// Java: Character#isAlphabetic(int)
export const isAlphabetic = (cp) => flag(cp, 'isAlphabetic');
// Java: Character#isIdeographic(int)
export const isIdeographic = (cp) => flag(cp, 'isIdeographic');
// Java: Character#isJavaIdentifierStart(int)
export const isJavaIdentifierStart = (cp) => flag(cp, 'isJavaIdentifierStart');
// Java: Character#isJavaIdentifierPart(int)
export const isJavaIdentifierPart = (cp) => flag(cp, 'isJavaIdentifierPart');
// Java: Character#isJavaLetter(char) (deprecated alias)
export const isJavaLetter = isJavaIdentifierStart;
// Java: Character#isJavaLetterOrDigit(char) (deprecated alias)
export const isJavaLetterOrDigit = isJavaIdentifierPart;
// Java: Character#isMirrored(int)
export const isMirrored = (cp) => flag(cp, 'isMirrored');
// Java: Character#isDefined(int)
export const isDefined = (cp) => flag(cp, 'isDefined');
// Java: Character#isISOControl(int)
export const isISOControl = (cp) => flag(cp, 'isISOControl');
// Java: Character#isIdentifierIgnorable(int)
export const isIdentifierIgnorable = (cp) => flag(cp, 'isIdentifierIgnorable');
// Java: Character#isUnicodeIdentifierStart(int)
export const isUnicodeIdentifierStart = (cp) => flag(cp, 'isUnicodeIdentifierStart');
// Java: Character#isUnicodeIdentifierPart(int)
export const isUnicodeIdentifierPart = (cp) => flag(cp, 'isUnicodeIdentifierPart');

// Java: Character#isSpace(char) (deprecated)
export function isSpace(ch) {
  return ch <= 0x20 && (ch === 0x09 || ch === 0x0a || ch === 0x0c || ch === 0x0d || ch === 0x20);
}

// Java: Character#getDirectionality(int)
export function getDirectionality(cp) {
  return P().dir.get(cp, DIRECTIONALITY_UNDEFINED);
}

// ---- digits ----

// Java: Character#digit(int,int)
export function digit(cp, radix) {
  if (radix < MIN_RADIX || radix > MAX_RADIX) return -1;
  const v = P().digit36.get(cp, -1);
  return v < radix ? v : -1;
}

// Java: Character#getNumericValue(int)
export function getNumericValue(cp) {
  return P().numeric.get(cp, -1);
}

// Java: Character#forDigit(int,int)
export function forDigit(d, radix) {
  if (d >= radix || d < 0) return 0;
  if (radix < MIN_RADIX || radix > MAX_RADIX) return 0;
  if (d < 10) return 0x30 + d;
  return 0x61 - 10 + d;
}

// ---- case ----

let caseMaps = null;

// simple case maps (lazy)
function C() {
  if (caseMaps === null) {
    const j = loadJson('case');
    const mk = (flat) => {
      const m = new Map();
      for (let i = 0; i < flat.length; i += 2) m.set(flat[i], flat[i + 1]);
      return m;
    };
    caseMaps = { upper: mk(j.upper), lower: mk(j.lower), title: mk(j.title), fullUpper: mk(j.fullUpper), fullLower: mk(j.fullLower) };
  }
  return caseMaps;
}

// Java: Character#toUpperCase(int) / toUpperCase(char)
export function toUpperCase(cp) {
  return C().upper.get(cp) ?? cp;
}

// Java: Character#toLowerCase(int) / toLowerCase(char)
export function toLowerCase(cp) {
  return C().lower.get(cp) ?? cp;
}

// Java: Character#toTitleCase(int) / toTitleCase(char)
export function toTitleCase(cp) {
  return C().title.get(cp) ?? cp;
}

// Java: Character#toUpperCaseEx(int) + toUpperCaseCharArray(int): full (SpecialCasing, unconditional) upper case of one code point
export function toUpperCaseFull(cp) {
  return C().fullUpper.get(cp) ?? toChars(toUpperCase(cp));
}

// Java: String#toLowerCase(Locale) per-code-point unconditional part: only U+0130 has a multi-char lower case (as ConditionalSpecialCasing entry)
export function toLowerCaseFull(cp) {
  return C().fullLower.get(cp) ?? toChars(toLowerCase(cp));
}

// ---- Character.UnicodeScript ----

// Java: java.lang.Character.UnicodeScript (ordinal order = first appearance in the dump, not the JDK declaration order)
export class UnicodeScript extends JavaEnum {
  static FQCN = 'java.lang.Character.UnicodeScript';

  // Java: Character.UnicodeScript#of(int)
  static of(cp) {
    if (!isValidCodePoint(cp)) throw new IllegalArgumentException(`Not a valid Unicode code point: 0x${(cp >>> 0).toString(16).toUpperCase()}`);
    initScripts();
    return scriptByName.get(P().scriptNames[P().script.get(cp, 0)]);
  }
}

let scriptByName = null;

// create the enum constants on first use
function initScripts() {
  if (scriptByName !== null) return;
  scriptByName = new Map();
  P().scriptNames.forEach((n, i) => {
    const s = new UnicodeScript(n, i);
    scriptByName.set(n, s);
    UnicodeScript[n] = s;
  });
}

initScripts();

// ---- Character.UnicodeBlock ----

// Java: java.lang.Character.UnicodeBlock (of/toString only; forName needs the alias table, not dumped)
export class UnicodeBlock {
  constructor(name) {
    this._name = name;
  }

  // Java: Character.Subset#toString()
  toString() {
    return this._name;
  }

  // Java: Object#equals(Object)
  equals(o) {
    return this === o;
  }

  // Java: Character.UnicodeBlock#of(int)
  static of(cp) {
    if (!isValidCodePoint(cp)) throw new IllegalArgumentException(`Not a valid Unicode code point: 0x${(cp >>> 0).toString(16).toUpperCase()}`);
    const idx = P().block.get(cp, -1);
    if (idx < 0) return null;
    if (blocks === null) blocks = new Map();
    const n = P().blockNames[idx];
    let b = blocks.get(n);
    if (b === undefined) {
      b = new UnicodeBlock(n);
      blocks.set(n, b);
    }
    return b;
  }
}

let blocks = null;

// java.lang.Character as a namespace object (static members)
export const Character = {
  MIN_RADIX, MAX_RADIX, MIN_CODE_POINT, MAX_CODE_POINT, MIN_SUPPLEMENTARY_CODE_POINT, MIN_HIGH_SURROGATE, MAX_HIGH_SURROGATE,
  MIN_LOW_SURROGATE, MAX_LOW_SURROGATE, UNASSIGNED, UPPERCASE_LETTER, LOWERCASE_LETTER, TITLECASE_LETTER, MODIFIER_LETTER,
  OTHER_LETTER, NON_SPACING_MARK, ENCLOSING_MARK, COMBINING_SPACING_MARK, DECIMAL_DIGIT_NUMBER, LETTER_NUMBER, OTHER_NUMBER,
  SPACE_SEPARATOR, LINE_SEPARATOR, PARAGRAPH_SEPARATOR, CONTROL, FORMAT, PRIVATE_USE, SURROGATE, DASH_PUNCTUATION,
  START_PUNCTUATION, END_PUNCTUATION, CONNECTOR_PUNCTUATION, OTHER_PUNCTUATION, MATH_SYMBOL, CURRENCY_SYMBOL, MODIFIER_SYMBOL,
  OTHER_SYMBOL, INITIAL_QUOTE_PUNCTUATION, FINAL_QUOTE_PUNCTUATION, DIRECTIONALITY_UNDEFINED, DIRECTIONALITY_LEFT_TO_RIGHT,
  DIRECTIONALITY_RIGHT_TO_LEFT, DIRECTIONALITY_RIGHT_TO_LEFT_ARABIC, DIRECTIONALITY_EUROPEAN_NUMBER,
  DIRECTIONALITY_EUROPEAN_NUMBER_SEPARATOR, DIRECTIONALITY_EUROPEAN_NUMBER_TERMINATOR, DIRECTIONALITY_ARABIC_NUMBER,
  DIRECTIONALITY_COMMON_NUMBER_SEPARATOR, DIRECTIONALITY_NONSPACING_MARK, DIRECTIONALITY_BOUNDARY_NEUTRAL,
  DIRECTIONALITY_PARAGRAPH_SEPARATOR, DIRECTIONALITY_SEGMENT_SEPARATOR, DIRECTIONALITY_WHITESPACE, DIRECTIONALITY_OTHER_NEUTRALS,
  DIRECTIONALITY_LEFT_TO_RIGHT_EMBEDDING, DIRECTIONALITY_LEFT_TO_RIGHT_OVERRIDE, DIRECTIONALITY_RIGHT_TO_LEFT_EMBEDDING,
  DIRECTIONALITY_RIGHT_TO_LEFT_OVERRIDE, DIRECTIONALITY_POP_DIRECTIONAL_FORMAT, DIRECTIONALITY_LEFT_TO_RIGHT_ISOLATE,
  DIRECTIONALITY_RIGHT_TO_LEFT_ISOLATE, DIRECTIONALITY_FIRST_STRONG_ISOLATE, DIRECTIONALITY_POP_DIRECTIONAL_ISOLATE,
  isHighSurrogate, isLowSurrogate, isSurrogate, isSurrogatePair, isBmpCodePoint, isValidCodePoint, isSupplementaryCodePoint,
  charCount, toCodePoint, highSurrogate, lowSurrogate, toChars, getType, isLetter, isDigit, isLetterOrDigit, isWhitespace,
  isSpaceChar, isUpperCase, isLowerCase, isTitleCase, isAlphabetic, isIdeographic, isJavaIdentifierStart, isJavaIdentifierPart,
  isJavaLetter, isJavaLetterOrDigit, isMirrored, isDefined, isISOControl, isIdentifierIgnorable, isUnicodeIdentifierStart,
  isUnicodeIdentifierPart, isSpace, getDirectionality, digit, getNumericValue, forDigit, toUpperCase, toLowerCase, toTitleCase,
  UnicodeScript, UnicodeBlock,
};
