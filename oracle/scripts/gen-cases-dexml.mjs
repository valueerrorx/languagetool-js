// Authors oracle/cases/X-DERULES-XML (F59: rule lists, rule-examples) and X-DECHECK (full-check corpus, integration, word_definitions). Inputs only; probes the harness for counts/ids. Docs: docs/review/F59-oracle.md.
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { ROOT, preflight } from '../lib/env.mjs';
import { runHarness } from '../lib/harness-run.mjs';

preflight();
const mk = (id) => { const d = path.join(ROOT, 'oracle/cases', id); rmSync(d, { recursive: true, force: true }); mkdirSync(d, { recursive: true }); return d; };
const DX = mk('X-DERULES-XML'); const DC = mk('X-DECHECK');
const w = (dir, name, description, compare, ops, normalize = ['paths']) => writeFileSync(path.join(dir, `${name}.json`), JSON.stringify({ kind: 'harness', clock: 'fixed', description, normalize, compare, ops }) + '\n');
const sha = (s) => createHash('sha1').update(String(s)).digest('hex');
const pick = (a, n) => [...a].sort((x, y) => (sha(x) < sha(y) ? -1 : 1)).slice(0, n);
const chunks = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, (i + 1) * n));
const VARS = ['de-DE', 'de-AT', 'de-CH'];
const MTS = ['en', 'fr'];

const probeOps = [];
for (const v of VARS) probeOps.push({ op: 'en-rulelist', args: { kind: 'lt', lang: v } });
probeOps.push({ op: 'rule-examples', args: { lang: 'de-DE', offset: 0, limit: 0, unrestricted: false } });
const pr = (await runHarness({ clock: 'fixed', ops: probeOps })).responses.split('\n').filter(Boolean).map((l) => JSON.parse(l));
if (pr.some((r) => !r.ok)) throw new Error('probe failed: ' + JSON.stringify(pr.find((r) => !r.ok)).slice(0, 500));
const lists = Object.fromEntries(VARS.map((v, i) => [v, pr[i].result]));
const exCount = pr[3].result.rulesWithExamples;
const col = (res, n) => res.columns.indexOf(n);
const idsOf = (res, pred) => [...new Set(res.rules.filter((r) => pred(r[col(res, 'sourceFile')] ?? '')).map((r) => r[0].replace(/\[\d+\]$/, '')))];
const variantIds = (v) => idsOf(lists[v], (f) => (v === 'de-CH' ? f.includes('/de-CH/') : f.includes('/de-DE-AT/')));

// rule lists
w(DX, 'rulelist-direct-de', 'DE-0002 German#getRelevantRules (+LM/capable/remote, null LM) per variant, mother tongues none/en/fr', 'jsonl',
  [...VARS, 'de'].flatMap((v) => [undefined, ...MTS].map((m) => ({ op: 'en-rulelist', args: { kind: 'direct', lang: v, ...(m ? { motherTongue: m } : {}) } }))));
for (const v of [...VARS, 'de']) w(DX, `rulelist-all-${v}`, `DE-0002/0150..0153 JLanguageTool rule list (${v}): order, class, category, default off/temp_off, activity at DEFAULT/PICKY`, 'jsonl', [{ op: 'en-rulelist', args: { kind: 'lt', lang: v } }]);
for (const m of MTS) w(DX, `rulelist-all-de-DE-mt-${m}`, `DE-0002 JLanguageTool rule list de-DE with mother tongue ${m}`, 'jsonl', [{ op: 'en-rulelist', args: { kind: 'lt', lang: 'de-DE', motherTongue: m } }]);
w(DX, 'rulelist-contentop', 'DE-0002 ContentOps rules-list (de, de-DE, de-AT, de-CH)', 'jsonl', [...VARS, 'de'].map((v) => ({ op: 'rules-list', args: { lang: v } })));

// rule-examples
const PER = 150;
for (let i = 0, n = 0; i < exCount; i += PER, n++) {
  w(DX, `examples-de-DE-${String(n).padStart(3, '0')}`, `DE-0150..0153 rule-examples de-DE rules ${i}..${i + PER - 1} (restricted + unrestricted check)`, 'rule-examples', [{ op: 'rule-examples', args: { lang: 'de-DE', offset: i, limit: PER } }]);
}
const deIds = idsOf(lists['de-DE'], () => true);
const sampleIds = pick(deIds, 60);
for (const v of ['de-AT', 'de-CH']) {
  const ids = variantIds(v);
  w(DX, `examples-${v}-variant`, `DE-0152/0153 rule-examples of ${v}-specific rules (${ids.length} ids), default level`, 'rule-examples', [{ op: 'rule-examples', args: { lang: v, ruleIds: ids } }]);
  w(DX, `examples-${v}-variant-picky`, `DE-0152/0153 rule-examples of ${v}-specific rules, unrestricted at PICKY`, 'rule-examples', [{ op: 'rule-examples', args: { lang: v, ruleIds: ids, level: 'PICKY' } }]);
  w(DX, `examples-${v}-sample`, `rule-examples of 60 sampled de-DE ids run under ${v}`, 'rule-examples', [{ op: 'rule-examples', args: { lang: v, ruleIds: sampleIds } }]);
}
{
  const ids = variantIds('de-DE');
  w(DX, 'examples-de-DE-variant-picky', `DE-0152 rule-examples of de-DE/AT shared rules (${ids.length} ids), unrestricted at PICKY`, 'rule-examples', [{ op: 'rule-examples', args: { lang: 'de-DE', ruleIds: ids, level: 'PICKY' } }]);
  w(DX, 'examples-de-DE-tempoff-sample', 'DE-0150/0151 rule-examples of 150 sampled ids, unrestricted with enableTempOff + PICKY', 'rule-examples', [{ op: 'rule-examples', args: { lang: 'de-DE', ruleIds: pick(deIds, 150), level: 'PICKY', enableTempOff: true } }]);
  w(DX, 'examples-de-short-code', 'rule-examples with short code de (60 sampled ids)', 'rule-examples', [{ op: 'rule-examples', args: { lang: 'de', ruleIds: sampleIds } }]);
  const res = lists['de-DE']; const iT = col(res, 'defaultTempOff'); const iO = col(res, 'defaultOff'); const iF = col(res, 'sourceFile');
  const ids2 = (p) => [...new Set(res.rules.filter((r) => p(r) && /\.xml$/.test(r[iF] ?? '')).map((r) => r[0].replace(/\[\d+\]$/, '')))];
  const off = ids2((r) => r[iO]); const temp = ids2((r) => r[iT]);
  const offC = chunks(off, 40); const tempC = chunks(temp, 40);
  offC.forEach((c, n) => w(DX, `examples-de-DE-off-${n}`, `DE-0150/0151 rule-examples of default-off XML rules (${c.length} of ${off.length} ids), default and PICKY`, 'rule-examples', [{ op: 'rule-examples', args: { lang: 'de-DE', ruleIds: c } }, { op: 'rule-examples', args: { lang: 'de-DE', ruleIds: c, level: 'PICKY', enableTempOff: true, enabledRules: c } }]));
  tempC.forEach((c, n) => w(DX, `examples-de-DE-tempoff-${n}`, `DE-0150/0151 rule-examples of temp_off XML rules (${c.length} of ${temp.length} ids) with and without enableTempOff`, 'rule-examples', [{ op: 'rule-examples', args: { lang: 'de-DE', ruleIds: c } }, { op: 'rule-examples', args: { lang: 'de-DE', ruleIds: c, enableTempOff: true } }]));
}

// X-DECHECK
const corpus = readFileSync(path.join(ROOT, 'oracle/corpus/de/corpus.txt'), 'utf8');
const paras = corpus.split('\n\n').map((p) => p.trim()).filter(Boolean);
for (const v of [...VARS, 'de']) {
  for (const level of ['DEFAULT', 'PICKY']) {
    if (v === 'de' && level === 'PICKY') continue;
    chunks(paras, 14).forEach((c, n) => w(DC, `corpus-${v}-${level.toLowerCase()}-${n}`, `DE full check corpus ${v} ${level}, all default rules, paragraphs ${n * 14}..`, 'check',
      c.map((text) => ({ op: 'check', args: { lang: v, text, level } }))));
  }
}
const EDGE = ['', ' ', 'x', 'Ünï cödé wörds — „Zitat“ ‚text‘ »so« «so».', 'a'.repeat(300), 'Zeile eins.\nZeile zwei.', 'Tab\tgetrennt.', '1234 5678.', '😀 Emoji 😀.', 'Ich habe ein Auto gekauft. Die Haus ist groß , und und das das Ende.', 'Der Mann gehen nach Hause. Ein schöne Frau kommen. Wir hast keine Zeit.\n\nZweiter Absatz  mit  Leerzeichen.  und kleiner Anfang.', 'Stundenkilometer, Donaudampfschifffahrtsgesellschaft, Arbeitszeit-Gesetz, Auto-Bahn, Kaffe Maschine.', 'Ein „Zitat (ohne Ende“ mit ) unpaarigen [Klammern.', 'Er sagte: „Das ist gut.“ 5 km, 5km, 10 Prozent, 100 °C. Am 3.4.2020 um 12 Uhr, bis 31. Februar.', 'Das das ist ein Test. Sehr sehr gut. Ich ich bin hier. Wegen dem Regen kommt er nicht, weil er ist krank.', 'Gruss aus der Schweiz: Strasse, grösser, Fussball, daß, dass, muß.', 'Ich fahre nach Wien. Das ist in Österreich. Der Jänner ist kalt, der Paradeiser teuer.', 'TRGS - Technische Regeln für Gefahrstoffe', 'Stundenkilometer'];
for (const v of [...VARS, 'de']) w(DC, `edge-${v}`, `DE full check edge and targeted texts ${v} (DEFAULT, PICKY)`, 'check', [...EDGE.map((text) => ({ op: 'check', args: { lang: v, text } })), ...EDGE.map((text) => ({ op: 'check', args: { lang: v, text, level: 'PICKY' } }))]);
w(DC, 'positions-de-DE', 'DE-0226 testPositionsWithGerman / testCleanOverlappingWithGerman (AnnotatedText, Mode.ALL, PICKY, ParagraphHandling.NORMAL) plus DEFAULT/ALL variants', 'check',
  ['Stundenkilometer', 'TRGS - Technische Regeln für Gefahrstoffe'].flatMap((text) => ['DEFAULT', 'PICKY'].flatMap((level) => ['ALL', 'ALL_BUT_TEXTLEVEL_ONLY', 'TEXTLEVEL_ONLY'].map((mode) => ({ op: 'check', args: { lang: 'de-DE', text, level, mode } })))));
const tx = paras.slice(0, 6);
w(DC, 'modes-de-DE', 'DE check Mode / paragraph handling, de-DE', 'check',
  ['ALL', 'TEXTLEVEL_ONLY', 'ALL_BUT_TEXTLEVEL_ONLY'].flatMap((mode) => ['DEFAULT', 'PICKY'].flatMap((level) => tx.map((text) => ({ op: 'check', args: { lang: 'de-DE', text, mode, level } })))).concat(
    ['NORMAL', 'ONLYPARA', 'ONLYNONPARA'].flatMap((paraMode) => tx.slice(0, 3).map((text) => ({ op: 'check', args: { lang: 'de-DE', text, paraMode } })))));
w(DC, 'tones-de-DE', 'DE check tone tags PICKY de-DE', 'check',
  ['ALL_TONE_RULES', 'NO_TONE_RULE', 'ALL_WITHOUT_GOAL_SPECIFIC', 'academic', 'clarity', 'persuasive', 'formal', 'informal', 'positive', 'scientific', 'general', 'professional', 'confident', 'objective', 'povrem', 'povadd'].flatMap((t) => tx.slice(0, 2).map((text) => ({ op: 'check', args: { lang: 'de-DE', text, level: 'PICKY', toneTags: [t] } }))));
for (const v of VARS) w(DC, `tempoff-${v}`, `DE check with enableTempOff, corpus paragraphs, ${v}, PICKY`, 'check', paras.map((text) => ({ op: 'check', args: { lang: v, text, level: 'PICKY', enableTempOff: true } })));
w(DC, 'selection-de-DE', 'DE check rule/category enable/disable options de-DE', 'check',
  [{ enabledRules: ['DE_AGREEMENT', 'UPPERCASE_SENTENCE_START', 'COMMA_PARENTHESIS_WHITESPACE'], enabledOnly: true }, { disabledCategories: ['TYPOS', 'GRAMMAR'] }, { disabledCategories: ['TYPOGRAPHY', 'PUNCTUATION', 'CASING'], level: 'PICKY' }, { enabledCategories: ['REDUNDANCY', 'STYLE', 'COLLOQUIALISMS'], level: 'PICKY' }, { disabledRules: ['GERMAN_SPELLER_RULE', 'DE_CASE', 'DE_AGREEMENT', 'UPPERCASE_SENTENCE_START', 'GERMAN_WORD_REPEAT_RULE'] }, { enabledCategories: ['WIKIPEDIA', 'GENDER_NEUTRALITY', 'EMPFOHLENE_RECHTSCHREIBUNG'], enabledOnly: false, level: 'PICKY' }, { enabledRules: ['PASSIVE_SENTENCE_DE', 'FILLER_WORDS_DE'], level: 'PICKY' }]
    .flatMap((o) => EDGE.slice(9, 16).concat(tx.slice(0, 2)).map((text) => ({ op: 'check', args: { lang: 'de-DE', text, ...o } }))));
for (const m of MTS) w(DC, `mothertongue-${m}`, `DE check with mother tongue ${m}`, 'check',
  ['de-DE', 'de-CH'].flatMap((lang) => [...EDGE.slice(9, 16), ...tx.slice(0, 2)].map((text) => ({ op: 'check', args: { lang, text, level: 'PICKY', motherTongue: m } }))));
w(DC, 'analyze-de', 'DE-0226 JLanguageTool#analyzeText with German variants (pre-disambiguation for de-DE)', 'analyze',
  [...VARS, 'de'].flatMap((v) => [...EDGE.slice(2, 17), ...tx.slice(0, 2)].map((text) => ({ op: 'analyze', args: { lang: v, text, preDisambiguation: v === 'de-DE' } }))));
w(DC, 'tools-correct-de', 'Tools.correctText with the German rule set', 'jsonl',
  [...VARS, 'de'].map((v) => ({ op: 'tools-correct', args: { lang: v, texts: [...EDGE.slice(2, 17), ...paras.slice(0, 6)] } })));
w(DC, 'markup-like-de', 'DE check of markup-like plain text', 'check',
  ['<b>fett</b> Text sind falsch.', '&amp; &lt;tag&gt; und <br/> Zeile', '<p>Hallo  Welt</p><p>zweiter</p>', '[[Link|Text]] und {{Vorlage}} hier gehen nicht', '<marker>x</marker> geht nicht', 'http://example.com/a?b=c&d=e wird ignoriert, www.beispiel.at auch. Mail: a@b.com', 'GROSSBUCHSTABEN SATZ IST OK. 2020-10-12 und 12.10.2020 und 3,14.'].map((text) => ({ op: 'check', args: { lang: 'de-DE', text, level: 'PICKY' } })));
// DE-0181 word_definitions via ShortDescriptionProvider
{
  const lines = readFileSync(path.join(ROOT, 'resources/org/languagetool/resource/de/word_definitions.txt'), 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#'));
  const wordsAll = [...new Set(lines.map((l) => l.split('\t')[0]))];
  const variants = wordsAll.flatMap((x) => [x, x.charAt(0).toUpperCase() + x.slice(1), x.toUpperCase(), ` ${x}`]);
  chunks(variants, 1200).forEach((c, n) => w(DC, `shortdesc-${String(n).padStart(2, '0')}`, `DE-0181 ShortDescriptionProvider over word_definitions.txt words (+case/space variants), chunk ${n}`, 'jsonl',
    [{ op: 'replace-check', args: { mode: 'shortdesc', lang: 'de-DE', words: c } }]));
  w(DC, 'shortdesc-variants', 'DE-0181 ShortDescriptionProvider language variants and edge inputs', 'jsonl',
    [...VARS, 'de'].map((v) => ({ op: 'replace-check', args: { mode: 'shortdesc', lang: v, words: wordsAll.slice(0, 30).concat(['', ' ', 'nonexistent', '#x', 'a\tb', 'Ünï', 'x'.repeat(500)]) } })));
}
console.log('ok');
