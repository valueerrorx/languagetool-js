// org.languagetool.rules.patterns.StringMatcher (text pattern + matching mode); sequence/postag fast paths come with F26
import { Pattern } from '../../lib/java/regex/index.js';
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
