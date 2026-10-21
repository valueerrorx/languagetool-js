// Authors oracle/cases/X-FRRULES-XML (F63: rule lists, rule-examples) and X-FRCHECK (full-check corpus, integration). Inputs only; probes the harness for counts/ids. Docs: docs/review/F63-oracle.md.
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { ROOT, preflight } from '../lib/env.mjs';
import { runHarness } from '../lib/harness-run.mjs';

preflight();
const mk = (id) => { const d = path.join(ROOT, 'oracle/cases', id); rmSync(d, { recursive: true, force: true }); mkdirSync(d, { recursive: true }); return d; };
const DX = mk('X-FRRULES-XML'); const DC = mk('X-FRCHECK');
const w = (dir, name, description, compare, ops, normalize = ['paths']) => writeFileSync(path.join(dir, `${name}.json`), JSON.stringify({ kind: 'harness', clock: 'fixed', description, normalize, compare, ops }) + '\n');
const sha = (s) => createHash('sha1').update(String(s)).digest('hex');
const pick = (a, n) => [...a].sort((x, y) => (sha(x) < sha(y) ? -1 : 1)).slice(0, n);
const chunks = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, (i + 1) * n));
const VARS = ['fr-FR', 'fr-BE', 'fr-CA', 'fr-CH'];
const MTS = ['en', 'de'];

const probeOps = [];
for (const v of VARS) probeOps.push({ op: 'en-rulelist', args: { kind: 'lt', lang: v } });
probeOps.push({ op: 'rule-examples', args: { lang: 'fr-FR', offset: 0, limit: 0, unrestricted: false } });
const pr = (await runHarness({ clock: 'fixed', ops: probeOps })).responses.split('\n').filter(Boolean).map((l) => JSON.parse(l));
if (pr.some((r) => !r.ok)) throw new Error('probe failed: ' + JSON.stringify(pr.find((r) => !r.ok)).slice(0, 500));
const lists = Object.fromEntries(VARS.map((v, i) => [v, pr[i].result]));
const exCount = pr[VARS.length].result.rulesWithExamples;
const col = (res, n) => res.columns.indexOf(n);
const idsOf = (res, pred) => [...new Set(res.rules.filter((r) => pred(r[col(res, 'sourceFile')] ?? '')).map((r) => r[0].replace(/\[\d+\]$/, '')))];

// rule lists
w(DX, 'rulelist-direct-fr', 'FR-0002 French#getRelevantRules (+LM/capable/remote, null LM) per variant, mother tongues none/en/de', 'jsonl',
  [...VARS, 'fr'].flatMap((v) => [undefined, ...MTS].map((m) => ({ op: 'en-rulelist', args: { kind: 'direct', lang: v, ...(m ? { motherTongue: m } : {}) } }))));
for (const v of [...VARS, 'fr']) w(DX, `rulelist-all-${v}`, `FR-0002/0150/0151 JLanguageTool rule list (${v}): order, class, category, default off/temp_off, activity at DEFAULT/PICKY`, 'jsonl', [{ op: 'en-rulelist', args: { kind: 'lt', lang: v } }]);
for (const m of MTS) w(DX, `rulelist-all-fr-FR-mt-${m}`, `FR-0002 JLanguageTool rule list fr-FR with mother tongue ${m}`, 'jsonl', [{ op: 'en-rulelist', args: { kind: 'lt', lang: 'fr-FR', motherTongue: m } }]);
w(DX, 'rulelist-contentop', 'FR-0002 ContentOps rules-list (fr, fr-FR, fr-BE, fr-CA, fr-CH)', 'jsonl', [...VARS, 'fr'].map((v) => ({ op: 'rules-list', args: { lang: v } })));

// rule-examples
const PER = 150;
for (let i = 0, n = 0; i < exCount; i += PER, n++) {
  w(DX, `examples-fr-FR-${String(n).padStart(3, '0')}`, `FR-0150/0151 rule-examples fr-FR rules ${i}..${i + PER - 1} (restricted + unrestricted check)`, 'rule-examples', [{ op: 'rule-examples', args: { lang: 'fr-FR', offset: i, limit: PER } }]);
}
const frIds = idsOf(lists['fr-FR'], () => true);
const sampleIds = pick(frIds, 60);
for (const v of ['fr-BE', 'fr-CA', 'fr-CH']) {
  w(DX, `examples-${v}-sample`, `rule-examples of 60 sampled fr-FR ids run under ${v}`, 'rule-examples', [{ op: 'rule-examples', args: { lang: v, ruleIds: sampleIds } }]);
  w(DX, `examples-${v}-sample-picky`, `rule-examples of 60 sampled fr-FR ids run under ${v}, unrestricted at PICKY`, 'rule-examples', [{ op: 'rule-examples', args: { lang: v, ruleIds: pick(frIds.map((x) => x + '.'), 60).map((x) => x.slice(0, -1)), level: 'PICKY' } }]);
}
{
  w(DX, 'examples-fr-FR-tempoff-sample', 'FR-0150/0151 rule-examples of 150 sampled ids, unrestricted with enableTempOff + PICKY', 'rule-examples', [{ op: 'rule-examples', args: { lang: 'fr-FR', ruleIds: pick(frIds, 150), level: 'PICKY', enableTempOff: true } }]);
  w(DX, 'examples-fr-short-code', 'rule-examples with short code fr (60 sampled ids)', 'rule-examples', [{ op: 'rule-examples', args: { lang: 'fr', ruleIds: sampleIds } }]);
  const res = lists['fr-FR']; const iT = col(res, 'defaultTempOff'); const iO = col(res, 'defaultOff'); const iF = col(res, 'sourceFile');
  const ids2 = (p) => [...new Set(res.rules.filter((r) => p(r) && /\.xml$/.test(r[iF] ?? '')).map((r) => r[0].replace(/\[\d+\]$/, '')))];
  const off = ids2((r) => r[iO]); const temp = ids2((r) => r[iT]);
  chunks(off, 40).forEach((c, n) => w(DX, `examples-fr-FR-off-${n}`, `FR-0150/0151 rule-examples of default-off XML rules (${c.length} of ${off.length} ids), default and PICKY`, 'rule-examples', [{ op: 'rule-examples', args: { lang: 'fr-FR', ruleIds: c } }, { op: 'rule-examples', args: { lang: 'fr-FR', ruleIds: c, level: 'PICKY', enableTempOff: true, enabledRules: c } }]));
  chunks(temp, 40).forEach((c, n) => w(DX, `examples-fr-FR-tempoff-${n}`, `FR-0150/0151 rule-examples of temp_off XML rules (${c.length} of ${temp.length} ids) with and without enableTempOff`, 'rule-examples', [{ op: 'rule-examples', args: { lang: 'fr-FR', ruleIds: c } }, { op: 'rule-examples', args: { lang: 'fr-FR', ruleIds: c, enableTempOff: true } }]));
}

// X-FRCHECK
const corpus = readFileSync(path.join(ROOT, 'oracle/corpus/fr/corpus.txt'), 'utf8');
const paras = corpus.split('\n\n').map((p) => p.trim()).filter(Boolean);
for (const v of [...VARS, 'fr']) {
  for (const level of ['DEFAULT', 'PICKY']) {
    if (v === 'fr' && level === 'PICKY') continue;
    chunks(paras, 14).forEach((c, n) => w(DC, `corpus-${v}-${level.toLowerCase()}-${n}`, `FR full check corpus ${v} ${level}, all default rules, paragraphs ${n * 14}..`, 'check',
      c.map((text) => ({ op: 'check', args: { lang: v, text, level } }))));
  }
}
const EDGE = ['', ' ', 'x', 'Ünï cödé wörds — « Citation » “text” ‹ainsi› „so“.', 'a'.repeat(300), 'Ligne une.\nLigne deux.', 'Tab\tséparé.', '1234 5678.', '😀 Emoji 😀.', 'Je suis aller au marché. Les maison est grand , et et le le fin.', 'Il a mangé des pomme. Nous avons mangés la tarte. Elles sont parti hier.\n\nDeuxième paragraphe  avec  espaces.  et début minuscule.', 'Un l’homme, qu’est-ce que c’est, c’est-à-dire, aujourd’hui, l\'arbre, s\'il vous plait.', 'Une « citation (sans fin » avec ) parenthèses [non fermées.', 'Il a dit : « C’est bon. » 5 km, 5km, 10 %, 100 °C. Le 3.4.2020 à 12 h, le 31 février.', 'Le le chat est la. Très très bien. Je je suis ici. A cause de la pluie il ne vient pas, car il est malade.', 'Septante et nonante en Belgique et en Suisse ; soixante-dix en France. Le déjeuner, le dîner, le souper. La poutine au Québec, le courriel, le magasinage.', 'Paris est la capitale de la France. Montréal est au Québec. Bruxelles est en Belgique. Genève est en Suisse.', 'Les chiens est gentils ; la voiture rouges roule. Ils ont manger.'];
for (const v of [...VARS, 'fr']) w(DC, `edge-${v}`, `FR full check edge and targeted texts ${v} (DEFAULT, PICKY)`, 'check', [...EDGE.map((text) => ({ op: 'check', args: { lang: v, text } })), ...EDGE.map((text) => ({ op: 'check', args: { lang: v, text, level: 'PICKY' } }))]);
const tx = paras.slice(0, 6);
w(DC, 'modes-fr-FR', 'FR check Mode / paragraph handling, fr-FR', 'check',
  ['ALL', 'TEXTLEVEL_ONLY', 'ALL_BUT_TEXTLEVEL_ONLY'].flatMap((mode) => ['DEFAULT', 'PICKY'].flatMap((level) => tx.map((text) => ({ op: 'check', args: { lang: 'fr-FR', text, mode, level } })))).concat(
    ['NORMAL', 'ONLYPARA', 'ONLYNONPARA'].flatMap((paraMode) => tx.slice(0, 3).map((text) => ({ op: 'check', args: { lang: 'fr-FR', text, paraMode } })))));
w(DC, 'tones-fr-FR', 'FR check tone tags PICKY fr-FR', 'check',
  ['ALL_TONE_RULES', 'NO_TONE_RULE', 'ALL_WITHOUT_GOAL_SPECIFIC', 'academic', 'clarity', 'persuasive', 'formal', 'informal', 'positive', 'scientific', 'general', 'professional', 'confident', 'objective', 'povrem', 'povadd'].flatMap((t) => tx.slice(0, 2).map((text) => ({ op: 'check', args: { lang: 'fr-FR', text, level: 'PICKY', toneTags: [t] } }))));
for (const v of VARS) w(DC, `tempoff-${v}`, `FR check with enableTempOff, corpus paragraphs, ${v}, PICKY`, 'check', paras.map((text) => ({ op: 'check', args: { lang: v, text, level: 'PICKY', enableTempOff: true } })));
w(DC, 'selection-fr-FR', 'FR check rule/category enable/disable options fr-FR', 'check',
  [{ enabledRules: ['UPPERCASE_SENTENCE_START', 'COMMA_PARENTHESIS_WHITESPACE', 'FRENCH_WHITESPACE'], enabledOnly: true }, { disabledCategories: ['TYPOS', 'GRAMMAR'] }, { disabledCategories: ['TYPOGRAPHY', 'PUNCTUATION', 'CASING'], level: 'PICKY' }, { enabledCategories: ['REDUNDANCY', 'STYLE', 'CAT_TYPOGRAPHIE'], level: 'PICKY' }, { disabledRules: ['FR_SPELLING_RULE', 'UPPERCASE_SENTENCE_START', 'DOUBLE_PUNCTUATION', 'WHITESPACE_RULE'] }, { enabledCategories: ['CAT_GRAMMAIRE', 'CAT_HOMONYMES_PARONYMES', 'MULTITOKEN_SPELLING'], enabledOnly: false, level: 'PICKY' }]
    .flatMap((o) => EDGE.slice(9, 17).concat(tx.slice(0, 2)).map((text) => ({ op: 'check', args: { lang: 'fr-FR', text, ...o } }))));
for (const m of MTS) w(DC, `mothertongue-${m}`, `FR check with mother tongue ${m}`, 'check',
  ['fr-FR', 'fr-CH'].flatMap((lang) => [...EDGE.slice(9, 17), ...tx.slice(0, 2)].map((text) => ({ op: 'check', args: { lang, text, level: 'PICKY', motherTongue: m } }))));
w(DC, 'analyze-fr', 'FR JLanguageTool#analyzeText with French variants', 'analyze',
  [...VARS, 'fr'].flatMap((v) => [...EDGE.slice(2, 18), ...tx.slice(0, 2)].map((text) => ({ op: 'analyze', args: { lang: v, text } }))));
w(DC, 'tools-correct-fr', 'Tools.correctText with the French rule set', 'jsonl',
  [...VARS, 'fr'].map((v) => ({ op: 'tools-correct', args: { lang: v, texts: [...EDGE.slice(2, 18), ...paras.slice(0, 6)] } })));
w(DC, 'markup-like-fr', 'FR check of markup-like plain text', 'check',
  ['<b>gras</b> Texte sont faux.', '&amp; &lt;tag&gt; et <br/> ligne', '<p>Bonjour  monde</p><p>deuxième</p>', '[[Lien|Texte]] et {{Modèle}} ici vont pas', '<marker>x</marker> ne va pas', 'http://example.com/a?b=c&d=e est ignoré, www.exemple.fr aussi. Mail : a@b.com', 'MAJUSCULES PHRASE EST OK. 2020-10-12 et 12.10.2020 et 3,14.'].map((text) => ({ op: 'check', args: { lang: 'fr-FR', text, level: 'PICKY' } })));
console.log('ok');
