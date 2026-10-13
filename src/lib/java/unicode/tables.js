// Lazy loaders for the generated JDK 17 (Unicode 13) tables in this directory (scripts/gen-unicode-tables.mjs).
import { readFileSync } from 'node:fs';

const cache = new Map();

// load and parse <name>.json once
export function loadJson(name) {
  let t = cache.get(name);
  if (t === undefined) {
    t = JSON.parse(readFileSync(new URL(`./${name}.json`, import.meta.url), 'utf8'));
    cache.set(name, t);
  }
  return t;
}

// run table over 0..10FFFF from flat [start,value,...]; lookup by binary search with a Latin-1 fast path
export class RunTable {
  constructor(pairs) {
    const n = pairs.length / 2;
    this.starts = new Int32Array(n);
    this.values = new Int32Array(n);
    for (let i = 0; i < n; i++) {
      this.starts[i] = pairs[i * 2];
      this.values[i] = pairs[i * 2 + 1];
    }
    this.low = new Int32Array(256);
    for (let cp = 0; cp < 256; cp++) this.low[cp] = this.search(cp);
  }

  // value at code point cp (cp must be 0..10FFFF)
  search(cp) {
    const s = this.starts;
    let lo = 0;
    let hi = s.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (s[mid] <= cp) lo = mid;
      else hi = mid - 1;
    }
    return this.values[lo];
  }

  // value at cp, or dflt outside 0..10FFFF
  get(cp, dflt) {
    if (cp >= 0 && cp < 256) return this.low[cp];
    if (!(cp >= 0 && cp <= 0x10ffff)) return dflt;
    return this.search(cp);
  }
}
