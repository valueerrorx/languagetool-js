// JS twin of harness op "string-tools" (TextOps#stringTools): reflective dispatch over StringTools by name, arity and JSON arg type.
import * as ST from '../../src/core/text/StringTools.js';
import { StringReader } from '../../src/lib/java/io.js';
import { IllegalArgumentException } from '../../src/lib/java/errors.js';
import { javaCompare } from '../../src/lib/java/strings.js';
import { safe } from './_text-common.mjs';
import '../../src/lang/register.js';
import { Languages } from '../../src/core/Languages.js';
import { isPortedBase } from '../lib/scope.mjs';

// short codes of Java languages outside the wave-1 modules (DEV-006): the port has no such language, a descriptor with the short code stands in
const OUT_OF_SCOPE = new Set(['ar', 'eo', 'es', 'fa', 'it', 'nl', 'pt', 'sv', 'ca', 'el', 'uk', 'ja', 'km', 'ro', 'ru', 'sk', 'sl', 'ta', 'tl', 'zh', 'pl', 'da', 'ga', 'gl', 'be', 'br', 'ast', 'crh']);

// Java: Languages#getLanguageForShortCode(String) (unknown codes give the Java error, its code list is DEV-006 filtered)
function languageFor(code) {
  if (OUT_OF_SCOPE.has(code) && !isPortedBase(code)) return { getShortCode: () => code };
  return Languages.getLanguageForShortCode(code);
}

// public static methods: name -> overloads [paramTypes, impl]; List before String so that null picks the List overload
const S = 'String';
const METHODS = {
  assureSet: [[[S, S], ST.assureSet]],
  readStream: [[['InputStream', S], ST.readStream]],
  isAllUppercase: [[['List'], ST.isAllUppercaseList], [[S], ST.isAllUppercase]],
  isMixedCase: [[[S], ST.isMixedCase]],
  isNotAllLowercase: [[[S], ST.isNotAllLowercase]],
  IsAllLowercase: [[[S], ST.IsAllLowercase]],
  isCapitalizedWord: [[[S], ST.isCapitalizedWord]],
  startsWithUppercase: [[[S], ST.startsWithUppercase]],
  startsWithLowercase: [[[S], ST.startsWithLowercase]],
  allStartWithLowercase: [[[S], ST.allStartWithLowercase]],
  uppercaseFirstChar: [[[S], ST.uppercaseFirstChar], [[S, 'Language'], ST.uppercaseFirstChar]],
  titlecaseGlobal: [[[S], ST.titlecaseGlobal]],
  lowercaseFirstChar: [[[S], ST.lowercaseFirstChar]],
  lowercaseFirstCharIfCapitalized: [[[S], ST.lowercaseFirstCharIfCapitalized]],
  readerToString: [[['Reader'], ST.readerToString]],
  streamToString: [[['InputStream', S], ST.streamToString]],
  escapeXML: [[[S], ST.escapeXML]],
  escapeForXmlAttribute: [[[S], ST.escapeForXmlAttribute]],
  escapeForXmlContent: [[[S], ST.escapeForXmlContent]],
  escapeHTML: [[[S], ST.escapeHTML]],
  trimWhitespace: [[[S], ST.trimWhitespace]],
  trimSpecialCharacters: [[[S], ST.trimSpecialCharacters]],
  addSpace: [[[S, 'Language'], ST.addSpace]],
  isWhitespace: [[[S], ST.isWhitespace]],
  isNonBreakingWhitespace: [[[S], ST.isNonBreakingWhitespace]],
  isPositiveNumber: [[['char'], ST.isPositiveNumber]],
  isEmpty: [[[S], ST.isEmpty]],
  filterXML: [[[S], ST.filterXML]],
  hasDiacritics: [[[S], ST.hasDiacritics]],
  removeDiacritics: [[[S], ST.removeDiacritics]],
  equalsIgnoreCaseAndDiacritics: [[[S, S], ST.equalsIgnoreCaseAndDiacritics]],
  normalizeNFKC: [[[S], ST.normalizeNFKC]],
  normalizeNFC: [[[S], ST.normalizeNFC]],
  preserveCase: [[[S, S], ST.preserveCase]],
  preserveCaseWordByWord: [[[S, S], ST.preserveCaseWordByWord]],
  asString: [[['CharSequence'], ST.asString]],
  isParagraphEnd: [[[S, 'boolean'], ST.isParagraphEnd]],
  containsLineBreak: [[[S], ST.containsLineBreak]],
  isAllWhitespace: [[[S], ST.isAllWhitespace]],
  loadLines: [[[S], ST.loadLines]],
  toId: [[[S, 'Language'], ST.toId]],
  isCamelCase: [[[S], ST.isCamelCase]],
  isPunctuationMark: [[[S], ST.isPunctuationMark]],
  isPunctuationOrSymbol: [[[S], ST.isPunctuationOrSymbol]],
  isNotWordCharacter: [[[S], ST.isNotWordCharacter]],
  getDifference: [[[S, S], ST.getDifference]],
  makeWrong: [[[S], ST.makeWrong]],
  removeTashkeel: [[[S], ST.removeTashkeel]],
  isNotWordString: [[[S], ST.isNotWordString]],
  numberOf: [[[S, S], ST.numberOf]],
  convertToTitleCaseIteratingChars: [[[S], ST.convertToTitleCaseIteratingChars]],
  isEmoji: [[[S], ST.isEmoji]],
  stringForSpeller: [[[S], ST.stringForSpeller]],
  splitCamelCase: [[[S], ST.splitCamelCase]],
  splitDigitsAtEnd: [[[S], ST.splitDigitsAtEnd]],
  isAnagram: [[[S, S], ST.isAnagram]],
  isNumeric: [[[S], ST.isNumeric]],
  trimLeadingAndTrailingSpaces: [[[S], ST.trimLeadingAndTrailingSpaces]],
};

// Java: TextOps#fits(Class,JsonNode)
function fits(pt, n) {
  if (n === null) return !['int', 'long', 'boolean', 'char'].includes(pt);
  if (typeof n === 'string') return pt === 'String' || pt === 'CharSequence';
  if (typeof n === 'number') return pt === 'int' || pt === 'long';
  if (typeof n === 'boolean') return pt === 'boolean';
  if (Array.isArray(n)) return pt === 'List';
  if (typeof n === 'object') {
    if ('lang' in n) return pt === 'Language';
    if ('bytesHex' in n) return pt === 'InputStream';
    if ('reader' in n) return pt === 'Reader';
    if ('char' in n) return pt === 'char';
  }
  return false;
}

// Java: TextOps#conv(Class,JsonNode)
function conv(pt, n) {
  if (n === null) return null;
  if (pt === 'String' || pt === 'CharSequence') return n;
  if (pt === 'int' || pt === 'long' || pt === 'boolean' || pt === 'List') return n;
  if (pt === 'Language') return languageFor(n.lang);
  if (pt === 'InputStream') return Buffer.from(n.bytesHex, 'hex');
  if (pt === 'Reader') return new StringReader(n.reader);
  if (pt === 'char') return n.char.charCodeAt(0);
  throw new IllegalArgumentException('arg');
}

// Java: TextOps#norm(Object)
const norm = (r) => (r === undefined ? null : r);

// Java: TextOps#stringTools(JsonNode)
export function run(a) {
  return a.calls.map((c) => safe(() => {
    const fn = c.fn;
    if (fn === 'ApiPrintMode.values') {
      const l = [];
      for (const m of ST.ApiPrintMode.values()) { l.push(m.name(), m.ordinal(), m.toString()); }
      return l;
    }
    if (fn === 'UPPERCASE_GREEK_LETTERS') return [...ST.UPPERCASE_GREEK_LETTERS].sort(javaCompare);
    if (fn === 'LOWERCASE_GREEK_LETTERS') return [...ST.LOWERCASE_GREEK_LETTERS].sort(javaCompare);
    const args = c.args;
    let found = null;
    for (const [types, impl] of Object.hasOwn(METHODS, fn) ? METHODS[fn] : []) {
      if (types.length !== args.length) continue;
      if (types.every((t, i) => fits(t, args[i]))) { found = [types, impl]; break; }
    }
    if (found === null) throw new IllegalArgumentException(`no method ${fn}/${args.length}`);
    // loadLines("") lists a directory of the Java classpath (environment artifact, docs/review/unreachable.md): not ported
    if (fn === 'loadLines' && args[0] === '') throw Object.assign(new Error('loadLines("") lists the Java classpath directory'), { notPorted: true });
    const av = args.map((x, i) => conv(found[0][i], x));
    return norm(found[1](...av));
  }));
}
