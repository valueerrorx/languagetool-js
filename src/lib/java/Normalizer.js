// java.text.Normalizer (JDK 17, Unicode 13) from the generated tables; never String.prototype.normalize (SEMANTICS P1).
import { JavaEnum } from './JavaEnum.js';
import { NullPointerException } from './errors.js';
import { loadJson, RunTable } from './unicode/tables.js';

const S_BASE = 0xac00;
const L_BASE = 0x1100;
const V_BASE = 0x1161;
const T_BASE = 0x11a7;
const L_COUNT = 19;
const V_COUNT = 21;
const T_COUNT = 28;
const N_COUNT = V_COUNT * T_COUNT;
const S_COUNT = L_COUNT * N_COUNT;

let tables = null;

// normalizer tables (lazy): ccc run table, decomposition maps, composition pair map
function T() {
  if (tables === null) {
    const j = loadJson('normalizer');
    const mk = (flat) => {
      const m = new Map();
      for (let i = 0; i < flat.length; i += 2) m.set(flat[i], Array.from(flat[i + 1], (ch) => ch.codePointAt(0)));
      return m;
    };
    const comp = new Map();
    for (let i = 0; i < j.comp.length; i += 3) comp.set(j.comp[i] * 0x200000 + j.comp[i + 1], j.comp[i + 2]);
    tables = { ccc: new RunTable(j.ccc), nfd: mk(j.nfd), nfkd: mk(j.nfkd), comp };
  }
  return tables;
}

// Java: sun.text.Normalizer#getCombiningClass(int)
export function getCombiningClass(cp) {
  return T().ccc.get(cp, 0);
}

// code points of a string (lone surrogates stay single units)
function toCodePoints(s) {
  const out = [];
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) {
      const d = s.charCodeAt(i + 1);
      if (d >= 0xdc00 && d <= 0xdfff) {
        out.push(((c - 0xd800) << 10) + (d - 0xdc00) + 0x10000);
        i++;
        continue;
      }
    }
    out.push(c);
  }
  return out;
}

// full decomposition plus canonical ordering of a code point list
function decompose(cps, compat) {
  const t = T();
  const out = [];
  for (const cp of cps) {
    const s = cp - S_BASE;
    if (s >= 0 && s < S_COUNT) {
      out.push(L_BASE + Math.trunc(s / N_COUNT), V_BASE + Math.trunc((s % N_COUNT) / T_COUNT));
      const tIndex = s % T_COUNT;
      if (tIndex !== 0) out.push(T_BASE + tIndex);
      continue;
    }
    const d = (compat ? t.nfkd.get(cp) : undefined) ?? t.nfd.get(cp);
    if (d === undefined) out.push(cp);
    else for (const x of d) out.push(x);
  }
  // canonical ordering: stable sort of each run of non-starters by combining class
  for (let i = 1; i < out.length; i++) {
    const c = t.ccc.get(out[i], 0);
    if (c === 0) continue;
    let j = i;
    while (j > 0) {
      const p = t.ccc.get(out[j - 1], 0);
      if (p <= c) break;
      const tmp = out[j];
      out[j] = out[j - 1];
      out[j - 1] = tmp;
      j--;
    }
  }
  return out;
}

// canonical composition (UAX #15) of an ordered decomposed code point list
function compose(cps) {
  const t = T();
  const out = [];
  let starterIdx = -1;
  let lastCc = 0;
  for (const cp of cps) {
    const cc = t.ccc.get(cp, 0);
    if (starterIdx >= 0) {
      const starter = out[starterIdx];
      const blocked = out.length - 1 > starterIdx && (lastCc === 0 || lastCc >= cc);
      if (!blocked) {
        let composite = -1;
        const l = starter - L_BASE;
        const v = cp - V_BASE;
        const sIdx = starter - S_BASE;
        const tIdx = cp - T_BASE;
        if (l >= 0 && l < L_COUNT && v >= 0 && v < V_COUNT) composite = S_BASE + (l * V_COUNT + v) * T_COUNT;
        else if (sIdx >= 0 && sIdx < S_COUNT && sIdx % T_COUNT === 0 && tIdx > 0 && tIdx < T_COUNT) composite = starter + tIdx;
        else {
          const c = t.comp.get(starter * 0x200000 + cp);
          if (c !== undefined) composite = c;
        }
        if (composite >= 0) {
          out[starterIdx] = composite;
          continue;
        }
      }
    }
    if (cc === 0) {
      starterIdx = out.length;
      lastCc = 0;
    } else lastCc = cc;
    out.push(cp);
  }
  return out;
}

// code point list to string
function fromCodePoints(cps) {
  let s = '';
  for (let i = 0; i < cps.length; i += 4096) s += String.fromCodePoint(...cps.slice(i, i + 4096));
  return s;
}

// Java: java.text.Normalizer.Form
export class Form extends JavaEnum {
  static FQCN = 'java.text.Normalizer.Form';
}
Form.NFD = new Form('NFD', 0);
Form.NFC = new Form('NFC', 1);
Form.NFKD = new Form('NFKD', 2);
Form.NFKC = new Form('NFKC', 3);

// Java: Normalizer#normalize(CharSequence,Form)
export function normalize(src, form) {
  if (src === null || src === undefined) throw new NullPointerException('Cannot invoke "java.lang.CharSequence.toString()" because "src" is null');
  const s = String(src);
  if (form === null || form === undefined) throw new NullPointerException('Cannot invoke "java.text.Normalizer$Form.ordinal()" because "form" is null');
  // ASCII fast path: all four forms leave ASCII unchanged
  let ascii = true;
  for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) > 0x7f) { ascii = false; break; }
  if (ascii) return s;
  const compat = form === Form.NFKC || form === Form.NFKD;
  const d = decompose(toCodePoints(s), compat);
  return fromCodePoints(form === Form.NFC || form === Form.NFKC ? compose(d) : d);
}

// Java: Normalizer#isNormalized(CharSequence,Form)
export function isNormalized(src, form) {
  if (src === null || src === undefined) throw new NullPointerException('Cannot invoke "java.lang.CharSequence.toString()" because "src" is null');
  const s = String(src);
  return normalize(s, form) === s;
}

// java.text.Normalizer as a namespace object
export const Normalizer = { Form, normalize, isNormalized };
