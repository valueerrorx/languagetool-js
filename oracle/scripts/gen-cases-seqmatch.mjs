// Authors oracle/cases/X-SEQMATCH/*.json (inputs only). Ops seq-match / seqmatch-harvest (SeqMatchOps.java), format docs/review/F27-oracle.md.
// Rules/sentences are chosen by features from the Java harvest; expected hits come only from the Java run.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';
import { runHarness } from '../lib/harness-run.mjs';

const DIR = path.join(ROOT, 'oracle/cases/X-SEQMATCH');
rmSync(DIR, { recursive: true, force: true });
mkdirSync(DIR, { recursive: true });
const write = (name, description, ops) => writeFileSync(path.join(DIR, `${name}.json`), JSON.stringify({ kind: 'harness', clock: 'fixed', description, normalize: [], compare: 'jsonl', ops }) + '\n');
let seed = 4242;
const rnd = () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const PER_LANG = 1500;
const LANGS = [{ code: 'de-DE', c: 'de' }, { code: 'en-US', c: 'en' }, { code: 'fr', c: 'fr' }];

// ---- part 1: real rules ----
const r = await runHarness({ ops: LANGS.map((L) => ({ op: 'seqmatch-harvest', args: { lang: L.code } })) });
const harv = r.responses.split('\n').filter(Boolean).map((l) => { const j = JSON.parse(l); if (!j.ok) throw new Error(JSON.stringify(j)); return j.result; });
const STRATA = [
  ['skip', (f) => f.skip > 0], ['skipNeg', (f) => f.skipNeg > 0], ['min0', (f) => f.min0 > 0], ['maxN', (f) => f.maxN > 0],
  ['and', (f) => f.and > 0], ['or', (f) => f.or > 0], ['excNext', (f) => f.excNext > 0], ['excPrev', (f) => f.excPrev > 0],
  ['marker', (f) => f.marker > 0 && f.marker < f.n], ['sstart', (f) => f.sstart > 0], ['send', (f) => f.send > 0], ['chunk', (f) => f.chunk > 0],
  ['long', (f) => f.n >= 8], ['single', (f) => f.n === 1], ['exc', (f) => f.exc > 0], ['plain', () => true],
];
const stats = {};
for (let li = 0; li < LANGS.length; li++) {
  const L = LANGS[li];
  const rules = harv[li].rules.filter((x) => !x[4].unify && (x[5].length + x[6].length) > 0);
  const chosen = new Map();
  const quota = Math.floor(PER_LANG / STRATA.length);
  for (const [name, fn] of STRATA) {
    const pool = rules.filter((x) => fn(x[4]) && !chosen.has(`${x[0]}|${x[1]}`));
    const stride = Math.max(1, pool.length / quota);
    for (let i = 0, k = 0; k < quota && Math.floor(i) < pool.length; i += stride, k++) { const x = pool[Math.floor(i)]; chosen.set(`${x[0]}|${x[1]}`, x); }
    stats[`${L.code}:${name}`] = pool.length;
  }
  const rest = rules.filter((x) => !chosen.has(`${x[0]}|${x[1]}`));
  const need = PER_LANG - chosen.size;
  for (let k = 0; k < need && rest.length > 0; k++) { const x = rest[Math.floor((k * rest.length) / need)]; chosen.set(`${x[0]}|${x[1]}`, x); }
  const sel = [...chosen.values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  // corpus sentences
  const corpus = readFileSync(path.join(ROOT, `oracle/corpus/${L.c}/corpus.txt`), 'utf8').replace(/\s+/g, ' ').split(/(?<=[.!?”»])\s+/).filter((s) => s.length >= 25 && s.length <= 220);
  const cs = Array.from({ length: 60 }, (_, i) => corpus[Math.floor((i * corpus.length) / 60)]);
  const per = 60;
  for (let ci = 0, start = 0; start < sel.length; ci++, start += per) {
    const slice = sel.slice(start, start + per);
    const texts = [];
    const idx = new Map();
    const tid = (s) => { if (!idx.has(s)) { idx.set(s, texts.length); texts.push(s); } return idx.get(s); };
    const jobs = slice.map((x, j) => {
      const own = [...x[5].slice(0, 4), ...x[6].slice(0, 4)].filter((s) => s.length < 1500);
      const ids = own.map(tid);
      for (let k = 0; k < 3; k++) ids.push(tid(cs[(start + j + k * 7) % cs.length]));
      return { src: { file: x[0], rule: x[1] }, texts: [...new Set(ids)] };
    });
    write(`rules-${L.c}-${String(ci).padStart(2, '0')}`, `PatternRule raw sequence hits (AbstractPatternRulePerformer consumer) of ${slice.length} stratified real ${L.code} rules on their own correct/incorrect examples plus corpus sentences; raw tagger output, no disambiguation/chunker`, [{ op: 'seq-match', args: { lang: L.code, texts, jobs } }]);
  }
  console.error(L.code, 'rules', sel.length);
}

// ---- part 2: inline synthetic rules ----
const attr = (o) => Object.entries(o).filter(([, v]) => v !== undefined).map(([k, v]) => ` ${k}="${v}"`).join('');
const tok = (t, o = {}, inner = '') => `<token${attr(o)}>${t}${inner}</token>`;
const xmlOf = (patterns) => `<?xml version="1.0" encoding="UTF-8"?>\n<rules lang="en">\n<category id="CAT" name="Category">\n${patterns.map((p, i) => `<rule id="R${i}" name="Rule ${i}"><pattern${p.attrs ?? ''}>${p.body}</pattern><message>Msg</message></rule>`).join('\n')}\n</category>\n</rules>\n`;
const WORDS = ['a', 'b', 'c', 'x'];
const sents = new Set(['', ' ', 'a', 'a a', 'a b', 'a b c', 'a x a', 'a x x a', 'a x x x x a', 'b x b', 'b x a', 'a b a b a b', 'x x x x x x x x x x', 'a a a a a', 'a a a b', 'b a a a', 'c a b', 'a. b', 'a, b c.', 'x a b c x', 'A B', 'a  b', 'a\tb', 'Foo bar', 'The cat sat on the mat.', 'He said that she went home.', 'a b c a b c a b c']);
for (let n = 0; n < 40; n++) { const len = 1 + Math.floor(rnd() * 8); sents.add(Array.from({ length: len }, () => pick(WORDS)).join(' ')); }
const SENTS = [...sents];
const SYN = [
  { syn: [{ readings: [['', 'SENT_START', null]] }, { readings: [['a', 'NN', 'a']] }, { readings: [['b', 'VB', 'b'], ['b', 'NN', 'b']], ws: true }, { readings: [['.', 'SENT_END', null], ['.', 'PARA_END', '.']] }] },
  { syn: [{ readings: [['only', null, null]] }] },
  { syn: [{ readings: [['a', 'NN', 'a']] }, { readings: [[' ', null, null]], ws: true }, { readings: [['a', 'NN', 'a']] }, { readings: [['a', 'NN', 'a']] }] },
  { syn: [] },
];
const allTexts = [...SENTS, ...SYN];
const ids = allTexts.map((_, i) => i);
const sk = [undefined, undefined, undefined, '0', '1', '2', '3', '-1', '5', '100'];
const mn = [undefined, undefined, undefined, '0', '0', '1', '2'];
const mx = [undefined, undefined, undefined, '1', '2', '3', '-1'];
const TEXTS = ['a', 'b', 'a|b', 'c', 'x', '.*', 'a|b|c', '', '\\w+'];
function randTok() {
  const o = {};
  const t = pick(TEXTS);
  if (t.includes('|') || t.includes('*') || t.includes('\\')) o.regexp = 'yes';
  else if (rnd() < 0.1) o.regexp = 'yes';
  if (rnd() < 0.15) o.negate = 'yes';
  const k = pick(sk); if (k !== undefined) o.skip = k;
  const m = pick(mn); if (m !== undefined) o.min = m;
  const M = pick(mx); if (M !== undefined) o.max = M;
  if (rnd() < 0.08) o.postag = pick(['SENT_START', 'SENT_END', 'NN', 'N.*', 'UNKNOWN']), o.postag_regexp = o.postag.includes('.') ? 'yes' : undefined;
  let inner = '';
  const e = rnd();
  if (e < 0.12) inner = `<exception scope="next">${pick(['a', 'b', 'x'])}</exception>`;
  else if (e < 0.2) inner = `<exception scope="previous">${pick(['a', 'b', 'x'])}</exception>`;
  else if (e < 0.26) inner = `<exception>${pick(['a', 'b', 'x'])}</exception>`;
  else if (e < 0.3) inner = `<exception scope="next" postag="SENT_END"/>`;
  else if (e < 0.34) inner = `<exception scope="next">${pick(['a', 'b'])}</exception><exception scope="previous">${pick(['b', 'c'])}</exception><exception>${pick(['x', 'c'])}</exception>`;
  if (rnd() < 0.05) return tok(`<and>${tok('a|b', { regexp: 'yes' })}${tok('', { negate: 'yes' }, '')}</and>`.replace('<token negate="yes"></token>', '<token negate="yes">c</token>'), {}, inner).replace(/^<token([^>]*)>(.*)<\/token>$/s, (_, a, b) => `<token${a}>${b}</token>`);
  if (rnd() < 0.05) return tok(`<or>${tok('a')}${tok('x')}</or>`, {}, inner);
  return tok(t, o, inner);
}
function randPattern() {
  const n = 1 + Math.floor(rnd() * 6);
  const ts = Array.from({ length: n }, randTok);
  let body = ts.join('');
  if (rnd() < 0.5) {
    const i = Math.floor(rnd() * n);
    const j = i + Math.floor(rnd() * (n - i));
    body = ts.slice(0, i).join('') + '<marker>' + ts.slice(i, j + 1).join('') + '</marker>' + ts.slice(j + 1).join('');
  }
  if (rnd() < 0.08) body = tok('', { postag: 'SENT_START' }) + body;
  if (rnd() < 0.08) body += tok('', { postag: 'SENT_END' });
  return { body };
}
const pats = Array.from({ length: 700 }, randPattern);
// hand-written edge rules
const T = tok;
const hand = [
  [T('a', { skip: -1 }), T('a')], [T('a', { skip: -1 }), T('b'), T('c')], [T('a', { skip: 0 }), T('b')], [T('a', { skip: 1 }), T('b')], [T('a', { skip: 100 }), T('b')],
  [T('a'), T('x', { min: 0 }), T('b')], [T('x', { min: 0 }), T('a')], [T('a'), T('x', { min: 0 })], [T('x', { min: 0 }), T('x', { min: 0 }), T('a')], [T('x', { min: 0 }), T('b', { min: 0 }), T('c', { min: 0 })],
  [T('x', { min: 0, max: -1 }), T('a')], [T('a'), T('x', { min: 0, max: 2 }), T('b')], [T('a', { max: 2 }), T('a')], [T('.*', { regexp: 'yes', max: 3 }), T('c')], [T('.*', { regexp: 'yes', max: -1 }), T('c')], [T('a', { max: -1 })], [T('a', { min: 2, max: 3 })],
  [T('a'), T('.*', { regexp: 'yes', min: 0, max: 2 }), T('a')], [T('a', { skip: -1, max: 2 }), T('b', { min: 0 }), T('c')], [T('a', { skip: 2, min: 0 }), T('b')],
  [T('a', { skip: -1 }, '<exception scope="next">c</exception>'), T('b')], [T('a', { skip: 2 }, '<exception scope="next">x</exception>'), T('b')], [T('a', {}, '<exception scope="next">b</exception>')], [T('a', {}, '<exception scope="next">b</exception>'), T('b', { min: 0 }), T('c')],
  [T('b', {}, '<exception scope="previous">a</exception>')], [T('a'), T('b', {}, '<exception scope="previous">a</exception>')], [T('a'), T('b', {}, `<exception scope="previous"><exception>x</exception>a</exception>`)],
  [T('', { postag: 'SENT_START' }), T('a')], [T('', { postag: 'SENT_START' }), T('a', { skip: -1 }), T('b')], [T('a'), T('', { postag: 'SENT_END' })], [T('a'), T('.', {}), T('', { postag: 'SENT_END' })], [T('', { postag: 'SENT_START' }), T('', { postag: 'SENT_END' })],
  ['<marker>' + T('a') + '</marker>' + T('b')], [T('a') + '<marker>' + T('b') + '</marker>'], ['<marker>' + T('a', { min: 0 }) + '</marker>' + T('b')], [T('a') + '<marker>' + T('b', { min: 0 }) + '</marker>' + T('c')],
  [T('a'), '<marker>', T('x', { skip: -1 }), '</marker>', T('b')], [T('a', { skip: 1 }), '<marker>' + T('b') + T('c') + '</marker>'],
  [T('a'), T('b'), T('c'), T('a'), T('b'), T('c'), T('a'), T('b'), T('c'), T('x'), T('x'), T('x')],
  [T('a', { min: 0 }), T('b', { min: 0 }), T('c', { min: 0 }), T('x', { min: 0 })], [T('', { negate: 'yes' }, ''), T('a')], [T('a', { negate: 'yes' }), T('a', { negate: 'yes' })],
  [`<token><and>${T('a|b', { regexp: 'yes' })}${T('b|c', { regexp: 'yes' })}</and></token>`, T('a')], [`<token><or>${T('a')}${T('b')}</or></token>`, T('c')], [`<token skip="-1"><or>${T('a')}${T('x')}</or></token>`, T('b')],
  [`<token skip="-1">a</token><token><match no="1"/></token>`], [`<token skip="-1" regexp="yes">a|b</token><token>\\1</token>`], [T('a', { skip: 1 }), `<token><match no="1"/></token>`],
  [T('a', { inflected: 'yes' }), T('b', { postag: 'NN' })], [T('a', { case_sensitive: 'yes' }), T('B', { case_sensitive: 'yes' })], [T('a', { spacebefore: 'no' }), T('b', { spacebefore: 'yes' })], [T('a', { spacebefore: 'yes' })],
];
for (const h of hand) pats.push({ body: h.join ? h.join('') : h });
// raw_pos attribute (preDisambig tokens) and rule-level attribute variants
pats.push({ body: T('a') + T('b'), attrs: ' raw_pos="yes"' });
const SYNJOB = [];
const chunkN = 50;
for (let i = 0, ci = 0; i < pats.length; i += chunkN, ci++) {
  const slice = pats.slice(i, i + chunkN);
  const xml = xmlOf(slice);
  const jobs = slice.map((_, j) => ({ src: { rule: j }, texts: ids }));
  write(`inline-${String(ci).padStart(2, '0')}`, 'synthetic PatternRules (skip -1/0/N, min 0, max N/-1, and/or, exceptions next/previous, markers, SENT_START/END, long patterns) on tagged short sentences and synthetic token arrays; raw hits', [{ op: 'seq-match', args: { lang: 'en-US', xml, texts: allTexts, jobs } }]);
}
void SYNJOB;
console.error('inline rules', pats.length, 'texts', allTexts.length);
console.error(JSON.stringify(stats));
