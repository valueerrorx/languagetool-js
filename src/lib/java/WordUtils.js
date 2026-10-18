// org.apache.commons.text.WordUtils (1.12.0): capitalize(String) only
import { isWhitespace, toTitleCase, charCount, toChars } from './Character.js';

// Java: WordUtils#capitalize(String,char...) with null delimiters (whitespace)
export function capitalize(str) {
  if (str === null || str === undefined || str.length === 0) return str;
  const strLen = str.length;
  let out = '';
  let capitalizeNext = true;
  for (let index = 0; index < strLen;) {
    const codePoint = str.codePointAt(index);
    if (isWhitespace(codePoint)) {
      capitalizeNext = true;
      out += toChars(codePoint);
      index += charCount(codePoint);
    } else if (capitalizeNext) {
      const titleCaseCodePoint = toTitleCase(codePoint);
      out += toChars(titleCaseCodePoint);
      index += charCount(titleCaseCodePoint);
      capitalizeNext = false;
    } else {
      out += toChars(codePoint);
      index += charCount(codePoint);
    }
  }
  return out;
}
