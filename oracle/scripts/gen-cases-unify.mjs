// Authors oracle/cases/X-UNIFY/*.json (inputs only). Ops unify-match / unify-config / unify-seq (UnifyOps.java), format docs/review/F28-oracle.md.
// Rules, sentences and scripts are chosen from the Java harvest; every expected value comes only from the Java run.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';
import { runHarness } from '../lib/harness-run.mjs';

const DIR = path.join(ROOT, 'oracle/cases/X-UNIFY');
rmSync(DIR, { recursive: true, force: true });
mkdirSync(DIR, { recursive: true });
const write = (name, description, ops) => writeFileSync(path.join(DIR, `${name}.json`), JSON.stringify({ kind: 'harness', clock: 'fixed', description, normalize: [], compare: 'jsonl', ops }) + '\n');
let seed = 20281017;
const rnd = () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const chance = (p) => rnd() < p;
const LANGS = [{ code: 'de-DE', c: 'de' }, { code: 'en-US', c: 'en' }, { code: 'fr', c: 'fr' }];
const call = async (ops) => {
  const r = await runHarness({ ops });
  return r.responses.split('\n').filter(Boolean).map((l) => { const j = JSON.parse(l); if (!j.ok) throw new Error(JSON.stringify(j.error).slice(0, 400)); return j.result; });
};
const uniq = (a) => [...new Set(a)];
const chunks = (a, n) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };
const pad = (i) => String(i).padStart(2, '0');

// ---- harvest ----
const harv = await call(LANGS.map((L) => ({ op: 'unify-harvest', args: { lang: L.code } })));
const info = {};
for (let li = 0; li < LANGS.length; li++) {
  const L = LANGS[li];
  const corpus = readFileSync(path.join(ROOT, `oracle/corpus/${L.c}/corpus.txt`), 'utf8').replace(/\s+/g, ' ').split(/(?<=[.!?”»])\s+/).filter((s) => s.length >= 20 && s.length <= 220);
  const cs = Array.from({ length: 100 }, (_, i) => corpus[Math.floor((i * corpus.length) / 100)]);
  const h = harv[li];
  const ex = uniq([...h.grammar.flatMap((x) => [...x[5], ...x[6]]), ...h.anti.flatMap((x) => [...x[6], ...x[7]]), ...h.disamb.flatMap((x) => [...x[4], ...x[5]])]).filter((s) => s.length > 0 && s.length < 400);
  info[L.c] = { h, cs, ex };
}

// ---- part 1: real unify rules ----
function realCase(L, name, desc, preload, items, srcOf, ownOf, nCorpus, nCross) {
  const { cs, ex } = info[L.c];
  const texts = [];
  const idx = new Map();
  const tid = (s) => { if (!idx.has(s)) { idx.set(s, texts.length); texts.push(s); } return idx.get(s); };
  const jobs = items.map((x, j) => {
    const ids = ownOf(x).filter((s) => s.length > 0 && s.length < 1500).map(tid);
    for (let k = 0; k < nCorpus; k++) ids.push(tid(cs[(j * 3 + k * 7) % cs.length]));
    for (let k = 0; k < nCross && ex.length; k++) ids.push(tid(ex[(j * 11 + k * 13) % ex.length]));
    return { src: srcOf(x), texts: uniq(ids) };
  });
  write(name, desc, [{ op: 'unify-match', args: { lang: L.code, preload, texts, jobs } }]);
}
for (let li = 0; li < LANGS.length; li++) {
  const L = LANGS[li];
  const h = info[L.c].h;
  chunks(h.grammar, 30).forEach((ch, i) => realCase(L, `real-${L.c}-grammar-${pad(i)}`, `raw sequence hits + unified tokens of ${ch.length} real ${L.code} grammar rules with <unify> (all of them), own examples + corpus; grammar unifier`, 'grammar', ch, (x) => ({ file: x[0], rule: x[1] }), (x) => [...x[5], ...x[6]], 50, 15));
  chunks(h.anti, 100).forEach((ch, i) => realCase(L, `real-${L.c}-anti-${pad(i)}`, `raw hits + unified tokens of ${ch.length} real ${L.code} antipatterns (DisambiguationPatternRule) with <unify>, disambiguation unifier of the default variant (needs disambiguation.xml loader)`, 'disamb', ch, (x) => ({ file: x[0], rule: x[1], anti: x[2] }), (x) => [...x[6], ...x[7]], 50, 15));
  if (h.disamb.length) realCase(L, `real-${L.c}-disamb`, `raw hits + unified tokens of all ${h.disamb.length} real ${L.code} disambiguation rules with <unify> on own examples + corpus (disambiguation unifier; needs disambiguation.xml loader)`, 'disamb', h.disamb, (x) => ({ disamb: x[0] }), (x) => [...x[4], ...x[5]], 80, 20);
}

// ---- part 2: unifier configuration ----
for (const L of LANGS) {
  write(`config-${L.c}`, `UnifierConfiguration of ${L.code} after loading all grammar rule files (features/types in Java map order); then with disambiguation.xml`, [
    { op: 'unify-config', args: { lang: L.code } },
    { op: 'unify-config', args: { lang: L.code, disamb: true } },
  ]);
}
const unifXml = (body, rules = '') => `<?xml version="1.0" encoding="UTF-8"?>\n<rules lang="en">\n${body}\n<category id="CAT" name="Category">\n${rules}</category>\n</rules>\n`;
const rule = (id, pat) => `<rule id="${id}" name="${id}"><pattern>${pat}</pattern><message>Msg</message></rule>\n`;
{
  const ops = [];
  const add = (xml) => ops.push({ op: 'unify-config', args: { lang: 'en-US', xml } });
  add(unifXml('<unification feature="cfA"><equivalence type="a"><token postag="NN"/></equivalence><equivalence type="b"><token postag="NNS"/></equivalence></unification>'));
  add(unifXml('<unification feature="cfA"><equivalence type="a"><token postag="XX"/></equivalence><equivalence type="c"><token>c</token></equivalence></unification>')); // duplicate type: first wins, new type appended
  add(unifXml('<unification feature="cfB"><equivalence type="x"><token postag="N.*" postag_regexp="yes"/></equivalence></unification><unification feature="cfC"><equivalence type="x"><token regexp="yes">a|b</token></equivalence><equivalence type="y"><token negate="yes">a</token></equivalence></unification>'));
  add(unifXml('<unification feature="cfD"/>'));
  add(unifXml('<unification feature="cfE"><equivalence type="e"/></unification>'));
  add(unifXml('<unification feature="cfF"><equivalence type="1"><token inflected="yes">go</token></equivalence><equivalence type="2"><token postag="V.*" postag_regexp="yes" postag_negation="yes"/></equivalence></unification>'));
  add(unifXml('<unification feature="cfÄÖ"><equivalence type="grün"><token>Übung</token></equivalence><equivalence type="a b"><token>x y</token></equivalence></unification>'));
  add(unifXml('<unification feature=""><equivalence type=""><token>q</token></equivalence></unification>'));
  add(unifXml('<unification><equivalence type="nofeat"><token>q</token></equivalence></unification>'));
  add(unifXml('<unification feature="cfG"><equivalence><token>q</token></equivalence></unification>'));
  add(unifXml('<unification feature="cfH"><equivalence type="a"><token>a</token><token>b</token></equivalence></unification>'));
  add(unifXml('<unification feature="cfI"><equivalence type="a"><token>a</token></equivalence></unification><unification feature="cfI"><equivalence type="b"><token>b</token></equivalence></unification>'));
  add(unifXml('<unification feature="cfJ"><equivalence type="a"><token postag="NN"><exception>x</exception></token></equivalence></unification>'));
  // many features/types: ConcurrentHashMap iteration order
  const many = Array.from({ length: 14 }, (_, i) => `<unification feature="mf${(i * 7) % 14}${'abcdefghijklmn'[i]}">${Array.from({ length: 1 + (i % 5) }, (_, j) => `<equivalence type="t${(j * 5) % 7}"><token postag="P${i}${j}"/></equivalence>`).join('')}</unification>`).join('\n');
  add(unifXml(many));
  // unify inside a rule file with features after tokens, unknown feature names, no tokens
  add(unifXml('<unification feature="cfK"><equivalence type="a"><token postag="NN"/></equivalence></unification>', rule('R1', '<unify><feature id="cfK"/><token postag="NN"/><token>x</token></unify>') + rule('R2', '<unify negate="yes"><feature id="cfK"><type id="a"/><type id="zz"/></feature><token postag="NN"/></unify>') + rule('R3', '<unify><token postag="NN"/><feature id="cfK"/></unify>')));
  add(unifXml('', rule('R4', '<unify><feature id="cfNone"/><token>a</token><token>b</token></unify>')));
  add(unifXml('', rule('R5', '<unify><feature id="cfL"/></unify>')));
  add(unifXml('', rule('R6', '<unify-ignore><token>a</token></unify-ignore><token>b</token>')));
  add(unifXml('', rule('R7', '<feature id="cfM"/><token>b</token>')));
  add(unifXml('', rule('R8', '<unify negate="maybe"><feature id="cfM"/><token>b</token></unify>')));
  add(unifXml('', rule('R9', '<unify><unify><feature id="cfM"/><token>b</token></unify></unify>')));
  add(unifXml('<unification feature="cfN"><equivalence type="a"><token postag="NN"/></equivalence></unification>', rule('R10', '<marker><unify><feature id="cfN"/><token postag="NN"/><token postag="NN"/></unify></marker>') + rule('R11', '<unify><feature id="cfN"/><marker><token postag="NN"/></marker><token postag="NN"/></unify>')));
  write('config-inline', 'UnifierConfiguration built from inline <unification> blocks (duplicates, empty, umlauts, ordering of many features) and loading of <unify>/<feature>/<type> rules, including load errors', ops);
}

// ---- part 3: direct Unifier sequences ----
const cfgs = await call(LANGS.map((L) => ({ op: 'unify-config', args: { lang: L.code, disamb: true } })));
const SEQ = [['de', 'disamb'], ['en', 'disamb'], ['fr', 'grammar'], ['fr', 'disamb'], ['de', 'grammar'], ['en', 'grammar']];
const tokInfo = {};
for (const L of LANGS) {
  const { cs, ex } = info[L.c];
  const texts = uniq([...ex.filter((s) => s.length < 200).slice(0, 70), ...cs.slice(0, 40)]).slice(0, 100);
  for (const which of ['grammar', 'disamb']) {
    const toks = (await call([{ op: 'unify-tokens', args: { lang: L.code, texts, disamb: which === 'disamb' } }]))[0];
    tokInfo[`${L.c}-${which}`] = { texts, toks };
  }
}
const SEQ_PER = 400;
function genSeq(L, which, n, hash) {
  const lc = L.c;
  const cfg = cfgs[LANGS.indexOf(L)][which];
  const feats = cfg.features; // [[f,[types]]]
  const realBlocks = info[lc].h[which === 'grammar' ? 'grammar' : 'disamb'].flatMap((x) => x[which === 'grammar' ? 4 : 3].feats);
  const antiBlocks = which === 'disamb' ? info[lc].h.anti.flatMap((x) => x[5].feats) : [];
  const { texts, toks } = tokInfo[`${lc}-${which}`];
  const featOf = () => {
    const r = rnd();
    if (r < 0.40 && (realBlocks.length || antiBlocks.length)) return JSON.parse(JSON.stringify(pick(chance(0.3) && antiBlocks.length ? antiBlocks : realBlocks.length ? realBlocks : antiBlocks)));
    if (r < 0.80 && feats.length) {
      const k = 1 + Math.floor(rnd() * Math.min(3, feats.length));
      const fs = [];
      for (let i = 0; i < k; i++) {
        const f = pick(feats);
        if (fs.some((x) => x[0] === f[0])) continue;
        const q = rnd();
        fs.push([f[0], q < 0.6 ? [] : q < 0.9 ? f[1].filter(() => chance(0.5)) : [...f[1].slice(0, 1), 'zzz']]);
      }
      return fs;
    }
    if (r < 0.82) return [['zzz', []]];
    if (r < 0.90 && feats.length) return [[pick(feats)[0], ['zzz']]];
    if (r < 0.94) return [];
    if (r < 0.97) return null;
    return feats.length ? [[pick(feats)[0], []], ['zzz', []]] : [['zzz', []]];
  };
  // candidate windows: tokens with equivalences
  const cands = [];
  toks.forEach((tk, t) => { if (!tk) return; tk.forEach((x, k) => { if (x[1].some((r) => r[2].length)) cands.push([t, k]); }); });
  const window = () => {
    let t; let k0;
    if (cands.length && chance(0.75)) { [t, k0] = pick(cands); } else { do { t = Math.floor(rnd() * toks.length); } while (!toks[t]); k0 = Math.floor(rnd() * toks[t].length); }
    const len = 1 + Math.floor(rnd() * 6);
    const ks = [];
    for (let k = k0; k < toks[t].length && ks.length < len; k++) ks.push(k);
    return { t, ks };
  };
  const readingsOf = (t, k) => {
    const rs = toks[t][k][1];
    let sel = rs.map((_, i) => i).filter((i) => rs[i][2].length > 0 ? chance(0.9) : chance(0.2));
    if (sel.length === 0) sel = chance(0.5) ? [0] : rs.map((_, i) => i);
    return sel;
  };
  const scripts = [];
  for (let s = 0; s < n; s++) {
    const f = featOf();
    const w = window();
    const st = [];
    const tk = (k) => ({ t: w.t, k });
    const p = rnd();
    if (p < 0.35) { // canonical isUnified driver
      for (const k of w.ks) {
        const rs = readingsOf(w.t, k);
        rs.forEach((r, i) => {
          const step = { o: 'isUnified', ...tk(k), r, f, last: i === rs.length - 1 };
          if (chance(0.25)) step.m = chance(0.8);
          st.push(step);
        });
      }
      st.push({ o: 'getFinalUnified' }, { o: 'getUnifiedTokens' }, { o: 'getFinalUnificationValue', f });
      if (chance(0.4)) st.push({ o: 'getFinalUnified' });
      if (chance(0.5)) st.push({ o: 'reset' }, { o: 'getFinalUnified' }, { o: 'getUnifiedTokens' });
    } else if (p < 0.60) { // low level
      w.ks.forEach((k, ki) => {
        for (const r of readingsOf(w.t, k)) st.push({ o: 'isSatisfied', ...tk(k), r, f });
        st.push({ o: 'startNextToken' });
        if (ki === 0 && chance(0.85)) st.push({ o: 'startUnify' });
      });
      st.push({ o: 'getFinalUnificationValue', f }, { o: 'getUnifiedTokens' });
      if (chance(0.3)) st.push({ o: 'getFinalUnified' });
    } else if (p < 0.75) { // canonical with neutral elements
      const neutralAt = new Set(w.ks.filter(() => chance(0.3)));
      if (chance(0.3)) neutralAt.add(-1);
      if (neutralAt.has(-1)) st.push({ o: 'addNeutralElement', t: w.t, k: Math.max(0, w.ks[0] - 1) });
      for (const k of w.ks) {
        if (neutralAt.has(k)) { st.push({ o: 'addNeutralElement', ...tk(k) }); continue; }
        const rs = readingsOf(w.t, k);
        rs.forEach((r, i) => st.push({ o: 'isUnified', ...tk(k), r, f, last: i === rs.length - 1 }));
      }
      st.push({ o: 'getFinalUnified' }, { o: 'getUnifiedTokens' }, { o: 'getFinalUnificationValue', f });
    } else if (p < 0.85) { // random misuse sequence
      const nn = 3 + Math.floor(rnd() * 10);
      for (let i = 0; i < nn; i++) {
        const k = pick(w.ks);
        const r = Math.floor(rnd() * toks[w.t][k][1].length);
        st.push(pick([
          { o: 'isUnified', ...tk(k), r, f, last: chance(0.5) }, { o: 'isUnified', ...tk(k), r, f, last: chance(0.5), m: chance(0.7) }, { o: 'isSatisfied', ...tk(k), r, f },
          { o: 'startNextToken' }, { o: 'startUnify' }, { o: 'reset' }, { o: 'getFinalUnificationValue', f }, { o: 'getUnifiedTokens' }, { o: 'getFinalUnified' }, { o: 'addNeutralElement', ...tk(k) },
        ]));
      }
    } else if (p < 0.92) { // fresh unifier probes
      const probes = [[{ o: 'getUnifiedTokens' }], [{ o: 'getFinalUnified' }], [{ o: 'getFinalUnificationValue', f }], [{ o: 'reset' }, { o: 'getUnifiedTokens' }], [{ o: 'startUnify' }, { o: 'getFinalUnificationValue', f }],
        [{ o: 'startNextToken' }, { o: 'getUnifiedTokens' }], [{ o: 'isSatisfied', ...tk(w.ks[0]), r: 0, f: null }], [{ o: 'isUnified', ...tk(w.ks[0]), r: 0, f: null, last: true }]];
      st.push(...pick(probes));
    } else { // neutral only / neutral first
      st.push({ o: 'addNeutralElement', ...tk(w.ks[0]) });
      if (chance(0.5)) st.push({ o: 'addNeutralElement', ...tk(w.ks[Math.min(1, w.ks.length - 1)]) });
      for (const k of w.ks.slice(1)) {
        const rs = readingsOf(w.t, k);
        rs.forEach((r, i) => st.push({ o: 'isUnified', ...tk(k), r, f, last: i === rs.length - 1 }));
      }
      st.push({ o: 'getFinalUnified' }, { o: 'getUnifiedTokens' }, { o: 'getFinalUnificationValue', f });
    }
    scripts.push(st);
  }
  return { texts, scripts };
}
for (const [lc, which] of SEQ) {
  const L = LANGS.find((x) => x.c === lc);
  const total = which === 'grammar' && lc !== 'fr' ? 60 : SEQ_PER * 2;
  const hashCount = which === 'grammar' && lc !== 'fr' ? 0 : SEQ_PER;
  const g = genSeq(L, which, total - hashCount, false);
  write(`seq-${lc}-${which}`, `direct Unifier call sequences (isUnified/isSatisfied/startNextToken/startUnify/getFinalUnificationValue/getUnifiedTokens/getFinalUnified/addNeutralElement/reset) on real tagged ${L.code} tokens, ${which} unifier, feature maps in insertion order`, [{ op: 'unify-seq', args: { lang: L.code, which, preload: which === 'grammar' ? 'grammar' : 'disamb', hash: false, texts: g.texts, scripts: g.scripts } }]);
  if (hashCount) {
    const g2 = genSeq(L, which, hashCount, true);
    write(`seq-${lc}-${which}-hash`, `as seq-${lc}-${which} but the feature maps are java.util.HashMap (real rules use HashMap: iteration order of features matters)`, [{ op: 'unify-seq', args: { lang: L.code, which, preload: which === 'grammar' ? 'grammar' : 'disamb', hash: true, texts: g2.texts, scripts: g2.scripts } }]);
  }
}

// ---- part 4: inline synthetic rules ----
const V = {
  der: ['D:sg:m:nom', 'D:sg:f:gen', 'D:sg:f:dat', 'D:pl:x:gen'], die: ['D:sg:f:nom', 'D:sg:f:akk', 'D:pl:x:nom', 'D:pl:x:akk'], das: ['D:sg:n:nom', 'D:sg:n:akk'],
  den: ['D:sg:m:akk', 'D:pl:x:dat'], dem: ['D:sg:m:dat', 'D:sg:n:dat'], Hund: ['N:sg:m:nom', 'N:sg:m:akk', 'N:sg:m:dat'], Hunde: ['N:pl:m:nom', 'N:pl:m:akk', 'N:pl:m:gen'],
  Katze: ['N:sg:f:nom', 'N:sg:f:akk', 'N:sg:f:dat', 'N:sg:f:gen'], Katzen: ['N:pl:f:nom', 'N:pl:f:akk', 'N:pl:f:dat', 'N:pl:f:gen'], Haus: ['N:sg:n:nom', 'N:sg:n:akk', 'N:sg:n:dat'],
  große: ['J:sg:f:nom', 'J:sg:f:akk', 'J:pl:x:nom', 'J:pl:x:akk', 'J:sg:n:nom', 'J:sg:n:akk'], großer: ['J:sg:m:nom', 'J:sg:f:gen', 'J:sg:f:dat'], kleinen: ['J:sg:m:akk', 'J:pl:x:dat', 'J:sg:m:dat'],
  und: ['C'], ',': ['P'], läuft: ['V:sg'], schnell: ['A'], '.': ['P:end'], X: [null], Y: ['N:sg:m:nom', 'J:sg:m:nom', 'D:sg:m:nom'],
};
const synTok = (w) => ({ readings: V[w].map((t) => [w, t, t === null ? null : w.toLowerCase()]), ws: !'.,'.includes(w) });
const WORDS = Object.keys(V);
const TEMPL = [['der', 'Hund'], ['die', 'Katzen'], ['das', 'große', 'Haus'], ['den', 'kleinen', 'Hund', 'läuft'], ['der', 'große', ',', 'große', 'Hund'], ['die', 'große', 'und', 'kleinen', 'Katze'], ['dem', 'Haus'], ['Hund', 'Katze'], ['der', 'Katze'], ['die', 'Hunde', 'läuft', 'schnell', '.'], ['den', 'Hunde'], ['die', 'Hunde'], ['X'], ['Y', 'Y'], ['der', 'X', 'Hund'], ['großer', 'Hund'], ['die', 'große', 'große', 'Katze'], ['der', 'der', 'der']];
const synSents = [];
for (const t of TEMPL) synSents.push({ syn: [{ readings: [['', 'SENT_START', null]] }, ...t.map(synTok)] });
for (let i = 0; i < 40; i++) { const len = 1 + Math.floor(rnd() * 7); synSents.push({ syn: Array.from({ length: len }, () => synTok(pick(WORDS))) }); }
synSents.push({ syn: [] }, { syn: [{ readings: [['der', null, null]] }, { readings: [['Hund', null, null]] }] }, { syn: [{ readings: [['Hund', 'N:sg:m:nom', 'Hund'], ['Hund', 'N:pl:m:nom', 'Hund']] }] });
const enTexts = ['The cat sleeps.', 'The cats sleep.', 'A dog barks loudly.', 'the big dogs', 'He goes home.'];
const inlineTexts = [...synSents, ...enTexts];

function header(sfx) {
  const eq = (feat, defs) => `<unification feature="${feat}${sfx}">${defs.map(([ty, pos]) => `<equivalence type="${ty}"><token postag="${pos}" postag_regexp="yes"/></equivalence>`).join('')}</unification>`;
  return [
    eq('num', [['sg', '.*:sg.*'], ['pl', '.*:pl.*']]),
    eq('gen', [['m', '.*:(m|x):.*'], ['f', '.*:(f|x):.*'], ['n', '.*:(n|x):.*']]),
    eq('cas', [['nom', '.*:nom'], ['akk', '.*:akk'], ['dat', '.*:dat'], ['gen', '.*:gen']]),
    eq('en', [['sg', 'NN|NNP|VBZ'], ['pl', 'NNS|NNPS|VBP']]),
  ].join('\n');
}
const FEATS = { num: ['sg', 'pl'], gen: ['m', 'f', 'n'], cas: ['nom', 'akk', 'dat', 'gen'], en: ['sg', 'pl'] };
const tokKinds = (sfx) => [
  () => '<token postag="D:.*" postag_regexp="yes"/>', () => '<token postag="N:.*" postag_regexp="yes"/>', () => '<token postag="J:.*" postag_regexp="yes"/>', () => '<token/>', () => '<token postag="[DJN]:.*" postag_regexp="yes"/>',
  () => '<token regexp="yes">der|die|das|den|dem</token>', () => '<token postag="N:.*" postag_regexp="yes"><exception>Haus</exception></token>', () => '<token postag="D:.*" postag_regexp="yes" skip="1"/>',
  () => '<token postag="J:.*" postag_regexp="yes" min="0"/>', () => '<token postag="J:.*" postag_regexp="yes" min="0" max="2"/>', () => '<token postag="NN.*" postag_regexp="yes"/>', () => '<token>the</token>',
  () => '<token postag="N:.*" postag_regexp="yes" negate="yes"/>', () => '<token postag="D:.*" postag_regexp="yes"><exception scope="next" postag="J:.*" postag_regexp="yes"/></token>',
  () => '<token><and><token postag="N:.*" postag_regexp="yes"/><token regexp="yes">Hund.*</token></and></token>', () => '<token><or><token postag="D:.*" postag_regexp="yes"/><token postag="J:.*" postag_regexp="yes"/></or></token>',
  () => '<token postag="N:.*" postag_regexp="yes" skip="-1"/>', () => '<token postag="N:.*" postag_regexp="yes" max="3"/>',
];
function featBlock(sfx) {
  const k = 1 + Math.floor(rnd() * 3);
  const names = uniq(Array.from({ length: k }, () => pick(['num', 'gen', 'cas', 'num', 'gen', 'en'])));
  return names.map((n) => {
    const r = rnd();
    if (r < 0.55) return `<feature id="${n}${sfx}"/>`;
    const types = FEATS[n].filter(() => chance(0.5));
    if (!types.length) return `<feature id="${n}${sfx}"><type id="${FEATS[n][0]}"/></feature>`;
    return `<feature id="${n}${sfx}">${types.map((t) => `<type id="${t}"/>`).join('')}</feature>`;
  }).join('') + (chance(0.04) ? '<feature id="nope"/>' : '');
}
function genUnify(sfx) {
  const n = 1 + Math.floor(rnd() * 5);
  const tk = tokKinds(sfx);
  let toks = Array.from({ length: n }, () => pick(tk)());
  if (chance(0.25)) { const at = Math.floor(rnd() * toks.length); toks[at] = `<unify-ignore>${pick(['<token>,</token>', '<token>und</token>', '<token postag="P" postag_regexp="yes"/>', '<token postag="C"/>', '<token postag="J:.*" postag_regexp="yes"/>'])}</unify-ignore>`; }
  if (chance(0.06)) { toks.splice(Math.floor(rnd() * (toks.length + 1)), 0, `<unify-ignore><token>,</token><token>und</token></unify-ignore>`); }
  let body = featBlock(sfx) + toks.join('');
  let u = `<unify${chance(0.22) ? ' negate="yes"' : ''}>${body}</unify>`;
  if (chance(0.07)) u = `<marker>${u}</marker>`;
  const r = rnd();
  if (r < 0.2) u = pick(tk)() + u; else if (r < 0.35) u += pick(tk)(); else if (r < 0.4) u = `<token postag="SENT_START"/>${u}`; else if (r < 0.45) u += '<token postag="SENT_END"/>';
  if (chance(0.06)) u += `<unify>${featBlock(sfx)}${pick(tk)()}${pick(tk)()}</unify>`;
  return u;
}
const hand = (sfx) => {
  const f = (n) => `<feature id="${n}${sfx}"/>`;
  const D = '<token postag="D:.*" postag_regexp="yes"/>'; const N = '<token postag="N:.*" postag_regexp="yes"/>'; const J = '<token postag="J:.*" postag_regexp="yes"/>';
  return [
    `<unify>${f('num')}${D}${N}</unify>`, `<unify>${f('gen')}${D}${N}</unify>`, `<unify>${f('cas')}${D}${N}</unify>`, `<unify>${f('num')}${f('gen')}${f('cas')}${D}${J}${N}</unify>`,
    `<unify negate="yes">${f('num')}${D}${N}</unify>`, `<unify negate="yes">${f('gen')}${f('cas')}${D}${N}</unify>`,
    `<unify>${f('num')}${D}${J}<unify-ignore><token>,</token></unify-ignore>${J}${N}</unify>`, `<unify>${f('num')}${D}<unify-ignore>${J}</unify-ignore>${N}</unify>`,
    `<unify>${f('num')}<unify-ignore>${D}</unify-ignore>${N}</unify>`, `<unify>${f('num')}<unify-ignore>${D}</unify-ignore></unify>`, `<unify negate="yes">${f('num')}<unify-ignore>${D}</unify-ignore>${N}</unify>`,
    `<unify>${f('num')}${N}</unify>`, `<unify negate="yes">${f('num')}${N}</unify>`, `<unify>${f('num')}<token/></unify>`, `<unify>${f('num')}<token/><token/></unify>`,
    `<unify>${f('num')}${D}<token skip="1"/>${N}</unify>`, `<unify>${f('num')}${D}<token skip="-1"/>${N}</unify>`, `<unify>${f('num')}${D}${J.replace('/>', ' min="0"/>')}${N}</unify>`,
    `<unify><feature id="num${sfx}"><type id="sg"/></feature>${D}${N}</unify>`, `<unify><feature id="num${sfx}"><type id="pl"/></feature>${D}${N}</unify>`, `<unify><feature id="cas${sfx}"><type id="nom"/><type id="akk"/></feature>${D}${N}</unify>`,
    `<unify><feature id="cas${sfx}"><type id="nom"/></feature><feature id="num${sfx}"/>${D}${J}${N}</unify>`, `<unify><feature id="num${sfx}"><type id="nope"/></feature>${D}${N}</unify>`,
    `<unify>${f('en')}<token postag="DT"/><token postag="NN.*" postag_regexp="yes"/></unify>`, `<unify>${f('en')}<token>the</token><token postag="NNS?" postag_regexp="yes"/></unify>`,
    `<unify negate="yes">${f('en')}<token postag="NN.*" postag_regexp="yes"/><token postag="VBZ|VBP" postag_regexp="yes"/></unify>`, `<unify>${f('en')}<token postag="NN.*" postag_regexp="yes"/><token postag="VB.*" postag_regexp="yes"/></unify>`,
    `${D}<unify>${f('num')}${N}${N}</unify>`, `<unify>${f('num')}${D}${N}</unify>${J}`, `<marker>${D}</marker><unify>${f('num')}${N}${N}</unify>`, `<unify>${f('num')}<marker>${D}</marker>${N}</unify>`, `<unify>${f('num')}${D}<marker>${N}</marker></unify>`,
    `<unify>${f('num')}${D}${N}</unify><unify>${f('gen')}${D}${N}</unify>`, `<unify>${f('num')}${D}${N}</unify>${D}${N}`, `<unify>${f('num')}${N}</unify><unify negate="yes">${f('cas')}${N}${N}</unify>`,
    `<unify>${f('num')}${D}${N.replace('/>', ' skip="2"/>')}${N}</unify>`, `<unify>${f('num')}<token postag="SENT_START"/>${D}${N}</unify>`, `<unify>${f('num')}${D}${N}<token postag="SENT_END"/></unify>`,
    `<unify>${f('num')}<token postag="P" postag_regexp="yes"/></unify>`, `<unify>${f('num')}<token>zzzz</token></unify>`, `<unify>${f('num')}${D}<unify-ignore><token>zzzz</token></unify-ignore></unify>`,
    `<unify>${f('num')}${J.replace('/>', ' max="3"/>')}${N}</unify>`, `<unify>${f('num')}${J.replace('/>', ' min="2"/>')}${N}</unify>`, `<unify>${f('num')}${D}${N.replace('/>', ' inflected="yes"/>')}</unify>`,
    `<unify>${f('num')}<token postag="D:sg.*|N:sg.*" postag_regexp="yes"/><token postag="D:pl.*|N:pl.*" postag_regexp="yes"/></unify>`,
    `<unify>${f('num')}<token>der</token><token>Hund</token></unify>`, `<unify>${f('num')}<token>der</token><token>Katze</token></unify>`, `<unify negate="yes">${f('num')}<token>der</token><token>Katze</token></unify>`,
  ];
};
const refRules = (sfx) => {
  const f = (n) => `<feature id="${n}${sfx}"/>`;
  const D = '<token postag="D:.*" postag_regexp="yes"/>'; const N = '<token postag="N:.*" postag_regexp="yes"/>';
  return [
    `<unify>${f('num')}${D}${N}</unify><token>\\1</token>`, `<token skip="-1" regexp="yes">der|die</token><unify>${f('num')}${D}${N}</unify><token><match no="1"/></token>`,
    `${D}<unify>${f('num')}<token><match no="1"/></token>${N}</unify>`, `<unify>${f('gen')}${D}<token regexp="yes">\\1</token></unify>`,
    `<unify>${f('num')}${D}${N}</unify><token inflected="yes"><match no="2" postag="N:.*" postag_regexp="yes"/></token>`,
  ];
};
// validate candidate rules by loading them one by one in the Java oracle (drop rules the loader rejects)
const RULES = 560;
const sfx0 = 'I';
const cand = [...hand(sfx0), ...Array.from({ length: RULES - hand(sfx0).length }, () => genUnify(sfx0))];
const valOps = cand.map((p) => ({ op: 'unify-config', args: { lang: 'en-US', xml: unifXml(header(sfx0), rule('R0', p)) } }));
const vr = await (async () => {
  const r = await runHarness({ ops: valOps });
  return r.responses.split('\n').filter(Boolean).map((l) => JSON.parse(l).ok);
})();
const good = cand.filter((_, i) => vr[i]);
console.error('inline candidates', cand.length, 'loadable', good.length);
const PERFILE = 50;
chunks(good, PERFILE).forEach((ch, ci) => {
  const sfx = `I${ci}`;
  const re = (p) => p.replaceAll(`${sfx0}"`, `${sfx}"`);
  const rules = ch.map((p, i) => rule(`R${i}`, re(p))).join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rules lang="en">\n${header(sfx)}\n<category id="CAT" name="Category">\n${rules}</category>\n</rules>\n`;
  const jobs = ch.map((_, j) => ({ src: { rule: j }, texts: inlineTexts.map((_, i) => i) }));
  write(`inline-${pad(ci)}`, 'synthetic PatternRules with <unify>/<unify-ignore>/negate/features with and without types/skip/min/max/markers on synthetic tagged token arrays and raw en sentences; raw hits + unified tokens', [{ op: 'unify-match', args: { lang: 'en-US', xml, texts: inlineTexts, jobs } }]);
});
{
  const sfx = 'R';
  const rr = refRules(sfx);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rules lang="en">\n${header(sfx)}\n<category id="CAT" name="Category">\n${rr.map((p, i) => rule(`R${i}`, p)).join('')}</category>\n</rules>\n`;
  const jobs = rr.map((_, j) => ({ src: { rule: j }, texts: inlineTexts.map((_, i) => i) }));
  write('inline-ref', 'unify rules with match references (\\1, <match no>): need MatchState (F29)', [{ op: 'unify-match', args: { lang: 'en-US', xml, texts: inlineTexts, jobs } }]);
}
console.error('done');
