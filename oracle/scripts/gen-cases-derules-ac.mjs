// Authors oracle/cases/X-DERULES-AC (F54/F55, inputs only). Ops: replace-check mode rules (StyleOps) and lang-deagree (DeAgreeOps). Docs: docs/review/F54-oracle.md, F55-oracle.md.
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';

const D = path.join(ROOT, 'oracle/cases/X-DERULES-AC'); rmSync(D, { recursive: true, force: true }); mkdirSync(D, { recursive: true });
const w = (name, description, ops) => writeFileSync(path.join(D, `${name}.json`), JSON.stringify({ kind: 'harness', clock: 'fixed', description, normalize: ['paths'], compare: 'jsonl', ops }) + '\n');
const sha = (s) => createHash('sha1').update(String(s)).digest('hex');
const pick = (a, n) => [...a].sort((x, y) => (sha(x) < sha(y) ? -1 : 1)).slice(0, n);
const chunks = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, (i + 1) * n));
const uniq = (a) => [...new Set(a)];
const C = (text, level = 'DEFAULT') => ({ text, level });
const lv = (arr, level = 'DEFAULT') => arr.map((t) => C(t, level));
const rop = (lang, ids, cases, extra = {}) => ({ op: 'replace-check', args: { mode: 'rules', lang, ids, ...extra, cases } });
const JT = path.join(ROOT, 'oracle/java-src/languagetool-language-modules/de/src/test/java/org/languagetool/rules/de');
const JM = path.join(ROOT, 'oracle/java-src/languagetool-language-modules/de/src/main/java/org/languagetool/rules/de');
const RES = path.join(ROOT, 'resources/org/languagetool/resource/de');

// string literals of calls name(...) as first argument group, concatenation with +
function unesc(s) { return s.replace(/\\(u[0-9a-fA-F]{4}|.)/g, (_, c) => c[0] === 'u' && c.length === 5 ? String.fromCharCode(parseInt(c.slice(1), 16)) : ({ n: '\n', t: '\t', r: '\r' }[c] ?? c)); }
function firstArg(src, start) {
  let i = start, out = '', ok = false;
  for (;;) {
    while (/\s/.test(src[i] ?? '')) i++;
    if (src[i] === '"') {
      let j = i + 1; while (src[j] !== '"') j += src[j] === '\\' ? 2 : 1;
      out += unesc(src.slice(i + 1, j)); ok = true; i = j + 1;
      while (/\s/.test(src[i])) i++;
      if (src[i] === '+') { i++; continue; }
    }
    break;
  }
  return ok ? out : null;
}
function callLits(file, names) {
  const src = readFileSync(file, 'utf8').replace(/\/\/[^\n]*/g, (m) => (m.includes('"') ? m : ''));
  const re = new RegExp(`\\b(${names.join('|')})\\(`, 'g'); const res = []; let m;
  while ((m = re.exec(src))) { const a = firstArg(src, m.index + m[0].length); if (a !== null && !res.includes(a)) res.push(a); }
  return res;
}

const VARS = ['de-DE', 'de-AT', 'de-CH'];
const EDGE = ['', ' ', 'x', 'Ünï cödé wörds — „zitiert“ ‚Text‘.', 'a'.repeat(300), 'Zeile eins.\nZeile zwei.', 'Tab\tgetrennt.', '1234 5678.', '😀 Emoji 😀.', 'Der der der der.', 'Ein ein Haus.'];
const corpus = readFileSync(path.join(ROOT, 'oracle/corpus/de/corpus.txt'), 'utf8');
const sentences = pick(corpus.split(/(?<=[.!?])\s+/).map((s) => s.replace(/\s+/g, ' ').trim()).filter((s) => s.length > 20 && s.length < 240), 400);

const AGR = ['DE_AGREEMENT', 'DE_AGREEMENT2'];
const agrTest = callLits(path.join(JT, 'AgreementRuleTest.java'), ['assertGood', 'assertBad', 'assertBad1', 'assertBadWithNoSuggestion', 'check', 'lt\\.check', 'getAnalyzedSentence']);
const agr2Test = callLits(path.join(JT, 'AgreementRule2Test.java'), ['assertGood', 'assertBad']);
const caseTest = callLits(path.join(JT, 'CaseRuleTest.java'), ['assertGood', 'assertBad', 'check', 'lt\\.check', 'getAnalyzedSentence']);
console.error('literals', agrTest.length, agr2Test.length, caseTest.length);

// ---------- F54 ----------
for (const l of VARS) {
  const n = l === 'de-DE' ? 9999 : 120;
  const ch = chunks(lv(agrTest.slice(0, n)), 60);
  w(`agreement-test-${l}`, `DE-0040/0041/0043: AgreementRuleTest literals (assertGood/assertBad inputs), DE_AGREEMENT+DE_AGREEMENT2 (${l}), DEFAULT and PICKY`,
    [...ch.map((c) => rop(l, AGR, c)), ...chunks(lv(agrTest.slice(0, n), 'PICKY'), 60).slice(0, l === 'de-DE' ? 99 : 1).map((c) => rop(l, AGR, c))]);
  w(`agreement2-test-${l}`, `DE-0042: AgreementRule2Test literals, DE_AGREEMENT2 only and both rules (${l})`,
    [rop(l, ['DE_AGREEMENT2'], lv(agr2Test)), rop(l, ['DE_AGREEMENT2'], lv(agr2Test, 'PICKY')), rop(l, AGR, lv(agr2Test))]);
}
// templates: det x noun, det x adj x noun, prepositions
{
  const dets = ['der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einem', 'einen', 'einer', 'eines', 'mein', 'meine', 'meinem', 'dieser', 'dieses', 'welche', 'jeder', 'kein', 'keine', 'viele', 'alle', 'Der', 'Die', 'Ein'];
  const nouns = ['Mann', 'Frau', 'Kind', 'Haus', 'Häuser', 'Kabels', 'Tisch', 'Ferienwohnung', 'Eltern', 'Verständnis', 'Blutflusses', 'Züchten', 'Auge', 'Erinnerung', 'Fahrerin', 'Kühlschranktest', 'LAN-Kabels', 'Studentinnen', 'Beamte', 'Tipp'];
  const adjs = ['schöne', 'schönes', 'schönen', 'schöner', 'schönem', 'große', 'kleinen', 'neuen', 'benötigten', 'vorangegangen', 'stärkste', 'ikonischen', 'sehr schönes', 'voller'];
  const ts = [];
  for (const d of dets) for (const n of nouns) ts.push(`Das ist ${d} ${n}.`);
  for (const d of dets) for (const a of adjs) ts.push(`Ich sehe ${d} ${a} ${nouns[(d.length * 7 + a.length) % nouns.length]} dort.`);
  const preps = ['mit', 'für', 'in', 'auf', 'über', 'von', 'zu', 'zur', 'ins', 'im', 'ohne', 'an', 'bei', 'nach', 'wegen', 'durch', 'gegen', 'unter', 'zum', 'beim', 'am', 'vom', 'aus', 'bis', 'seit'];
  for (const p of preps) for (const [d, n] of [['dein', 'Schmuck'], ['ein', 'Mann'], ['der', 'Frau'], ['das', 'Hauses'], ['die', 'Kind'], ['ein hilfreichen', 'Tipp'], ['den stacheligen', 'Pflanzenteile'], ['kuschelige', 'Ferienwohnung']]) ts.push(`Wir gehen ${p} ${d} ${n}.`);
  ts.push('gehe zur Mann', 'gehe zur kuschelige Ferienwohnung', 'gehe ins Hauses', 'gehe ins großen Haus', 'Ich gehe zum Frau.', 'Er kommt vom Schule.', 'Sie wohnt im Straße.', 'Das ist eine Preisanstieg.', 'Das Hund bellt laut.', 'Die Mann kommt.', ...EDGE);
  for (const l of VARS) {
    const ch = chunks(lv(ts), 60);
    w(`agreement-grid-${l}`, `DE-0040/0043/0044: det x noun, det x adj x noun and preposition grids (${l}), DEFAULT + PICKY`,
      [...(l === 'de-DE' ? ch : ch.slice(0, 3)).map((c) => rop(l, AGR, c)), ...(l === 'de-DE' ? chunks(lv(ts, 'PICKY'), 60).slice(0, 4) : []).map((c) => rop(l, AGR, c))]);
  }
}
// antipattern-derived
function antiSentences(file, caseRule) {
  const src = readFileSync(file, 'utf8');
  const groups = [...src.matchAll(/(?:Arrays\.)?asList\(\s*\n((?:[^\n]*\n)*?)\s*\)(?:,|\s*\);)/g)].map((m) => m[1]);
  const out = [];
  for (const g of groups) {
    const toks = [];
    let bad = false;
    for (const line of g.split('\n')) {
      const t = line.replace(/\/\/.*$/, '').trim();
      if (!t) continue;
      const m = /^(csRegex|tokenRegex|token|csToken|posRegex|pos|SENT_START|new PatternTokenBuilder)\b\(?"?([^"]*)"?/.exec(t);
      if (/PatternTokenBuilder|min\(|max\(|setSkip|negate|\.build/.test(t) && !/^token|^csRegex|^tokenRegex|^csToken/.test(t)) { if (/^SENT_START/.test(t)) { toks.push(null); continue; } bad = true; break; }
      if (!m) { bad = true; break; }
      const kind = m[1], v = m[2];
      if (kind === 'SENT_START') { toks.push(null); continue; }
      if (kind === 'pos' || kind === 'posRegex') { toks.push(/^ADJ/.test(v) ? 'kleinen' : /^SUB/.test(v) ? 'Haus' : /^VER/.test(v) ? 'gehen' : /^ART|^PRO/.test(v) ? 'die' : null === v ? 'x' : (bad = true)); if (bad) break; continue; }
      let s = v.replace(/\[([^\]])[^\]]*\]/g, '$1');
      s = s.split('|')[0].replace(/[()?]/g, '');
      if (/[\\.*+\[\]{}^$]/.test(s.replace(/^\.\*$/, 'x')) && !/^[-.:,;]$/.test(s)) { bad = true; break; }
      toks.push(s);
    }
    if (bad || toks.length < 2) continue;
    const ws = toks.filter((x) => x !== null);
    const text = ws.join(' ').replace(/ ([.,:;!?])/g, '$1');
    out.push(text + '.', `Er sagte ${text}.`, text.charAt(0).toUpperCase() + text.slice(1) + ' ist es.');
  }
  return uniq(out);
}
const antiAgr = uniq(['AgreementRuleAntiPatterns1', 'AgreementRuleAntiPatterns2', 'AgreementRuleAntiPatterns3'].flatMap((f) => antiSentences(path.join(JM, `${f}.java`))));
const antiCase = antiSentences(path.join(JM, 'CaseRuleAntiPatterns.java'));
console.error('anti', antiAgr.length, antiCase.length);
for (const l of VARS) {
  const a = l === 'de-DE' ? antiAgr : antiAgr.slice(0, 150);
  w(`agreement-antipatterns-${l}`, `DE-0041: sentences built from AgreementRuleAntiPatterns1/2/3 token lists (${l})`, [...chunks(lv(a), 80).map((c) => rop(l, AGR, c)), ...chunks(lv(a.slice(0, 160), 'PICKY'), 80).map((c) => rop(l, AGR, c))]);
}
// corpus (clean + injected errors)
{
  const sw = { der: 'den', die: 'der', das: 'dem', den: 'die', dem: 'das', des: 'die', ein: 'eine', eine: 'einem', einen: 'einer', einem: 'ein', einer: 'eines' };
  const inj = sentences.map((s) => s.replace(/\b(der|die|das|den|dem|des|ein|eine|einen|einem|einer)\b/, (m) => sw[m])).filter((s, i) => s !== sentences[i]);
  for (const l of VARS) {
    const n = l === 'de-DE' ? 200 : 60;
    w(`agreement-corpus-${l}`, `DE-0040/0042: corpus sentences clean and with injected determiner swaps (${l}), DEFAULT + PICKY, plus multi-sentence paragraphs`,
      [rop(l, AGR, lv(sentences.slice(0, n))), rop(l, AGR, lv(inj.slice(0, n))), rop(l, AGR, lv(inj.slice(0, n), 'PICKY')), rop(l, AGR, [C(sentences.slice(0, 12).join(' ')), C(inj.slice(0, 12).join('\n\n'), 'PICKY')])]);
  }
  w('agreement-corpus-wide', 'DE-0040/0042: remaining corpus sentences (de-DE), injected variants, both levels', [rop('de-DE', AGR, lv(sentences.slice(200))), rop('de-DE', AGR, lv(inj.slice(200), 'PICKY'))]);
}
// AgreementSuggestor2 direct
{
  const sug = callLits(path.join(JT, 'AgreementSuggestor2Test.java'), ['assertSuggestion1', 'assertSuggestion2', 'assertSuggestion3']);
  const cs = [];
  const add = (text, extra = {}) => { const n = text.split(' ').length; const o = n === 2 ? { det: 1, noun: 2 } : n === 3 ? { det: 1, adj1: 2, noun: 3 } : { det: 1, adj1: 2, adj2: 3, noun: 4 }; cs.push({ text, ...o, ...extra }); };
  for (const s of sug) add(s);
  for (const [t, ex] of [['gehe zur Mann', { det: 2, noun: 3, type: 'Zur' }], ['gehe zur kuschelige Ferienwohnung', { det: 2, adj1: 3, noun: 4, type: 'Zur' }], ['gehe ins Hauses', { det: 2, noun: 3, type: 'Ins' }], ['gehe ins großen Haus', { det: 2, adj1: 3, noun: 4, type: 'Ins' }], ['gehe zum Frau', { det: 2, noun: 3, type: 'Zur' }], ['gehe ins Buch', { det: 2, noun: 3, type: 'Ins' }], ['gehe zur kleinen Hund', { det: 2, adj1: 3, noun: 4, type: 'Zur' }],
    ['für dein Schmuck', { det: 2, noun: 3 }], ['für dein Schmuck', { det: 2, noun: 3, prep: 1 }], ['über ein hilfreichen Tipp', { det: 2, adj1: 3, noun: 4 }], ['über ein hilfreichen Tipp', { det: 2, adj1: 3, noun: 4, prep: 1 }], ['an den stacheligen Pflanzenteile', { det: 2, adj1: 3, noun: 4 }], ['an den stacheligen Pflanzenteile', { det: 2, adj1: 3, noun: 4, prep: 1 }],
    ['mit der Mann', { det: 2, noun: 3, prep: 1 }], ['ohne die Kind', { det: 2, noun: 3, prep: 1 }], ['wegen der Haus', { det: 2, noun: 3, prep: 1 }], ['in die Haus', { det: 2, noun: 3, prep: 1 }], ['auf das Frauen', { det: 2, noun: 3, prep: 1 }], ['zu der Kind', { det: 2, noun: 3, prep: 1 }], ['von die Hauses', { det: 2, noun: 3, prep: 1 }], ['xyz der Mann', { det: 2, noun: 3, prep: 1 }],
    ['die Mann', { det: 1, noun: 2, skipped: 'sehr' }], ['ein sehr schönes Tisch', { det: 1, adj1: 3, noun: 4, skipped: 'sehr' }], ['Das ist x', { det: 1, noun: 2 }]]) cs.push({ text: t, ...ex });
  const dets = ['der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem', 'einer', 'eines', 'mein', 'unsere', 'unserem', 'dieselbe', 'welche', 'kein', 'jede', 'alle', 'manche', 'Ihren', 'unsren'];
  const nouns = ['Mann', 'Frau', 'Kind', 'Haus', 'Tisch', 'Buch', 'Eltern', 'Auge', 'Zeit', 'Ärzte', 'Kunden', 'Gedanken', 'Wille', 'Herz', 'Junge', 'Name', 'Atlas', 'Xyzzy', 'Mädchen', 'Beamte'];
  for (const d of dets) for (const n of nouns) cs.push({ text: `${d} ${n}`, det: 1, noun: 2 });
  for (const d of dets.slice(0, 12)) for (const a of ['große', 'kleinen', 'neues', 'beste', 'xyzzy']) for (const n of nouns.slice(0, 8)) cs.push({ text: `${d} ${a} ${n}`, det: 1, adj1: 2, noun: 3 });
  for (const [d, a, b, n] of [['ein', 'sehr', 'schönes', 'Tisch'], ['eines', 'sehr', 'schönen', 'Tisch'], ['der', 'sehr', 'schönen', 'Tischen'], ['jedes', 'viertes', 'fremdsprachliche', 'Wurzeln'], ['die', 'große', 'rote', 'Auto'], ['das', 'alte', 'schöne', 'Haus'], ['den', 'kleinen', 'netten', 'Kinder']]) cs.push({ text: `${d} ${a} ${b} ${n}`, det: 1, adj1: 2, adj2: 3, noun: 4 });
  cs.push({ text: 'der', det: 1, noun: 5 }, { text: 'die Mann', det: 1, noun: null }, { text: 'die Mann', det: null, noun: 2 }, { text: 'die Mann', det: 1, noun: 2, type: 'Bogus' });
  for (const l of VARS) w(`suggestor-${l}`, `DE-0043/0044: AgreementSuggestor2 direct (reflection), token indexes into getTokensWithoutWhitespace (${l}); all and filtered suggestions`,
    (l === 'de-DE' ? chunks(cs, 100) : [cs.slice(0, 60)]).map((c) => ({ op: 'lang-deagree', args: { mode: 'suggest', lang: l, cases: c } })));
}
// GermanHelper / GermanTools / AgreementTools / PrepositionToCases / LanguageNames
{
  const tags = ['SUB:AKK:SIN:NEU', 'SUB:NOM:PLU:MAS', 'SUB:DAT:SIN:FEM:INF', 'ART:DEF:DAT:SIN:FEM', 'ART:IND:NOM:PLU:MAS', 'PRO:POS:AKK:SIN:NEU', 'ADJ:NOM:SIN:MAS:GRU:SOL', 'ADJ:DAT:PLU:FEM:KOM:DEF', 'ADJ:GEN:SIN:NEU:SUP:IND', 'VER:1:SIN:PRÄ', 'ADV', '', 'A', 'SUB', 'SUB:NOM', 'ART:DEF:NOM:SIN:MAS:X:Y', ':::', 'SENT_END', 'PKT', 'PRO:DEM:NOM:SIN:NEU:STV', null, 'SUB:GEN:PLU:NOG', 'ADJ:AKK:SIN:MAS:GRU:SOL', 'ZZ:ZZ:ZZ:ZZ:ZZ', 'ART:DEF:AKK:SIN:NEU', 'ART:IND:DAT:SIN:MAS'];
  const chars = [...'aeiouyAEIOUYäöüÄÖÜ', ...'bcdfgxzBCDXZßéèê', ' ', '1', '-', '\u0000', 'ÿ', 'Ä', 'ö'];
  const texts = ['Das große Haus', 'Der Mann gehört dem Kind.', 'Er läuft schnell', 'Ich gebe dir einen kleinen Hund.', 'Die schönsten Tage der Stadt Berlin', 'Das Laufen ist gesund.', 'Mit meinen alten Freundinnen', 'Ein Tisch. Zwei Stühle.', 'Beamte arbeiten', 'Der Lehrer und die Lehrerin', 'Er sieht uns.', 'Alle Kinder', 'Wegen des Wetters', 'Peter Müller aus Wien', 'Sie waren gelaufen', 'xyzzy plugh', 'dasselbe Buch', 'Ihren Verständnis', 'Zum Ersten, zum Zweiten'];
  const preps = ['mit', 'für', 'in', 'auf', 'über', 'von', 'zu', 'ohne', 'an', 'bei', 'nach', 'wegen', 'durch', 'gegen', 'unter', 'zum', 'zur', 'ins', 'im', 'beim', 'am', 'vom', 'aus', 'bis', 'seit', 'trotz', 'während', 'dank', 'laut', 'entlang', 'gemäß', 'Mit', 'IN', 'xyz', '', 'hinter', 'vor', 'neben', 'zwischen', 'um', 'als', 'außer', 'entgegen', 'binnen', 'samt', 'statt', 'anstatt', 'oberhalb', 'innerhalb', 'zufolge', 'ab', 'per', 'pro', 'je', 'via', 'gen', 'ob', 'fern', 'nahe', null];
  const omits = [[], ['KASUS'], ['GENUS'], ['NUMERUS'], ['KASUS', 'GENUS'], ['KASUS', 'NUMERUS'], ['GENUS', 'NUMERUS'], ['KASUS', 'GENUS', 'NUMERUS']];
  w('helper-direct', 'DE-0130/0131/0044/0132: GermanHelper getters, GermanTools.isVowel, hasReadingOfType per POSType, AgreementTools categories, PrepositionToCases, LanguageNames', [
    { op: 'lang-deagree', args: { mode: 'helper', posTags: tags, chars, texts, lang: 'de-DE' } },
    { op: 'lang-deagree', args: { mode: 'helper', texts: texts.slice(0, 6), lang: 'de-AT' } },
    { op: 'lang-deagree', args: { mode: 'tools', prepositions: preps, texts, omits, lang: 'de-DE' } },
    { op: 'lang-deagree', args: { mode: 'tools', texts: texts.slice(0, 5), omits: omits.slice(0, 3), lang: 'de-CH' } },
    { op: 'lang-deagree', args: { mode: 'names' } },
  ]);
}

// ---------- F55 ----------
const CASE = ['DE_CASE'];
const rules = readFileSync(path.join(RES, 'case_rule_exceptions.txt'), 'utf8').split('\n').map((l) => l.replace(/\s*#.*$/, '').trim()).filter(Boolean);
const eig = readFileSync(path.join(RES, 'eigennamen_gross.txt'), 'utf8').split('\n').map((l) => l.replace(/\s*#.*$/, '').trim()).filter(Boolean);
const lit = rules.filter((x) => !/[\[\]()?*+\\|.{}^$]/.test(x));
const lc = (s) => s.charAt(0).toLowerCase() + s.slice(1);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const lowerAll = (s) => s.split(' ').map(lc).join(' ');
for (const l of VARS) {
  const n = l === 'de-DE' ? 9999 : 150;
  w(`case-test-${l}`, `DE-0045/0046: CaseRuleTest literals (${l}), DE_CASE, DEFAULT + PICKY`,
    [...chunks(lv(caseTest.slice(0, n)), 80).map((c) => rop(l, CASE, c)), ...chunks(lv(caseTest.slice(0, n), 'PICKY'), 80).slice(0, l === 'de-DE' ? 99 : 1).map((c) => rop(l, CASE, c))]);
  const a = l === 'de-DE' ? antiCase : antiCase.slice(0, 150);
  w(`case-antipatterns-${l}`, `DE-0046: sentences built from CaseRuleAntiPatterns token lists (${l})`, [...chunks(lv(a), 80).map((c) => rop(l, CASE, c)), ...chunks(lv(a.slice(0, 100), 'PICKY'), 80).map((c) => rop(l, CASE, c))]);
}
{
  const ex = [];
  for (const e of lit) ex.push(`Ich sah ${e} dort.`, `${e} ist hier.`, `Ich sah ${lowerAll(e)} dort.`, `Wir sprachen über ${e}.`);
  const exs = pick(ex, 4000);
  const eg = [];
  for (const e of eig) eg.push(`Ich sah ${e} dort.`, `Ich sah ${lowerAll(e)} dort.`, `${e} ist hier.`, `Ich sah ${e.toUpperCase()} dort.`);
  for (const l of VARS) {
    const n = l === 'de-DE' ? 4000 : 200;
    w(`case-exceptions-${l}`, `DE-0046/0175: literal entries of case_rule_exceptions.txt embedded in sentences (original, lower-cased, ${l})`, chunks(lv(exs.slice(0, n)), 100).map((c) => rop(l, CASE, c)));
    w(`case-eigennamen-${l}`, `DE-0046/0175: eigennamen_gross.txt entries embedded in sentences (${l}), DEFAULT + PICKY`, [rop(l, CASE, lv(eg)), rop(l, CASE, lv(eg, 'PICKY'))]);
  }
  // pattern entries expanded by hand-rolled instantiation of simple alternations/classes
  const pat = rules.filter((x) => /[?|]/.test(x) && !/[\\.*+{}^$\[\]]/.test(x)).map((x) => x.replace(/\(([^()|]*)\|([^()]*)\)/g, '$1').replace(/([^ ])\?/g, ''));
  w('case-exceptions-patterns', 'DE-0046/0175: non-literal entries with simple alternation, first alternative instantiated; plus the three regex entries via sample words', [rop('de-DE', CASE, lv(pick(uniq(pat.flatMap((p) => [`Ich sah ${p} dort.`, `Ich sah ${lowerAll(p)} dort.`])), 400)))]);
}
{
  // LanguageNames
  const names = ['Deutsch', 'Englisch', 'Französisch', 'Spanisch', 'Italienisch', 'Russisch', 'Chinesisch', 'Japanisch', 'Arabisch', 'Türkisch', 'Polnisch', 'Niederländisch', 'Portugiesisch', 'Schwedisch', 'Latein', 'Esperanto', 'Hochdeutsch', 'Plattdeutsch', 'Altgriechisch', 'Klingonisch', 'Kisuaheli', 'Isländisch', 'Walisisch', 'Hindi', 'Koreanisch'];
  const ts = [];
  for (const n of names) {
    ts.push(`Er spricht ${n}.`, `Er spricht ${lc(n)}.`, `Sie lernt ${n} und Spanisch.`, `Auf ${n} heißt das anders.`, `Auf ${lc(n)} heißt das anders.`, `Das ${n} ist schwer.`, `Das ${lc(n)} ist schwer.`, `Ich übersetze ins ${n}e.`, `Ins ${n} übersetzen.`, `Ich bin des ${lc(n)}en mächtig.`, `Sie sprechen ${lc(n)} und ${lc(n)}.`, `${n} lernen macht Spaß.`, `${lc(n)} lernen macht Spaß.`, `Ein ${n}er kommt.`, `Mit ${n} kommt man weit.`, `Kein ${n} verstanden.`);
  }
  ts.push('Er spricht deutsch, englisch und französisch.', 'Er spricht Deutsch, Englisch und Französisch.', 'Er kann kein deutsch.', 'Das ist auf deutsch geschrieben.', 'Auf Deutsch gesagt.', 'In deutscher Sprache.', 'Im Deutschen heißt es so.', 'Im deutschen heißt es so.', 'Deutsch ist schwer.', 'deutsch ist schwer.', ...EDGE);
  for (const l of VARS) w(`case-languagenames-${l}`, `DE-0132: LanguageNames-driven inputs (${l}), DEFAULT + PICKY`, [rop(l, CASE, lv(ts)), rop(l, CASE, lv(ts, 'PICKY'))]);
}
{
  // targeted
  const bad = ['Das laufen fällt mir leicht.', 'Das Laufen fällt mir leicht.', 'Er will schwimmen gehen.', 'Er will Schwimmen gehen.', 'Das Essen ist fertig.', 'Das essen ist fertig.', 'Ich habe zu Essen.', 'Ich habe zu essen.', 'Beim Lesen schlafe ich ein.', 'Beim lesen schlafe ich ein.', 'Das ist ein Schönes Haus.', 'Das ist ein schönes Haus.', 'Er ist Schnell gelaufen.', 'Er ist schnell gelaufen.', 'Wir müssen Arbeiten.', 'Wir müssen arbeiten.', 'Sie hat Recht.', 'Sie hat recht.', 'Das Gute daran ist es.', 'Das gute daran ist es.', 'Etwas Neues beginnt.', 'Etwas neues beginnt.', 'Alles Gute!', 'alles gute!', 'Ich gehe Einkaufen.', 'Ich gehe einkaufen.', 'Er hat Angst vor dem Dunkeln.', 'Im dunkeln tappen.', 'Die Alte Frau.', 'Die alte Frau.', 'Der Gelbe Sack.', 'Das Rote Kreuz.', 'Das rote Kreuz.', 'Bei Rot über die Ampel.', 'bei rot über die Ampel.', 'Man muss Aufpassen.', 'Er ist Müde.', 'Es ist Dunkel draußen.', 'Das Neue Jahr beginnt.', 'Ich möchte Kaffee Trinken.', 'Sie fängt an zu Weinen.', 'Das Zusammen Leben ist schön.', 'Wir sind Zusammen gegangen.', 'Ein Gutes Jahr.', 'Meine Liebe Mutter.', 'Lieber Peter,', 'Liebe Grüße', 'liebe grüße', 'Mit Freundlichen Grüßen', 'Mit freundlichen Grüßen', 'Hallo Welt', 'hallo welt', 'Das Auto fährt Schnell.', 'Ich Liebe dich.', 'ich liebe dich', 'Du kannst das Schaffen.', 'Er hat das Geschafft.', 'Das Ist ein Test.', 'Der Hund Bellt.', 'Das Wasser läuft.', 'Wasser Trinken ist gesund.', 'Viel Spaß beim Wandern.', 'Viel Spaß beim wandern.', 'Ich bin Fertig.', 'Wir Gehen nach Hause.', 'Die Drei Fragezeichen.', 'Die drei Fragezeichen.', 'Er kam Am Montag.', 'am Montag', 'Am montag', 'Im Sommer', 'im sommer', 'Sie ist Ärztin.', 'sie ist ärztin.', 'Ein Test, Der Funktioniert.', '1. Januar', '1. januar', 'Heute ist der 5. Mai.', 'Es gibt Nichts zu sehen.', 'Es gibt nichts zu sehen.', 'Das Nichts ist groß.', 'Er hat Alles verloren.', 'Er hat alles verloren.', 'Jeder Einzelne zählt.', 'Jeder einzelne zählt.', 'Das Ganze ist gut.', 'Das ganze ist gut.', 'Im Großen und Ganzen.', 'Im großen und ganzen.', 'Auf Wiedersehen!', 'auf wiedersehen!', 'Zum Glück', 'zum glück', 'Zu Fuß', 'zu fuß', 'Mein Auto ist Rot.', 'Das Buch ist Interessant.', 'Wir sehen uns Morgen.', 'Wir sehen uns morgen.', 'Heute Abend', 'heute abend', 'Gestern Nacht', 'gestern nacht', 'Guten Morgen', 'guten morgen', 'Guten Tag', 'guten tag'];
  for (const l of VARS) w(`case-targeted-${l}`, `DE-0045: targeted capitalisation errors (${l}), DEFAULT + PICKY`, [rop(l, CASE, lv(bad.concat(EDGE))), rop(l, CASE, lv(bad, 'PICKY'))]);
}
{
  const inj = sentences.map((s) => s.replace(/\b([A-ZÄÖÜ][a-zäöüß]{4,})\b/g, (m, a, off) => (off > 0 && off % 3 === 0 ? lc(m) : m))).filter((s, i) => s !== sentences[i]);
  const inj2 = sentences.map((s) => s.replace(/\b([a-zäöüß]{5,})\b/, (m) => cap(m))).filter((s, i) => s !== sentences[i]);
  for (const l of VARS) {
    const n = l === 'de-DE' ? 200 : 60;
    w(`case-corpus-${l}`, `DE-0045: corpus sentences clean and with injected case changes (${l}), DEFAULT + PICKY`,
      [rop(l, CASE, lv(sentences.slice(0, n))), rop(l, CASE, lv(inj.slice(0, n))), rop(l, CASE, lv(inj2.slice(0, n), 'PICKY')), rop(l, CASE, [C(sentences.slice(0, 12).join(' ')), C(inj.slice(0, 12).join('\n\n'), 'PICKY')])]);
  }
  w('case-corpus-wide', 'DE-0045: remaining corpus sentences (de-DE) with injections, both levels', [rop('de-DE', CASE, lv(sentences.slice(200))), rop('de-DE', CASE, lv(inj.slice(200), 'PICKY')), rop('de-DE', CASE, lv(inj2.slice(200)))]);
  w('combined-de-DE', 'DE-0040/0042/0045: DE_AGREEMENT, DE_AGREEMENT2, DE_CASE active together, targeted + corpus', [rop('de-DE', AGR.concat(CASE), lv(sentences.slice(0, 80).concat(inj.slice(0, 60), inj2.slice(0, 60)))), rop('de-DE', AGR.concat(CASE), lv(agrTest.slice(0, 80).concat(caseTest.slice(0, 80)), 'PICKY'))]);
}
console.log('ok');
