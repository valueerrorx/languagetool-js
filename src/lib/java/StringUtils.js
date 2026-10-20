// org.apache.commons.lang3.StringUtils subset used by ported code.
import { Character } from './Character.js';
import { IllegalArgumentException } from './errors.js';
import { equalsIgnoreCase as javaEqualsIgnoreCase } from './strings.js';

// Java: StringUtils#replaceOnce(String,String,String)
export function replaceOnce(text, searchString, replacement) {
  if (text === null || text === undefined || text.length === 0 || searchString === null || searchString === undefined || searchString.length === 0 || replacement === null || replacement === undefined) return text;
  const start = text.indexOf(searchString);
  if (start === -1) return text;
  return text.slice(0, start) + replacement + text.slice(start + searchString.length);
}

// Java: StringUtils#abbreviate(String,int) (= abbreviate(str, "...", 0, maxWidth); cuts UTF-16 units like Java)
export function abbreviate(str, maxWidth) {
  if (str === null || str === undefined || str.length === 0) return str;
  if (maxWidth < 4) throw new IllegalArgumentException('Minimum abbreviation width is 4');
  if (str.length <= maxWidth) return str;
  return `${str.substring(0, maxWidth - 3)}...`;
}

// Java: StringUtils#isNumeric(CharSequence) (commons-lang3 3.18: Character.isDigit per char, empty -> false)
export function isNumeric(cs) {
  if (cs === null || cs === undefined || cs.length === 0) return false;
  for (let i = 0; i < cs.length; i++) {
    if (!Character.isDigit(cs.charCodeAt(i))) return false;
  }
  return true;
}

// Java: StringUtils#isNumericSpace(CharSequence) (null -> false, empty -> true)
export function isNumericSpace(cs) {
  if (cs === null || cs === undefined) return false;
  for (let i = 0; i < cs.length; i++) {
    const nz = cs.charCodeAt(i);
    if (!Character.isDigit(nz) && nz !== 0x20) return false;
  }
  return true;
}

// Java: StringUtils#equalsAny(CharSequence,CharSequence...)
export function equalsAny(string, ...searchStrings) {
  for (const s of searchStrings) if (string === s) return true;
  return false;
}

const isEmptyCs = (cs) => cs === null || cs === undefined || cs.length === 0;

// Java: StringUtils#startsWith(CharSequence,CharSequence) (null-safe, case-sensitive)
function startsWithCs(str, prefix) {
  if (str === null || str === undefined || prefix === null || prefix === undefined) return (str ?? null) === (prefix ?? null);
  return prefix.length <= str.length && str.startsWith(prefix);
}

// Java: StringUtils#startsWithAny(CharSequence,CharSequence...) (empty sequence -> false)
export function startsWithAny(sequence, ...searchStrings) {
  if (isEmptyCs(sequence) || searchStrings.length === 0) return false;
  for (const searchString of searchStrings) {
    if (startsWithCs(sequence, searchString)) return true;
  }
  return false;
}

// Java: StringUtils#endsWith(CharSequence,CharSequence) (null-safe, case-sensitive)
export function endsWith(str, suffix) {
  if (str === null || str === undefined || suffix === null || suffix === undefined) return (str ?? null) === (suffix ?? null);
  return suffix.length <= str.length && str.endsWith(suffix);
}

// Java: StringUtils#endsWithAny(CharSequence,CharSequence...) (empty sequence -> false)
export function endsWithAny(sequence, ...searchStrings) {
  if (isEmptyCs(sequence) || searchStrings.length === 0) return false;
  for (const searchString of searchStrings) {
    if (endsWith(sequence, searchString)) return true;
  }
  return false;
}

// Java: StringUtils#containsAny(CharSequence,CharSequence...) (substring search; empty cs -> false)
export function containsAny(cs, ...searchCharSequences) {
  if (isEmptyCs(cs) || searchCharSequences.length === 0) return false;
  for (const s of searchCharSequences) {
    if (s !== null && s !== undefined && cs.includes(s)) return true;
  }
  return false;
}

// Java: StringUtils#isAlphanumeric(CharSequence) (Character.isLetterOrDigit per char, empty -> false)
export function isAlphanumeric(cs) {
  if (isEmptyCs(cs)) return false;
  for (let i = 0; i < cs.length; i++) {
    if (!Character.isLetterOrDigit(cs.charCodeAt(i))) return false;
  }
  return true;
}

// Java: StringUtils#isBlank(CharSequence) (Character.isWhitespace per char)
export function isBlank(cs) {
  if (isEmptyCs(cs)) return true;
  for (let i = 0; i < cs.length; i++) {
    if (!Character.isWhitespace(cs.charCodeAt(i))) return false;
  }
  return true;
}

// Java: StringUtils#isAllBlank(CharSequence...)
export function isAllBlank(...css) {
  for (const cs of css) {
    if (!isBlank(cs)) return false;
  }
  return true;
}

// Java: StringUtils#isWhitespace(CharSequence) (null -> false, empty -> true)
export function isWhitespace(cs) {
  if (cs === null || cs === undefined) return false;
  for (let i = 0; i < cs.length; i++) {
    if (!Character.isWhitespace(cs.charCodeAt(i))) return false;
  }
  return true;
}

// Java: StringUtils#equalsAnyIgnoreCase(CharSequence,CharSequence...)
export function equalsAnyIgnoreCase(string, ...searchStrings) {
  for (const next of searchStrings) {
    if (string === next) return true;
    if (string !== null && string !== undefined && next !== null && next !== undefined && javaEqualsIgnoreCase(string, next)) return true;
  }
  return false;
}

// Java: StringUtils#removeEnd(String,String)
export function removeEnd(str, remove) {
  if (isEmptyCs(str) || isEmptyCs(remove)) return str;
  return str.endsWith(remove) ? str.substring(0, str.length - remove.length) : str;
}

// Java: StringUtils#removeStart(String,String)
export function removeStart(str, remove) {
  if (isEmptyCs(str) || isEmptyCs(remove)) return str;
  return str.startsWith(remove) ? str.substring(remove.length) : str;
}

// Java: StringUtils#split(String,char) (adjacent separators are one separator, no empty tokens; null -> null)
export function splitByChar(str, separatorChar) {
  if (str === null || str === undefined) return null;
  const list = [];
  let start = 0;
  let match = false;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === separatorChar) {
      if (match) {
        list.push(str.substring(start, i));
        match = false;
      }
      start = i + 1;
    } else {
      match = true;
    }
  }
  if (match) list.push(str.substring(start));
  return list;
}

// Java: StringUtils#substringBefore(String,String)
export function substringBefore(str, separator) {
  if (isEmptyCs(str) || separator === null || separator === undefined) return str;
  if (separator.length === 0) return '';
  const pos = str.indexOf(separator);
  return pos === -1 ? str : str.substring(0, pos);
}

// Java: StringUtils#getDigits(String)
export function getDigits(str) {
  if (str === null || str === undefined || str.length === 0) return str;
  let out = '';
  for (let i = 0; i < str.length; i++) {
    if (Character.isDigit(str.charCodeAt(i))) out += str.charAt(i);
  }
  return out;
}

// Java: StringUtils#uncapitalize(String)
export function uncapitalize(str) {
  if (str === null || str === undefined || str.length === 0) return str;
  const first = str.codePointAt(0);
  const newCodePoint = Character.toLowerCase(first);
  if (first === newCodePoint) return str; // same result
  return String.fromCodePoint(newCodePoint) + str.substring(first > 0xffff ? 2 : 1);
}

// Java: StringUtils#isAllUpperCase(CharSequence) (Character.isUpperCase per char; null or empty -> false)
export function isAllUpperCase(cs) {
  if (cs === null || cs === undefined || cs.length === 0) return false;
  for (let i = 0; i < cs.length; i++) {
    if (!Character.isUpperCase(cs.charCodeAt(i))) return false;
  }
  return true;
}

// Java: StringUtils#isAllLowerCase(CharSequence) (Character.isLowerCase per char; null or empty -> false)
export function isAllLowerCase(cs) {
  if (cs === null || cs === undefined || cs.length === 0) return false;
  for (let i = 0; i < cs.length; i++) {
    if (!Character.isLowerCase(cs.charCodeAt(i))) return false;
  }
  return true;
}

// Java: StringUtils#capitalize(String) (first code point to title case)
export function capitalize(str) {
  if (str === null || str === undefined || str.length === 0) return str;
  const first = str.codePointAt(0);
  const newCodePoint = Character.toTitleCase(first);
  if (first === newCodePoint) return str; // same result
  return String.fromCodePoint(newCodePoint) + str.substring(first > 0xffff ? 2 : 1);
}

// Java: StringUtils#remove(String,char) (null-safe)
export function removeChar(str, ch) {
  if (str === null || str === undefined || str.length === 0 || str.indexOf(ch) === -1) return str;
  return str.split(ch).join('');
}

// Java: StringUtils#substringAfter(String,String) (null or empty str -> str, null separator -> "")
export function substringAfter(str, separator) {
  if (str === null || str === undefined || str.length === 0) return str;
  if (separator === null || separator === undefined) return '';
  const pos = str.indexOf(separator);
  if (pos === -1) return '';
  return str.substring(pos + separator.length);
}
