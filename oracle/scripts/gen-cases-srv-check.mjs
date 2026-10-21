// Generates oracle/cases/X-SRV-CHECK (inputs only; expected values come from the Java server, F69).
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';

const OUT = path.join(ROOT, 'oracle/cases/X-SRV-CHECK');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const NORM = ['buildDate', 'commit'];
const write = (name, description, extra) => writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify({ kind: 'http', clock: 'fixed', description, compare: 'api', normalize: NORM, serverArgs: [], ...extra }, null, 1) + '\n');
const get = (p, params, more = {}) => ({ method: 'GET', path: p, ...(params ? { params } : {}), ...more });
const post = (p, params, more = {}) => ({ method: 'POST', path: p, ...(params ? { params } : {}), ...more });
const dev006 = (r) => ({ ...r, expect: 'dev006' });
const basic = (u, p) => ({ Authorization: 'Basic ' + Buffer.from(`${u}:${p}`).toString('base64') });
const CFG = (props) => ({ serverArgs: ['--config', '{WORK}/server.properties'], files: { 'server.properties': props } });
const C = '/v2/check';

const EN = 'COMMA_PARENTHESIS_WHITESPACE,DOUBLE_PUNCTUATION,ENGLISH_WORD_REPEAT_RULE,EN_UNPAIRED_BRACKETS,EN_UNPAIRED_QUOTES,SENTENCE_WHITESPACE,UPPERCASE_SENTENCE_START,WHITESPACE_PUNCTUATION,WHITESPACE_RULE';
const FR = 'COMMA_PARENTHESIS_WHITESPACE,DOUBLE_PUNCTUATION,UNPAIRED_BRACKETS,UNPAIRED_QUOTES,UPPERCASE_SENTENCE_START,WHITESPACE_PUNCTUATION,WHITESPACE_RULE,WORD_REPEAT_RULE';
const DE = 'COMMA_PARENTHESIS_WHITESPACE,DE_DOUBLE_PUNCTUATION,DE_SENTENCE_WHITESPACE,DE_UNPAIRED_QUOTES,GERMAN_WORD_REPEAT_RULE,UNPAIRED_BRACKETS,UPPERCASE_SENTENCE_START,WHITESPACE_PUNCTUATION,WHITESPACE_RULE';
const ALL = [...new Set([...EN.split(','), ...FR.split(','), ...DE.split(',')])].join(',');
const ONLY = (rules) => ({ enabledRules: rules, enabledOnly: 'true' });
const LC = { 'en-US': ['en-US', EN], de: ['de-DE', DE], fr: ['fr', FR] };
const T = {
  en: 'This is a test,, ok. The the cat sat on the mat. this starts lowercase.',
  de: 'Das ist ein Test,, ok. Das das ist falsch. das beginnt klein.',
  fr: 'Ceci est un test,, ok. Le le chat dort. ceci commence en minuscule.',
};
const TL = { 'en-US': T.en, 'de-DE': T.de, fr: T.fr };
const LANGS = [['en-US', EN, T.en], ['de-DE', DE, T.de], ['fr', FR, T.fr]];

// 1. data parameter (SRV-0098, SRV-0099)
{
  const reqs = [];
  for (const [l, rules, t] of LANGS) {
    const p = { language: l, ...ONLY(rules) };
    reqs.push(post(C, { ...p, data: JSON.stringify({ text: t }) }));
    reqs.push(get(C, { ...p, data: JSON.stringify({ text: t }) }));
    reqs.push(post(C, { ...p, data: JSON.stringify({ text: t, metaData: { DocumentTitle: 'Titel', EmailToAddress: 'a@b.c', FullName: 'Max Muster', EmailNumberOfAttachments: '2', Custom: 'x' } }) }));
    reqs.push(post(C, { ...p, data: JSON.stringify({ annotation: [{ text: t.split('.')[0] + '.' }, { markup: '<b>' }, { text: t.split('.').slice(1).join('.') }, { markup: '</b>' }] }) }));
    reqs.push(post(C, { ...p, data: JSON.stringify({ annotation: [{ text: 'A ' }, { markup: '<p>' }, { text: 'test,, here.' }, { markup: '</p>', interpretAs: '\n\n' }, { text: 'Second,, para.' }] }) }));
  }
  const p = { language: 'en-US', ...ONLY(EN) };
  const D = (o) => post(C, { ...p, data: typeof o === 'string' ? o : JSON.stringify(o) });
  reqs.push(D('not json'), D('{}'), D(''), D('[]'), D('null'), D('"string"'), D('123'), D('{"text":'), D('{"text":"a","annotation":[]}'), D({ text: 'a', annotation: [{ text: 'b' }] }), D({ annotation: [] }), D({ annotation: 'x' }), D({ annotation: {} }), D({ annotation: null }), D({ text: null }));
  reqs.push(D({ text: 12345 }), D({ text: true }), D({ text: ['a', 'b'] }), D({ text: { a: 'b' } }), D({ text: '' }), D({ text: '   ' }), D({ text: 'Ünïcödé,, ok. 😀 emoji.' }), D({ text: 'a\u0000b,, ok.' }), D({ text: 'Tab\tnew\nline,, ok.' }));
  reqs.push(D({ annotation: [{ text: 'a,, b.', markup: '<x>' }] }), D({ annotation: [{ text: 'a', interpretAs: 'b' }] }), D({ annotation: [{ markup: '<x>', interpretAs: 'b', text: 'c' }] }), D({ annotation: [{ foo: 'bar' }] }), D({ annotation: [{}] }), D({ annotation: [1] }), D({ annotation: ['x'] }), D({ annotation: [null] }), D({ annotation: [[]] }));
  reqs.push(D({ annotation: [{ text: 123 }, { text: ',, ok.' }] }), D({ annotation: [{ text: true }] }), D({ annotation: [{ text: null }] }), D({ annotation: [{ markup: 5 }, { text: 'x,, y' }] }), D({ annotation: [{ markup: '<a>', interpretAs: 5 }, { text: 'x,, y' }] }), D({ annotation: [{ markup: '<a>', interpretAs: null }, { text: 'x,, y' }] }));
  reqs.push(D({ annotation: [{ text: 'a' }, { text: 'a,, b' }, { markup: '' }, { text: '' }] }), D({ annotation: [{ markup: '<br>', interpretAs: '\n' }, { markup: '<br>', interpretAs: '\n' }, { text: 'x,, y' }] }), D({ annotation: [{ text: 'Tom & Jerry,, ok.' }, { markup: '&amp;', interpretAs: '&' }] }));
  reqs.push(D({ text: 'a,, b', metaData: { EmailToAddress: 5 } }), D({ text: 'a,, b', metaData: 'x' }), D({ text: 'a,, b', metaData: [] }), D({ text: 'a,, b', metaData: {} }), D({ text: 'a,, b', metaData: { x: { y: 1 } } }), D({ annotation: [{ text: 'a,, b' }], metaData: { FullName: 'X' } }), D({ text: 'a,, b', extra: 1 }));
  reqs.push(D('{"text":"a,, b"} trailing'), D('{"text":"a,, b"}{"text":"c"}'), D(' {"text" : "a,, b" } '), D("{'text':'a'}"), D('{"text":"a",}'), D('{"text":"a","text":"b,, c"}'), D('﻿{"text":"a,, b"}'));
  reqs.push(post(C, { ...p, text: 'x,, y', data: '{}' }), post(C, { language: 'en-US', ...ONLY(EN) }), post(C, { ...p, data: JSON.stringify({ text: 'Fine.' }), text: undefined }));
  reqs.push(post(C, null, { body: JSON.stringify({ language: 'en-US', data: { text: 'a,, b' } }), contentType: 'application/json' }));
  write('data-json', 'data parameter: text/annotation/metaData, parse errors, error texts, invalid node types (de/en/fr)', { requests: reqs });
}

// 2. text length limits (SRV-0114)
{
  const base = { language: 'en-US', ...ONLY(EN) };
  const reqs = [
    post(C, { ...base, text: 'x'.repeat(30) }), post(C, { ...base, text: 'x'.repeat(31) }), post(C, { ...base, text: 'x'.repeat(29) }), get(C, { ...base, text: 'x'.repeat(31) }), post(C, { ...base, text: 'x'.repeat(100) }),
    post(C, { ...base, text: 'x'.repeat(200) }), post(C, { ...base, text: 'ä'.repeat(31) }), post(C, { ...base, text: '😀'.repeat(15) }), post(C, { ...base, text: '😀'.repeat(16) }), post(C, { ...base, text: ' '.repeat(40) }), post(C, { ...base, text: 'a\n'.repeat(16) }),
    post(C, { ...base, data: JSON.stringify({ text: 'x'.repeat(31) }) }), post(C, { ...base, data: JSON.stringify({ text: 'x'.repeat(30) }) }),
    post(C, { ...base, data: JSON.stringify({ annotation: [{ markup: '<p>'.repeat(30) }, { text: 'Short,, ok.' }] }) }), post(C, { ...base, data: JSON.stringify({ annotation: [{ markup: '<b>', interpretAs: 'x'.repeat(40) }, { text: 'Short.' }] }) }),
    post(C, { ...base, data: JSON.stringify({ annotation: [{ text: 'x'.repeat(20) }, { markup: '<i>' }, { text: 'y'.repeat(20) }] }) }),
    post(C, { language: 'de-DE', text: 'ö'.repeat(31), ...ONLY(DE) }), post(C, { language: 'fr', text: 'é'.repeat(31), ...ONLY(FR) }), post(C, { language: 'auto', text: 'x'.repeat(31), ...ONLY(ALL) }), post(C, { language: 'xx', text: 'x'.repeat(31) }),
    post(C, { text: 'x'.repeat(31) }), post(C, { language: 'en-US', ...ONLY(EN), text: 'x'.repeat(31), username: 'u', apiKey: 'k' }), post(C, { ...base, text: 'x'.repeat(31), enabledOnly: 'false' }),
    get('/v2/maxtextlength'),
  ];
  write('text-length', 'maxTextLengthAnonymous=30: TextTooLongException 413 boundaries, plain-text length (UTF-16 units, markup excluded)', { ...CFG('maxTextLengthAnonymous=30\nmaxTextLengthLoggedIn=60\nmaxTextLengthPremium=90\nmaxTextHardLength=500\n'), requests: reqs });
  write('text-length-hard', 'maxTextHardLength=40 together with maxTextLength=1000', { ...CFG('maxTextLength=1000\nmaxTextHardLength=40\n'), requests: [
    post(C, { ...base, text: 'x'.repeat(40) }), post(C, { ...base, text: 'x'.repeat(41) }), post(C, { ...base, text: 'x'.repeat(500) }), get('/v2/maxtextlength'), post(C, { language: 'fr', text: 'é'.repeat(41), ...ONLY(FR) }),
  ] });
  write('text-length-premium', 'premiumAlways: maxTextLengthPremium applies to anonymous requests', { ...CFG('premiumAlways=true\nmaxTextLengthAnonymous=20\nmaxTextLengthPremium=50\n'), requests: [
    post(C, { ...base, text: 'x'.repeat(21) }), post(C, { ...base, text: 'x'.repeat(50) }), post(C, { ...base, text: 'x'.repeat(51) }), get('/v2/maxtextlength'),
  ] });
}

// 3. dicts, dictionary filter (SRV-0116, SRV-0117), textSessionId (SRV-0118)
{
  const reqs = [];
  for (const [l, rules, t] of LANGS) {
    const p = { language: l, text: t, ...ONLY(rules) };
    reqs.push(post(C, { ...p, dicts: 'a' }), post(C, { ...p, dicts: 'b,a' }), post(C, { ...p, dicts: '' }), post(C, { ...p, dicts: ',' }), post(C, { ...p, dicts: 'a,,b' }), post(C, { ...p, filterDictionaryMatches: 'false' }), post(C, { ...p, filterDictionaryMatches: 'true' }),
      post(C, { ...p, filterDictionaryMatches: 'TRUE' }), post(C, { ...p, filterDictionaryMatches: 'no' }), post(C, { ...p, filterDictionaryMatches: '' }), post(C, { ...p, dicts: 'a', filterDictionaryMatches: 'false' }));
  }
  const p = { language: 'en-US', text: T.en, ...ONLY(EN) };
  reqs.push(post(C, { ...p, dicts: 'a', username: 'u', apiKey: 'k' }), post(C, { ...p, dict: 'a' }), post(C, { ...p, dicts: 'Grüße,日本' }), post(C, { ...p, dicts: 'x'.repeat(500) }));
  write('dicts', 'dicts and filterDictionaryMatches parameters without DB (de/en/fr)', { requests: reqs });
  const sess = [];
  for (const [l, rules, t] of LANGS) {
    const q = { language: l, text: t, ...ONLY(rules) };
    for (const id of ['1', '123456789', '-2', '0', 'abc', '', '99999999999999999999', '1.5', ' 7 ', 'ä']) sess.push(post(C, { ...q, textSessionId: id }));
  }
  sess.push(post(C, { language: 'en-US', text: T.en, textSessionId: '5', enableTempOffRules: 'true', ...ONLY(EN) }), get(C, { language: 'en-US', text: T.en, textSessionId: '5', ...ONLY(EN) }));
  write('text-session', 'textSessionId values (response unaffected; SRV-0118)', { requests: sess });
}

// 4. auto / preferredVariants / noopLanguages / preferredLanguages (SRV-0120..0123)
{
  const EL = 'This is a longer english sentence,, that the the detector can handle without any trouble at all.';
  const DL = 'Das ist ein ziemlich langer deutscher Satz,, den den der Detektor ohne Probleme erkennen kann.';
  const FL = 'Ceci est une phrase française assez longue,, que que le détecteur peut reconnaître sans aucun problème.';
  const ES = 'Esta es una frase española bastante larga,, que que el detector puede reconocer sin problemas.';
  const A = (t, more = {}) => post(C, { language: 'auto', text: t, ...ONLY(ALL), ...more });
  const reqs = [];
  for (const t of [EL, DL, FL]) {
    reqs.push(A(t), A(t, { preferredVariants: 'en-GB' }), A(t, { preferredVariants: 'de-AT' }), A(t, { preferredVariants: 'fr-CA' }), A(t, { preferredVariants: 'en-GB,de-AT,fr-CH' }), A(t, { preferredVariants: 'en-GB, de-CH, fr-BE' }), A(t, { preferredVariants: 'en-AU,de-DE' }), A(t, { preferredVariants: 'en-ZA' }),
      A(t, { preferredVariants: 'en' }), A(t, { preferredVariants: 'en_GB' }), A(t, { preferredVariants: 'xx-YY' }), A(t, { preferredVariants: '' }), A(t, { preferredVariants: ',' }), A(t, { preferredVariants: 'EN-gb' }), A(t, { preferredVariants: 'en-GB,en-US' }), A(t, { preferredVariants: 'de-DE,en-GB' }),
      A(t, { noopLanguages: 'en' }), A(t, { noopLanguages: 'de,fr' }), A(t, { noopLanguages: 'en,de,fr' }), A(t, { noopLanguages: 'xx' }), A(t, { noopLanguages: '' }), A(t, { noopLanguages: 'en-US' }),
      A(t, { preferredLanguages: 'de,fr' }), A(t, { preferredLanguages: 'en' }), A(t, { preferredLanguages: 'de' }), A(t, { preferredLanguages: 'fr', forcePreferredLanguages: 'true' }), A(t, { preferredLanguages: 'de', forcePreferredLanguages: 'true' }), A(t, { preferredLanguages: 'en,de,fr', forcePreferredLanguages: 'true' }),
      A(t, { preferredLanguages: 'xx' }), A(t, { preferredLanguages: 'en-GB' }), A(t, { preferredLanguages: '' }), A(t, { preferredLanguages: 'de', forcePreferredLanguages: 'false' }), A(t, { preferredLanguages: 'de, fr' }), A(t, { preferredLanguages: 'nb' }), A(t, { preferredLanguages: 'no' }),
      A(t, { ld: 'test' }), A(t, { ld: 'TEST' }), A(t, { ld: 'control' }), A(t, { ld: 'x' }));
  }
  // explicit language: preferredVariants validated during detection, noopLanguages rejected
  for (const [l, rules, t] of LANGS) {
    const q = { language: l, text: t, ...ONLY(rules) };
    reqs.push(post(C, { ...q, preferredVariants: 'en-GB' }), post(C, { ...q, preferredVariants: 'en' }), post(C, { ...q, noopLanguages: 'en' }), post(C, { ...q, preferredLanguages: 'de' }), post(C, { ...q, preferredVariants: 'en-GB', multilingual: 'true' }), post(C, { ...q, preferredVariants: 'en-GB', multilingual: 'false' }), post(C, { ...q, multilingual: 'true' }),
      post(C, { ...q, preferredVariants: 'xx', multilingual: 'true' }), post(C, { ...q, forcePreferredLanguages: 'true' }), post(C, { ...q, noopLanguages: 'en', multilingual: 'true' }));
  }
  // other languages: out-of-scope winners (DEV-008)
  reqs.push(dev006(A(ES)), dev006(A(ES, { preferredVariants: 'es-AR' })), dev006(A('Dit is een vrij lange nederlandse zin,, die die de detector zonder problemen kan herkennen.')), dev006(A(ES, { noopLanguages: 'es' })), A(ES, { preferredLanguages: 'en' }));
  // degenerate texts
  for (const t of ['', ' ', 'Ok.', '1234 5678', 'a', '!!!', 'Hello', 'Bonjour', 'Hallo', 'Ünï', '日本語のテキストです。', 'http://example.org/foo', 'Hello,, wörld.', 'x'.repeat(300), 'The the. Le le. Das das.']) reqs.push(A(t));
  reqs.push(get(C, { language: 'auto', text: EL, ...ONLY(ALL), preferredVariants: 'en-GB' }));
  reqs.push(post(C, { language: 'auto', text: EL, enabledRules: 'DOUBLE_PUNCTUATION', enabledOnly: 'true' }));
  reqs.push(post(C, { language: 'AUTO', text: EL, ...ONLY(ALL) }), post(C, { language: 'auto ', text: EL, ...ONLY(ALL) }));
  write('auto', 'language=auto, preferredVariants, noopLanguages, preferredLanguages, forcePreferredLanguages, ld, multilingual, degenerate texts (SRV-0120..0123, F18 R2)', { requests: reqs });
}

// 5. detection on explicit-language requests (detectedLanguage differs from language)
{
  const reqs = [];
  const texts = [['en-US', EN, T.de], ['de-DE', DE, T.en], ['fr', FR, T.en], ['en-GB', EN, T.fr], ['de-AT', DE, T.fr], ['fr-CA', FR, T.de], ['en', EN, 'Ok.'], ['de', DE, 'Ok.'], ['fr-FR', FR, 'Ok.'], ['en-US', EN, 'Hallo, wie geht es dir heute? Mir geht es gut, danke.'], ['de-CH', DE, 'Hello, how are you today? I am fine, thank you.'], ['fr-BE', FR, 'Bonjour, comment allez-vous aujourd\'hui ? Je vais bien, merci.']];
  for (const [l, rules, t] of texts) reqs.push(post(C, { language: l, text: t, ...ONLY(rules) }));
  for (const t of ['', 'x', '123', 'Café naïve façade,, résumé.']) for (const l of ['en-US', 'de-DE', 'fr']) reqs.push(post(C, { language: l, text: t, ...ONLY(LC[l === 'de-DE' ? 'de' : l][1]) }));
  write('detect-explicit', 'detectedLanguage recorded for explicit language with foreign/short texts (SRV-0122)', { requests: reqs });
}

// 6. motherTongue (SRV-0125) incl. false friends
{
  const reqs = [];
  const mk = (l, mt, t, more = {}) => post(C, { language: l, motherTongue: mt, text: t, ...more });
  const EN_FF = 'The change of ability is an issue. Please queue up and rest. He will retire soon.';
  const DE_FF = 'Das ist aktuell. Ich werde eventuell kommen. Er will ein Geschenk bekommen. Das ist also gut.';
  const FR_FF = 'Je vais changer ma queue. Il faut demander la confidence. Elle veut rester ici.';
  for (const [l, t] of [['en-US', EN_FF], ['en-GB', EN_FF], ['de-DE', DE_FF], ['fr', FR_FF]]) for (const mt of ['de', 'de-DE', 'en', 'en-US', 'fr', 'fr-FR', 'de-AT']) reqs.push(mk(l, mt, t));
  for (const [l, rules, t] of LANGS) reqs.push(mk(l, 'de', t, ONLY(rules)), mk(l, 'fr', t, ONLY(rules)), mk(l, 'en', t, ONLY(rules)));
  for (const mt of ['xx', 'XX', '', ' ', 'de-XX', 'english', 'auto', 'de_DE', 'x'.repeat(100)]) reqs.push(mk('en-US', mt, EN_FF));
  reqs.push(mk('auto', 'de', EN_FF), mk('auto', 'en', DE_FF), mk('auto', 'de', FR_FF), mk('auto', 'fr', EN_FF));
  reqs.push(dev006(mk('en-US', 'es', EN_FF)), dev006(mk('en-US', 'pt', EN_FF)), dev006(mk('en-US', 'nl', EN_FF)), dev006(mk('de-DE', 'ru', DE_FF)), dev006(mk('fr', 'it', FR_FF)));
  for (const lv of ['picky', 'default']) reqs.push(mk('en-US', 'fr', EN_FF, { level: lv }), mk('de-DE', 'en', DE_FF, { level: lv }), mk('fr', 'en', FR_FF, { level: lv }), mk('de-DE', 'fr', DE_FF, { level: lv }), mk('en-GB', 'de', EN_FF, { level: lv }));
  reqs.push(mk('de-DE', 'en', DE_FF, { enabledCategories: 'FALSE_FRIENDS', enabledOnly: 'true' }), mk('de-DE', 'en', DE_FF, { disabledCategories: 'FALSE_FRIENDS' }), mk('fr', 'en', FR_FF, { enabledCategories: 'FALSE_FRIENDS', enabledOnly: 'true' }), mk('en-US', 'fr', EN_FF, { enabledCategories: 'FALSE_FRIENDS', enabledOnly: 'true' }), mk('de-DE', 'en', DE_FF, { enabledCategories: 'FALSE_FRIENDS', enabledOnly: 'true', mode: 'textLevelOnly' }), mk('de-DE', 'en', DE_FF, { enabledCategories: 'FALSE_FRIENDS', enabledOnly: 'true', level: 'picky' }), mk('fr', 'en', FR_FF, { enabledCategories: 'FALSE_FRIENDS', enabledOnly: 'true', level: 'picky' }), mk('en-US', 'fr', 'The change is an issue. Please queue up.', { level: 'picky' }), mk('en-US', 'fr', 'He will retire. Do not hurt the nurse.', { level: 'picky' }), mk('de-DE', 'en', DE_FF, { level: 'picky', disabledCategories: 'FALSE_FRIENDS' }), mk('de-DE', 'en', DE_FF, { level: 'picky', disabledRules: 'ACTUAL' }), mk('auto', 'en', DE_FF, { level: 'picky' }), mk('auto', 'en', FR_FF, { level: 'picky' }));
  write('mother-tongue', 'motherTongue: false friends per pair, invalid values, auto (SRV-0125)', { requests: reqs });
}

// 7. enabledOnly, altLanguages (SRV-0126)
{
  const reqs = [];
  for (const [l, rules, t] of LANGS) {
    const q = { language: l, text: t };
    reqs.push(post(C, { ...q, ...ONLY(rules) }), post(C, { ...q, enabledOnly: 'yes', enabledRules: rules }), post(C, { ...q, enabledOnly: 'TRUE', enabledRules: rules }), post(C, { ...q, enabledOnly: 'Yes', enabledRules: rules }), post(C, { ...q, enabledOnly: 'false', enabledRules: rules }), post(C, { ...q, enabledOnly: 'no', enabledRules: rules }),
      post(C, { ...q, enabledOnly: '1', enabledRules: rules }), post(C, { ...q, enabledOnly: '', enabledRules: rules }), post(C, { ...q, enabledOnly: 'true' }), post(C, { ...q, enabledOnly: 'true', enabledRules: '' }), post(C, { ...q, enabledOnly: 'true', disabledRules: 'X', enabledRules: rules }), post(C, { ...q, enabledOnly: 'true', disabledCategories: 'X', enabledRules: rules }),
      post(C, { ...q, enabledOnly: 'true', enabledCategories: 'PUNCTUATION' }), post(C, { ...q, enabledOnly: 'true', enabledCategories: 'TYPOGRAPHY,PUNCTUATION' }), post(C, { ...q, enabledOnly: 'true', enabledRules: 'NOT_EXISTING_RULE' }), post(C, { ...q, enabledOnly: 'true', enabledCategories: 'NOT_EXISTING_CAT' }));
  }
  const e = { language: 'en-US', text: T.en, ...ONLY(EN) };
  for (const alt of ['de-DE', 'de', 'fr', 'fr-FR', 'en-GB', 'en', 'de-DE,fr-FR', 'de-DE, fr-FR', 'de-DE,', ',', '', 'xx', 'de-XX', 'en-US', 'en-GB,en-AU', 'DE-de', 'fr-CA,de-AT,en-NZ', ' de-DE']) reqs.push(post(C, { ...e, altLanguages: alt }));
  reqs.push(post(C, { language: 'de-DE', text: T.de, ...ONLY(DE), altLanguages: 'en-US' }), post(C, { language: 'fr', text: T.fr, ...ONLY(FR), altLanguages: 'en-US,de-DE' }), post(C, { language: 'auto', text: T.en, ...ONLY(ALL), altLanguages: 'de-DE' }), post(C, { language: 'auto', text: T.en, ...ONLY(ALL), altLanguages: 'de' }));
  reqs.push(dev006(post(C, { ...e, altLanguages: 'es-ES' })), dev006(post(C, { ...e, altLanguages: 'pt' })), dev006(post(C, { ...e, altLanguages: 'ca-ES' })), dev006(post(C, { ...e, altLanguages: 'nl' })));
  write('enabled-only-alt', 'enabledOnly truthiness and conflicts, altLanguages parsing/validation (SRV-0126)', { requests: reqs });
}

// 8. rule / category lists (SRV-0127)
{
  const reqs = [];
  for (const [l, rules, t] of LANGS) {
    const q = { language: l, text: t };
    const ids = rules.split(',');
    reqs.push(post(C, { ...q, enabledRules: ids[0], enabledOnly: 'true' }), post(C, { ...q, enabledRules: ids[0] + ',' + ids[1], enabledOnly: 'true' }), post(C, { ...q, enabledRules: ids[0] + ',,' + ids[1], enabledOnly: 'true' }), post(C, { ...q, enabledRules: ',' + ids[0], enabledOnly: 'true' }), post(C, { ...q, enabledRules: ids[0] + ',', enabledOnly: 'true' }),
      post(C, { ...q, enabledRules: ids[0] + ', ' + ids[1], enabledOnly: 'true' }), post(C, { ...q, enabledRules: ' ' + ids[0], enabledOnly: 'true' }), post(C, { ...q, enabledRules: ids[0].toLowerCase(), enabledOnly: 'true' }), post(C, { ...q, enabledRules: ids[0] + ',' + ids[0], enabledOnly: 'true' }),
      post(C, { ...q, disabledRules: rules }), post(C, { ...q, disabledRules: '' }), post(C, { ...q, disabledRules: ',' }), post(C, { ...q, disabledRules: 'NOT_EXISTING' }), post(C, { ...q, disabledRules: ids[0] }), post(C, { ...q, disabledRules: ids[0] + ',' + ids[1] }),
      post(C, { ...q, enabledRules: ids[1], disabledRules: ids[1] }), post(C, { ...q, enabledRules: ids[1], disabledRules: ids[1], enabledOnly: 'true' }),
      post(C, { ...q, enabledRules: ids[0], enabledCategories: 'PUNCTUATION', enabledOnly: 'true' }), post(C, { ...q, enabledCategories: 'PUNCTUATION', enabledOnly: 'true' }), post(C, { ...q, enabledCategories: 'TYPOGRAPHY', enabledOnly: 'true' }), post(C, { ...q, enabledCategories: 'CASING', enabledOnly: 'true' }), post(C, { ...q, enabledCategories: 'TYPOS', enabledOnly: 'true' }),
      post(C, { ...q, disabledCategories: 'PUNCTUATION,TYPOGRAPHY,CASING', enabledRules: rules }), post(C, { ...q, disabledCategories: 'PUNCTUATION' }), post(C, { ...q, disabledCategories: 'TYPOS' }), post(C, { ...q, disabledCategories: 'TYPOS,GRAMMAR,CASING,PUNCTUATION,TYPOGRAPHY,STYLE,MISC,CONFUSED_WORDS,REDUNDANCY,SEMANTICS' }),
      post(C, { ...q, disabledCategories: '' }), post(C, { ...q, enabledCategories: '' }), post(C, { ...q, enabledCategories: ',' }), post(C, { ...q, enabledCategories: 'NOT_EXISTING' }), post(C, { ...q, disabledCategories: 'NOT_EXISTING' }), post(C, { ...q, enabledCategories: 'PUNCTUATION', disabledCategories: 'PUNCTUATION' }),
      post(C, { ...q, enabledRules: ids[0], enabledOnly: 'false' }), post(C, { ...q, enabledRules: '' }), post(C, { ...q, enabledRules: ',' }), post(C, { ...q, enabledRules: 'NOT_EXISTING_RULE' }), post(C, { ...q, enabledRules: ids[0], disabledCategories: 'PUNCTUATION' }),
      get(C, { ...q, enabledRules: ids[0] + ',' + ids[1], enabledOnly: 'true' }));
  }
  const q = { language: 'en-US', text: T.en };
  reqs.push(post(C, { ...q, enabledRules: 'UPPERCASE_SENTENCE_START', disabledRules: 'UPPERCASE_SENTENCE_START', enabledOnly: 'true' }), post(C, { ...q, enabledRules: 'DOUBLE_PUNCTUATION', enabledOnly: 'true', enabledCategories: 'X', disabledRules: '' }), post(C, { ...q, enabledRules: 'DOUBLE_PUNCTUATION,GRAMMAR_X', enabledOnly: 'true' }));
  write('rule-lists', 'enabled/disabled Rules and Categories: splitting, empties, case, conflicts, unknown ids, enabledOnly errors (SRV-0127)', { requests: reqs });
}

// 9. temp-off, incomplete results (SRV-0128, SRV-0129)
{
  const reqs = [];
  for (const [l, rules, t] of LANGS) {
    const q = { language: l, text: t };
    for (const v of ['true', 'false', 'TRUE', 'yes', '1', '']) reqs.push(post(C, { ...q, enableTempOffRules: v, ...ONLY(rules) }));
    reqs.push(post(C, { ...q, enableTempOffRules: 'true' }), post(C, { ...q, enableTempOffRules: 'true', enabledRules: rules, enabledOnly: 'true' }), post(C, { ...q, enableTempOffRules: 'true', disabledRules: rules }));
    for (const v of ['true', 'false', 'yes', '']) reqs.push(post(C, { ...q, allowIncompleteResults: v, ...ONLY(rules) }));
    for (const v of ['true', 'false', 'yes']) reqs.push(post(C, { ...q, enableHiddenRules: v, ...ONLY(rules) }));
  }
  write('temp-off', 'enableTempOffRules, allowIncompleteResults, enableHiddenRules values (SRV-0128, SRV-0129)', { requests: reqs });
}

// 10. mode, level, toneTags (SRV-0130..0132)
{
  const reqs = [];
  const P = { 'en-US': 'I think that, in my opinion, this is really very good. It is what it is. We utilize a lot of really great stuff. This is a test,, ok.', 'de-DE': 'Ich finde, dass das eigentlich ziemlich gut ist. Es ist halt so. Das ist ein Test,, ok. Er sagte, dass er kommt, weil es so ist, dass es regnet.', fr: 'Je pense que, à mon avis, c\'est vraiment très bien. C\'est comme ça. Ceci est un test,, ok. Le le chat.' };
  for (const l of Object.keys(P)) {
    const q = { language: l, text: P[l] };
    for (const m of ['all', 'batch', 'textLevelOnly', 'allButTextLevelOnly', '', 'bogus', 'ALL', 'textlevelonly', ' all']) reqs.push(post(C, { ...q, mode: m }));
    for (const lv of ['default', 'picky', 'academic', 'clarity', 'professional', 'creative', 'customer', 'jobapp', 'objective', 'elegant', 'PICKY', 'Picky', '', 'bogus', 'standard', ' picky']) reqs.push(post(C, { ...q, level: lv }));
    reqs.push(post(C, { ...q, level: 'picky', mode: 'textLevelOnly' }), post(C, { ...q, level: 'picky', mode: 'allButTextLevelOnly' }), post(C, { ...q, level: 'academic', mode: 'textLevelOnly' }), post(C, { ...q, level: 'bogus', mode: 'bogus' }), post(C, { ...q, mode: 'bogus', level: 'picky' }));
    for (const tt of ['ACADEMIC', 'CLARITY', 'PROFESSIONAL', 'CREATIVE', 'CUSTOMER', 'JOBAPP', 'OBJECTIVE', 'ELEGANT', 'POSITIVE', 'NEGATIVE', 'FORMAL', 'INFORMAL', 'PERSUASIVE', 'CONFIDENT', 'SCIENTIFIC', 'GENERAL', 'NO_TONE_RULE', 'ALL_TONE_RULES', 'ALL_WITHOUT_GOAL_SPECIFIC', 'FOO', 'academic', '', ',', 'ACADEMIC,CLARITY', 'ACADEMIC,FOO', 'NO_TONE_RULE,ACADEMIC', 'ALL_TONE_RULES,CLARITY', 'NO_TONE_RULE,ALL_TONE_RULES', ' ACADEMIC', 'ACADEMIC, CLARITY']) reqs.push(post(C, { ...q, toneTags: tt }));
    reqs.push(post(C, { ...q, level: 'picky', toneTags: 'ACADEMIC' }), post(C, { ...q, level: 'picky', toneTags: 'NO_TONE_RULE' }), post(C, { ...q, level: 'picky', toneTags: 'ALL_TONE_RULES' }));
  }
  write('mode-level-tone', 'mode, level and toneTags values (SRV-0130..0132) with default rule sets de/en/fr', { requests: reqs });
}

// 11. callback, inputLogging, ruleValues (SRV-0133..0135)
{
  const reqs = [];
  for (const [l, rules, t] of LANGS) {
    const q = { language: l, text: t, ...ONLY(rules) };
    for (const cb of ['cb', 'myCallback', 'ABC', 'a1', 'a_b', 'a-b', '1', '', ' ', 'cb(', 'callback.x', '<script>', 'ä', 'x'.repeat(100)]) reqs.push(post(C, { ...q, callback: cb }));
    reqs.push(get(C, { ...q, callback: 'cb' }), post(C, { ...q, callback: 'cb', text: '' }), post(C, { ...q, callback: 'cb', language: 'xx' }), post(C, { language: l, callback: 'cb' }));
    for (const v of ['no', 'yes', 'NO', '', 'false', 'true']) reqs.push(post(C, { ...q, inputLogging: v }));
  }
  const LONG = 'This is a very long sentence that goes on and on and on without any good reason whatsoever, and it keeps going with more and more words until the reader loses all interest in it completely.';
  const LONG_DE = 'Dies ist ein sehr langer Satz, der immer weiter und weiter geht, ohne irgendeinen guten Grund zu haben, und er geht noch weiter mit mehr und mehr Wörtern, bis der Leser jedes Interesse daran verliert.';
  const en = { language: 'en-US', text: LONG };
  const de = { language: 'de-DE', text: LONG_DE };
  for (const [b, id] of [[en, 'TOO_LONG_SENTENCE'], [de, 'TOO_LONG_SENTENCE_DE']]) {
    for (const rv of [`${id}:10`, `${id}:5`, `${id}:100`, `${id}:50`, `${id}:abc`, `${id}:-1`, `${id}:0`, `${id}:`, `${id}:10;20`, `${id}: 10`, `${id}:true`, `${id}:1.5`, `${id}:10,OTHER:5`, `OTHER:5`, `${id}`, ``, `:10`, `${id}:99999999999`, `${id}:10:20`, `${id}:a;b;c`, `,`, `${id}:10,`]) reqs.push(post(C, { ...b, enabledRules: id, enabledOnly: 'true', ruleValues: rv }));
    reqs.push(post(C, { ...b, enabledRules: id, enabledOnly: 'true' }), post(C, { ...b, ruleValues: `${id}:10` }), post(C, { ...b, ruleValues: `${id}:10`, level: 'picky' }));
  }
  reqs.push(post(C, { language: 'en-US', text: LONG, enabledRules: 'TOO_LONG_SENTENCE', enabledOnly: 'true', ruleValues: 'TOO_LONG_SENTENCE:10', data: undefined }));
  write('callback-logging-rulevalues', 'callback (JSONP) validation, inputLogging, ruleValues parsing incl. errors (SRV-0133..0135)', { requests: reqs });
}

// 12. bitext (SRV-0136)
{
  const reqs = [];
  const pairs = [['de-DE', 'en-US', 'Das ist ein Haus.', 'This is a house.'], ['en-US', 'de-DE', 'This is a house.', 'Das ist ein Haus.'], ['fr', 'en-US', 'Ceci est une maison.', 'This is a house.'], ['en-US', 'fr', 'This is a house.', 'Ceci est une maison.'], ['de-DE', 'fr', 'Das ist ein Haus.', 'Ceci est une maison.'], ['fr', 'de-DE', 'Ceci est une maison.', 'Das ist ein Haus.'], ['en-GB', 'de-AT', 'This is a house.', 'Das ist ein Haus.']];
  for (const [src, tgt, st, tt] of pairs) {
    reqs.push(post(C, { language: tgt, text: tt, sourceLanguage: src, sourceText: st }), post(C, { language: tgt, text: tt + ',, ok.', sourceLanguage: src, sourceText: st + ',, ok.' }), post(C, { language: tgt, text: tt, sourceLanguage: src, sourceText: st, ...ONLY(DE + ',' + EN + ',' + FR) }),
      post(C, { language: tgt, text: tt, sourceLanguage: src, sourceText: st, motherTongue: src }), get(C, { language: tgt, text: tt, sourceLanguage: src, sourceText: st }), post(C, { language: tgt, text: 'Der Hund und die die Katze. Zwei Hunde.', sourceLanguage: src, sourceText: 'The dog and the cat. Two dogs.' }));
  }
  reqs.push(post(C, { language: 'en-US', text: 'This is a house.', sourceText: 'Das ist ein Haus.' }), post(C, { language: 'en-US', text: 'This is a house.', sourceText: 'Das ist ein Haus.', sourceLanguage: '' }), post(C, { language: 'en-US', text: 'This is a house.', sourceText: 'Das ist ein Haus.', sourceLanguage: 'xx' }),
    post(C, { language: 'en-US', text: 'This is a house.', sourceText: 'Das ist ein Haus.', sourceLanguage: 'auto' }), post(C, { language: 'auto', text: 'This is a house.', sourceText: 'Das ist ein Haus.', sourceLanguage: 'de-DE' }), post(C, { language: 'en-US', text: 'This is a house.', sourceText: '', sourceLanguage: 'de-DE' }),
    post(C, { language: 'en-US', text: '', sourceText: 'Das ist ein Haus.', sourceLanguage: 'de-DE' }), post(C, { language: 'en-US', text: 'This is a house.', sourceLanguage: 'de-DE' }), post(C, { language: 'en-US', text: 'This is a house.', sourceText: 'Das ist ein Haus.', sourceLanguage: 'de' }),
    post(C, { language: 'en-US', data: JSON.stringify({ text: 'This is a house.' }), sourceText: 'Das ist ein Haus.', sourceLanguage: 'de-DE' }), post(C, { language: 'en-US', text: 'a'.repeat(20), sourceText: 'b'.repeat(20), sourceLanguage: 'de-DE' }), post(C, { language: 'en-US', text: 'One. Two.', sourceText: 'Eins.', sourceLanguage: 'de-DE' }),
    post(C, { language: 'en-US', text: 'This is a house.', sourceText: 'Das ist ein Haus.', sourceLanguage: 'de-DE', level: 'picky', mode: 'all' }), dev006(post(C, { language: 'en-US', text: 'This is a house.', sourceText: 'Esta es una casa.', sourceLanguage: 'es' })));
  write('bitext', 'sourceText + sourceLanguage bitext checks per language pair and errors (SRV-0136)', { requests: reqs });
}

// 13. premium test text, premiumAlways, hidden rules, limits (SRV-0111..0113, SRV-0048)
{
  const PT = 'languagetool testrule 8634756';
  const PT2 = 'The languagetool testrule 8634756.';
  const reqs = [];
  const variants = (p) => [post(C, p), get(C, p), post(C, { ...p, language: 'de-DE' }), post(C, { ...p, language: 'fr' }), post(C, { ...p, language: 'auto' }), post(C, { ...p, ...ONLY(EN) }), post(C, { ...p, enabledRules: 'PREMIUM_FAKE_RULE', enabledOnly: 'true' }), post(C, { ...p, enableHiddenRules: 'true' }), post(C, { ...p, level: 'picky' }), post(C, { ...p, mode: 'textLevelOnly' }), post(C, { ...p, mode: 'allButTextLevelOnly' }),
    post(C, { ...p, disabledRules: 'PREMIUM_FAKE_RULE' }), post(C, { ...p, text: p.text + ' ' }), post(C, { ...p, text: ' ' + p.text }), post(C, { ...p, text: p.text.toUpperCase() }), post(C, { ...p, data: JSON.stringify({ text: p.text }), text: undefined }), post(C, { ...p, text: p.text + '.' }), post(C, { ...p, motherTongue: 'de' }), post(C, { ...p, callback: 'cb' })];
  reqs.push(...variants({ language: 'en-US', text: PT }), ...variants({ language: 'en-US', text: PT2 }));
  reqs.push(post(C, { language: 'en-GB', text: PT }), post(C, { language: 'en', text: PT2 }), post(C, { language: 'en-US', text: PT + PT2 }));
  write('premium-test-text', 'premium status check text on the open-source server (no premium): ordinary check, premiumHint (SRV-0113)', { requests: reqs });
  write('premium-always', 'premiumAlways=true: PREMIUM_FAKE_RULE on the status check text, no premiumHint, enableHiddenRules ignored (SRV-0048, SRV-0113)', { ...CFG('premiumAlways=true\n'), requests: [...variants({ language: 'en-US', text: PT }), ...variants({ language: 'en-US', text: PT2 }),
    post(C, { language: 'en-US', text: T.en, ...ONLY(EN) }), post(C, { language: 'de-DE', text: T.de, ...ONLY(DE) }), post(C, { language: 'fr', text: T.fr, ...ONLY(FR) }), post(C, { language: 'en-US', text: T.en, enableHiddenRules: 'true' }), post(C, { language: 'en-US', text: T.en, level: 'picky', ...ONLY(EN) }), get('/v2/info')] });
  write('premium-always-flag', 'premiumAlways config key with hidden rules and credentials (flag rejection: X-SRV-ENDPOINTS/start-fail-premium-always-flag)', { ...CFG('premiumAlways=true\n'), requests: [
    post(C, { language: 'en-US', text: PT2, enableHiddenRules: 'false' }), post(C, { language: 'en-US', text: T.en, enableHiddenRules: 'true', ...ONLY(EN) }), post(C, { language: 'en-US', text: T.en, username: 'u', apiKey: 'k', ...ONLY(EN) }), post(C, { language: 'en-US', text: T.en, ...ONLY(EN) }, { headers: basic('u', 'p') }),
  ] });
}

// 14. user limits / auth parameters (SRV-0111, SRV-0112)
{
  const reqs = [];
  const q = { language: 'en-US', text: T.en, ...ONLY(EN) };
  const combos = [{ username: 'u', apiKey: 'k' }, { username: 'u' }, { apiKey: 'k' }, { password: 'p' }, { username: 'u', password: 'p' }, { username: 'u', apiKey: 'k', password: 'p' }, { username: 'u', tokenV2: 't' }, { username: 'u', apiKey: 'k', tokenV2: 't' }, { username: '', apiKey: '' }, { username: ' ', apiKey: ' ' }, { username: 'u', apiKey: '' }, { username: '', apiKey: 'k' },
    { username: 'ü@ex.org', apiKey: 'kä' }, { tokenV2: 't' }, { username: 'u', password: '' }, { password: '' }, { apiKey: '' }, { username: '' }, { username: 'u', apiKey: 'k', mode: 'all' }];
  for (const c of combos) reqs.push(post(C, { ...q, ...c }), get(C, { ...q, ...c }));
  for (const h of [basic('u', 'p'), { Authorization: 'Bearer abc.def.ghi' }, { Authorization: 'Bearer' }, { Authorization: ' ' }, { Authorization: '' }, { Authorization: 'Basic x' }, { Authorization: 'token abc' }]) reqs.push(post(C, q, { headers: h }), post(C, { ...q, username: 'u' }, { headers: h }), post(C, { ...q, username: 'u', apiKey: 'k' }, { headers: h }));
  reqs.push(post(C, q, { headers: { 'X-Forwarded-For': '1.2.3.4' } }), post(C, q, { headers: { Referer: 'https://example.org/page', Origin: 'https://example.org' } }), post(C, q, { headers: { 'User-Agent': 'TestAgent/1.0' } }), post(C, q, { headers: { 'Accept-Language': 'de-DE,de;q=0.9' } }));
  write('user-limits', 'username/apiKey/password/tokenV2/Authorization combinations on /v2/check without DB (SRV-0111, SRV-0112)', { requests: reqs });
  write('anonymous-denied', 'anonymousAccessAllowed=false on /v2/check with all auth parameter combinations', { ...CFG('anonymousAccessAllowed=false\n'), requests: combos.slice(0, 9).map((c) => post(C, { ...q, ...c })).concat([post(C, q), post(C, q, { headers: basic('u', 'p') }), post(C, q, { headers: { Authorization: 'Bearer abc.def.ghi' } })]) });
}

// 15. log-IP magic text (SRV-0100), log-only parameters (SRV-0143), A/B tests (SRV-0144)
{
  const reqs = [];
  const m = '__logIPNowForLanguageTool__';
  for (const t of [m, ' ' + m + ' ', m + 'x', m.toUpperCase(), '\n' + m + '\n']) reqs.push(post(C, { language: 'en-US', text: t }));
  reqs.push(get(C, { language: 'en-US', text: m }), post(C, { text: m }), post(C, { language: 'xx', text: m }), post(C, { language: 'en-US', data: JSON.stringify({ text: m }) }), post(C, { language: 'en-US', data: JSON.stringify({ annotation: [{ text: m }] }) }), post(C, { language: 'de-DE', text: m, a: 'b' }), post(C, { language: 'en-US', text: T.en, ...ONLY(EN) }));
  write('log-ip', 'default log-IP magic text: reply without response body (SRV-0100)', { requests: reqs });
  write('log-ip-pattern', '--logIpMatchingPattern custom pattern', { serverArgs: ['--logIpMatchingPattern', 'MY_PATTERN'], requests: [post(C, { language: 'en-US', text: 'MY_PATTERN' }), post(C, { language: 'en-US', text: ' MY_PATTERN ' }), post(C, { language: 'en-US', text: m, ...ONLY(EN) }), post(C, { language: 'de-DE', text: 'MY_PATTERN' }), post(C, { language: 'en-US', text: T.en, ...ONLY(EN) })] });
  write('log-ip-off', '--notLogIP: magic text is an ordinary text', { serverArgs: ['--notLogIP'], requests: [post(C, { language: 'en-US', text: m }), post(C, { language: 'en-US', text: m, ...ONLY(EN) }), post(C, { language: 'en-US', text: T.en, ...ONLY(EN) })] });
  const q = { language: 'en-US', text: T.en, ...ONLY(EN) };
  const log = [];
  for (const p of [{ v: '1.2.3' }, { v: '' }, { languageChanged: 'true' }, { languageChanged: 'false' }, { languageChanged: '' }, { instanceId: 'abc' }, { useragent: 'myagent' }, { useragent: '' }, { agent: 'x' }, { abtest: 'test1' }, { abtest: 'only' }, { abtest: '' }, { optInThirdPartyAI: 'true' }, { optInThirdPartyAI: 'false' }, { optInThirdPartyAI: '' }, { c: '1' }, { c: '0' }, { c: 'abc' }, { c: '-1' }, { c: '' }, { c: '2' }, { c: '1', callback: 'cb' },
    { token: 'x' }, { sessionId: '1' }, { cacheBust: '123' }, { foo: 'bar' }, { ['x'.repeat(50)]: 'y' }, { ruleId: 'x' }, { requestId: 'r1' }, { clientIp: '1.2.3.4' }]) log.push(post(C, { ...q, ...p }));
  for (const [l, rules, t] of LANGS) log.push(post(C, { language: l, text: t, ...ONLY(rules), v: 'x', useragent: 'ua', languageChanged: 'true', instanceId: 'i', abtest: 'only' }));
  write('log-params', 'log-only and unused parameters do not change the result: v, languageChanged, instanceId, useragent, abtest, optInThirdPartyAI, c (SRV-0143, SRV-0144)', { requests: log });
  write('abtest-config', 'abTest/abTestClients/abTestRollout config with abtest parameter (SRV-0144)', { ...CFG('abTest=t1,t2\nabTestClients=ua1,ua2.*\nabTestRollout=50\n'), requests: [
    post(C, { ...q, abtest: 't1', useragent: 'ua1' }), post(C, { ...q, abtest: 't1,t2', useragent: 'ua2x' }), post(C, { ...q, abtest: 't3', useragent: 'ua1' }), post(C, { ...q, abtest: 't1' }), post(C, { ...q, abtest: ' t1 , t2 ', useragent: 'ua1' }), post(C, { ...q, abtest: 'only', useragent: 'ua1' }), post(C, { ...q, useragent: 'ua1' }),
  ] });
  write('abtest-bad-rollout', 'abTestRollout=150 (out of range) accepted at startup', { ...CFG('abTest=t1\nabTestClients=ua1\nabTestRollout=150\n'), requests: [post(C, { ...q, abtest: 't1', useragent: 'ua1' })] });
}

// 16. general parameter behaviour per language
{
  const reqs = [];
  for (const [l, rules, t] of LANGS) {
    const q = { language: l, text: t };
    reqs.push(post(C, q), get(C, q), post(C, { ...q, ...ONLY(rules) }), post(C, { ...q, level: 'picky' }), post(C, { ...q, c: '1' }), post(C, { ...q, motherTongue: 'en' }));
  }
  for (const [l, t] of [['en-US', 'Ths is a tset with speling mistakes. He go to the school yesterday.'], ['de-DE', 'Das ist ein Tset mit Rechtschreibfehlern. Er gehen zur Schule gestern. Ein Hausx.'], ['fr', 'Ceci est un tset avec des fautes. Il vont à la école hier.']]) reqs.push(post(C, { language: l, text: t }), post(C, { language: l, text: t, level: 'picky' }));
  write('defaults', 'default-rule-set checks with spelling/grammar errors for de/en/fr, level picky, motherTongue', { requests: reqs });
}

console.log('X-SRV-CHECK cases written to', OUT);
