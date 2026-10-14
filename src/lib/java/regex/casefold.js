// Java regex case-insensitive matching rules (Pattern.single/newSlice/CIRange/BitClass) as code point sets, Unicode 13.
import { loadJson } from '../unicode/tables.js';
import { toLowerCase, toUpperCase } from '../Character.js';
import { CharSet } from './charset.js';

let cand = null;
let pre = null;

// candidate code points with a case mapping and the preimage of k(x) = lower(upper(x)) (lazy)
function init() {
  if (cand !== null) return;
  const j = loadJson('case');
  const set = new Set();
  for (let i = 0; i < j.upper.length; i += 2) set.add(j.upper[i]);
  for (let i = 0; i < j.lower.length; i += 2) set.add(j.lower[i]);
  cand = Array.from(set).sort((a, b) => a - b);
  pre = new Map();
  for (const x of cand) {
    const k = toLowerCase(toUpperCase(x));
    if (k !== x) {
      const l = pre.get(k);
      if (l === undefined) pre.set(k, [x]);
      else l.push(x);
    }
  }
}

// Java: Character.toLowerCase(Character.toUpperCase(ch))
export const fold = (ch) => toLowerCase(toUpperCase(ch));

// ASCII.toLower / toUpper
const asciiLower = (c) => (c >= 0x41 && c <= 0x5a ? c + 32 : c);
const asciiUpper = (c) => (c >= 0x61 && c <= 0x7a ? c - 32 : c);
const isAsciiAlpha = (c) => (c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a);

// {lower} plus every x with lower == fold(x)
function foldClass(lower) {
  init();
  const l = pre.get(lower);
  return l === undefined ? CharSet.of(lower) : CharSet.ofCodePoints([lower, ...l]);
}

const memos = [new Map(), new Map(), new Map()];

// memoize leaf sets by (char, flags): sets are immutable and shared between patterns
function memoLeaf(kind, ch, ci, uc, f) {
  const key = ch * 4 + (ci ? 2 : 0) + (uc ? 1 : 0);
  const m = memos[kind];
  let s = m.get(key);
  if (s === undefined) {
    s = f();
    m.set(key, s);
  }
  return s;
}

// Java: Pattern#single(int): the set matched by one literal char (flags: ci, uc booleans)
export function singleSet(ch, ci, uc) {
  return memoLeaf(0, ch, ci, uc, () => singleSet0(ch, ci, uc));
}

// uncached singleSet
function singleSet0(ch, ci, uc) {
  if (ci) {
    if (uc) {
      const upper = toUpperCase(ch);
      const lower = toLowerCase(upper);
      if (upper !== lower) return foldClass(lower);
    } else if (ch < 128 && isAsciiAlpha(ch)) {
      return CharSet.ofCodePoints([asciiLower(ch), asciiUpper(ch)], true);
    }
  }
  return CharSet.of(ch);
}

// Java: Pattern#newSlice(int[],int,boolean): the set matched by one char of a literal run of >= 2 chars
export function sliceSet(ch, ci, uc) {
  return memoLeaf(1, ch, ci, uc, () => sliceSet0(ch, ci, uc));
}

// uncached sliceSet
function sliceSet0(ch, ci, uc) {
  if (ci) {
    if (uc) return foldClass(fold(ch));
    const b = asciiLower(ch);
    return b >= 0x61 && b <= 0x7a ? CharSet.ofCodePoints([b, asciiUpper(b)]) : CharSet.of(b);
  }
  return CharSet.of(ch);
}

// Java: Pattern#bitsOrSingle(BitClass,int): the set contributed by one literal char inside a class
export function classCharSet(ch, ci, uc) {
  return memoLeaf(2, ch, ci, uc, () => classCharSet0(ch, ci, uc));
}

// uncached classCharSet
function classCharSet0(ch, ci, uc) {
  if (ch < 256 && !(ci && uc && (ch === 0xff || ch === 0xb5 || ch === 0x49 || ch === 0x69 || ch === 0x53 || ch === 0x73 || ch === 0x4b || ch === 0x6b || ch === 0xc5 || ch === 0xe5))) {
    // BitClass.add(c, flags)
    const out = [ch];
    if (ci) {
      if (ch < 128) out.push(asciiUpper(ch), asciiLower(ch));
      else if (uc) {
        const cc = toLowerCase(ch & 0xffff);
        out.push(cc, toUpperCase(cc));
      }
    }
    return CharSet.ofCodePoints(out, true);
  }
  return singleSet(ch, ci, uc);
}

// Java: Pattern#CIRange / CIRangeU: the set matched by lo-hi in a case-insensitive class
export function rangeSetCI(lo, hi, uc) {
  const base = CharSet.range(lo, hi);
  if (uc) {
    init();
    const extra = [];
    for (const x of cand) {
      if (base.has(x)) continue;
      const up = toUpperCase(x);
      if (base.has(up) || base.has(toLowerCase(up))) extra.push(x);
    }
    return new CharSet(extra.length === 0 ? base.r : base.union(CharSet.ofCodePoints(extra)).r, false);
  }
  const extra = [];
  for (let x = 0x41; x <= 0x7a; x++) {
    if (!isAsciiAlpha(x) || base.has(x)) continue;
    if (base.has(asciiUpper(x)) || base.has(asciiLower(x))) extra.push(x);
  }
  return new CharSet(extra.length === 0 ? base.r : base.union(CharSet.ofCodePoints(extra)).r, false);
}
