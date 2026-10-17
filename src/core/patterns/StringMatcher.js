// org.languagetool.rules.patterns.StringMatcher (text pattern + matching mode); sequence/postag fast paths come with F26
import { Pattern, PatternSyntaxException } from '../../lib/java/regex/index.js';
import { AssertionError, RuntimeException } from '../../lib/java/errors.js';
import {
  getType, charCount, isLetterOrDigit, DASH_PUNCTUATION, OTHER_PUNCTUATION, INITIAL_QUOTE_PUNCTUATION, FINAL_QUOTE_PUNCTUATION,
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

// Java: StringMatcher#tryCreateSequenceMatcher(String,boolean,Pattern); notPorted (PLAN.md F26): RunSequenceMatcher not built, null = Java's "unsupported" result, regex path matches the same strings
function tryCreateSequenceMatcher() {
  return null;
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
