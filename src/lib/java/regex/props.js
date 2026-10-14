// Java regex character properties (java.util.regex.CharPredicates) as code point sets over the Unicode 13 tables.
import { loadJson } from '../unicode/tables.js';
import { CharSet, MAX_CP, setFromRuns, unionAll } from './charset.js';

let tables = null;

// run tables of props.json (lazy): {tStarts,tVals} general category, flags, script, block
function T() {
  if (tables === null) {
    const j = loadJson('props');
    const split = (pairs) => {
      const n = pairs.length / 2;
      const s = new Int32Array(n);
      const v = new Int32Array(n);
      for (let i = 0; i < n; i++) {
        s[i] = pairs[i * 2];
        v[i] = pairs[i * 2 + 1];
      }
      return [s, v];
    };
    const [tS, tV] = split(j.type);
    const [fS, fV] = split(j.flags);
    const [sS, sV] = split(j.script.runs);
    const [bS, bV] = split(j.block.runs);
    tables = { tS, tV, fS, fV, sS, sV, bS, bV, scriptNames: j.script.names, blockNames: j.block.names, bit: Object.fromEntries(j.flagNames.map((n, i) => [n, 1 << i])) };
  }
  return tables;
}

const cache = new Map();

// memoize a set factory by key
function memo(key, f) {
  let s = cache.get(key);
  if (s === undefined) {
    s = f();
    cache.set(key, s);
  }
  return s;
}

// Character.getType constants
export const TYPE = {
  UNASSIGNED: 0, UPPERCASE_LETTER: 1, LOWERCASE_LETTER: 2, TITLECASE_LETTER: 3, MODIFIER_LETTER: 4, OTHER_LETTER: 5, NON_SPACING_MARK: 6,
  ENCLOSING_MARK: 7, COMBINING_SPACING_MARK: 8, DECIMAL_DIGIT_NUMBER: 9, LETTER_NUMBER: 10, OTHER_NUMBER: 11, SPACE_SEPARATOR: 12,
  LINE_SEPARATOR: 13, PARAGRAPH_SEPARATOR: 14, CONTROL: 15, FORMAT: 16, PRIVATE_USE: 18, SURROGATE: 19, DASH_PUNCTUATION: 20,
  START_PUNCTUATION: 21, END_PUNCTUATION: 22, CONNECTOR_PUNCTUATION: 23, OTHER_PUNCTUATION: 24, MATH_SYMBOL: 25, CURRENCY_SYMBOL: 26,
  MODIFIER_SYMBOL: 27, OTHER_SYMBOL: 28, INITIAL_QUOTE_PUNCTUATION: 29, FINAL_QUOTE_PUNCTUATION: 30,
};

// Java: CharPredicates#category(int): general category bit mask
export function category(mask) {
  return memo(`cat:${mask}`, () => {
    const t = T();
    return setFromRuns(t.tS, t.tV, (ty) => ((mask >> ty) & 1) !== 0);
  });
}

const bitOf = (...types) => types.reduce((m, ty) => m | (1 << ty), 0);

// set of code points whose Character.* flag (props.json flagNames) is set
function flagSet(name) {
  return memo(`flag:${name}`, () => {
    const t = T();
    const b = t.bit[name];
    return setFromRuns(t.fS, t.fV, (v) => (v & b) !== 0);
  });
}

const cs = (lo, hi) => CharSet.range(lo, hi);
const chars = (...cps) => CharSet.ofCodePoints(cps, true);
// generic (non Bmp) predicate of the given code points
const charsG = (...cps) => CharSet.ofCodePoints(cps, false);

// ASCII ctype sets (java.util.regex.ASCII)
export const ASCII_LOWER = cs(0x61, 0x7a);
export const ASCII_UPPER = cs(0x41, 0x5a);
export const ASCII_DIGIT = cs(0x30, 0x39);
export const ASCII_ALPHA = ASCII_LOWER.union(ASCII_UPPER);
export const ASCII_ALNUM = ASCII_ALPHA.union(ASCII_DIGIT);
export const ASCII_SPACE = chars(0x20, 9, 10, 11, 12, 13);
export const ASCII_WORD = ASCII_ALNUM.union(chars(0x5f));
export const ASCII_PUNCT = cs(0x21, 0x2f).union(cs(0x3a, 0x40)).union(cs(0x5b, 0x60)).union(cs(0x7b, 0x7e));
export const ASCII_GRAPH = cs(0x21, 0x7e);
export const ASCII_PRINT = cs(0x20, 0x7e);
export const ASCII_BLANK = chars(0x20, 9);
export const ASCII_CNTRL = cs(0, 0x1f).union(chars(0x7f));
export const ASCII_XDIGIT = ASCII_DIGIT.union(cs(0x41, 0x46)).union(cs(0x61, 0x66));

// Java: CharPredicates#DIGIT() (Character.isDigit)
export const DIGIT = () => category(bitOf(TYPE.DECIMAL_DIGIT_NUMBER));
// Java: CharPredicates#ALPHABETIC()
export const ALPHABETIC = () => flagSet('isAlphabetic');
// Java: Character#isLetterOrDigit
export const LETTER_OR_DIGIT = () => flagSet('isLetterOrDigit');
// Java: CharPredicates#LETTER()
export const LETTER = () => flagSet('isLetter');
// Java: CharPredicates#IDEOGRAPHIC()
export const IDEOGRAPHIC = () => flagSet('isIdeographic');
// Java: CharPredicates#LOWERCASE()
export const LOWERCASE = () => flagSet('isLowerCase');
// Java: CharPredicates#UPPERCASE()
export const UPPERCASE = () => flagSet('isUpperCase');
// Java: CharPredicates#TITLECASE()
export const TITLECASE = () => flagSet('isTitleCase');
// Java: CharPredicates#WHITE_SPACE()
export const WHITE_SPACE = () => memo('WHITE_SPACE', () => category(bitOf(TYPE.SPACE_SEPARATOR, TYPE.LINE_SEPARATOR, TYPE.PARAGRAPH_SEPARATOR)).union(cs(9, 13)).union(chars(0x85)));
// Java: CharPredicates#CONTROL()
export const CONTROL = () => category(bitOf(TYPE.CONTROL));
// Java: CharPredicates#PUNCTUATION()
export const PUNCTUATION = () => category(bitOf(TYPE.CONNECTOR_PUNCTUATION, TYPE.DASH_PUNCTUATION, TYPE.START_PUNCTUATION, TYPE.END_PUNCTUATION, TYPE.OTHER_PUNCTUATION, TYPE.INITIAL_QUOTE_PUNCTUATION, TYPE.FINAL_QUOTE_PUNCTUATION));
// Java: CharPredicates#HEX_DIGIT()
export const HEX_DIGIT = () => memo('HEX_DIGIT', () => DIGIT().union(cs(0x41, 0x46)).union(cs(0x61, 0x66)).union(cs(0xff21, 0xff26)).union(cs(0xff41, 0xff46)));
// Java: CharPredicates#JOIN_CONTROL()
export const JOIN_CONTROL = () => charsG(0x200c, 0x200d);
// Java: CharPredicates#NONCHARACTER_CODE_POINT()
export const NONCHARACTER_CODE_POINT = () => memo('NONCHAR', () => {
  const r = [0xfdd0, 0xfdef];
  for (let p = 0; p <= 0x10; p++) r.push(p * 0x10000 + 0xfffe, p * 0x10000 + 0xffff);
  return new CharSet(r);
});
// Java: CharPredicates#ASSIGNED()
export const ASSIGNED = () => category(bitOf(TYPE.UNASSIGNED)).negate();
// Java: CharPredicates#WORD()
export const WORD = () => memo('WORD', () => ALPHABETIC().union(category(bitOf(TYPE.NON_SPACING_MARK, TYPE.ENCLOSING_MARK, TYPE.COMBINING_SPACING_MARK, TYPE.DECIMAL_DIGIT_NUMBER, TYPE.CONNECTOR_PUNCTUATION))).union(JOIN_CONTROL()));
// Java: CharPredicates#GRAPH()
export const GRAPH = () => memo('GRAPH', () => category(bitOf(TYPE.SPACE_SEPARATOR, TYPE.LINE_SEPARATOR, TYPE.PARAGRAPH_SEPARATOR, TYPE.CONTROL, TYPE.SURROGATE, TYPE.UNASSIGNED)).negate());
// Java: CharPredicates#BLANK()
export const BLANK = () => memo('BLANK', () => category(bitOf(TYPE.SPACE_SEPARATOR)).union(chars(9)));
// Java: CharPredicates#PRINT()
export const PRINT = () => memo('PRINT', () => GRAPH().union(BLANK()).subtract(CONTROL()));
// Java: Pattern#HorizWS
export const HORIZ_WS = () => memo('HORIZ', () => chars(9, 0x20, 0xa0, 0x1680, 0x180e, 0x202f, 0x205f, 0x3000).union(cs(0x2000, 0x200a)));
// Java: Pattern#VertWS
export const VERT_WS = () => memo('VERT', () => cs(0xa, 0xd).union(chars(0x85, 0x2028, 0x2029)));
// Java: Pattern#DOT() line terminators
export const LINE_TERMINATORS = () => charsG(0xa, 0xd, 0x85, 0x2028, 0x2029);

// Java: Character.UnicodeScript ISO 15924 aliases (name -> 4 letter code)
const SCRIPT_CODES = 'COMMON Zyyy LATIN Latn BOPOMOFO Bopo INHERITED Zinh GREEK Grek UNKNOWN Zzzz COPTIC Copt CYRILLIC Cyrl ARMENIAN Armn HEBREW Hebr ARABIC Arab SYRIAC Syrc THAANA Thaa NKO Nkoo SAMARITAN Samr MANDAIC Mand DEVANAGARI Deva BENGALI Beng GURMUKHI Guru GUJARATI Gujr ORIYA Orya TAMIL Taml TELUGU Telu KANNADA Knda MALAYALAM Mlym SINHALA Sinh THAI Thai LAO Laoo TIBETAN Tibt MYANMAR Mymr GEORGIAN Geor HANGUL Hang ETHIOPIC Ethi CHEROKEE Cher CANADIAN_ABORIGINAL Cans OGHAM Ogam RUNIC Runr TAGALOG Tglg HANUNOO Hano BUHID Buhd TAGBANWA Tagb KHMER Khmr MONGOLIAN Mong LIMBU Limb TAI_LE Tale NEW_TAI_LUE Talu BUGINESE Bugi TAI_THAM Lana BALINESE Bali SUNDANESE Sund BATAK Batk LEPCHA Lepc OL_CHIKI Olck BRAILLE Brai GLAGOLITIC Glag TIFINAGH Tfng HAN Hani HIRAGANA Hira KATAKANA Kana YI Yiii LISU Lisu VAI Vaii BAMUM Bamu SYLOTI_NAGRI Sylo PHAGS_PA Phag SAURASHTRA Saur KAYAH_LI Kali REJANG Rjng JAVANESE Java CHAM Cham TAI_VIET Tavt MEETEI_MAYEK Mtei LINEAR_B Linb LYCIAN Lyci CARIAN Cari OLD_ITALIC Ital GOTHIC Goth OLD_PERMIC Perm UGARITIC Ugar OLD_PERSIAN Xpeo DESERET Dsrt SHAVIAN Shaw OSMANYA Osma OSAGE Osge ELBASAN Elba CAUCASIAN_ALBANIAN Aghb LINEAR_A Lina CYPRIOT Cprt IMPERIAL_ARAMAIC Armi PALMYRENE Palm NABATAEAN Nbat HATRAN Hatr PHOENICIAN Phnx LYDIAN Lydi MEROITIC_HIEROGLYPHS Mero MEROITIC_CURSIVE Merc KHAROSHTHI Khar OLD_SOUTH_ARABIAN Sarb OLD_NORTH_ARABIAN Narb MANICHAEAN Mani AVESTAN Avst INSCRIPTIONAL_PARTHIAN Prti INSCRIPTIONAL_PAHLAVI Phli PSALTER_PAHLAVI Phlp OLD_TURKIC Orkh OLD_HUNGARIAN Hung HANIFI_ROHINGYA Rohg YEZIDI Yezi OLD_SOGDIAN Sogo SOGDIAN Sogd CHORASMIAN Chrs ELYMAIC Elym BRAHMI Brah KAITHI Kthi SORA_SOMPENG Sora CHAKMA Cakm MAHAJANI Mahj SHARADA Shrd KHOJKI Khoj MULTANI Mult KHUDAWADI Sind GRANTHA Gran NEWA Newa TIRHUTA Tirh SIDDHAM Sidd MODI Modi TAKRI Takr AHOM Ahom DOGRA Dogr WARANG_CITI Wara DIVES_AKURU Diak NANDINAGARI Nand ZANABAZAR_SQUARE Zanb SOYOMBO Soyo PAU_CIN_HAU Pauc BHAIKSUKI Bhks MARCHEN Marc MASARAM_GONDI Gonm GUNJALA_GONDI Gong MAKASAR Maka CUNEIFORM Xsux EGYPTIAN_HIEROGLYPHS Egyp ANATOLIAN_HIEROGLYPHS Hluw MRO Mroo BASSA_VAH Bass PAHAWH_HMONG Hmng MEDEFAIDRIN Medf MIAO Plrd TANGUT Tang NUSHU Nshu KHITAN_SMALL_SCRIPT Kits DUPLOYAN Dupl SIGNWRITING Sgnw NYIAKENG_PUACHUE_HMONG Hmnp WANCHO Wcho MENDE_KIKAKUI Mend ADLAM Adlm'.split(' ');

let scriptAliases = null;

// alias map (upper case code -> script name)
function scripts() {
  if (scriptAliases === null) {
    scriptAliases = new Map();
    for (let i = 0; i < SCRIPT_CODES.length; i += 2) scriptAliases.set(SCRIPT_CODES[i + 1].toUpperCase(), SCRIPT_CODES[i]);
    scriptAliases.set('QAAI', 'INHERITED');
    scriptAliases.set('QAAC', 'COPTIC');
  }
  return scriptAliases;
}

// Java: CharPredicates#forUnicodeScript(String)
export function forUnicodeScript(name) {
  const up = name.toUpperCase();
  const t = T();
  let sc = scripts().get(up);
  if (sc === undefined) sc = up;
  const idx = t.scriptNames.indexOf(sc);
  if (idx < 0) return null;
  return memo(`script:${sc}`, () => setFromRuns(t.sS, t.sV, (v) => v === idx));
}

let blockAliases = null;

// block id/alias map (upper case -> index into blockNames)
function blocks() {
  if (blockAliases === null) {
    blockAliases = new Map();
    const names = T().blockNames;
    names.forEach((id, i) => {
      const spaced = id.replace(/_/g, ' ');
      const hy = id === 'LATIN_1_SUPPLEMENT' ? 'LATIN-1 SUPPLEMENT'
        : /^(?:.*(?:EXTENDED|ARROWS|FORMS|SYMBOLS|AREA))_[A-E]$/.test(id) ? spaced.replace(/ ([A-E])$/, '-$1') : spaced;
      for (const k of [id, spaced, hy, spaced.replace(/ /g, ''), hy.replace(/ /g, '')]) blockAliases.set(k, i);
    });
    const extra = {
      GREEK: ['GREEK AND COPTIC', 'GREEKANDCOPTIC'],
      CYRILLIC_SUPPLEMENTARY: ['CYRILLIC SUPPLEMENT', 'CYRILLICSUPPLEMENT'],
      COMBINING_MARKS_FOR_SYMBOLS: ['COMBINING DIACRITICAL MARKS FOR SYMBOLS', 'COMBININGDIACRITICALMARKSFORSYMBOLS'],
    };
    for (const [id, al] of Object.entries(extra)) for (const a of al) blockAliases.set(a, names.indexOf(id));
  }
  return blockAliases;
}

// Java: CharPredicates#forUnicodeBlock(String)
export function forUnicodeBlock(name) {
  const idx = blocks().get(name.toUpperCase());
  if (idx === undefined) return null;
  const t = T();
  return memo(`block:${idx}`, () => setFromRuns(t.bS, t.bV, (v) => v === idx));
}

// Java: CharPredicates#forUnicodeProperty(String,boolean)
export function forUnicodeProperty(propName, caseIns) {
  switch (propName.toUpperCase()) {
    case 'ALPHABETIC': return ALPHABETIC();
    case 'ASSIGNED': return ASSIGNED();
    case 'CONTROL': return CONTROL();
    case 'HEXDIGIT': case 'HEX_DIGIT': return HEX_DIGIT();
    case 'IDEOGRAPHIC': return IDEOGRAPHIC();
    case 'JOINCONTROL': case 'JOIN_CONTROL': return JOIN_CONTROL();
    case 'LETTER': return LETTER();
    case 'LOWERCASE': return caseIns ? LOWERCASE().union(UPPERCASE()).union(TITLECASE()) : LOWERCASE();
    case 'NONCHARACTERCODEPOINT': case 'NONCHARACTER_CODE_POINT': return NONCHARACTER_CODE_POINT();
    case 'TITLECASE': return caseIns ? LOWERCASE().union(UPPERCASE()).union(TITLECASE()) : TITLECASE();
    case 'PUNCTUATION': return PUNCTUATION();
    case 'UPPERCASE': return caseIns ? LOWERCASE().union(UPPERCASE()).union(TITLECASE()) : UPPERCASE();
    case 'WHITESPACE': case 'WHITE_SPACE': return WHITE_SPACE();
    case 'WORD': return WORD();
    default: return null;
  }
}

// Java: CharPredicates#forPOSIXName(String,boolean)
export function forPOSIXName(name, caseIns) {
  let p;
  switch (name.toUpperCase()) {
    case 'ALPHA': p = ALPHABETIC(); break;
    case 'LOWER': p = LOWERCASE(); break;
    case 'UPPER': p = UPPERCASE(); break;
    case 'SPACE': p = WHITE_SPACE(); break;
    case 'PUNCT': p = PUNCTUATION(); break;
    case 'ALNUM': p = ALPHABETIC().union(DIGIT()); break;
    case 'DIGIT': p = DIGIT(); break;
    case 'CNTRL': p = CONTROL(); break;
    case 'GRAPH': p = GRAPH(); break;
    case 'PRINT': p = PRINT(); break;
    case 'BLANK': p = BLANK(); break;
    case 'XDIGIT': p = HEX_DIGIT(); break;
    default: return null;
  }
  if (caseIns && (name.toUpperCase() === 'LOWER' || name.toUpperCase() === 'UPPER')) return LOWERCASE().union(UPPERCASE()).union(TITLECASE());
  return p;
}

// Java: CharPredicates#forProperty(String,boolean)
export function forProperty(name, caseIns) {
  const c = (...ts) => category(bitOf(...ts));
  const LC = bitOf(TYPE.UPPERCASE_LETTER, TYPE.LOWERCASE_LETTER, TYPE.TITLECASE_LETTER);
  switch (name) {
    case 'Cn': return c(TYPE.UNASSIGNED);
    case 'Lu': return category(caseIns ? LC : bitOf(TYPE.UPPERCASE_LETTER));
    case 'Ll': return category(caseIns ? LC : bitOf(TYPE.LOWERCASE_LETTER));
    case 'Lt': return category(caseIns ? LC : bitOf(TYPE.TITLECASE_LETTER));
    case 'Lm': return c(TYPE.MODIFIER_LETTER);
    case 'Lo': return c(TYPE.OTHER_LETTER);
    case 'Mn': return c(TYPE.NON_SPACING_MARK);
    case 'Me': return c(TYPE.ENCLOSING_MARK);
    case 'Mc': return c(TYPE.COMBINING_SPACING_MARK);
    case 'Nd': return c(TYPE.DECIMAL_DIGIT_NUMBER);
    case 'Nl': return c(TYPE.LETTER_NUMBER);
    case 'No': return c(TYPE.OTHER_NUMBER);
    case 'Zs': return c(TYPE.SPACE_SEPARATOR);
    case 'Zl': return c(TYPE.LINE_SEPARATOR);
    case 'Zp': return c(TYPE.PARAGRAPH_SEPARATOR);
    case 'Cc': return c(TYPE.CONTROL);
    case 'Cf': return c(TYPE.FORMAT);
    case 'Co': return c(TYPE.PRIVATE_USE);
    case 'Cs': return c(TYPE.SURROGATE);
    case 'Pd': return c(TYPE.DASH_PUNCTUATION);
    case 'Ps': return c(TYPE.START_PUNCTUATION);
    case 'Pe': return c(TYPE.END_PUNCTUATION);
    case 'Pc': return c(TYPE.CONNECTOR_PUNCTUATION);
    case 'Po': return c(TYPE.OTHER_PUNCTUATION);
    case 'Sm': return c(TYPE.MATH_SYMBOL);
    case 'Sc': return c(TYPE.CURRENCY_SYMBOL);
    case 'Sk': return c(TYPE.MODIFIER_SYMBOL);
    case 'So': return c(TYPE.OTHER_SYMBOL);
    case 'Pi': return c(TYPE.INITIAL_QUOTE_PUNCTUATION);
    case 'Pf': return c(TYPE.FINAL_QUOTE_PUNCTUATION);
    case 'L': return c(TYPE.UPPERCASE_LETTER, TYPE.LOWERCASE_LETTER, TYPE.TITLECASE_LETTER, TYPE.MODIFIER_LETTER, TYPE.OTHER_LETTER);
    case 'M': return c(TYPE.NON_SPACING_MARK, TYPE.ENCLOSING_MARK, TYPE.COMBINING_SPACING_MARK);
    case 'N': return c(TYPE.DECIMAL_DIGIT_NUMBER, TYPE.LETTER_NUMBER, TYPE.OTHER_NUMBER);
    case 'Z': return c(TYPE.SPACE_SEPARATOR, TYPE.LINE_SEPARATOR, TYPE.PARAGRAPH_SEPARATOR);
    case 'C': return c(TYPE.CONTROL, TYPE.FORMAT, TYPE.PRIVATE_USE, TYPE.SURROGATE, TYPE.UNASSIGNED);
    case 'P': return c(TYPE.CONNECTOR_PUNCTUATION, TYPE.DASH_PUNCTUATION, TYPE.START_PUNCTUATION, TYPE.END_PUNCTUATION, TYPE.OTHER_PUNCTUATION, TYPE.INITIAL_QUOTE_PUNCTUATION, TYPE.FINAL_QUOTE_PUNCTUATION);
    case 'S': return c(TYPE.MATH_SYMBOL, TYPE.CURRENCY_SYMBOL, TYPE.MODIFIER_SYMBOL, TYPE.OTHER_SYMBOL);
    case 'LC': return category(LC);
    case 'LD': return c(TYPE.UPPERCASE_LETTER, TYPE.LOWERCASE_LETTER, TYPE.TITLECASE_LETTER, TYPE.MODIFIER_LETTER, TYPE.OTHER_LETTER, TYPE.DECIMAL_DIGIT_NUMBER);
    case 'L1': return cs(0, 0xff);
    case 'all': return CharSet.all();
    case 'ASCII': return cs(0, 0x7f);
    case 'Alnum': return ASCII_ALNUM;
    case 'Alpha': return ASCII_ALPHA;
    case 'Blank': return ASCII_BLANK;
    case 'Cntrl': return ASCII_CNTRL;
    case 'Digit': return ASCII_DIGIT;
    case 'Graph': return ASCII_GRAPH;
    case 'Lower': return caseIns ? ASCII_ALPHA : ASCII_LOWER;
    case 'Print': return ASCII_PRINT;
    case 'Punct': return ASCII_PUNCT;
    case 'Space': return ASCII_SPACE;
    case 'Upper': return caseIns ? ASCII_ALPHA : ASCII_UPPER;
    case 'XDigit': return ASCII_XDIGIT;
    case 'javaLowerCase': return caseIns ? LOWERCASE().union(UPPERCASE()).union(TITLECASE()) : flagSet('isLowerCase');
    case 'javaUpperCase': return caseIns ? LOWERCASE().union(UPPERCASE()).union(TITLECASE()) : flagSet('isUpperCase');
    case 'javaAlphabetic': return flagSet('isAlphabetic');
    case 'javaIdeographic': return flagSet('isIdeographic');
    case 'javaTitleCase': return caseIns ? LOWERCASE().union(UPPERCASE()).union(TITLECASE()) : flagSet('isTitleCase');
    case 'javaDigit': return flagSet('isDigit');
    case 'javaDefined': return flagSet('isDefined');
    case 'javaLetter': return flagSet('isLetter');
    case 'javaLetterOrDigit': return flagSet('isLetterOrDigit');
    case 'javaJavaIdentifierStart': return flagSet('isJavaIdentifierStart');
    case 'javaJavaIdentifierPart': return flagSet('isJavaIdentifierPart');
    case 'javaUnicodeIdentifierStart': return flagSet('isUnicodeIdentifierStart');
    case 'javaUnicodeIdentifierPart': return flagSet('isUnicodeIdentifierPart');
    case 'javaIdentifierIgnorable': return flagSet('isIdentifierIgnorable');
    case 'javaSpaceChar': return flagSet('isSpaceChar');
    case 'javaWhitespace': return flagSet('isWhitespace');
    case 'javaISOControl': return flagSet('isISOControl');
    case 'javaMirrored': return flagSet('isMirrored');
    default: return null;
  }
}

export { MAX_CP, unionAll };
