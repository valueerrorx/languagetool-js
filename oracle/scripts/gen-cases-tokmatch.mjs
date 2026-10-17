// Authors oracle/cases/X-TOKMATCH/*.json (inputs only). Ops string-matcher / token-match (TokMatchOps.java), format docs/review/F26-oracle.md.
// Inputs are chosen with the harvest (X-REGEX patterns.json, op tokmatch-harvest) and tagger fixtures; expected values come only from the Java run.
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';
import { runHarness } from '../lib/harness-run.mjs';
import { sample } from './lib-regex-sample.mjs';

const DIR = path.join(ROOT, 'oracle/cases/X-TOKMATCH');
const GOLD = path.join(ROOT, 'tests/golden');
rmSync(DIR, { recursive: true, force: true });
mkdirSync(DIR, { recursive: true });
const write = (name, description, ops) => writeFileSync(path.join(DIR, `${name}.json`), JSON.stringify({ kind: 'harness', clock: 'fixed', description, normalize: [], compare: 'jsonl', ops }) + '\n');
const chunks = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const uniq = (a) => [...new Set(a)];
let seed = 12345;
const rnd = () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const cap = (w) => (w ? w[0].toUpperCase() + w.slice(1) : w);

// ---- vocab (word -> [[lemma,pos]]) from tagger fixtures ----
function vocab(ids, filt) {
  const m = new Map();
  for (const id of ids) {
    const d = path.join(GOLD, id);
    if (!existsSync(d)) continue;
    for (const c of readdirSync(d)) {
      if (!filt(c)) continue;
      const f = path.join(d, c, 'responses.jsonl');
      if (!existsSync(f)) continue;
      for (const line of readFileSync(f, 'utf8').split('\n').filter(Boolean)) {
        const r = JSON.parse(line).result;
        if (!r || !Array.isArray(r.results)) continue;
        const walk = (x) => {
          if (!Array.isArray(x)) return;
          if (x.length === 6 && typeof x[0] === 'string' && Array.isArray(x[4])) {
            if (!m.has(x[0])) m.set(x[0], x[4].map((rd) => [rd[1], rd[2]]));
            return;
          }
          x.forEach(walk);
        };
        walk(r.results);
      }
    }
  }
  return m;
}
const LANGS = [
  { code: 'de-DE', short: 'de', v: vocab(['X-TAGGER-DE'], () => true), prefix: 'Er sagt' },
  { code: 'en-US', short: 'en', v: vocab(['X-TAGGER'], (c) => /en-US|^(sequences-en-US|combining|long)$/.test(c)), prefix: 'He said' },
  { code: 'fr', short: 'fr', v: vocab(['X-TAGGER'], (c) => /fr/.test(c) && !/fr-(BE|CA|CH)/.test(c)), prefix: 'Il dit' },
];
for (const L of LANGS) { L.words = [...L.v.keys()].filter((w) => w.trim() && w.length < 40).slice(0, 120000); console.error(L.code, 'vocab', L.words.length); }

// ---- part 1: string-matcher ----
const FIXED = ['', 'σ', 'ς', 'Σ', 'µ', 'μ', 'Μ', 'ß', 'ẞ', 'SS', 'ss', 'İ', 'ı', 'i', 'I', 'K', 'K', 'ſ', 'é', 'é', 'Ä', 'ä', 'ÖÜ', 'aς', 'aµ', 'aK', '١٢٣', '😀', 'a😀b', '_', ' ', '\n', 'a\n', '\u0085', ' ', 'x'.repeat(250), 'x'.repeat(251), 'a'.repeat(300)];
const toRe = (p, cs) => { try { return new RegExp(`^(?:${p})$`, cs ? 'u' : 'iu'); } catch { return null; } };
const all = JSON.parse(readFileSync(path.join(ROOT, 'oracle/cases/X-REGEX/harvest/patterns.json'), 'utf8'));
const KIND = /^(grammar|disamb)(-anti)?(-(and|or))?(-exc)?-(token|postag)$|^java-(tokenRegex|csRegex|posRegex|tokenRegex-exception)$/;
const cand = new Map();
for (const e of all) {
  if (!e.kinds.some((k) => KIND.test(k)) || (e.flags !== 0 && e.flags !== 66) || e.pattern === '') continue;
  const cs = e.flags === 0;
  const lang = (e.where.find((w) => /^[a-z]{2}(-[A-Z]{2})?:/.test(w)) ?? '').slice(0, 2);
  const k = `${cs ? 1 : 0}|${e.pattern}`;
  if (!cand.has(k)) cand.set(k, { p: e.pattern, cs, lang, kinds: e.kinds });
}
const list = [...cand.values()].sort((a, b) => (a.p < b.p ? -1 : a.p > b.p ? 1 : a.cs - b.cs));
console.error('string patterns', list.length);
const stride = Math.max(1, Math.floor(list.length / 2700));
const picked = list.filter((_, i) => i % stride === 0);
const simple = list.filter((x) => !/[()]/.test(x.p) && !picked.includes(x) && /[+*?{\[\\.]/.test(x.p));
const sstride = Math.max(1, Math.floor(simple.length / 400));
const extra = simple.filter((_, i) => i % sstride === 0);
const wordsFor = (lang) => (LANGS.find((l) => l.short === lang) ?? LANGS[0]).words;
function probesFor(x, idx) {
  const re = toRe(x.p, x.cs);
  const ws = wordsFor(x.lang);
  const hits = [];
  if (re) for (let i = 0; i < ws.length && hits.length < 3; i++) if (re.test(ws[i])) hits.push(ws[i]);
  const s1 = sample(x.p, 'first');
  const s2 = sample(x.p, 'last');
  const base = hits[0] ?? s1;
  const pr = [...hits, s1, s2, base.toUpperCase(), base.toLowerCase(), cap(base), base + 'x', base.slice(1), base.slice(0, -1), ws[Math.floor(rnd() * ws.length)] ?? 'x'];
  for (let k = 0; k < 6; k++) pr.push(FIXED[(idx * 7 + k * 11) % FIXED.length]);
  return uniq(pr).slice(0, 20);
}
const entries = [];
[...picked, ...extra].forEach((x, i) => entries.push({ p: x.p, re: true, cs: x.cs, probes: probesFor(x, i) }));
// non-regexp equality matchers (token strings of rules)
for (const L of LANGS) for (let i = 0; i < 40; i++) { const w = L.words[Math.floor(rnd() * L.words.length)]; entries.push({ p: w, re: false, cs: i % 2 === 0, probes: [w, w.toUpperCase(), w.toLowerCase(), cap(w), w + ' ', '', ...FIXED.slice(i % 10, (i % 10) + 4)] }); }
for (const chunk of chunks(entries, 250)) { /* written below */ }
chunks(entries, 250).forEach((c, i) => write(`sm-rules-${String(i).padStart(2, '0')}`, 'StringMatcher.create over token/postag patterns of real rule files (X-REGEX harvest), probes from tagger vocab, samples, case variants, special code points', [{ op: 'string-matcher', args: { entries: c } }]));

// RunSequenceMatcher cases from the PLAN note + sequence patterns
const special = [];
const add = (p, probes, re = true) => { for (const cs of [true, false]) special.push({ p, re, cs, probes }); };
add('a+[σ]', ['aς', 'aσ', 'aΣ', 'aaς', 'aaσ', 'aΣ', 'a', 'aς́', 'AΣ', 'AΣΣ', 'Aς']);
add('a+[μ]', ['aµ', 'aμ', 'aΜ', 'aaµ', 'aaμ', 'AΜ', 'Aµ', 'a']);
add('x.*[σ]b', ['xςb', 'xσb', 'xΣb', 'xaσb', 'xaςb', 'XΣB', 'XςB', 'xb']);
add('a+[\\w]', ['aK', 'aK', 'aa', 'ak', 'aÄ', 'a_', 'a1', 'aſ', 'AK', 'a٣', 'a😀']);
add('a+[\\w]+', ['aK', 'aK', 'aaK', 'a٣', 'aé', 'aK']);
add('[σ]', ['σ', 'ς', 'Σ']); add('σ', ['σ', 'ς', 'Σ']); add('[µ]', ['µ', 'μ', 'Μ']); add('[k]', ['k', 'K', 'K']);
add('[a-z]+', ['K', 'K', 'ſ', 'abc', 'ABC', 'İ', 'ı', 'aı']); add('\\p{L}+', ['σς', 'ΣΑΣ', 'ß', 'ẞ', 'é', 'İ']); add('\\p{Lu}\\p{Ll}*', ['Σας', 'ΣΑΣ', 'Ǆ', 'ǅ', 'Äpfel', 'äpfel', 'ß']); add('\\p{Ll}+', ['ǅ', 'abc', 'ABC', 'ß', 'ǆ']);
add('\\p{N}+', ['١٢٣', '123', '²', 'Ⅳ', '½']); add('\\p{P}+', ['!!', '—', '…', '«»', '¿']); add('[^a]+', ['bcd', 'a', 'A', '', 'bAc', '😀', '\n']);
add('.*', ['', 'abc', 'a\nb', 'a\u0085', 'a ', 'a\r', '😀😀']); add('.+', ['', 'a', '😀', '\n']); add('.{2}', ['😀', 'ab', 'a😀', '😀😀', 'a']); add('a.', ['a😀', 'a\n', 'a\u0085']);
add('\\s+', [' ', ' ', ' ', '\t', '\u000b', '\u001c', '']); add('\\d+', ['١', '12', '1a', '']); add('\\w+', ['é', '_', 'ab_1', 'ß', '‍']);
add('a{2,3}', ['a', 'aa', 'aaa', 'aaaa', 'AA']); add('a{2,}', ['a', 'aa', 'aaaaaaaa']); add('a{,3}', ['a', '', 'aaaa']); add('a{0}', ['', 'a']); add('a{3,2}', ['aa']); add('a{2147483648}', ['a']);
add('(?-i)ab+', ['abbb', 'ABBB', 'aB']); add('(?-i)[a-z]+', ['abc', 'ABC']); add('a+?', ['aaa']); add('a++', ['aaa']); add('^ab+$', ['abb']); add('\\bab', ['ab']); add('ab\\b', ['ab']);
// generated sequence patterns
const ATOMS = ['a', 'b', 'x', 'σ', 'ß', 'é', '.', '[abc]', '[a-c]', '[^a]', '[a-cx-z]', '[\\wx]', '[\\d.]', '[ä-ü]', '[σς]', '\\w', '\\d', '\\s', '\\p{L}', '\\p{Lu}', '\\p{Ll}', '\\p{N}', '\\p{P}', '\\.', '\\-', '[.]', '[-a]', '[a-]', '[]a]', '[^]a]', '[a\\]]'];
const QS = ['', '', '', '+', '*', '?', '{2}', '{1,2}', '{0,3}', '{2,}', '+?', '*?'];
const seqProbe = ['', 'a', 'aa', 'aaa', 'ab', 'abc', 'xb', 'xxb', 'σ', 'ς', 'Σ', 'aς', 'aσ', 'ß', 'ẞ', 'SS', 'é', 'É', 'é', 'A', 'B', 'C', 'X', 'Ä', 'ä', 'ü', '1', '12', '1.', '.', '-', ' ', '\t', '\n', '_', 'a1', 'a_', 'aK', 'ak', 'K', 'K', 'ſ', 'İ', 'ı', '😀', 'a😀', 'x'.repeat(250), 'a'.repeat(251)];
const gen = new Set();
while (gen.size < 230) {
  const n = 1 + Math.floor(rnd() * 4);
  let runUsed = false;
  let p = '';
  for (let i = 0; i < n; i++) {
    const a = ATOMS[Math.floor(rnd() * ATOMS.length)];
    let q = QS[Math.floor(rnd() * QS.length)];
    if (q && runUsed && rnd() < 0.8) q = '';
    if (q) runUsed = true;
    p += a + q;
  }
  if (rnd() < 0.25) p += '|' + ATOMS[Math.floor(rnd() * ATOMS.length)] + QS[Math.floor(rnd() * QS.length)];
  if (rnd() < 0.1) p = '^' + p;
  if (rnd() < 0.1) p += '$';
  gen.add(p);
}
for (const p of gen) {
  const s = sample(p, 'first');
  const mixed = Array.from({ length: 14 }, () => seqProbe[Math.floor(rnd() * seqProbe.length)]);
  for (const cs of [true, false]) special.push({ p, re: true, cs, probes: uniq([s, s.toUpperCase(), cap(s), s + 'a', ...mixed]) });
}
// invalid / odd inputs
for (const p of ['(', '[a', 'a{', '*a', '\\', '(?<n>a)', '\\p{Foo}', '[z-a]', 'a|', '|a', '', '\\0', '\\p{P}', '(?i)abc', '(?i)a+σ', 'a)']) for (const cs of [true, false]) special.push({ p, re: true, cs, probes: ['', 'a', 'abc', 'ABC', 'aς', 'σ', '!', '\\0', '0'] });
special.push({ p: null, re: false, cs: true, probes: ['', 'a'] }, { p: null, re: true, cs: true, probes: ['a'] }, { p: 'a', re: false, cs: true, probes: [null, 'a'] }, { p: 'a+', re: true, cs: true, probes: [null, 'a'] }, { p: 'foo|bar', re: true, cs: false, probes: [null, 'FOO', 'Bar'] });
chunks(special, 250).forEach((c, i) => write(`sm-seq-${String(i).padStart(2, '0')}`, 'StringMatcher.create: RunSequenceMatcher cases (PLAN F26 note), generated sequence patterns, invalid patterns, null', [{ op: 'string-matcher', args: { entries: c } }]));

// ---- part 2: PatternToken matching on tagged sentences of real rule tokens ----
const harv = (code) => JSON.parse(readFileSync(path.join(process.env.TOKMATCH_HARVEST_DIR ?? '', `harv-${code}.json`), 'utf8'));
let harvests;
{
  const r = await runHarness({ ops: LANGS.map((L) => ({ op: 'tokmatch-harvest', args: { lang: L.code } })) });
  harvests = r.responses.split('\n').filter(Boolean).map((l) => { const j = JSON.parse(l); if (!j.ok) throw new Error(JSON.stringify(j)); return j.result; });
}
const NSPEC = 460;
const NGENERIC = 5;
for (const [li, L] of LANGS.entries()) {
  const H = harvests[li];
  const corpus = readFileSync(path.join(ROOT, `oracle/corpus/${L.short}/corpus.txt`), 'utf8');
  const sents = corpus.split(/(?<=[.!?])\s+/).map((s) => s.replace(/\s+/g, ' ').trim()).filter((s) => s.length > 30 && s.length < 110);
  const generic = Array.from({ length: 60 }, (_, i) => sents[Math.floor((i * sents.length) / 60)]);
  const rows = H.tokens;
  const byTok = new Map();
  for (const r of rows) { const k = `${r[0]}|${r[1]}|${r[2]}`; if (!byTok.has(k)) byTok.set(k, []); byTok.get(k).push(r); }
  const sig = (r) => [r[3] === '' ? 0 : 1, r[5] ? 1 : 0, r[6] ? 1 : 0, r[7] ? 1 : 0, r[8] ? 1 : 0, r[9] === null ? 0 : r[9] === 'UNKNOWN' ? 2 : r[9] === 'SENT_START' ? 3 : 1, r[10] ? 1 : 0, r[11] ? 1 : 0, r[12] ? 1 : 0, r[13] ? 1 : 0, r[14], r[15] ? 1 : 0, r[16] ? 1 : 0, r[17] ? 1 : 0, r[18] !== 1 ? 1 : 0, r[19] !== 1 ? 1 : 0, r[20] ? 1 : 0, r[21], r[4] === '' ? 1 : 0].join('');
  const groups = new Map();
  for (const r of rows) { const s = sig(r); if (!groups.has(s)) groups.set(s, []); groups.get(s).push(r); }
  const gl = [...groups.values()].sort((a, b) => a.length - b.length);
  const sel = [];
  for (let round = 0; sel.length < NSPEC && round < 400; round++) {
    for (const g of gl) {
      if (sel.length >= NSPEC) break;
      const i = Math.floor(((round + 0.5) * g.length) / Math.max(1, Math.min(g.length, 400)));
      if (round < g.length) sel.push(g[Math.min(g.length - 1, round === 0 ? 0 : (round * 7919) % g.length)]);
    }
  }
  const uSel = uniq(sel.map((r) => r.join('\u0001'))).map((x) => x.split('\u0001'));
  const specs = [];
  const sels = sel.filter((r, i) => sel.indexOf(r) === i);
  for (const r of sels) {
    // tailored words for this token and its exceptions
    const rel = byTok.get(`${r[0]}|${r[1]}|${r[2]}`).filter((x) => x[3] === r[3] || x[3].startsWith(r[3] === '' ? '' : r[3] + ',') );
    const words = [];
    for (const x of rel) {
      const [, , , , str, isRe, cs, infl, , pos, posRe] = x;
      let cm = null;
      if (str !== '') cm = isRe ? toRe(str, cs) : null;
      let pm = null;
      if (pos !== null) pm = posRe ? toRe(pos, true) : null;
      for (const w of L.words) {
        if (words.length >= 3) break;
        const rds = L.v.get(w);
        const lem = rds.map((q) => q[0]).filter(Boolean);
        let ok = true;
        if (str !== '') {
          const forms = infl ? (lem.length ? lem : [w]) : [w];
          ok = forms.some((f) => (cm ? cm.test(f) : cs ? f === str : f.toLowerCase() === str.toLowerCase()));
        }
        if (ok && pos !== null) ok = rds.some((q) => q[1] && (pm ? pm.test(q[1]) : q[1] === pos));
        if (ok && !words.includes(w)) words.push(w);
      }
      if (words.length < 3 && str !== '' && !isRe) words.push(str);
      else if (words.length === 0 && str !== '' && isRe) words.push(sample(str, 'first'));
      if (words.length >= 3) break;
    }
    const tex = [];
    words.slice(0, 2).forEach((w, k) => { tex.push(k === 0 ? w : cap(w), `${L.prefix} ${k === 0 ? w : cap(w)} .`); });
    specs.push({ r, tex });
  }
  // ops of 75 specs; texts per op
  const ops = [];
  chunks(specs, 75).forEach((cs, ci) => {
    const texts = [];
    const ix = (t) => { let i = texts.indexOf(t); if (i < 0) { i = texts.length; texts.push(t); } return i; };
    const sp = cs.map((s, k) => {
      const ids = [];
      for (let g = 0; g < NGENERIC; g++) ids.push(ix(generic[(ci * 13 + k * 5 + g) % generic.length]));
      for (const t of s.tex) ids.push(ix(t));
      const r = s.r;
      const src = { lang: L.code, file: r[0], rule: r[1], tok: r[2] };
      if (r[3] !== '') src.ex = r[3].split(',').map(Number);
      return { src, texts: ids };
    });
    ops.push({ op: 'token-match', args: { lang: L.code, texts, specs: sp } });
  });
  chunks(ops, 3).forEach((o, i) => write(`tok-${L.code}-${String(i).padStart(2, '0')}`, `PatternToken matching methods of ${o.reduce((n, x) => n + x.args.specs.length, 0)} real rule tokens against raw-analysed sentences (${L.code})`, o));
  console.error(L.code, 'specs', specs.length, 'ops', ops.length);
}

// ---- part 3: inline edge cases ----
const SYN = [
  { syn: [
    { readings: [['', 'SENT_START', null]] },
    { readings: [['foo', 'NN', 'foo']] },
    { readings: [['Foo', 'NNP', 'foo']], ws: true },
    { readings: [['bar', 'VB', 'bar'], ['bar', 'NN', null]] },
    { readings: [['zzz', null, null]], ws: true },
    { readings: [['', null, null]] },
    { readings: [['went', 'VBD', 'go'], ['went', 'UNKNOWN', 'go']] },
    { readings: [['foo', 'NN', '']] },
    { readings: [['Äpfel', 'NNS', 'Apfel']], ws: true },
    { readings: [['ΣΑΣ', 'NN', 'σας'], ['ΣΑΣ', 'NN', 'σᾶς']] },
    { readings: [['foo', 'SENT_END', null]] },
    { readings: [['.', 'PARA_END', '.'], ['.', 'SENT_END', null]] },
    { readings: [['foo', 'NN', 'foo']], chunks: ['B-NP', 'E-NP'] },
    { readings: [['ß', 'X', 'ß'], ['ẞ', 'X', 'ẞ']] },
    { readings: [['İ', 'X', 'i'], ['ı', 'X', 'I']] },
    { readings: [['K', 'UNKNOWN', null], ['K', null, null]] },
    { readings: [['µ', 'Y', 'μ'], ['μ', 'Y', 'µ']] },
    { readings: [['x', ' ', 'x']], ws: true },
    { readings: [['a'.repeat(300), 'NN', 'a'.repeat(300)]] },
  ] },
  { syn: [{ readings: [['only', null, null]] }] },
  { syn: [{ readings: [] }] },
  { syn: [{ readings: [[null, 'NN', 'x']] }] },
  'foo bar', '', ' ', 'Das ist ein Test.', '\n', '😀 test',
];
const attr = (o) => Object.entries(o).map(([k, v]) => ` ${k}="${v}"`).join('');
const tokx = (t, o = {}, inner = '') => `<token${attr(o)}>${t}${inner}</token>`;
const ruleXml = (tok) => `<?xml version="1.0" encoding="UTF-8"?>\n<rules lang="en">\n<category id="CAT" name="Category">\n<rule id="R1" name="Rule one"><pattern>${tok}</pattern><message>Msg</message></rule>\n</category>\n</rules>\n`;
const variants = [];
const TX = ['', 'foo', 'Foo', 'FOO', 'foo|bar', 'f.*', '[fb]oo', 'a+', '\\w+', 'σας', 'σ|ς', 'ß', 'İ|ı', 'go', '.*', '(?-i)foo', '\\p{Lu}.*', 'x.*[σ]b'];
const PO = [null, 'NN', 'UNKNOWN', 'N.*', 'SENT_START', 'SENT_END', 'N|V.*', '.*', 'PARA_END', ''];
for (let i = 0; i < 160; i++) {
  const o = {};
  const t = TX[Math.floor(rnd() * TX.length)];
  if (rnd() < 0.5) o.regexp = 'yes';
  if (rnd() < 0.35) o.case_sensitive = 'yes';
  if (rnd() < 0.3) o.inflected = 'yes';
  if (rnd() < 0.25) o.negate = 'yes';
  const po = PO[Math.floor(rnd() * PO.length)];
  if (po !== null) { o.postag = po; if (rnd() < 0.6) o.postag_regexp = 'yes'; if (rnd() < 0.3) o.negate_pos = 'yes'; }
  if (rnd() < 0.15) o.spacebefore = rnd() < 0.5 ? 'yes' : 'no';
  if (rnd() < 0.1) o.chunk = 'B-NP';
  variants.push(tokx(t, o));
}
const EXS = [
  ['<exception>foo</exception>'], ['<exception scope="next">bar</exception>'], ['<exception scope="previous">foo</exception>'],
  ['<exception postag="NN"/>'], ['<exception postag="N.*" postag_regexp="yes" negate_pos="yes"/>'], ['<exception regexp="yes">f.*</exception>', '<exception scope="next" postag="VB"/>'],
  ['<exception inflected="yes">go</exception>'], ['<exception negate="yes">foo</exception>'], ['<exception case_sensitive="yes">Foo</exception>'], ['<exception postag="UNKNOWN"/>'],
  ['<exception scope="previous" postag="SENT_START"/>'], ['<exception scope="next" regexp="yes">.*</exception>'], ['<exception></exception>'], ['<exception spacebefore="yes">foo</exception>'],
];
for (const base of ['foo', 'foo|bar', '', 'Foo']) for (const ex of EXS) variants.push(tokx(base, base.includes('|') ? { regexp: 'yes' } : {}, ex.join('')));
for (const a of [
  `<token>foo</token>`, ``,
]) { void a; }
variants.push(`<and>${tokx('foo')}${tokx('', { postag: 'NN' })}</and>`.replace('<and>', '<token><and>').replace('</and>', '</and></token>'));
variants.push(`<token><and><token postag="N.*" postag_regexp="yes"/><token regexp="yes">f.*</token><token negate="yes">bar</token></and></token>`);
variants.push(`<token><and><token>foo</token><token postag="NN"/><exception>x</exception></and></token>`);
variants.push(`<token><or><token>foo</token><token postag="VB"/></or></token>`);
variants.push(`<token><or><token regexp="yes">b.*</token><token postag="UNKNOWN"/><token inflected="yes">go</token></or></token>`);
variants.push(`<token postag="NN"><or><token>bar</token><token>Foo</token></or><exception postag="NNP"/></token>`);
variants.push(`<token><and><token postag="N.*" postag_regexp="yes"/><token>foo</token></and><or><token>x</token></or></token>`);
const ixs = SYN.map((_, i) => i);
const inl = variants.map((v) => ({ src: { lang: 'en-US', xml: ruleXml(v), tok: 0 }, texts: ixs }));
const bad = [`<token regexp="yes">(</token>`, `<token postag="(" postag_regexp="yes"/>`, `<token regexp="yes">[</token>`];
const inlBad = bad.map((v) => ({ src: { lang: 'en-US', xml: ruleXml(v), tok: 0 }, texts: ixs }));
chunks([...inl, ...inlBad], 40).forEach((c, i) => write(`inline-${String(i).padStart(2, '0')}`, 'PatternToken matching on inline-loaded tokens (attribute combinations, exceptions with scopes, and/or groups) against synthetic readings (null lemma, empty lemma, no tag, UNKNOWN, SENT_START/END, chunks, special code points)', [{ op: 'token-match', args: { lang: 'en-US', texts: SYN, specs: c } }]));
console.error('inline specs', inl.length);
