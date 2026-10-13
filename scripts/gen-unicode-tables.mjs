// Generates src/lib/java/unicode/*.json from the JDK 17 X-UNICODE oracle fixtures (props, case-simple, case-string, normalizer).
// Only combining classes are derived (stable Unicode property) from Node ICU, see deriveCcc().
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GOLDEN = path.join(ROOT, 'tests/golden/X-UNICODE');
const OUT = path.join(ROOT, 'src/lib/java/unicode');
const MAX = 0x10ffff;

// first response line of a fixture, result object
function load(name) {
  const text = readFileSync(path.join(GOLDEN, name, 'responses.jsonl'), 'utf8');
  const r = JSON.parse(text.split('\n')[0]);
  if (!r.ok) throw new Error(`fixture ${name} failed`);
  return r.result;
}

// flat [start,len,value,...] runs over 0..10FFFF -> flat [start,value,...] (len implied by the next start)
function pairs(flat) {
  const out = [];
  let expect = 0;
  for (let i = 0; i < flat.length; i += 3) {
    if (flat[i] !== expect) throw new Error('runs not contiguous');
    expect = flat[i] + flat[i + 1];
    if (out.length && out[out.length - 1] === flat[i + 2]) continue;
    out.push(flat[i], flat[i + 2]);
  }
  if (expect !== MAX + 1) throw new Error('runs do not cover 0..10FFFF');
  return out;
}

// value lookup in pairs
function lookup(p, cp) {
  let lo = 0;
  let hi = p.length / 2 - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (p[mid * 2] <= cp) lo = mid;
    else hi = mid - 1;
  }
  return p[lo * 2 + 1];
}

const chr = (cp) => String.fromCodePoint(cp);
const isHangulSyllable = (cp) => cp >= 0xac00 && cp <= 0xd7a3;

// props.json
function genProps() {
  const r = load('props');
  const named = (n) => ({ runs: pairs(n.runs), names: n.names });
  return {
    unicode: '13.0',
    flagNames: r.flagNames,
    type: pairs(r.type),
    flags: pairs(r.flags),
    numeric: pairs(r.numericValue),
    digit36: pairs(r.digit36),
    dir: pairs(r.directionality),
    script: named(r.script),
    block: named(r.block),
  };
}

// case.json
function genCase() {
  const s = load('case-simple');
  const c = load('case-string');
  const up = new Map();
  const lo = new Map();
  for (let i = 0; i < s.toUpperCase.length; i += 2) up.set(s.toUpperCase[i], s.toUpperCase[i + 1]);
  for (let i = 0; i < s.toLowerCase.length; i += 2) lo.set(s.toLowerCase[i], s.toLowerCase[i + 1]);
  const fullUpper = [];
  const fullLower = [];
  for (const [cp, u, l] of c.ROOT) {
    if (u !== chr(up.get(cp) ?? cp)) fullUpper.push(cp, u);
    if (l !== chr(lo.get(cp) ?? cp)) fullLower.push(cp, l);
  }
  return { unicode: '13.0', upper: s.toUpperCase, lower: s.toLowerCase, title: s.toTitleCase, fullUpper, fullLower };
}

// canonical combining classes from Node ICU (ccc is stable for assigned characters); only chars assigned in Unicode 13
const CCC_VALUES = [1, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36,
  84, 91, 103, 107, 118, 122, 129, 130, 132, 202, 214, 216, 218, 220, 222, 224, 226, 228, 230, 232, 233, 234, 240];

// Java: n/a (generator): ccc pairs [start,value,...] over 0..10FFFF
function deriveCcc(type, nfdMap) {
  const swaps = (a, x) => chr(a).concat(chr(x)).normalize('NFD') === chr(x) + chr(a); // true iff 0 < ccc(x) < ccc(a)
  const ccc = new Map();
  const classes = []; // representatives, ascending ccc
  const marks = [];
  for (let cp = 0; cp <= MAX; cp++) {
    if (lookup(type, cp) === 0 || (cp >= 0xd800 && cp <= 0xdfff)) continue;
    if (nfdMap.has(cp)) { if (cp === 0x340 || cp === 0x341 || cp === 0x343 || cp === 0x344) ccc.set(cp, 230); continue; }
    if (cp === 0x345) { ccc.set(cp, 240); continue; }
    if (cp < 0x300 || chr(cp).normalize('NFD') !== chr(cp)) continue;
    if (swaps(0x345, cp)) marks.push(cp);
  }
  const classOf = new Map();
  for (const x of marks) {
    let lo = 0;
    let hi = classes.length;
    let found = -1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      const rep = classes[mid];
      if (swaps(rep, x)) hi = mid; // ccc(x) < ccc(rep)
      else if (swaps(x, rep)) lo = mid + 1;
      else { found = mid; break; }
    }
    if (found < 0) classes.splice(lo, 0, x);
    classOf.set(x, found < 0 ? lo : found);
  }
  if (classes.length !== CCC_VALUES.length - 1) throw new Error(`ccc classes ${classes.length}`);
  // class indices shifted by later insertions: recompute by comparing with the final sorted reps
  for (const x of marks) {
    let idx = 0;
    while (idx < classes.length && (swaps(classes[idx], x) || swaps(x, classes[idx]))) idx++;
    if (idx === classes.length) throw new Error(`no ccc class for ${x.toString(16)}`);
    ccc.set(x, CCC_VALUES[idx]);
  }
  const out = [];
  let prev = 0;
  out.push(0, 0);
  for (let cp = 0; cp <= MAX; cp++) {
    const v = ccc.get(cp) ?? 0;
    if (v !== prev) { out.push(cp, v); prev = v; }
  }
  return out;
}

// normalizer.json
function genNormalizer(type) {
  const r = load('normalizer');
  const nfd = [];
  const nfkd = [];
  const nfdMap = new Map();
  const byNfd = new Map(); // NFD string -> primary composite
  const composites = [];
  for (const [cp, c, d, , kd] of r.entries) {
    if (isHangulSyllable(cp)) continue;
    if (d !== chr(cp)) { nfd.push(cp, d); nfdMap.set(cp, d); }
    if (kd !== d) nfkd.push(cp, kd);
    if (c === chr(cp) && d !== chr(cp)) { composites.push([cp, d]); byNfd.set(d, cp); }
  }
  const comp = [];
  for (const [cp, d] of composites) {
    const cps = Array.from(d, (ch) => ch.codePointAt(0));
    const b = cps[cps.length - 1];
    const prefix = cps.slice(0, -1);
    let a;
    if (prefix.length === 1) a = prefix[0];
    else {
      a = byNfd.get(String.fromCodePoint(...prefix));
      if (a === undefined) throw new Error(`no composite for prefix of ${cp.toString(16)}`);
    }
    comp.push(a, b, cp);
  }
  return { unicode: '13.0', ccc: deriveCcc(type, nfdMap), nfd, nfkd, comp };
}

mkdirSync(OUT, { recursive: true });
const props = genProps();
const files = { 'props.json': props, 'case.json': genCase(), 'normalizer.json': genNormalizer(props.type) };
for (const [name, obj] of Object.entries(files)) {
  const text = `${JSON.stringify(obj)}\n`;
  writeFileSync(path.join(OUT, name), text);
  console.log(`${name}: ${text.length} bytes`);
}
