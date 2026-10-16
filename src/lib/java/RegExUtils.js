// org.apache.commons.lang3.RegExUtils subset used by ported code (patterns go through the Java regex translator).
import { Pattern } from './regex/index.js';

// Java: RegExUtils#removePattern(CharSequence,String) (= replacePattern(text, regex, ""), compiled with DOTALL)
export function removePattern(text, regex) {
  if (text === null || text === undefined || regex === null || regex === undefined) return text ?? null;
  return Pattern.compile(regex, Pattern.DOTALL).matcher(text).replaceAll('');
}

// Java: RegExUtils#replaceFirst(String,String,String) (= text.replaceFirst(regex, replacement))
export function replaceFirst(text, regex, replacement) {
  if (text === null || text === undefined || regex === null || regex === undefined || replacement === null || replacement === undefined) return text;
  return Pattern.compile(regex).matcher(text).replaceFirst(replacement);
}
