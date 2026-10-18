// Authors oracle/cases/X-DISAMB/*.json (inputs only). Ops disamb-run / disamb-examples / rule-match-disamb (DisambOps.java), format docs/review/F32-oracle.md.
// Rules and sentences are chosen from the Java harvest (disamb-harvest); expected values come only from the Java run.
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';
import { runHarness } from '../lib/harness-run.mjs';

const DIR = path.join(ROOT, 'oracle/cases/X-DISAMB');
rmSync(DIR, { recursive: true, force: true });
mkdirSync(DIR, { recursive: true });
const TESTS_JAR = 'oracle/java-src/languagetool-core/target/languagetool-core-6.9-SNAPSHOT-tests.jar';
const write = (name, description, ops, extra = {}) => writeFileSync(path.join(DIR, `${name}.json`), JSON.stringify({ kind: 'harness', clock: 'fixed', description, normalize: [], compare: 'jsonl', ...extra, ops }) + '\n');
const LANGS = [{ code: 'de-DE', c: 'de' }, { code: 'en-US', c: 'en' }, { code: 'fr', c: 'fr' }];
const XX = { code: 'xx', c: 'xx' };
const clean = (s) => s.replace(/[\n\t]+/g, '').replace(/<.*?>/g, '');
const pad = (n) => String(n).padStart(2, '0');
const chunks = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, (i + 1) * n));
const spread = (a, n, off = 0) => (a.length <= n ? a.slice() : Array.from({ length: n }, (_, i) => a[(Math.floor((i * a.length) / n) + off) % a.length]));

const harvest = async (L) => {
  const r = await runHarness({ extraCp: L.c === 'xx' ? [TESTS_JAR] : [], ops: [{ op: 'disamb-harvest', args: { lang: L.code } }] });
  const j = JSON.parse(r.responses.split('\n').filter(Boolean)[0]);
  if (!j.ok) throw new Error(JSON.stringify(j));
  return j.result;
};
const H = {};
for (const L of [...LANGS, XX]) H[L.c] = await harvest(L);
const corp = {};
for (const L of LANGS) {
  corp[L.c] = readFileSync(path.join(ROOT, `oracle/corpus/${L.c}/corpus.txt`), 'utf8').replace(/\s+/g, ' ').split(/(?<=[.!?”»])\s+/).filter((s) => s.length >= 25 && s.length <= 220);
}
const pool = {};
for (const L of LANGS) {
  const seen = new Set(corp[L.c]);
  const ex = [];
  for (const x of H[L.c].rules) for (const e of [...x[5], ...x[6]]) if (e.length >= 10 && e.length <= 300 && !seen.has(e)) { seen.add(e); ex.push(e); }
  pool[L.c] = ex;
}
const extra = (L) => (L.c === 'xx' ? { extraCp: [TESTS_JAR] } : {});
const glob = (L) => L.c !== 'xx';
const stats = {};

for (const L of [...LANGS, XX]) {
  const h = H[L.c];
  const dis = h.disamb;
  const amb = dis.flatMap((d) => d[4].map((e) => clean(e[0])));
  const unt = dis.flatMap((d) => d[5].map((e) => clean(e)));
  // ---- 1. whole XmlRuleDisambiguator, full dumps: all ambiguous examples + a spread of untouched examples + corpus ----
  const cs = corp[L.c] ?? [];
  const full = [...new Set([...amb, ...spread(unt, L.c === 'en' ? 300 : 120), ...cs, ...spread(pool[L.c] ?? [], L.c === 'xx' ? 0 : 150, 5)])].filter((s) => s.trim().length > 0);
  const per = 250;
  chunks(full, per).forEach((ch, i) => {
    write(`xml-${L.c}-${pad(i)}`, `${L.code} XmlRuleDisambiguator(lang, global=${glob(L)}) on raw tagger-only sentences (examples + corpus), full AnalyzedSentence dump`,
      [{ op: 'disamb-run', args: { lang: L.code, global: glob(L), texts: ch, jobs: [{ rule: null, texts: ch.map((_, k) => k) }] } }], extra(L));
  });
  stats[`xml-${L.c}`] = full.length;
  // ---- 1b. digest-only over a larger corpus spread ----
  if (cs.length) {
    const big = spread(pool[L.c], 2000, 11).filter((s) => !full.includes(s));
    chunks(big, 400).forEach((ch, i) => {
      write(`xmldg-${L.c}-${pad(i)}`, `${L.code} XmlRuleDisambiguator on ${ch.length} more corpus sentences, digest only (canonical dump hash, changed flag)`,
        [{ op: 'disamb-run', args: { lang: L.code, global: glob(L), texts: ch, jobs: [{ rule: null, digest: true, texts: ch.map((_, k) => k) }] } }], extra(L));
    });
    stats[`xmldg-${L.c}`] = big.length;
  }
  // ---- 2a. each rule alone on its own examples (+ one corpus sentence); dump only when the rule changed the sentence ----
  const rchunk = chunks(dis, 100);
  rchunk.forEach((ch, i) => {
    const texts = [];
    const idx = new Map();
    const tid = (s) => { if (!idx.has(s)) { idx.set(s, texts.length); texts.push(s); } return idx.get(s); };
    const jobs = ch.map((d, j) => {
      const own = [...d[4].map((e) => clean(e[0])), ...d[5].map((e) => clean(e))].filter((s) => s.trim().length > 0).slice(0, 5);
      const ids = own.map(tid);
      if (cs.length) ids.push(tid(cs[(d[0] * 13 + j) % cs.length]));
      return { rule: d[0], texts: [...new Set(ids)] };
    });
    write(`rule-${L.c}-${pad(i)}`, `${L.code} disambiguation rules ${ch[0][0]}..${ch[ch.length - 1][0]} applied alone (DisambiguationPatternRule#replace) to own examples + corpus`,
      [{ op: 'disamb-run', args: { lang: L.code, texts, jobs } }], extra(L));
  });
  // ---- 2b. DisambiguationRuleTest replay (cascade of preceding rules) ----
  const n = dis.length;
  for (let off = 0, i = 0; off < n; off += (L.c === 'en' ? 120 : 250), i++) {
    write(`ex-${L.c}-${pad(i)}`, `${L.code} DisambiguationRuleTest replay (examples/untouched examples with rule cascade) for rules ${off}..`,
      [{ op: 'disamb-examples', args: { lang: L.code, offset: off, limit: L.c === 'en' ? 120 : 250 } }], extra(L));
  }
}

// ---- 4. rule matching on DISAMBIGUATED sentences ----
const RM_PER_LANG = 500;
for (const L of LANGS) {
  const all = H[L.c].rules.filter((x) => !x[4].filter);
  const withAnti = all.filter((x) => x[4].anti > 0);
  const without = all.filter((x) => x[4].anti === 0);
  const sel = [...spread(withAnti, 240), ...spread(without, RM_PER_LANG - Math.min(240, withAnti.length), 3)].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cs = corp[L.c];
  stats[`rmd-${L.c}`] = `${sel.length} rules (${Math.min(240, withAnti.length)} with antipatterns of ${withAnti.length})`;
  chunks(sel, 50).forEach((ch, ci) => {
    const texts = [];
    const idx = new Map();
    const tid = (s) => { if (!idx.has(s)) { idx.set(s, texts.length); texts.push(s); } return idx.get(s); };
    const jobs = ch.map((x, j) => {
      const own = [...x[6].slice(0, 3), ...x[5].slice(0, 2)].filter((s) => s.length < 1500 && s.trim().length > 0);
      const ids = own.map(tid);
      for (let k = 0; k < 2; k++) ids.push(tid(cs[(ci * 50 + j * 3 + k * 11) % cs.length]));
      return { src: { file: x[0], rule: x[1] }, texts: [...new Set(ids)] };
    });
    write(`rmd-${L.c}-${pad(ci)}`, `${L.code} grammar rules on XML-disambiguated sentences: createRuleMatch hits, RuleWithMaxFilter, PatternRule#match (antipattern immunization re-run); ${ch.length} rules (${ch.filter((x) => x[4].anti > 0).length} with antipatterns)`,
      [{ op: 'rule-match-disamb', args: { lang: L.code, global: true, texts, jobs } }]);
  });
}


// ---- 3. inline disambiguation files: all actions, markers, wd, match gating, antipatterns, cascade, error paths ----
const TL = {
  en: { code: 'en-US', c: 'en', d: 'DT', n: 'NN.*', v: 'VB.*', j: 'JJ', p: 'IN', nTag: 'NN', vTag: 'VBZ', dTag: 'DT', rm: ['dogs', 'dog', 'NNS'], rm2: ['saw', 'see', 'VBD'], sg: 'NN|NN:U|NN:UN|NNP|DT', pl: 'NNS|NNPS|DT', lit: 'the', lem: 'dog',
    texts: ['The dogs run fast.', 'I saw her duck under the table.', 'They can fish in the big lake.', 'Time flies like an arrow.', 'He will run home and the green house is big.', 'A man, a plan, a canal.', 'She said that the old books are cheap.', 'Dogs and cats chase mice.', 'THE DOGS RUN', ''] },
  de: { code: 'de-DE', c: 'de', d: 'ART:.*', n: 'SUB:.*', v: 'VER:.*', j: 'ADJ:.*', p: 'PRP:.*', nTag: 'SUB:NOM:SIN:MAS', vTag: 'VER:3:SIN:PRÄ:NON', dTag: 'ART:DEF:NOM:SIN:MAS', rm: ['Katze', 'Katze', 'SUB:DAT:SIN:FEM'], rm2: ['sah', 'sehen', 'VER:1:SIN:PRT:NON'], sg: '.*:SIN:.*', pl: '.*:PLU:.*', lit: 'der', lem: 'Haus',
    texts: ['Der Mann geht schnell nach Hause.', 'Die Häuser sind groß und die Frau kann gehen.', 'Ich sah sie in der Stadt.', 'Das große Haus steht am Fluss.', 'Er will den Zug nehmen, aber der Zug ist weg.', 'Sie haben die Bücher gelesen.', 'Eine kleine Katze schläft auf dem Sofa.', 'DER MANN GEHT', ''] },
  fr: { code: 'fr', c: 'fr', d: 'D .*', n: 'N .*', v: 'V .*', j: 'J .*', p: 'P', nTag: 'N m s', vTag: 'V ind pres 3 s', dTag: 'D m s', rm: ['chat', 'chat', 'N m s'], rm2: ['enfants', 'enfant', 'N e p'], sg: '[DNJ] [mfe] (s|sp)', pl: '[DNJ] [mfe] (p|sp)', lit: 'le', lem: 'chat',
    texts: ['Le chat mange la souris.', 'Les enfants jouent dans le grand jardin.', 'Elle a vu un homme avec des amis.', 'Il faut que tu partes bientôt.', 'Les petites maisons sont belles.', 'Je ne sais pas où il va.', "La porte est ouverte et le vent entre.", 'LE CHAT MANGE', ''] },
};
const W = (lang, body) => `<?xml version="1.0" encoding="UTF-8"?>\n<rules lang="${lang}">\n${body}\n</rules>\n`;
const rule = (id, body, extra = '') => `<rule id="${id}" name="${id}">${body}${extra}</rule>`;
const tk = (re, extra = '') => `<token postag="${re}" postag_regexp="yes"${extra}/>`;
const mkActions = (T) => {
  const { d, n, v, j, nTag, vTag, dTag } = T;
  const D = tk(d), N = tk(n), V = tk(v), J = tk(j);
  const r = [];
  const add = (id, body, extra) => r.push(rule(id, body, extra));
  add('REPL_POS', `<pattern>${N}</pattern><disambig postag="${nTag}"/>`);
  add('REPL_POS_V', `<pattern>${V}</pattern><disambig postag="${vTag}"/>`);
  add('REPL_UNKNOWN_TAG', `<pattern>${N}</pattern><disambig postag="ZZZ"/>`);
  add('REPL_WD2', `<pattern>${D}${N}</pattern><disambig action="replace"><wd lemma="LEM" pos="${dTag}">XX</wd><wd pos="${nTag}"/></disambig>`);
  add('REPL_WD1', `<pattern>${N}</pattern><disambig action="replace"><wd lemma="L1" pos="${nTag}"/></disambig>`);
  add('REPL_WD_TEXT', `<pattern>${V}</pattern><disambig action="replace"><wd pos="${vTag}">newtext</wd></disambig>`);
  add('REPL_MARKER', `<pattern>${D}<marker>${N}</marker></pattern><disambig postag="${nTag}"/>`);
  add('REPL_MARKER_LAST', `<pattern>${N}<marker>${V}</marker></pattern><disambig postag="${vTag}"/>`);
  add('REPL_MARKER_WD2', `<pattern>${D}<marker>${N}${V}</marker></pattern><disambig action="replace"><wd pos="${nTag}"/><wd pos="${vTag}"/></disambig>`);
  add('REPL_MATCH', `<pattern>${D}<marker>${N}</marker></pattern><disambig><match no="2" postag="${n}" postag_regexp="yes"/></disambig>`);
  add('REPL_MATCH_LEMMA', `<pattern>${D}<marker>${N}</marker></pattern><disambig><match no="2" postag="${n}" postag_regexp="yes">lemma</match></disambig>`);
  add('REPL_MATCH_REPLACE', `<pattern>${D}<marker>${N}</marker></pattern><disambig><match no="2" postag="(.*)" postag_regexp="yes" postag_replace="${nTag}"/></disambig>`);
  add('REPL_MATCH_CC', `<pattern>${D}<marker>${N}</marker></pattern><disambig><match no="2" postag="${n}" postag_regexp="yes" case_conversion="allupper"/></disambig>`);
  add('REPL_MATCH_SETPOS', `<pattern>${D}<marker>${N}</marker></pattern><disambig><match no="2" postag="${n}" postag_regexp="yes" setpos="yes" suppress_mispelled="yes"/></disambig>`);
  add('REPL_MATCH_REGEXP', `<pattern>${D}<marker>${N}</marker></pattern><disambig><match no="2" regexp_match="(.)(.*)" regexp_replace="$2$1" postag="${n}" postag_regexp="yes"/></disambig>`);
  add('FILTER_POS', `<pattern>${V}</pattern><disambig action="filter" postag="${v}"/>`);
  add('FILTER_POS_N', `<pattern>${N}</pattern><disambig action="filter" postag="${n}"/>`);
  add('FILTER_NOREADING', `<pattern>${N}</pattern><disambig action="filter" postag="ZZZ"/>`);
  add('FILTER_MARKER', `<pattern>${D}<marker>${N}</marker></pattern><disambig action="filter" postag="${n}"/>`);
  add('FILTER_MATCH', `<pattern>${N}</pattern><disambig action="filter"><match no="1" postag="${n}" postag_regexp="yes"/></disambig>`);
  add('FILTER_MATCH_V', `<pattern>${V}</pattern><disambig action="filter"><match no="1" postag="${v}" postag_regexp="yes"/></disambig>`);
  add('FILTERALL3', `<pattern>${D}${N}${V}</pattern><disambig action="filterall"/>`);
  add('FILTERALL2', `<pattern>${D}${N}</pattern><disambig action="filterall"/>`);
  add('FILTERALL_MARKER', `<pattern>${D}<marker>${N}${V}</marker></pattern><disambig action="filterall"/>`);
  add('FILTERALL_MIN0', `<pattern>${D}${tk(j, ' min="0"')}${N}</pattern><disambig action="filterall"/>`);
  add('FILTERALL_NOPOS', `<pattern><token regexp="yes">.+</token>${N}</pattern><disambig action="filterall"/>`);
  add('FILTERALL_SKIP', `<pattern>${D}${tk(n, ' skip="2"')}${V}</pattern><disambig action="filterall"/>`);
  add('REMOVE_POS', `<pattern>${N}</pattern><disambig action="remove" postag="${v}"/>`);
  add('REMOVE_POS_NONE', `<pattern>${N}</pattern><disambig action="remove" postag="ZZZ"/>`);
  add('REMOVE_POS_ALL', `<pattern>${N}</pattern><disambig action="remove" postag=".*"/>`);
  add('REMOVE_WD', `<pattern><token>${T.rm[0]}</token></pattern><disambig action="remove"><wd lemma="${T.rm[1]}" pos="${T.rm[2]}">${T.rm[0]}</wd></disambig>`);
  add('REMOVE_WD_V', `<pattern><token>${T.rm2[0]}</token></pattern><disambig action="remove"><wd lemma="${T.rm2[1]}" pos="${T.rm2[2]}">${T.rm2[0]}</wd></disambig>`);
  add('REMOVE_WD_EMPTYTOKEN', `<pattern><token>${T.rm[0]}</token></pattern><disambig action="remove"><wd lemma="${T.rm[1]}" pos="${T.rm[2]}"/></disambig>`);
  add('REMOVE_WD_2', `<pattern>${D}${N}</pattern><disambig action="remove"><wd pos="${dTag}"/><wd pos="${nTag}"/></disambig>`);
  add('ADD_WD', `<pattern>${N}</pattern><disambig action="add"><wd lemma="ADDED" pos="XADD"/></disambig>`);
  add('ADD_NOLEMMA', `<pattern>${N}</pattern><disambig action="add"><wd pos="XADD2"/></disambig>`);
  add('ADD_TOKEN', `<pattern>${V}</pattern><disambig action="add"><wd lemma="L2" pos="XADD3">newtoken</wd></disambig>`);
  add('ADD_EXISTING', `<pattern><token>${T.rm[0]}</token></pattern><disambig action="add"><wd lemma="${T.rm[1]}" pos="${T.rm[2]}">${T.rm[0]}</wd></disambig>`);
  add('ADD_2', `<pattern>${D}${N}</pattern><disambig action="add"><wd lemma="A1" pos="XA1"/><wd lemma="A2" pos="XA2"/></disambig>`);
  add('ADD_MISMATCH', `<pattern>${N}</pattern><disambig action="add"><wd lemma="A1" pos="XA1"/><wd lemma="A2" pos="XA2"/></disambig>`);
  add('ADD_MARKER', `<pattern>${D}<marker>${N}</marker></pattern><disambig action="add"><wd lemma="AM" pos="XAM"/></disambig>`);
  add('ADDCHUNK', `<pattern>${N}</pattern><disambig action="addchunk"><wd pos="B-NP-singular"/></disambig>`);
  add('ADDCHUNK_2', `<pattern>${D}${N}</pattern><disambig action="addchunk"><wd pos="B-NP-plural"/><wd pos="E-NP-plural"/></disambig>`);
  add('ADDCHUNK_REPEAT', `<pattern>${N}</pattern><disambig action="addchunk"><wd pos="B-NP-singular"/></disambig>`);
  add('IMMUNIZE', `<pattern>${D}${N}</pattern><disambig action="immunize"/>`);
  add('IMMUNIZE_MARKER', `<pattern><marker>${D}</marker>${N}</pattern><disambig action="immunize"/>`);
  add('IMMUNIZE_MARKER_END', `<pattern>${D}<marker>${N}</marker></pattern><disambig action="immunize"/>`);
  add('IGNORE_SPELLING', `<pattern>${N}</pattern><disambig action="ignore_spelling"/>`);
  add('IGNORE_SPELLING_2', `<pattern>${D}<marker>${N}${V}</marker></pattern><disambig action="ignore_spelling"/>`);
  add('IGNORE_SPELLING_CAP', `<pattern><token regexp="yes">[A-ZÄÖÜ]{2,}</token></pattern><disambig action="ignore_spelling"/>`);
  const U = (feat) => `<unify>${feat}</unify>`;
  r.push(`<unification feature="num"><equivalence type="sg"><token postag="${T.sg}" postag_regexp="yes"/></equivalence><equivalence type="pl"><token postag="${T.pl}" postag_regexp="yes"/></equivalence></unification>`);
  add('UNIFY', `<pattern><unify><feature id="num"/>${D}${N}</unify></pattern><disambig action="unify"/>`);
  add('UNIFY_NEG', `<pattern><unify negate="yes"><feature id="num"/>${D}${N}</unify></pattern><disambig action="unify"/>`);
  add('UNIFY_IGNORE', `<pattern><unify><feature id="num"/>${D}<unify-ignore>${J}</unify-ignore>${N}</unify></pattern><disambig action="unify"/>`);
  add('UNIFY_MARKER', `<pattern><marker><unify><feature id="num"/>${D}${N}</unify></marker>${V}</pattern><disambig action="unify"/>`);
  add('UNIFY_SIG_TYPE', `<pattern><unify><feature id="num"><type id="sg"/></feature>${D}${N}</unify></pattern><disambig action="unify"/>`);
  add('UNIFY_3', `<pattern><unify><feature id="num"/>${D}${J}${N}</unify></pattern><disambig action="unify"/>`);
  add('LIT_REPLACE', `<pattern><token>${T.lit}</token></pattern><disambig postag="${dTag}"/>`);
  add('LIT_CI', `<pattern case_sensitive="yes"><token>${T.lit}</token></pattern><disambig postag="${dTag}"/>`);
  add('INFLECTED', `<pattern><token inflected="yes">${T.lem}</token></pattern><disambig action="ignore_spelling"/>`);
  add('REGEXP_TOKEN', `<pattern><token regexp="yes">[a-zäöü]{3,5}</token></pattern><disambig action="ignore_spelling"/>`);
  add('EXCEPTION_POS', `<pattern><token postag="${n}" postag_regexp="yes"><exception postag="${v}" postag_regexp="yes"/></token></pattern><disambig postag="${nTag}"/>`);
  add('EXCEPTION_SCOPE_NEXT', `<pattern>${D}<token postag="${n}" postag_regexp="yes"><exception scope="previous" postag="${j}" postag_regexp="yes"/></token></pattern><disambig action="ignore_spelling"/>`);
  add('NEGATE_POS', `<pattern><token postag="${n}" postag_regexp="yes" negate_pos="yes"/></pattern><disambig action="ignore_spelling"/>`);
  add('NEGATE_TOKEN', `<pattern>${D}<token negate="yes">${T.lit}</token></pattern><disambig action="ignore_spelling"/>`);
  add('SENT_START', `<pattern><token postag="SENT_START"/><marker>${D}</marker></pattern><disambig action="immunize"/>`);
  add('SENT_END', `<pattern>${N}<marker><token postag="SENT_END"/></marker></pattern><disambig action="ignore_spelling"/>`);
  add('SPACEBEFORE', `<pattern><token>,</token><token spacebefore="yes" regexp="yes">.+</token></pattern><disambig action="ignore_spelling"/>`);
  add('MIN0', `<pattern>${D}${tk(j, ' min="0"')}<marker>${N}</marker></pattern><disambig postag="${nTag}"/>`);
  add('MAX2', `<pattern>${D}${tk(j, ' min="0" max="2"')}<marker>${N}</marker></pattern><disambig action="ignore_spelling"/>`);
  add('SKIP_FIRST', `<pattern>${D}${tk(n, ' skip="3"')}<marker>${V}</marker></pattern><disambig postag="${vTag}"/>`);
  add('AND_GROUP', `<pattern><token><and>${tk(n)}<exception>${T.rm[0]}</exception></and></token></pattern><disambig action="ignore_spelling"/>`);
  add('OR_GROUP', `<pattern><token><or>${tk(d)}${tk(j)}</or></token>${N}</pattern><disambig action="ignore_spelling"/>`);
  add('IGNORE_ALL', `<pattern><token/></pattern><disambig action="ignore_spelling"/>`);
  return r;
};
const mkCascade = (T) => {
  const { d, n, v, j, nTag, vTag, dTag } = T;
  const D = tk(d), N = tk(n), V = tk(v), J = tk(j);
  const r = [];
  const add = (id, body, extra) => r.push(rule(id, body, extra));
  add('C1_ADD', `<pattern>${N}</pattern><disambig action="add"><wd lemma="CASC" pos="XCASC"/></disambig>`);
  add('C2_SEES_ADDED', `<pattern><token postag="XCASC"/></pattern><disambig action="remove" postag="${v}"/>`);
  add('C3_FILTER_AFTER', `<pattern>${D}<marker>${N}</marker></pattern><disambig action="filter" postag="XCASC|${n}"/>`);
  add('C4_CHUNK', `<pattern>${D}${N}</pattern><disambig action="addchunk"><wd pos="B-NP-singular"/><wd pos="I-NP-singular"/></disambig>`);
  add('C5_CHUNK_SEEN', `<pattern><token chunk="B-NP-singular"/><token chunk="I-NP-singular"/></pattern><disambig action="ignore_spelling"/>`);
  add('C6_CHUNK_RE', `<pattern><token chunk_re="[BI]-NP-singular"/></pattern><disambig action="add"><wd lemma="CH" pos="XCHUNK"/></disambig>`);
  add('C7_IMMUNE', `<pattern>${D}<marker>${N}</marker></pattern><disambig action="immunize"/>`);
  add('C8_AFTER_IMMUNE', `<pattern>${N}</pattern><disambig action="remove" postag="XCHUNK"/>`);
  add('C9_REPLACE', `<pattern>${V}</pattern><disambig postag="${vTag}"/>`);
  add('C10_AFTER_REPLACE', `<pattern><token postag="${vTag}"/></pattern><disambig action="add"><wd lemma="AFTER" pos="XAFTER"/></disambig>`);
  add('C11_REMOVE_ADDED', `<pattern><token postag="XAFTER"/></pattern><disambig action="remove"><wd lemma="AFTER" pos="XAFTER"/></disambig>`);
  return r;
};
const mkAnti = (T) => {
  const { d, n, v, j, nTag, p } = T;
  const D = tk(d), N = tk(n), V = tk(v), J = tk(j), P = tk(p);
  const base = (id, anti, rest = '') => rule(id, `${anti}<pattern>${J}${N}</pattern><disambig action="ignore_spelling"/>`, rest);
  const A = (x) => `<antipattern>${x}</antipattern>`;
  const r = [];
  r.push(base('AP_NONE', ''));
  r.push(base('AP_LEFT', A(J)));
  r.push(base('AP_RIGHT', A(N)));
  r.push(base('AP_SAME', A(J + N)));
  r.push(base('AP_PARTIAL_LEFT', A(D + J)));
  r.push(base('AP_PARTIAL_RIGHT', A(N + V)));
  r.push(base('AP_LONGER', A(D + J + N + V)));
  r.push(base('AP_TWO', A(P) + A(J)));
  r.push(base('AP_TWO_NOMATCH', A(P) + A('<token>zzzz</token>')));
  r.push(base('AP_SENT_START', A('<token postag="SENT_START"/>' + D)));
  r.push(base('AP_MARKER', A(`${D}<marker>${J}</marker>`)));
  r.push(base('AP_MARKER_RIGHT', A(`<marker>${N}</marker>${V}`)));
  r.push(base('AP_SKIP', A(`${D}${tk(j, ' skip="-1"')}${V}`)));
  r.push(base('AP_MIN0', A(`${tk(d, ' min="0"')}${J}`)));
  r.push(base('AP_REGEXP', A('<token regexp="yes">.*[aeiou].*</token>')));
  r.push(base('AP_UNIFY', A(`<unify><feature id="num"/>${J}${N}</unify>`)));
  r.push(`<unification feature="num"><equivalence type="sg"><token postag="${T.sg}" postag_regexp="yes"/></equivalence><equivalence type="pl"><token postag="${T.pl}" postag_regexp="yes"/></equivalence></unification>`);
  r.push(`<rulegroup id="GRP_SHARED" name="grp">${A(J)}<rule><pattern>${J}${N}</pattern><disambig action="ignore_spelling"/></rule><rule><pattern>${D}${J}</pattern><disambig action="ignore_spelling"/>${A(N)}</rule><rule><pattern>${N}${V}</pattern><disambig action="ignore_spelling"/></rule></rulegroup>`);
  r.push(`<rulegroup id="GRP_NOSHARE" name="grp2"><rule><pattern>${J}${N}</pattern><disambig action="ignore_spelling"/></rule><rule><pattern>${D}${J}</pattern><disambig action="ignore_spelling"/></rule></rulegroup>`);
  r.push(`<rulegroup id="GRP_OWN" name="grp3"><rule><pattern>${J}${N}</pattern><disambig action="ignore_spelling"/>${A(J)}</rule><rule><pattern>${J}${N}</pattern><disambig action="immunize"/></rule></rulegroup>`);
  r.push(rule('AP_IN_REPLACE', `${A(D + J)}<pattern>${D}<marker>${J}</marker>${N}</pattern><disambig postag="${nTag}"/>`));
  r.push(rule('AP_IN_FILTER', `${A(N)}<pattern>${J}${N}</pattern><disambig action="filter" postag="${n}"/>`));
  r.push(rule('AP_IN_ADD', `${A(N)}<pattern>${J}${N}</pattern><disambig action="add"><wd lemma="AP" pos="XAP"/><wd lemma="AP2" pos="XAP2"/></disambig>`));
  return r;
};
const inl = [];
for (const T of Object.values(TL)) {
  const sets = [['actions', mkActions(T)], ['cascade', mkCascade(T)], ['anti', mkAnti(T)]];
  for (const [nm, rs] of sets) {
    const lang = T.c;
    // rule bodies are single <rule>/<rulegroup>/<unification> elements; each-mode jobs reference rules by index in loaded order
    const xml = W(lang, rs.join('\n'));
    const loadedCount = rs.filter((x) => !x.startsWith('<unification')).reduce((a, x) => a + (x.startsWith('<rulegroup') ? (x.match(/<rule>/g) ?? []).length : 1), 0);
    const jobs = [{ rule: null, texts: T.texts.map((_, i) => i) }];
    for (let i = 0; i < loadedCount; i++) jobs.push({ rule: i, texts: T.texts.map((_, k) => k) });
    inl.push({ name: `inline-${nm}-${T.c}`, T, xml, jobs, desc: `${nm} rules (${loadedCount} loaded rules): XmlRuleDisambiguator(inline) on ${T.texts.length} sentences + each rule alone` });
  }
}
for (const x of inl) {
  write(x.name, `${x.T.code} ${x.desc}`, [{ op: 'disamb-run', args: { lang: x.T.code, global: false, xml: x.xml, texts: x.T.texts, jobs: x.jobs } }]);
}
// disamb-examples with inline examples (cascade/untouched/ambiguous replay incl. error paths)
const exXml = (T) => W(T.c, [
  rule('EX_OK', `<pattern>${tk(T.d)}<marker>${tk(T.n)}</marker></pattern><disambig postag="${T.nTag}"/>`,
    `<example type="ambiguous" inputform="${T.rm[0]}[${T.rm[1]}/${T.rm[2]}]" outputform="${T.rm[0]}[${T.rm[1]}/${T.nTag}]">${T.texts[0].split(' ')[0]} <marker>${T.texts[0].split(' ')[1]}</marker> x</example><example type="untouched">${T.texts[1]}</example><example type="ambiguous" inputform="a[a]" outputform="b[b]">${T.texts[0]}</example><example type="ambiguous" inputform="a[a]" outputform="b[b]"><marker>${T.texts[0].split(' ')[0]}</marker> ${T.texts[0].split(' ').slice(1).join(' ')}</example><example type="untouched"> </example>`),
  rule('EX_ADD', `<pattern>${tk(T.n)}</pattern><disambig action="add"><wd lemma="ADDED" pos="XADD"/></disambig>`,
    `<example type="untouched">${T.texts[2]}</example><example type="ambiguous" inputform="${T.texts[0].split(' ')[1]}[x]" outputform="${T.texts[0].split(' ')[1]}[y]">${T.texts[0].split(' ')[0]} <marker>${T.texts[0].split(' ')[1]}</marker></example>`),
  rule('EX_IMM', `<pattern>${tk(T.d)}${tk(T.n)}</pattern><disambig action="immunize"/>`, `<example type="untouched">${T.texts[0]}</example><example type="untouched">Zz.</example>`),
  rule('EX_BAD_FORM', `<pattern>${tk(T.n)}</pattern><disambig postag="${T.nTag}"/>`, `<example type="ambiguous" inputform="" outputform="x"><marker>${T.texts[2].split(' ')[0]}</marker></example><example type="ambiguous" inputform="[" outputform="]"><marker>${T.texts[2].split(' ')[0]}</marker></example>`),
].join('\n'));
for (const T of Object.values(TL)) {
  write(`inline-examples-${T.c}`, `${T.code} disamb-examples replay on inline rules (marker handling, input/output forms, untouched, bad forms)`, [{ op: 'disamb-examples', args: { lang: T.code, xml: exXml(T), offset: 0, limit: 10 } }]);
}
// xx (Demo language, test jar): file rules, filter class, antipatterns, unify, plus extra sentences
const xxTexts = ['10 dollars', 'X9 dollars', 'X8 dollars', 'X10 dollars', 'So, but this is test no1 for sure', 'This is test no1', 'That is test no2', 'That is test no3', 'That is test no4', 'This is test no5 foobar', 'But this is test no6', 'so xa yb', 'so xb ya', 'so xa ya', 'so xb yb', 'xa xb ya yb', '', '123 X77 abc', 'this is test no6'];
write('xml-xx-extra', 'xx (Demo language) XmlRuleDisambiguator(xx) on extra sentences', [{ op: 'disamb-run', args: { lang: 'xx', global: false, texts: xxTexts, jobs: [{ rule: null, texts: xxTexts.map((_, i) => i) }, ...H.xx.disamb.map((d) => ({ rule: d[0], texts: xxTexts.map((_, i) => i) }))] } }], { extraCp: [TESTS_JAR] });
const xxXml = W('xx', [
  rule('XX_FILTER_ARGS', `<pattern><token regexp="yes">X\\d+</token></pattern><filter class="org.languagetool.tagging.disambiguation.rules.xx.DemoDisambiguationFilter" args="a:b"/><disambig action="ignore_spelling"/>`),
  rule('XX_FILTER_FILTER', `<pattern><token regexp="yes">X\\d+</token></pattern><filter class="org.languagetool.tagging.disambiguation.rules.xx.DemoDisambiguationFilter" args="a:\\1"/><disambig action="add"><wd lemma="F" pos="XF"/></disambig>`),
  rule('XX_FILTER_MARKER', `<pattern><token>dollars</token><marker><token regexp="yes">.+</token></marker></pattern><filter class="org.languagetool.tagging.disambiguation.rules.xx.DemoDisambiguationFilter" args="a:b"/><disambig action="immunize"/>`),
  rule('XX_ADDCHUNK', `<pattern><token regexp="yes">\\d+</token></pattern><disambig action="addchunk"><wd pos="B-X"/></disambig>`),
].join('\n'));
write('inline-xx', 'xx (Demo language) inline rules with the Demo disambiguation filter, chunk and add actions', [{ op: 'disamb-run', args: { lang: 'xx', global: false, xml: xxXml, texts: xxTexts, jobs: [{ rule: null, texts: xxTexts.map((_, i) => i) }, ...[0, 1, 2, 3].map((i) => ({ rule: i, texts: xxTexts.map((_, k) => k) }))] } }], { extraCp: [TESTS_JAR] });
write('ex-xx-inline', 'xx disamb-examples on file rules', [{ op: 'disamb-examples', args: { lang: 'xx', offset: 0, limit: 100 } }], { extraCp: [TESTS_JAR] });

// ---- 4b. inline rule matching on disambiguated sentences (chunk, immunize, antipattern re-run with disambiguated tags) ----
for (const T of Object.values(TL)) {
  const { d, n, v, j, nTag, vTag, dTag } = T;
  const dx = W(T.c, [
    rule('D_CHUNK', `<pattern>${tk(d)}${tk(n)}</pattern><disambig action="addchunk"><wd pos="B-NP-singular"/><wd pos="I-NP-singular"/></disambig>`),
    rule('D_IMM', `<pattern>${tk(j)}${tk(n)}</pattern><disambig action="immunize"/>`),
    rule('D_ADD', `<pattern>${tk(v)}</pattern><disambig action="add"><wd lemma="ADDV" pos="XV"/></disambig>`),
    rule('D_FILT', `<pattern>${tk(n)}</pattern><disambig action="filter" postag="${n}"/>`),
    rule('D_SPELL', `<pattern>${tk(d)}<marker>${tk(n)}</marker></pattern><disambig action="ignore_spelling"/>`),
  ].join('\n'));
  const g = (id, pat, msg = 'm') => `<rule id="${id}" name="${id}"><pattern>${pat}</pattern><message>${msg} <suggestion>\\1</suggestion></message><example correct="a">a</example></rule>`;
  const gx = W(T.c, `<category id="CAT" name="Cat">\n${[
    g('G_CHUNK', '<token chunk="B-NP-singular"/><token chunk="I-NP-singular"/>'),
    g('G_CHUNK_RE', '<token chunk_re="[BI]-NP-singular"/>'),
    g('G_XV', '<token postag="XV"/>'),
    g('G_IMM', `${tk(j)}${tk(n)}`),
    g('G_IMM_MARKER', `<marker>${tk(j)}</marker>${tk(n)}`),
    g('G_NOCHUNK', `${tk(d)}${tk(n)}`),
    `<rule id="G_ANTI1" name="a"><antipattern>${tk(j)}${tk(n)}</antipattern><pattern>${tk(n)}</pattern><message>m</message><example correct="a">a</example></rule>`,
    `<rule id="G_ANTI2" name="a"><antipattern><token chunk="B-NP-singular"/></antipattern><pattern>${tk(d)}${tk(n)}</pattern><message>m</message><example correct="a">a</example></rule>`,
    `<rule id="G_ANTI3" name="a"><antipattern>${tk(d)}${tk(j)}</antipattern><pattern>${tk(j)}${tk(n)}</pattern><message>m</message><example correct="a">a</example></rule>`,
    `<rule id="G_RAWPOS" name="a"><pattern>${tk(n)}</pattern><message>m</message><example correct="a">a</example></rule>`,
    g('G_SPELL', `<marker>${tk(n)}</marker>`),
  ].join('\n')}\n</category>`);
  const jobs = Array.from({ length: 11 }, (_, i) => ({ src: { rule: i }, texts: T.texts.map((_, k) => k) }));
  write(`rmd-inline-${T.c}`, `${T.code} inline disambiguation (chunk/immunize/add/filter/ignore_spelling) then inline grammar rules (chunk tokens, antipatterns on disambiguated sentences)`,
    [{ op: 'rule-match-disamb', args: { lang: T.code, global: false, dxml: dx, xml: gx, texts: T.texts, jobs } }]);
}


// ---- error paths and synthetic sentences ----
{
  const T = TL.en;
  const okXml = W('en', rule('R1', `<pattern>${tk('NN.*')}</pattern><disambig postag="NN"/>`) + rule('R2', `<pattern>${tk('DT')}</pattern><disambig action="ignore_spelling"/>`));
  const one = { rule: null, texts: [0] };
  const tx = ['The dogs run.'];
  const req = (args) => ({ op: 'disamb-run', args: { lang: 'en-US', texts: tx, jobs: [one], ...args } });
  write('inline-errors', 'error paths: malformed/invalid inline XML, wd count mismatch, unknown filter class, bad rule index, unknown language, empty jobs/texts, disamb-examples ranges',
    [
      req({ xml: '<rules lang="en"><rule id="A"><pattern><token>x</token></pattern><disambig postag="NN"/>' }),
      req({ xml: W('en', rule('A', `<pattern><token>x</token><token>y</token></pattern><disambig action="replace"><wd pos="NN"/></disambig>`)) }),
      req({ xml: W('en', rule('A', `<pattern><token>x</token></pattern><filter class="no.such.Filter" args="a:b"/><disambig postag="NN"/>`)) }),
      req({ xml: W('en', rule('A', `<pattern><token>x</token><token>y</token></pattern><disambig action="filter" postag="NN"/>`)) }),
      req({ xml: W('en', rule('A', `<pattern><token>x</token></pattern><disambig action="bogus"/>`)) }),
      req({ xml: W('en', rule('A', `<pattern><token>x</token></pattern><disambig action="unify"/>`)) }),
      req({ xml: okXml, jobs: [{ rule: 5, texts: [0] }, { rule: -1, texts: [0] }, { rule: 1, texts: [0] }] }),
      req({ xml: okXml, texts: [], jobs: [] }),
      req({ xml: okXml, texts: ['', ' ', '\n', ' '], jobs: [{ rule: null, texts: [0, 1, 2, 3] }, { rule: 0, texts: [0, 1, 2, 3] }] }),
      req({ lang: 'zz-ZZ' }),
      req({ lang: 'en' }),
      req({ xml: '' }),
      { op: 'disamb-examples', args: { lang: 'en-US', xml: okXml, offset: 0, limit: 0 } },
      { op: 'disamb-examples', args: { lang: 'en-US', xml: okXml, offset: 5, limit: 3 } },
      { op: 'disamb-examples', args: { lang: 'en-US', xml: okXml, offset: -1, limit: 3 } },
      { op: 'disamb-examples', args: { lang: 'en-US', xml: '<rules lang="en"/>', offset: 0, limit: 3 } },
    ]);
  const syn = (...ts) => ({ syn: ts.map((t) => ({ readings: t[1], ws: t[2] === true, tok: t[0] })).map((t) => ({ readings: t.readings, ws: t.ws })) });
  const sentStart = ['', [['', null, 'SENT_START']]];
  const texts = [
    syn(sentStart, ['The', [['The', 'the', 'DT']]], ['dogs', [['dogs', 'dog', 'NNS'], ['dogs', 'dog', 'VBZ']], true], ['run', [['run', 'run', 'VB'], ['run', 'run', 'NN']], true], ['.', [['.', '.', null], ['.', '.', 'SENT_END']]]),
    syn(sentStart, ['x', [['x', null, null]]], ['y', [['y', null, null]], true]),
    syn(sentStart, ['dogs', [['dogs', 'dog', 'NNS']]]),
    syn(['dogs', [['dogs', 'dog', 'NNS'], ['dogs', 'dog', 'VBZ']]]),
    syn(),
    syn(sentStart),
  ];
  const nrules = mkActions(TL.en).filter((x) => !x.startsWith('<unification')).length;
  write('inline-syn', 'en inline action rules on synthetic token arrays (no SENT_START, null tags, single token, empty sentence)',
    [{ op: 'disamb-run', args: { lang: 'en-US', global: false, xml: W('en', mkActions(TL.en).join('\n')), texts, jobs: [{ rule: null, texts: texts.map((_, i) => i) }, ...Array.from({ length: nrules }, (_, i) => ({ rule: i, texts: texts.map((_, k) => k) }))] } }]);
  write('rmd-syn', 'rule-match-disamb on synthetic token arrays', [{ op: 'rule-match-disamb', args: { lang: 'en-US', global: false, dxml: okXml, xml: W('en', `<category id="C" name="c">${rule('G1', `<pattern>${tk('NN.*')}</pattern><message>m</message><example correct="a">a</example>`)}</category>`), texts, jobs: [{ src: { rule: 0 }, texts: texts.map((_, i) => i) }] } }]);
}

console.error(JSON.stringify(stats), readdirSync(DIR).length);
