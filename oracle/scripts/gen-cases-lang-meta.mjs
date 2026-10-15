// Authors oracle/cases/X-LANG-META/*.json (inputs only). Ops lang-priority / lang-filter / lang-typo / lang-statics: docs/review/F17-oracle.md.
// Priority ids come from the X-LANG-REGISTRY golden (Java priorityMap keys); run `npm run oracle -- X-LANG-REGISTRY` first.
import { writeFileSync, mkdirSync, readFileSync, rmSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DIR = path.join(ROOT, 'oracle/cases/X-LANG-META');
mkdirSync(DIR, { recursive: true });
for (const f of readdirSync(DIR)) rmSync(path.join(DIR, f));
const VARIANTS = ['de', 'de-DE', 'de-AT', 'de-CH', 'en', 'en-US', 'en-GB', 'en-AU', 'en-CA', 'en-NZ', 'en-ZA', 'fr', 'fr-CA', 'fr-BE', 'fr-CH'];
const write = (name, description, ops) => writeFileSync(path.join(DIR, `${name}.json`), JSON.stringify({ kind: 'harness', clock: 'fixed', description, normalize: [], compare: 'jsonl', ops }, null, 1) + '\n');
const fam = (c) => c.split('-')[0];

// ---- priority ----
const reg = JSON.parse(readFileSync(path.join(ROOT, 'tests/golden/X-LANG-REGISTRY/hooks-wave1/responses.jsonl'), 'utf8').trim().split('\n')[0]).result;
const regReq = JSON.parse(readFileSync(path.join(ROOT, 'tests/golden/X-LANG-REGISTRY/hooks-wave1/requests.jsonl'), 'utf8').trim().split('\n')[0]).args.codes;
const mapKeys = {};
regReq.forEach((c, i) => { mapKeys[c] = Object.keys(reg[i].value.priorityMap); });
const PROBES = {
  de: ['DE_PROHIBITED_COMPOUNDS_X', 'DE_PROHIBITED_COMPOUNDS_PREMIUM_X', 'DE_PROHIBITED_COMPOUNDS_', 'DE_PROHIBITED_COMPOUNDS', 'DE_MULTITOKEN_SPELLING', 'DE_MULTITOKEN_SPELLING_FOO', 'CONFUSION_RULE_', 'CONFUSION_RULE_ABC', 'CONFUSION_RULE', 'CONFUSION_RULE_PREMIUM',
    'AI_DE_HYDRA_LEO', 'AI_DE_HYDRA_LEO_MISSING_COMMA', 'AI_DE_HYDRA_LEO_MISSING_COMMA_X', 'AI_DE_HYDRA_LEO_CP', 'AI_DE_HYDRA_LEO_CP_X', 'AI_DE_HYDRA_LEO_DATAKK', 'AI_DE_HYDRA_LEO_DATAKK_1', 'AI_DE_HYDRA_LEO_FOO', 'AI_DE_KOMMA', 'AI_DE_KOMMA_X',
    'AI_DE_GGEC', 'AI_DE_GGEC_X', 'AI_DE_GGEC_MISSING_PUNCTUATION_E_DASH_MAIL', 'AI_DE_GGEC_REPLACEMENT_ADJECTIVE', 'AI_DE_GGEC_REPLACEMENT_ADVERB', 'AI_DE_GGEC_REPLACEMENT_NOUN', 'AI_DE_GGEC_REPLACEMENT_ORTHOGRAPHY_LOWERCASE', 'AI_DE_GGEC_REPLACEMENT_ORTHOGRAPHY_SPELL', 'AI_DE_GGEC_REPLACEMENT_OTHER', 'AI_DE_GGEC_REPLACEMENT_VERB', 'AI_DE_GGEC_REPLACEMENT_VERB_FORM', 'AI_DE_GGEC_UNNECESSARY_ORTHOGRAPHY_SPACE', 'AI_DE_GGEC_UNNECESSARY_OTHER', 'AI_DE_GGEC_UNNECESSARY_SPACE',
    'AI_DE_GGEC_REPLACEMENT_ADJECTIVE_FORM', 'AI_DE_GGEC_MISSING_ORTHOGRAPHY_SPACE', 'AI_DE_GGEC_MISSING_ORTHOGRAPHY_SPACE_X', 'AI_DE_GGEC_MISSING_PUNCTUATION_PERIOD', 'AI_DE_GGEC_MISSING_PUNCTUATION_PERIOD_X', 'AI_DE_GGEC_UNNECESSARY_PUNCTUATION', 'AI_DE_GGEC_UNNECESSARY_PUNCTUATION_COMMA', 'AI_DE_GGEC_MISSING_PUNCTUATION_COMMA',
    'AI_DE_GGEC_MISSING_PUNCTUATION_12_DASH_JAEHRIG', 'AI_DE_GGEC_MISSING_PUNCTUATION_5_DASH_J_HRIG', 'AI_DE_GGEC_MISSING_PUNCTUATION_X_DASH_JAEHRIG', 'AI_DE_GGEC_MISSING_PUNCTUATION_5_dash_jaehrig', 'AI_DE_GGEC_MISSING_PUNCTUATION_5_DASH_JAEHRIGE', 'AI_DE_GGEC_REPLACEMENT_CONFUSION', 'AI_DE_GGEC_REPLACEMENT_CONFUSION_X', 'AI_DE_GGEC_replacement_confusion', 'AI_DE_GGEC_REPLACEMENT_CONFUSIONS',
    'ai_de_ggec_x', 'GERMAN_SPELLER_RULE', 'german_speller_rule', 'DE_COMPOUNDS', 'DE_COMPOUNDS_X', 'TYPOGRAPHY', 'COLLOQUIALISMS', 'STYLE', 'GENDER_NEUTRALITY', 'REDUNDANCY', 'MY_STYLE_ID', 'REPETITIONS_STYLE', 'TOO_LONG_SENTENCE', 'too_long_sentence', 'TOO_LONG_SENTENCE_X', 'SOME_UNKNOWN_RULE', 'GRAMMAR', 'MISC', 'TYPOS', '', ' ', 'ÄÖÜ_STYLE', 'x'.repeat(500)],
  en: ['EN_COMPOUNDS_', 'EN_COMPOUNDS_FOO', 'EN_COMPOUNDS', 'PRP_VBZ', 'PRP_VBZ_X', 'CONFUSION_RULE_', 'CONFUSION_RULE_ABC', 'CONFUSION_RULE', 'EN_UPPER_CASE_NGRAM', 'EN_UPPER_CASE_NGRAM_X', 'AI_SPELLING_RULE', 'AI_SPELLING_RULE_X', 'EN_MULTITOKEN_SPELLING_', 'EN_MULTITOKEN_SPELLING_US', 'EN_MULTITOKEN_SPELLING', 'EN_GB_SIMPLE_REPLACE', 'EN_GB_SIMPLE_REPLACE_X', 'EN_US_SIMPLE_REPLACE', 'EN_US_SIMPLE_REPLACE_Y', 'QB_EN_OXFORD', 'QB_EN_OXFORD_X',
    'EN_SIMPLE_REPLACE', 'EN_SIMPLE_REPLACE_GRAMME', 'EN_SIMPLE_REPLACE_GRAMMES', 'EN_SIMPLE_REPLACE_KILOGRAMME', 'EN_SIMPLE_REPLACE_KILOGRAMMES', 'EN_SIMPLE_REPLACE_FOO', 'XEN_SIMPLE_REPLACE_GRAMME', 'EN_SIMPLE_REPLACE_GRAMMEX',
    'AI_HYDRA_LEO', 'AI_HYDRA_LEO_MISSING_COMMA', 'AI_HYDRA_LEO_MISSING_COMMA_X', 'AI_HYDRA_LEO_CP_YOU_YOUARE', 'AI_HYDRA_LEO_CP_YOU_YOUARE_2', 'AI_HYDRA_LEO_CP', 'AI_HYDRA_LEO_CP_X', 'AI_HYDRA_LEO_MISSING_TO', 'AI_HYDRA_LEO_MISSING_TO_X', 'AI_HYDRA_LEO_FOO', 'AI_EN_LECTOR', 'AI_EN_LECTOR_X', 'AI_EN_G_X',
    'EN_FOR_GERMAN_SPEAKERS_FALSE_FRIENDS', 'EN_FOR_GERMAN_SPEAKERS_FALSE_FRIENDS_X', 'EN_FOR_FRENCH_SPEAKERS_FALSE_FRIENDS_ABC', 'EN_FOR_german_SPEAKERS_FALSE_FRIENDS', 'EN_FOR__SPEAKERS_FALSE_FRIENDS', 'XEN_FOR_DE_SPEAKERS_FALSE_FRIENDS', 'EN_FOR_DE_SPEAKERS_FALSE_FRIENDS\n',
    'OXFORD_SPELLING_ISATION_NOUNS', 'OXFORD_SPELLING_ISE_VERBS', 'OXFORD_SPELLING_IZE', 'OXFORD_SPELLING_X', 'MORFOLOGIK_RULE_EN_US', 'MORFOLOGIK_RULE_EN_GB', 'I_E', 'i_e', 'PROFANITY', 'GOOD_FLUCK', 'STYLE', 'TYPOGRAPHY', 'REPETITIONS_STYLE', 'MY_STYLE_ID', 'TOO_LONG_SENTENCE', 'too_long_sentence', 'SOME_UNKNOWN_RULE', 'GRAMMAR', 'MISC', '', ' ', 'x'.repeat(500)],
  fr: ['FR_COMPOUNDS', 'FR_COMPOUNDS_X', 'FR_COMPOUND', 'CAT_TYPOGRAPHIE', 'CAT_TYPOGRAPHIE_X', 'CAT_TOURS_CRITIQUES', 'CAT_HOMONYMES_PARONYMES', 'CAT_GRAMMAIRE', 'cat_typographie', 'SON', 'SON_X', 'son', 'CAR', 'CAR_X', 'CARTE', 'CA', 'car', 'CONFUSION_RULE_PREMIUM', 'CONFUSION_RULE_PREMIUM_X', 'CONFUSION_RULE', 'FR_MULTITOKEN_SPELLING_', 'FR_MULTITOKEN_SPELLING_X', 'FR_MULTITOKEN_SPELLING', 'FR_SIMPLE_REPLACE', 'FR_SIMPLE_REPLACE_X', 'FR_SIMPLE_REPLACEMENT', 'grammalecte_', 'grammalecte_x', 'GRAMMALECTE_X', 'grammalecte',
    'AI_FR_HYDRA_LEO', 'AI_FR_HYDRA_LEO_X', 'AI_FR_GGEC_REPLACEMENT_ORTHOGRAPHY', 'AI_FR_GGEC_REPLACEMENT_ORTHOGRAPHY_SPELL', 'AI_FR_GGEC_REPLACEMENT_OTHER', 'AI_FR_GGEC', 'AI_FR_GGEC_MISSING_PUNCTUATION_PERIOD', 'AI_FR_GGEC_QUOTES', 'AI_FR_GGEC_SI_LON', 'AI_FR_MERGED_MATCH', 'AI_FR_X',
    'AGREEMENT_EXCEPTIONS', 'FR_SPELLING_RULE', 'ELISION', 'UPPERCASE_SENTENCE_START', 'FRENCH_WHITESPACE_STRICT', 'FRENCH_WHITESPACE', 'TOUT_MAJUSCULES', 'SE_CE', 'STYLE', 'TYPOGRAPHY', 'REPETITIONS_STYLE', 'MY_STYLE_ID', 'TOO_LONG_SENTENCE', 'too_long_sentence', 'SOME_UNKNOWN_RULE', 'GRAMMAR', 'MISC', '', ' ', 'x'.repeat(500)],
};
const CATS = { de: ['TYPOGRAPHY', 'COLLOQUIALISMS', 'STYLE', 'REDUNDANCY', 'GENDER_NEUTRALITY', 'REPETITIONS_STYLE'], en: ['TYPOGRAPHY', 'STYLE', 'REPETITIONS_STYLE', 'PUNCTUATION', 'GRAMMAR'], fr: ['CAT_TYPOGRAPHIE', 'CAT_TOURS_CRITIQUES', 'CAT_HOMONYMES_PARONYMES', 'TYPOGRAPHY', 'STYLE', 'REPETITIONS_STYLE'] };
// real rule lists only for variants with distinct rule sets (en-AU/CA/NZ/ZA, fr-BE/CH and the bare base codes add nothing for the priority logic)
const REAL = new Set(['de-DE', 'de-AT', 'de-CH', 'en-US', 'en-GB', 'fr', 'fr-CA']);
for (const code of VARIANTS) {
  const f = fam(code);
  const own = mapKeys[code] ?? [];
  const base = mapKeys[f] ?? [];
  const ids = [...new Set([...own, ...base, ...PROBES[f]])];
  // synthetic Rule objects: ids x category x rule priority x ITS type (Language#getRulePriority)
  const shortlist = [...new Set([...PROBES[f].slice(0, 22), ...own.slice(0, 4), ...base.slice(0, 10), 'STYLE', 'TOO_LONG_SENTENCE'])];
  const rules = [];
  for (const id of shortlist) {
    for (const cat of [null, ...CATS[f].slice(0, 3)]) {
      for (const [prio, it] of [[null, null], [7, 'Style'], [-9, 'Grammar'], [null, 'Style']]) {
        const r = { ruleId: id, ...(cat ? { category: { id: cat } } : {}), ...(prio !== null ? { priority: prio } : {}), ...(it ? { issueType: it } : {}) };
        rules.push(r);
      }
    }
  }
  for (const id of shortlist.slice(0, 12)) rules.push({ ruleId: id, subId: '1' }, { ruleId: id, subId: '2', priority: 3, category: { id: 'STYLE' }, issueType: 'Style' });
  for (const cat of CATS[f]) rules.push({ ruleId: 'UNKNOWN_RULE_X', category: { id: cat } }, { ruleId: 'UNKNOWN_RULE_X', category: { id: cat }, issueType: 'Style' });
  write(`priority-${code}`, `Language#getPriorityForId over ${ids.length} ids (priority maps + fallback probes), getRulePriority over ${rules.length} synthetic rules, and every real rule of the language`, [
    { op: 'lang-priority', args: { lang: code, ids } },
    { op: 'lang-priority', args: { lang: code, rules } },
    ...(REAL.has(code) ? [{ op: 'lang-priority', args: { lang: code, real: true } }] : []),
  ]);
}

// ---- filter ----
const at = (text, sub, nth = 0) => { let i = -1; for (let k = 0; k <= nth; k++) i = text.indexOf(sub, i + 1); if (i < 0) throw new Error(`${sub} not in ${text}`); return [i, i + sub.length]; };
const M = (text, sub, ruleId, o = {}) => { const [from, to] = at(text, sub, o.nth ?? 0); const { nth, ...rest } = o; return { ruleId, from, to, message: rest.message ?? `msg ${ruleId}`, ...rest }; };
const C = (name, fn, text, matches, enabledRules) => ({ name, fn, text, matches, ...(enabledRules !== undefined ? { enabledRules } : {}) });
const GG = 'AI_DE_GGEC_';
const deCases = [];
{
  const t = 'Das ist ein Test';
  deCases.push(C('period-dropped', 'filter', t, [M(t, 'Test', GG + 'MISSING_PUNCTUATION_PERIOD', { suggestions: ['Test.'] })]));
  deCases.push(C('period-kept-has-dot', 'filter', 'Das ist ein Test.', [M('Das ist ein Test.', 'Test', GG + 'MISSING_PUNCTUATION_PERIOD', { suggestions: ['Test.'] })]));
  deCases.push(C('period-kept-other-end', 'filter', 'Das ist ein Test noch', [M('Das ist ein Test noch', 'Test', GG + 'MISSING_PUNCTUATION_PERIOD', { suggestions: ['Test.'] })]));
  deCases.push(C('period-trailing-ws', 'filter', 'Das ist ein Test  \n', [M('Das ist ein Test  \n', 'Test', GG + 'MISSING_PUNCTUATION_PERIOD', { suggestions: ['Test.'] })]));
  deCases.push(C('period-two-suggestions', 'filter', t, [M(t, 'Test', GG + 'MISSING_PUNCTUATION_PERIOD', { suggestions: ['Test.', 'Test!'] })]));
  deCases.push(C('period-no-dot-suggestion', 'filter', t, [M(t, 'Test', GG + 'MISSING_PUNCTUATION_PERIOD', { suggestions: ['Test!'] })]));
  deCases.push(C('period-other-id', 'filter', t, [M(t, 'Test', GG + 'MISSING_PUNCTUATION_PERIOD_X', { suggestions: ['Test.'] })]));
  deCases.push(C('period-non-ggec-id', 'filter', t, [M(t, 'Test', 'MISSING_PUNCTUATION_PERIOD', { suggestions: ['Test.'] })]));
  deCases.push(C('period-dot-only', 'filter', 'Das.', [M('Das.', 'Das', GG + 'MISSING_PUNCTUATION_PERIOD', { suggestions: ['.'] })]));
  deCases.push(C('period-no-sentence', 'filter', t, [M(t, 'Test', GG + 'MISSING_PUNCTUATION_PERIOD', { suggestions: ['Test.'], noSentence: true })]));
  deCases.push(C('empty-list', 'filter', t, []));
  deCases.push(C('single-plain', 'filter', t, [M(t, 'ist', 'FOO_RULE', { suggestions: ['war'], shortMessage: 'kurz' })]));
  const u = 'Ich habe ein Haus gekauft und es ist schön';
  const mk = (a, b, o1 = {}, o2 = {}, ids = ['A', 'B']) => [M(u, a, GG + ids[0], { suggestions: [a + '1'], ...o1 }), M(u, b, GG + ids[1], { suggestions: [b + '2'], ...o2 })];
  deCases.push(C('merge-gap0', 'filter', 'Haushund', [M('Haushund', 'Haus', GG + 'A', { suggestions: ['Haus1'], issueType: 'Misspelling' }), M('Haushund', 'hund', GG + 'B', { suggestions: ['Hund'], issueType: 'Misspelling' })]));
  deCases.push(C('merge-gap1', 'filter', u, mk('Ich', 'habe', { issueType: 'Grammar' }, { issueType: 'Grammar' })));
  deCases.push(C('merge-gap2-no', 'filter', u, mk('Ich', 'ein', { issueType: 'Grammar' }, { issueType: 'Grammar' })));
  deCases.push(C('overlap-skip', 'filter', u, [M(u, 'Ich habe', GG + 'A', { suggestions: ['x'], issueType: 'Grammar' }), M(u, 'habe ein', GG + 'B', { suggestions: ['y'], issueType: 'Grammar' })]));
  deCases.push(C('contained-skip', 'filter', u, [M(u, 'Ich habe ein', GG + 'A', { suggestions: ['x'] }), M(u, 'habe', GG + 'B', { suggestions: ['y'] })]));
  for (const [n, t1, t2] of [['style-style', 'Style', 'Style'], ['grammar-grammar', 'Grammar', 'Grammar'], ['grammar-misspelling', 'Grammar', 'Misspelling'], ['style-grammar', 'Style', 'Grammar'], ['grammar-style', 'Grammar', 'Style'], ['misspelling-style', 'Misspelling', 'Style'], ['uncategorized-uncategorized', 'Uncategorized', 'Uncategorized'], ['default-default', null, null], ['default-style', null, 'Style'], ['typographical-other', 'Typographical', 'Other']]) {
    deCases.push(C(`merge-types-${n}`, 'filter', u, mk('Ich', 'habe', t1 ? { issueType: t1 } : {}, t2 ? { issueType: t2 } : {})));
  }
  for (const [n, p1, p2] of [['picky-both', ['picky'], ['picky']], ['picky-first', ['picky'], []], ['picky-second', [], ['picky']], ['picky-none', [], []]]) {
    deCases.push(C(`merge-${n}`, 'filter', u, mk('Ich', 'habe', { issueType: 'Grammar', tags: p1 }, { issueType: 'Grammar', tags: p2 })));
    deCases.push(C(`merge-${n}-style`, 'filter', u, mk('Ich', 'habe', { issueType: 'Style', tags: p1 }, { issueType: 'Style', tags: p2 })));
  }
  deCases.push(C('merge-other-tags', 'filter', u, mk('Ich', 'habe', { issueType: 'Grammar', tags: ['picky', 'academic'] }, { issueType: 'Grammar', tags: ['picky'] })));
  deCases.push(C('chain-3', 'filter', u, [M(u, 'Ich', GG + 'A', { suggestions: ['I'], issueType: 'Grammar' }), M(u, 'habe', GG + 'B', { suggestions: ['h'], issueType: 'Grammar' }), M(u, 'ein', GG + 'C', { suggestions: ['e'], issueType: 'Grammar' }), M(u, 'Haus', GG + 'D', { suggestions: ['H'], issueType: 'Grammar' })]));
  deCases.push(C('chain-mixed-types', 'filter', u, [M(u, 'Ich', GG + 'A', { suggestions: ['I'], issueType: 'Grammar' }), M(u, 'habe', GG + 'B', { suggestions: ['h'], issueType: 'Misspelling' }), M(u, 'ein', GG + 'C', { suggestions: ['e'], issueType: 'Style' })]));
  deCases.push(C('shared-rule-merge', 'filter', u, [M(u, 'Ich', GG + 'A', { ruleKey: 'r', suggestions: ['I'], issueType: 'Grammar' }), M(u, 'habe', GG + 'A', { ruleKey: 'r', suggestions: ['h'], issueType: 'Grammar' })]));
  deCases.push(C('non-ggec-then-ggec', 'filter', u, [M(u, 'Ich', 'OTHER', { suggestions: ['I'] }), M(u, 'habe', GG + 'B', { suggestions: ['h'] })]));
  deCases.push(C('ggec-then-non-ggec', 'filter', u, [M(u, 'Ich', GG + 'A', { suggestions: ['I'] }), M(u, 'habe', 'OTHER', { suggestions: ['h'] })]));
  deCases.push(C('ggec-gap2-then-merge', 'filter', u, [M(u, 'Ich', GG + 'A', { suggestions: ['I'] }), M(u, 'ein', GG + 'B', { suggestions: ['e'] }), M(u, 'Haus', GG + 'C', { suggestions: ['H'] })]));
  deCases.push(C('merge-multi-suggestion', 'filter', u, mk('Ich', 'habe', { suggestions: ['a', 'b'] }, { suggestions: ['c', 'd'] })));
  deCases.push(C('merge-no-suggestion', 'filter', u, mk('Ich', 'habe', { suggestions: [] }, { suggestions: ['c'] })));
  deCases.push(C('merge-errorstr-explicit', 'filter', u, [M(u, 'Ich', GG + 'A', { suggestions: ['I'], errorStr: true, issueType: 'Grammar' }), M(u, 'habe', GG + 'B', { suggestions: ['h'], errorStr: 'XX', issueType: 'Grammar' })]));
  deCases.push(C('merge-unicode', 'filter', 'Größe überprüfen 😀 schön', [M('Größe überprüfen 😀 schön', 'Größe', GG + 'A', { suggestions: ['Grösse'], issueType: 'Grammar' }), M('Größe überprüfen 😀 schön', 'überprüfen', GG + 'B', { suggestions: ['prüfen'], issueType: 'Grammar' })]));
  deCases.push(C('merge-urls-features', 'filter', u, mk('Ich', 'habe', { issueType: 'Grammar', shortMessage: 'sm1', specificRuleId: 'SPEC_A' }, { issueType: 'Grammar', shortMessage: 'sm2', specificRuleId: 'SPEC_B' })));
  deCases.push(C('merge-suggestion-objects', 'filter', u, mk('Ich', 'habe', { issueType: 'Grammar', suggestions: [{ replacement: 'I', shortDescription: 'sd', suffix: ' x' }] }, { issueType: 'Grammar', suggestions: [{ replacement: 'h', shortDescription: 'sd2' }] })));
  // Swiss German
  const s1 = 'Die Strasse ist gross und wir müssen ihn grüssen';
  deCases.push(C('swiss-spell-remove', 'filter', s1, [M(s1, 'Strasse', GG + 'REPLACEMENT_ORTHOGRAPHY_SPELL', { suggestions: ['Straße'] })]));
  deCases.push(C('swiss-spell-remove-second', 'filter', s1, [M(s1, 'gross', GG + 'REPLACEMENT_ORTHOGRAPHY_SPELL', { suggestions: ['Groß', 'groß'] })]));
  deCases.push(C('swiss-adjform-remove', 'filter', s1, [M(s1, 'gross', GG + 'REPLACEMENT_ADJECTIVE_FORM', { suggestions: ['groß'] })]));
  deCases.push(C('swiss-other-id-keep', 'filter', s1, [M(s1, 'Strasse', GG + 'REPLACEMENT_NOUN', { suggestions: ['Straße'] })]));
  deCases.push(C('swiss-no-ss-keep', 'filter', s1, [M(s1, 'Die', GG + 'REPLACEMENT_ORTHOGRAPHY_SPELL', { suggestions: ['Dieß'] })]));
  deCases.push(C('swiss-no-eszett-suggestion', 'filter', s1, [M(s1, 'Strasse', GG + 'REPLACEMENT_ORTHOGRAPHY_SPELL', { suggestions: ['Strassen'] })]));
  deCases.push(C('swiss-ss-in-part', 'filter', s1, [M(s1, 'grüssen', GG + 'REPLACEMENT_ORTHOGRAPHY_SPELL', { suggestions: ['grüßen'] })]));
  deCases.push(C('swiss-eszett-replaced', 'filter', s1, [M(s1, 'ihn', 'FOO', { suggestions: ['Straße', 'groß', 'ßß', 'abc'] }), M(s1, 'grüssen', 'BAR', { suggestions: [{ replacement: 'grüßen', shortDescription: 'sd', suffix: 'ß' }] })]));
  deCases.push(C('swiss-no-sentence', 'filter', s1, [M(s1, 'Strasse', GG + 'REPLACEMENT_ORTHOGRAPHY_SPELL', { suggestions: ['Straße'], noSentence: true })]));
  deCases.push(C('swiss-negative-from', 'filter', s1, [{ ruleId: GG + 'REPLACEMENT_ORTHOGRAPHY_SPELL', from: -1, to: 5, message: 'm', suggestions: ['Straße'], sentPos: [-1, 5] }]));
  deCases.push(C('swiss-to-beyond', 'filter', s1, [{ ruleId: GG + 'REPLACEMENT_ORTHOGRAPHY_SPELL', from: 4, to: 500, message: 'm', suggestions: ['Straße'] }]));
  deCases.push(C('swiss-spell-keep-different-sentence', 'filter', s1, [M(s1, 'Strasse', GG + 'REPLACEMENT_ORTHOGRAPHY_SPELL', { suggestions: ['Straße'], sentence: 'Kurz' })]));
  deCases.push(C('swiss-merge-then-eszett', 'filter', s1, [M(s1, 'Die', GG + 'A', { suggestions: ['Dieß'], issueType: 'Grammar' }), M(s1, 'Strasse', GG + 'B', { suggestions: ['Straße'], issueType: 'Grammar' })]));
  deCases.push(C('swiss-shared-rule-two-matches', 'filter', s1, [M(s1, 'Strasse', GG + 'REPLACEMENT_ORTHOGRAPHY_SPELL', { ruleKey: 'k', suggestions: ['Straße'] }), M(s1, 'gross', GG + 'REPLACEMENT_ORTHOGRAPHY_SPELL', { ruleKey: 'k', suggestions: ['groß'] }), M(s1, 'wir', GG + 'REPLACEMENT_ORTHOGRAPHY_SPELL', { ruleKey: 'k', suggestions: ['wiß'] })]));
  deCases.push(C('after-overlapping', 'afterOverlapping', s1, [M(s1, 'Strasse', 'FOO', { suggestions: ['Straße'] })]));
}
const enCases = [];
{
  const t = "They 've done it and don't know n't";
  const sg = (...s) => s;
  const q = (name, sub, sugg, extra = {}, text = t, ruleId = 'EN_FOO') => enCases.push(C(name, 'filter', text, [M(text, sub, ruleId, { suggestions: sugg, errorStr: true, ...extra })]));
  q('apos-add-space', "'ve", sg('have'));
  q('apos-keep-apos', "'ve", sg("'ve"));
  q('apos-keep-typographic', "'ve", sg('’ve'));
  q('apos-keep-space', "'ve", sg(' have'));
  q('apos-multi', "'ve", sg('have', "'ve", '’ve', ' have', 'has', '', 'x'));
  q('apos-empty-suggestion', "'ve", sg(''));
  q('nt-add-space', "n't", sg('not'));
  q('nt-keep', "n't", sg("n't"));
  q('nt-keep-typographic', "n't", sg('n’t'));
  q('nt-prefix-match', "n't", sg("n'tx", 'n’tx', 'nt'));
  q('short-errorstr-2', "'s", sg('is'), {}, "It 's fine");
  q('short-errorstr-1', "'", sg('x'), {}, "a ' b");
  q('errorstr-not-set', "'ve", sg('have'), { errorStr: false });
  q('errorstr-explicit-apos', "'ve", sg('have'), { errorStr: "'ll long" });
  q('errorstr-explicit-nt', "'ve", sg('have'), { errorStr: "n't long" });
  q('errorstr-explicit-short', "'ve", sg('have'), { errorStr: 'ab' });
  q('errorstr-empty', "'ve", sg('have'), { errorStr: '' });
  q('errorstr-both-prefix', "'ve", sg('have'), { errorStr: "'n't" });
  q('no-sentence', "'ve", sg('have'), { noSentence: true, errorStr: false });
  q('empty-suggestions', "'ve", []);
  q('no-suggestion-field', "'ve", undefined);
  q('dedupe-simple', 'done', sg('did', 'did', 'done', 'did'));
  q('dedupe-after-transform', "'ve", sg('have', ' have', 'has'));
  q('dedupe-objects-different-desc', 'done', [{ replacement: 'did', shortDescription: 'a' }, { replacement: 'did', shortDescription: 'b' }, { replacement: 'did', shortDescription: 'a' }, { replacement: 'did', shortDescription: 'a', suffix: 's' }]);
  q('dedupe-objects-transform', "'ve", [{ replacement: 'have', shortDescription: 'a' }, { replacement: ' have', shortDescription: 'a' }]);
  q('gramme-rule-id', 'done', sg('x'), {}, t, 'EN_SIMPLE_REPLACE_KILOGRAMME');
  q('grammes-rule-id', 'done', sg('x'), {}, t, 'EN_SIMPLE_REPLACE_KILOGRAMMES');
  q('gramme-specific-only', 'done', sg('x'), { specificRuleId: 'EN_SIMPLE_REPLACE_GRAMME' }, t, 'FOO_RULE');
  q('grammes-specific-only', 'done', sg('x'), { specificRuleId: 'EN_SIMPLE_REPLACE_FOO_GRAMMES' }, t, 'FOO_RULE');
  q('simple-replace-other', 'done', sg('x'), {}, t, 'EN_SIMPLE_REPLACE_FOO');
  q('gramme-without-prefix', 'done', sg('x'), {}, t, 'XEN_SIMPLE_REPLACE_GRAMME');
  q('gramme-with-its-type', 'done', sg('x'), { issueType: 'Style' }, t, 'EN_SIMPLE_REPLACE_GRAMME');
  enCases.push(C('gramme-shared-rule', 'filter', t, [M(t, 'done', 'EN_SIMPLE_REPLACE_GRAMME', { ruleKey: 's', suggestions: ['x'], issueType: 'Style' }), M(t, 'it', 'EN_SIMPLE_REPLACE_GRAMME', { ruleKey: 's', suggestions: ['y'], specificRuleId: 'OTHER' }), M(t, 'know', 'FOO', { suggestions: ['z'] })]));
  enCases.push(C('empty-list', 'filter', t, []));
  enCases.push(C('many-matches', 'filter', t, [M(t, "'ve", 'A', { suggestions: ['have'], errorStr: true }), M(t, "n't", 'B', { suggestions: ['not', 'n’t'], errorStr: true }), M(t, 'They', 'C', { suggestions: ['They', 'They'], errorStr: true })]));
  enCases.push(C('unicode', 'filter', "Ça 've 😀 done", [M("Ça 've 😀 done", "'ve", 'A', { suggestions: ['have', '😀'], errorStr: true })]));
  enCases.push(C('after-overlapping', 'afterOverlapping', t, [M(t, "'ve", 'A', { suggestions: ['have'] })]));
  enCases.push(C('enabled-rules-ignored', 'filter', t, [M(t, "'ve", 'A', { suggestions: ['have'], errorStr: true })], ['APOS_TYP', 'A']));
}
const frCases = [];
{
  const t = 'Si on veut, il a dit Bonjour. Je suis ici';
  const fc = (name, fn, text, matches, en) => frCases.push(C(name, fn, text, matches, en));
  const F = 'AI_FR_GGEC_';
  const both = (name, text, matches, en) => { fc(name + '-filter', 'filter', text, matches, en); fc(name + '-adjust', 'adjustFrench', text, matches, en); };
  // adjust branches
  both('case-only', t, [M(t, 'Bonjour', F + 'REPLACEMENT_ORTHOGRAPHY', { suggestions: ['bonjour'] })]);
  both('case-only-no-orthography', t, [M(t, 'Bonjour', F + 'REPLACEMENT_OTHER', { suggestions: ['bonjour'] })]);
  both('case-only-orthography-twice', t, [M(t, 'Bonjour', F + 'REPLACEMENT_ORTHOGRAPHY_ORTHOGRAPHY_X', { suggestions: ['BONJOUR'] })]);
  both('case-same-text', t, [M(t, 'Bonjour', F + 'REPLACEMENT_ORTHOGRAPHY', { suggestions: ['Bonjour'] })]);
  both('case-differs', t, [M(t, 'Bonjour', F + 'REPLACEMENT_ORTHOGRAPHY', { suggestions: ['Bonsoir'] })]);
  both('case-two-suggestions', t, [M(t, 'Bonjour', F + 'REPLACEMENT_ORTHOGRAPHY', { suggestions: ['bonjour', 'BONJOUR'] })]);
  both('case-no-suggestions', t, [M(t, 'Bonjour', F + 'REPLACEMENT_ORTHOGRAPHY', { suggestions: [] })]);
  both('case-non-ggec', t, [M(t, 'Bonjour', 'FOO_ORTHOGRAPHY', { suggestions: ['bonjour'] })]);
  both('case-turkish-i', 'Il est İci ici', [M('Il est İci ici', 'İci', F + 'REPLACEMENT_ORTHOGRAPHY', { suggestions: ['ici'] })]);
  both('case-sharp-s', 'Die Straße', [M('Die Straße', 'Straße', F + 'REPLACEMENT_ORTHOGRAPHY', { suggestions: ['STRASSE'] })]);
  both('case-errorstr-preset', t, [M(t, 'Bonjour', F + 'REPLACEMENT_ORTHOGRAPHY', { suggestions: ['bonjour'], errorStr: 'preset' })]);
  both('case-no-sentence', t, [M(t, 'Bonjour', F + 'REPLACEMENT_ORTHOGRAPHY', { suggestions: ['bonjour'], noSentence: true })]);
  both('case-category-shared', t, [M(t, 'Bonjour', F + 'REPLACEMENT_ORTHOGRAPHY', { ruleKey: 'k', suggestions: ['bonjour'], category: { id: 'GRAMMAR', name: 'Grammaire' } }), M(t, 'Je', F + 'REPLACEMENT_ORTHOGRAPHY', { ruleKey: 'k', suggestions: ['Tu'] })]);
  both('lon-basic', t, [M(t, 'on', F + 'MISSING_PRONOUN_LAPOSTROPHE', { suggestions: ["l'on"] })]);
  both('lon-upper-text', 'SI ON veut', [M('SI ON veut', 'ON', F + 'MISSING_PRONOUN_LAPOSTROPHE', { suggestions: ["l'on"] })]);
  both('lon-error-upper', 'si On veut', [M('si On veut', 'On', F + 'MISSING_PRONOUN_LAPOSTROPHE', { suggestions: ["l'on"] })]);
  both('lon-no-si', 'Alors on veut', [M('Alors on veut', 'on', F + 'MISSING_PRONOUN_LAPOSTROPHE', { suggestions: ["l'on"] })]);
  both('lon-typographic', t, [M(t, 'on', F + 'MISSING_PRONOUN_LAPOSTROPHE', { suggestions: ['l’on'] })]);
  both('lon-id-with-suffix', t, [M(t, 'on', F + 'X_MISSING_PRONOUN_LAPOSTROPHE_Y', { suggestions: ["l'on"] })]);
  both('lon-non-ggec', t, [M(t, 'on', 'FOO_MISSING_PRONOUN_LAPOSTROPHE', { suggestions: ["l'on"] })]);
  both('lon-two-suggestions', t, [M(t, 'on', F + 'MISSING_PRONOUN_LAPOSTROPHE', { suggestions: ["l'on", 'qu'] })]);
  both('lon-other-word', 'Si ons veut', [M('Si ons veut', 'ons', F + 'MISSING_PRONOUN_LAPOSTROPHE', { suggestions: ["l'on"] })]);
  both('lon-existing-tags', t, [M(t, 'on', F + 'MISSING_PRONOUN_LAPOSTROPHE', { suggestions: ["l'on"], tags: ['academic'] })]);
  both('quote', 'Il dit "oui" ici', [M('Il dit "oui" ici', '"oui"', F + 'REPLACEMENT_PUNCTUATION_QUOTE', { suggestions: ['«oui»'], issueType: 'Style' })]);
  both('quote-id-contains', 'Il dit "oui" ici', [M('Il dit "oui" ici', '"oui"', F + 'X_REPLACEMENT_PUNCTUATION_QUOTE_Y', { suggestions: ['«oui»', 'a'] })]);
  both('quote-non-ggec', 'Il dit "oui" ici', [M('Il dit "oui" ici', '"oui"', 'REPLACEMENT_PUNCTUATION_QUOTE', { suggestions: ['«oui»'] })]);
  both('quote-case-only-too', 'Il dit "oui" ici', [M('Il dit "oui" ici', '"oui"', F + 'REPLACEMENT_PUNCTUATION_QUOTE', { suggestions: ['"OUI"'] })]);
  const ap = "Il a l'air d'un homme";
  for (const [n, en] of [['enabled-null', undefined], ['enabled-empty', []], ['enabled-apos', ['APOS_TYP']], ['enabled-other', ['FOO', 'apos_typ']], ['enabled-apos-more', ['X', 'APOS_TYP', 'Y']]]) {
    both(`apos-${n}`, ap, [M(ap, "l'air", 'FOO', { suggestions: ["l'air", "d'un", "'", "a'", "''", '', "l'art d'un"] })], en);
  }
  both('apos-objects', ap, [M(ap, "l'air", 'FOO', { suggestions: [{ replacement: "l'air", shortDescription: "d'un", suffix: "'" }] })], ['APOS_TYP']);
  both('apos-and-case', t, [M(t, 'Bonjour', F + 'REPLACEMENT_ORTHOGRAPHY', { suggestions: ["bonj'our"] })], ['APOS_TYP']);
  both('apos-no-suggestions', ap, [M(ap, "l'air", 'FOO', { suggestions: [] })], ['APOS_TYP']);
  fc('many', 'filter', ap, [M(ap, 'Il', F + 'A', { suggestions: ["l'a"], issueType: 'Grammar' }), M(ap, 'a', 'FOO', { suggestions: ["d'a"] }), M(ap, 'homme', F + 'B', { suggestions: ["h'"] })], ['APOS_TYP']);
  // merges and period filter
  const u = 'Je suis allé au marché hier soir';
  const mk = (a, b, o1 = {}, o2 = {}) => [M(u, a, F + 'A', { suggestions: [a + '1'], ...o1 }), M(u, b, F + 'B', { suggestions: [b + '2'], ...o2 })];
  fc('period-dropped', 'filter', 'Il est ici', [M('Il est ici', 'ici', F + 'MISSING_PUNCTUATION_PERIOD', { suggestions: ['ici.'] })]);
  fc('period-kept', 'filter', 'Il est ici.', [M('Il est ici.', 'ici', F + 'MISSING_PUNCTUATION_PERIOD', { suggestions: ['ici.'] })]);
  fc('period-trailing-ws', 'filter', 'Il est ici \n', [M('Il est ici \n', 'ici', F + 'MISSING_PUNCTUATION_PERIOD', { suggestions: ['ici.'] })]);
  fc('period-two-suggestions', 'filter', 'Il est ici', [M('Il est ici', 'ici', F + 'MISSING_PUNCTUATION_PERIOD', { suggestions: ['ici.', 'ici!'] })]);
  fc('period-no-dot', 'filter', 'Il est ici', [M('Il est ici', 'ici', F + 'MISSING_PUNCTUATION_PERIOD', { suggestions: ['ici!'] })]);
  fc('period-other-id', 'filter', 'Il est ici', [M('Il est ici', 'ici', F + 'MISSING_PUNCTUATION_PERIOD_X', { suggestions: ['ici.'] })]);
  fc('period-no-sentence', 'filter', 'Il est ici', [M('Il est ici', 'ici', F + 'MISSING_PUNCTUATION_PERIOD', { suggestions: ['ici.'], noSentence: true })]);
  fc('empty-list', 'filter', u, []);
  fc('single-plain', 'filter', u, [M(u, 'suis', 'FOO', { suggestions: ['es'] })]);
  fc('merge-gap0', 'filter', 'Bonjourtoi', [M('Bonjourtoi', 'Bonjour', F + 'A', { suggestions: ['Bonjour '], issueType: 'Grammar' }), M('Bonjourtoi', 'toi', F + 'B', { suggestions: ['toi'], issueType: 'Grammar' })]);
  fc('merge-gap1', 'filter', u, mk('Je', 'suis', { issueType: 'Grammar' }, { issueType: 'Grammar' }));
  fc('merge-gap2-no', 'filter', u, mk('Je', 'allé', { issueType: 'Grammar' }, { issueType: 'Grammar' }));
  fc('overlap-skip', 'filter', u, [M(u, 'Je suis', F + 'A', { suggestions: ['x'] }), M(u, 'suis allé', F + 'B', { suggestions: ['y'] })]);
  for (const [n, t1, t2] of [['style-style', 'Style', 'Style'], ['grammar-grammar', 'Grammar', 'Grammar'], ['grammar-misspelling', 'Grammar', 'Misspelling'], ['style-grammar', 'Style', 'Grammar'], ['grammar-style', 'Grammar', 'Style'], ['default-default', null, null], ['default-style', null, 'Style'], ['typographical-typographical', 'Typographical', 'Typographical']]) {
    fc(`merge-types-${n}`, 'filter', u, mk('Je', 'suis', t1 ? { issueType: t1 } : {}, t2 ? { issueType: t2 } : {}));
  }
  for (const [n, p1, p2] of [['picky-both', ['picky'], ['picky']], ['picky-first', ['picky'], []], ['picky-second', [], ['picky']], ['picky-none', [], []]]) {
    fc(`merge-${n}-grammar`, 'filter', u, mk('Je', 'suis', { issueType: 'Grammar', tags: p1 }, { issueType: 'Grammar', tags: p2 }));
    fc(`merge-${n}-style`, 'filter', u, mk('Je', 'suis', { issueType: 'Style', tags: p1 }, { issueType: 'Style', tags: p2 }));
  }
  fc('chain-3', 'filter', u, [M(u, 'Je', F + 'A', { suggestions: ['J'], issueType: 'Style', tags: ['picky'] }), M(u, 'suis', F + 'B', { suggestions: ['s'], issueType: 'Style', tags: ['picky'] }), M(u, 'allé', F + 'C', { suggestions: ['a'], issueType: 'Style', tags: ['picky'] })]);
  fc('chain-mixed', 'filter', u, [M(u, 'Je', F + 'A', { suggestions: ['J'], issueType: 'Grammar' }), M(u, 'suis', F + 'B', { suggestions: ['s'], issueType: 'Misspelling' }), M(u, 'allé', F + 'C', { suggestions: ['a'], issueType: 'Style' })]);
  fc('shared-rule-merge', 'filter', u, [M(u, 'Je', F + 'A', { ruleKey: 'r', suggestions: ['J'], issueType: 'Style' }), M(u, 'suis', F + 'A', { ruleKey: 'r', suggestions: ['s'], issueType: 'Style' })]);
  fc('non-ggec-then-ggec', 'filter', u, [M(u, 'Je', 'OTHER', { suggestions: ['J'] }), M(u, 'suis', F + 'B', { suggestions: ['s'] })]);
  fc('ggec-then-non-ggec', 'filter', u, [M(u, 'Je', F + 'A', { suggestions: ['J'] }), M(u, 'suis', 'OTHER', { suggestions: ['s'] })]);
  fc('merge-no-suggestion', 'filter', u, mk('Je', 'suis', { suggestions: [] }, { suggestions: ['c'] }));
  fc('merge-with-case-and-quote', 'filter', 'Il dit "oui" ici Bonjour', [M('Il dit "oui" ici Bonjour', 'Il dit', F + 'REPLACEMENT_ORTHOGRAPHY', { suggestions: ['il dit'] }), M('Il dit "oui" ici Bonjour', '"oui"', F + 'REPLACEMENT_PUNCTUATION_QUOTE', { suggestions: ['«oui»'] })], ['APOS_TYP']);
  fc('merge-lon-quote', 'filter', 'Si on dit "oui"', [M('Si on dit "oui"', 'on', F + 'MISSING_PRONOUN_LAPOSTROPHE', { suggestions: ["l'on"] }), M('Si on dit "oui"', 'dit', F + 'X', { suggestions: ['dire'], tags: ['picky'] })]);
  fc('merge-unicode', 'filter', 'Éric à côté 😀 ça', [M('Éric à côté 😀 ça', 'Éric', F + 'A', { suggestions: ['Eric'], issueType: 'Grammar' }), M('Éric à côté 😀 ça', 'à', F + 'B', { suggestions: ['a'], issueType: 'Grammar' })]);
  fc('after-overlapping', 'afterOverlapping', u, [M(u, 'suis', 'FOO', { suggestions: ['es'] })]);
}
const ALLCASES = { de: deCases, en: enCases, fr: frCases };
for (const code of VARIANTS) {
  const cases = ALLCASES[fam(code)];
  // adjustFrench only exists on French classes: others never get those cases
  write(`filter-${code}`, `Language#filterRuleMatches / filterRuleMatchesAfterOverlapping${fam(code) === 'fr' ? ' / adjustFrenchRuleMatch' : ''} on harness RuleMatch objects (${cases.length} cases)`, [
    { op: 'lang-filter', args: { lang: code, cases } },
    // the other families' cases run on this language too: inherited/base behaviour
    ...Object.entries(ALLCASES).filter(([k]) => k !== fam(code)).map(([k, cs]) => ({ op: 'lang-filter', args: { lang: code, cases: cs.filter((c) => c.fn !== 'adjustFrench').slice(0, 12) } })),
  ]);
}

// ---- typography ----
const TY = [];
const quotesText = ['"Hallo"', 'Er sagte "Hallo" und ging.', '"Hallo', 'Hallo"', '"', '""', '"a"', ' "a" ', '("a")', '("a", "b")', 'Text: "Zitat", Ende.', 'Text "Zitat". Ende', 'x"y"z', 'a "b" c "d" e', '"Zitat mit \'inneren\' Anführungen"', "'Hallo'", "'", "''", "'a'", "x 'a' y", "x 'ab' y", "('x')", "('ab')", "'ab', 'cd'.", "Er sagt 'ja'!", "Es war 'nett'?", "'Hallo", "Hallo'", "d'accord", "l'homme", "L'Étoile", "l'«homme»", "don't", "it's", "Peter's Haus", "Peter 's Haus", "the 'quick' fox", "'tis", "rock 'n' roll", "in the '90s", "‘s Haus", "The dogs' bones", "O'Neil's", "x-'y'", "a 'b'", "a 'b'", '«a»', '« a »', '„a“', '“a”', '‘a’'];
const dots = ['Hmm...', '...', '....', 'Wait... what?', '... und dann', 'a...b', '… schon', '. . .', 'Ende..'];
const abbr = ['z.B. das', 'Das ist z.B. so', 'z. B. das', 'd.h. so', 'u.a. wie', 'u.U. auch', 'i.e. so', 'e.g. so', 'a.b.c.d. test', 'a. b. c. d.', 'A.B.C.', 'Z.B.', 'z.B.', 'z.B.u.a.', 'Das ist z.B.u.a. so', '3.B. test', 'U.S.A. today', 'e.g. a.b.', 'x.y', 'x.y.', 'x. y.', 'Dr. Meier', 'Prof. Dr. M. Meier', 'm.E.', 'ca. 5 m.', 'p.m. a.m.', 'ä.ö.ü.', 'Ä.Ö.', 'z.B.z.B.z.B.', 'a.b.c.', 'a.b. c.d.'];
const tags = ['<suggestion>foo</suggestion> bar', '<suggestion>a</suggestion> et <suggestion>b</suggestion>?', '<suggestion></suggestion>', '<suggestion>"x"</suggestion>', '<suggestion>it\'s</suggestion> ok', 'Meinten Sie <suggestion>Haus</suggestion> oder <suggestion>Maus</suggestion>?', '<suggestion>x', 'x</suggestion>', '<suggestion>a...b</suggestion>', '<suggestion>z.B.</suggestion> z.B.', 'Mix <suggestion>"q"</suggestion> and "r" and \'s\'', '<suggestion>\\0</suggestion> \\1'];
const misc = ['', ' ', 'a', '\\', '$1', 'a$b', '12.5', '1\'000', '"1\'000"', 'Satz. Noch ein Satz.', 'ä "ö" ü', '😀 "x" 😀', '"😀"', "'😀'", 'x'.repeat(300), '"'.repeat(7), "'".repeat(7), 'a "b\nc" d', "'\n'", 'Oui : « non » ?', 'Il dit : "bonjour" !', "L'ami d'Éric dit 'oui' !", 'Qu\'est-ce que c\'est ?', 'aujourd\'hui', 'jusqu\'à', 'l\'«a»', 'He said, "I\'m here."', '"I\'m", \'you\'re\''];
const fr = ["c'est", "C'EST", "qu'il", "Qu'il", "QU'IL", "jusqu'à", "Jusqu'ici", "lorsqu'il", "Lorsqu'on", "puisqu'elle", "quoiqu'il", "quoiqu'", "d'\"x\"", "l'\"x\"", "j''x'", "n'm't's'l'd'", "c'j", "ac'est", "x c'est", "aujourd'hui", "prud'homme", "Il dit ; oui", "Il dit; oui", "Il dit\u00a0; oui", "Il dit\u202f; oui", "Quoi ?", "Quoi\u00a0?", "Quoi\u00a0 ?", "Quoi !", "Quoi!", "Non !!", "a : b", "a: b", "a\u00a0: b", "a\u202f: b", "« a »", "«a»", "«\u00a0a\u00a0»", "« a b »", "a » b « c", "x»", "«x", "a  b", "a   b", "a\u00a0\u00a0b", "a\u202f\u202fb", "a\u00a0 b", "a \u00a0b", "a \u202fb", "a\u202f b", "a\u00a0\u202fb", "L'homme dit: \"oui\" ! Et alors ?", "Il a dit : « Non ; jamais ! »", "\"Oui\" ; 'non' ? « peut-être » !", "10 : 30", "p. ex. : a ; b", "c'est-à-dire : oui ?"];
for (const s of [...quotesText, ...dots, ...abbr, ...tags, ...misc, ...fr]) TY.push(s);
for (const code of VARIANTS) {
  write(`typo-${code}`, `Language#toAdvancedTypography over ${TY.length} strings (quotes, apostrophes, ellipsis, abbreviations, suggestion tags)`, [{ op: 'lang-typo', args: { lang: code, strings: TY } }]);
}

// ---- statics ----
const CLS = ['German', 'GermanyGerman', 'AustrianGerman', 'SwissGerman', 'NonSwissGerman', 'English', 'AmericanEnglish', 'BritishEnglish', 'AustralianEnglish', 'CanadianEnglish', 'NewZealandEnglish', 'SouthAfricanEnglish', 'French', 'CanadianFrench', 'SwissFrench', 'BelgianFrench'];
write('statics', 'getInstance() of the classes that have it, and repeated public-constructor instantiation (single-instantiation guards, deprecated ctors)', [
  { op: 'lang-statics', args: { calls: [...['German', 'GermanyGerman', 'AmericanEnglish', 'BritishEnglish', 'CanadianEnglish', 'French'].map((className) => ({ fn: 'getInstance', className })), ...CLS.map((className) => ({ fn: 'new', className })), ...CLS.map((className) => ({ fn: 'new', className }))] } },
]);
console.log(`X-LANG-META cases written to ${DIR}`);
