// Authors oracle/cases/X-PIPE/*.json (inputs only). Ops pipe-check / pipe-office / pipe-config: docs/review/F35-oracle.md.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';

const DIR = path.join(ROOT, 'oracle/cases/X-PIPE');
rmSync(DIR, { recursive: true, force: true });
mkdirSync(DIR, { recursive: true });
const write = (name, description, ops) => writeFileSync(path.join(DIR, `${name}.json`), JSON.stringify({ kind: 'harness', clock: 'fixed', description, normalize: [], compare: 'jsonl', ops }, null, 1) + '\n');
const corpus = (l) => readFileSync(path.join(ROOT, `oracle/corpus/${l}/corpus.txt`), 'utf8').split('\n\n').map((p) => p.replace(/\n+$/, '')).filter(Boolean);
const LANGS = [['en-US', 'en'], ['fr', 'fr'], ['de-DE', 'de']];
const T = (text, extra = {}) => ({ text, ...extra });
const chk = (lang, rules, opts, cases) => ({ op: 'pipe-check', args: { lang, rules, opts, cases } });

const A = { id: 'SYN_CAT_A', name: 'Synthetic A' };
const B = { id: 'SYN_CAT_B', name: 'Synthetic B' };
const C = { id: 'SYN_CAT_C', name: 'Synthetic C (default off)', defaultOff: true };
const D = { id: 'SYN_CAT_D', name: 'Synthetic D' };
const RS = [
  { id: 'SYN_BAD', regex: '(?i)bad|worse|schlecht|mauvais', message: 'Bad word {t}', shortMessage: 'bad', suggestions: ['good', '{t}ly'], category: A, description: 'bad words' },
  { id: 'SYN_PICKY', regex: 'very|très|sehr', message: 'Picky {t}', tags: ['picky'], category: B },
  { id: 'SYN_SUB', subId: '1', regex: 'colou?r', message: 'Sub one {t}', category: B },
  { id: 'SYN_SUB', subId: '2', regex: 'color|colour|couleur', message: 'Sub two {t}', category: B },
  { id: 'SYN_TONE', regex: 'gonna|hey|salut', message: 'Tone {t}', toneTags: ['formal'], category: A },
  { id: 'SYN_URL', regex: 'link', message: 'Url {t}', url: 'https://example.org/x?a=1&b=2', category: A },
  { id: 'SYN_TXT', kind: 'text', regex: '(?i)the end|\\bbad\\b[^.]{0,30}\\bworse\\b|fin\\.', message: 'Text-level {t}', suggestions: ['END'], minToCheckParagraph: 2, category: D },
  { id: 'SYN_TXTPARA', kind: 'text', regex: '\\n\\n|\\r\\n\\r\\n', message: 'Para break', category: D },
];
const RS_F = [
  { id: 'SYN_DUP', regex: 'foo', message: 'Dup {t}', suggestions: ['bar', 'bar', '{t}'], category: A },
  { id: 'SYN_APOS', regex: "foo|'bar|n't|l'|'s|'em", message: 'contraction {t}', suggestions: ['xyz', "'xyz", ' xyz', "n't"], category: A },
  { id: 'SYN_APOS2', regex: "n't|'.*", message: 'contraction {t}', suggestions: ['xyz', 'n’t'], category: B },
];

// ---- office (CORE-0054)
const OFFICE_RULES = [
  { id: 'SYN_A', regex: 'a', category: A },
  { id: 'SYN_B_OFF', regex: 'b', defaultOff: true, category: A },
  { id: 'SYN_C_OOFF', regex: 'c', officeDefaultOff: true, category: A },
  { id: 'SYN_D_OOFF_ON', regex: 'd', officeDefaultOff: true, officeDefaultOn: true, category: A },
  { id: 'SYN_E_OON', regex: 'e', officeDefaultOn: true, category: A },
  { id: 'SYN_F_OFF_OON', regex: 'f', defaultOff: true, officeDefaultOn: true, category: A },
  { id: 'SYN_G_CATOFF_OON', regex: 'g', officeDefaultOn: true, category: C },
  { id: 'SYN_H_CATOFF', regex: 'h', category: C },
  { id: 'SYN_SUB', subId: '1', regex: 'i', officeDefaultOff: true, category: B },
  { id: 'SYN_SUB', subId: '2', regex: 'j', category: B },
  { id: 'SYN_TMP', regex: 'k', defaultTempOff: true, officeDefaultOn: true, category: B },
];
const s = (d, id) => ({ do: d, ...(id ? { id } : {}) });
const SEQS = {
  plain: [s('state'), s('office'), s('state'), s('active')],
  twice: [s('office'), s('office'), s('state')],
  activeFirst: [s('active'), s('office'), s('active'), s('state')],
  disableD: [s('disable', 'SYN_D_OOFF_ON'), s('office'), s('state')],
  disableE: [s('disable', 'SYN_E_OON'), s('disable', 'SYN_F_OFF_OON'), s('office'), s('state'), s('active')],
  enableC: [s('enable', 'SYN_C_OOFF'), s('office'), s('state')],
  enableBandC: [s('enable', 'SYN_B_OFF'), s('enable', 'SYN_SUB'), s('office'), s('state'), s('active')],
  disableA: [s('disable', 'SYN_A'), s('office'), s('state')],
  disableSub: [s('disable', 'SYN_SUB'), s('office'), s('state')],
  disableCat: [s('disableCategory', 'SYN_CAT_A'), s('office'), s('state'), s('active')],
  disableCatC: [s('disableCategory', 'SYN_CAT_C'), s('office'), s('state')],
  unknownIds: [s('disable', 'NOPE'), s('enable', 'NOPE2'), s('office'), s('state')],
};
for (const [lang] of LANGS) write(`office-${lang}`, `getAllActiveOfficeRules ${lang}: officeDefaultOn/Off combos and state mutation`, Object.values(SEQS).map((steps) => ({ op: 'pipe-office', args: { lang, rules: OFFICE_RULES, steps } })));

// ---- unknown words (CORE-0059)
const UNK = ['Das ist ein Haus.', 'Xyzzyq blorptastic foo.', 'Hello wrld, this is a tset of unknwn words!', 'Qwertzuiop asdfgh 12345 -- ... ??', '', ' ', 'Zzyzx\nBlarg Zzyzx. Blarg again.', 'Äpfel Ünïcödé Straßenbahnfahrer Donaudampfschifffahrt.', 'Bonjour le mondde, ceci est un tesst.', 'Ich habe ein Hasuf gesehen. Das ist Quatsh.', 'x y z 😀 😀 Zorp', 'Nice nice NICE Nice', 'don\'t cann\'t l\'homme l\'hommme', 'Ein Satz. Noch ein Satzzz. Und nochh einer.', 'Foo-bar baz_qux a.b.c e-mail@exmple.org http://exmple.org/qq', 'word'.repeat(300)];
for (const [lang] of LANGS) {
  write(`unknown-${lang}`, `listUnknownWords/getUnknownWords ${lang}`, [
    chk(lang, RS.slice(0, 1), { listUnknownWords: true }, UNK.map((t) => T(t, { unknown: true }))),
    chk(lang, RS.slice(0, 1), { listUnknownWords: false }, UNK.slice(0, 4).map((t) => T(t, { unknown: true }))),
    chk(lang, RS.slice(0, 1), {}, UNK.slice(0, 3).map((t) => T(t, { unknown: true }))),
    chk(lang, RS.slice(0, 1), { listUnknownWords: true }, UNK.slice(0, 3).map((t) => T(t, { unknown: true, mode: 'TEXTLEVEL_ONLY' }))),
    chk(lang, RS.slice(0, 1), { listUnknownWords: true }, [T('Zzyzx Blarg.', { unknown: true, paraMode: 'ONLYPARA' }), T('Zzyzx Blarg.', { unknown: true, tokenizeText: false }), { parts: [{ type: 'text', text: 'Zorp ' }, { type: 'markup', text: '<b>' }, { type: 'text', text: 'blarg' }], unknown: true }]),
  ]);
}

// ---- verbose (CORE-0058)
const VERB = ['This is bad.', 'Das ist schlecht. Noch ein Satz.', 'Bonjour mauvais.', '', ' ', 'bad\n\nworse', 'Ünï bad 😀'];
for (const [lang] of LANGS) write(`verbose-${lang}`, `setOutput verbose ${lang}`, [
  chk(lang, RS, { verbose: true }, VERB.map((t) => T(t))),
  chk(lang, [], { verbose: true }, VERB.slice(0, 3).map((t) => T(t))),
  chk(lang, RS, { verbose: true }, VERB.slice(0, 3).map((t) => T(t, { mode: 'TEXTLEVEL_ONLY' }))),
  chk(lang, RS, { verbose: false }, VERB.slice(0, 2).map((t) => T(t))),
]);

// ---- config values (CORE-0060)
const ty = (t, v) => ({ t, v: String(v) });
write('config', 'setConfigValues / UserConfig.getConfigValueByID', [
  { op: 'pipe-config', args: { lang: 'en-US', steps: [
    { do: 'get', id: 'R1' },
    { do: 'set', map: { R1: [ty('Integer', 5), ty('String', 'x'), ty('Boolean', true), ty('Double', 0.5), ty('Long', 9007199254740993), ty('Float', 1.1)] } },
    { do: 'get', id: 'R1' }, { do: 'get', id: 'R2' },
    { do: 'set', map: { R1: [ty('Integer', -1)], R2: [], R3: [null] } },
    { do: 'get', id: 'R1' }, { do: 'get', id: 'R2' }, { do: 'get', id: 'R3' },
    { do: 'set', map: {} }, { do: 'get', id: 'R1' },
    { do: 'set', map: { R4: null } }, { do: 'get', id: 'R4' },
    { do: 'setNull' }, { do: 'get', id: 'R1' },
    { do: 'set', map: { '': [ty('String', '')], 'ü': [ty('String', 'ä😀')] } }, { do: 'get', id: '' }, { do: 'get', id: 'ü' },
    { do: 'set', map: { BIG: [ty('Integer', 2147483647), ty('Integer', -2147483648), ty('Long', -9223372036854775808n), ty('Double', 1e300), ty('Double', -0.0), ty('Float', 3.4028235e38)] } }, { do: 'get', id: 'BIG' },
  ].map((x) => JSON.parse(JSON.stringify(x, (k, v) => (typeof v === 'bigint' ? v.toString() : v)))) } },
]);

// ---- extended sentence ranges / ignore ranges (CORE-0084)
const NL = [
  { id: 'SYN_NL1', kind: 'newlang', regex: 'bonjour|hallo', newLanguages: { fr: 0.9 }, category: A },
  { id: 'SYN_NL2', kind: 'newlang', regex: 'ciao', newLanguages: { it: 0.6, es: 0.3 }, category: A },
  { id: 'SYN_NL3', kind: 'newlang', regex: 'empty', newLanguages: {}, category: A },
];
const RANGE_TEXTS = ['Hello world. Bonjour le monde. Hallo Welt.', '  Hello world.  Second sentence.   Third.', ' Leading space. Next.', 'One.\nTwo.\n\nThree.', 'Hello. ciao amici. Bye.', 'bonjour bonjour. bonjour.', 'empty sentence. And empty.', '', ' ', '\n', 'Short', '😀 Hello. 😀 bonjour 😀.', 'A.  \n  B.', 'Hello.\t\tTab.', 'Sentence one.   Sentence two!  Sentence three?  ', '  \n  Bonjour.', 'Hello world. ciao bonjour amici.'];
for (const [lang] of LANGS) write(`ranges-${lang}`, `extended sentence ranges, newLanguageMatches, ignored ranges ${lang}`, [
  chk(lang, [...NL, ...RS], { listener: true }, RANGE_TEXTS.map((t) => T(t))),
  chk(lang, [...NL, ...RS], {}, RANGE_TEXTS.slice(0, 6).map((t) => T(t, { mode: 'ALL_BUT_TEXTLEVEL_ONLY' }))),
  chk(lang, [...NL, ...RS], {}, RANGE_TEXTS.slice(0, 6).map((t) => T(t, { mode: 'TEXTLEVEL_ONLY' }))),
  chk(lang, NL, {}, [{ parts: [{ type: 'text', text: 'Hello. ' }, { type: 'markup', text: '<b>', interpretAs: '' }, { type: 'text', text: 'bonjour amis.' }] }, { parts: [{ type: 'markup', text: '<p>' }, { type: 'text', text: '  Hallo. Hello.' }] }]),
  chk(lang, NL, {}, RANGE_TEXTS.slice(0, 5).map((t) => T(t, { paraMode: 'ONLYPARA' }))),
  chk(lang, NL, {}, RANGE_TEXTS.slice(0, 5).map((t) => T(t, { tokenizeText: false }))),
]);

// ---- error rate (CORE-0085)
const ALLW = [{ id: 'SYN_ALL', regex: '.+', message: 'all {t}', category: A }];
const ALLW2 = [{ id: 'SYN_ALL', regex: '[A-Za-z]+', message: 'all {t}', category: A }, { id: 'SYN_ALL2', regex: '[a-z]+', message: 'two {t}', category: B }, { id: 'SYN_ALL3', regex: 'w1', message: 'three {t}', category: B }];
const words = (n, w = 'w') => Array.from({ length: n }, (_, i) => `${w}${i}`).join(' ');
const sentWords = (n, per) => { const out = []; for (let i = 0; i < n; i += per) out.push(words(Math.min(per, n - i), 'v') + '.'); return out.join(' '); };
const ER_TEXTS = [words(10) + '.', words(24) + '.', words(25) + '.', words(26) + '.', words(30) + '.', sentWords(60, 20), sentWords(27, 9), 'Ein ' + words(30, 'ä'), '😀 ' + words(30), words(26) + '. ok ok ok.', ''];
const RATES = [0.1, 0.5, 0.0, -1, 0.333, 0.005, 1.0, 2.5, 0.125, 0.995, 0.045, 0.74999, 0.25];
for (const [lang] of LANGS) write(`errorrate-${lang}`, `maxErrorsPerWordRate / ErrorRateTooHighException ${lang}`, [
  ...RATES.map((r) => chk(lang, ALLW, { maxErrorsPerWordRate: r }, ER_TEXTS.map((t) => T(t)))),
  ...[0.1, 0.5, 0.02, 1.0].map((r) => chk(lang, ALLW2, { maxErrorsPerWordRate: r }, ER_TEXTS.slice(0, 9).map((t) => T(t)))),
  chk(lang, [...ALLW, ...RS], { maxErrorsPerWordRate: 0.3 }, ER_TEXTS.slice(2, 8).map((t) => T(t, { mode: 'TEXTLEVEL_ONLY' }))),
  chk(lang, ALLW, { maxErrorsPerWordRate: 0.2 }, [T(words(30)), T(words(30), { level: 'PICKY' }), T(words(30), { paraMode: 'ONLYPARA' })]),
]);

// ---- rule failure wrapping (CORE-0086)
const boom = (how, regex = 'boom') => ({ id: `SYN_BOOM_${how.toUpperCase()}`, kind: 'boom', throw: how, regex, category: A });
const FAIL_TEXTS = ['fine text', 'This is boom.', 'Two sentences. Second has boom!', 'Ünï boom 😀.', 'x'.repeat(700) + ' boom ' + 'y'.repeat(700), ('word ').repeat(2200) + 'boom', 'boom', 'a boom\n\nb boom'];
for (const [lang] of LANGS) write(`failure-${lang}`, `sentence check failure wrapping ${lang}`, [
  ...['runtime', 'io', 'illegal', 'so', 'assert'].map((h) => chk(lang, [boom(h), ...RS.slice(0, 2)], {}, FAIL_TEXTS.map((t) => T(t)))),
  chk(lang, [...RS.slice(0, 2), boom('runtime', 'foo')], { cleanOverlapping: false }, FAIL_TEXTS.slice(0, 4).map((t) => T(t, { mode: 'TEXTLEVEL_ONLY' }))),
  chk(lang, [boom('runtime')], { listener: true }, FAIL_TEXTS.slice(0, 3).map((t) => T(t, { paraMode: 'ONLYNONPARA' }))),
]);

// ---- post-check filters (CORE-0087, CORE-0186, CORE-0187)
const OV = [
  { id: 'SYN_OV1', regex: 'alpha', message: 'ov1 {t}', suggestions: ['x'], category: A },
  { id: 'SYN_OV1', subId: 'b', regex: 'alpha|beta', message: 'ov1b {t}', suggestions: ['y'], category: A },
  { id: 'SYN_OV2', regex: 'beta|gamma', message: 'ov2 {t}', suggestions: ['y', 'z'], category: B },
  { id: 'SYN_OV3', regex: 'gamma', message: 'ov3 {t}', category: B, tags: ['picky'] },
  { id: 'SYN_OVTXT', kind: 'text', regex: 'alpha beta|beta gamma', message: 'ovtxt {t}', category: D },
  { id: 'SYN_OVTXT2', kind: 'text', regex: 'alpha beta gamma', message: 'ovtxt2 {t}', suggestions: ['alpha, beta'], category: D },
];
// real language priority ids and priority-bearing categories (data from Language#getPriorityForId and category maps)
const PRIO = [
  { id: 'MORFOLOGIK_RULE_EN_US', regex: 'teh|tset', message: 'spell {t}', suggestions: ['the'], category: { id: 'TYPOS', name: 'Typos' } },
  { id: 'UPPERCASE_SENTENCE_START', regex: 'teh', message: 'upper {t}', suggestions: ['The'], category: { id: 'CASING', name: 'Casing' } },
  { id: 'COMMA_PARENTHESIS_WHITESPACE', regex: 'teh|tset', message: 'ws {t}', category: { id: 'TYPOGRAPHY', name: 'Typography' } },
  { id: 'SYN_STYLE', regex: 'teh', message: 'style {t}', category: { id: 'STYLE', name: 'Style' } },
  { id: 'SYN_GRAM', regex: 'teh|tset', message: 'grammar {t}', category: { id: 'GRAMMAR', name: 'Grammar' } },
  { id: 'MORFOLOGIK_RULE_DE_DE', regex: 'teh', message: 'spell de {t}', category: { id: 'TYPOS', name: 'Typos' } },
  { id: 'GERMAN_SPELLER_RULE', regex: 'teh', message: 'spell de2 {t}', category: { id: 'TYPOS', name: 'Typos' } },
  { id: 'FR_SPELLING_RULE', regex: 'teh', message: 'spell fr {t}', category: { id: 'TYPOS', name: 'Typos' } },
];
const OVT = ['alpha beta gamma', 'alpha', 'beta', 'gamma delta', 'alpha beta', 'xx alpha, beta gamma. beta gamma alpha', 'alpha.\nbeta gamma', 'alpha alpha alpha', ''];
const PT = ['teh tset', 'teh', 'tset teh teh', 'Teh teh. teh tset.', ''];
const FILT = [[{ kind: 'dropRule', id: 'SYN_OV2' }], [{ kind: 'reverse' }], [{ kind: 'suffix', suffix: ' #' }], [{ kind: 'dropRule', id: 'SYN_OV1' }, { kind: 'suffix', suffix: ' @' }, { kind: 'reverse' }]];
for (const [lang] of LANGS) write(`filters-${lang}`, `post-check filters: SameRuleGroup, CleanOverlapping, language filter, custom ${lang}`, [
  chk(lang, OV, { cleanOverlapping: false }, OVT.map((t) => T(t))),
  chk(lang, OV, { cleanOverlapping: true }, OVT.map((t) => T(t))),
  chk(lang, OV, { cleanOverlapping: true }, OVT.slice(0, 6).map((t) => T(t, { level: 'PICKY' }))),
  chk(lang, OV, { cleanOverlapping: true }, OVT.slice(0, 6).map((t) => T(t, { mode: 'ALL_BUT_TEXTLEVEL_ONLY' }))),
  chk(lang, OV, { cleanOverlapping: true }, OVT.slice(0, 6).map((t) => T(t, { mode: 'TEXTLEVEL_ONLY' }))),
  chk(lang, PRIO, { cleanOverlapping: false }, PT.map((t) => T(t))),
  chk(lang, PRIO, { cleanOverlapping: true }, PT.map((t) => T(t))),
  chk(lang, PRIO, { cleanOverlapping: true }, PT.map((t) => T(t, { level: 'PICKY' }))),
  chk(lang, [...RS, ...RS_F], { cleanOverlapping: true }, ['bad foo very color', "foo bad don't", 'color colour couleur', 'bad worse bad'].map((t) => T(t, { level: 'PICKY' }))),
  chk(lang, [...RS, ...RS_F], { cleanOverlapping: false }, ['bad foo very color', "foo bad don't", 'color colour couleur', 'bad worse bad'].map((t) => T(t, { level: 'PICKY' }))),
  chk(lang, RS_F, { cleanOverlapping: false }, ["foo", "don't foo", "foo 'bar l' foo", "it's n't 'em", "can't", "l'homme n't", 'foo foo foo', "j'ai foo", 'I’m foo, don’t', "'s 'em foo"].map((t) => T(t))),
  chk(lang, RS_F, { cleanOverlapping: true }, ["foo", "don't foo", "foo 'bar l' foo", "it's n't 'em", 'foo foo foo', "'s 'em foo"].map((t) => T(t))),
  ...FILT.map((f) => chk(lang, OV, { cleanOverlapping: true, filters: f }, OVT.slice(0, 6).map((t) => T(t)))),
  ...FILT.map((f) => chk(lang, OV, { cleanOverlapping: false, filters: f, listener: true }, OVT.slice(0, 5).map((t) => T(t)))),
]);

// ---- listeners (CORE-0088)
for (const [lang] of LANGS) write(`listener-${lang}`, `RuleMatchListener call order ${lang}`, [
  chk(lang, RS, { listener: true }, ['This is bad. That is worse than foo.', 'bad foo very color colour', 'Para one bad.\n\nPara two bad very.\n\nThe end', 'The end is bad and worse. The end.', '', 'color\n\ncolour bad'].map((t) => T(t, { level: 'PICKY' }))),
  chk(lang, RS, { listener: true }, ['bad worse. The end.\n\nbad', 'The end bad'].flatMap((t) => ['ALL', 'ALL_BUT_TEXTLEVEL_ONLY', 'TEXTLEVEL_ONLY'].flatMap((mode) => ['NORMAL', 'ONLYPARA', 'ONLYNONPARA'].map((paraMode) => T(t, { mode, paraMode, level: 'PICKY' }))))),
  chk(lang, OV, { listener: true, cleanOverlapping: true }, OVT.slice(0, 6).map((t) => T(t))),
  chk(lang, [...RS, ...RS_F], { listener: true }, ["foo don't bad", "it's 'em"].map((t) => T(t))),
]);

// ---- MultiThreadedJLanguageTool (CORE-0091)
const MT_TEXTS = (c) => [
  'This is bad. That is worse than foo. Third bad sentence. The end.', 'Para one bad.\n\nPara two bad very.\n\nThe end', 'bad', '', 'Das ist schlecht. Das ist sehr schlecht. Noch ein Satz mit color.', "C'est mauvais. Il est très mauvais, la couleur. Salut.", 'a. b. c. bad. d. e. f. color. g. h.',
  ...corpus(c).slice(0, 6).map((p, i) => `${p.slice(0, 600)} bad foo very.`.replace(/\n+/g, ' ')),
];
const MT_OPTS = [-1, 0, 1, 2, 3, 8, 64];
for (const [lang, c] of LANGS) {
  const ts = MT_TEXTS(c).map((t) => T(t, { level: 'PICKY', unknown: true }));
  write(`mt-${lang}`, `MultiThreadedJLanguageTool vs JLanguageTool ${lang} (threads null = single-threaded reference)`, [
    chk(lang, RS, { threads: null, listUnknownWords: true }, ts),
    ...MT_OPTS.map((n) => chk(lang, RS, { threads: n, listUnknownWords: true }, ts)),
    chk(lang, RS, { threads: 2 }, [T('bad. worse.'), T('bad. worse.', { shutdownBefore: true }), T('bad'), T('')]),
    chk(lang, RS, { threads: 2 }, [T('bad. worse.'), T('bad. worse.', { shutdownWhenDoneBefore: true }), T('bad. worse. foo.')]),
    chk(lang, RS, { threads: 3, cleanOverlapping: true }, MT_TEXTS(c).slice(0, 7).map((t) => T(t, { mode: 'TEXTLEVEL_ONLY' }))),
    chk(lang, [...OV, boom('runtime', 'boom')], { threads: 3, cleanOverlapping: true }, OVT.slice(0, 6).concat(['alpha boom']).map((t) => T(t))),
  ]);
}

// ---- ResultCache (CORE-0095)
const CT = ['This is bad. That is worse.', 'This is bad. That is worse.', 'This is bad. Something new bad.', 'bad foo very color', 'bad foo very color', 'The end.\n\nbad', 'bad'];
for (const [lang, c] of LANGS) {
  const ct = [...CT, ...corpus(c).slice(0, 4).map((p) => p.slice(0, 400).replace(/\n+/g, ' '))];
  write(`cache-${lang}`, `ResultCache effects ${lang}`, [
    chk(lang, RS, { cache: null }, ct.map((t) => T(t))),
    chk(lang, RS, { cache: 1000 }, ct.map((t) => T(t))),
    chk(lang, RS, { cache: 1000 }, CT.flatMap((t) => [T(t), T(t, { level: 'PICKY' }), T(t, { toneTags: ['formal'] }), T(t, { mode: 'ALL_BUT_TEXTLEVEL_ONLY' })])),
    chk(lang, RS, { cache: 1, listener: true }, CT.map((t) => T(t))),
    chk(lang, RS, { cache: 0 }, CT.slice(0, 4).map((t) => T(t))),
    chk(lang, RS, { cache: 1000, cleanOverlapping: true }, CT.map((t) => T(t, { level: 'PICKY' }))),
    chk(lang, [...OV, ...RS_F], { cache: 1000, cleanOverlapping: true, listener: true }, [...OVT, "foo don't", "foo don't"].map((t) => T(t))),
    chk(lang, [...NL, ...RS], { cache: 1000 }, ['Hello. bonjour. Hallo.', 'Hello. bonjour. Hallo.', 'bonjour', 'ciao ciao'].map((t) => T(t))),
    chk(lang, [boom('runtime'), ...RS], { cache: 1000 }, ['bad', 'boom', 'bad', 'boom'].map((t) => T(t))),
    chk(lang, RS, { cache: 1000, maxErrorsPerWordRate: 0.5, listUnknownWords: true }, [T(words(30)), T(words(30)), T('bad bad bad', { unknown: true }), T('bad bad bad', { unknown: true })]),
  ]);
}
console.log('done');
