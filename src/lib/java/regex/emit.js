// AST -> JS RegExp source (u flag, no i/m/s flags: Java semantics are spelled out as explicit classes and lookarounds).
import { CharSet, MAX_CP } from './charset.js';
import * as P from './props.js';
import { MAX_REPS, study } from './parser.js';

// ---- analysis: which constructs JS RegExp cannot express exactly ----

// can the node match the empty string
export function nullable(n) {
  switch (n.k) {
    case 'set': case 'lineEnding': case 'xgrapheme': return false;
    case 'seq': return n.items.every(nullable);
    case 'alt': return n.alts.some(nullable);
    case 'group': case 'atomic': return nullable(n.body);
    case 'loop': return n.min === 0 || nullable(n.body);
    default: return true;
  }
}

// does the node try every non-empty way of matching before any empty one (JS drops empty iterations of a quantified body, Java accepts them)
function emptyLast(n) {
  switch (n.k) {
    case 'seq': return n.items.every(emptyLast);
    case 'alt': {
      // a nullable alternative is only safe as the last one
      for (let j = 0; j < n.alts.length; j++) {
        if (!emptyLast(n.alts[j])) return false;
        if (j < n.alts.length - 1 && nullable(n.alts[j])) return false;
      }
      return true;
    }
    case 'group': case 'atomic': return emptyLast(n.body);
    case 'loop': return n.mode === 'g' && emptyLast(n.body);
    default: return true;
  }
}

// all capture groups inside the node
function groupsIn(n, out = new Set()) {
  switch (n.k) {
    case 'seq': for (const i of n.items) groupsIn(i, out); break;
    case 'alt': for (const i of n.alts) groupsIn(i, out); break;
    case 'group': if (n.n > 0) out.add(n.n); groupsIn(n.body, out); break;
    case 'atomic': case 'look': case 'loop': groupsIn(n.body, out); break;
    default: break;
  }
  return out;
}

// capture groups assigned on every path through the node
function definite(n) {
  switch (n.k) {
    case 'seq': {
      const s = new Set();
      for (const i of n.items) for (const g of definite(i)) s.add(g);
      return s;
    }
    case 'alt': {
      let s = null;
      for (const a of n.alts) {
        const d = definite(a);
        s = s === null ? d : new Set([...s].filter((g) => d.has(g)));
      }
      return s ?? new Set();
    }
    case 'group': {
      const s = definite(n.body);
      if (n.n > 0) s.add(n.n);
      return s;
    }
    case 'atomic': return definite(n.body);
    case 'look': return n.neg ? new Set() : definite(n.body);
    case 'loop': return n.min >= 1 ? definite(n.body) : new Set();
    default: return new Set();
  }
}

// does the node contain a node of the given kinds
function contains(n, pred) {
  if (pred(n)) return true;
  switch (n.k) {
    case 'seq': return n.items.some((i) => contains(i, pred));
    case 'alt': return n.alts.some((i) => contains(i, pred));
    case 'group': case 'atomic': case 'look': case 'loop': return contains(n.body, pred);
    default: return false;
  }
}

// reason why the AST needs the own matcher, or null when JS RegExp is exact
export function interpReason(root) {
  let reason = null;
  let spanSafe = true;
  // capOnly: only the capture groups differ (match spans stay exact on a native RegExp)
  const fail = (r, capOnly = false) => {
    if (reason === null) reason = r;
    if (!capOnly) spanSafe = false;
  };
  // returns the set of definitely assigned groups after the node
  const walk = (n, def, inBehind) => {
    switch (n.k) {
      case 'lastMatch': fail('\\G'); return def;
      case 'xgrapheme': fail('\\X'); return def;
      case 'gbound': fail('\\b{g}'); return def;
      case 'backref':
        if (n.ci > 0) fail('case-insensitive back-reference');
        else if (inBehind) fail('back-reference in look-behind');
        else if (!def.has(n.n)) fail('back-reference to a group that may be unset');
        return def;
      case 'seq': {
        let d = def;
        for (const i of n.items) d = walk(i, d, inBehind);
        return d;
      }
      case 'alt': {
        let out = null;
        for (const a of n.alts) {
          const d = walk(a, new Set(def), inBehind);
          out = out === null ? d : new Set([...out].filter((g) => d.has(g)));
        }
        return out ?? def;
      }
      case 'group': {
        const d = new Set(walk(n.body, def, inBehind));
        if (n.n > 0) d.add(n.n);
        return d;
      }
      case 'atomic':
        if (inBehind) fail('atomic group in look-behind');
        if (groupsIn(n.body).size > 0) fail('capture group inside an atomic group', true);
        return walk(n.body, def, inBehind);
      case 'look': {
        // Java keeps captures made inside a look-around even when the path later backtracks; JS restores them
        if (groupsIn(n.body).size > 0) fail('capture group inside a look-around', true);
        const d = walk(n.body, new Set(def), inBehind || n.behind);
        return n.neg ? def : d;
      }
      case 'loop': {
        if (n.mode === 'p' && inBehind) fail('possessive quantifier in look-behind');
        if (n.body.k === 'lineEnding') fail('quantified \\R (Java commits to one alternative per iteration)');
        const gs = groupsIn(n.body);
        // Java never restores captures nested in a GroupCurly/possessive body when the path backtracks
        if (gs.size > 0 && n.mode === 'p') fail('capture group inside a possessive quantifier', true);
        if (n.body.k === 'group' && !n.quest && n.mode !== 'p' && study(n.body.body).det && groupsIn(n.body.body).size > 0) fail('capture group nested in a quantified deterministic group', true);
        if (nullable(n.body) && (gs.size > 0 || !emptyLast(n.body))) fail('quantified body that can match the empty string', emptyLast(n.body));
        if (n.max > 1 && gs.size > 0) {
          const dd = definite(n.body);
          for (const g of gs) if (!dd.has(g)) fail('capture group that does not participate in every iteration', true);
        }
        const d = walk(n.body, new Set(def), inBehind);
        return n.min >= 1 ? d : def;
      }
      default: return def;
    }
  };
  walk(root, new Set(), false);
  if (reason !== null && contains(root, (x) => x.k === 'backref')) spanSafe = false;
  return reason === null ? null : { reason, spanSafe };
}

// possible first code points of a match and whether the node can match without consuming
function firstOf(n) {
  const none = CharSet.empty();
  switch (n.k) {
    case 'empty': return { set: none, nullable: true };
    case 'set': return { set: n.set, nullable: false };
    case 'seq': {
      let acc = none;
      for (const i of n.items) {
        const f = firstOf(i);
        acc = acc.union(f.set);
        if (!f.nullable) return { set: acc, nullable: false };
      }
      return { set: acc, nullable: true };
    }
    case 'alt': {
      let acc = none;
      let nullable = false;
      for (const a of n.alts) {
        const f = firstOf(a);
        acc = acc.union(f.set);
        nullable = nullable || f.nullable;
      }
      return { set: acc, nullable };
    }
    case 'group': case 'atomic': return firstOf(n.body);
    case 'loop': {
      if (n.max === 0) return { set: none, nullable: true };
      const f = firstOf(n.body);
      return { set: f.set, nullable: n.min === 0 || f.nullable };
    }
    case 'backref': case 'xgrapheme': return { set: CharSet.all(), nullable: n.k === 'backref' };
    case 'lineEnding': return { set: P.LINE_TERMINATORS().union(CharSet.of(0x0b)).union(CharSet.of(0x0c)), nullable: false };
    default: return { set: none, nullable: true }; // zero-width assertions
  }
}

const LOW_SURROGATES = CharSet.range(0xdc00, 0xdfff);

const BMP_PLAIN = CharSet.range(0, 0xd7ff).union(CharSet.range(0xe000, 0xffff));

// every set inside look-behinds consumes one UTF-16 unit per char (Java measures look-behind lengths in units)
function behindUnitSafe(n, inBehind) {
  switch (n.k) {
    case 'set': return !inBehind || n.set.subtract(BMP_PLAIN).isEmpty;
    case 'seq': return n.items.every((i) => behindUnitSafe(i, inBehind));
    case 'alt': return n.alts.every((i) => behindUnitSafe(i, inBehind));
    case 'group': case 'atomic': case 'loop': return behindUnitSafe(n.body, inBehind);
    case 'look': return behindUnitSafe(n.body, inBehind || n.behind);
    default: return true;
  }
}

// true when texts with surrogate pairs give the same result on the native RegExp: no match can start at a UTF-16
// position inside a pair (the u-mode RegExp never starts there) and look-behinds see one unit per char
export function pairSafe(root) {
  const f = firstOf(root);
  return !f.nullable && f.set.intersect(LOW_SURROGATES).isEmpty && behindUnitSafe(root, false);
}

// ---- source generation ----

const hex4 = (c) => c.toString(16).toUpperCase().padStart(4, '0');

// code point as it is written inside a class
function clsCp(c) {
  if ((c >= 0x30 && c <= 0x39) || (c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a)) return String.fromCharCode(c);
  if (c < 0x10000 && (c < 0xd800 || c > 0xdfff)) return `\\u${hex4(c)}`;
  return `\\u{${c.toString(16).toUpperCase()}}`;
}

// code point outside a class
function litCp(c) {
  if ((c >= 0x30 && c <= 0x39) || (c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a) || c === 0x20 || c === 0x5f) return String.fromCharCode(c);
  return clsCp(c);
}

// ranges of a set as class body
function ranges(r) {
  let s = '';
  for (let i = 0; i < r.length; i += 2) {
    s += r[i] === r[i + 1] ? clsCp(r[i]) : r[i] + 1 === r[i + 1] ? clsCp(r[i]) + clsCp(r[i + 1]) : `${clsCp(r[i])}-${clsCp(r[i + 1])}`;
  }
  return s;
}

const setCache = new WeakMap();

// JS source matching one code point of the set
export function setSource(set) {
  let s = setCache.get(set);
  if (s !== undefined) return s;
  const r = set.r;
  if (r.length === 0) s = '[]';
  else if (r.length === 2 && r[0] === 0 && r[1] === MAX_CP) s = '[^]';
  else if (r.length === 2 && r[0] === r[1]) s = litCp(r[0]);
  else {
    const neg = set.negate().r;
    s = neg.length < r.length ? `[^${ranges(neg)}]` : `[${ranges(r)}]`;
  }
  setCache.set(set, s);
  return s;
}


const LINE_TERM_CLASS = '[\\n\\r\\u0085\\u2028\\u2029]';

// word-boundary pieces (Java: Pattern.Bound#check), memoized per mode
const boundCache = new Map();

// source pieces for \b / \B
function boundSources(uword) {
  let b = boundCache.get(uword);
  if (b === undefined) {
    const Wset = uword ? P.WORD() : P.LETTER_OR_DIGIT().union(CharSet.of(0x5f));
    const W = setSource(Wset);
    const LD = P.LETTER_OR_DIGIT();
    const MN = P.category(1 << P.TYPE.NON_SPACING_MARK);
    const bmp = CharSet.range(0, 0xffff);
    const LDb = setSource(LD.intersect(bmp));
    const MNb = setSource(MN.intersect(bmp));
    const MNa = setSource(MN);
    const Lpos = `(?<=${W}|${LDb}${MNb}+)`;
    const Lneg = `(?<!${W}|${LDb}${MNb}+)`;
    const Rpos = `(?:(?=${W})|(?=${MNa})(?<=${LDb}${MNb}*))`;
    const Rneg = `(?!${W})(?:(?!${MNa})|(?<!${LDb}${MNb}*))`;
    b = { bound: `(?:${Lpos}${Rneg}|${Lneg}${Rpos})`, notBound: `(?:${Lpos}${Rpos}|${Lneg}${Rneg})`, lpos: Lpos, lneg: Lneg, rpos: Rpos, rneg: Rneg, W: Wset, MN };
    boundCache.set(uword, b);
  }
  return b;
}

// quantifier suffix
function quant(min, max, lazy) {
  let q;
  if (min === 0 && max === 1) q = '?';
  else if (min === 0 && max === MAX_REPS) q = '*';
  else if (min === 1 && max === MAX_REPS) q = '+';
  else if (min === max) q = `{${min}}`;
  else if (max === MAX_REPS) q = `{${min},}`;
  else q = `{${min},${max}}`;
  if (min === 1 && max === 1) return '';
  return lazy ? `${q}?` : q;
}

// does the node certainly match a word char (true), certainly a non-word char (false), or unknown (null)
function wordness(n, uword) {
  if (n === undefined) return null;
  let set = null;
  if (n.k === 'set') set = n.set;
  else if (n.k === 'loop' && n.min >= 1 && n.body.k === 'set') set = n.body.set;
  if (set === null) return null;
  const b = boundSources(uword);
  if (set.subtract(b.W).isEmpty) return true;
  if (set.intersect(b.W).isEmpty && set.intersect(b.MN).isEmpty) return false;
  return null;
}

// Emitter state: group index mapping
export class Emitter {
  constructor() {
    this.jsGroups = 0; // JS capture groups opened so far
    this.map = [0]; // user group number -> JS group index
    this.uid = 0;
  }

  // emit the node
  emit(n) {
    switch (n.k) {
      case 'empty': return '';
      case 'set': return setSource(n.set);
      case 'seq': return this.seq(n.items);
      case 'alt': return `(?:${n.alts.map((a) => this.emit(a)).join('|')})`;
      case 'group': {
        if (n.n === 0) return `(?:${this.emit(n.body)})`;
        this.map[n.n] = ++this.jsGroups;
        return `(${this.emit(n.body)})`;
      }
      case 'look': return `(?${n.behind ? '<' : ''}${n.neg ? '!' : '='}${this.emit(n.body)})`;
      case 'atomic': return this.atomic(() => this.emit(n.body));
      case 'loop': {
        const q = quant(n.min, n.max, n.mode === 'l');
        const body = () => {
          const b = this.emit(n.body);
          return n.body.k === 'set' || n.body.k === 'group' || n.body.k === 'alt' ? b : `(?:${b})`;
        };
        if (n.mode === 'p') return this.atomic(() => `${body()}${q}`);
        return `${body()}${q}`;
      }
      case 'backref': return `(?:\\${this.map[n.n]})`;
      case 'begin': return '^';
      case 'end': return '$';
      case 'caret': return n.unix ? '(?!$)(?:^|(?<=\\n))' : `(?!$)(?:^|(?<=[\\n\\u0085\\u2028\\u2029])|(?<=\\r)(?!\\n))`;
      case 'dollar':
        if (n.unix) return n.multi ? '(?=\\n|$)' : '(?:$|(?=\\n$))';
        return n.multi ? '(?:$|(?=[\\r\\u0085\\u2028\\u2029])|(?<!\\r)(?=\\n))' : '(?:$|(?=\\r\\n$)|(?=[\\r\\u0085\\u2028\\u2029]$)|(?<!\\r)(?=\\n$))';
      case 'bound': return this.bound(n, null, null);
      case 'lineEnding': return '(?:\\r\\n|[\\n\\u000B\\u000C\\r\\u0085\\u2028\\u2029])';
      default: throw new Error(`regex emitter: node ${n.k}`);
    }
  }

  // sequence; word boundaries next to a char set whose word-ness is known need only one side of the check
  seq(items) {
    let out = '';
    for (let j = 0; j < items.length; j++) {
      const it = items[j];
      if (it.k === 'bound') out += this.bound(it, wordness(items[j - 1], it.uword), wordness(items[j + 1], it.uword));
      else out += this.emit(it);
    }
    return out;
  }

  // \b / \B; left/right: true = a word char is certainly there, false = certainly not, null = unknown
  bound(n, left, right) {
    const b = boundSources(n.uword);
    const want = n.both; // \b: left !== right
    if (left !== null && right !== null) return (left !== right) === want ? '' : '[]';
    if (left !== null) return left === want ? b.rneg : b.rpos;
    if (right !== null) return right === want ? b.lneg : b.lpos;
    return want ? b.bound : b.notBound;
  }

  // atomic group emulation: (?=(X))\k<name>, the capture is opened before X
  atomic(innerFn) {
    const name = `_a${++this.uid}`;
    this.jsGroups++;
    return `(?=(?<${name}>${innerFn()}))\\k<${name}>`;
  }
}

export { LINE_TERM_CLASS };
