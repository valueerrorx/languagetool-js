// Authors oracle/cases/X-RULEMATCH/*.json (inputs only). Ops rule-match / match-state / rulematch-harvest (RuleMatchOps.java), format docs/review/F29-oracle.md.
// Rules/sentences are chosen by features from the Java harvest; expected values come only from the Java run.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';
import { runHarness } from '../lib/harness-run.mjs';

const DIR = path.join(ROOT, 'oracle/cases/X-RULEMATCH');
rmSync(DIR, { recursive: true, force: true });
mkdirSync(DIR, { recursive: true });
const write = (name, description, ops) => writeFileSync(path.join(DIR, `${name}.json`), JSON.stringify({ kind: 'harness', clock: 'fixed', description, normalize: [], compare: 'jsonl', ops }) + '\n');
let seed = 2929;
const rnd = () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const PER_LANG = 2000;
const LANGS = [{ code: 'de-DE', c: 'de' }, { code: 'en-US', c: 'en' }, { code: 'fr', c: 'fr' }];

const r = await runHarness({ ops: LANGS.map((L) => ({ op: 'rulematch-harvest', args: { lang: L.code } })) });
const harv = r.responses.split('\n').filter(Boolean).map((l) => { const j = JSON.parse(l); if (!j.ok) throw new Error(JSON.stringify(j)); return j.result; });
const corp = {};
for (const L of LANGS) {
  const corpus = readFileSync(path.join(ROOT, `oracle/corpus/${L.c}/corpus.txt`), 'utf8').replace(/\s+/g, ' ').split(/(?<=[.!?”»])\s+/).filter((s) => s.length >= 25 && s.length <= 220);
  corp[L.c] = Array.from({ length: 80 }, (_, i) => corpus[Math.floor((i * corpus.length) / 80)]);
}

// ---- part 1: real rules, stratified ----
const STRATA = [
  ['pos', (f) => f.pos > 0], ['posRe', (f) => f.posRe > 0], ['posRep', (f) => f.posRep > 0], ['rxm', (f) => f.rxm > 0], ['cc', (f) => f.cc > 0],
  ['inc', (f) => f.inc > 0], ['setpos', (f) => f.setpos > 0], ['lem', (f) => f.lem > 0], ['spell', (f) => f.spell > 0], ['msgOnly', (f) => f.msgOnly > 0],
  ['om', (f) => f.om > 0], ['sm>1', (f) => f.sm > 1], ['sm1', (f) => f.sm === 1], ['msgSug>1', (f) => f.msgSug > 1], ['msgRef-nosm', (f) => f.msgRef > 0 && f.sm === 0],
  ['outMsg', (f) => f.outMsg], ['short', (f) => f.short], ['url', (f) => f.url], ['marker', (f) => f.marker], ['startCorr', (f) => f.startCorr !== 0],
  ['endCorr', (f) => f.endCorr !== 0], ['unify', (f) => f.unify], ['nosug', (f) => f.msgSug === 0 && f.om === 0 && !f.outMsg], ['plain', () => true],
];
const stats = {};
let totalRules = 0;
for (let li = 0; li < LANGS.length; li++) {
  const L = LANGS[li];
  const all = harv[li].rules;
  const rules = all.filter((x) => !x[4].filter && (x[5].length + x[6].length) > 0);
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
  totalRules += sel.length;
  const cs = corp[L.c];
  const per = 80;
  const mk = (slice, filterCase) => {
    const texts = [];
    const idx = new Map();
    const tid = (s) => { if (!idx.has(s)) { idx.set(s, texts.length); texts.push(s); } return idx.get(s); };
    const jobs = slice.map((x, j) => {
      const own = [...x[6].slice(0, 4), ...x[5].slice(0, 2)].filter((s) => s.length < 1500);
      const ids = own.map(tid);
      for (let k = 0; k < 2; k++) ids.push(tid(cs[(j * 3 + k * 11) % cs.length]));
      return { src: { file: x[0], rule: x[1] }, texts: [...new Set(ids)] };
    });
    return { lang: L.code, texts, jobs };
  };
  for (let ci = 0, start = 0; start < sel.length; ci++, start += per) {
    const slice = sel.slice(start, start + per);
    write(`rules-${L.c}-${String(ci).padStart(2, '0')}`, `PatternRuleMatcher#createRuleMatch (before RuleWithMaxFilter) + kept indices after RuleWithMaxFilter, ${slice.length} stratified real ${L.code} rules without <filter> on own examples plus corpus; raw tagger output`, [{ op: 'rule-match', args: mk(slice) }]);
  }
  // rules with <filter>: createRuleMatch runs RuleFilterEvaluator (F30), kept in separate cases
  const frules = all.filter((x) => x[4].filter && (x[5].length + x[6].length) > 0);
  const fsel = Array.from({ length: Math.min(160, frules.length) }, (_, i) => frules[Math.floor((i * frules.length) / Math.min(160, frules.length))]);
  for (let ci = 0, start = 0; start < fsel.length; ci++, start += per) {
    const slice = fsel.slice(start, start + per);
    write(`filter-${L.c}-${String(ci).padStart(2, '0')}`, `real ${L.code} rules WITH <filter> (needs F30 RuleFilterEvaluator); createRuleMatch result after the filter, before RuleWithMaxFilter, plus kept indices`, [{ op: 'rule-match', args: mk(slice) }]);
  }
  console.error(L.code, 'rules', sel.length, 'filter rules', fsel.length);
}

// ---- part 2: match-state on real specs ----
const MS_PER_LANG = 260;
for (let li = 0; li < LANGS.length; li++) {
  const L = LANGS[li];
  const seen = new Map();
  for (const x of harv[li].rules) {
    for (const s of x[7]) {
      const k = JSON.stringify([s.posTag, s.posTagReplace, s.postagRegexp, s.regexMatch, s.regexReplace, s.caseConv, s.setPos, s.suppressMisspelled, s.includeSkipped, s.lemma]);
      if (!seen.has(k)) seen.set(k, { spec: s, ex: x[6][0] ?? x[5][0] ?? null });
    }
  }
  const buckets = new Map();
  for (const v of seen.values()) {
    const s = v.spec;
    const bk = [s.posTag !== null, s.postagRegexp, s.posTagReplace !== null, s.regexMatch !== null, s.caseConv, s.includeSkipped, s.setPos, s.lemma !== null, s.suppressMisspelled].join('|');
    if (!buckets.has(bk)) buckets.set(bk, []);
    buckets.get(bk).push(v);
  }
  const picked = [];
  for (let round = 0; picked.length < MS_PER_LANG && round < 40; round++) {
    for (const b of buckets.values()) {
      if (picked.length >= MS_PER_LANG) break;
      const i = Math.floor(rnd() * b.length);
      if (b[i] && !b[i].used) { b[i].used = true; picked.push(b[i]); }
    }
  }
  const texts = [];
  const idx = new Map();
  const tid = (s) => { if (!idx.has(s)) { idx.set(s, texts.length); texts.push(s); } return idx.get(s); };
  const cases = [];
  picked.forEach((v, i) => {
    const s = v.spec;
    const tx = [v.ex, corp[L.c][i % 80]].filter((t) => t && t.length < 800);
    for (const t of tx) {
      const methods = ['toFinalString'];
      if (s.postagRegexp || s.lemma !== null) methods.push('getTargetPosTag');
      cases.push({ spec: s, text: tid(t), synth: true, withLang: true, methods, sweep: [1] });
    }
    // other next values, filterReadings and null synth/lang variants on the first text
    if (tx[0]) {
      cases.push({ spec: s, text: tid(tx[0]), synth: true, withLang: true, methods: ['toFinalString', 'filterReadings', 'toTokenString'], calls: [[0, 0], [1, 2], [1, 3], [2, 5], [0, 1, true], [1, 1, true]] });
      if (i % 3 === 0) cases.push({ spec: s, text: tid(tx[0]), synth: false, withLang: false, methods: ['toFinalString', 'toFinalStringNoLang', 'getTargetPosTag'], calls: [[0, 1], [1, 2], [2, 1, true]] });
    }
  });
  for (let ci = 0, st = 0; st < cases.length; ci++, st += 120) {
    const sl = cases.slice(st, st + 120);
    write(`state-${L.c}-${String(ci).padStart(2, '0')}`, `MatchState on real ${L.code} <match> specs (${sl.length} cases): toFinalString/getTargetPosTag/filterReadings/toTokenString with the language synthesizer on raw tagged tokens`, [{ op: 'match-state', args: { lang: L.code, texts, cases: sl } }]);
  }
  console.error(L.code, 'state specs', picked.length, 'cases', cases.length, 'texts', texts.length);
}

// ---- part 3: hand-written MatchState matrix ----
const CC = ['NONE', 'STARTLOWER', 'STARTUPPER', 'ALLLOWER', 'ALLUPPER', 'PRESERVE', 'FIRSTUPPER', 'NOTASHKEEL'];
const INC = ['NONE', 'FOLLOWING', 'ALL'];
const base = { posTag: null, posTagReplace: null, postagRegexp: false, regexMatch: null, regexReplace: null, caseConv: 'NONE', setPos: false, suppressMisspelled: false, includeSkipped: 'NONE', lemma: null };
const MS = {
  'en-US': { texts: ['The quick brown fox jumps over the lazy dogs.', 'THE CAT SAT', 'McDonald went to İstanbul, ǅungla and ÄÖÜ ß straße!', 'I can\'t do it, he said "no"', 'A', '', 'go goes went gone going', 'ﬁne ǆ \uD83D\uDE00 emoji  and  spaces'], tags: [['NN.*', '$0'], ['VB.*', 'VBZ'], ['NN', 'NNS'], ['JJ', null], ['NNS?', 'NNS'], ['V.*', 'VBD'], ['.*', null], ['(V)(B)', '$2$1'], ['NN:?(.*)', 'NNS$1']], lemmas: ['go', 'be', 'fox'], words: ['dog', 'cat'] },
  'de-DE': { texts: ['Der schnelle braune Fuchs springt über den faulen Hund.', 'DER KATER SASS', 'Österreichische Straßen führen nach Köln, Müller äußert sich', 'Ich gehe nach Hause, weil es regnet.', 'Das Haus ist groß', '', 'Häuser Haus gehen ging gegangen', 'Ein   Test \uD83D\uDE00 mit Leerzeichen'], tags: [['SUB:.*', '$0'], ['SUB:NOM:SIN:MAS', 'SUB:AKK:SIN:MAS'], ['VER:.*', null], ['ADJ:.*', null], ['SUB:(...):(...):(...)', 'SUB:$2:$3:$1'], ['.*', null], ['PRO:.*', null], ['SUB:NOM:PLU:.*', 'SUB:DAT:PLU:$0'], ['VER:INF:.*', 'VER:1:SIN:PRÄ:NON']], lemmas: ['gehen', 'sein', 'Haus'], words: ['Hund', 'Katze'] },
  fr: { texts: ['Le renard brun rapide saute par-dessus le chien paresseux.', 'LE CHAT ASSIS', 'L\'été à Paris, où l\'on mange des œufs, c\'est très bien', 'Il a dit « non » et elle est partie.', 'J\'aime les pommes', '', 'aller va allons allé vont', 'Un  test \uD83D\uDE00 avec espaces'], tags: [['N .*', null], ['V .*', null], ['N m s', 'N f s'], ['J .*', null], ['V ppa (.) (.)', 'V ppa $2 $1'], ['.*', null], ['D .*', null], ['R .*', null], ['V inf', 'V ind pres 3 s']], lemmas: ['aller', 'être', 'chat'], words: ['chien', 'chat'] },
};
for (const L of LANGS) {
  const M = MS[L.code];
  const cases = [];
  const texts = M.texts;
  // case conversion x include range, no pos
  for (const cc of CC) for (const inc of INC) cases.push({ spec: { ...base, caseConv: cc, includeSkipped: inc }, text: 0, synth: true, withLang: true, methods: ['toFinalString', 'filterReadings'], sweep: [0, 1, 2, 3, 6] });
  for (const cc of CC) for (let t = 1; t < texts.length; t++) cases.push({ spec: { ...base, caseConv: cc }, text: t, synth: true, withLang: true, methods: ['toFinalString'], sweep: [1] });
  // pos tag regexp x replace, synth
  for (const [re, rep] of M.tags) {
    for (const setPos of [false, true]) for (const cc of ['NONE', 'STARTUPPER', 'ALLUPPER', 'PRESERVE']) {
      cases.push({ spec: { ...base, posTag: re, posTagReplace: rep, postagRegexp: true, setPos, caseConv: cc }, text: 0, synth: true, withLang: true, methods: ['toFinalString', 'getTargetPosTag', 'filterReadings'], sweep: [1] });
    }
    cases.push({ spec: { ...base, posTag: re, postagRegexp: false }, text: 0, synth: true, withLang: true, methods: ['toFinalString', 'filterReadings'], sweep: [1] });
    cases.push({ spec: { ...base, posTag: re, posTagReplace: rep, postagRegexp: true, suppressMisspelled: true }, text: 0, synth: true, withLang: true, methods: ['toFinalString'], sweep: [1] });
    cases.push({ spec: { ...base, posTag: re, posTagReplace: rep, postagRegexp: true, includeSkipped: 'ALL' }, text: 1, synth: true, withLang: true, methods: ['toFinalString'], sweep: [3] });
    cases.push({ spec: { ...base, posTag: re, posTagReplace: rep, postagRegexp: true }, text: 6, synth: true, withLang: true, methods: ['toFinalString', 'getTargetPosTag'], sweep: [1] });
  }
  // static lemma
  for (const lem of M.lemmas) for (const [re, rep] of M.tags.slice(0, 5)) for (const cc of ['NONE', 'STARTUPPER', 'PRESERVE']) {
    cases.push({ spec: { ...base, lemma: lem, posTag: re, posTagReplace: rep, postagRegexp: true, caseConv: cc }, text: 0, synth: true, withLang: true, methods: ['toFinalString', 'getTargetPosTag', 'filterReadings'], sweep: [1] });
  }
  cases.push({ spec: { ...base, lemma: M.lemmas[0] }, text: 0, synth: true, withLang: true, methods: ['toFinalString', 'getTargetPosTag'], sweep: [1] });
  cases.push({ spec: { ...base, lemma: M.lemmas[0], posTag: null, postagRegexp: true }, text: 0, synth: true, withLang: true, methods: ['toFinalString', 'filterReadings'], sweep: [1] });
  cases.push({ spec: { ...base, lemma: '', posTag: M.tags[0][0], postagRegexp: true }, text: 0, synth: true, withLang: true, methods: ['toFinalString'], sweep: [1] });
  // regexp_match / regexp_replace
  const RX = [['(.)(.*)', '$2$1'], ['^(.)', '$1$1'], ['e', 'E'], ['.', ''], ['x*', '-'], ['(a)|(b)', '[$1$2]'], ['[aeiou]', '\\$'], ['ö', 'oe'], ['(?i)the', 'a'], ['(.*)', '$0$0'], ['(.)', '$9'], ['(?<n>.)', '${n}!'], ['a', null], ['(', 'x'], ['\\p{Lu}', '_'], ['(?<=\\w)s$', ''], ['', 'x'], ['^$', 'empty']];
  for (const [m, rp] of RX) for (const cc of ['NONE', 'STARTUPPER']) {
    cases.push({ spec: { ...base, regexMatch: m, regexReplace: rp, caseConv: cc }, text: 0, synth: true, withLang: true, methods: ['toFinalString', 'filterReadings'], sweep: [1] });
    cases.push({ spec: { ...base, regexMatch: m, regexReplace: rp, posTag: M.tags[0][0], postagRegexp: true, posTagReplace: M.tags[0][1], caseConv: cc }, text: 0, synth: true, withLang: true, methods: ['toFinalString', 'filterReadings'], sweep: [1] });
  }
  // bad arguments
  cases.push({ spec: { ...base, posTag: '(', postagRegexp: true }, text: 0, synth: true, withLang: true, methods: ['toFinalString'], sweep: [1] });
  cases.push({ spec: { ...base, caseConv: 'BOGUS' }, text: 0, synth: true, withLang: true, methods: ['toFinalString'], sweep: [1] });
  cases.push({ spec: { ...base, posTag: M.tags[0][0], postagRegexp: true }, text: 0, synth: true, withLang: true, methods: ['toFinalString', 'getTargetPosTag'], calls: [[-1, 1], [99, 1], [0, -1], [0, 0], [3, 100], [1, 2147483647], [99, 1, true], [-1, 1, true]] });
  cases.push({ spec: { ...base, posTag: M.tags[0][0], postagRegexp: true }, text: 5, synth: true, withLang: true, methods: ['toFinalString'], calls: [[0, 1], [0, 1, true]] });
  cases.push({ spec: { ...base, posTag: M.tags[0][0], postagRegexp: true }, text: 4, synth: true, withLang: true, methods: ['toFinalString', 'filterReadings'], sweep: [1, 2] });
  for (let ci = 0, st = 0; st < cases.length; ci++, st += 150) {
    const sl = cases.slice(st, st + 150);
    write(`statehand-${L.c}-${String(ci).padStart(2, '0')}`, `MatchState hand-written matrix for ${L.code} (case conversion x include_skipped, postag regexp+replace with synthesis, static lemma, regexp_replace incl. bad groups/patterns, bad indices)`, [{ op: 'match-state', args: { lang: L.code, texts, cases: sl } }]);
  }
  console.error(L.code, 'statehand cases', cases.length);
}

// ---- part 4: inline rules ----
const esc = (s) => s;
const mkRule = (i, o) => `<rule id="R${i}" name="Rule ${i}"${o.ruleAttrs ?? ''}>${o.pre ?? ''}<pattern${o.pattrs ?? ''}>${o.pattern}</pattern>${o.message === undefined ? '' : `<message>${o.message}</message>`}${o.extra ?? ''}</rule>`;
const xmlOf = (lang, rules, head = '') => `<?xml version="1.0" encoding="UTF-8"?>\n<rules lang="${lang}">\n${head}<category id="CAT" name="Category">\n${rules.map((o, i) => mkRule(i, o)).join('\n')}\n</category>\n</rules>\n`;
const T = (t, a = '') => `<token${a ? ' ' + a : ''}>${t}</token>`;
const M1 = (a = '') => `<match no="1"${a ? ' ' + a : ''}/>`;
const EN = [
  // refs
  { pattern: T('a') + T('b'), message: 'x <suggestion>\\1 \\2</suggestion>' },
  { pattern: T('a') + T('b'), message: 'x <suggestion>\\0</suggestion>' },
  { pattern: T('a') + T('b'), message: 'x <suggestion>\\3</suggestion>' },
  { pattern: T('a') + T('b'), message: 'x <suggestion>\\2\\1</suggestion> y \\1 z \\2' },
  { pattern: T('a') + T('b'), message: 'x \\1 y \\2 and <suggestion>\\1</suggestion>' },
  { pattern: T('a') + T('b'), message: '\\\\1 <suggestion>\\\\2</suggestion>' },
  { pattern: T('a', 'skip="2"') + T('b'), message: '<suggestion>\\1 \\2</suggestion>' },
  { pattern: T('a', 'skip="2"') + T('b'), message: '<suggestion>' + M1('include_skipped="all"') + ' \\2</suggestion>' },
  { pattern: T('a', 'skip="2"') + T('b'), message: '<suggestion>' + M1('include_skipped="following"') + ' \\2</suggestion>' },
  { pattern: T('a', 'skip="-1"') + T('b'), message: '<suggestion>' + M1('include_skipped="all"') + '</suggestion>' },
  { pattern: T('a', 'skip="-1"') + T('b'), message: '<suggestion>' + M1('include_skipped="following"') + ' ' + '<match no="2" case_conversion="allupper"/></suggestion>' },
  { pattern: T('a') + T('x', 'min="0"') + T('b'), message: '<suggestion>\\1 \\2 \\3</suggestion>' },
  { pattern: T('a') + T('x', 'min="0"') + T('b'), message: '<suggestion>' + M1() + ' <match no="2"/> <match no="3"/></suggestion>' },
  { pattern: T('x', 'min="0"') + T('a'), message: '<suggestion>\\1 \\2</suggestion>' },
  { pattern: T('a') + T('x', 'min="0"'), message: '<suggestion>\\1 \\2</suggestion> <suggestion>\\2</suggestion>' },
  { pattern: T('a') + T('x', 'min="0" max="3"') + T('b'), message: '<suggestion>\\1 \\2 \\3</suggestion>' },
  { pattern: T('a') + T('x', 'min="0"') + T('x', 'min="0"') + T('b'), message: '<suggestion>\\1 \\2 \\3 \\4</suggestion>' },
  { pattern: T('a') + T('x', 'min="0"') + T('x', 'min="0"') + T('b'), message: '<suggestion>\\4, \\1</suggestion>' },
  { pattern: T('a') + T('b'), message: '<suggestion>\\1</suggestion><suggestion>\\1</suggestion>' },
  { pattern: T('a') + T('b'), message: '<suggestion>X</suggestion> or <suggestion>X</suggestion> or <suggestion>Y</suggestion>' },
  { pattern: T('a') + T('b'), message: '<suggestion></suggestion>' },
  { pattern: T('a') + T('b'), message: '<suggestion> </suggestion> and <suggestion>\\1</suggestion>' },
  { pattern: T('a') + T('b'), message: 'no suggestion at all' },
  // quotes, apostrophes, entities
  { pattern: T('a') + T('b'), message: 'ref \\10 \\01 \\1a \\ x' },
  { pattern: T('a') + T('b'), message: 'trailing \\ here' },
  { pattern: T('a') + T('b'), message: '&lt;suggestion&gt;unclosed' },
  { pattern: T('a') + T('b'), message: '&lt;/suggestion&gt; backwards &lt;suggestion&gt;' },
  { pattern: T('a') + T('b'), message: '&lt;suggestion&gt;x&lt;/suggestion&gt; escaped tags' },
  { pattern: T('a') + T('b'), message: 'm', ruleAttrs: ' type="misspelling"' },
  { pattern: T('a') + T('b'), message: 'Use "<suggestion>quoted</suggestion>" or \'<suggestion>single</suggestion>\'.' },
  { pattern: T('a') + T('b'), message: 'It&apos;s &quot;<suggestion>a &amp; b &lt;c&gt;</suggestion>&quot;' },
  { pattern: T('a') + T('b'), message: '<suggestion>don\'t \\1</suggestion>' },
  { pattern: T('a') + T('b'), message: 'Umlauts \u00e4\u00f6\u00fc \u00df \u20ac \uD83D\uDE00 <suggestion>\u00e4\\1\uD83D\uDE00</suggestion>' },
  { pattern: T('a') + T('b'), message: 'multi\nline <suggestion>a\nb</suggestion>\ttab' },
  { pattern: T('a') + T('b'), message: 'Use <suggestion>A <b>bold</b></suggestion>' },
  { pattern: T('a') + T('b'), message: '<suggestion><mistake/></suggestion> <suggestion>ok</suggestion>' },
  { pattern: T('a') + T('b'), message: '<pleasespellme/>' },
  { pattern: T('a') + T('b'), message: '<suggestion><pleasespellme/>foo</suggestion>' },
  { pattern: T('a') + T('b'), message: '<suggestion><pleasespellme/>foo(bar)</suggestion> <suggestion>baz</suggestion>' },
  { pattern: T('a') + T('b'), message: '<pleasespellme/><suggestion>\\1</suggestion>' },
  { pattern: T('a') + T('b'), message: '<pleasespellme/>no sugg' },
  { pattern: T('a') + T('b'), message: '<suggestion><pleasespellme/>' + M1('suppress_misspelled="yes"') + '</suggestion>' },
  { pattern: T('a') + T('b'), message: '<suggestion>' + M1('suppress_misspelled="yes"') + '</suggestion>' },
  // matches with transformations on plain tokens
  { pattern: T('a') + T('b'), message: '<suggestion>' + M1('case_conversion="allupper"') + '</suggestion>' },
  { pattern: T('a') + T('b'), message: '<suggestion>' + M1('case_conversion="startupper"') + ' x</suggestion>' },
  { pattern: T('A') + T('b'), message: '<suggestion>' + M1('case_conversion="startlower"') + ' x</suggestion>' },
  { pattern: T('A') + T('b'), message: '<suggestion>' + M1('case_conversion="alllower"') + '</suggestion>' },
  { pattern: T('a') + T('b'), message: '<suggestion>' + M1('case_conversion="preserve"') + '</suggestion>' },
  { pattern: T('a') + T('b'), message: '<suggestion>' + M1('regexp_match="(.)" regexp_replace="$1$1"') + '</suggestion>' },
  { pattern: T('a') + T('b'), message: '<suggestion>' + M1('regexp_match="x" regexp_replace="y"') + '</suggestion>' },
  { pattern: T('a') + T('b'), message: 'only in message ' + M1('case_conversion="allupper"') + ' <suggestion>x</suggestion>' },
  { pattern: T('a') + T('b'), message: 'm ' + M1() + ' n ' + '<match no="2"/> <suggestion>\\1 <match no="2" case_conversion="startupper"/></suggestion>' },
  { pattern: T('a') + T('b'), message: '<suggestion>' + M1() + '</suggestion> <suggestion>' + M1('case_conversion="allupper"') + '</suggestion> <suggestion>' + M1() + '</suggestion>' },
  { pattern: T('a') + T('b'), message: '<suggestion>\\1</suggestion> <suggestion>\\1</suggestion> <suggestion>\\1</suggestion>' },
  { pattern: T('a') + T('b'), message: '<suggestion>' + M1('postag="NN" postag_replace="NNS"') + '</suggestion>' },
  { pattern: T('a') + T('b'), message: '<suggestion>' + M1('postag="NN.*" postag_regexp="yes" postag_replace="NNS"') + '</suggestion>' },
  { pattern: T('a') + T('b'), message: '<suggestion>' + M1('postag="NN.*" postag_regexp="yes" postag_replace="NNS" setpos="yes"') + '</suggestion>' },
  { pattern: T('dog') + T('b'), message: '<suggestion>' + M1('postag="NNS" postag_regexp="no"') + '</suggestion>' },
  { pattern: T('dog') + T('b'), message: '<suggestion>' + M1('postag="NN" postag_replace="NNS" postag_regexp="yes"') + '</suggestion>' },
  { pattern: T('cat') + T('b'), message: '<suggestion>' + M1('postag="NN|NNS" postag_regexp="yes"') + '</suggestion>' },
  { pattern: T('dog') + T('b'), message: '<suggestion>' + M1('postag="VB.*" postag_regexp="yes" postag_replace="VBZ"') + '</suggestion>' },
  { pattern: T('be', 'inflected="yes"') + T('b'), message: '<suggestion>' + M1('postag="VB.*" postag_regexp="yes"') + '</suggestion>' },
  { pattern: T('go', 'inflected="yes"') + T('b'), message: '<suggestion>' + M1('postag="VBD" postag_regexp="yes"') + ' <match no="2">go</match></suggestion>' },
  { pattern: T('a') + T('b'), message: '<suggestion><match no="1" postag="VBD" postag_regexp="yes">do</match></suggestion>' },
  { pattern: T('a') + T('b'), message: '<suggestion><match no="1" postag="VBZ" postag_regexp="yes" case_conversion="startupper">be</match></suggestion>' },
  { pattern: T('a') + T('b'), message: '<suggestion><match no="1" postag="NNS" postag_regexp="yes" postag_replace="NNS">fox</match></suggestion>' },
  { pattern: T('a') + T('b'), message: '<suggestion><match no="1" postag="XXX" postag_regexp="yes">fox</match></suggestion>' },
  // suggestions outside message
  { pattern: T('a') + T('b'), message: 'See', extra: '<suggestion>\\1 \\2</suggestion>' },
  { pattern: T('a') + T('b'), message: 'See <suggestion>one</suggestion>', extra: '<suggestion>two</suggestion><suggestion>' + M1('case_conversion="allupper"') + '</suggestion>' },
  { pattern: T('a') + T('b'), message: 'See', extra: '<suggestion>' + M1('case_conversion="startupper"') + '</suggestion>' },
  { pattern: T('a') + T('b'), message: 'See \\1', extra: '<suggestion>\\2</suggestion><suggestion>\\1</suggestion>' },
  { pattern: T('a') + T('b'), message: '<pleasespellme/>', extra: '<suggestion>' + M1('suppress_misspelled="yes"') + '</suggestion>' },
  // short, url, type
  { pattern: T('a') + T('b'), message: 'm', extra: '<short>Short \\1 <suggestion>q</suggestion></short>' },
  { pattern: T('a') + T('b'), message: 'm', extra: '<short></short>' },
  { pattern: T('a') + T('b'), message: 'm', extra: '<url>https://example.com/a?b=c&amp;d</url>' },
  { pattern: T('a') + T('b'), message: 'm', ruleAttrs: ' type="grammar"' },
  { pattern: T('a') + T('b'), message: 'm', ruleAttrs: ' type="style"' },
  { pattern: T('a') + T('b'), message: 'm', ruleAttrs: ' default="off" tags="picky"' },
  // markers
  { pattern: '<marker>' + T('a') + '</marker>' + T('b'), message: '<suggestion>\\1</suggestion>' },
  { pattern: T('a') + '<marker>' + T('b') + '</marker>', message: '<suggestion>\\2</suggestion>' },
  { pattern: '<marker>' + T('a') + T('b') + '</marker>', message: '<suggestion>\\1 \\2</suggestion>' },
  { pattern: T('a') + '<marker>' + T('x', 'min="0"') + '</marker>' + T('b'), message: '<suggestion>\\2</suggestion>' },
  { pattern: '<marker>' + T('x', 'min="0"') + '</marker>' + T('a'), message: '<suggestion>\\1</suggestion>' },
  { pattern: T('a') + '<marker>' + T('x', 'min="0"') + '</marker>', message: '<suggestion>\\2</suggestion>' },
  { pattern: T('', 'postag="SENT_START"') + '<marker>' + T('a') + '</marker>', message: '<suggestion>\\2</suggestion>' },
  { pattern: T('', 'postag="SENT_START"') + '<marker>' + T('a') + '</marker>', message: '<suggestion>' + '<match no="2" case_conversion="startupper"/></suggestion>' },
  { pattern: T('', 'postag="SENT_START"') + '<marker>' + T('a') + '</marker>', message: '<suggestion>\\2 \\2</suggestion>' },
  { pattern: '<marker>' + T('b') + '</marker>' + T('.', 'regexp="yes"') + T('', 'postag="SENT_END"'), message: '<suggestion>\\1</suggestion>' },
  { pattern: T('b') + '<marker>' + T('', 'postag="SENT_END"') + '</marker>', message: '<suggestion>\\1</suggestion>' },
  { pattern: '<marker>' + T('', 'postag="SENT_START"') + '</marker>' + T('a'), message: 'm' },
  { pattern: T('a') + T('b', 'skip="-1"') + '<marker>' + T('c') + '</marker>', message: '<suggestion>\\3</suggestion>' },
  { pattern: T('a', 'skip="-1"') + '<marker>' + T('c') + '</marker>', message: '<suggestion>\\1</suggestion>' },
  { pattern: T('a', 'skip="-1"') + T('b'), message: '<suggestion>\\1 \\2</suggestion>' },
  { pattern: T('a', 'skip="-1"') + T('b', 'min="0"'), message: '<suggestion>\\1 \\2</suggestion>' },
  { pattern: T('a', 'skip="-1"') + T('x', 'min="0"'), message: '<suggestion>\\1 \\2</suggestion>' },
  { pattern: '<marker>' + T('a', 'skip="-1"') + '</marker>' + T('b'), message: 'm' },
  { pattern: T('a') + '<marker>' + T('b', 'skip="-1"') + '</marker>' + T('c', 'min="0"'), message: 'm' },
  // comma suggestions and start corrections
  { pattern: T('a') + '<marker>' + T('b') + '</marker>', message: 'x <suggestion>, \\2</suggestion>' },
  { pattern: T('a') + '<marker>' + T('b') + '</marker>', message: 'x <suggestion>,</suggestion>' },
  { pattern: T('a') + '<marker>' + T('b') + '</marker>', message: 'x', extra: '<suggestion>, y</suggestion>' },
  { pattern: '<marker>' + T('a') + '</marker>' + T('b'), message: 'x <suggestion>, y</suggestion>' },
  { pattern: T('a') + T('b'), message: 'x <suggestion>,\\2</suggestion>' },
  { pattern: T('a') + T('b') + T('c'), message: 'x <suggestion>\\2 \\3</suggestion>', ruleAttrs: '' },
  // word list / regexp
  { pattern: T('a|b', 'regexp="yes"') + T('c|x', 'regexp="yes"'), message: 'm <suggestion>\\1\\2</suggestion>' },
  { pattern: T('.*', 'regexp="yes" max="3"') + T('c'), message: 'm <suggestion>\\1 \\2</suggestion>' },
  { pattern: T('.*', 'regexp="yes" min="0" max="3"') + T('c'), message: 'm <suggestion>\\1 \\2</suggestion>' },
  { pattern: T('a', 'max="3"') + T('b'), message: 'm <suggestion>\\1 \\2</suggestion>' },
  { pattern: T('a', 'min="2" max="3"'), message: 'm <suggestion>\\1</suggestion>' },
  // reference tokens in pattern
  { pattern: T('a', 'skip="-1"') + '<token><match no="1"/></token>', message: 'dup <suggestion>\\1</suggestion>' },
  { pattern: T('a|b', 'regexp="yes" skip="-1"') + '<token><match no="1"/></token>', message: 'dup <suggestion>\\1 \\2</suggestion>' },
  { pattern: T('(a|b)', 'regexp="yes"') + '<token><match no="1" regexp_match="(.*)" regexp_replace="$1"/></token>', message: 'dup \\1' },
  // phrases
  { pattern: '<phraseref idref="P1"/>' + T('c'), message: '<suggestion>\\1 \\2</suggestion>', pre: '', extra: '', phrase: true },
  { pattern: T('c') + '<phraseref idref="P1"/>', message: '<suggestion>\\1 \\2 \\3</suggestion>', phrase: true },
  { pattern: '<phraseref idref="P1"/>' + T('c'), message: '<suggestion>' + M1() + ' ' + '<match no="2"/></suggestion> \\3', phrase: true },
  { pattern: '<marker><phraseref idref="P1"/></marker>' + T('c'), message: '<suggestion>\\1</suggestion>', phrase: true },
  { pattern: '<phraseref idref="P2"/>' + T('a'), message: '<suggestion>\\1 \\2</suggestion>', phrase: true },
  { pattern: '<phraseref idref="P1"/><phraseref idref="P2"/>', message: '<suggestion>\\1 \\2 \\3</suggestion>', phrase: true },
  // unusual messages: no <message>, empty
  { pattern: T('a') + T('b'), message: '' },
  { pattern: T('a') + T('b') },
];
const PH = '<phrases><phrase id="P1"><token>a</token><token>b</token></phrase><phrase id="P2"><token>b</token><or><token>c</token><token>x</token></or></phrase></phrases>\n';
// rules wrapped in rulegroups for subId handling and antipattern-free multi-pattern rules
const enRules = EN.map((o) => o);
const ENS = ['a b', 'a b c', 'x a b', 'A b', 'A B', 'A B C', 'THE A B', 'a  b', 'a\tb', 'a x b', 'a x x b', 'a x x x b', 'a c b', 'a c c b', 'a c c c b', 'a. b', 'a, b', 'b a b', 'a b a b', 'a a b b', 'a c', 'c a b', 'c a b c', 'a b c x', 'a b c b', 'b c', 'c', 'a', 'b', 'a a', 'x', '', ' ', 'dog cat', 'The dog barks.', 'The dogs bark.', 'He goes and she went.', 'I be a fox', 'dog dog', 'cat dog b', 'go b', 'went b', 'be b', 'A\u00a0b', 'a b\u200b', '\uD83D\uDE00 a b \uD83D\uDE00', '\uD83D\uDE00 a \uD83D\uDE00 b', 'a \uD83D\uDE00 c b', 'ab ab', 'a b.', 'Hello, a b!', '"a b"', "a 'b' c", 'a-b a b', 'I\'m a b', 'A', 'I', 'I a b', 'I A B', 'a b?', '(a b)', 'a b\nc d', 'a b c d e f g h i j k l m n o p'];
const enChunk = 36;
for (let i = 0, ci = 0; i < enRules.length; i += enChunk, ci++) {
  const slice = enRules.slice(i, i + enChunk);
  const xml = xmlOf('en', slice, PH);
  const ids = ENS.map((_, k) => k);
  write(`inline-en-${String(ci).padStart(2, '0')}`, `synthetic en rules: message/suggestion formatting, \\N references (skip, min=0, phrases), <match> in suggestions, outMsg suggestions, short/url/type, markers incl. sentence edges, comma rule, surrogate/whitespace sentences (${slice.length} rules x ${ENS.length} sentences)`,
    [{ op: 'rule-match', args: { lang: 'en-US', xml, texts: ENS, jobs: slice.map((_, j) => ({ src: { rule: j }, texts: ids })) } }]);
}
// all-uppercase / case adjustment
const CASE_RULES = [];
for (const adj of [undefined, 'no']) for (const cc of [undefined, 'preserve', 'startupper', 'allupper', 'alllower']) {
  const m = cc ? M1(`case_conversion="${cc}"`) : '\\1';
  CASE_RULES.push({ pattern: T('foo') + T('bar', 'min="0"'), message: `m <suggestion>${m} baz</suggestion>`, ruleAttrs: adj ? ` adjust_suggestion_case="${adj}"` : '' });
  CASE_RULES.push({ pattern: T('foo', 'case_sensitive="no"') + T('bar', 'min="0"'), message: `m <suggestion>${cc ? M1(`case_conversion="${cc}"`) : 'Lit'} </suggestion><suggestion>mIxEd</suggestion><suggestion>iPhone x</suggestion>`, ruleAttrs: adj ? ` adjust_suggestion_case="${adj}"` : '' });
}
CASE_RULES.push({ pattern: T('a', 'case_sensitive="no"'), message: '<suggestion>b</suggestion><suggestion>B</suggestion>' }, { pattern: T('a', 'case_sensitive="no"'), message: '<suggestion>ab</suggestion>', extra: '' }, { pattern: T('\'?m', 'regexp="yes"'), message: '<suggestion>am</suggestion>' }, { pattern: T('i', 'case_sensitive="no"'), message: '<suggestion>I am</suggestion>' }, { pattern: T('foo', 'case_sensitive="no"') + T('bar', 'case_sensitive="no"'), message: '<suggestion>\\2 \\1</suggestion><suggestion>' + M1('case_conversion="startupper"') + '</suggestion>' });
const CS = ['foo', 'Foo', 'FOO', 'FOO BAR', 'Foo Bar', 'foo bar', 'F', 'FOO bar', 'foo BAR', 'A', 'a', 'I', 'i', "I'M", "i'm", "'m", 'FOO.', 'The FOO BAR.', 'THE FOO', 'ÄÖÜ foo', 'Foo-bar FOO', 'ǅ foo', 'FOO \u00df', 'STRASSE foo', 'FOO BAR BAZ'];
{
  const xml = xmlOf('en', CASE_RULES);
  write('inline-case', `uppercase/startUpper/adjust_suggestion_case handling in createRuleMatch (isAllUppercase, matchPreservesCase) (${CASE_RULES.length} rules x ${CS.length} sentences)`,
    [{ op: 'rule-match', args: { lang: 'en-US', xml, texts: CS, jobs: CASE_RULES.map((_, j) => ({ src: { rule: j }, texts: CS.map((_, k) => k) })) } }]);
}
// rulegroups / subIds / antipatterns present (antipatterns are not applied by createRuleMatch), rule-level attrs
{
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rules lang="en"><category id="CAT" name="Category">
<rulegroup id="G1" name="group">
<antipattern><token>a</token><token>b</token></antipattern>
<rule><pattern>${T('a')}${T('b')}</pattern><message>one <suggestion>\\1</suggestion></message><url>https://g.example/</url></rule>
<rule><pattern>${T('b')}</pattern><message>two <suggestion>\\1\\1</suggestion></message><short>sh</short></rule>
<rule><pattern>${T('a')}</pattern><message>three</message></rule>
</rulegroup>
<rulegroup id="G2" name="group2" type="grammar"><message>shared <suggestion>\\1!</suggestion></message><short>shared short</short><url>https://shared.example/</url>
<rule><pattern>${T('c')}</pattern></rule>
<rule><pattern>${T('x')}</pattern><message>own <suggestion>\\1?</suggestion></message></rule>
</rulegroup>
<rule id="R3" name="r3" type="style"><pattern>${T('a')}${T('b')}${T('c')}</pattern><message>m</message></rule>
</category></rules>`;
  const texts = ENS.slice(0, 20);
  write('inline-groups', 'rule groups with shared message/short/url, antipatterns present, subIds, rule type (createRuleMatch ignores antipatterns)',
    [{ op: 'rule-match', args: { lang: 'en-US', xml, texts, jobs: [0, 1, 2, 3, 4, 5, 6].map((j) => ({ src: { rule: j }, texts: texts.map((_, k) => k) })) } }]);
}
// synthetic token arrays
{
  const syn = [
    { syn: [{ readings: [['', 'SENT_START', null]] }, { readings: [['a', 'NN', 'a']] }, { readings: [['b', 'VB', 'b'], ['b', 'NN', 'b']], ws: true }, { readings: [['.', 'SENT_END', null], ['.', 'PARA_END', '.']] }] },
    { syn: [{ readings: [['only', null, null]] }] },
    { syn: [{ readings: [['a', 'NN', 'a']] }, { readings: [[' ', null, null]], ws: true }, { readings: [['a', 'NN', 'a']] }, { readings: [['b', 'NN', 'b']] }] },
    { syn: [{ readings: [['a', 'NN', 'a']] }, { readings: [['b', 'NN', 'b']], ws: true }] },
    { syn: [{ readings: [['\u00e4\uD83D\uDE00', 'NN', 'a']] }, { readings: [['b', 'NN', 'b']], ws: true }] },
    { syn: [] },
  ];
  const rules = EN.slice(0, 40);
  const xml = xmlOf('en', rules, PH);
  write('inline-syn', 'synthetic token arrays (SENT_START/END, PARA_END readings, null tags, surrogate token) through a subset of the inline rules',
    [{ op: 'rule-match', args: { lang: 'en-US', xml, texts: syn, jobs: rules.map((_, j) => ({ src: { rule: j }, texts: syn.map((_, k) => k) })) } }]);
}
// german / french synthesis through createRuleMatch
const DE = [
  { pattern: T('Hund') + T('bellt'), message: '<suggestion>' + M1('postag="SUB:.*" postag_regexp="yes" postag_replace="SUB:DAT:SIN:MAS"') + ' \\2</suggestion>' },
  { pattern: T('Hund', 'inflected="yes"') + T('bellt'), message: '<suggestion>' + M1('postag="SUB:NOM:PLU:MAS" postag_regexp="yes"') + ' \\2</suggestion>' },
  { pattern: T('Haus', 'inflected="yes"'), message: '<suggestion>' + M1('postag="SUB:(...):PLU:(...)" postag_regexp="yes" postag_replace="SUB:$1:SIN:$2"') + '</suggestion>' },
  { pattern: T('gehen', 'inflected="yes"'), message: '<suggestion>' + M1('postag="VER:1:SIN:PRÄ.*" postag_regexp="yes"') + '</suggestion> <suggestion>' + M1('postag="VER:INF:.*" postag_regexp="yes" case_conversion="allupper"') + '</suggestion>' },
  { pattern: T('der') + T('Hund'), message: '<suggestion><match no="1" postag="ART:DEF:AKK:SIN:MAS" postag_regexp="yes">der</match> \\2</suggestion>' },
  { pattern: T('ich') + T('gehe'), message: '<suggestion>\\1 <match no="2" postag="VER:2:SIN:PRÄ:NON" postag_regexp="yes">gehen</match></suggestion>' },
  { pattern: T('Straße', 'case_sensitive="no"'), message: '<suggestion>' + M1('case_conversion="allupper"') + '</suggestion> <suggestion>' + M1('regexp_match="ß" regexp_replace="ss"') + '</suggestion>' },
  { pattern: T('schnelle', 'inflected="yes"') + T('Fuchs'), message: '<suggestion>' + M1('postag="ADJ:.*:NOM:.*" postag_regexp="yes"') + ' \\2</suggestion>' },
  { pattern: T('Haus') + T('ist'), message: 'Meinten Sie <suggestion>\\1, \\2</suggestion>?' },
  { pattern: '<marker>' + T('weil') + '</marker>' + T('es'), message: '<suggestion>, \\1</suggestion>' },
  { pattern: T('nach') + '<marker>' + T('Hause') + '</marker>', message: '<suggestion>' + M1().replace('no="1"', 'no="2"') + 'n</suggestion>' },
  { pattern: T('Hunde') + T('x', 'min="0"') + T('Haus'), message: '<suggestion>' + M1('postag="SUB:.*:SIN:.*" postag_regexp="yes"') + ' \\2 \\3</suggestion>' },
];
const DES = ['Der Hund bellt.', 'Die Hunde bellen nicht.', 'DER HUND BELLT', 'Ich gehe nach Hause, weil es regnet.', 'Das Haus ist groß.', 'Die Häuser sind groß.', 'Wir gehen.', 'Der schnelle Fuchs rennt.', 'Straße STRASSE strasse', 'Hund Haus', 'Hunde Haus', 'Hunde und Haus', 'der Hund', 'ich gehe', 'Er sagt: „Ich gehe.“', 'Hund \uD83D\uDE00 bellt', 'Ein  Hund   bellt'];
{
  const xml = xmlOf('de', DE);
  write('inline-de', `German synthesis via <match> postag/postag_replace/regexp/case_conversion in suggestions (${DE.length} rules x ${DES.length} sentences)`,
    [{ op: 'rule-match', args: { lang: 'de-DE', xml, texts: DES, jobs: DE.map((_, j) => ({ src: { rule: j }, texts: DES.map((_, k) => k) })) } }]);
}
const FR = [
  { pattern: T('chat') + T('noir'), message: '<suggestion>' + M1('postag="N f s" postag_regexp="no"') + ' \\2</suggestion>' },
  { pattern: T('chat', 'inflected="yes"') + T('noir'), message: '<suggestion>' + M1('postag="N .*" postag_regexp="yes" postag_replace="N f p"') + ' \\2</suggestion>' },
  { pattern: T('aller', 'inflected="yes"'), message: '<suggestion>' + M1('postag="V ind pres 1 s" postag_regexp="no"') + '</suggestion> <suggestion>' + M1('postag="V inf" postag_regexp="no" case_conversion="startupper"') + '</suggestion>' },
  { pattern: T("l'", 'case_sensitive="no"') + T('été'), message: '<suggestion>\\1\\2</suggestion> <suggestion>' + M1('case_conversion="allupper"') + ' \\2</suggestion>' },
  { pattern: T('le') + T('chat'), message: '<suggestion><match no="1" postag="D f s" postag_regexp="no">le</match> <match no="2" postag="N f s" postag_regexp="no"/></suggestion>' },
  { pattern: T('J\'aime'), message: '<suggestion>' + M1('regexp_match="(.)\'(.*)" regexp_replace="$2 $1"') + '</suggestion>' },
  { pattern: T('œufs'), message: '<suggestion>' + M1('regexp_match="œ" regexp_replace="oe"') + '</suggestion> <suggestion>' + M1('case_conversion="allupper"') + '</suggestion>' },
  { pattern: T('très') + T('bien'), message: '«<suggestion>\\1\u00a0\\2</suggestion>»' },
  { pattern: T('par-dessus'), message: 'm <suggestion>' + M1('case_conversion="startupper"') + '</suggestion>' },
];
const FRS = ['Le chat noir dort.', 'Les chats noirs dorment.', 'LE CHAT NOIR', "L'été à Paris, c'est très bien", "J'aime les pommes", 'Il va à Paris', 'Nous allons au parc', 'des œufs', 'Le renard saute par-dessus le chien.', 'Il a dit « non ».', 'chat \uD83D\uDE00 noir', 'le  chat'];
{
  const xml = xmlOf('fr', FR);
  write('inline-fr', `French synthesis via <match> (${FR.length} rules x ${FRS.length} sentences)`,
    [{ op: 'rule-match', args: { lang: 'fr', xml, texts: FRS, jobs: FR.map((_, j) => ({ src: { rule: j }, texts: FRS.map((_, k) => k) })) } }]);
}
// load errors in inline xml
{
  const bad = [
    `<?xml version="1.0" encoding="UTF-8"?>\n<rules lang="en"><category id="C" name="c"><rule id="R" name="r"><pattern>${T('a')}</pattern><message><suggestion><match no="5"/></suggestion></message></rule></category></rules>`,
    `<?xml version="1.0" encoding="UTF-8"?>\n<rules lang="en"><category id="C" name="c"><rule id="R" name="r"><pattern>${T('a')}</pattern><message>\\9 <suggestion>\\9</suggestion></message></rule></category></rules>`,
    `<?xml version="1.0" encoding="UTF-8"?>\n<rules lang="en"><category id="C" name="c"><rule id="R" name="r"><pattern>${T('a')}</pattern><message><suggestion><match no="1" case_conversion="zzz"/></suggestion></message></rule></category></rules>`,
    `<?xml version="1.0" encoding="UTF-8"?>\n<rules lang="en"><category id="C" name="c"><rule id="R" name="r"><pattern>${T('a')}</pattern><message><suggestion><match no="1" regexp_match="("/></suggestion></message></rule></category></rules>`,
    `<?xml version="1.0" encoding="UTF-8"?>\n<rules lang="en"><category id="C" name="c"><rule id="R" name="r"><pattern>${T('a')}</pattern><message><suggestion><match no="1" postag="(" postag_regexp="yes"/></suggestion></message></rule></category></rules>`,
    `<?xml version="1.0" encoding="UTF-8"?>\n<rules lang="en"><category id="C" name="c"><rule id="R" name="r"><pattern>${T('a')}</pattern><message><suggestion><match no="0"/></suggestion></message></rule></category></rules>`,
    `<?xml version="1.0" encoding="UTF-8"?>\n<rules lang="en"><category id="C" name="c"><rule id="R" name="r"><pattern>${T('a')}</pattern><message><suggestion><match no="1" include_skipped="bogus"/></suggestion></message></rule></category></rules>`,
  ];
  bad.push(
    `<?xml version="1.0" encoding="UTF-8"?>\n<rules lang="en"><category id="C" name="c"><rule id="R" name="r"><pattern>${T('a')}</pattern><message>ref \\10 \\01 \\1a \\</message></rule></category></rules>`,
    `<?xml version="1.0" encoding="UTF-8"?>\n<rules lang="en"><category id="C" name="c"><rule id="R" name="r"><pattern>${T('a')}</pattern><message>trailing \\</message></rule></category></rules>`,
    `<?xml version="1.0" encoding="UTF-8"?>\n<rules lang="en"><category id="C" name="c"><rule id="R" name="r"><pattern>${T('a')}</pattern><message><suggestion>unclosed</message></rule></category></rules>`,
    `<?xml version="1.0" encoding="UTF-8"?>\n<rules lang="en"><category id="C" name="c"><rule id="R" name="r"><pattern>${T('a')}</pattern><message>m</message><url>not a url</url></rule></category></rules>`,
    `<?xml version="1.0" encoding="UTF-8"?>\n<rules lang="en"><category id="C" name="c"><rule id="R" name="r" type="uncovered"><pattern>${T('a')}</pattern><message>m</message></rule></category></rules>`,
    `<?xml version="1.0" encoding="UTF-8"?>\n<rules lang="en"><category id="C" name="c"><rule id="R" name="r" type="bogus"><pattern>${T('a')}</pattern><message>m</message></rule></category></rules>`,
  );
  write('inline-bad', 'rules with invalid match attributes / references / urls / types (load errors or runtime errors in createRuleMatch)',
    bad.map((xml) => ({ op: 'rule-match', args: { lang: 'en-US', xml, texts: ['a b', 'a'], jobs: [{ src: { rule: 0 }, texts: [0, 1] }] } })));
}
console.error('real rules total', totalRules);
console.error(JSON.stringify(stats));
