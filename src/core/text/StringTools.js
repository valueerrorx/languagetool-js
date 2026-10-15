// org.languagetool.tools.StringTools
import { Pattern } from '../../lib/java/regex/index.js';
import { JavaEnum } from '../../lib/java/JavaEnum.js';
import { Objects } from '../../lib/java/Objects.js';
import { NullPointerException, IllegalArgumentException, RuntimeException } from '../../lib/java/errors.js';
import { Character } from '../../lib/java/Character.js';
import { Normalizer } from '../../lib/java/Normalizer.js';
import {
  javaTrim, toLowerCase, toUpperCase, javaReplace, javaSplit, javaReplaceAll, javaMatches, charAt, substring,
  codePointAt, codePointCount, indexOf, equalsIgnoreCase,
} from '../../lib/java/strings.js';
import { readerLines, inputStreamReader } from '../../lib/java/io.js';
import { getDataBroker } from '../resources/LtStatics.js';

const NONCHAR = Pattern.compile('[^A-Z\\u00c0-\\u00D6\\u00D8-\\u00DE]');
const WORD_FOR_SPELLER = Pattern.compile('^[\\p{L}\\d\\p{P}\\p{Zs}]+$');
const IS_NUMERIC = Pattern.compile('^[\\d\\s\\.,]*\\d$');
const TRIM_PATTERN = Pattern.compile('^[\\s\\u00A0]+|[\\s\\u00A0]+$');

// Java: StringTools.ApiPrintMode
export class ApiPrintMode extends JavaEnum {
  static FQCN = 'org.languagetool.tools.StringTools.ApiPrintMode';
}
ApiPrintMode.NORMAL_API = new ApiPrintMode('NORMAL_API', 0);
ApiPrintMode.START_API = new ApiPrintMode('START_API', 1);
ApiPrintMode.END_API = new ApiPrintMode('END_API', 2);
ApiPrintMode.CONTINUE_API = new ApiPrintMode('CONTINUE_API', 3);

export const UPPERCASE_GREEK_LETTERS = new Set(['Α', 'Β', 'Γ', 'Δ', 'Ε', 'Ζ', 'Η', 'Θ', 'Ι', 'Κ', 'Λ', 'Μ', 'Ν', 'Ξ', 'Ο', 'Π', 'Ρ', 'Σ', 'Τ', 'Υ', 'Φ', 'Χ', 'Ψ', 'Ω']);
export const LOWERCASE_GREEK_LETTERS = new Set(['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ', 'λ', 'μ', 'ν', 'ξ', 'ο', 'π', 'ρ', 'σ', 'τ', 'υ', 'φ', 'χ', 'ψ', 'ω']);

const WHITESPACE_ARRAY = [];
for (let i = 0; i < 20; i++) {
  WHITESPACE_ARRAY[i] = ' '.repeat(i);
}

export const CHARS_NOT_FOR_SPELLING = Pattern.compile('[^\\p{L}\\d\\p{P}\\p{Zs}]');
const XML_COMMENT_PATTERN = Pattern.compile('<!--.*?-->', Pattern.DOTALL);
const XML_PATTERN = Pattern.compile('(?<!<)<[^<>]+>', Pattern.DOTALL);
const PUNCTUATION_PATTERN = Pattern.compile("[\\p{IsPunctuation}']", Pattern.DOTALL);
const PUNCT_AND_SYMBOL_PATTERN = Pattern.compile("[\\p{IsPunctuation}\\p{S}']");
const NOT_WORD_CHARACTER = Pattern.compile('[^\\p{L}]', Pattern.DOTALL);
const NOT_WORD_STR = Pattern.compile('[^\\p{L}]+', Pattern.DOTALL);
const PATTERN = Pattern.compile('(?U)[^\\p{Space}\\p{Alnum}\\p{Punct}]');
const DIACRIT_MARKS = Pattern.compile('[\\p{InCombiningDiacriticalMarks}]');
// Sets of words used for titlecasing in a few locales; useful for named entities in foreign languages, esp. English
const ENGLISH_TITLECASE_EXCEPTIONS = new Set(['of', 'in', 'on', 'the', 'a', 'an', 'and', 'or']);
const PORTUGUESE_TITLECASE_EXCEPTIONS = new Set(['e', 'ou', 'que',
  'de', 'do', 'dos', 'da', 'das',
  'o', 'a', 'os', 'as',
  'no', 'nos', 'na', 'nas',
  'ao', 'aos', 'à', 'às']);
const FRENCH_TITLECASE_EXCEPTIONS = new Set(['et', 'ou', 'que', 'qui',
  'de', 'du', 'des', 'en',
  'le', 'les', 'la',
  'un', 'une',
  'à', 'au', 'aux']);
const SPANISH_TITLECASE_EXCEPTIONS = new Set(['y', 'e', 'o', 'u', 'que',
  'el', 'la', 'los', 'las',
  'un', 'unos', 'una', 'unas',
  'del', 'nel', 'de', 'en', 'a', 'al']);
const GERMAN_TITLECASE_EXCEPTIONS = new Set(['von', 'in', 'im', 'an', 'am', 'vom', 'und', 'oder', 'dass', 'ob',
  'der', 'die', 'das', 'dem', 'den', 'des',
  'ein', 'eines', 'einem', 'einen', 'einer', 'eine',
  'kein', 'keines', 'keinem', 'keinen', 'keiner', 'keine']);
const DUTCH_TITLECASE_EXCEPTIONS = new Set(['van', 'in', 'de', 'het', 'een', 'en', 'of']);

// Java: StringTools#collectAllTitleCaseExceptions()
function collectAllTitleCaseExceptions() {
  const setList = [ENGLISH_TITLECASE_EXCEPTIONS, PORTUGUESE_TITLECASE_EXCEPTIONS,
    FRENCH_TITLECASE_EXCEPTIONS, SPANISH_TITLECASE_EXCEPTIONS, GERMAN_TITLECASE_EXCEPTIONS, DUTCH_TITLECASE_EXCEPTIONS];
  const union = new Set();
  for (const s of setList) for (const w of s) union.add(w);
  return union;
}

const ALL_TITLECASE_EXCEPTIONS = collectAllTitleCaseExceptions();

// NPE of a dereferenced null (JDK helpful message text, matches the oracle fixtures)
function npe(what, name) {
  return new NullPointerException(`Cannot invoke "${what}" because "${name}" is null`);
}

// Java: s.length() / s.trim() etc. on a possibly null String
function nn(s, what, name) {
  if (s === null || s === undefined) throw npe(what, name);
  return s;
}

// Java: Matcher on a null input (java.util.regex.Matcher#matches etc.)
function matcherOf(pattern, s) {
  if (s === null || s === undefined) throw npe('java.lang.CharSequence.length()', 'this.text');
  return pattern.matcher(s);
}

// Java: StringTools#assureSet(String,String)
export function assureSet(s, varName) {
  Objects.requireNonNull(varName);
  if (isEmpty(javaTrim(nn(s, 'String.trim()', 's')))) {
    throw new IllegalArgumentException(`${varName} cannot be empty or whitespace only`);
  }
}

// Java: StringTools#readStream(InputStream,String)
export function readStream(stream, encoding) {
  let sb = '';
  const isr = inputStreamReader(stream, encoding === null || encoding === undefined ? 'UTF-8' : encoding);
  const br = readerLines(readerToString(isr));
  for (const line of br) {
    sb += line;
    sb += '\n';
  }
  return sb;
}

// Java: StringTools#isAllUppercase(String) / isAllUppercase(List<String>)
export function isAllUppercase(str) {
  if (Array.isArray(str)) return isAllUppercaseList(str);
  nn(str, 'String.length()', 'str');
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (Character.isLetter(c) && Character.isLowerCase(c)) {
      return false;
    }
  }
  return true;
}

// Java: StringTools#isAllUppercase(List)
export function isAllUppercaseList(strList) {
  nn(strList, 'java.util.List.size()', 'strList');
  let isInputAllUppercase = true;
  let isAllNotLetters = true;
  for (let i = 0; i < strList.length; i++) {
    isInputAllUppercase = isInputAllUppercase && isAllUppercase(strList[i]);
    isAllNotLetters = isAllNotLetters && (isNotWordString(strList[i])
      || isPunctuationMark(strList[i]));
  }
  return isInputAllUppercase && !isAllNotLetters;
}

// Java: StringTools#isMixedCase(String)
export function isMixedCase(str) {
  return !isAllUppercase(str)
      && !isCapitalizedWord(str)
      && isNotAllLowercase(str);
}

// Java: StringTools#isNotAllLowercase(String)
export function isNotAllLowercase(str) {
  nn(str, 'String.length()', 'str');
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (Character.isLetter(c) && !Character.isLowerCase(c)) {
      return true;
    }
  }
  return false;
}

// Java: StringTools#IsAllLowercase(String)
export function IsAllLowercase(str) {
  return !isNotAllLowercase(str);
}

// Java: StringTools#isCapitalizedWord(String)
export function isCapitalizedWord(str) {
  if (!isEmpty(str) && Character.isUpperCase(str.charCodeAt(0))) {
    for (let i = 1; i < str.length; i++) {
      const c = str.charCodeAt(i);
      if (Character.isLetter(c) && !Character.isLowerCase(c)) {
        return false;
      }
    }
    return true;
  }
  return false;
}

// Java: StringTools#startsWithUppercase(String)
export function startsWithUppercase(str) {
  if (isEmpty(str)) {
    return false;
  }
  return Character.isUpperCase(str.charCodeAt(0));
}

// Java: StringTools#startsWithLowercase(String)
export function startsWithLowercase(str) {
  if (isEmpty(str)) {
    return false;
  }
  return Character.isLowerCase(str.charCodeAt(0));
}

// Java: StringTools#allStartWithLowercase(String)
export function allStartWithLowercase(str) {
  const strParts = javaSplit(nn(str, 'String.split(String)', 'str'), ' ');
  if (strParts.length < 2) {
    return startsWithLowercase(str);
  }
  for (const strPart of strParts) {
    if (!startsWithLowercase(strPart)) {
      return false;
    }
  }
  return true;
}

// Java: StringTools#uppercaseFirstChar(String) / uppercaseFirstChar(String,Language)
export function uppercaseFirstChar(str, language) {
  if (arguments.length >= 2) {
    if (language !== null && language !== undefined && 'nl' === language.getShortCode() && str !== null && str !== undefined && toLowerCase(str).startsWith('ij')) {
      // hack to fix https://github.com/languagetool-org/languagetool/issues/148
      return 'IJ' + str.substring(2);
    }
    return changeFirstCharCase(str, true);
  }
  return changeFirstCharCase(str, true);
}

// Java: StringTools#titlecaseGlobal(String)
export function titlecaseGlobal(str) {
  const strParts = javaSplit(nn(str, 'String.split(String)', 'str'), ' ');
  if (strParts.length === 1) {
    return uppercaseFirstChar(str);
  }
  const titlecasedStr = [];
  for (let i = 0; i < strParts.length; i++) {
    const strPart = strParts[i];
    if (i === 0) {
      titlecasedStr.push(uppercaseFirstChar(strPart));
      continue;
    }
    if (ALL_TITLECASE_EXCEPTIONS.has(toLowerCase(strPart))) {
      titlecasedStr.push(lowercaseFirstCharIfCapitalized(strPart));
    } else {
      titlecasedStr.push(uppercaseFirstChar(strPart));
    }
  }
  return titlecasedStr.join(' ');
}

// Java: StringTools#lowercaseFirstChar(String)
export function lowercaseFirstChar(str) {
  return changeFirstCharCase(str, false);
}

// Java: StringTools#lowercaseFirstCharIfCapitalized(String)
export function lowercaseFirstCharIfCapitalized(str) {
  if (!isCapitalizedWord(str)) return str;
  return changeFirstCharCase(str, false);
}

// Java: StringTools#changeFirstCharCase(String,boolean)
function changeFirstCharCase(str, toUpper) {
  if (isEmpty(str)) {
    return str;
  }
  if (str.length === 1) {
    return toUpper ? toUpperCase(str, 'en') : toLowerCase(str);
  }
  let pos = 0;
  const len = str.length - 1;
  while (!Character.isLetterOrDigit(str.charCodeAt(pos)) && len > pos) {
    pos++;
  }
  const firstChar = str.charCodeAt(pos);
  return str.substring(0, pos)
      + String.fromCharCode(toUpper ? Character.toUpperCase(firstChar) : Character.toLowerCase(firstChar))
      + str.substring(pos + 1);
}

// Java: StringTools#readerToString(Reader)
export function readerToString(reader) {
  if (reader === null || reader === undefined) throw npe('java.io.Reader.read(char[], int, int)', 'reader');
  let sb = '';
  let readBytes = 0;
  const chars = new Uint16Array(4000);
  while (readBytes >= 0) {
    readBytes = reader.read(chars, 0, 4000);
    if (readBytes <= 0) {
      break;
    }
    sb += String.fromCharCode(...chars.subarray(0, readBytes));
  }
  return sb;
}

// Java: StringTools#streamToString(InputStream,String)
export function streamToString(is, charsetName) {
  return readerToString(inputStreamReader(is, charsetName));
}

// Java: StringTools#escapeXML(String)
export function escapeXML(s) {
  return escapeHTML(s);
}

// Java: com.google.common.xml.XmlEscapers (content and attribute escapers)
function xmlEscape(s, attribute) {
  if (s === null || s === undefined) throw new NullPointerException();
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    switch (c) {
      case 0x26: out += '&amp;'; break;
      case 0x3c: out += '&lt;'; break;
      case 0x3e: out += '&gt;'; break;
      case 0x27: out += attribute ? '&apos;' : "'"; break;
      case 0x22: out += attribute ? '&quot;' : '"'; break;
      case 0x09: out += attribute ? '&#x9;' : '\t'; break;
      case 0x0a: out += attribute ? '&#xA;' : '\n'; break;
      case 0x0d: out += attribute ? '&#xD;' : '\r'; break;
      default:
        out += c <= 0x1f || c > 0xfffd ? '�' : s.charAt(i);
    }
  }
  return out;
}

// Java: StringTools#escapeForXmlAttribute(String)
export function escapeForXmlAttribute(s) {
  return xmlEscape(s, true);
}

// Java: StringTools#escapeForXmlContent(String)
export function escapeForXmlContent(s) {
  return xmlEscape(s, false);
}

// Java: StringTools#escapeHTML(String)
export function escapeHTML(s) {
  let sb = '';
  const n = nn(s, 'String.length()', 's').length;
  for (let i = 0; i < n; i++) {
    const c = s.charAt(i);
    switch (c) {
      case '<': sb += '&lt;'; break;
      case '>': sb += '&gt;'; break;
      case '&': sb += '&amp;'; break;
      case '"': sb += '&quot;'; break;
      default: sb += c; break;
    }
  }
  return sb;
}

// Java: StringTools#trimWhitespace(String)
export function trimWhitespace(s) {
  let filter = '';
  const str = javaTrim(nn(s, 'String.trim()', 's'));
  for (let i = 0; i < str.length; i++) {
    while (charAt(str, i) <= 0x20 && i < str.length &&
        (charAt(str, i + 1) <= 0x20 || (i > 1 && charAt(str, i - 1) <= 0x20))) {
      i++;
    }
    const c = charAt(str, i);
    if (c !== 0x0a && c !== 0x09 && c !== 0x0d) {
      filter += String.fromCharCode(c);
    }
  }
  return filter.length === str.length ? str : filter;
}

// Java: StringTools#trimSpecialCharacters(String)
export function trimSpecialCharacters(s) {
  // need unicode character classes -> (?U)
  // lists all allowed character classes, replace everything else
  return matcherOf(PATTERN, s).replaceAll('');
}

// Java: StringTools#addSpace(String,Language)
export function addSpace(word, language) {
  let space = ' ';
  if (nn(word, 'String.length()', 'word').length === 1) {
    const c = word.charCodeAt(0);
    if (language === null || language === undefined) throw npe('org.languagetool.Language.getShortCode()', 'language');
    if ('fr' === language.getShortCode()) {
      if (c === 0x2e || c === 0x2c) {
        space = '';
      }
    } else {
      if (c === 0x2e || c === 0x2c || c === 0x3b || c === 0x3a || c === 0x3f || c === 0x21) {
        space = '';
      }
    }
  }
  return space;
}

// Java: StringTools#isWhitespace(String)
export function isWhitespace(str) {
  if ('\u0002' === str // unbreakable field, e.g. a footnote number in OOo
      || '\u0001' === str) { // breakable field in OOo
    return false;
  }

  if ('﻿' === str) {
    return true;
  }
  const trimStr = javaTrim(nn(str, 'String.trim()', 'str'));
  if (isEmpty(trimStr)) {
    return true;
  }
  if (trimStr.length === 1) {
    if ('​' === str || // We need u200B to be detected as whitespace for Khmer, as it was the case before Java 7.
        ' ' === str || ' ' === str) { // non-breaking space and narrow non-breaking space
      return true;
    }
    return Character.isWhitespace(trimStr.charCodeAt(0));
  }
  return false;
}

// Java: StringTools#isNonBreakingWhitespace(String)
export function isNonBreakingWhitespace(str) {
  return ' ' === str;
}

// Java: StringTools#isPositiveNumber(char)
export function isPositiveNumber(ch) {
  return ch >= 0x31 && ch <= 0x39;
}

// Java: StringTools#isEmpty(String)
export function isEmpty(str) {
  return str === null || str === undefined || str.length === 0;
}

// Java: StringTools#filterXML(String)
export function filterXML(str) {
  let s = str;
  if (nn(s, 'String.contains(java.lang.CharSequence)', 's').includes('<')) { // don't run slow regex unless we have to
    s = XML_COMMENT_PATTERN.matcher(s).replaceAll(' ');
    s = XML_PATTERN.matcher(s).replaceAll('');
  }
  return s;
}

// Java: StringTools#hasDiacritics(String)
export function hasDiacritics(str) {
  return str !== removeDiacritics(str);
}

// Java: StringTools#removeDiacritics(String)
export function removeDiacritics(str) {
  const s = Normalizer.normalize(str, Normalizer.Form.NFD);
  return DIACRIT_MARKS.matcher(s).replaceAll('');
}

// Java: StringTools#equalsIgnoreCaseAndDiacritics(String,String)
export function equalsIgnoreCaseAndDiacritics(s1, s2) {
  if (s1 === null || s2 === null) {
    return s1 === s2;
  }
  return equalsIgnoreCase(removeDiacritics(s1), removeDiacritics(s2));
}

// Java: StringTools#normalizeNFKC(String)
export function normalizeNFKC(str) {
  return Normalizer.normalize(str, Normalizer.Form.NFKC);
}

// Java: StringTools#normalizeNFC(String)
export function normalizeNFC(str) {
  return Normalizer.normalize(str, Normalizer.Form.NFC);
}

// Java: StringTools#preserveCase(String,String)
export function preserveCase(inputString, modelString) {
  if (nn(modelString, 'String.isEmpty()', 'modelString').length === 0) {
    return inputString;
  }
  // modelString="L'" is ambiguous, apply capitalization
  if (isCapitalizedWord(modelString)) {
    return uppercaseFirstChar(toLowerCase(inputString));
  }
  if (isAllUppercase(modelString)) {
    return toUpperCase(inputString);
  }
  return inputString;
}

// Java: StringTools#preserveCaseWordByWord(String,String)
export function preserveCaseWordByWord(inputString, modelString) {
  const inputWords = javaSplit(nn(inputString, 'String.split(String, int)', 'inputString'), ' ', -1);
  const modelWords = javaSplit(nn(modelString, 'String.split(String, int)', 'modelString'), ' ', -1);
  if (inputWords.length !== modelWords.length) {
    return preserveCase(inputString, modelString);
  }
  let result = '';
  for (let i = 0; i < inputWords.length; i++) {
    if (i > 0) {
      result += ' ';
    }
    result += preserveCase(inputWords[i], modelWords[i]);
  }
  return result;
}

// Java: StringTools#asString(CharSequence)
export function asString(s) {
  if (s === null || s === undefined) {
    return null;
  }
  return String(s);
}

// Java: StringTools#isParagraphEnd(String,boolean)
export function isParagraphEnd(sentence, singleLineBreaksMarksPara) {
  let isParaEnd = false;
  if (singleLineBreaksMarksPara) {
    if (sentence.endsWith('\n') || sentence.endsWith('\n\r')) {
      isParaEnd = true;
    }
  } else if (sentence.endsWith('\n\n') || sentence.endsWith('\n\r\n\r') || sentence.endsWith('\r\n\r\n')) {
    isParaEnd = true;
  }
  return isParaEnd;
}

// Java: StringTools#containsLineBreak(String)
export function containsLineBreak(token) {
  nn(token, 'String.indexOf(int)', 'token');
  return token.indexOf('\n') >= 0
      || token.indexOf('\r') >= 0
      || token.indexOf('\f') >= 0
      || token.indexOf('\u000B') >= 0
      || token.indexOf('\u0085') >= 0
      || token.indexOf(' ') >= 0
      || token.indexOf(' ') >= 0;
}

// Java: StringTools#isAllWhitespace(String)
export function isAllWhitespace(str) {
  nn(str, 'String.length()', 'str');
  for (let i = 0; i < str.length;) {
    const codePoint = codePointAt(str, i);
    if (!isWhitespace(String.fromCodePoint(codePoint))) {
      return false;
    }
    i += Character.charCount(codePoint);
  }
  return true;
}

// Java: StringTools#loadLines(String)
export function loadLines(path) {
  const stream = getDataBroker().getFromResourceDirAsStream(path);
  const l = [];
  let text;
  try {
    text = readerToString(inputStreamReader(stream, 'UTF-8'));
  } catch (e) {
    throw new RuntimeException(`Could not load data from ${path}`, e);
  }
  for (const line of readerLines(text)) {
    if (line.length === 0 || line.charCodeAt(0) === 0x23) { // ignore comments
      continue;
    }
    l.push(line);
  }
  return Object.freeze(l);
}

// Java: StringTools#toId(String,Language)
export function toId(input, language) {
  if (language === null || language === undefined) throw npe('org.languagetool.Language.getShortCode()', 'language');
  const languageCode = language.getShortCode();
  let normalisedId;
  normalisedId = javaReplace(javaReplace(javaTrim(toUpperCase(nn(input, 'String.toUpperCase()', 'input'))), ' ', '_'), "'", '_Q_');
  // Standard toUpperCase implementation already converts ß to SS, so that'll be done for all locales and there's no
  // need to run a separate replace here.
  if (Objects.equals(languageCode, 'de')) {
    normalisedId = javaReplace(javaReplace(javaReplace(normalisedId, 'Ä', 'AE'), 'Ü', 'UE'), 'Ö', 'OE');
  }
  normalisedId = NONCHAR.matcher(normalisedId).replaceAll('_');
  return normalisedId;
}

// Java: StringTools#isCamelCase(String)
export function isCamelCase(token) {
  return javaMatches(nn(token, 'String.matches(String)', 'token'), '[a-z]+[A-Z][A-Za-z]+');
}

// Java: StringTools#isPunctuationMark(String)
export function isPunctuationMark(input) {
  return matcherOf(PUNCTUATION_PATTERN, input).matches();
}

// Java: StringTools#isPunctuationOrSymbol(String)
export function isPunctuationOrSymbol(input) {
  return matcherOf(PUNCT_AND_SYMBOL_PATTERN, input).matches();
}

// Java: StringTools#isNotWordCharacter(String)
export function isNotWordCharacter(input) {
  return matcherOf(NOT_WORD_CHARACTER, input).matches();
}

// Java: StringTools#getDifference(String,String)
export function getDifference(s1, s2) {
  const results = [];
  if (s1 === s2) {
    results.push(s1);
    results.push('');
    results.push('');
    results.push('');
    return results;
  }
  const l1 = s1.length;
  const l2 = s2.length;
  let fromStart = 0;
  while (fromStart < l1 && fromStart < l2 && s1.charCodeAt(fromStart) === s2.charCodeAt(fromStart)) {
    fromStart++;
  }
  let fromEnd = 0;
  while (fromEnd < l1 && fromEnd < l2 && s1.charCodeAt(l1 - 1 - fromEnd) === s2.charCodeAt(l2 - 1 - fromEnd)) {
    fromEnd++;
  }
  // corrections (e.g. stress vs stresses)
  while (fromStart > l1 - fromEnd) {
    fromEnd--;
  }
  while (fromStart > l2 - fromEnd) {
    fromEnd--;
  }
  // common string at start
  results.push(substring(s1, 0, fromStart));
  // diff in string1
  results.push(substring(s1, fromStart, l1 - fromEnd));
  // diff in string2
  results.push(substring(s2, fromStart, l2 - fromEnd));
  // common string at end
  results.push(substring(s1, l1 - fromEnd, l1));
  return results;
}

// Java: StringTools#makeWrong(String)
export function makeWrong(s) {
  nn(s, 'String.contains(java.lang.CharSequence)', 's');
  if (s.includes('a')) {
    return javaReplace(s, 'a', 'ä');
  }
  if (s.includes('e')) {
    return javaReplace(s, 'e', 'ë');
  }
  if (s.includes('i')) {
    return javaReplace(s, 'i', 'ï');
  }
  if (s.includes('o')) {
    return javaReplace(s, 'o', 'ö');
  }
  if (s.includes('u')) {
    return javaReplace(s, 'u', 'ù');
  }
  if (s.includes('á')) {
    return javaReplace(s, 'á', 'ä');
  }
  if (s.includes('é')) {
    return javaReplace(s, 'é', 'ë');
  }
  if (s.includes('í')) {
    return javaReplace(s, 'í', 'ï');
  }
  if (s.includes('ó')) {
    return javaReplace(s, 'ó', 'ö');
  }
  if (s.includes('ú')) {
    return javaReplace(s, 'ú', 'ù');
  }
  if (s.includes('à')) {
    return javaReplace(s, 'à', 'ä');
  }
  if (s.includes('è')) {
    return javaReplace(s, 'è', 'ë');
  }
  if (s.includes('ì')) {
    return javaReplace(s, 'ì', 'i');
  }
  if (s.includes('ò')) {
    return javaReplace(s, 'ò', 'ö');
  }
  if (s.includes('ï')) {
    return javaReplace(s, 'ï', 'ì');
  }
  if (s.includes('ü')) {
    return javaReplace(s, 'ü', 'ù');
  }
  return s + '-';
}

// Java: StringTools#removeTashkeel(String)
export function removeTashkeel(str) {
  const striped = javaReplaceAll(nn(str, 'String.replaceAll(String, String)', 'str'), '['
    + 'ً' // Fathatan
    + 'ٌ' // Dammatan
    + 'ٍ' // Kasratan
    + 'َ' // Fatha
    + 'ُ' // Damma
    + 'ِ' // Kasra
    + 'ّ' // Shadda
    + 'ْ' // Sukun
    + 'ٓ' // Maddah Above
    + 'ٔ' // Hamza Above
    + 'ٕ' // Hamza Below
    + 'ٖ' // Subscript Alef
    + 'ـ' // Tatweel
    + ']', '');
  return striped;
}

// Java: StringTools#isNotWordString(String)
export function isNotWordString(input) {
  return matcherOf(NOT_WORD_STR, input).matches();
}

// Java: StringTools#numberOf(String,String)
export function numberOf(s, t) {
  if (nn(t, 'String.isEmpty()', 't').length === 0) return 0;
  let count = 0;
  for (let i = indexOf(s, t); i >= 0; i = indexOf(s, t, i + t.length)) {
    count++;
  }
  return count;
}

// Java: StringTools#convertToTitleCaseIteratingChars(String)
export function convertToTitleCaseIteratingChars(text) {
  if (text === null || text === undefined || text.length === 0) {
    return text;
  }
  let converted = '';
  let convertNext = true;
  for (let i = 0; i < text.length; i++) {
    let ch = text.charCodeAt(i);
    if (Character.isSpaceChar(ch) || ch === 0x2d) {
      convertNext = true;
    } else if (convertNext) {
      ch = Character.toTitleCase(ch);
      convertNext = false;
    } else {
      ch = Character.toLowerCase(ch);
    }
    converted += String.fromCharCode(ch);
  }
  return converted;
}

// Java: StringTools#isEmoji(String)
export function isEmoji(word) {
  if (nn(word, 'String.length()', 'word').length > 1 && codePointCount(word, 0, word.length) !== word.length) {
    // some symbols such as emojis have a string length that equals 2
    return !WORD_FOR_SPELLER.matcher(word).matches();
  }
  return false;
}

// Java: StringTools#stringForSpeller(String)
export function stringForSpeller(s) {
  if (nn(s, 'String.length()', 's').length > 1 && codePointCount(s, 0, s.length) !== s.length) {
    const matcher = CHARS_NOT_FOR_SPELLING.matcher(s);
    while (matcher.find()) {
      const found = matcher.group(0);
      // some symbols such as emojis have a string length larger than 1
      s = javaReplace(s, found, WHITESPACE_ARRAY[found.length]);
    }
  }
  return s;
}

// Java: StringTools#splitCamelCase(String)
export function splitCamelCase(input) {
  if (isAllUppercase(input)) {
    return [input];
  }
  let word = '';
  let result = '';
  let previousIsUppercase = false;
  for (let i = 0; i < input.length; i++) {
    const currentChar = input.charCodeAt(i);
    if (Character.isUpperCase(currentChar)) {
      if (!previousIsUppercase) {
        result += word + ' ';
        word = '';
      }
      previousIsUppercase = true;
    } else {
      previousIsUppercase = false;
    }
    word += String.fromCharCode(currentChar);
  }
  result += word;
  return javaSplit(javaTrim(result), ' ');
}

// Java: StringTools#splitDigitsAtEnd(String)
export function splitDigitsAtEnd(input) {
  let lastIndex = nn(input, 'String.length()', 'input').length - 1;
  while (lastIndex >= 0 && Character.isDigit(input.charCodeAt(lastIndex))) {
    lastIndex--;
  }
  const nonDigitPart = input.substring(0, lastIndex + 1);
  const digitPart = input.substring(lastIndex + 1);
  if (nonDigitPart.length !== 0 && digitPart.length !== 0) {
    return [nonDigitPart, digitPart];
  }
  return [input];
}

// Java: StringTools#isAnagram(String,String)
export function isAnagram(string1, string2) {
  if (string1.length !== string2.length) {
    return false;
  }
  const charArray1 = Array.from({ length: string1.length }, (_, i) => string1.charCodeAt(i)).sort((a, b) => a - b);
  const charArray2 = Array.from({ length: string2.length }, (_, i) => string2.charCodeAt(i)).sort((a, b) => a - b);
  return charArray1.every((c, i) => c === charArray2[i]);
}

// Java: StringTools#isNumeric(String)
export function isNumeric(string) {
  return matcherOf(IS_NUMERIC, string).matches();
}

// Java: StringTools#trimLeadingAndTrailingSpaces(String)
export function trimLeadingAndTrailingSpaces(s) {
  return matcherOf(TRIM_PATTERN, s).replaceAll('');
}
