// Java: org.languagetool.rules.patterns.StringMatcher (text pattern + matching modes incl. fast paths)
import { checkInterrupted } from '../tools/InterruptibleCharSequence.js';
import { Pattern, PatternSyntaxException } from '../../lib/java/regex/index.js';
import { AssertionError, RuntimeException, NullPointerException, NumberFormatException } from '../../lib/java/errors.js';
import { Integer } from '../../lib/java/int.js';
import {
  getType, charCount, isLetterOrDigit, isLetter, isSurrogate, toLowerCase, toUpperCase, UPPERCASE_LETTER, LOWERCASE_LETTER,
  TITLECASE_LETTER, DECIMAL_DIGIT_NUMBER, OTHER_NUMBER, DASH_PUNCTUATION, OTHER_PUNCTUATION, INITIAL_QUOTE_PUNCTUATION, FINAL_QUOTE_PUNCTUATION,
} from '../../lib/java/Character.js';
import { CASE_INSENSITIVE_ORDER, equalsIgnoreCase, charAt, codePointAt } from '../../lib/java/strings.js';
import { JavaHashSet } from '../../lib/java/collections/JavaHashSet.js';
import { unmodifiableSet } from '../../lib/java/collections/Collections.js';
import { Substrings } from './Substrings.js';

// Java: StringMatcher#MAX_MATCH_LENGTH
const MAX_MATCH_LENGTH = 250;

// Java: StringMatcher.TooComplexRegexp (singleton, no stack)
class TooComplexRegexp extends RuntimeException {}
const TOO_COMPLEX = new TooComplexRegexp();

// Java: Arrays#binarySearch(Object[],Object,Comparator)
function binarySearch(a, key, cmp) {
  let low = 0;
  let high = a.length - 1;
  while (low <= high) {
    const mid = (low + high) >>> 1;
    const c = cmp(a[mid], key);
    if (c < 0) low = mid + 1;
    else if (c > 0) high = mid - 1;
    else return mid;
  }
  return -(low + 1);
}

// Java: Guava 33.5.0 Maps#capacity(int)
function guavaCapacity(expectedSize) {
  if (expectedSize < 3) return expectedSize + 1;
  if (expectedSize < 1073741824) return Math.ceil(expectedSize / 0.75);
  return 2147483647;
}

// Java: StringMatcher
export class StringMatcher {
  static MAX_MATCH_LENGTH = MAX_MATCH_LENGTH;

  // Java: StringMatcher(String,boolean,boolean) (private; subclasses are the anonymous classes below)
  constructor(pattern, isRegExp, caseSensitive) {
    if (pattern === null || pattern === undefined) throw new NullPointerException(); // Java: StringInterner.intern(null)
    this.pattern = pattern;
    this.caseSensitive = caseSensitive;
    this.isRegExp = isRegExp;
  }

  // Java: StringMatcher#getPossibleValues() (abstract)
  getPossibleValues() {
    throw new RuntimeException('abstract');
  }

  // Java: StringMatcher#matches(String) (abstract)
  matches() {
    throw new RuntimeException('abstract');
  }

  // Java: StringMatcher#regexp(String)
  static regexp(pattern) {
    return StringMatcher.create(pattern, true, true);
  }

  // Java: StringMatcher#create(String,boolean,boolean)
  static create(pattern, isRegExp, caseSensitive) {
    if (!isRegExp || pattern === '\\0') {
      return stringEquals(pattern, isRegExp, caseSensitive);
    }

    if (pattern === '\\p{P}') {
      return punctuationMatcher(pattern, caseSensitive);
    }

    // always compile the pattern to check it's well-formed
    const compiled = Pattern.compile(pattern, caseSensitive ? 0 : Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);

    const possibleRegexpValues = StringMatcher.getPossibleRegexpValues(pattern);
    if (possibleRegexpValues !== null) {
      const set = new JavaHashSet();
      for (const v of possibleRegexpValues) set.add(v);
      if (set.size() === 1) {
        return stringEquals([...set][0], true, caseSensitive);
      }
      if (!caseSensitive) {
        const sorted = [...set];
        sorted.sort(CASE_INSENSITIVE_ORDER);
        const m = new StringMatcher(pattern, true, false);
        m.getPossibleValues = () => {
          const hs = new JavaHashSet(guavaCapacity(sorted.length));
          for (const s of sorted) hs.add(s);
          return hs;
        };
        m.matches = (s) => {
          if (s.length > MAX_MATCH_LENGTH) {
            return false;
          }
          return binarySearch(sorted, s, CASE_INSENSITIVE_ORDER) >= 0;
        };
        return m;
      }
      const m = new StringMatcher(pattern, true, true);
      m.getPossibleValues = () => unmodifiableSet(set);
      m.matches = (s) => {
        if (s.length > MAX_MATCH_LENGTH) {
          return false;
        }
        return set.contains(s);
      };
      return m;
    }

    const sequenceMatcher = tryCreateSequenceMatcher(pattern, caseSensitive, compiled);
    if (sequenceMatcher !== null) {
      return sequenceMatcher;
    }

    const required = StringMatcher.getRequiredSubstrings(pattern);
    const exhaustive = required === null ? null : required.checkCanReplaceRegex(pattern);
    const substringsAreSufficient = exhaustive !== null;
    const substrings = substringsAreSufficient ? exhaustive : required;

    const m = new StringMatcher(pattern, true, caseSensitive);
    m.getPossibleValues = () => null;
    m.matches = (s) => {
      if (s.length > MAX_MATCH_LENGTH) {
        return false;
      }
      if (substrings !== null && !substrings.matches(s, caseSensitive)) return false;
      if (substringsAreSufficient) return true;
      checkInterrupted(s);
      return compiled.matcher(s).matches();
    };
    return m;
  }

  // Java: StringMatcher#createWithKnownValues(String,boolean,boolean,Supplier)
  static createWithKnownValues(pattern, isRegExp, caseSensitive, possibleValuesUniverseSupplier) {
    if (isRegExp) {
      if (possibleValuesUniverseSupplier !== null && possibleValuesUniverseSupplier !== undefined) {
        const universe = possibleValuesUniverseSupplier();
        if (universe !== null && universe !== undefined && universe.size !== 0) {
          const matching = intersectWithUniverse(pattern, caseSensitive, universe);
          if (matching !== null) {
            return enumeratedSetMatcher(pattern, caseSensitive, matching);
          }
        }
      }
      const postagTemplateMatcher = tryCreatePostagTemplateMatcher(pattern, caseSensitive);
      if (postagTemplateMatcher !== null) {
        return postagTemplateMatcher;
      }
      const hybrid = tryCreateHybridPostagMatcher(pattern, caseSensitive, possibleValuesUniverseSupplier);
      if (hybrid !== null) {
        return hybrid;
      }
    }
    return StringMatcher.create(pattern, isRegExp, caseSensitive);
  }

  // Java: StringMatcher#getRequiredSubstrings(String)
  static getRequiredSubstrings(regexp) {
    const UNKNOWN = new Substrings(false, false, []);

    const parser = new RegexpParser(regexp, {
      handleConcatenation: (left, right) => left.concat(right),
      handleOr: () => UNKNOWN,
      optional: () => UNKNOWN,
      unknown: () => UNKNOWN,
      literal: (literal) => new Substrings(true, true, [literal]),
    });
    try {
      const result = parser.disjunction();
      return result.substrings.length === 0 ? null : result;
    } catch (e) {
      if (e instanceof TooComplexRegexp) return null;
      throw e;
    }
  }

  // Java: StringMatcher#getPossibleRegexpValues(String); streams modelled as re-iterable thunks
  static getPossibleRegexpValues(regexp) {
    const parser = new RegexpParser(regexp, {
      handleConcatenation: (left, right) => {
        const groupResults = [...right()];
        return function* concat() {
          for (const s1 of left()) for (const s2 of groupResults) yield s1 + s2;
        };
      },
      handleOr: (components) => function* or() {
        for (const c of components) yield* c();
      },
      optional: (groupResults, op) => {
        if (op === '?') {
          return function* opt() {
            yield '';
            yield* groupResults();
          };
        }
        return parser.callbacks.unknown();
      },
      unknown: () => {
        throw TOO_COMPLEX;
      },
      literal: (literal) => () => [literal],
    });
    try {
      const result = new JavaHashSet();
      for (const s of parser.disjunction()()) result.add(s);
      return result;
    } catch (e) {
      if (e instanceof TooComplexRegexp) return null;
      throw e;
    }
  }
}

// Java: StringMatcher#PROPERTY_PREDICATES
const PROPERTY_PREDICATES = new Map([
  ['L', (cp) => isLetter(cp)],
  ['Ll', (cp) => getType(cp) === LOWERCASE_LETTER],
  ['Lu', (cp) => getType(cp) === UPPERCASE_LETTER],
  ['N', (cp) => getType(cp) >= DECIMAL_DIGIT_NUMBER && getType(cp) <= OTHER_NUMBER],
  ['P', (cp) => isPunctuation(cp)],
]);

// Java: StringMatcher#isLineTerminator(int)
function isLineTerminator(cp) {
  return cp === 0x0a || cp === 0x0d || cp === 0x85 || cp === 0x2028 || cp === 0x2029;
}

// Java: StringMatcher#ANY_CODE_POINT / ASCII_DIGIT / ASCII_WORD / ASCII_SPACE
const ANY_CODE_POINT = (cp) => !isLineTerminator(cp);
const ASCII_DIGIT = (cp) => cp >= 0x30 && cp <= 0x39;
const ASCII_WORD = (cp) => (cp >= 0x61 && cp <= 0x7a) || (cp >= 0x41 && cp <= 0x5a) || (cp >= 0x30 && cp <= 0x39) || cp === 0x5f;
const ASCII_SPACE = (cp) => cp === 0x20 || cp === 0x09 || cp === 0x0a || cp === 0x0b || cp === 0x0c || cp === 0x0d;

// Java: StringMatcher#tryCreateSequenceMatcher(String,boolean,Pattern)
function tryCreateSequenceMatcher(pattern, caseSensitive, regexFallback) {
  let regexp = pattern;
  let effectiveCaseSensitive = caseSensitive;
  // A leading inline flag that disables case-insensitivity applies to the rest of the pattern.
  if (regexp.startsWith('(?-i)')) {
    regexp = regexp.substring(5);
    effectiveCaseSensitive = true;
  }
  const alternatives = parseAlternatives(regexp, effectiveCaseSensitive);
  if (alternatives === null) {
    return null;
  }
  const runAlternatives = [];
  for (const terms of alternatives) {
    const runAlternative = toRunAlternative(terms);
    if (runAlternative === null) {
      return null; // more than one quantified atom: let java.util.regex handle it
    }
    runAlternatives.push(runAlternative);
  }
  // Built with the original case-sensitivity flag; the effective flag is baked into the predicates.
  return runSequenceMatcher(pattern, caseSensitive, runAlternatives, regexFallback);
}

const EMPTY_PREDICATES = [];

// Java: StringMatcher#toRunAlternative(List)
function toRunAlternative(terms) {
  let runIndex = -1;
  for (let i = 0; i < terms.length; i++) {
    const term = terms[i];
    if (term.min !== 1 || term.max !== 1) {
      if (runIndex >= 0) {
        return null;
      }
      runIndex = i;
    }
  }
  if (runIndex < 0) {
    const all = new Array(terms.length);
    for (let i = 0; i < terms.length; i++) {
      all[i] = toCharPredicate(terms[i].predicate);
    }
    return new RunAlternative(all, null, 0, 0, EMPTY_PREDICATES);
  }
  const prefix = new Array(runIndex);
  for (let i = 0; i < runIndex; i++) {
    prefix[i] = toCharPredicate(terms[i].predicate);
  }
  const run = terms[runIndex];
  const suffix = new Array(terms.length - runIndex - 1);
  for (let i = 0; i < suffix.length; i++) {
    suffix[i] = toCharPredicate(terms[runIndex + 1 + i].predicate);
  }
  return new RunAlternative(prefix, toCharPredicate(run.predicate), run.min, run.max, suffix);
}

// Java: StringMatcher#toCharPredicate(IntPredicate)
function toCharPredicate(predicate) {
  const ascii = new Array(128);
  for (let c = 0; c < ascii.length; c++) {
    ascii[c] = predicate(c);
  }
  return new CharPredicate(ascii, predicate);
}

// Java: StringMatcher#parseAlternatives(String,boolean)
function parseAlternatives(regexp, caseSensitive) {
  let r = regexp;
  if (r.startsWith('\\b')) {
    return null; // \b semantics depend on the first char; let java.util.regex handle it
  }
  if (r.startsWith('^')) {
    r = r.substring(1);
  }
  if (r.endsWith('\\b') && !r.endsWith('\\\\b')) {
    return null;
  }
  if (r.endsWith('$') && !r.endsWith('\\$')) {
    r = r.substring(0, r.length - 1);
  }
  const parts = splitTopLevelAlternatives(r);
  if (parts === null) {
    return null;
  }
  const result = [];
  for (const part of parts) {
    const terms = parseSequence(part, caseSensitive);
    if (terms === null) {
      return null;
    }
    result.push(terms);
  }
  return result;
}

// Java: StringMatcher#parseSequence(String,boolean)
function parseSequence(s, caseSensitive) {
  const terms = [];
  let pos = 0;
  const len = s.length;
  while (pos < len) {
    const c = s.charAt(pos);
    let predicate;
    let next;
    if (c === '\\') {
      if (pos + 1 >= len) return null;
      const escaped = s.charAt(pos + 1);
      if (escaped === 'p') {
        if (pos + 2 >= len || s.charAt(pos + 2) !== '{') return null;
        const close = s.indexOf('}', pos + 3);
        if (close < 0) return null;
        const base = PROPERTY_PREDICATES.get(s.substring(pos + 3, close)) ?? null;
        if (base === null) return null;
        const name = s.substring(pos + 3, close);
        predicate = caseSensitive ? base : caseInsensitivePredicate(name, base);
        next = close + 1;
      } else if (escaped === 'd') {
        predicate = ASCII_DIGIT;
        next = pos + 2;
      } else if (escaped === 'w') {
        predicate = ASCII_WORD;
        next = pos + 2;
      } else if (escaped === 's') {
        predicate = ASCII_SPACE;
        next = pos + 2;
      } else if (isLetterOrDigit(escaped.charCodeAt(0))) {
        return null; // \b, \n, \1, ... not supported
      } else {
        predicate = literalPredicate(escaped, caseSensitive);
        next = pos + 2;
      }
    } else if (c === '.') {
      predicate = ANY_CODE_POINT;
      next = pos + 1;
    } else if (c === '[') {
      const close = findCharClassEnd(s, pos);
      if (close < 0) return null;
      const classPredicate = parseCharClassPredicate(s, pos + 1, close, caseSensitive);
      if (classPredicate === null) return null;
      predicate = classPredicate;
      next = close + 1;
    } else if (c === '(' || c === ')' || c === '*' || c === '+' || c === '?' || c === '{' || c === '}'
               || c === '^' || c === '$' || c === '|' || c === ']') {
      return null;
    } else {
      predicate = literalPredicate(c, caseSensitive);
      next = pos + 1;
    }
    let min = 1;
    let max = 1;
    if (next < len) {
      const q = s.charAt(next);
      if (q === '?') {
        min = 0;
        next++;
      } else if (q === '*') {
        min = 0;
        max = 2147483647;
        next++;
      } else if (q === '+') {
        max = 2147483647;
        next++;
      } else if (q === '{') {
        const close = s.indexOf('}', next + 1);
        if (close < 0) return null;
        const bounds = parseOccurrenceBounds(s.substring(next + 1, close));
        if (bounds === null) return null;
        min = bounds[0];
        max = bounds[1];
        next = close + 1;
      }
      if (next < len) {
        const lazy = s.charAt(next);
        if (lazy === '?') {
          next++; // lazy quantifier accepts the same strings as a greedy one for a full match
        } else if (lazy === '+') {
          return null; // possessive quantifier changes which strings are accepted
        }
      }
    }
    terms.push(new IntTerm(predicate, min, max));
    pos = next;
  }
  return terms;
}

// Java: StringMatcher#parseOccurrenceBounds(String)
function parseOccurrenceBounds(body) {
  const comma = body.indexOf(',');
  try {
    if (comma < 0) {
      const n = Integer.parseInt(body);
      return [n, n];
    }
    const min = body.substring(0, comma).length === 0 ? 0 : Integer.parseInt(body.substring(0, comma));
    const maxPart = body.substring(comma + 1);
    const max = maxPart.length === 0 ? 2147483647 : Integer.parseInt(maxPart);
    if (min > max) return null;
    return [min, max];
  } catch (e) {
    if (e instanceof NumberFormatException) return null;
    throw e;
  }
}

// Java: StringMatcher#findCharClassEnd(String,int)
function findCharClassEnd(s, start) {
  let i = start + 1;
  const len = s.length;
  if (i < len && s.charAt(i) === '^') {
    i++;
  }
  if (i < len && s.charAt(i) === ']') {
    i++; // a ']' in the first position is a literal
  }
  while (i < len) {
    const c = s.charAt(i);
    if (c === '\\') {
      i += 2;
      continue;
    }
    if (c === ']') {
      return i;
    }
    if (c === '[') {
      return -1; // nested classes are not supported
    }
    i++;
  }
  return -1;
}

// Java: StringMatcher#parseCharClassPredicate(String,int,int,boolean)
function parseCharClassPredicate(s, start, end, caseSensitive) {
  if (s.substring(start, end).includes('&&')) {
    return null; // class intersection is not supported
  }
  let negated = false;
  let i = start;
  if (i < end && s.charAt(i) === '^') {
    negated = true;
    i++;
  }
  const ranges = [];
  const singles = [];
  const extras = [];
  while (i < end) {
    let c = s.charCodeAt(i);
    if (s.charAt(i) === '\\') {
      if (i + 1 >= end) return null;
      const escaped = s.charAt(i + 1);
      if (escaped === 'd') {
        extras.push(ASCII_DIGIT);
        i += 2;
        continue;
      }
      if (escaped === 'w') {
        extras.push(ASCII_WORD);
        i += 2;
        continue;
      }
      if (escaped === 's') {
        extras.push(ASCII_SPACE);
        i += 2;
        continue;
      }
      if (isLetterOrDigit(escaped.charCodeAt(0))) {
        return null;
      }
      c = escaped.charCodeAt(0);
      i += 2;
    } else {
      i++;
    }
    if (i < end - 1 && s.charAt(i) === '-') {
      let rangeEnd = s.charCodeAt(i + 1);
      let afterRange = i + 2;
      if (s.charAt(i + 1) === '\\') {
        if (i + 2 >= end) return null;
        const escapedEnd = s.charAt(i + 2);
        if (isLetterOrDigit(escapedEnd.charCodeAt(0))) return null;
        rangeEnd = escapedEnd.charCodeAt(0);
        afterRange = i + 3;
      }
      if (rangeEnd < c || rangeEnd - c > MAX_CLASS_RANGE_WIDTH) {
        return null;
      }
      ranges.push([c, rangeEnd]);
      i = afterRange;
    } else {
      singles.push(c);
    }
  }
  const sortedSingles = new Set(singles); // Java: sorted int[] + binarySearch (membership only)
  const neg = negated;
  return (cp) => {
    let member = containsInClass(cp, ranges, sortedSingles, extras);
    if (!caseSensitive) {
      member = member
        || containsInClass(toLowerCase(cp), ranges, sortedSingles, extras)
        || containsInClass(toUpperCase(cp), ranges, sortedSingles, extras);
    }
    return neg !== member;
  };
}

// Java: StringMatcher#containsInClass(int,List,int[],List)
function containsInClass(cp, ranges, sortedSingles, extras) {
  for (const range of ranges) {
    if (cp >= range[0] && cp <= range[1]) {
      return true;
    }
  }
  if (cp <= 0xffff && sortedSingles.has(cp)) {
    return true;
  }
  for (const extra of extras) {
    if (extra(cp)) {
      return true;
    }
  }
  return false;
}

// Java: StringMatcher#literalPredicate(char,boolean)
function literalPredicate(ch, caseSensitive) {
  const c = ch.charCodeAt(0);
  if (caseSensitive) {
    return (cp) => cp === c;
  }
  const lower = toLowerCase(c);
  const upper = toUpperCase(c);
  return (cp) => cp === c || toLowerCase(cp) === lower || toUpperCase(cp) === upper;
}

// Java: StringMatcher#caseInsensitivePredicate(String,IntPredicate); mirrors java.util.regex CharPredicates.forProperty(name, caseIns=true)
function caseInsensitivePredicate(name, base) {
  if (name === 'Lu' || name === 'Ll') {
    return (cp) => {
      const t = getType(cp);
      return t === UPPERCASE_LETTER || t === LOWERCASE_LETTER || t === TITLECASE_LETTER;
    };
  }
  return base;
}

// Java: StringMatcher.IntTerm
class IntTerm {
  constructor(predicate, min, max) {
    this.predicate = predicate;
    this.min = min;
    this.max = max;
  }
}

// Java: StringMatcher.CharPredicate
class CharPredicate {
  constructor(ascii, fallback) {
    this.ascii = ascii;
    this.fallback = fallback;
  }

  // Java: StringMatcher.CharPredicate#test(char); c is a UTF-16 code unit
  test(c) {
    return c < 128 ? this.ascii[c] : this.fallback(c);
  }
}

// Java: StringMatcher.RunAlternative
class RunAlternative {
  constructor(prefix, run, runMin, runMax, suffix) {
    this.prefix = prefix;
    this.run = run; // null if there is no quantified atom
    this.runMin = runMin;
    this.runMax = runMax;
    this.suffix = suffix;
  }
}

// Java: StringMatcher.RunSequenceMatcher
function runSequenceMatcher(pattern, caseSensitive, alternatives, regexFallback) {
  const m = new StringMatcher(pattern, true, caseSensitive);
  m.getPossibleValues = () => null;
  m.matches = (s) => {
    const len = s.length;
    if (len > MAX_MATCH_LENGTH) {
      return false;
    }
    if (containsSurrogate(s, len)) {
      checkInterrupted(s);
      return regexFallback.matcher(s).matches();
    }
    for (const alt of alternatives) {
      if (matchesAlternative(alt, s, len)) {
        return true;
      }
    }
    return false;
  };
  return m;
}

// Java: StringMatcher.RunSequenceMatcher#containsSurrogate(String,int)
function containsSurrogate(s, len) {
  for (let i = 0; i < len; i++) {
    if (isSurrogate(s.charCodeAt(i))) {
      return true;
    }
  }
  return false;
}

// Java: StringMatcher.RunSequenceMatcher#matchesAlternative(RunAlternative,String,int)
function matchesAlternative(alt, s, len) {
  let i = 0;
  const prefix = alt.prefix;
  for (let k = 0; k < prefix.length; k++) {
    if (i >= len || !prefix[k].test(s.charCodeAt(i))) {
      return false;
    }
    i++;
  }
  const run = alt.run;
  if (run === null) {
    if (len - i !== alt.suffix.length) {
      return false;
    }
    return suffixMatches(alt.suffix, s, i);
  }
  let maxEnd = i;
  while (maxEnd < len && run.test(s.charCodeAt(maxEnd))) {
    maxEnd++;
  }
  const runCount = maxEnd - i;
  if (alt.suffix.length === 0) {
    return maxEnd === len && runCount >= alt.runMin && runCount <= alt.runMax;
  }
  const upper = Math.min(runCount, alt.runMax);
  for (let rc = upper; rc >= alt.runMin; rc--) {
    const pos = i + rc;
    if (len - pos === alt.suffix.length && suffixMatches(alt.suffix, s, pos)) {
      return true;
    }
  }
  return false;
}

// Java: StringMatcher.RunSequenceMatcher#suffixMatches(CharPredicate[],String,int)
function suffixMatches(suffix, s, pos) {
  for (let k = 0; k < suffix.length; k++) {
    if (!suffix[k].test(s.charCodeAt(pos + k))) {
      return false;
    }
  }
  return true;
}

// Java: StringMatcher#tryCreatePostagTemplateMatcher(String,boolean)
function tryCreatePostagTemplateMatcher(pattern, caseSensitive) {
  const alt = parsePostagAlternatives(pattern);
  if (alt === null) {
    return null;
  }
  const m = new StringMatcher(pattern, true, caseSensitive);
  m.getPossibleValues = () => null;
  m.matches = (s) => {
    if (s.length > MAX_MATCH_LENGTH) {
      return false;
    }
    return alt.matches(s);
  };
  return m;
}

// Java: StringMatcher#parsePostagAlternatives(String)
function parsePostagAlternatives(regexp) {
  if (regexp.indexOf('(') >= 0 || regexp.indexOf(')') >= 0) {
    return null;
  }
  const parts = splitTopLevelAlternatives(regexp);
  if (parts === null) {
    return null;
  }
  const templates = new Array(parts.length);
  for (let i = 0; i < parts.length; i++) {
    const t = parseSingleTemplate(parts[i]);
    if (t === null) {
      return null;
    }
    templates[i] = t;
  }
  return { matches: (s) => templates.some((t) => t.matches(s)) }; // PostagAlternatives
}

// Java: StringMatcher#splitTopLevelAlternatives(String)
function splitTopLevelAlternatives(regexp) {
  const parts = [];
  let start = 0;
  let bracketDepth = 0;
  for (let i = 0; i < regexp.length; i++) {
    const c = regexp.charAt(i);
    if (c === '[') {
      bracketDepth++;
    } else if (c === ']') {
      if (bracketDepth === 0) return null; // malformed class
      bracketDepth--;
    } else if (c === '|' && bracketDepth === 0) {
      parts.push(regexp.substring(start, i));
      start = i + 1;
    }
  }
  if (bracketDepth !== 0) return null;
  parts.push(regexp.substring(start));
  return parts;
}

// Java: StringMatcher$PositionMatcher (allowed = array of UTF-16 units, null = any char)
class PositionMatcher {
  // Java: PositionMatcher#PositionMatcher(char[])
  constructor(allowed) {
    this.allowed = allowed;
  }

  // Java: PositionMatcher#test(char)
  test(c) {
    if (this.allowed === null) return true;
    for (const a of this.allowed) if (a === c) return true;
    return false;
  }
}
PositionMatcher.WILDCARD = new PositionMatcher(null);

// Java: StringMatcher#parseSingleTemplate(String)
function parseSingleTemplate(s) {
  const positions = [];
  let pos = 0;
  const len = s.length;
  let anyTail = false;

  while (pos < len) {
    const c = s.charAt(pos);

    if (c === '.' && pos + 1 < len && s.charAt(pos + 1) === '*' && pos + 2 === len) {
      anyTail = true;
      break; // ".*" must be the very end of the alternative
    }
    if (c === '.') {
      positions.push(PositionMatcher.WILDCARD);
      pos++;
      continue;
    }
    if (c === '[') {
      const close = s.indexOf(']', pos + 1);
      if (close < 0) return null;
      const options = parseCharClass(s, pos + 1, close);
      if (options === null) return null;
      positions.push(new PositionMatcher(options));
      pos = close + 1;
      continue;
    }
    if ('\\^${}*+?'.indexOf(c) >= 0) {
      return null; // outside our grammar -> fall back to full regex
    }
    positions.push(new PositionMatcher([c]));
    pos++;
  }

  if (positions.length === 0) {
    return null;
  }
  // PostagTemplate: anyTail true = "...*" (length >= positions.length), false = exact length
  return {
    matches: (str) => {
      const n = positions.length;
      if (anyTail ? str.length < n : str.length !== n) {
        return false;
      }
      for (let i = 0; i < n; i++) {
        if (!positions[i].test(str.charAt(i))) return false;
      }
      return true;
    },
  };
}

const MAX_CLASS_RANGE_WIDTH = 64;

// Java: StringMatcher#parseCharClass(String,int,int)
function parseCharClass(s, start, end) {
  if (start >= end || s.charAt(start) === '^') {
    return null; // empty or negated class -> unsupported
  }
  const options = [];
  let i = start;
  while (i < end) {
    const c1 = s.charAt(i);
    if (c1 === '-' && i !== start && i + 1 < end) {
      const last = options[options.length - 1].charCodeAt(0);
      const next = s.charCodeAt(i + 1);
      if (next < last || next - last > MAX_CLASS_RANGE_WIDTH) return null;
      for (let c = last + 1; c <= next; c++) options.push(String.fromCharCode(c));
      i += 2;
      continue;
    }
    options.push(c1);
    i++;
  }
  return options;
}

// Java: StringMatcher#MAX_ENUMERATED_POSTAGS
const MAX_ENUMERATED_POSTAGS = 30;

// Java: StringMatcher#enumeratedSetMatcher(String,boolean,Set)
function enumeratedSetMatcher(pattern, caseSensitive, set) {
  const interned = new JavaHashSet();
  for (const s of set) {
    interned.add(s);
  }
  const m = new StringMatcher(pattern, true, caseSensitive);
  m.getPossibleValues = () => unmodifiableSet(interned);
  m.matches = (s) => {
    if (s.length > MAX_MATCH_LENGTH) {
      return false;
    }
    return interned.contains(s);
  };
  return m;
}

// Java: StringMatcher#intersectWithUniverse(String,boolean,Set)
function intersectWithUniverse(pattern, caseSensitive, universe) {
  let compiled;
  try {
    compiled = Pattern.compile(pattern, caseSensitive ? 0 : Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
  } catch (e) {
    if (e instanceof PatternSyntaxException) return null;
    throw e;
  }
  const matching = new JavaHashSet();
  for (const candidate of universe) {
    if (compiled.matcher(candidate).matches()) {
      matching.add(candidate);
      if (matching.size() > MAX_ENUMERATED_POSTAGS) {
        return null; // too generic to enumerate
      }
    }
  }
  return matching.isEmpty() ? null : matching;
}

// Java: StringMatcher#tryCreateHybridPostagMatcher(String,boolean,Supplier)
function tryCreateHybridPostagMatcher(pattern, caseSensitive, universeSupplier) {
  if (pattern.indexOf('(') >= 0 || pattern.indexOf(')') >= 0) {
    return null;
  }
  const parts = splitTopLevelAlternatives(pattern);
  if (parts === null) {
    return null;
  }

  const templates = [];
  const literals = new Set();
  const unresolved = [];

  for (const part of parts) {
    if (isPlainLiteral(part)) {
      literals.add(part);
      continue;
    }
    const t = parseSingleTemplate(part);
    if (t !== null) {
      templates.push(t);
    } else {
      unresolved.push(part);
    }
  }

  if (templates.length === 0 && literals.size === 0 && unresolved.length === 0) {
    return null;
  }

  const unresolvedJoined = unresolved.length === 0 ? null : unresolved.join('|');
  return hybridPostagMatcher(pattern, caseSensitive, literals, templates, unresolvedJoined, universeSupplier);
}

// Java: StringMatcher#isPlainLiteral(String)
function isPlainLiteral(s) {
  if (s.length === 0) return false;
  for (let i = 0; i < s.length; i++) {
    if ('.[]{}*+?^$\\'.indexOf(s.charAt(i)) >= 0) return false;
  }
  return true;
}

// Java: StringMatcher.HybridPostagMatcher
function hybridPostagMatcher(pattern, caseSensitive, literals, templates, unresolvedRegexp, universeSupplier) {
  let unresolvedResolved = null; // Set (enumerated) or Pattern (fallback), computed once
  const m = new StringMatcher(pattern, true, caseSensitive);
  m.getPossibleValues = () => null;
  // Java: HybridPostagMatcher#resolveUnresolved()
  const resolveUnresolved = () => {
    if (universeSupplier !== null && universeSupplier !== undefined) {
      const universe = universeSupplier();
      if (universe !== null && universe !== undefined && universe.size !== 0) {
        const intersected = intersectWithUniverse(unresolvedRegexp, caseSensitive, universe);
        if (intersected !== null) {
          return intersected;
        }
      }
    }
    return Pattern.compile(unresolvedRegexp, caseSensitive ? 0 : Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
  };
  // Java: HybridPostagMatcher#matchesUnresolved(String)
  const matchesUnresolved = (s) => {
    let resolved = unresolvedResolved;
    if (resolved === null) {
      resolved = resolveUnresolved();
      unresolvedResolved = resolved;
    }
    if (resolved instanceof JavaHashSet) {
      return resolved.contains(s);
    }
    return resolved.matcher(s).matches();
  };
  // Java: HybridPostagMatcher#matches(String)
  m.matches = (s) => {
    if (s.length > MAX_MATCH_LENGTH) {
      return false;
    }
    if (literals.has(s)) {
      return true;
    }
    for (const t of templates) {
      if (t.matches(s)) {
        return true;
      }
    }
    return unresolvedRegexp !== null && matchesUnresolved(s);
  };
  return m;
}

// Java: StringMatcher#stringEquals(String,boolean,boolean)
function stringEquals(pattern, isRegExp, caseSensitive) {
  const m = new StringMatcher(pattern, isRegExp, caseSensitive);
  m.getPossibleValues = () => {
    const hs = new JavaHashSet();
    hs.add(pattern);
    return unmodifiableSet(hs); // Java: Collections.singleton
  };
  m.matches = (s) => {
    if (s.length > MAX_MATCH_LENGTH) {
      return false;
    }
    return caseSensitive ? s === pattern : equalsIgnoreCase(s, pattern);
  };
  return m;
}

// Java: StringMatcher#punctuationMatcher(String,boolean)
function punctuationMatcher(pattern, caseSensitive) {
  const m = new StringMatcher(pattern, true, caseSensitive);
  m.getPossibleValues = () => null;
  m.matches = (s) => {
    if (s.length > MAX_MATCH_LENGTH) {
      return false;
    }
    // \p{P} matches exactly one punctuation code point, no more, no less
    if (s.length === 0) {
      return false;
    }
    const cp = codePointAt(s, 0);
    if (charCount(cp) !== s.length) {
      return false; // more than one code point in s
    }
    return isPunctuation(cp);
  };
  return m;
}

// Java: StringMatcher#isPunctuation(int)
export function isPunctuation(cp) {
  const type = getType(cp);
  return (type >= DASH_PUNCTUATION && type <= OTHER_PUNCTUATION)
    || type === INITIAL_QUOTE_PUNCTUATION
    || type === FINAL_QUOTE_PUNCTUATION;
}

const UNSUPPORTED = '?$^{}*+';
const FINISHING = ')|';
const STARTING = '([\\';
const NON_LITERAL = FINISHING + UNSUPPORTED + STARTING + '.';
// Max width of a single character-range that we still enumerate into a literal set
const MAX_CHAR_RANGE_WIDTH = 64;

// Java: StringMatcher.RegexpParser<T>; the abstract methods are passed as callbacks
class RegexpParser {
  // Java: RegexpParser(String)
  constructor(regexp, callbacks) {
    if (regexp.startsWith('\\b')) {
      regexp = regexp.substring(2);
    }
    if (regexp.startsWith('^')) {
      regexp = regexp.substring(1);
    }
    if (regexp.endsWith('\\b') && !regexp.endsWith('\\\\b')) {
      regexp = regexp.substring(0, regexp.length - 2);
    }
    if (regexp.endsWith('$') && !regexp.endsWith('\\$')) {
      regexp = regexp.substring(0, regexp.length - 1);
    }
    this.regexp = regexp;
    this.pos = 0;
    this.callbacks = callbacks;
  }

  // Java: RegexpParser#charAtPos(int) = regexp.charAt(i) as one-char string
  ch(i) {
    return String.fromCharCode(charAt(this.regexp, i));
  }

  // Java: RegexpParser#disjunction()
  disjunction() {
    const components = [];
    components.push(this.concatenation());
    while (true) {
      if (this.pos >= this.regexp.length || this.ch(this.pos) !== '|') {
        return components.length === 1 ? components[0] : this.callbacks.handleOr(components);
      }
      this.pos++;
      components.push(this.concatenation());
    }
  }

  // Java: RegexpParser#concatenation()
  concatenation() {
    let result = this.postfix();
    while (this.pos < this.regexp.length) {
      const c = this.ch(this.pos);
      if (FINISHING.indexOf(c) >= 0) break;
      if (UNSUPPORTED.indexOf(c) >= 0) throw TOO_COMPLEX;
      result = this.callbacks.handleConcatenation(result, this.postfix());
    }
    return result;
  }

  // Java: RegexpParser#postfix()
  postfix() {
    let groupResults = this.atom();
    if (this.pos < this.regexp.length) {
      let next = this.ch(this.pos);
      if (next === '{') {
        const closing = this.regexp.indexOf('}', this.pos + 1);
        if (closing < 0) throw new AssertionError('Closing } expected after ' + this.pos);
        this.pos = closing + 1;
        groupResults = this.callbacks.unknown();
        if (this.pos >= this.regexp.length) {
          return groupResults;
        }
        next = this.ch(this.pos);
      }
      if ('*+?'.indexOf(next) >= 0) {
        this.pos++;
        return this.callbacks.optional(groupResults, next);
      }
    }
    return groupResults;
  }

  // Java: RegexpParser#atom()
  atom() {
    if (this.pos >= this.regexp.length) return this.callbacks.literal('');

    switch (this.ch(this.pos)) {
      case '(': {
        if (this.ch(++this.pos) === '?') {
          if (this.ch(++this.pos) !== ':') {
            throw TOO_COMPLEX;
          }
          this.pos++;
        }
        const group = this.disjunction();
        if (this.ch(this.pos++) !== ')') throw TOO_COMPLEX;
        return group;
      }
      case '[':
        return this.squareBracketGroup();
      case '\\':
        this.pos++;
        return this.charLiteral(this.escape());
      case '.':
        this.pos++;
        return this.callbacks.unknown();
      default: {
        const literalStart = this.pos;
        while (this.pos < this.regexp.length && NON_LITERAL.indexOf(this.ch(this.pos)) < 0) this.pos++;
        if (literalStart + 1 < this.pos && this.pos < this.regexp.length && this.ch(this.pos) === '?') this.pos--;
        return this.callbacks.literal(this.regexp.substring(literalStart, this.pos));
      }
    }
  }

  // Java: RegexpParser#squareBracketGroup()
  squareBracketGroup() {
    const start = ++this.pos;
    let options = [];
    while (true) {
      const c1 = this.ch(this.pos++);
      if (c1 === ']') break;

      if (c1 === '-' && this.pos !== start + 1 && this.ch(this.pos) !== ']') {
        const last = options === null ? null : options[options.length - 1];
        const next = this.ch(this.pos++);
        if (last === null || last === undefined || next === '\\' || next.charCodeAt(0) - last.charCodeAt(0) > MAX_CHAR_RANGE_WIDTH) {
          options = null;
        }
        if (options !== null) {
          for (let c = last.charCodeAt(0) + 1; c <= next.charCodeAt(0); c++) {
            options.push(String.fromCharCode(c));
          }
        }
      } else if (c1 === '^') {
        options = null;
      } else if (c1 === '[') {
        throw TOO_COMPLEX;
      } else {
        const simpleChar = c1 === '\\' ? this.escape() : c1;
        if (options !== null) {
          options.push(simpleChar);
        }
      }
      // Guard against several small ranges/chars adding up to something large
      if (options !== null && options.length > MAX_CHAR_RANGE_WIDTH) {
        options = null;
      }
    }
    if (options === null) return this.callbacks.unknown();
    const components = options.map((c) => this.charLiteral(c));
    if (components.length === 0) throw TOO_COMPLEX;
    return components.length === 1 ? components[0] : this.callbacks.handleOr(components);
  }

  // Java: RegexpParser#charLiteral(Character)
  charLiteral(c) {
    return c === null ? this.callbacks.unknown() : this.callbacks.literal(c);
  }

  // Java: RegexpParser#escape()
  escape() {
    const next = this.ch(this.pos++);
    if ('0xucpP'.indexOf(next) >= 0) throw TOO_COMPLEX;
    if (isLetterOrDigit(next.charCodeAt(0))) return null;
    return next;
  }
}
