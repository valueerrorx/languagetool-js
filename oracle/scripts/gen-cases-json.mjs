// Authors oracle/cases/X-JSON/*.json (inputs only). Op json-serialize: docs/review/F19-oracle.md.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';

const DIR = path.join(ROOT, 'oracle/cases/X-JSON');
rmSync(DIR, { recursive: true, force: true });
mkdirSync(DIR, { recursive: true });
const write = (name, description, ops) => writeFileSync(path.join(DIR, `${name}.json`), JSON.stringify({ kind: 'harness', clock: 'fixed', description, normalize: [], compare: 'json-serialize', ops }, null, 1) + '\n');

const LANGS = ['en-US', 'fr', 'de-DE'];
const A = { id: 'SYN_CAT_A', name: 'Synthetic A' };
const B = { id: 'SYN_CAT_B', name: 'Synthetic B' };
// synthetic rules: word rules matched by regex; extra spec fields sourceFile, issueType, contextForSure (SynthRules.java)
const RS = [
  { id: 'SYN_BAD', regex: '(?i)bad|worse|schlecht|mauvais', message: 'Bad word <suggestion>{t}</suggestion> here', shortMessage: 'bad <suggestion>x</suggestion>', suggestions: ['good', '{t}ly', 'a"b', 'tab\there', 'ü€😀'], category: A, description: 'bad words', issueType: 'Misspelling' },
  { id: 'SYN_PICKY', regex: 'very|très|sehr', message: "Picky 'quoted' \"double\" {t}...", tags: ['picky'], category: B, issueType: 'Style', contextForSure: -1 },
  { id: 'SYN_SUB', subId: '1', regex: 'colou?r', message: 'Sub one {t}', category: B, sourceFile: 'org/languagetool/rules/en/grammar.xml', issueType: 'Grammar', contextForSure: 2 },
  { id: 'SYN_SUB', subId: '2', regex: 'color|colour|couleur', message: 'Sub two {t}', category: B, sourceFile: 'grammar.xml', contextForSure: 4 },
  { id: 'SYN_TEMP', regex: 'temp', message: 'Temp off {t}', defaultTempOff: true, category: B, sourceFile: 'a/b\nc/d.xml' },
  { id: 'SYN_TONE', regex: 'gonna|hey|salut', message: 'Tone {t}', toneTags: ['formal'], tags: ['picky'], category: A, issueType: 'Register' },
  { id: 'SYN_URL', regex: 'link', message: 'Url {t}', url: 'https://example.org/x?a=1&b=2', category: A, issueType: 'Whitespace' },
  { id: 'SYN_URL2', regex: 'ulink', message: 'Url2 {t}', url: 'https://example.org/rule#ä', category: { id: 'SYN_CAT_U', name: 'Ünïcode "cat" \\ name' }, issueType: 'Other' },
  { id: 'SYN_UNI', regex: '.*[\\p{So}\\p{Cs}äöüÄÖÜéèàç].*', message: 'Unicode {t} \u0001 \u001f ctrl', category: A, issueType: 'Characters' },
  { id: 'SYN_APO', regex: 'apo', message: "It's 'a' test -- ... \"q\" <suggestion>{t}</suggestion>", shortMessage: "'s...", category: A, issueType: 'Numbers' },
  { id: 'SYN_TXT', kind: 'text', regex: '(?i)the end|fin\\.', message: 'Text-level {t}', suggestions: ['END'], category: { id: 'SYN_CAT_D', name: 'Synthetic D' }, issueType: 'Typographical', description: 'desc with "quotes" and \\ back' },
  { id: 'SYN_DEF', regex: 'defcat', message: 'Default category {t}', issueType: 'Internationalization' },
];
const MAN_BASE = { id: 'SYN_BAD' };
const T = (text, extra = {}) => ({ text, ...extra });
const tx = (text) => ({ type: 'text', text });
const mk = (text, interpretAs) => (interpretAs === undefined ? { type: 'markup', text } : { type: 'markup', text, interpretAs });
const P = (parts, extra = {}) => ({ parts, ...extra });

const op = (lang, cases, ser = {}) => ({ op: 'json-serialize', args: { lang, rules: RS, selection: {}, ...ser, portLater: lang.startsWith('de') ? 'German tagger (F32)' : undefined, cases } });

const CHECK_TEXTS = [
  'This is bad. That is worse than foo.', 'bad', '', ' ', 'bad foo very color colour', 'Das ist schlecht. Das ist sehr schlecht.', "C'est mauvais. Il est très mauvais, la couleur.",
  'Para one bad.\n\nPara two apo very.\n\n\nPara three the end', 'Line one bad.\r\nLine two apo.\r\n\r\nLine four very bad.', 'bad\rapo\r\rworse',
  '😀 bad 😀😀 apo 𝒳 worse 😀', 'Äpfel öl bad über — apo… «bad» “apo”', 'gonna hey link ulink temp defcat unclear', 'The end is bad and worse. The end.',
  'a '.repeat(80) + 'bad ' + 'b '.repeat(80), 'x'.repeat(300) + ' bad ' + 'y'.repeat(300), '\u001fbad\u0000 apo', 'tab\tbad\ttab', 'bad "quoted" and \\ backslash / slash',
  'bad. '.repeat(30),
];

const ctxCase = (text, ser) => T(text, { ser });
for (const lang of LANGS) {
  const ops = [];
  // plain check results, default serializer params
  write(`check-${lang}`, `json-serialize ${lang}: check2 results, defaults`, [op(lang, CHECK_TEXTS.map((t) => T(t)))]);
  // compact mode x serLang x context size
  const grid = [];
  for (const compactMode of [0, 1, 2, -1]) for (const serLang of [null, lang]) for (const contextSize of [0, 1, 5, 40, 100000, -1]) grid.push(T('Intro text. This is bad and apo. Then very colour.\nNext line link ulink.', { ser: { compactMode, serLang, contextSize } }));
  write(`grid-${lang}`, `json-serialize ${lang}: compactMode x serializer language x contextSize`, [op(lang, grid)]);
  // level / tone variants
  write(`levels-${lang}`, `json-serialize ${lang}: picky level, tone tags, tags in rule block`, [op(lang, [T('very gonna hey bad', { level: 'PICKY' }), T('very gonna hey bad', { level: 'PICKY', toneTags: ['ALL_TONE_RULES'] }), T('very gonna hey bad', { toneTags: ['formal'] }), T('very gonna hey bad')])]);
  // markup (AnnotatedText: context from text WITH markup)
  write(`markup-${lang}`, `json-serialize ${lang}: AnnotatedText with markup, context from markup text`, [op(lang, [
    P([mk('<p>'), tx('bad apo'), mk('</p>')]), P([mk('<p>', '\n\n'), tx('bad'), mk('</p>', '\n\n'), tx('apo')]), P([tx('bad '), mk('<b>'), tx('apo'), mk('</b>'), tx(' worse')]),
    P([tx('bad'), mk('<br/>', '\n'), tx('apo'), mk('<br/>', '\n'), tx('worse')]), P([mk('<x>', ''), tx('bad apo')]), P([tx('😀'), mk('<😀>', '😀😀'), tx('bad 😀 apo')]),
    P([mk('<!-- ' + 'c'.repeat(100) + ' -->'), tx('bad '), mk('<i>'), tx('apo')]), P([tx('bad'), mk('<x>', '\r\n'), tx('apo'), mk('<y>', '\r'), tx('worse')]),
    P([tx('The '), mk('<b>'), tx('end'), mk('</b>'), tx(' is bad.')]), P([tx('bad')], { ser: { contextSize: 3 } }),
  ])]);
  // manual matches: every replacement field, url precedence, autoCorrect, type, specificRuleId, hidden, ranges
  const REP = [
    { value: 'plain' }, { value: 'with desc', shortDescription: 'a short description' }, { value: 'suffix', suffix: ' suf' }, { value: 'translation', type: 'Translation' }, { value: 'curated', type: 'Curated', shortDescription: 'cur' },
    { value: 'conf', confidence: 0.9999955 }, { value: 'conf1', confidence: 1.0 }, { value: 'conf0', confidence: 0 }, { value: 'all', shortDescription: 'sd', suffix: 's', type: 'Translation', confidence: 0.25 },
    { value: '' }, { value: 'ü€😀 "q" \\ / \u001f' }, { value: 'seven' }, { value: 'eight' },
  ];
  const man = (extra) => ({ rule: 'SYN_BAD', from: 5, to: 8, message: 'm', ...extra });
  const mcases = [
    T('Hello bad world and more text.', { matches: [man({}), man({ rule: 'SYN_PICKY', from: 0, to: 5, message: 'Picky <suggestion>x</suggestion> and <suggestion>y</suggestion>' })] }),
    T('Hello bad world and more text.', { matches: [man({ replacements: REP })] }),
    T('Hello bad world and more text.', { matches: [man({ replacements: REP, autoCorrect: true })] }),
    T('Hello bad world and more text.', { matches: [man({ replacements: REP, autoCorrect: true })], ser: { compactMode: 1 } }),
    T('Hello bad world and more text.', { matches: [man({ replacements: REP.slice(0, 5) }), man({ replacements: REP.slice(0, 6) }), man({ replacements: REP.slice(0, 7), autoCorrect: true })], ser: { compactMode: 1 } }),
    T('Hello bad world and more text.', { matches: [man({ replacements: [] }), man({ replacements: [], autoCorrect: true })] }),
    T('Hello bad world and more text.', { matches: [man({ rule: 'SYN_URL', url: 'https://match.example/u' }), man({ rule: 'SYN_URL' }), man({ rule: 'SYN_URL2', url: 'https://m.example/ü?q=1 2' }), man({ rule: 'SYN_BAD' })] }),
    T('Hello bad world and more text.', { matches: [man({ specificRuleId: 'SYN_BAD_SPECIFIC' }), man({ rule: 'SYN_SUB', subId: '1', specificRuleId: 'SYN_SUB_X' }), man({ rule: 'SYN_SUB', subId: '2' })] }),
    T('Hello bad world and more text.', { matches: [man({ type: 'UnknownWord' }), man({ type: 'Hint' }), man({ type: 'Other' })] }),
    T('Hello bad world and more text.', { matches: [man({ rule: 'SYN_TEMP' }), man({ rule: 'SYN_SUB', subId: '1' }), man({ rule: 'SYN_SUB', subId: '2' }), man({ rule: 'SYN_PICKY' }), man({ rule: 'SYN_TONE' }), man({ rule: 'SYN_DEF' }), man({ rule: 'SYN_TXT' })] }),
    T('Hello bad world and more text.', { matches: [man({ rule: 'SYN_SUB', subId: '1' }), man({ rule: 'SYN_TEMP' })], ser: { compactMode: 1 } }),
    T('Hello bad world and more text.', { matches: [man({ shortMessage: 'sh <suggestion>s</suggestion>' }), man({ shortMessage: '' }), man({ shortMessage: null })] }),
    T('Hello bad world and more text.', { matches: [man({ message: '<suggestion>a</suggestion> <suggestion>b</suggestion> </suggestion>x<suggestion>' }), man({ message: '' }), man({ message: "It's 'x' \"y\" ... -- <suggestion>q</suggestion>" })], ser: { serLang: lang } }),
    T('Hello bad world and more text.', { matches: [man({ message: '<suggestion>a</suggestion> <suggestion>b</suggestion> </suggestion>x<suggestion>' }), man({ message: '' }), man({ message: "It's 'x' \"y\" ... -- <suggestion>q</suggestion>" })] }),
    // sentence: null (no sentence key), multi sentence text, trim of sentence text
    T('Hello bad world.', { matches: [man({}), man({ sentence: 'Hello bad world.' }), man({ sentence: '  \t Hello bad world.\n ' }), man({ sentence: ' Hello ' }), man({ sentence: ' \u0001x\u001f ' })] }),
    // hidden matches
    T('Hello bad world.', { matches: [man({})], hidden: [man({ rule: 'SYN_PICKY' })] }),
    T('Hello bad world.', { matches: [], hidden: [man({ rule: 'SYN_PICKY', replacements: REP.slice(0, 4) }), man({})] }),
    T('Hello bad world.', { matches: [], hidden: [] }),
    // ranges
    T('Hello bad world. Second sentence here.', { matches: [man({})], ignoredRanges: [{ from: 0, to: 5, lang: 'en' }, { from: 7, to: 9, lang: 'de-DE' }], sentenceRanges: [[0, 16], [17, 38]] }),
    T('Hello bad world. Second sentence here.', { matches: [], ignoredRanges: [], sentenceRanges: [] }),
    T('Hello bad world. Second sentence here.', { matches: [], sentenceRanges: [[0, 16]], extendedRanges: [{ from: 0, to: 16, rates: [{ language: 'en', rate: 1.0 }] }, { from: 17, to: 38, rates: [{ language: 'de', rate: 0.75 }, { language: 'fr', rate: 0.1 }, { language: 'en', rate: 0.15 }] }, { from: 3, to: 4, rates: [] }] }),
    T('Hello bad world. Second sentence here.', { matches: [], extendedRanges: [{ from: 20, to: 30, rates: [{ language: 'x', rate: 0.9999955 }] }, { from: 0, to: 5, rates: [{ language: 'y', rate: 0.1 }] }] }),
    T('Hello bad world.', { matches: [man({})], sentenceRanges: [[0, 16]], ignoredRanges: [{ from: 1, to: 2, lang: 'fr' }], ser: { compactMode: 1 } }),
    // several CheckResults (ranges and matches concatenated in order)
    T('Hello bad world. Second apo here.', { matches: [man({})], ignoredRanges: [{ from: 0, to: 1, lang: 'en' }], sentenceRanges: [[0, 16]], more: [{ matches: [man({ from: 22, to: 25, rule: 'SYN_APO' })], ignoredRanges: [{ from: 2, to: 3, lang: 'fr' }], sentenceRanges: [[17, 33]], extendedRanges: [{ from: 17, to: 33, rates: [{ language: 'en', rate: 1 }] }] }, { matches: [], ignoredRanges: [] }] }),
    // offsets: zero length, beyond text, negative, unicode, context at borders
    T('Hello bad world.', { matches: [man({ from: 0, to: 1 }), man({ from: 15, to: 16 }), man({ from: 0, to: 16 })] }),
    T('Hello bad world.', { matches: [man({ from: 3, to: 3 })] }),
    T('Hello bad world.', { matches: [man({ from: 16, to: 17 })] }),
    T('😀 bad 😀 world 😀', { matches: [man({ from: 3, to: 6 }), man({ from: 0, to: 2 }), man({ from: 1, to: 3 })] }),
    T('line1\nline2 bad\r\nline3\tx', { matches: [man({ from: 12, to: 15 })], ser: { contextSize: 6 } }),
    T('line1\nline2 bad\r\nline3\tx', { matches: [man({ from: 12, to: 15 })], ser: { contextSize: 0 } }),
    T('Hello bad world.', { matches: [man({ from: 5, to: 100 })] }),
    T('Hello bad world.', { matches: [man({ from: 50, to: 60 })] }),
    T('Hello bad world.', { matches: [man({ from: -3, to: 2 })] }),
    T('', { matches: [man({ from: 0, to: 0 })] }),
    T('', { matches: [man({ from: 0, to: 1 })] }),
    T('a', { matches: [man({ from: 0, to: 1 })] }),
    T('Hello bad world.', { matches: [man({ from: 8, to: 5 })] }),
    T('__languagetool_start_marker bad', { matches: [man({ from: 28, to: 31 })] }),
    T('bad <b>x</b> & "q" \u0001 \u001f \u007f     ü', { matches: [man({ from: 0, to: 3 }), man({ from: 4, to: 6 })], ser: { contextSize: 100 } }),
    // confidence map
    T('Hello bad world.', { matches: [man({}), man({ rule: 'SYN_PICKY' })], ser: { serLang: lang, confidenceMap: [{ lang, ruleId: 'SYN_BAD', value: 0.5 }, { lang, ruleId: 'SYN_PICKY', value: 0.9999955 }] } }),
    T('Hello bad world.', { matches: [man({})], ser: { serLang: lang, confidenceMap: [{ lang: 'ca', ruleId: 'SYN_BAD', value: 0.5 }] } }),
    T('Hello bad world.', { matches: [man({})], ser: { serLang: null, confidenceMap: [{ lang: lang, ruleId: 'SYN_BAD', value: 0.5 }] } }),
    T('Hello bad world.', { matches: [man({})], ser: { serLang: lang, confidenceMap: [] } }),
  ];
  write(`manual-${lang}`, `json-serialize ${lang}: hand-built RuleMatches (replacement fields, urls, hidden, ranges, confidence map)`, [op(lang, mcases)]);
  // software / warnings / language blocks
  const other = lang === 'en-US' ? 'de-DE' : 'en-US';
  const blocks = [];
  for (const compactMode of [0, 1]) for (const incompleteReason of [null, 'timeout after 5s', '', 'ü "q" \\ \n']) for (const showPremiumHint of [false, true]) blocks.push(T('Hello bad world.', { ser: { compactMode, incompleteReason, showPremiumHint } }));
  for (const [detected, confidence, source] of [[lang, 0.9999955, 'fasttext'], [other, 0.5, 'ngram'], [other, 1.0, null], [other, 0, ''], ['ca', 0.123456789, 'ü'], ['en-GB', 0.3, 'x'], ['fr-CA', 0.3, 'x'], ['pt-BR', 0.3, 'x']]) blocks.push(T('Hello bad world.', { ser: { detected, confidence, source } }));
  blocks.push(T('Hello bad world.', { ser: { detected: other } }));
  blocks.push(T('Hello bad world.', { ser: { given: other, detected: lang } }));
  blocks.push(T('Hello bad world.', { ser: { given: 'ca-ES-valencia', detected: lang, confidence: 0.5, source: 's' } }));
  blocks.push(T('Hello bad world.', { ser: { given: 'en-GB', serLang: 'en-GB' } }));
  blocks.push(T('Hello bad world.', { ser: { given: 'pt-PT', serLang: 'pt-PT' } }));
  blocks.push(T('Hello bad world.', { ser: { mode: 'ALL' } }));
  blocks.push(T('Hello bad world.', { ser: { mode: 'TEXTLEVEL_ONLY' } }));
  write(`blocks-${lang}`, `json-serialize ${lang}: software, warnings, language, detectedLanguage blocks`, [op(lang, blocks)]);
  // typography of the message with a serializer language
  const typo = ["It's 'x' \"y\" ... -- <suggestion>q</suggestion>", 'He said "hello" and \'bye\'.', '<suggestion>a</suggestion> "b" <suggestion>c</suggestion>', 'Wert 10 - 20, 3 x 4, (c) (tm) -> <- ', 'l\'homme "x" « y » ‹ z ›', '', ' ', '"', "'", '<suggestion>', '"<suggestion>"x"</suggestion>"', '“x” ‘y’'];
  write(`typo-${lang}`, `json-serialize ${lang}: message cleaning (<suggestion> and toAdvancedTypography)`, [op(lang, [...typo.map((m) => T('Hello bad world.', { matches: [man({ message: m, shortMessage: m })], ser: { serLang: lang } })), ...typo.map((m) => T('Hello bad world.', { matches: [man({ message: m, shortMessage: m })], ser: { serLang: null } }))])]);
}
// spellCheckOnly languages (DynamicLanguage#isSpellcheckOnlyLanguage), registered at runtime
for (const lang of LANGS) {
  const dyn = [{ name: 'Dyn Spell', code: 'xq', path: '/nonexistent/dyn/xq.dict' }];
  const o = op(lang, [T('Hello bad world.', { ser: { given: 'xq' } }), T('Hello bad world.', { ser: { detected: 'xq', confidence: 0.5, source: 'z' } }), T('Hello bad world.', { ser: { given: 'xq', detected: 'xq', confidence: 0.5, source: 'z' } }), T('Hello bad world.', { ser: { given: 'xq', serLang: 'xq' } })]);
  o.args.dynamic = dyn;
  write(`dynamic-${lang}`, `json-serialize ${lang}: spellCheckOnly given/detected language`, [o]);
}
// language-specific serializer language (typography differs per language)
for (const lang of ['en-US', 'fr', 'de-DE']) {
  const msg = ["It's 'x' \"y\" ... -- <suggestion>q</suggestion>", 'a "b" c', "l'homme dit \"oui\"", '<suggestion>x</suggestion>'];
  const cases = [];
  for (const sl of ['en-US', 'en-GB', 'fr', 'fr-CA', 'de-DE', 'de-CH', 'pt-PT', 'ca-ES', 'es', 'nl', 'ru', 'uk', 'pl', 'sv', 'da', 'it', 'ar', 'zh-CN', 'ja-JP', 'el', 'ro', 'sk', 'sl', 'ga', 'br']) for (const m of msg) cases.push(T('Hello bad world.', { matches: [{ rule: 'SYN_BAD', from: 5, to: 8, message: m, shortMessage: m }], ser: { serLang: sl } }));
  write(`typo-langs-${lang}`, `json-serialize ${lang}: serializer language variants`, [op(lang, cases)]);
}
