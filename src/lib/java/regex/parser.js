// Port of the java.util.regex.Pattern (JDK 17) parser: pattern text -> AST, with Java's PatternSyntaxException texts and indexes.
import { PatternSyntaxException, ArrayIndexOutOfBoundsException, IllegalArgumentException } from '../errors.js';
import { CharSet } from './charset.js';
import { classCharSet, rangeSetCI, singleSet, sliceSet } from './casefold.js';
import * as P from './props.js';
import { codePointOfName } from './names.js';

export const UNIX_LINES = 0x01;
export const CASE_INSENSITIVE = 0x02;
export const COMMENTS = 0x04;
export const MULTILINE = 0x08;
export const LITERAL = 0x10;
export const DOTALL = 0x20;
export const UNICODE_CASE = 0x40;
export const CANON_EQ = 0x80;
export const UNICODE_CHARACTER_CLASS = 0x100;
const ALL_FLAGS = 0x1ff;
export const MAX_REPS = 0x7fffffff;

// Java: Pattern#Pattern(String,int) flag validation
export function checkFlags(f) {
  if ((f & ~ALL_FLAGS) !== 0) throw new IllegalArgumentException(`Unknown flag 0x${(f >>> 0).toString(16)}`);
}

const isDigit = (c) => c >= 0x30 && c <= 0x39;
const isAlpha = (c) => (c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a);
const isAlnum = (c) => isAlpha(c) || isDigit(c);
const isHexDigit = (c) => isDigit(c) || (c >= 0x41 && c <= 0x46) || (c >= 0x61 && c <= 0x66);
const toDigit = (c) => (c <= 0x39 ? c - 0x30 : (c & 7) + 9);
const isAsciiSpace = (c) => c === 0x20 || (c >= 9 && c <= 13);

// AST node factories
const EMPTY = { k: 'empty' };
const nodeOfSet = new WeakMap();

// shared immutable set node
function setNode(set) {
  let n = nodeOfSet.get(set);
  if (n === undefined) {
    n = { k: 'set', set };
    nodeOfSet.set(set, n);
  }
  return n;
}

// Java: Pattern (parser part); instance per compile
export class Parser {
  // Java: Pattern#Pattern(String,int) + compile()
  constructor(pattern, flags) {
    this.pattern = pattern;
    this.flags = flags;
    this.flags0 = flags;
    this.capturingGroupCount = 1;
    this.namedGroups = new Map();
    this.hasGroupRef = false;
    this.canonSeen = false;
    this.cursor = 0;
    this.temp = null;
    this.patternLength = 0;
    this.normalizedPattern = pattern;
  }

  // Java: Pattern#compile() with the catch of StackOverflowError in Pattern#Pattern(String,int)
  compile() {
    try {
      return this.compile0();
    } catch (e) {
      if (e instanceof RangeError) throw this.error('Stack overflow during pattern compilation');
      throw e;
    }
  }

  // Java: Pattern#compile()
  compile0() {
    if (this.has(CANON_EQ) && !this.has(LITERAL)) throw this.unsupported('CANON_EQ');
    const pattern = this.pattern;
    // Copy pattern to int array of code points, double zero terminated
    const cps = [];
    for (let x = 0; x < pattern.length;) {
      const c = pattern.codePointAt(x);
      cps.push(c);
      x += c >= 0x10000 ? 2 : 1;
    }
    this.patternLength = cps.length;
    this.hasSupplementary = cps.some((c) => c >= 0x10000);
    this.suppFlag = this.hasSupplementary;
    this.temp = cps.concat([0, 0]);
    if (!this.has(LITERAL)) this.removeQEQuoting();
    let root;
    if (this.has(LITERAL)) {
      // Literal pattern handling
      root = this.slice(this.temp.slice(0, this.patternLength));
    } else {
      // Start recursive descent parsing
      root = this.expr();
      // Check extra pattern characters
      if (this.patternLength !== this.cursor) {
        if (this.peek() === 0x29) throw this.error("Unmatched closing ')'");
        throw this.error('Unexpected internal error');
      }
      if (this.canonSeen) throw this.unsupported('CANON_EQ');
    }
    return { root, groupCount: this.capturingGroupCount - 1, namedGroups: this.namedGroups, flags0: this.flags0, hasGroupRef: this.hasGroupRef, supp: this.suppFlag };
  }

  // Java: Pattern#newCharProperty(CharPredicate): a predicate that is not a BmpCharPredicate marks the pattern as supplementary (StartS)
  charProp(set) {
    if (!set.bmp) this.suppFlag = true;
    return setNode(set);
  }

  // Java: Pattern#has(int)
  has(f) {
    return (this.flags0 & f) !== 0;
  }

  // Java: Pattern#error(String)
  error(s) {
    return new PatternSyntaxException(s, this.normalizedPattern, this.cursor - 1);
  }

  // temp[i] with Java's array bounds check
  at(i) {
    if (i < 0 || i >= this.temp.length) throw new ArrayIndexOutOfBoundsException(`Index ${i} out of bounds for length ${this.temp.length}`);
    return this.temp[i];
  }

  // Java: Pattern#RemoveQEQuoting()
  removeQEQuoting() {
    const temp = this.temp;
    const pLen = this.patternLength;
    let i = 0;
    while (i < pLen - 1) {
      if (temp[i] !== 0x5c) i += 1;
      else if (temp[i + 1] !== 0x51) i += 2;
      else break;
    }
    if (i >= pLen - 1) return; // No \Q sequence found
    let j = i;
    i += 2;
    const nt = temp.slice(0, j);
    let inQuote = true;
    let beginQuote = true;
    while (i < pLen) {
      const c = temp[i++];
      if (c >= 128 || isAlpha(c)) {
        nt[j++] = c;
      } else if (isDigit(c)) {
        if (beginQuote) {
          // A unicode escape \[0xu] could be before this quote, and we don't want this numeric char to processed as part of the escape.
          nt[j++] = 0x5c;
          nt[j++] = 0x78;
          nt[j++] = 0x33;
        }
        nt[j++] = c;
      } else if (c !== 0x5c) {
        if (inQuote) nt[j++] = 0x5c;
        nt[j++] = c;
      } else if (inQuote) {
        if (temp[i] === 0x45) {
          i++;
          inQuote = false;
        } else {
          nt[j++] = 0x5c;
          nt[j++] = 0x5c;
        }
      } else if (temp[i] === 0x51) {
        i++;
        inQuote = true;
        beginQuote = true;
        continue;
      } else {
        nt[j++] = c;
        if (i !== pLen) nt[j++] = temp[i++];
      }
      beginQuote = false;
    }
    this.patternLength = j;
    nt.length = j;
    nt.push(0, 0); // double zero termination
    this.temp = nt;
  }

  // ---- cursor primitives (Java: peek/read/next/skip/unread/accept) ----

  // Java: Pattern#peek()
  peek() {
    let ch = this.at(this.cursor);
    if (this.has(COMMENTS)) ch = this.peekPastWhitespace(ch);
    return ch;
  }

  // Java: Pattern#read()
  read() {
    let ch = this.at(this.cursor++);
    if (this.has(COMMENTS)) ch = this.parsePastWhitespace(ch);
    return ch;
  }

  // Java: Pattern#next()
  next() {
    let ch = this.at(++this.cursor);
    if (this.has(COMMENTS)) ch = this.peekPastWhitespace(ch);
    return ch;
  }

  // Java: Pattern#nextEscaped()
  nextEscaped() {
    return this.at(++this.cursor);
  }

  // Java: Pattern#skip()
  skip() {
    const i = this.cursor;
    const ch = this.at(i + 1);
    this.cursor = i + 2;
    return ch;
  }

  // Java: Pattern#unread()
  unread() {
    this.cursor--;
  }

  // Java: Pattern#accept(int,String)
  accept(ch, s) {
    let testChar = this.at(this.cursor++);
    if (this.has(COMMENTS)) testChar = this.parsePastWhitespace(testChar);
    if (ch !== testChar) throw this.error(s);
  }

  // Java: Pattern#mark(int)
  mark(c) {
    this.temp[this.patternLength] = c;
  }

  // Java: Pattern#peekPastWhitespace(int)
  peekPastWhitespace(ch) {
    while (isAsciiSpace(ch) || ch === 0x23) {
      while (isAsciiSpace(ch)) ch = this.at(++this.cursor);
      if (ch === 0x23) ch = this.peekPastLine();
    }
    return ch;
  }

  // Java: Pattern#parsePastWhitespace(int)
  parsePastWhitespace(ch) {
    while (isAsciiSpace(ch) || ch === 0x23) {
      while (isAsciiSpace(ch)) ch = this.at(this.cursor++);
      if (ch === 0x23) ch = this.parsePastLine();
    }
    return ch;
  }

  // Java: Pattern#parsePastLine()
  parsePastLine() {
    let ch = this.at(this.cursor++);
    while (ch !== 0 && !this.isLineSeparator(ch)) ch = this.at(this.cursor++);
    if (ch === 0 && this.cursor > this.patternLength) {
      this.cursor = this.patternLength;
      ch = this.at(this.cursor++);
    }
    return ch;
  }

  // Java: Pattern#peekPastLine()
  peekPastLine() {
    let ch = this.at(++this.cursor);
    while (ch !== 0 && !this.isLineSeparator(ch)) ch = this.at(++this.cursor);
    if (ch === 0 && this.cursor > this.patternLength) {
      this.cursor = this.patternLength;
      ch = this.at(this.cursor);
    }
    return ch;
  }

  // Java: Pattern#isLineSeparator(int)
  isLineSeparator(ch) {
    if (this.has(UNIX_LINES)) return ch === 0x0a;
    return ch === 0x0a || ch === 0x0d || (ch | 1) === 0x2029 || ch === 0x85;
  }

  // ---- grammar ----

  // Java: Pattern#expr(Node)
  expr() {
    const alts = [];
    for (;;) {
      alts.push(this.sequence());
      if (this.peek() !== 0x7c) break;
      this.next();
    }
    return alts.length === 1 ? alts[0] : { k: 'alt', alts };
  }

  // Java: Pattern#sequence(Node)
  sequence() {
    const items = [];
    LOOP:
    for (;;) {
      let ch = this.peek();
      let node;
      switch (ch) {
        case 0x28: { // '('
          // Because group handles its own closure, we need to treat it differently
          node = this.group0();
          // Check for comment or flag group
          if (node === null) continue;
          items.push(node);
          continue;
        }
        case 0x5b: // '['
          if (this.has(CANON_EQ) && !this.has(LITERAL)) throw this.unsupported('CANON_EQ');
          node = this.charProp(this.clazz(true));
          break;
        case 0x5c: { // '\\'
          ch = this.nextEscaped();
          if (ch === 0x70 || ch === 0x50) {
            let oneLetter = true;
            const comp = ch === 0x50;
            ch = this.next(); // Consume { if present
            if (ch !== 0x7b) this.unread();
            else oneLetter = false;
            node = this.charProp(this.family(oneLetter, comp));
          } else {
            this.unread();
            node = this.atom();
          }
          break;
        }
        case 0x5e: // '^'
          this.next();
          if (this.has(MULTILINE)) node = { k: 'caret', unix: this.has(UNIX_LINES) };
          else node = { k: 'begin' };
          break;
        case 0x24: // '$'
          this.next();
          node = { k: 'dollar', multi: this.has(MULTILINE), unix: this.has(UNIX_LINES) };
          break;
        case 0x2e: // '.'
          this.next();
          if (this.has(DOTALL)) node = setNode(CharSet.all());
          else if (this.has(UNIX_LINES)) node = setNode(CharSet.of(0x0a).negate());
          else node = setNode(P.LINE_TERMINATORS().negate());
          break;
        case 0x7c: // '|'
        case 0x29: // ')'
          break LOOP;
        case 0x5d: // Now interpreting dangling ] and } as literals
        case 0x7d:
          node = this.atom();
          break;
        case 0x3f: // '?'
        case 0x2a: // '*'
        case 0x2b: // '+'
          this.next();
          throw this.error(`Dangling meta character '${String.fromCharCode(ch)}'`);
        case 0:
          if (this.cursor >= this.patternLength) break LOOP;
          node = this.atom();
          break;
        default:
          node = this.atom();
          break;
      }
      node = this.closure(node);
      items.push(node);
    }
    if (items.length === 0) return EMPTY;
    // flatten literal sequences returned by atom()
    const flat = [];
    for (const it of items) {
      if (it.k === 'seq' && it.lit) flat.push(...it.items);
      else flat.push(it);
    }
    return flat.length === 1 ? flat[0] : { k: 'seq', items: flat };
  }

  // Java: Pattern#atom()
  atom() {
    const buffer = [];
    let first = 0;
    let prev = -1;
    let ch = this.peek();
    for (;;) {
      switch (ch) {
        case 0x2a: // '*'
        case 0x2b: // '+'
        case 0x3f: // '?'
        case 0x7b: // '{'
          if (first > 1) {
            this.cursor = prev; // Unwind one character
            first--;
          }
          break;
        case 0x24:
        case 0x2e:
        case 0x5e:
        case 0x28:
        case 0x5b:
        case 0x7c:
        case 0x29:
          break;
        case 0x5c: { // '\\'
          ch = this.nextEscaped();
          if (ch === 0x70 || ch === 0x50) { // Property
            if (first > 0) { // Slice is waiting; handle it first
              this.unread();
              break;
            } else { // No slice; just return the family node
              const comp = ch === 0x50;
              let oneLetter = true;
              ch = this.next(); // Consume { if present
              if (ch !== 0x7b) this.unread();
              else oneLetter = false;
              return this.charProp(this.family(oneLetter, comp));
            }
          }
          this.unread();
          prev = this.cursor;
          const r = this.escape(false, first === 0, false);
          if (r.ch >= 0) {
            buffer[first++] = r.ch;
            ch = this.peek();
            continue;
          } else if (first === 0) {
            return r.node;
          }
          // Unwind meta escape sequence
          this.cursor = prev;
          break;
        }
        case 0:
          if (this.cursor >= this.patternLength) break;
          // fall through to default
          prev = this.cursor;
          buffer[first++] = ch;
          ch = this.next();
          continue;
        default:
          prev = this.cursor;
          buffer[first++] = ch;
          ch = this.next();
          continue;
      }
      break;
    }
    if (first === 1) return this.charProp(singleSet(buffer[0], this.has(CASE_INSENSITIVE), this.has(UNICODE_CASE)));
    return this.slice(buffer.slice(0, first));
  }

  // Java: Pattern#newSlice(int[],int,boolean): literal run as a sequence of one-char sets
  slice(buf) {
    const ci = this.has(CASE_INSENSITIVE);
    const uc = this.has(UNICODE_CASE);
    return { k: 'seq', lit: true, items: buf.map((c) => setNode(sliceSet(c, ci, uc))) };
  }

  // Java: Pattern#group0()
  group0() {
    let node;
    let groupIndex = 0;
    const save = this.flags0;
    let ch = this.next();
    if (ch === 0x3f) { // '?'
      ch = this.skip();
      switch (ch) {
        case 0x3a: // (?:xxx) pure group
          node = { k: 'group', n: 0, body: this.expr() };
          break;
        case 0x3d: // (?=xxx) and (?!xxx) lookahead
        case 0x21:
          node = { k: 'look', behind: false, neg: ch === 0x21, body: this.expr() };
          break;
        case 0x3e: // (?>xxx) independent group
          node = { k: 'atomic', body: this.expr() };
          break;
        case 0x3c: { // (?<xxx) look behind
          ch = this.read();
          if (ch !== 0x3d && ch !== 0x21) {
            // named captured group
            const name = this.groupname(ch);
            if (this.namedGroups.has(name)) throw this.error(`Named capturing group <${name}> is already defined`);
            groupIndex = this.capturingGroupCount++;
            this.namedGroups.set(name, this.capturingGroupCount - 1);
            node = { k: 'group', n: groupIndex, name, body: this.expr() };
            break;
          }
          const start = this.cursor;
          const body = this.expr();
          const info = study(body);
          if (!info.valid) throw this.error('Look-behind group does not have an obvious maximum length');
          let supp = false;
          for (let x = start; x < this.patternLength; x++) if (this.temp[x] >= 0x10000) supp = true;
          node = { k: 'look', behind: true, neg: ch === 0x21, body, min: info.min, max: info.max, supp };
          break;
        }
        case 0x24: // '$'
        case 0x40: // '@'
          throw this.error('Unknown group type');
        default: // (?xxx:) inlined match flags
          this.unread();
          this.addFlag();
          ch = this.read();
          if (ch === 0x29) return null; // Inline modifier only
          if (ch !== 0x3a) throw this.error('Unknown inline modifier');
          node = { k: 'group', n: 0, body: this.expr() };
          break;
      }
    } else { // (xxx) a regular group
      groupIndex = this.capturingGroupCount++;
      node = { k: 'group', n: groupIndex, body: this.expr() };
    }
    this.accept(0x29, 'Unclosed group');
    this.flags0 = save;
    // Check for quantifiers
    return this.closure(node);
  }

  // Java: Pattern#groupname(int)
  groupname(ch) {
    let sb = '';
    if (!isAlpha(ch)) throw this.error('capturing group name does not start with a Latin letter');
    do {
      sb += String.fromCharCode(ch);
    } while (isAlnum(ch = this.read()));
    if (ch !== 0x3e) throw this.error("named capturing group is missing trailing '>'");
    return sb;
  }

  // Java: Pattern#addFlag()
  addFlag() {
    let ch = this.peek();
    for (;;) {
      switch (ch) {
        case 0x69: this.flags0 |= CASE_INSENSITIVE; break;
        case 0x6d: this.flags0 |= MULTILINE; break;
        case 0x73: this.flags0 |= DOTALL; break;
        case 0x64: this.flags0 |= UNIX_LINES; break;
        case 0x75: this.flags0 |= UNICODE_CASE; break;
        case 0x63: this.flags0 |= CANON_EQ; this.canonSeen = true; break; // rejected after the parse, syntax errors come first
        case 0x78: this.flags0 |= COMMENTS; break;
        case 0x55: this.flags0 |= (UNICODE_CHARACTER_CLASS | UNICODE_CASE); break;
        case 0x2d: // subFlag then fall through
          ch = this.next();
          this.subFlag();
          return;
        default:
          return;
      }
      ch = this.next();
    }
  }

  // Java: Pattern#subFlag()
  subFlag() {
    let ch = this.peek();
    for (;;) {
      switch (ch) {
        case 0x69: this.flags0 &= ~CASE_INSENSITIVE; break;
        case 0x6d: this.flags0 &= ~MULTILINE; break;
        case 0x73: this.flags0 &= ~DOTALL; break;
        case 0x64: this.flags0 &= ~UNIX_LINES; break;
        case 0x75: this.flags0 &= ~UNICODE_CASE; break;
        case 0x63: this.flags0 &= ~CANON_EQ; break;
        case 0x78: this.flags0 &= ~COMMENTS; break;
        case 0x55: this.flags0 &= ~(UNICODE_CHARACTER_CLASS | UNICODE_CASE); break;
        default: return;
      }
      ch = this.next();
    }
  }

  // Java: Pattern#closure(Node)
  closure(prev) {
    let ch = this.peek();
    const loop = (min, max, mode, quest) => ({ k: 'loop', body: prev, min, max, mode, quest });
    switch (ch) {
      case 0x3f: // '?'
        ch = this.next();
        if (ch === 0x3f) { this.next(); return loop(0, 1, 'l', true); }
        if (ch === 0x2b) { this.next(); return loop(0, 1, 'p', true); }
        return loop(0, 1, 'g', true);
      case 0x2a: // '*'
        ch = this.next();
        if (ch === 0x3f) { this.next(); return loop(0, MAX_REPS, 'l', false); }
        if (ch === 0x2b) { this.next(); return loop(0, MAX_REPS, 'p', false); }
        return loop(0, MAX_REPS, 'g', false);
      case 0x2b: // '+'
        ch = this.next();
        if (ch === 0x3f) { this.next(); return loop(1, MAX_REPS, 'l', false); }
        if (ch === 0x2b) { this.next(); return loop(1, MAX_REPS, 'p', false); }
        return loop(1, MAX_REPS, 'g', false);
      case 0x7b: { // '{'
        ch = this.skip();
        if (isDigit(ch)) {
          let cmin = 0;
          let cmax;
          do {
            cmin = cmin * 10 + (ch - 0x30);
            if (cmin > MAX_REPS) throw this.error('Illegal repetition range');
          } while (isDigit(ch = this.read()));
          cmax = cmin;
          if (ch === 0x2c) {
            ch = this.read();
            cmax = MAX_REPS;
            if (ch !== 0x7d) {
              cmax = 0;
              while (isDigit(ch)) {
                cmax = cmax * 10 + (ch - 0x30);
                if (cmax > MAX_REPS) throw this.error('Illegal repetition range');
                ch = this.read();
              }
            }
          }
          if (ch !== 0x7d) throw this.error('Unclosed counted closure');
          if (cmax < cmin) throw this.error('Illegal repetition range');
          ch = this.peek();
          if (ch === 0x3f) { this.next(); return loop(cmin, cmax, 'l', false); }
          if (ch === 0x2b) { this.next(); return loop(cmin, cmax, 'p', false); }
          return loop(cmin, cmax, 'g', false);
        }
        throw this.error('Illegal repetition');
      }
      default:
        return prev;
    }
  }

  // Java: Pattern#ref(int)
  ref(refNum) {
    let done = false;
    while (!done) {
      const ch = this.peek();
      if (ch >= 0x30 && ch <= 0x39) {
        const newRefNum = refNum * 10 + (ch - 0x30);
        // Add another number if it doesn't make a group that doesn't exist
        if (this.capturingGroupCount - 1 < newRefNum) {
          done = true;
        } else {
          refNum = newRefNum;
          this.read();
        }
      } else {
        done = true;
      }
    }
    this.hasGroupRef = true;
    if (this.has(CASE_INSENSITIVE)) return { k: 'backref', n: refNum, ci: this.has(UNICODE_CASE) ? 2 : 1 };
    return { k: 'backref', n: refNum, ci: 0 };
  }

  // Java: Pattern#escape(boolean,boolean,boolean); returns {ch} for a literal char or {ch:-1,node} for a meta escape
  escape(inclass, create, isrange) {
    const ch = this.skip();
    const meta = (node) => ({ ch: -1, node });
    const uc = this.has(UNICODE_CHARACTER_CLASS);
    // class escape (\d \s ...) yields a set; outside a class it becomes a node
    const cls = (set) => {
      if (create) {
        this.predicate = set;
        if (!inclass) return meta(this.charProp(set));
      }
      return { ch: -1, node: null };
    };
    switch (ch) {
      case 0x30: return { ch: this.o() };
      case 0x31: case 0x32: case 0x33: case 0x34: case 0x35: case 0x36: case 0x37: case 0x38: case 0x39:
        if (inclass) break;
        return meta(create ? this.ref(ch - 0x30) : null);
      case 0x41: // A
        if (inclass) break;
        return meta(create ? { k: 'begin' } : null);
      case 0x42: // B
        if (inclass) break;
        return meta(create ? { k: 'bound', both: false, uword: uc } : null);
      case 0x43: break; // C
      case 0x44: return cls((uc ? P.DIGIT() : P.ASCII_DIGIT).negate()); // D
      case 0x45: case 0x46: break; // E F
      case 0x47: // G
        if (inclass) break;
        return meta(create ? { k: 'lastMatch' } : null);
      case 0x48: return cls(P.HORIZ_WS().negate()); // H
      case 0x49: case 0x4a: case 0x4b: case 0x4c: case 0x4d: break;
      case 0x4e: return { ch: this.N() }; // N
      case 0x4f: case 0x50: case 0x51: break;
      case 0x52: // R
        if (inclass) break;
        return meta(create ? { k: 'lineEnding' } : null);
      case 0x53: return cls((uc ? P.WHITE_SPACE() : P.ASCII_SPACE).negate()); // S
      case 0x54: case 0x55: break;
      case 0x56: return cls(P.VERT_WS().negate()); // V
      case 0x57: return cls((uc ? P.WORD() : P.ASCII_WORD).negate()); // W
      case 0x58: // X
        if (inclass) break;
        return meta(create ? { k: 'xgrapheme' } : null);
      case 0x59: break;
      case 0x5a: // Z
        if (inclass) break;
        return meta(create ? { k: 'dollar', multi: false, unix: this.has(UNIX_LINES) } : null);
      case 0x61: return { ch: 7 };
      case 0x62: // b
        if (inclass) break;
        if (create) {
          if (this.peek() === 0x7b) {
            if (this.skip() === 0x67) {
              if (this.read() === 0x7d) return meta({ k: 'gbound' });
              break; // error
            }
            this.unread();
            this.unread();
          }
          return meta({ k: 'bound', both: true, uword: uc });
        }
        return meta(null);
      case 0x63: return { ch: this.c() };
      case 0x64: return cls(uc ? P.DIGIT() : P.ASCII_DIGIT); // d
      case 0x65: return { ch: 0x1b };
      case 0x66: return { ch: 0x0c };
      case 0x67: break;
      case 0x68: return cls(P.HORIZ_WS()); // h
      case 0x69: case 0x6a: break;
      case 0x6b: { // k
        if (inclass) break;
        if (this.read() !== 0x3c) throw this.error("\\k is not followed by '<' for named capturing group");
        const name = this.groupname(this.read());
        if (!this.namedGroups.has(name)) throw this.error(`named capturing group <${name}> does not exist`);
        if (create) {
          this.hasGroupRef = true;
          return meta({ k: 'backref', n: this.namedGroups.get(name), ci: this.has(CASE_INSENSITIVE) ? (this.has(UNICODE_CASE) ? 2 : 1) : 0 });
        }
        return meta(null);
      }
      case 0x6c: case 0x6d: break;
      case 0x6e: return { ch: 0x0a };
      case 0x6f: case 0x70: case 0x71: break;
      case 0x72: return { ch: 0x0d };
      case 0x73: return cls(uc ? P.WHITE_SPACE() : P.ASCII_SPACE); // s
      case 0x74: return { ch: 0x09 };
      case 0x75: return { ch: this.u() };
      case 0x76: // v: '\v' stays VT as a range endpoint (JDK-8034003)
        if (isrange) return { ch: 0x0b };
        return cls(P.VERT_WS());
      case 0x77: return cls(uc ? P.WORD() : P.ASCII_WORD); // w
      case 0x78: return { ch: this.x() };
      case 0x79: break;
      case 0x7a: // z
        if (inclass) break;
        return meta(create ? { k: 'end' } : null);
      default:
        return { ch };
    }
    throw this.error('Illegal/unsupported escape sequence');
  }

  // Java: Pattern#c()
  c() {
    if (this.cursor < this.patternLength) return this.read() ^ 64;
    throw this.error('Illegal control escape sequence');
  }

  // Java: Pattern#o()
  o() {
    const n = this.read();
    if (((n - 0x30) | (0x37 - n)) >= 0) {
      const m = this.read();
      if (((m - 0x30) | (0x37 - m)) >= 0) {
        const o = this.read();
        if ((((o - 0x30) | (0x37 - o)) >= 0) && (((n - 0x30) | (0x33 - n)) >= 0)) return (n - 0x30) * 64 + (m - 0x30) * 8 + (o - 0x30);
        this.unread();
        return (n - 0x30) * 8 + (m - 0x30);
      }
      this.unread();
      return n - 0x30;
    }
    throw this.error('Illegal octal escape sequence');
  }

  // Java: Pattern#x()
  x() {
    let n = this.read();
    if (isHexDigit(n)) {
      const m = this.read();
      if (isHexDigit(m)) return toDigit(n) * 16 + toDigit(m);
    } else if (n === 0x7b && isHexDigit(this.peek())) {
      let ch = 0;
      while (isHexDigit(n = this.read())) {
        ch = (ch << 4) + toDigit(n);
        if (ch > 0x10ffff) throw this.error('Hexadecimal codepoint is too big');
      }
      if (n !== 0x7d) throw this.error('Unclosed hexadecimal escape sequence');
      return ch;
    }
    throw this.error('Illegal hexadecimal escape sequence');
  }

  // Java: Pattern#uxxxx()
  uxxxx() {
    let n = 0;
    for (let i = 0; i < 4; i++) {
      const ch = this.read();
      if (!isHexDigit(ch)) throw this.error('Illegal Unicode escape sequence');
      n = n * 16 + toDigit(ch);
    }
    return n;
  }

  // Java: Pattern#u()
  u() {
    const n = this.uxxxx();
    if (n >= 0xd800 && n <= 0xdbff) {
      const cur = this.cursor;
      if (this.read() === 0x5c && this.read() === 0x75) {
        const n2 = this.uxxxx();
        if (n2 >= 0xdc00 && n2 <= 0xdfff) return ((n - 0xd800) << 10) + (n2 - 0xdc00) + 0x10000;
      }
      this.cursor = cur;
    }
    return n;
  }

  // Java: Pattern#N()
  N() {
    if (this.read() === 0x7b) {
      const i = this.cursor;
      while (this.read() !== 0x7d) {
        if (this.cursor >= this.patternLength) throw this.error('Unclosed character name escape sequence');
      }
      const name = String.fromCodePoint(...this.temp.slice(i, this.cursor - 1));
      const cp = codePointOfName(name);
      if (cp < 0) throw this.error(`Unknown character name [${name}]`);
      return cp;
    }
    throw this.error('Illegal character name escape sequence');
  }

  // Java: Pattern#family(boolean,boolean)
  family(singleLetter, isComplement) {
    this.next();
    let name;
    let p = null;
    const ci = this.has(CASE_INSENSITIVE);
    if (singleLetter) {
      const c = this.at(this.cursor);
      name = String.fromCodePoint(c);
      this.read();
    } else {
      const i = this.cursor;
      this.mark(0x7d);
      while (this.read() !== 0x7d) { /* scan to } */ }
      this.mark(0);
      const j = this.cursor;
      if (j > this.patternLength) throw this.error('Unclosed character family');
      if (i + 1 >= j) throw this.error('Empty character family');
      name = String.fromCodePoint(...this.temp.slice(i, j - 1));
    }
    const eq = name.indexOf('=');
    if (eq !== -1) {
      // property construct \p{name=value}
      const value = name.substring(eq + 1);
      name = name.substring(0, eq).toLowerCase();
      switch (name) {
        case 'sc': case 'script': p = P.forUnicodeScript(value); break;
        case 'blk': case 'block': p = P.forUnicodeBlock(value); break;
        case 'gc': case 'general_category': p = P.forProperty(value, ci); break;
        default: break;
      }
      if (p === null) throw this.error(`Unknown Unicode property {name=<${name}>, value=<${value}>}`);
    } else {
      if (name.startsWith('In')) {
        // \p{InBlockName}
        p = P.forUnicodeBlock(name.substring(2));
      } else if (name.startsWith('Is')) {
        // \p{IsGeneralCategory} and \p{IsScriptName}
        const shortName = name.substring(2);
        p = P.forUnicodeProperty(shortName, ci);
        if (p === null) p = P.forPOSIXName(shortName, ci);
        if (p === null) p = P.forProperty(shortName, ci);
        if (p === null) p = P.forUnicodeScript(shortName);
      } else {
        if (this.has(UNICODE_CHARACTER_CLASS)) p = P.forPOSIXName(name, ci);
        if (p === null) p = P.forProperty(name, ci);
      }
      if (p === null) throw this.error(`Unknown character property name {${name}}`);
    }
    return isComplement ? p.negate() : p;
  }

  // Java: Pattern#clazz(boolean)
  clazz(consume) {
    let prev = null;
    let curr = null;
    let bits = null; // union of single chars/ranges added to the BitClass
    let isNeg = false;
    let hasBits = false;
    let ch = this.next();
    // Negates if first char in a class, otherwise literal
    if (ch === 0x5e && this.at(this.cursor - 1) === 0x5b) {
      ch = this.next();
      isNeg = true;
    }
    for (;;) {
      switch (ch) {
        case 0x5b: // '['
          curr = this.clazz(true);
          prev = prev === null ? curr : prev.union(curr);
          ch = this.peek();
          continue;
        case 0x26: // '&'
          ch = this.next();
          if (ch === 0x26) {
            ch = this.next();
            let right = null;
            while (ch !== 0x5d && ch !== 0x26) {
              if (ch === 0x5b) {
                right = right === null ? this.clazz(true) : right.union(this.clazz(true));
              } else { // abc&&def
                this.unread();
                right = right === null ? this.clazz(false) : right.union(this.clazz(false));
              }
              ch = this.peek();
            }
            if (hasBits) {
              // bits used, union has high precedence
              if (prev === null) {
                prev = curr = bits;
              } else {
                prev = prev.union(bits);
              }
              hasBits = false;
            }
            if (right !== null) curr = right;
            if (prev === null) {
              if (right === null) throw this.error('Bad class syntax');
              prev = right;
            } else {
              // Java builds prev.and(null) here, which only fails (NPE) when a char of prev is matched; modelled as an empty intersection
              prev = prev.intersect(curr === null ? CharSet.empty() : curr);
            }
          } else {
            // treat as a literal &
            this.unread();
            break;
          }
          continue;
        case 0:
          if (this.cursor >= this.patternLength) throw this.error('Unclosed character class');
          break;
        case 0x5d: // ']'
          if (prev !== null || hasBits) {
            if (consume) this.next();
            if (prev === null) prev = bits;
            else if (hasBits) prev = prev.union(bits);
            return isNeg ? prev.negate() : prev;
          }
          break;
        default:
          break;
      }
      const r = this.range();
      if (r.bits) {
        // the bits used
        bits = bits === null ? r.set : bits.union(r.set);
        hasBits = true;
        curr = null;
      } else {
        curr = r.set;
        prev = prev === null ? curr : prev !== curr ? prev.union(curr) : prev;
      }
      ch = this.peek();
    }
  }

  // Java: Pattern#range(BitClass); {bits:true,set} when the char went into the BitClass
  range() {
    let ch = this.peek();
    const ci = this.has(CASE_INSENSITIVE);
    const uc = this.has(UNICODE_CASE);
    if (ch === 0x5c) {
      ch = this.nextEscaped();
      if (ch === 0x70 || ch === 0x50) { // A property
        const comp = ch === 0x50;
        let oneLetter = true;
        // Consume { if present
        ch = this.next();
        if (ch !== 0x7b) this.unread();
        else oneLetter = false;
        return { bits: false, set: this.family(oneLetter, comp) };
      } else { // ordinary escape
        const isrange = this.at(this.cursor + 1) === 0x2d;
        this.unread();
        const e = this.escape(true, true, isrange);
        ch = e.ch;
        if (ch === -1) return { bits: false, set: this.predicate };
      }
    } else {
      this.next();
    }
    if (ch >= 0) {
      if (this.peek() === 0x2d) {
        const endRange = this.at(this.cursor + 1);
        if (endRange === 0x5b) return { bits: true, set: classCharSet(ch, ci, uc) };
        if (endRange !== 0x5d) {
          this.next();
          let m = this.peek();
          if (m === 0x5c) {
            m = this.escape(true, false, true).ch;
          } else {
            this.next();
          }
          if (m < ch) throw this.error('Illegal character range');
          if (ci) return { bits: false, set: rangeSetCI(ch, m, uc) };
          return { bits: false, set: CharSet.range(ch, m) };
        }
      }
      return { bits: true, set: classCharSet(ch, ci, uc) };
    }
    throw this.error(`Unexpected character '${String.fromCharCode(ch)}'`);
  }

  // untranslatable construct
  unsupported(what) {
    return new IllegalArgumentException(`java regex translator: ${what} is not supported`);
  }
}

// ---- TreeInfo.study for look-behind validity (Java: Pattern.TreeInfo and Node#study, continuation passing over the AST) ----

class Info {
  constructor() {
    this.reset();
  }

  // Java: TreeInfo#reset()
  reset() {
    this.min = 0;
    this.max = 0;
    this.valid = true;
    this.det = true;
  }
}

const END = () => {};

// Java: Node#study(TreeInfo): next() studies the rest of the node chain
function st(n, info, next) {
  switch (n.k) {
    case 'empty': next(); return;
    case 'set': info.min = (info.min + 1) | 0; info.max = (info.max + 1) | 0; next(); return;
    case 'seq': stSeq(n.items, 0, info, next); return;
    case 'alt': stBranch(n.alts, info, next); return;
    case 'group': st(n.body, info, next); return;
    case 'atomic': st(n.body, info, END); next(); return; // Ques INDEPENDENT: the atom chain is closed
    case 'backref': info.valid = false; next(); return;
    case 'lineEnding': info.min = (info.min + 1) | 0; info.max = (info.max + 2) | 0; next(); return;
    case 'xgrapheme': info.det = false; next(); return;
    case 'loop': stLoop(n, info, next); return;
    default: next(); // zero-width nodes (look-arounds, anchors, \X, \b{g})
  }
}

// sequence of nodes as one chain
function stSeq(items, j, info, next) {
  if (j >= items.length) next();
  else st(items[j], info, () => stSeq(items, j + 1, info, next));
}

// Java: Pattern.Branch#study
function stBranch(alts, info, next) {
  let minL = info.min;
  let maxL = info.max;
  let maxV = info.valid;
  let minL2 = 0x7fffffff;
  let maxL2 = -1;
  for (const a of alts) {
    info.reset();
    if (a.k !== 'empty') st(a, info, END);
    minL2 = Math.min(minL2, info.min);
    maxL2 = Math.max(maxL2, info.max);
    maxV = maxV && info.valid;
  }
  minL = (minL + minL2) | 0;
  maxL = (maxL + maxL2) | 0;
  info.reset();
  next();
  info.min = (info.min + minL) | 0;
  info.max = (info.max + maxL) | 0;
  info.valid = info.valid && maxV;
  info.det = false;
}

// Java: Ques#study / Curly#study / GroupCurly#study / CharPropertyGreedy#study / Loop#study
function stLoop(n, info, next) {
  const body = n.body;
  const isGroup = body.k === 'group';
  if (isGroup && n.quest && n.mode !== 'p') {
    stBranch([body, EMPTY], info, next); // (X)? and (X)?? are compiled to a Branch
    return;
  }
  if (n.quest) { // Ques
    const minL = info.min;
    st(body, info, END);
    info.min = minL;
    info.det = false;
    next();
    return;
  }
  if (isGroup && n.mode !== 'p') {
    const probe = new Info();
    st(body, probe, END);
    if (!probe.det) { // Loop (non-deterministic body)
      info.valid = false;
      info.det = false;
      return;
    }
  }
  if (body.k === 'set' && n.mode === 'g' && n.max === MAX_REPS) { // CharPropertyGreedy
    info.min = (info.min + n.min) | 0;
    if (info.valid) info.max = (info.max + MAX_REPS) | 0;
    info.det = false;
    next();
    return;
  }
  // Curly / GroupCurly
  const minL = info.min;
  const maxL = info.max;
  const maxV = info.valid;
  const detm = info.det;
  info.reset();
  st(body, info, END);
  let temp = (Math.imul(info.min, n.min) + minL) | 0;
  if (temp < minL) temp = 0xfffffff;
  info.min = temp;
  if (maxV && info.valid) {
    temp = (Math.imul(info.max, n.max) + maxL) | 0;
    info.max = temp;
    if (temp < maxL) info.valid = false;
  } else {
    info.valid = false;
  }
  if (info.det && n.min === n.max) info.det = detm;
  else info.det = false;
  next();
}

// Node#study over a whole node: {min,max,valid,det}
export function study(node) {
  const info = new Info();
  st(node, info, END);
  return { min: info.min, max: info.max, valid: info.valid, det: info.det };
}
