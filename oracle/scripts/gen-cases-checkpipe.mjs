// Authors oracle/cases/X-CHECK-PIPE/*.json (inputs only). Ops check2 / active-rules / lt-api / analyze-raw: docs/review/F15-oracle.md.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';

const DIR = path.join(ROOT, 'oracle/cases/X-CHECK-PIPE');
rmSync(DIR, { recursive: true, force: true });
mkdirSync(DIR, { recursive: true });
const write = (name, description, ops) => writeFileSync(path.join(DIR, `${name}.json`), JSON.stringify({ kind: 'harness', clock: 'fixed', description, normalize: [], compare: 'check-pipe', ops }, null, 1) + '\n');
const chunks = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const corpus = (l) => readFileSync(path.join(ROOT, `oracle/corpus/${l}/corpus.txt`), 'utf8').split('\n\n').map((p) => p.replace(/\n+$/, '')).filter(Boolean);

const LANGS = [['en-US', 'en'], ['fr', 'fr'], ['de-DE', 'de']];
const A = { id: 'SYN_CAT_A', name: 'Synthetic A' };
const B = { id: 'SYN_CAT_B', name: 'Synthetic B' };
const C = { id: 'SYN_CAT_C', name: 'Synthetic C (default off)', defaultOff: true };
const D = { id: 'SYN_CAT_D', name: 'Synthetic D' };
// the standard synthetic rule set; semantics in docs/review/F15-oracle.md
const RS = [
  { id: 'SYN_BAD', regex: '(?i)bad|worse|schlecht|mauvais', message: 'Bad word {t}', shortMessage: 'bad', suggestions: ['good', '{t}ly'], category: A, description: 'bad words' },
  { id: 'SYN_PICKY', regex: 'very|très|sehr', message: 'Picky {t}', tags: ['picky'], category: B },
  { id: 'SYN_SUB', subId: '1', regex: 'colou?r', message: 'Sub one {t}', category: B },
  { id: 'SYN_SUB', subId: '2', regex: 'color|colour|couleur', message: 'Sub two {t}', category: B },
  { id: 'SYN_OFF', regex: 'off', message: 'Default off {t}', defaultOff: true, category: B },
  { id: 'SYN_TEMP', regex: 'temp', message: 'Temp off {t}', defaultTempOff: true, category: B },
  { id: 'SYN_CATOFF', regex: 'cat', message: 'In default-off category {t}', category: C },
  { id: 'SYN_TONE', regex: 'gonna|hey|salut', message: 'Tone {t}', toneTags: ['formal'], category: A },
  { id: 'SYN_CLARITY', regex: 'unclear', message: 'Clarity {t}', toneTags: ['clarity'], category: A },
  { id: 'SYN_GOAL', regex: 'goal', message: 'Goal {t}', toneTags: ['persuasive'], goalSpecific: true, category: A },
  { id: 'SYN_URL', regex: 'link', message: 'Url {t}', url: 'https://example.org/x?a=1&b=2', category: A },
  { id: 'SYN_UNI', regex: '.*[\\p{So}\\p{Cs}äöüÄÖÜéèàç].*', message: 'Unicode {t}', category: A },
  { id: 'SYN_SOFT', regex: 'foobar|Foobar', message: 'Soft {t}', category: A },
  { id: 'SYN_TXT', kind: 'text', regex: '(?i)the end|\\bbad\\b[^.]{0,30}\\bworse\\b|fin\\.', message: 'Text-level {t}', suggestions: ['END'], minToCheckParagraph: 2, category: D },
  { id: 'SYN_TXTPARA', kind: 'text', regex: '\\n\\n|\\r\\n\\r\\n', message: 'Para break', category: D },
];
// rules whose matches the en/fr language filter (Language#filterRuleMatches) rewrites: duplicate and apostrophe suggestions
const RS_F = [
  { id: 'SYN_DUP', regex: 'foo', message: 'Dup {t}', suggestions: ['bar', 'bar', '{t}'], category: A },
  { id: 'SYN_APOS', regex: "foo|'bar|n't|l'|'s|'em", message: 'contraction {t}', suggestions: ['xyz', "'xyz", ' xyz', "n't"], category: A },
  { id: 'SYN_APOS2', regex: "n't|'.*", message: 'contraction {t}', suggestions: ['xyz', 'n’t'], category: B },
];
const RS_ERR = [...RS, { id: 'SYN_TXT_BAD', kind: 'text', regex: 'BOOM', message: 'boom', shiftTo: 100000, category: D }];
const RS_ERR2 = [{ id: 'SYN_TXT_NEG', kind: 'text', regex: 'BOOM', message: 'boom', shiftFrom: -100000, shiftTo: -99990, category: D }];
const RS_ERR3 = [{ id: 'SYN_TXT_EMPTY', kind: 'text', regex: 'BOOM', message: 'boom', shiftFrom: 4, shiftTo: -4, category: D }];

const R = (id, sub) => RS.find((r) => r.id === id && r.subId === sub);
const SEL0 = {};
const SELS = {
  none: SEL0,
  disBad: { disabledRules: ['SYN_BAD'] },
  disSub1: { disabledRules: ['SYN_SUB[1]'] },
  disSubAll: { disabledRules: ['SYN_SUB'] },
  enOffTemp: { enabledRules: ['SYN_OFF', 'SYN_TEMP'] },
  enOffFull: { enabledRules: ['SYN_OFF[]'] },
  enCatC: { enabledCategories: ['SYN_CAT_C'] },
  disCatA: { disabledCategories: ['SYN_CAT_A'] },
  disCatAEnBad: { disabledCategories: ['SYN_CAT_A'], enabledRules: ['SYN_BAD'] },
  onlyBad: { enabledRules: ['SYN_BAD'], enabledOnly: true },
  onlyCatB: { enabledCategories: ['SYN_CAT_B'], enabledOnly: true },
  onlyBoth: { enabledRules: ['SYN_BAD', 'SYN_CATOFF'], enabledCategories: ['SYN_CAT_B'], enabledOnly: true },
  tempOff: { enableTempOff: true },
  disEn: { disabledRules: ['SYN_BAD'], enabledRules: ['SYN_BAD'] },
  disCatEnCat: { disabledCategories: ['SYN_CAT_B'], enabledCategories: ['SYN_CAT_B'] },
  onlyNothing: { enabledOnly: true },
  unknown: { disabledRules: ['NO_SUCH_RULE'], enabledRules: ['NO_SUCH'], disabledCategories: ['NO_CAT'] },
};

// ---- text inputs
const T = (text, extra = {}) => ({ text, ...extra });
const P = (parts, extra = {}) => ({ parts, ...extra });
const tx = (text) => ({ type: 'text', text });
const mk = (text, interpretAs) => (interpretAs === undefined ? { type: 'markup', text } : { type: 'markup', text, interpretAs });
const BASIC = [
  'This is bad. That is worse than foo.', 'foo', 'bad', ' bad', '\nbad', 'bad foo very color colour', 'Das ist schlecht. Das ist sehr schlecht.', "C'est mauvais. Il est très mauvais, la couleur.",
  'Para one bad.\n\nPara two foo very.\n\n\nPara three the end',
  'Line one bad.\r\nLine two foo.\r\n\r\nLine four very bad.', 'bad\rfoo\r\rworse', 'bad\n', 'bad\n\n', '\n\nbad', 'a\nb\nc bad\nd', 'bad.\n', 'bad. \n foo',
  '😀 bad 😀😀 foo 𝒳 worse 😀', 'b😀d bad', '😀', '😀.\n😀 bad', 'foo 😀\n\n😀😀 bad\r\n𠀀 foo', 'x\u{1F600}y bad. Second 😀 sentence with foo.',
  '﻿bad foo', 'bad ﻿ foo', 'bad foo﻿', '﻿﻿', 'a﻿﻿b bad', '﻿', 'bad﻿foo﻿﻿worse', '﻿ bad.\n﻿foo',
  'foo­bar is bad', 'bad­', '­bad', 'foo­bar foo­bar', 'foobar foo­bar. Next foo­­bar bad.', 'b­a­d',
  '', ' ', '\n', '   \n  ', '\t', '\r\n', ' ', ' bad',
  'Äpfel öl bad über', 'Ünïcödé bad — foo… «bad» “foo”', 'I’m not bad, don’t say foo.', "don't foo l'bad 'bar",
  'The end is bad and worse. The end.', 'The end.\n\nThe end again. Fin.', 'bad. And then it gets worse. The end.',
  'Hello world', 'gonna hey unclear goal link', 'temp off cat very', 'off temp cat',
  'First sentence bad. Second sentence foo. Third sentence worse. Fourth sentence very. Fifth sentence the end.',
  'a '.repeat(500) + 'bad', 'bad. '.repeat(60), 'foo\n'.repeat(60), 'bad 😀 '.repeat(30), 'x'.repeat(20000) + ' bad',
];
const MARKUP = [
  P([mk('<p>'), tx('bad foo'), mk('</p>')]),
  P([mk('<p>', '\n\n'), tx('bad'), mk('</p>', '\n\n'), tx('foo')]),
  P([tx('bad '), mk('<b>'), tx('foo'), mk('</b>'), tx(' worse')]),
  P([tx('bad'), mk('<br/>', '\n'), tx('foo'), mk('<br/>', '\n'), tx('worse')]),
  P([tx('ba'), mk('<b>'), tx('d foo')]),
  P([mk('<x>', ''), tx('bad foo')]),
  P([tx('bad'), mk('&nbsp;', ' '), tx('foo')]),
  P([tx('bad'), mk('<x>', 'abcdef'), tx('foo')]),
  P([tx('bad'), mk('<x>', 'ab'), tx('foo')]),
  P([tx('bad'), mk('<x>', 'a\n\nb'), tx('foo worse')]),
  P([tx('bad'), mk("<div\nclass='x'>"), tx('foo'), mk('</div\n>'), tx('worse')]),
  P([tx('bad'), mk("<div\nclass='x'>", '\n'), tx('foo'), mk('\n\n', ' '), tx('worse')]),
  P([mk('<!-- 😀 -->'), tx('😀 bad '), mk('<!-- 𝒳𝒴 -->'), tx('😀 foo')]),
  P([tx('😀'), mk('<😀>', '😀😀'), tx('bad 😀 foo')]),
  P([tx('bad'), mk('<x>', '\r\n'), tx('foo'), mk('<y>', '\r'), tx('worse')]),
  P([mk('<x>'), mk('<y>'), tx('bad'), mk('<z>')]),
  P([mk('<x>')]),
  P([]),
  P([tx('')]),
  P([tx('﻿bad'), mk('<x>', '﻿'), tx('foo﻿')]),
  P([tx('foo­bar '), mk('<x>'), tx('foo­bar bad')]),
  P([tx('The end'), mk('<x>', ' '), tx('is bad and worse. The '), mk('<b>'), tx('end.')]),
  P([tx('Intro.'), mk('<p>', '\n\n'), tx('The end. Bad things happen to the worse.'), mk('</p>', '\n\n')]),
  P([tx('bad. '), mk('<i>', 'x'), tx('. foo. '), mk('</i>', 'yz'), tx('. very.')]),
];
const ID = (arr) => arr;

const check2 = (lang, rules, selection, cases, extra = {}) => ({ op: 'check2', args: { lang, rules, selection, cases, ...extra } });

for (const [lang, c] of LANGS) {
  // basic: all text inputs, selection none, all default
  chunks(BASIC.map((t) => T(t)), 20).forEach((ch, i) => write(`basic-${lang}-${String(i).padStart(2, '0')}`, `check2 ${lang}: synthetic rules, plain texts`, [check2(lang, RS, SEL0, ch)]));
  write(`markup-${lang}`, `check2 ${lang}: AnnotatedText parts incl. interpretAs`, [check2(lang, RS, SEL0, MARKUP)]);
  write(`markup-tokenizeoff-${lang}`, `check2 ${lang}: AnnotatedText parts, tokenizeText=false`, [check2(lang, RS, SEL0, MARKUP.map((m) => ({ ...m, tokenizeText: false })))]);
  write(`tokenizeoff-${lang}`, `check2 ${lang}: tokenizeText=false, plain`, [check2(lang, RS, SEL0, BASIC.slice(0, 60).map((t) => T(t, { tokenizeText: false })))]);

  // modes x para modes x levels x tone tags
  const MT = ['Bad foo. The end.\n\nVery bad color gonna unclear goal. The end.', 'bad worse. Fin.', 'foo\n\nfoo', ''];
  const modeCases = [];
  for (const mode of ['ALL', 'ALL_BUT_TEXTLEVEL_ONLY', 'TEXTLEVEL_ONLY']) for (const paraMode of ['NORMAL', 'ONLYPARA', 'ONLYNONPARA']) for (const text of MT) modeCases.push(T(text, { mode, paraMode }));
  write(`modes-${lang}`, `check2 ${lang}: Mode x ParagraphHandling`, [check2(lang, RS, SEL0, modeCases)]);
  const TONES = [[], ['ALL_TONE_RULES'], ['NO_TONE_RULE'], ['ALL_WITHOUT_GOAL_SPECIFIC'], ['formal'], ['clarity'], ['persuasive'], ['formal', 'persuasive'], ['ALL_TONE_RULES', 'NO_TONE_RULE'], ['NO_TONE_RULE', 'formal'], ['povrem', 'general'], ['ALL_WITHOUT_GOAL_SPECIFIC', 'persuasive']];
  const lvl = [];
  for (const level of ['DEFAULT', 'PICKY']) for (const toneTags of TONES) lvl.push(T('bad very color gonna unclear goal hey link off temp cat. The end.', { level, toneTags }));
  write(`levels-tones-${lang}`, `check2 ${lang}: Level x tone tags`, [check2(lang, RS, SEL0, lvl)]);
  // selections
  const selOps = Object.entries(SELS).map(([k, sel]) => check2(lang, RS, sel, [T('bad foo very color gonna unclear goal off temp cat link. The end.'), T('bad worse colour', { level: 'PICKY' }), T('temp off cat', { level: 'PICKY', toneTags: ['ALL_TONE_RULES'] })]));
  write(`selection-${lang}`, `check2 ${lang}: rule/category selection variants (Tools.selectRules)`, selOps);
  // cancel callback
  const cancel = [];
  for (const n of [0, 1, 2, 3, 5, 100]) for (const t of ['First sentence bad. Second sentence foo. Third sentence worse. Fourth sentence very. Fifth sentence the end.', 'bad', 'bad.\n\nfoo.\n\nworse.']) for (const mode of ['ALL', 'TEXTLEVEL_ONLY']) cancel.push(T(t, { cancelAfter: n, mode }));
  write(`cancel-${lang}`, `check2 ${lang}: checkCancelledCallback cancelling after N direct calls`, [check2(lang, RS, SEL0, cancel)]);
  // text-level error paths (findLineColumn / position errors)
  write(`textlevel-errors-${lang}`, `check2 ${lang}: text-level matches with invalid offsets`, [
    check2(lang, RS_ERR, SEL0, [T('BOOM now'), T('fine text without boom'), T('bad BOOM'), T('a. BOOM. b'), T('')]),
    check2(lang, RS_ERR2, SEL0, [T('BOOM now'), T('a. BOOM. b'), T('x\nBOOM')]),
    check2(lang, RS_ERR3, SEL0, [T('BOOM now')]),
    check2(lang, RS_ERR, SEL0, [P([tx('BOOM'), mk('<x>', 'yy'), tx('z')]), P([mk('<x>', ' '), tx('BOOM')])]),
  ]);
}

for (const [lang] of LANGS) {
  write(`langfilter-${lang}`, `check2 ${lang}: matches rewritten by the language-dependent filter (flagged languageFilterChanged where Java rewrites)`, [
    check2(lang, RS_F, SEL0, ["foo", "don't foo", "foo 'bar l' foo", "it's n't 'em", "can't", "l'homme n't", 'foo foo foo', "j'ai foo", 'I’m foo, don’t', "'s 'em foo"].map((t) => T(t))),
    check2(lang, [...RS, ...RS_F], SEL0, ['bad foo very color', "foo bad don't"].map((t) => T(t))),
  ]);
}

// corpus paragraphs with injected synthetic hits
for (const [lang, c] of LANGS) {
  const paras = corpus(c);
  const cases = paras.slice(0, 40).map((p, i) => T(i % 3 === 0 ? p : `${p.slice(0, 300)} bad foo very.`.replace(/\n+/g, ' ')));
  chunks(cases, 10).forEach((ch, i) => write(`corpus-${lang}-${String(i).padStart(2, '0')}`, `check2 ${lang}: corpus paragraphs`, [check2(lang, RS, SEL0, ch)]));
  const multi = [];
  for (let i = 0; i + 3 <= paras.length && multi.length < 8; i += 17) multi.push(T(paras.slice(i, i + 3).join('\n\n') + '\nbad foo'));
  write(`corpus-multi-${lang}`, `check2 ${lang}: multi-paragraph corpus text`, [check2(lang, RS, SEL0, multi)]);
}

// active-rules
const COMBOS = [];
for (const level of ['DEFAULT', 'PICKY']) for (const toneTags of [[], ['ALL_TONE_RULES'], ['NO_TONE_RULE'], ['formal'], ['persuasive'], ['clarity', 'formal'], ['ALL_WITHOUT_GOAL_SPECIFIC']]) COMBOS.push({ level, toneTags });
for (const [lang] of LANGS) {
  write(`active-${lang}`, `active-rules ${lang}: selection variants`, Object.entries(SELS).map(([, sel]) => ({ op: 'active-rules', args: { lang, rules: RS, selection: sel, combos: COMBOS } })));
}

// lt-api
const R1 = R('SYN_BAD');
const api = (lang, ctor, steps, extra = {}) => ({ op: 'lt-api', args: { lang, ctor, steps, ...extra } });
for (const [lang] of LANGS) {
  const mother = lang === 'en-US' ? 'de-DE' : 'en-US';
  write(`api-${lang}`, `lt-api ${lang}: constructors, rule list API, mutate/check sequences`, [
    api(lang, 'nullLang', []), api(lang, 'nullLangMother', []), api(lang, 'nullAlt', []),
    api(lang, `mother:${mother}`, [{ do: 'addRule', rule: R('SYN_BAD') }, { do: 'allRules' }, { do: 'categories' }]),
    api(lang, 'default', [
      { do: 'allRules' }, { do: 'allActive' }, { do: 'categories' }, { do: 'disabledRules' },
      { do: 'addRule', rule: R('SYN_BAD') }, { do: 'addRule', rule: R('SYN_SUB','1') }, { do: 'addRule', rule: R('SYN_SUB','2') }, { do: 'addRule', rule: R('SYN_OFF') }, { do: 'addRule', rule: R('SYN_CATOFF') },
      { do: 'allRules' }, { do: 'allActive' }, { do: 'categories' },
      { do: 'check', text: 'bad colour off cat' },
      { do: 'disableRule', id: 'SYN_BAD' }, { do: 'check', text: 'bad colour off cat' }, { do: 'allActive' }, { do: 'disabledRules' },
      { do: 'enableRule', id: 'SYN_BAD' }, { do: 'check', text: 'bad colour off cat' },
      { do: 'enableRule', id: 'SYN_OFF' }, { do: 'check', text: 'bad colour off cat' }, { do: 'allActive' },
      { do: 'disableRules', ids: ['SYN_SUB[1]', 'SYN_OFF'] }, { do: 'check', text: 'bad colour off cat' },
      { do: 'disableCategory', id: 'SYN_CAT_B' }, { do: 'isCategoryDisabled', id: 'SYN_CAT_B' }, { do: 'check', text: 'bad colour off cat' },
      { do: 'enableCategory', id: 'SYN_CAT_B' }, { do: 'isCategoryDisabled', id: 'SYN_CAT_B' }, { do: 'check', text: 'bad colour off cat' },
      { do: 'enableCategory', id: 'SYN_CAT_C' }, { do: 'check', text: 'bad colour off cat' },
      { do: 'addRule', rule: { ...R1, id: 'SYN_BAD2', regex: 'colour' } }, { do: 'check', text: 'bad colour off cat' }, { do: 'allRules' },
      { do: 'select', selection: { enableTempOff: true } }, { do: 'allActive' },
      { do: 'patternRules', id: 'SYN_BAD', subId: '1' }, { do: 'patternRules', id: 'NO_SUCH_RULE_XYZ', subId: '1' }, { do: 'patternRules', id: null, subId: '1' },
      { do: 'addRuleNull' }, { do: 'allRules' }, { do: 'check', text: 'bad' },
      { do: 'cleanOverlapping', value: true }, { do: 'check', text: 'bad colour off cat' },
    ]),
    api(lang, 'default', [
      { do: 'addRule', rule: R('SYN_BAD') }, { do: 'check', text: 'bad foo' }, { do: 'setRules', rules: [R('SYN_PICKY')] }, { do: 'allRules' }, { do: 'check', text: 'bad foo' }, { do: 'categories' },
      { do: 'setRules', rules: [] }, { do: 'allRules' }, { do: 'check', text: 'bad foo' }, { do: 'setRulesNull' },
      { do: 'setRules', rules: [R('SYN_BAD'), R('SYN_BAD')] }, { do: 'allRules' }, { do: 'check', text: 'bad foo' },
      { do: 'disableRule', id: 'SYN_BAD' }, { do: 'setRules', rules: [R('SYN_BAD'), R('SYN_SUB','1')] }, { do: 'check', text: 'bad foo' }, { do: 'allActive' }, { do: 'disabledRules' },
    ]),
    api(lang, 'custom', [{ do: 'allRules' }, { do: 'allActive' }, { do: 'categories' }, { do: 'check', text: 'bad foo very' }, { do: 'check', text: 'bad foo very', level: 'PICKY' }, { do: 'addRule', rule: R('SYN_SUB','1') }, { do: 'check', text: 'bad foo very color' }], { rules: RS }),
    api(lang, 'custom', [{ do: 'allRules' }, { do: 'check', text: 'x' }], { rules: [] }),
  ]);
}

// analyze-raw
const AR = [
  'This is a test.', 'Dog.', '', ' ', '\n', 'Hello world. How are you? Fine!', 'First paragraph.\n\nSecond paragraph.\n', 'Line one.\nLine two.', 'Line.\r\nLine2.',
  'foo­bar is soft.', '­foo', 'bad­', 'a­b­c d­e.', 'soft­ hyphen at end­.', 'co­operate. re­enter.',
  '😀 emoji. 𝒳 astral.', 'x﻿y z.', 'Mr. Smith went to Washington. He said: “Hello”.', "Don't stop. It's 5 p.m. e.g. now.", 'I’m here. L’homme est là. Aujourd’hui c’est bien.',
  'Der Hund läuft. Er ist 3,5 km gelaufen.', 'a;b;c', 'The U.S. army (very big) is bad.', '   leading spaces.', 'trailing spaces.   ', 'tab\there.', 'No final punctuation',
  "Il y a un problème avec l'ordinateur. J'ai dit: \"Non.\"", 'Ça va? Oui, ça va très bien.', '...', '?!', 'e-mail e.g. foo-bar well-known.',
];
for (const [lang, c] of LANGS) {
  const paras = corpus(c).slice(0, 6).map((p) => p.slice(0, 400));
  write(`analyze-${lang}`, `analyze-raw ${lang}: raw / disambiguated / pre-disambiguation token dumps`, [{ op: 'analyze-raw', args: { lang, texts: AR } }, { op: 'analyze-raw', args: { lang, texts: paras } }]);
}
console.log('X-CHECK-PIPE cases written');
