// Code point sets as sorted flat range arrays [lo0,hi0,lo1,hi1,...] (inclusive), the class algebra of the Java regex translator.
export const MAX_CP = 0x10ffff;

// immutable code point set
export class CharSet {
  // bmp: the Java predicate behind this set is a BmpCharPredicate (decides Start vs StartS, see Pattern.newCharProperty)
  constructor(r, bmp = false) {
    this.r = r;
    this.bmp = bmp;
  }

  // empty set
  static empty() {
    return EMPTY;
  }

  // all code points 0..10FFFF (Java Pattern ALL())
  static all() {
    return ALL;
  }

  // set of one code point
  static of(cp) {
    return new CharSet([cp, cp], cp < 0xd800 || (cp > 0xdfff && cp < 0x10000));
  }

  // set of lo..hi
  static range(lo, hi) {
    return lo > hi ? EMPTY : new CharSet([lo, hi], hi < 0xd800 || (lo > 0xdfff && hi < 0x10000));
  }

  // set of the given code points (any order, duplicates ok); bmp marks a BmpCharPredicate
  static ofCodePoints(cps, bmp = false) {
    const a = Array.from(new Set(cps)).sort((x, y) => x - y);
    const r = [];
    for (const c of a) {
      if (r.length && r[r.length - 1] === c - 1) r[r.length - 1] = c;
      else r.push(c, c);
    }
    return new CharSet(r, bmp);
  }

  // set from a predicate over all code points (slow scan, used for tests only)
  static fromPredicate(f) {
    const r = [];
    let start = -1;
    for (let cp = 0; cp <= MAX_CP; cp++) {
      if (f(cp)) {
        if (start < 0) start = cp;
      } else if (start >= 0) {
        r.push(start, cp - 1);
        start = -1;
      }
    }
    if (start >= 0) r.push(start, MAX_CP);
    return new CharSet(r);
  }

  get isEmpty() {
    return this.r.length === 0;
  }

  // number of code points
  get size() {
    let n = 0;
    for (let i = 0; i < this.r.length; i += 2) n += this.r[i + 1] - this.r[i] + 1;
    return n;
  }

  // membership by binary search
  has(cp) {
    const r = this.r;
    let lo = 0;
    let hi = (r.length >> 1) - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (cp < r[mid * 2]) hi = mid - 1;
      else if (cp > r[mid * 2 + 1]) lo = mid + 1;
      else return true;
    }
    return false;
  }

  // single code point when the set has exactly one, else -1
  get single() {
    const r = this.r;
    return r.length === 2 && r[0] === r[1] ? r[0] : -1;
  }

  union(o) {
    const a = this.r;
    const b = o.r;
    if (a.length === 0) return o;
    if (b.length === 0) return this;
    const out = [];
    let i = 0;
    let j = 0;
    let lo = 0;
    let hi = -2;
    let open = false;
    while (i < a.length || j < b.length) {
      let l;
      let h;
      if (j >= b.length || (i < a.length && a[i] <= b[j])) {
        l = a[i];
        h = a[i + 1];
        i += 2;
      } else {
        l = b[j];
        h = b[j + 1];
        j += 2;
      }
      if (!open) {
        lo = l;
        hi = h;
        open = true;
      } else if (l <= hi + 1) {
        if (h > hi) hi = h;
      } else {
        out.push(lo, hi);
        lo = l;
        hi = h;
      }
    }
    if (open) out.push(lo, hi);
    return new CharSet(out, this.bmp && o.bmp);
  }

  intersect(o) {
    const a = this.r;
    const b = o.r;
    const out = [];
    let i = 0;
    let j = 0;
    while (i < a.length && j < b.length) {
      const lo = Math.max(a[i], b[j]);
      const hi = Math.min(a[i + 1], b[j + 1]);
      if (lo <= hi) out.push(lo, hi);
      if (a[i + 1] < b[j + 1]) i += 2;
      else j += 2;
    }
    return new CharSet(out, this.bmp && o.bmp);
  }

  // complement within 0..10FFFF
  negate() {
    const a = this.r;
    const out = [];
    let prev = 0;
    for (let i = 0; i < a.length; i += 2) {
      if (a[i] > prev) out.push(prev, a[i] - 1);
      prev = a[i + 1] + 1;
    }
    if (prev <= MAX_CP) out.push(prev, MAX_CP);
    return new CharSet(out);
  }

  subtract(o) {
    return this.intersect(o.negate());
  }

  equals(o) {
    const a = this.r;
    const b = o.r;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }
}

const EMPTY = new CharSet([]);
const ALL = new CharSet([0, MAX_CP]);

// union of many sets
export function unionAll(sets) {
  let s = EMPTY;
  for (const x of sets) s = s.union(x);
  return s;
}

// build a CharSet from run values: starts[i] = start of run i, values[i], predicate on value
export function setFromRuns(starts, values, pred) {
  const out = [];
  const n = starts.length;
  let open = -1;
  for (let i = 0; i < n; i++) {
    const end = i + 1 < n ? starts[i + 1] - 1 : MAX_CP;
    if (pred(values[i])) {
      if (open < 0) open = starts[i];
    } else if (open >= 0) {
      out.push(open, starts[i] - 1);
      open = -1;
    }
    if (i === n - 1 && open >= 0) out.push(open, end);
  }
  return new CharSet(out);
}
