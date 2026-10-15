// Port of net.loomchild.segment.util.Util (regex helpers only) and XmlException.
import { RuntimeException } from '../java/errors.js';
import { Pattern } from '../java/regex/index.js';

// Java: net.loomchild.segment.util.XmlException
export class XmlException extends RuntimeException {
  static FQCN = 'net.loomchild.segment.util.XmlException';
}

const STAR_PATTERN = Pattern.compile('(?<=(?<!\\\\)(?:\\\\\\\\){0,100})\\*');
const PLUS_PATTERN = Pattern.compile('(?<=(?<!\\\\)(?:\\\\\\\\){0,100})(?<![\\?\\*\\+]|\\{[0-9],?[0-9]?\\}?\\})\\+');
const RANGE_PATTERN = Pattern.compile('(?<=(?<!\\\\)(?:\\\\\\\\){0,100})\\{\\s*([0-9]+)\\s*,\\s*\\}');

let defaultPatternFlags = 0; // Java: Util#defaultPatternFlags (static, set by SrxTextIterator)

// Java: Util#removeBlockQuotes(String)
export function removeBlockQuotes(regex) {
  let sb = '';
  let inQuote = false;
  let prev = 0;
  for (let i = 0; i < regex.length; i++) {
    const c = regex.charCodeAt(i);
    if (inQuote) {
      if (prev === 92 && c === 69) {
        inQuote = false;
        sb = sb.slice(0, Math.max(0, sb.length - 2)); // StringBuilder#delete(len-2, len)
      } else {
        sb += '\\' + String.fromCharCode(c);
      }
    } else if (prev === 92 && c === 81) {
      inQuote = true;
      sb = sb.slice(0, sb.length - 1); // StringBuilder#deleteCharAt(len-1)
    } else {
      sb += String.fromCharCode(c);
    }
    prev = c;
  }
  return sb;
}

// Java: Util#finitize(String,int)
export function finitize(regex, maxLength) {
  let result = removeBlockQuotes(regex);
  result = STAR_PATTERN.matcher(result).replaceAll(`{0,${maxLength}}`);
  result = PLUS_PATTERN.matcher(result).replaceAll(`{1,${maxLength}}`);
  result = RANGE_PATTERN.matcher(result).replaceAll(`{$1,${maxLength}}`);
  return result;
}

// Java: Util#setDefaultPatternFlags(int)
export function setDefaultPatternFlags(flags) {
  defaultPatternFlags = flags;
}

// Java: Util#compile(SrxDocument,String)
export function compile(document, regex) {
  const key = `PATTERN_${regex}`;
  let pattern = document.getCache().get(key);
  if (pattern === null) {
    pattern = Pattern.compile(regex, defaultPatternFlags);
    document.getCache().put(key, pattern);
  }
  return pattern;
}
