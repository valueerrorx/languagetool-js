// java.util.regex facade and the String regex helpers (split, replaceAll, replaceFirst, matches).
import { Pattern, Matcher } from './Pattern.js';
import { PatternSyntaxException } from '../errors.js';

export { Pattern, Matcher, PatternSyntaxException };

// Java: String#split(String,int)
export function javaSplit(s, regex, limit = 0) {
  let ch = 0;
  if (((regex.length === 1 && '.$|()[{^?*+\\'.indexOf(String.fromCharCode(ch = regex.charCodeAt(0))) === -1)
    || (regex.length === 2 && regex.charCodeAt(0) === 0x5c
      && (((ch = regex.charCodeAt(1)) - 0x30) | (0x39 - ch)) < 0 && ((ch - 0x61) | (0x7a - ch)) < 0 && ((ch - 0x41) | (0x5a - ch)) < 0))
    && (ch < 0xd800 || ch > 0xdfff)) {
    // fast path of String#split for a single non-meta character
    const sep = String.fromCharCode(ch);
    let off = 0;
    let next;
    const limited = limit > 0;
    const list = [];
    while ((next = s.indexOf(sep, off)) !== -1) {
      if (!limited || list.length < limit - 1) {
        list.push(s.substring(off, next));
        off = next + 1;
      } else { // last one
        const last = s.length;
        list.push(s.substring(off, last));
        off = last;
        break;
      }
    }
    // If no match was found, return this
    if (off === 0) return [s];
    // Add remaining segment
    if (!limited || list.length < limit) list.push(s.substring(off));
    // Construct result
    let resultSize = list.length;
    if (limit === 0) while (resultSize > 0 && list[resultSize - 1].length === 0) resultSize--;
    return list.slice(0, resultSize);
  }
  return Pattern.compile(regex, 0).split(s, limit);
}

// Java: String#replaceAll(String,String)
export function javaReplaceAll(s, regex, replacement) {
  return Pattern.compile(regex, 0).matcher(s).replaceAll(replacement);
}

// Java: String#replaceFirst(String,String)
export function javaReplaceFirst(s, regex, replacement) {
  return Pattern.compile(regex, 0).matcher(s).replaceFirst(replacement);
}

// Java: String#matches(String)
export function javaMatches(s, regex) {
  return Pattern.matches(regex, s);
}
