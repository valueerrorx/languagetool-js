// org.apache.commons.lang3.StringUtils subset used by ported code.
import { IllegalArgumentException } from './errors.js';

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
