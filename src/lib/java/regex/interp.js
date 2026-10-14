// Own backtracking matcher over the regex AST, mirroring the node semantics of java.util.regex.Pattern (JDK 17).
// Used for the constructs a native RegExp cannot express exactly (see emit.js#interpReason) and for search starts inside surrogate pairs.
import { StringIndexOutOfBoundsException } from '../errors.js';
import { toLowerCase, toUpperCase } from '../Character.js';
import { MAX_REPS, study } from './parser.js';
import * as P from './props.js';

const ENDANCHOR = 1;

const isHigh = (c) => (c & 0xfc00) === 0xd800;
const isLow = (c) => (c & 0xfc00) === 0xdc00;

// Java: Pattern#countChars(CharSequence,int,int)
function countChars(seq, index, lengthInCodePoints) {
  // optimization
  if (lengthInCodePoints === 1 && !isHigh(seq.charCodeAt(index))) return 1;
  const length = seq.length;
  let x = index;
  if (lengthInCodePoints >= 0) {
    for (let i = 0; x < length && i < lengthInCodePoints; i++) {
      if (isHigh(seq.charCodeAt(x++))) {
        if (x < length && isLow(seq.charCodeAt(x))) x++;
      }
    }
    return x - index;
  }
  if (index === 0) return 0;
  const len = -lengthInCodePoints;
  for (let i = 0; x > 0 && i < len; i++) {
    if (isLow(seq.charCodeAt(--x))) {
      if (x > 0 && isHigh(seq.charCodeAt(x - 1))) x--;
    }
  }
  return index - x;
}

let segmenter = null;

// grapheme cluster segmenter (ICU data of the running Node, not JDK 17's Unicode 13 rules)
function graphemes() {
  if (segmenter === null) segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
  return segmenter;
}

// lone surrogate at i (Java's Grapheme treats surrogate code points as Control: always a cluster of their own)
function loneSurrogate(text, i) {
  const c = text.charCodeAt(i);
  if (isHigh(c)) return !(i + 1 < text.length && isLow(text.charCodeAt(i + 1)));
  if (isLow(c)) return !(i > 0 && isHigh(text.charCodeAt(i - 1)));
  return false;
}

// Java: Grapheme#nextBoundary(CharSequence,int,int)
function nextBoundary(text, i) {
  if (loneSurrogate(text, i)) return i + 1;
  const seg = graphemes().segment(text.substring(i)).containing(0);
  let e = i + seg.segment.length;
  for (let x = i + 1; x < e; x++) if (loneSurrogate(text, x)) { e = x; break; }
  return e;
}

// Java: Grapheme#isBoundary(CharSequence,int,int)
function isBoundary(text, i) {
  if (i === 0 || i >= text.length) return true;
  if (loneSurrogate(text, i) || loneSurrogate(text, i - 1)) return true;
  const seg = graphemes().segment(text).containing(i);
  return seg.index === i;
}

const wordSets = new Map();

// membership functions for \b: [isWord, isLetterOrDigit, isNonSpacingMark]
function boundSets(uword) {
  let s = wordSets.get(uword);
  if (s === undefined) {
    const W = uword ? P.WORD() : P.LETTER_OR_DIGIT().union(P.ASCII_WORD);
    s = { word: W, ld: P.LETTER_OR_DIGIT(), mn: P.category(1 << P.TYPE.NON_SPACING_MARK) };
    wordSets.set(uword, s);
  }
  return s;
}

// compile the AST into run(text, from, anchor, oldLast, search) -> flat group offsets or null
export function compileInterp(root, gc, supp = false) {
  const S = { text: '', len: 0, g: new Int32Array(2 * (gc + 1)), anchor: 0, oldLast: 0, lbt: -1, last: 0 };
  const g = S.g;
  const starts = new Array(gc + 1).fill(-1); // group start of the open group (Java: locals[localIndex])

  // Java: Node.match chain end (Pattern.LastNode)
  const accept = (i) => {
    if (S.anchor === ENDANCHOR && i !== S.len) return false;
    S.last = i;
    return true;
  };

  // compile node with continuation k
  function comp(n, k) {
    switch (n.k) {
      case 'empty': return k;
      case 'set': return compSet(n.set, k);
      case 'seq': {
        let f = k;
        for (let j = n.items.length - 1; j >= 0; j--) f = comp(n.items[j], f);
        return f;
      }
      case 'alt': {
        const fs = n.alts.map((a) => comp(a, k));
        return (i) => {
          for (let j = 0; j < fs.length; j++) if (fs[j](i)) return true;
          return false;
        };
      }
      case 'group': return compGroup(n, k);
      case 'loop': return compLoop(n, k);
      case 'atomic': {
        const cond = atomicCond(n.body);
        return (i) => {
          const e = cond(i);
          return e >= 0 && k(e);
        };
      }
      case 'look': return compLook(n, k);
      case 'backref': return compBackref(n, k);
      case 'begin': return (i) => i === 0 && k(i);
      case 'end': return (i) => i === S.len && k(i);
      case 'caret': return (i) => caret(n, i) && k(i);
      case 'dollar': return (i) => dollar(n, i) && k(i);
      case 'bound': {
        const bs = boundSets(n.uword);
        return (i) => {
          const b = bound(bs, i);
          return (n.both ? b : !b) && k(i);
        };
      }
      case 'lastMatch': return (i) => i === S.oldLast && k(i);
      case 'lineEnding': return (i) => {
        if (i < S.len) {
          const ch = S.text.charCodeAt(i);
          if (ch === 0x0a || ch === 0x0b || ch === 0x0c || ch === 0x85 || ch === 0x2028 || ch === 0x2029) return k(i + 1);
          if (ch === 0x0d) {
            let j = i + 1;
            if (j < S.len) {
              if (S.text.charCodeAt(j) === 0x0a && k(j + 1)) return true;
            }
            return k(j);
          }
        }
        return false;
      };
      case 'xgrapheme': return (i) => (i < S.len ? k(nextBoundary(S.text, i)) : false);
      case 'gbound': return (i) => (i === 0 || (i >= 0 && i <= S.len && isBoundary(S.text, i))) && k(i);
      default: throw new Error(`regex interpreter: node ${n.k}`);
    }
  }

  // Java: Pattern.CharProperty#match
  function compSet(set, k) {
    return (i) => {
      if (i < S.len) {
        const t = S.text;
        const c = t.codePointAt(i);
        if (set.has(c)) return k(i + (c > 0xffff ? 2 : 1));
      }
      return false;
    };
  }

  // Java: Pattern.GroupHead / GroupTail
  function compGroup(n, k) {
    if (n.n === 0) return comp(n.body, k);
    const gi = n.n;
    const tail = (i) => {
      const tmp = starts[gi];
      const gs = g[2 * gi];
      const ge = g[2 * gi + 1];
      g[2 * gi] = tmp;
      g[2 * gi + 1] = i;
      if (k(i)) return true;
      g[2 * gi] = gs;
      g[2 * gi + 1] = ge;
      return false;
    };
    const body = comp(n.body, tail);
    return (i) => {
      const save = starts[gi];
      starts[gi] = i;
      const ret = body(i);
      starts[gi] = save;
      return ret;
    };
  }

  // one atom match returning its end (or -1), no backtracking into it (Java: atom.match(...) && matcher.last)
  function atomicCond(body) {
    let end = -1;
    const f = comp(body, (i) => {
      end = i;
      return true;
    });
    return (i) => (f(i) ? end : -1);
  }

  // Java: Pattern.Curly / Loop / LazyLoop / Ques
  function compLoop(n, k) {
    const { min, max } = n;
    if (n.body.k === 'set') return compSetLoop(n, k);
    if (n.mode === 'p') {
      const cond = atomicCond(n.body);
      return (i) => {
        for (let j = 0; j < min; j++) {
          const e = cond(i);
          if (e < 0) return false;
          i = e;
        }
        for (let j = min; j < max; j++) {
          const e = cond(i);
          if (e < 0) break;
          if (i === e) break;
          i = e;
        }
        return k(i);
      };
    }
    if (n.body.k !== 'group') return compCurly(atomicCond(n.body), n, k); // Curly: the atom matches once
    if (!n.quest && study(n.body.body).det) return compGroupCurly(n, k);
    // Loop / LazyLoop with the locals of the Java nodes
    let count = 0;
    let begin = -1;
    let bodyFn = null;
    const bodyEntry = (i) => {
      const save = begin;
      begin = i;
      const r = bodyFn(i);
      begin = save;
      return r;
    };
    if (n.mode === 'g') {
      const loopMatch = (i) => {
        // Avoid infinite loop in zero-length case.
        if (i > begin) {
          const c = count;
          if (c < min) {
            count = c + 1;
            const b = bodyEntry(i);
            if (!b) count = c;
            return b;
          }
          if (c < max) {
            count = c + 1;
            if (bodyEntry(i)) return true;
            count = c;
          }
        }
        return k(i);
      };
      bodyFn = comp(n.body, loopMatch);
      return (i) => {
        const save = count;
        let ret;
        if (min > 0) {
          count = 1;
          ret = bodyEntry(i);
        } else if (max > 0) {
          count = 1;
          ret = bodyEntry(i);
          if (!ret) ret = k(i);
        } else {
          ret = k(i);
        }
        count = save;
        return ret;
      };
    }
    // lazy
    const loopMatch = (i) => {
      if (i > begin) {
        const c = count;
        if (c < min) {
          count = c + 1;
          const b = bodyEntry(i);
          if (!b) count = c;
          return b;
        }
        if (k(i)) return true;
        if (c < max) {
          count = c + 1;
          const result = bodyEntry(i);
          if (!result) count = c;
          return result;
        }
        return false;
      }
      return k(i);
    };
    bodyFn = comp(n.body, loopMatch);
    return (i) => {
      const save = count;
      let ret;
      if (min > 0) {
        count = 1;
        ret = bodyEntry(i);
      } else if (max > 0) {
        if (k(i)) ret = true;
        else {
          count = 1;
          ret = bodyEntry(i);
        }
      } else {
        ret = k(i);
      }
      count = save;
      return ret;
    };
  }

  // Java: Pattern.GroupCurly (group with a deterministic body quantified greedy or lazy)
  function compGroupCurly(n, k) {
    const { min, max } = n;
    const gr = n.body;
    const gi = gr.n;
    const capture = gi > 0;
    const cond = atomicCond(gr.body);
    const setG = (a, b) => {
      g[2 * gi] = a;
      g[2 * gi + 1] = b;
    };
    // Java: GroupCurly#match0
    const match0 = (i, j) => {
      const mn = j;
      const sv0 = capture ? g[2 * gi] : 0;
      const sv1 = capture ? g[2 * gi + 1] : 0;
      const starts = [];
      let zero = false;
      while (j < max) {
        const e = cond(i);
        if (e < 0) break;
        if (e - i <= 0) {
          if (capture) setG(i, e);
          zero = true;
          break;
        }
        starts.push(i);
        if (capture) setG(i, e);
        i = e;
        j++;
      }
      if (!zero) {
        while (j > mn) {
          if (k(i)) return true;
          // backing off
          i = starts.pop();
          j--;
          if (capture && j > mn) setG(starts[starts.length - 1], i);
        }
      }
      if (capture) setG(sv0, sv1);
      return k(i);
    };
    // Java: GroupCurly#match1
    const match1 = (i, j) => {
      for (;;) {
        if (k(i)) return true;
        if (j >= max) return false;
        const e = cond(i);
        if (e < 0) return false;
        if (i === e) return false;
        if (capture) setG(i, e);
        i = e;
        j++;
      }
    };
    return (i) => {
      const s0 = capture ? g[2 * gi] : 0;
      const s1 = capture ? g[2 * gi + 1] : 0;
      let ret = true;
      let j;
      for (j = 0; j < min; j++) {
        const e = cond(i);
        if (e >= 0) {
          if (capture) setG(i, e);
          i = e;
        } else {
          ret = false;
          break;
        }
      }
      if (ret) ret = n.mode === 'g' ? match0(i, min) : match1(i, min);
      if (!ret && capture) setG(s0, s1);
      return ret;
    };
  }

  // Java: Pattern.Curly#match / match0 / match1 / match2 over an atom that matches once (cond returns the end or -1)
  function compCurly(cond, n, k) {
    const { min, max } = n;
    const match0 = (i, j) => {
      if (j >= max) return k(i);
      const backLimit = j;
      const e = cond(i);
      if (e >= 0) {
        const kk = e - i;
        if (kk !== 0) {
          i = e;
          j++;
          while (j < max) {
            const e2 = cond(i);
            if (e2 < 0) break;
            if (i + kk !== e2) {
              if (match0(e2, j + 1)) return true;
              break;
            }
            i += kk;
            j++;
          }
          while (j >= backLimit) {
            if (k(i)) return true;
            i -= kk;
            j--;
          }
          return false;
        }
      }
      return k(i);
    };
    const match1 = (i, j) => {
      for (;;) {
        if (k(i)) return true;
        if (j >= max) return false;
        const e = cond(i);
        if (e < 0) return false;
        if (i === e) return false;
        i = e;
        j++;
      }
    };
    const match2 = (i, j) => {
      for (; j < max; j++) {
        const e = cond(i);
        if (e < 0) break;
        if (i === e) break;
        i = e;
      }
      return k(i);
    };
    return (i) => {
      let j;
      for (j = 0; j < min; j++) {
        const e = cond(i);
        if (e < 0) return false;
        i = e;
      }
      if (n.mode === 'g') return match0(i, j);
      if (n.mode === 'l') return match1(i, j);
      return match2(i, j);
    };
  }

  // quantified single-char set
  function compSetLoop(n, k) {
    const { min, max } = n;
    const set = n.body.set;
    // end of the char at i if it is in the set, else -1
    const cond = (i) => {
      if (i >= S.len) return -1;
      const c = S.text.codePointAt(i);
      return set.has(c) ? i + (c > 0xffff ? 2 : 1) : -1;
    };
    if (n.mode === 'g' && max === MAX_REPS) {
      // Java: CharPropertyGreedy (observed: backs off over the chars it consumed, also from inside a surrogate pair)
      return (i) => {
        const pos = [];
        while (i < S.len) {
          const e = cond(i);
          if (e < 0) break;
          pos.push(i);
          i = e;
        }
        let cnt = pos.length;
        while (cnt >= min) {
          if (k(i)) return true;
          if (cnt === min) return false;
          i = pos[--cnt];
        }
        return false;
      };
    }
    return compCurly(cond, n, k);
  }

  // Java: Pattern.Pos / Neg / Behind / NotBehind (and the S variants for patterns with supplementary chars)
  function compLook(n, k) {
    if (!n.behind) {
      const cond = comp(n.body, () => true);
      if (n.neg) return (i) => !cond(i) && k(i);
      return (i) => cond(i) && k(i);
    }
    const rmin = n.min;
    const rmax = n.max;
    const cond = comp(n.body, (i) => i === S.lbt);
    const test = (i) => {
      let matched = false;
      const saved = S.lbt;
      S.lbt = i;
      if (n.supp) {
        const rmaxChars = countChars(S.text, i, -rmax);
        const rminChars = countChars(S.text, i, -rmin);
        const from = Math.max(i - rmaxChars, 0);
        for (let j = i - rminChars; !matched && j >= from; j -= j > from ? countChars(S.text, j, -1) : 1) matched = cond(j);
      } else {
        const from = Math.max((i - rmax) | 0, 0);
        for (let j = i - rmin; !matched && j >= from; j--) matched = cond(j);
      }
      S.lbt = saved;
      return matched;
    };
    if (n.neg) return (i) => !test(i) && k(i);
    return (i) => test(i) && k(i);
  }

  // Java: Pattern.BackRef / CIBackRef
  function compBackref(n, k) {
    const gi = n.n;
    return (i) => {
      const j0 = gi <= gc ? g[2 * gi] : -1;
      const e = gi <= gc ? g[2 * gi + 1] : -1;
      if (j0 < 0) return false;
      const groupSize = e - j0;
      const t = S.text;
      if (i + groupSize > S.len) return false;
      if (n.ci === 0) {
        for (let index = 0; index < groupSize; index++) if (t.charCodeAt(i + index) !== t.charCodeAt(j0 + index)) return false;
        return k(i + groupSize);
      }
      let x = i;
      let j = j0;
      for (let index = 0; index < groupSize; index++) {
        if (x >= t.length || j >= t.length) throw new StringIndexOutOfBoundsException(`index ${x >= t.length ? x : j}, length ${t.length}`);
        const c1 = t.codePointAt(x);
        const c2 = t.codePointAt(j);
        if (c1 !== c2) {
          if (n.ci === 2) {
            const cc1 = toUpperCase(c1);
            const cc2 = toUpperCase(c2);
            if (cc1 !== cc2 && toLowerCase(cc1) !== toLowerCase(cc2)) return false;
          } else {
            const l1 = c1 >= 0x41 && c1 <= 0x5a ? c1 + 32 : c1;
            const l2 = c2 >= 0x41 && c2 <= 0x5a ? c2 + 32 : c2;
            if (l1 !== l2) return false;
          }
        }
        x += c1 > 0xffff ? 2 : 1;
        j += c2 > 0xffff ? 2 : 1;
      }
      return k(i + groupSize);
    };
  }

  // Java: Pattern.Caret / UnixCaret
  function caret(n, i) {
    if (i === S.len) return false; // Perl does not match ^ at end of input even after newline
    if (i > 0) {
      const ch = S.text.charCodeAt(i - 1);
      if (n.unix) return ch === 0x0a;
      if (ch !== 0x0a && ch !== 0x0d && (ch | 1) !== 0x2029 && ch !== 0x85) return false;
      // Should treat /r/n as one newline
      if (ch === 0x0d && S.text.charCodeAt(i) === 0x0a) return false;
    }
    return true;
  }

  // Java: Pattern.Dollar / UnixDollar
  function dollar(n, i) {
    const end = S.len;
    const t = S.text;
    if (n.unix) {
      if (i < end) {
        if (t.charCodeAt(i) !== 0x0a) return false;
        // If not multiline, then only possible to match at last char
        if (!n.multi && i !== end - 1) return false;
      }
      return true;
    }
    if (!n.multi) {
      if (i < end - 2) return false;
      if (i === end - 2) {
        if (t.charCodeAt(i) !== 0x0d) return false;
        if (t.charCodeAt(i + 1) !== 0x0a) return false;
      }
    }
    // Matches before any line terminator; also matches at the end of input
    if (i < end) {
      const ch = t.charCodeAt(i);
      if (ch === 0x0a) {
        // No match between \r\n
        if (i > 0 && t.charCodeAt(i - 1) === 0x0d) return false;
        if (n.multi) return true;
      } else if (ch === 0x0d || ch === 0x85 || (ch | 1) === 0x2029) {
        if (n.multi) return true;
      } else { // No line terminator, no match
        return false;
      }
    }
    return true;
  }

  // Java: Pattern.Bound#check
  function bound(bs, i) {
    const t = S.text;
    let left = false;
    if (i > 0) {
      const ch = codePointBefore(t, i);
      left = bs.word.has(ch) || (bs.mn.has(ch) && hasBase(bs, i - 1));
    }
    let right = false;
    if (i < S.len) {
      const ch = t.codePointAt(i);
      right = bs.word.has(ch) || (bs.mn.has(ch) && hasBase(bs, i));
    }
    return left !== right;
  }

  // Java: Pattern.Bound#hasBaseCharacter
  function hasBase(bs, i) {
    const t = S.text;
    for (let x = i; x >= 0; x--) {
      const ch = t.codePointAt(x);
      if (bs.ld.has(ch)) return true;
      if (bs.mn.has(ch)) continue;
      return false;
    }
    return false;
  }

  const m = comp(root, accept);
  const st = study(root);
  const minLength = st.min < 0 ? 0 : st.min;

  return function run(text, from, anchor, oldLast, search) {
    S.text = text;
    S.len = text.length;
    S.anchor = anchor;
    S.oldLast = oldLast;
    S.lbt = -1;
    g.fill(-1);
    starts.fill(-1);
    let found = -1;
    if (search) {
      const guard = S.len - minLength;
      for (let i = from; i <= guard; i++) {
        if (m(i)) {
          found = i;
          break;
        }
        // Java: StartS steps by code point when the pattern text has supplementary characters
        if (supp) {
          if (i === guard) break;
          if (isHigh(text.charCodeAt(i)) && i + 1 < text.length && isLow(text.charCodeAt(i + 1))) i++;
        }
      }
    } else if (m(from)) {
      found = from;
    }
    if (found < 0) return null;
    const out = new Array(2 * (gc + 1));
    for (let j = 2; j < out.length; j++) out[j] = g[j];
    out[0] = found;
    out[1] = S.last;
    return out;
  };
}

// Java: Character.codePointBefore(CharSequence,int)
function codePointBefore(t, i) {
  const c2 = t.charCodeAt(i - 1);
  if (isLow(c2) && i - 2 >= 0) {
    const c1 = t.charCodeAt(i - 2);
    if (isHigh(c1)) return ((c1 - 0xd800) << 10) + (c2 - 0xdc00) + 0x10000;
  }
  return c2;
}

export { MAX_REPS };
