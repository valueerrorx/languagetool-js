// java.util.regex.Pattern: compile (Java syntax -> AST -> native RegExp or own matcher), split, quote, matches.
import { NullPointerException, IndexOutOfBoundsException, IllegalStateException, IllegalArgumentException, StackOverflowError } from '../errors.js';
import {
  Parser, checkFlags, CASE_INSENSITIVE, MULTILINE, DOTALL, UNICODE_CASE, CANON_EQ, UNIX_LINES, LITERAL, UNICODE_CHARACTER_CLASS, COMMENTS,
} from './parser.js';
import { Emitter, interpReason, pairSafe, behindSafe } from './emit.js';
import { compileInterp } from './interp.js';

export const NOANCHOR = 0;
export const ENDANCHOR = 1;

const CACHE_MAX = 4096;
const PAIR = /[\uD800-\uDBFF][\uDC00-\uDFFF]/;
const cache = new Map();

// Java: java.util.regex.Pattern
export class Pattern {
  static UNIX_LINES = UNIX_LINES;
  static CASE_INSENSITIVE = CASE_INSENSITIVE;
  static COMMENTS = COMMENTS;
  static MULTILINE = MULTILINE;
  static LITERAL = LITERAL;
  static DOTALL = DOTALL;
  static UNICODE_CASE = UNICODE_CASE;
  static CANON_EQ = CANON_EQ;
  static UNICODE_CHARACTER_CLASS = UNICODE_CHARACTER_CLASS;

  // Java: Pattern#Pattern(String,int)
  constructor(p, f) {
    checkFlags(f);
    if (p === null || p === undefined) throw new NullPointerException('Cannot invoke "String.isEmpty()" because "this.pattern" is null');
    this.pattern_ = p;
    // to use UNICODE_CASE if UNICODE_CHARACTER_CLASS present
    let flags = f;
    if ((flags & UNICODE_CHARACTER_CLASS) !== 0) flags |= UNICODE_CASE;
    const parser = new Parser(p, flags);
    const r = parser.compile();
    this.flags_ = r.flags0;
    this.root = r.root;
    this.groupCount_ = r.groupCount;
    this.supp = r.supp;
    this.namedGroups_ = r.namedGroups;
    this.engine = null; // lazily built: {kind:'js'|'interp', ...}
  }

  // Java: Pattern#compile(String) / compile(String,int)
  static compile(regex, flags = 0) {
    if (typeof regex === 'string') {
      const key = `${flags}:${regex}`;
      let p = cache.get(key);
      if (p === undefined) {
        p = new Pattern(regex, flags);
        if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
      } else {
        cache.delete(key); // LRU: re-insert as most recent
      }
      cache.set(key, p);
      return p;
    }
    return new Pattern(regex, flags);
  }

  // drops the compiled-pattern cache (not Java API; memory control for hosts and tests)
  static clearCache() {
    cache.clear();
  }

  // Java: Pattern#pattern()
  pattern() {
    return this.pattern_;
  }

  // Java: Pattern#toString()
  toString() {
    return this.pattern_;
  }

  // Java: Pattern#flags()
  flags() {
    return this.flags_;
  }

  // Java: Pattern#namedGroups()
  namedGroups() {
    return this.namedGroups_;
  }

  // Java: Pattern#matcher(CharSequence)
  matcher(input) {
    return new Matcher(this, input);
  }

  // Java: Pattern#matches(String,CharSequence)
  static matches(regex, input) {
    return Pattern.compile(regex).matcher(input).matches();
  }

  // Pattern.compile(regex).matcher(text).matches() without a Matcher (not Java API; fast path for StringMatcher-like callers)
  matchesText(text) {
    const eng = this.getEngine();
    if (eng.test !== undefined) return eng.test(text);
    return eng.exec(text, 0, ENDANCHOR, 0, false) !== null;
  }

  // Java: Pattern#split(CharSequence,int)
  split(input, limit = 0) {
    const text = String(input);
    let index = 0;
    const matchLimited = limit > 0;
    const matchList = [];
    const m = this.matcher(text);
    // Add segments before each match found
    while (m.find()) {
      if (!matchLimited || matchList.length < limit - 1) {
        if (index === 0 && index === m.start() && m.start() === m.end()) {
          // no empty leading substring included for zero-width match at the beginning of the input char sequence.
          continue;
        }
        matchList.push(text.substring(index, m.start()));
        index = m.end();
      } else if (matchList.length === limit - 1) { // last one
        matchList.push(text.substring(index, text.length));
        index = m.end();
      }
    }
    // If no match was found, return this
    if (index === 0) return [text];
    // Add remaining segment
    if (!matchLimited || matchList.length < limit) matchList.push(text.substring(index, text.length));
    // Construct result
    let resultSize = matchList.length;
    if (limit === 0) while (resultSize > 0 && matchList[resultSize - 1].length === 0) resultSize--;
    return matchList.slice(0, resultSize);
  }

  // Java: Pattern#quote(String)
  static quote(s) {
    let slashEIndex = s.indexOf('\\E');
    if (slashEIndex === -1) return `\\Q${s}\\E`;
    let sb = '\\Q';
    let current = 0;
    do {
      sb += `${s.substring(current, slashEIndex)}\\E\\\\E\\Q`;
      current = slashEIndex + 2;
    } while ((slashEIndex = s.indexOf('\\E', current)) !== -1);
    return `${sb}${s.substring(current)}\\E`;
  }

  // engine selection (not Java): native RegExp when exact, else the own matcher
  getEngine() {
    if (this.engine === null) {
      const r = interpReason(this.root);
      this.interpReason = r === null ? null : r.reason;
      // capture-only reasons: the native RegExp finds the exact match span, groups are recomputed on demand
      this.engine = r === null || r.spanSafe ? jsEngine(this, r !== null) : null;
      if (this.engine === null) this.engine = interpEngine(this);
    }
    return this.engine;
  }

  // the own matcher for this pattern
  getInterp() {
    if (this.interp === undefined) this.interp = interpEngine(this);
    return this.interp;
  }
}

// engine on the own matcher: exec(text, from, anchor, oldLast) -> flat group offsets or null
function interpEngine(p) {
  const run = compileInterp(p.root, p.groupCount_, p.supp);
  return {
    kind: 'interp',
    exec: (text, from, anchor, oldLast, search) => run(text, from, anchor, oldLast, search),
  };
}

// engine on native RegExp; the three RegExp variants are built on first use (memory: sources of \b-heavy patterns are large)
function jsEngine(p, lazyGroups) {
  const gc = lazyGroups ? 0 : p.groupCount_;
  const f = gc > 0 ? 'd' : '';
  const first = new Emitter();
  const body0 = first.emit(p.root);
  const map = first.map;
  let pending = body0; // keep the first emission for the first RegExp only
  const source = () => {
    if (pending !== null) {
      const b = pending;
      pending = null;
      return b;
    }
    return new Emitter().emit(p.root);
  };
  // RegExp construction; an unsupported source switches the pattern to the own matcher
  const mk = (src, flags) => {
    try {
      return new RegExp(src, flags);
    } catch (e) {
      if (!(e instanceof SyntaxError)) throw e;
      p.engine = p.getInterp();
      return null;
    }
  };
  // the native RegExp is exact for texts with surrogate pairs only when no match can start inside a pair
  const safePattern = pairSafe(p.root);
  // look-behind start positions inside a pair are tried by Java for every kind of match
  const behindOk = behindSafe(p.root);
  const anchoredSafe = (text) => behindOk || !PAIR.test(text);
  let pairText = null;
  let pairRes = false;
  const safe = (text) => {
    if (safePattern) return true;
    if (text !== pairText) {
      pairText = text;
      pairRes = !PAIR.test(text);
    }
    return pairRes;
  };
  let reFind = null;
  let reMatch = null;
  let reLook = null;
  let reTest = null;
  const out = (m) => {
    if (gc === 0) return [m.index, m.index + m[0].length];
    const g = new Array(2 * (gc + 1));
    const ind = m.indices;
    g[0] = m.index;
    g[1] = m.index + m[0].length;
    for (let n = 1; n <= gc; n++) {
      const x = ind[map[n]];
      if (x === undefined) {
        g[2 * n] = -1;
        g[2 * n + 1] = -1;
      } else {
        g[2 * n] = x[0];
        g[2 * n + 1] = x[1];
      }
    }
    return g;
  };
  return {
    kind: 'js',
    lazyGroups,
    exec(text, from, anchor, oldLast, search) {
      if (!anchoredSafe(text) && (anchor === ENDANCHOR || !search)) return p.getInterp().exec(text, from, anchor, oldLast, search);
      if (anchor === ENDANCHOR) {
        if (reMatch === null) reMatch = mk(`(?:${source()})$`, `yu${f}`);
        if (reMatch === null) return p.engine.exec(text, from, anchor, oldLast, search);
        reMatch.lastIndex = from;
        const m = reMatch.exec(text);
        return m === null ? null : out(m);
      }
      if (!search) {
        if (reLook === null) reLook = mk(source(), `yu${f}`);
        if (reLook === null) return p.engine.exec(text, from, anchor, oldLast, search);
        reLook.lastIndex = from;
        const m = reLook.exec(text);
        return m === null ? null : out(m);
      }
      // find: Java also tries start positions inside surrogate pairs, which the u-mode RegExp never does
      if (from > 0 && from < text.length && (text.charCodeAt(from) & 0xfc00) === 0xdc00 && (text.charCodeAt(from - 1) & 0xfc00) === 0xd800) {
        return p.getInterp().exec(text, from, NOANCHOR, oldLast, true);
      }
      if (!safe(text)) return p.getInterp().exec(text, from, NOANCHOR, oldLast, true);
      if (reFind === null) reFind = mk(source(), `gu${f}`);
      if (reFind === null) return p.engine.exec(text, from, anchor, oldLast, search);
      reFind.lastIndex = from;
      const m = reFind.exec(text);
      return m === null ? null : out(m);
    },
    // boolean matches() without group offsets
    test(text) {
      if (!anchoredSafe(text)) return p.getInterp().exec(text, 0, ENDANCHOR, 0, false) !== null;
      if (gc === 0) { // same RegExp as exec(...ENDANCHOR): no group offsets requested
        if (reMatch === null) reMatch = mk(`(?:${source()})$`, 'yu');
        if (reMatch === null) return p.engine.exec(text, 0, ENDANCHOR, 0, false) !== null;
        reMatch.lastIndex = 0;
        return reMatch.test(text);
      }
      if (reTest === null) reTest = mk(`(?:${source()})$`, 'yu');
      if (reTest === null) return p.engine.exec(text, 0, ENDANCHOR, 0, false) !== null;
      reTest.lastIndex = 0;
      return reTest.test(text);
    },
  };
}

// Java: java.util.regex.Matcher
export class Matcher {
  // Java: Matcher#Matcher(Pattern,CharSequence)
  constructor(parent, text) {
    this.parentPattern = parent;
    if (text === null || text === undefined) throw new NullPointerException('Cannot invoke "java.lang.CharSequence.length()" because "this.text" is null');
    this.text = String(text);
    this.groups = null;
    this.reset();
  }

  // Java: Matcher#pattern()
  pattern() {
    return this.parentPattern;
  }

  // Java: Matcher#reset()
  reset(input) {
    if (input !== undefined) {
      if (input === null) throw new NullPointerException('Cannot invoke "java.lang.CharSequence.length()" because "this.text" is null');
      this.text = String(input);
    }
    this.first = -1;
    this.last = 0;
    this.oldLast = -1;
    this.groups = null;
    this.lazy = false;
    this.lastAppendPosition = 0;
    return this;
  }

  // Java: Matcher#groupCount()
  groupCount() {
    return this.parentPattern.groupCount_;
  }

  // Java: Matcher#matches()
  matches() {
    return this.match(0, ENDANCHOR);
  }

  // Java: Matcher#lookingAt()
  lookingAt() {
    return this.match(0, NOANCHOR);
  }

  // Java: Matcher#find() / find(int)
  find(start) {
    if (start !== undefined) {
      const limit = this.text.length;
      if (start < 0 || start > limit) throw new IndexOutOfBoundsException('Illegal start index');
      this.reset();
      return this.search(start);
    }
    let nextSearchIndex = this.last;
    if (nextSearchIndex === this.first) nextSearchIndex++;
    // If next search starts before region, start it at region
    if (nextSearchIndex < 0) nextSearchIndex = 0;
    // If next search starts beyond region then it fails
    if (nextSearchIndex > this.text.length) {
      this.groups = null;
      return false;
    }
    return this.search(nextSearchIndex);
  }

  // engine call; a native stack overflow becomes Java's StackOverflowError
  run(from, anchor, search) {
    this.callArgs = [from, anchor, this.oldLast, search];
    try {
      const eng = this.parentPattern.getEngine();
      this.lazy = eng.lazyGroups === true && this.parentPattern.groupCount_ > 0;
      return eng.exec(this.text, from, anchor, this.oldLast, search);
    } catch (e) {
      if (e instanceof RangeError) throw new StackOverflowError();
      throw e;
    }
  }

  // exact group offsets after a span-only native match: replay the same search on the own matcher
  fixGroups() {
    this.lazy = false;
    const [from, anchor, oldLast, search] = this.callArgs;
    try {
      const g = this.parentPattern.getInterp().exec(this.text, from, anchor, oldLast, search);
      if (g !== null) this.groups = g;
    } catch (e) {
      if (e instanceof RangeError) throw new StackOverflowError();
      throw e;
    }
  }

  // Java: Matcher#search(int)
  search(from) {
    from = from < 0 ? 0 : from;
    this.first = from;
    this.oldLast = this.oldLast < 0 ? from : this.oldLast;
    const g = this.run(from, NOANCHOR, true);
    if (g === null) {
      this.first = -1;
      this.groups = null;
    } else {
      this.groups = g;
      this.first = g[0];
      this.last = g[1];
    }
    this.oldLast = this.last;
    return g !== null;
  }

  // Java: Matcher#match(int,int)
  match(from, anchor) {
    from = from < 0 ? 0 : from;
    this.first = from;
    this.oldLast = this.oldLast < 0 ? from : this.oldLast;
    const g = this.run(from, anchor, false);
    if (g === null) {
      this.first = -1;
      this.groups = null;
    } else {
      this.groups = g;
      this.first = g[0];
      this.last = g[1];
    }
    this.oldLast = this.last;
    return g !== null;
  }

  // Java: Matcher#start() / start(int) / start(String)
  start(group) {
    if (this.first < 0) throw new IllegalStateException('No match available');
    if (group === undefined) return this.first;
    const gi = this.groupIndexOf(group, false);
    if (gi > 0 && this.lazy) this.fixGroups();
    return this.groups[gi * 2];
  }

  // Java: Matcher#end() / end(int) / end(String)
  end(group) {
    if (this.first < 0) throw new IllegalStateException('No match available');
    if (group === undefined) return this.last;
    const gi = this.groupIndexOf(group, false);
    if (gi > 0 && this.lazy) this.fixGroups();
    return this.groups[gi * 2 + 1];
  }

  // Java: Matcher#group() / group(int) / group(String)
  group(group = 0) {
    const gi = this.groupIndexOf(group, true);
    if (gi > 0 && this.lazy) this.fixGroups();
    if (this.groups[gi * 2] === -1 || this.groups[gi * 2 + 1] === -1) return null;
    return this.text.substring(this.groups[gi * 2], this.groups[gi * 2 + 1]);
  }

  // group number check for the int/String overloads (Java: Matcher#start(int), #group(int), #getMatchedGroupIndex(String))
  groupIndexOf(group, forGroup) {
    if (typeof group === 'string') {
      if (this.first < 0) throw new IllegalStateException('No match found');
      const m = this.parentPattern.namedGroups_;
      if (!m.has(group)) throw new IllegalArgumentException(`No group with name <${group}>`);
      return m.get(group);
    }
    if (this.first < 0) throw new IllegalStateException(forGroup ? 'No match found' : 'No match available');
    if (group < 0 || group > this.groupCount()) throw new IndexOutOfBoundsException(`No group ${group}`);
    return group;
  }

  // Java: Matcher#hasMatch()
  hasMatch() {
    return this.first >= 0;
  }

  // Java: Matcher#results(): the successive MatchResults of find()
  results() {
    this.reset();
    const out = [];
    while (this.find()) out.push(this.toMatchResult());
    return out;
  }

  // Java: Matcher#usePattern(Pattern)
  usePattern(newPattern) {
    if (newPattern === null || newPattern === undefined) throw new IllegalArgumentException('Pattern cannot be null');
    this.parentPattern = newPattern;
    this.groups = null;
    return this;
  }

  // Java: Matcher#region / useAnchoringBounds / useTransparentBounds / hitEnd / requireEnd are not used by LanguageTool
  region() {
    throw new UnsupportedFeature('Matcher.region');
  }

  // Java: Matcher#toMatchResult()
  toMatchResult() {
    if (this.lazy) this.fixGroups();
    const text = this.text;
    const groups = this.groups === null ? null : this.groups.slice();
    const first = this.first;
    const last = this.last;
    const gc = this.groupCount();
    const check = (g, what) => {
      if (first < 0) throw new IllegalStateException(what);
      if (g < 0 || g > gc) throw new IndexOutOfBoundsException(`No group ${g}`);
    };
    return {
      start: (g = 0) => { check(g, 'No match available'); return g === 0 ? first : groups[g * 2]; },
      end: (g = 0) => { check(g, 'No match available'); return g === 0 ? last : groups[g * 2 + 1]; },
      group: (g = 0) => {
        check(g, 'No match found');
        return groups[g * 2] === -1 || groups[g * 2 + 1] === -1 ? null : text.substring(groups[g * 2], groups[g * 2 + 1]);
      },
      groupCount: () => gc,
    };
  }

  // Java: Matcher#appendReplacement(StringBuilder,String); sb is {append(String)} or an array-like {s}
  appendReplacement(sb, replacement) {
    // If no match, return error
    if (this.first < 0) throw new IllegalStateException('No match available');
    const result = this.appendExpandedReplacement(replacement);
    // Append the intervening text, then the match substitution
    sb.append(this.text.substring(this.lastAppendPosition, this.first));
    sb.append(result);
    this.lastAppendPosition = this.last;
    return this;
  }

  // Java: Matcher#appendExpandedReplacement(String,StringBuilder)
  appendExpandedReplacement(replacement) {
    if (replacement === null || replacement === undefined) throw new NullPointerException();
    let result = '';
    let cursor = 0;
    const len = replacement.length;
    while (cursor < len) {
      let nextChar = replacement.charAt(cursor);
      if (nextChar === '\\') {
        cursor++;
        if (cursor === len) throw new IllegalArgumentException('character to be escaped is missing');
        nextChar = replacement.charAt(cursor);
        result += nextChar;
        cursor++;
      } else if (nextChar === '$') {
        // Skip past $
        cursor++;
        // Throw IAE if this "$" is the last character in replacement
        if (cursor === len) throw new IllegalArgumentException('Illegal group reference: group index is missing');
        nextChar = replacement.charAt(cursor);
        let refNum = -1;
        if (nextChar === '{') {
          cursor++;
          let gsb = '';
          while (cursor < len) {
            nextChar = replacement.charAt(cursor);
            if (/^[A-Za-z0-9]$/.test(nextChar)) {
              gsb += nextChar;
              cursor++;
            } else {
              break;
            }
          }
          if (gsb.length === 0) throw new IllegalArgumentException('named capturing group has 0 length name');
          if (nextChar !== '}') throw new IllegalArgumentException("named capturing group is missing trailing '}'");
          if (/^[0-9]$/.test(gsb.charAt(0))) throw new IllegalArgumentException(`capturing group name {${gsb}} starts with digit character`);
          if (!this.parentPattern.namedGroups_.has(gsb)) throw new IllegalArgumentException(`No group with name {${gsb}}`);
          refNum = this.parentPattern.namedGroups_.get(gsb);
          cursor++;
        } else {
          // The first number is always a group
          refNum = nextChar.charCodeAt(0) - 0x30;
          if (refNum < 0 || refNum > 9) throw new IllegalArgumentException('Illegal group reference');
          cursor++;
          // Capture the largest legal group string
          let done = false;
          while (!done) {
            if (cursor >= len) break;
            const nextDigit = replacement.charCodeAt(cursor) - 0x30;
            if (nextDigit < 0 || nextDigit > 9) break; // not a number
            const newRefNum = refNum * 10 + nextDigit;
            if (this.groupCount() < newRefNum) {
              done = true;
            } else {
              refNum = newRefNum;
              cursor++;
            }
          }
        }
        // Append group
        if (this.start(refNum) !== -1 && this.end(refNum) !== -1) result += this.text.substring(this.start(refNum), this.end(refNum));
      } else {
        result += nextChar;
        cursor++;
      }
    }
    return result;
  }

  // Java: Matcher#appendTail(StringBuilder)
  appendTail(sb) {
    sb.append(this.text.substring(this.lastAppendPosition));
    return sb;
  }

  // Java: Matcher#replaceAll(String) / replaceAll(Function)
  replaceAll(replacement) {
    this.reset();
    let result = this.find();
    if (result) {
      const sb = new SB();
      do {
        if (typeof replacement === 'function') this.appendReplacement(sb, replacement(this.toMatchResult()));
        else this.appendReplacement(sb, replacement);
        result = this.find();
      } while (result);
      this.appendTail(sb);
      return sb.toString();
    }
    return this.text;
  }

  // Java: Matcher#replaceFirst(String) / replaceFirst(Function)
  replaceFirst(replacement) {
    if (replacement === null || replacement === undefined) throw new NullPointerException('replacement');
    this.reset();
    if (!this.find()) return this.text;
    const sb = new SB();
    if (typeof replacement === 'function') this.appendReplacement(sb, replacement(this.toMatchResult()));
    else this.appendReplacement(sb, replacement);
    this.appendTail(sb);
    return sb.toString();
  }

  // Java: Matcher#quoteReplacement(String)
  static quoteReplacement(s) {
    if (s.indexOf('\\') === -1 && s.indexOf('$') === -1) return s;
    let sb = '';
    for (let i = 0; i < s.length; i++) {
      const c = s.charAt(i);
      if (c === '\\' || c === '$') sb += '\\';
      sb += c;
    }
    return sb;
  }

  // Java: Matcher#toString()
  toString() {
    return `java.util.regex.Matcher[pattern=${this.parentPattern.pattern()} region=0,${this.text.length} lastmatch=${this.first >= 0 ? this.text.substring(this.first, this.last) : ''}]`;
  }
}

// minimal StringBuilder for appendReplacement
class SB {
  constructor() {
    this.s = '';
  }

  append(x) {
    this.s += x;
    return this;
  }

  toString() {
    return this.s;
  }
}

// a java.util.regex feature that LanguageTool never uses and the port does not provide
class UnsupportedFeature extends IllegalStateException {
  constructor(what) {
    super(`java regex translator: ${what} is not supported`);
  }
}
