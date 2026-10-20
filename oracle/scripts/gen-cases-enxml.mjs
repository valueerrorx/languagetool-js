// Authors oracle/cases/X-ENRULES-XML (F50: rule lists, rule-examples) and X-ENCHECK (full-check corpus, integration, word_definitions). Inputs only; probes the harness for counts/ids. Docs: docs/review/F50-oracle.md.
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { ROOT, preflight } from '../lib/env.mjs';
import { runHarness } from '../lib/harness-run.mjs';

preflight();
const mk = (id) => { const d = path.join(ROOT, 'oracle/cases', id); rmSync(d, { recursive: true, force: true }); mkdirSync(d, { recursive: true }); return d; };
const DX = mk('X-ENRULES-XML'); const DC = mk('X-ENCHECK');
const w = (dir, name, description, compare, ops, normalize = ['paths']) => writeFileSync(path.join(dir, `${name}.json`), JSON.stringify({ kind: 'harness', clock: 'fixed', description, normalize, compare, ops }) + '\n');
const sha = (s) => createHash('sha1').update(String(s)).digest('hex');
const pick = (a, n) => [...a].sort((x, y) => (sha(x) < sha(y) ? -1 : 1)).slice(0, n);
const chunks = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, (i + 1) * n));
const VARS = ['en-US', 'en-GB', 'en-AU', 'en-CA', 'en-NZ', 'en-ZA'];
const MTS = ['de', 'fr', 'es', 'nl'];

// probe: rule lists per variant (+ L2 mother tongues) and example counts
const probeOps = [];
for (const v of VARS) probeOps.push({ op: 'en-rulelist', args: { kind: 'lt', lang: v } });
for (const m of ['de', 'fr']) probeOps.push({ op: 'en-rulelist', args: { kind: 'lt', lang: 'en-US', motherTongue: m } });
for (const v of VARS) probeOps.push({ op: 'rule-examples', args: { lang: v, offset: 0, limit: 0, unrestricted: false } });
const pr = (await runHarness({ clock: 'fixed', ops: probeOps })).responses.split('\n').filter(Boolean).map((l) => JSON.parse(l));
if (pr.some((r) => !r.ok)) throw new Error('probe failed');
const lists = Object.fromEntries(VARS.map((v, i) => [v, pr[i].result]));
const l2 = { de: pr[6].result, fr: pr[7].result };
const exCount = Object.fromEntries(VARS.map((v, i) => [v, pr[8 + i].result.rulesWithExamples]));
const col = (res, n) => res.columns.indexOf(n);
const idsOf = (res, pred) => [...new Set(res.rules.filter((r) => pred(r[col(res, 'sourceFile')] ?? '')).map((r) => r[0].replace(/\[\d+\]$/, '')))];
const variantIds = (v) => idsOf(lists[v], (f) => f.includes(`/en/${v}/`) || f.includes(`/${v}/`));
const l2Ids = (m) => idsOf(l2[m], (f) => f.includes(`grammar-l2-${m}`));

// rule lists
for (const v of VARS) {
  w(DX, `rulelist-direct-${v}`, `EN-0002 English#getRelevantRules/LanguageModel/Capable/Remote rules (${v}), no mother tongue and de/fr/es/nl`, 'jsonl',
    [undefined, ...MTS].map((m) => ({ op: 'en-rulelist', args: { kind: 'direct', lang: v, ...(m ? { motherTongue: m } : {}) } })));
  w(DX, `rulelist-all-${v}`, `EN-0002/0150..0158 JLanguageTool rule list (${v}): order, class, category, default off/temp_off, activity at DEFAULT/PICKY`, 'jsonl',
    [{ op: 'en-rulelist', args: { kind: 'lt', lang: v } }]);
}
for (const m of MTS) w(DX, `rulelist-all-en-US-mt-${m}`, `EN-0002/0152/0153 JLanguageTool rule list en-US with mother tongue ${m}`, 'jsonl', [{ op: 'en-rulelist', args: { kind: 'lt', lang: 'en-US', motherTongue: m } }]);
w(DX, 'rulelist-contentop', 'EN-0002 ContentOps rules-list (en-US, en-GB, en-AU, en-CA, en-NZ, en-ZA, with metadata, urls, example counts)', 'jsonl', VARS.map((v) => ({ op: 'rules-list', args: { lang: v } })));

// rule-examples: en-US all rules chunked; variants: variant-specific rules + hash sample of en-US ids
const PER = 120;
for (let i = 0, n = 0; i < exCount['en-US']; i += PER, n++) {
  w(DX, `examples-en-US-${String(n).padStart(3, '0')}`, `EN-0150..0154 rule-examples en-US rules ${i}..${i + PER - 1} (restricted + unrestricted check)`, 'rule-examples', [{ op: 'rule-examples', args: { lang: 'en-US', offset: i, limit: PER } }]);
}
const usIds = idsOf(lists['en-US'], () => true);
const sampleIds = pick(usIds, 40);
for (const v of VARS.filter((x) => x !== 'en-US')) {
  const ids = variantIds(v);
  if (ids.length) { // en-ZA has no own XML (empty ruleIds would mean all rules)
  w(DX, `examples-${v}-variant`, `EN-0155..0158 rule-examples of ${v}-specific rules (${ids.length} ids), default level`, 'rule-examples', [{ op: 'rule-examples', args: { lang: v, ruleIds: ids } }]);
  w(DX, `examples-${v}-variant-picky`, `EN-0155..0158 rule-examples of ${v}-specific rules, unrestricted check at PICKY`, 'rule-examples', [{ op: 'rule-examples', args: { lang: v, ruleIds: ids, level: 'PICKY' } }]);
  }
  w(DX, `examples-${v}-sample`, `rule-examples of 40 sampled en-US rule ids run under ${v}`, 'rule-examples', [{ op: 'rule-examples', args: { lang: v, ruleIds: sampleIds } }]);
}
{
  const ids = variantIds('en-US');
  w(DX, 'examples-en-US-variant-picky', `EN-0154 rule-examples of en-US-specific rules (${ids.length} ids), unrestricted at PICKY`, 'rule-examples', [{ op: 'rule-examples', args: { lang: 'en-US', ruleIds: ids, level: 'PICKY' } }]);
}
for (const m of ['de', 'fr']) {
  const ids = l2Ids(m);
  w(DX, `examples-l2-${m}`, `EN-0152/0153 rule-examples of grammar-l2-${m}.xml (${ids.length} ids) with mother tongue ${m} (and unrestricted check with it)`, 'rule-examples', [{ op: 'rule-examples', args: { lang: 'en-US', motherTongue: m, ruleIds: ids } }]);
  w(DX, `examples-l2-${m}-nomt`, `EN-0152/0153 same ids without mother tongue (no rules expected)`, 'rule-examples', [{ op: 'rule-examples', args: { lang: 'en-US', ruleIds: ids } }]);
}
// style.xml rules at PICKY and rules with temp_off enabled (all en-US rules with examples, unrestricted with enableTempOff)
w(DX, 'examples-en-US-tempoff-sample', 'EN-0150/0151 rule-examples of 120 sampled en-US ids, unrestricted check with enableTempOff + PICKY', 'rule-examples', [{ op: 'rule-examples', args: { lang: 'en-US', ruleIds: pick(usIds, 120), level: 'PICKY', enableTempOff: true } }]);
{
  const res = lists['en-US']; const iT = col(res, 'defaultTempOff'); const iO = col(res, 'defaultOff'); const iF = col(res, 'sourceFile');
  const ids = (p) => [...new Set(res.rules.filter((r) => p(r) && /\.xml$/.test(r[iF] ?? '')).map((r) => r[0].replace(/\[\d+\]$/, '')))];
  const off = ids((r) => r[iO]); const temp = ids((r) => r[iT]);
  w(DX, 'examples-en-US-off', `EN-0150/0151 rule-examples of all default-off XML rules (${off.length} ids), default and PICKY`, 'rule-examples', [{ op: 'rule-examples', args: { lang: 'en-US', ruleIds: off } }, { op: 'rule-examples', args: { lang: 'en-US', ruleIds: off, level: 'PICKY', enableTempOff: true, enabledRules: off } }]);
  w(DX, 'examples-en-US-tempoff', `EN-0150/0151 rule-examples of all temp_off XML rules (${temp.length} ids) with and without enableTempOff`, 'rule-examples', [{ op: 'rule-examples', args: { lang: 'en-US', ruleIds: temp } }, { op: 'rule-examples', args: { lang: 'en-US', ruleIds: temp, enableTempOff: true } }]);
}

// X-ENCHECK: full-check corpus per variant, ids []
const corpus = readFileSync(path.join(ROOT, 'oracle/corpus/en/corpus.txt'), 'utf8');
const paras = corpus.split('\n\n').map((p) => p.trim()).filter(Boolean);
for (const v of VARS) {
  for (const level of ['DEFAULT', 'PICKY']) {
    chunks(paras, 25).forEach((c, n) => w(DC, `corpus-${v}-${level.toLowerCase()}-${n}`, `EN full check corpus ${v} ${level}, all default rules, paragraphs ${n * 25}..`, 'check',
      c.map((text) => ({ op: 'check', args: { lang: v, text, level } }))));
  }
}
const EDGE = ['', ' ', 'x', 'Ünï cödé wörds — “quoted” ‘text’.', 'a'.repeat(300), 'Line one.\nLine two.', 'Tab\tseparated.', '1234 5678.', '😀 emoji 😀.', 'I has a apple. He go home. Their is a error here , and and the the end.', 'This sentence are wrong. It dont work. Me and him goes.\n\nSecond paragraph  with  spaces.  And lowercase start.', 'Its a nice day, isnt it? Colour, color, centre, center, organise, organize, realise.', 'A "quoted (text" with ) unbalanced [brackets.', 'He said: "It\'s fine." She replied: “No.” 5 km, 5km, 10 mph, 100 °F. 3 feet and 5 inches.', 'The the quick brown fox jumped over the lazy dog dog. Very very good. I I am.'];
for (const v of VARS) {
  w(DC, `edge-${v}`, `EN full check edge and targeted texts ${v} (DEFAULT, PICKY)`, 'check', [...EDGE.map((text) => ({ op: 'check', args: { lang: v, text } })), ...EDGE.map((text) => ({ op: 'check', args: { lang: v, text, level: 'PICKY' } }))]);
}
const tx = paras.slice(0, 6);
w(DC, 'modes-en-US', 'EN check Mode TEXTLEVEL_ONLY / ALL_BUT_TEXTLEVEL_ONLY / ALL and paragraph handling, en-US', 'check',
  ['ALL', 'TEXTLEVEL_ONLY', 'ALL_BUT_TEXTLEVEL_ONLY'].flatMap((mode) => ['DEFAULT', 'PICKY'].flatMap((level) => tx.map((text) => ({ op: 'check', args: { lang: 'en-US', text, mode, level } })))).concat(
    ['NORMAL', 'ONLYPARA', 'ONLYNONPARA'].flatMap((paraMode) => tx.slice(0, 3).map((text) => ({ op: 'check', args: { lang: 'en-US', text, paraMode } })))));
w(DC, 'tones-en-US', 'EN check tone tags (ALL_TONE_RULES, NO_TONE_RULE, FORMAL, ACADEMIC, ...) PICKY en-US', 'check',
  ['ALL_TONE_RULES', 'NO_TONE_RULE', 'ALL_WITHOUT_GOAL_SPECIFIC', 'academic', 'clarity', 'persuasive', 'formal', 'informal', 'positive', 'scientific', 'general', 'professional', 'confident', 'objective', 'povrem', 'povadd'].flatMap((t) => tx.slice(0, 2).map((text) => ({ op: 'check', args: { lang: 'en-US', text, level: 'PICKY', toneTags: [t] } }))));
w(DC, 'tempoff-en-US', 'EN check with enableTempOff, corpus paragraphs, en-US and en-GB, PICKY', 'check',
  ['en-US', 'en-GB'].flatMap((lang) => paras.slice(0, 25).map((text) => ({ op: 'check', args: { lang, text, level: 'PICKY', enableTempOff: true } }))));
w(DC, 'selection-en-US', 'EN check rule/category enable/disable options (enabledOnly, disabledCategories, enabledCategories) en-US', 'check',
  [{ enabledRules: ['EN_A_VS_AN', 'UPPERCASE_SENTENCE_START', 'COMMA_PARENTHESIS_WHITESPACE'], enabledOnly: true }, { disabledCategories: ['TYPOS', 'GRAMMAR'] }, { disabledCategories: ['TYPOGRAPHY', 'PUNCTUATION', 'CASING'], level: 'PICKY' }, { enabledCategories: ['REDUNDANCY', 'PLAIN_ENGLISH', 'STYLE'], level: 'PICKY' }, { disabledRules: ['MORFOLOGIK_RULE_EN_US', 'EN_A_VS_AN', 'UPPERCASE_SENTENCE_START', 'ENGLISH_WORD_REPEAT_RULE'] }, { enabledCategories: ['WIKIPEDIA', 'TON_ACADEMIC', 'CREATIVE_WRITING'], enabledOnly: false, level: 'PICKY' }, { enabledRules: ['PASSIVE_VOICE'], level: 'PICKY' }]
    .flatMap((o) => EDGE.slice(9, 15).concat(tx.slice(0, 2)).map((text) => ({ op: 'check', args: { lang: 'en-US', text, ...o } }))));
const L2 = ['I have a gift for my brother. Actually I become a new car.', 'He is more tall than me. I am agree with you. I go to the cinema since two years.', 'Where did you went yesterday? I look forward to see you. Do you make a hurry?', 'I have 25 years. It depends of you. She has make a mistake. We assist at the meeting.', 'Say me what happened. I want that you come. He told that he would come.'];
for (const m of MTS) w(DC, `mothertongue-${m}`, `EN check with mother tongue ${m} (L2 rules, false-friend rules need an n-gram LM and are absent)`, 'check',
  ['en-US', 'en-GB'].flatMap((lang) => [...L2, ...tx.slice(0, 2)].flatMap((text) => ['DEFAULT', 'PICKY'].map((level) => ({ op: 'check', args: { lang, text, level, motherTongue: m } })))));
// integration EN-0220/0222: analyze (analyzed sentence output), Tools.correct
w(DC, 'analyze-en', 'EN-0222 JLanguageTool#analyzeText with English variants (pre-disambiguation too)', 'analyze',
  VARS.flatMap((v) => [...EDGE.slice(2, 13), ...tx.slice(0, 2)].map((text) => ({ op: 'analyze', args: { lang: v, text, preDisambiguation: v === 'en-US' } }))));
w(DC, 'tools-correct-en', 'EN-0220 Tools.correctText with the English rule set', 'jsonl',
  VARS.map((v) => ({ op: 'tools-correct', args: { lang: v, texts: [...EDGE.slice(2), ...L2, ...paras.slice(0, 6)] } })));
w(DC, 'annotated-text-en', 'EN-0220 check on text with fake markup / empty content is covered by X-TEXT annotated-text; here: check of markup-like plain text', 'check',
  ['<b>bold</b> text is are wrong.', '&amp; &lt;tag&gt; and <br/> line', '<p>Hello  world</p><p>second</p>', '[[link|text]] and {{template}} here dont work', '<marker>x</marker> does not work', 'http://example.com/a?b=c&d=e should be ignored, www.example.org too. Mail: a@b.com', 'ALL CAPS SENTENCE IS FINE. 2020-10-12 and 12/10/2020 and 3.14.'].map((text) => ({ op: 'check', args: { lang: 'en-US', text, level: 'PICKY' } })));
// EN-0178 word_definitions: every word of the data file via ShortDescriptionProvider
{
  const lines = readFileSync(path.join(ROOT, 'resources/org/languagetool/resource/en/word_definitions.txt'), 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#'));
  const wordsAll = [...new Set(lines.map((l) => l.split('\t')[0]))];
  const variants = wordsAll.flatMap((x) => [x, x.charAt(0).toUpperCase() + x.slice(1), x.toUpperCase(), ` ${x}`]);
  chunks(variants, 1200).forEach((c, n) => w(DC, `shortdesc-${String(n).padStart(2, '0')}`, `EN-0178 ShortDescriptionProvider over word_definitions.txt words (+case/space variants), chunk ${n}`, 'jsonl',
    [{ op: 'replace-check', args: { mode: 'shortdesc', lang: 'en-US', words: c } }]));
  w(DC, 'shortdesc-variants', 'EN-0178 ShortDescriptionProvider language variants and edge inputs', 'jsonl',
    VARS.map((v) => ({ op: 'replace-check', args: { mode: 'shortdesc', lang: v, words: wordsAll.slice(0, 30).concat(['', ' ', 'nonexistent', '#x', 'a\tb', 'Ünï', 'x'.repeat(500)]) } })));
}
console.log('ok');
