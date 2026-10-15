// Authors oracle/cases/X-LANG-REGISTRY/*.json (inputs only). Ops lang-lookup / lang-describe / lang-dynamic: docs/review/F10-oracle.md.
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DIR = path.join(ROOT, 'oracle/cases/X-LANG-REGISTRY');
mkdirSync(DIR, { recursive: true });
const cases = [];
const add = (name, description, ops, extra = {}) => cases.push([name, description, ops, extra]);

const sc = (code, level = 0, noop) => ({ fn: 'shortCode', code, level, ...(noop ? { noop } : {}) });
const wave1 = ['de', 'de-DE', 'de-AT', 'de-CH', 'de-DE-x-simple-language', 'en', 'en-US', 'en-GB', 'en-AU', 'en-CA', 'en-NZ', 'en-ZA', 'fr', 'fr-FR', 'fr-CA', 'fr-BE', 'fr-CH'];
const caseVars = [];
for (const c of wave1) {
  caseVars.push(c.toUpperCase(), c.toLowerCase(), c.replace(/-/g, '_'));
  const p = c.split('-');
  if (p.length > 1) caseVars.push(`${p[0].toUpperCase()}-${p.slice(1).join('-').toLowerCase()}`);
}
const near = ['de-LU', 'de-DE-x-other', 'de-x-simple-language', 'DE-DE-X-SIMPLE-LANGUAGE', 'de-de-x-simple-language', 'en-IE', 'en-IN', 'en-x-foo', 'fr-LU', 'fr-MC', 'fr-FR-x-foo', 'fr-fr', 'de-AT-x-a', 'de-DE-1996', 'de-DE-x-simple-language-extra', 'en-US-x-b', 'a-b-c-d', 'de-DE-AT-CH-X', 'de-', '-de', 'de--DE', '-', '--', 'x', 'xx', 'zz', 'global', 'Global', 'GLOBAL', 'de-global', 'en-US-', 'deu', 'eng', 'fra', 'ger', 'german', 'English', 'de_DE_x_simple_language', 'de-DE ', ' de-DE', 'de\n', 'DÉ', 'äö', '😀', 'én', 'ENK', 'i', 'İ', 'fr-ÇA', 'de-Dİ', 'x'.repeat(2000), 'de-' + 'X'.repeat(500)];
const other = ['ca', 'ca-ES', 'ca-ES-valencia', 'ca-ES-balear', 'es', 'es-ES', 'es-AR', 'pt', 'pt-PT', 'pt-BR', 'pt-AO', 'pl', 'pl-PL', 'ru', 'ru-RU', 'uk', 'uk-UA', 'nl', 'nl-NL', 'nl-BE', 'it', 'it-IT', 'sv', 'da', 'ga', 'gl', 'ja', 'zh', 'zh-CN', 'ar', 'el', 'ro', 'sk', 'sl', 'ta', 'tl', 'br', 'ast', 'be', 'crh', 'eo', 'fa', 'km', 'is', 'lt', 'sr', 'sr-RS', 'ml', 'ko', 'tr', 'he', 'hi', 'ES', 'PT_BR', 'ca-ES-VALENCIA'];
const empties = ['', ' ', '   ', '\t', '\n', ' ', ' ', '​', null];
const codes = [...wave1, ...caseVars, ...near, ...other, ...empties];
const uniq = [...new Set(codes.map((c) => (c === null ? '\u0000null' : c)))].map((c) => (c === '\u0000null' ? null : c));

add('shortcode', 'Languages.getLanguageForShortCode: all wave-1 codes, case/underscore variants, invalid, out-of-scope, empty, null (describe level 0)', uniq.map((c) => ({ op: 'lang-lookup', args: { calls: [sc(c)] } })));
add('supported', 'Languages.isLanguageSupported over the same codes', uniq.map((c) => ({ op: 'lang-lookup', args: { calls: [{ fn: 'supported', code: c }] } })));
add('shortcode-noop', 'getLanguageForShortCode(code, noopLanguageCodes): NoopLanguage for listed unknown codes, known codes win, null/empty', [{ op: 'lang-lookup', args: { calls: [
  sc('xyz', 1, ['xyz']), sc('xyz', 1, ['abc']), sc('xyz', 0, []), sc('de', 0, ['de']), sc('fr-FR', 0, ['fr-FR']), sc('zz', 1, ['zz']), sc('zz', 1), sc('xx', 1), sc('xx', 1, ['xx']), sc('nope-XX', 1, ['nope-XX']), sc('xyz', 0, ['XYZ']),
  sc(null, 0, ['xyz']), sc('', 0, ['']), sc(' ', 0, [' ']), sc('abc', 0, [null]), sc('a-b-c-d', 0, ['a-b-c-d']), sc('xyz-ZZ-Q', 1, ['xyz-ZZ-Q'])] } }]);
const names = ['German', 'German (Germany)', 'German (Austria)', 'German (Swiss)', 'German (Germany, simple language)', 'Simple German', 'English', 'English (US)', 'English (GB)', 'English (Australian)', 'English (Canadian)', 'English (New Zealand)', 'English (South African)', 'English (Great Britain)', 'French', 'French (France)', 'French (Canada)', 'French (Belgium)', 'French (Switzerland)', 'Catalan', 'Spanish', 'Portuguese', 'Portuguese (Portugal)', 'Polish', 'Russian', 'Ukrainian', 'Dutch', 'Italian', 'Swedish', 'Japanese', 'Chinese', 'Arabic', 'Greek', 'Irish', 'Esperanto', 'Persian', 'german', 'GERMAN', 'english', 'French ', ' French', '', ' ', 'Deutsch', 'Englisch', 'Français', 'Demo', 'Noop', 'No Operation', 'English (Ireland)', '😀', 'Gärman', 'x'.repeat(1000), null];
add('name', 'Languages.getLanguageForName: exact match on getName(), case-significant, unknown, empty, null', names.map((n) => ({ op: 'lang-lookup', args: { calls: [{ fn: 'name', name: n }] } })));
const loc = (language, country, variant) => ({ language, country, variant });
const locales = [];
for (const lng of ['de', 'en', 'fr']) for (const ctry of ['', 'DE', 'AT', 'CH', 'LU', 'US', 'GB', 'AU', 'CA', 'NZ', 'ZA', 'IE', 'IN', 'FR', 'BE', 'MC', 'XX']) locales.push(loc(lng, ctry, ''));
locales.push(loc('de', 'DE', 'x'), loc('de', 'DE', 'POSIX'), loc('de', '', 'simple'), loc('en', 'US', 'POSIX'), loc('fr', 'CA', 'foo'), loc('DE', 'de', ''), loc('De', 'at', ''), loc('', '', ''), loc('', 'US', ''), loc('', 'DE', ''), loc('xx', '', ''), loc('xx', 'XX', ''), loc('zz', '', ''));
for (const lng of ['ca', 'es', 'pt', 'pl', 'ru', 'uk', 'nl', 'it', 'sv', 'ja', 'zh', 'ar', 'el', 'ga', 'ro', 'sk', 'sl', 'eo', 'fa', 'tr', 'ko', 'he', 'hi', 'iw', 'in', 'ji', 'no', 'nb']) locales.push(loc(lng, '', ''));
for (const [l, c] of [['ca', 'ES'], ['es', 'ES'], ['es', 'AR'], ['pt', 'PT'], ['pt', 'BR'], ['nl', 'BE'], ['zh', 'CN'], ['zh', 'TW'], ['sr', 'RS'], ['uk', 'UA'], ['ru', 'RU'], ['pl', 'PL']]) locales.push(loc(l, c, ''));
locales.push(null);
add('locale', 'Languages.getLanguageForLocale: language+country match, default variant, language only, en-US fallback, null (NPE)', locales.map((l) => ({ op: 'lang-lookup', args: { calls: [{ fn: 'locale', locale: l }] } })));
add('lists', 'Languages.get()/getWithDemoLanguage() order (identity), getLongCodeToLangMapping HashMap order, unmodifiable', [
  { op: 'lang-lookup', args: { calls: [{ fn: 'list', level: 0 }] } }, { op: 'lang-lookup', args: { calls: [{ fn: 'listWithDemo', level: 0 }] } }, { op: 'lang-lookup', args: { calls: [{ fn: 'longCodes' }] } },
  { op: 'lang-lookup', args: { calls: [{ fn: 'listUnmodifiable' }] } },
  { op: 'lang-lookup', args: { calls: [{ fn: 'className', className: 'org.languagetool.language.GermanyGerman' }, { fn: 'className', className: 'org.languagetool.language.English' }, { fn: 'className', className: 'org.languagetool.language.French' }, { fn: 'className', className: 'org.languagetool.language.NoSuchLanguage' }, { fn: 'className', className: '' }, { fn: 'className', className: null }, { fn: 'className', className: 'java.lang.String' }, { fn: 'className', className: 'org.languagetool.language.Catalan' }] } },
]);
// error messages (unknown language lists) with all code lists
add('errors', 'Unknown-language IllegalArgumentException messages (full code list), validation errors; messages carry dev006Reason in the lookup wrapper only via error', ['xx-unknown', 'fooo', 'de-DE-x-nope', 'a-b-c-d', 'a-b-c-d-e', 'xyz', 'de-XX', 'en-XX', 'fr-XX', 'XX', '1', '12-34', 'é', 'de-DE-x-simple-language-', 'zh-Hant', 'sr-Latn', 'en-US-POSIX'].map((c) => ({ op: 'lang-lookup', args: { calls: [sc(c)] } })));

// hooks
const W1 = ['de', 'de-DE', 'de-AT', 'de-CH', 'de-DE-x-simple-language', 'en', 'en-US', 'en-GB', 'en-AU', 'en-CA', 'en-NZ', 'en-ZA', 'fr', 'fr-FR', 'fr-CA', 'fr-BE', 'fr-CH'];
add('hooks-wave1', 'Language hooks per wave-1 variant (level 2: data hooks + lazily created components)', [{ op: 'lang-describe', args: { codes: W1, level: 2 } }]);
add('hooks-all', 'Language data hooks of every registered language (level 1; out-of-scope entries are flagged dev006OutOfScope)', [
  { op: 'lang-describe', args: { codes: ['ca', 'ca-ES', 'ca-ES-valencia', 'ca-ES-balear', 'es', 'es-ES', 'es-AR', 'pt', 'pt-PT', 'pt-BR', 'pl-PL', 'ru-RU', 'uk-UA', 'nl', 'nl-BE', 'it', 'sv', 'da', 'ga-IE', 'gl-ES', 'ja-JP', 'zh-CN', 'ar', 'el-GR', 'ro-RO', 'sk-SK', 'sl-SI', 'ta-IN', 'tl-PH', 'br-FR', 'ast-ES', 'be-BY', 'crh-UA', 'eo', 'fa', 'km-KH', 'sr', 'sr-RS', 'ml-IN', 'lt-LT', 'is-IS', 'ko-KR', 'tr-TR', 'zz', 'xx'], level: 1 } },
  { op: 'lang-lookup', args: { calls: [{ fn: 'list', level: 1 }] } },
]);
add('hooks-info', 'Language identity/variant relations as in Languages.get() (level 0) for sanity', [{ op: 'lang-lookup', args: { calls: [{ fn: 'list', level: 0 }, { fn: 'shortCode', code: 'zz', level: 2 }, { fn: 'shortCode', code: 'xx', level: 0 }] } }]);

// dynamic / builder (each case = own JVM; mutates registry)
const dyn = [
  { fn: 'add', name: 'Dyn Dict', code: 'dd', path: '/tmp/ltjs-dyn/dd.dict' },
  { fn: 'add', name: 'Dyn Hun', code: 'dh-XX', path: '/tmp/ltjs-dyn/dh.dic' },
  { fn: 'add', name: 'Bad', code: 'bb', path: '/tmp/ltjs-dyn/bb.txt' },
  { fn: 'add', name: 'Bad2', code: 'b2', path: '/tmp/ltjs-dyn/bb.DIC' },
  { fn: 'add', name: 'Bad3', code: 'b3', path: '/tmp/ltjs-dyn/dict' },
  { fn: 'add', name: 'NullName', code: 'n1', path: null },
  { fn: 'add', name: null, code: 'n2', path: '/tmp/ltjs-dyn/n.dict' },
  { fn: 'add', name: 'NullCode', code: null, path: '/tmp/ltjs-dyn/n.dict' },
  { fn: 'add', name: 'Rel', code: 'rr', path: 'rel/rr.dict' },
  { fn: 'shortCode', code: 'dd' }, { fn: 'shortCode', code: 'dh' }, { fn: 'shortCode', code: 'dh-XX' }, { fn: 'shortCode', code: 'rr' },
  { fn: 'supported', code: 'dd' }, { fn: 'name', name: 'Dyn Dict' }, { fn: 'name', name: 'Bad' },
  { fn: 'locale', locale: loc('dd', '', '') }, { fn: 'locale', locale: loc('dh', 'XX', '') },
  { fn: 'byClassName', className: 'org.languagetool.language.English' }, { fn: 'byClassName', className: 'org.languagetool.language.NoSuch' }, { fn: 'byClassName', className: 'java.lang.String' },
  { fn: 'byClassName', className: 'org.languagetool.language.Demo' }, { fn: 'byClassName', className: 'org.languagetool.language.Demo' },
  { fn: 'list' },
];
add('dynamic', 'Dynamic languages: addLanguage .dict/.dic/other, getOrAddLanguageByClassName, lookups after registration', [{ op: 'lang-dynamic', args: { calls: dyn } }]);
const bld = ['rules-en-English.xml', 'rules-de-German.xml', 'rules-fr-French.xml', 'rules-xx-Foo.xml', 'rules-ast-Asturian.xml', 'rules-en_US-AmericanX.xml', 'rules-de_AT-AustriaX.xml', 'rules-zz-Noop.xml', 'rules-ca-Catalan.xml', 'rules-es-Spanish.xml',
  'rules-en.xml', 'rules-en-English.txt', 'rules-en-English', 'grammar.xml', 'Rules-en-English.xml', 'rules-eng-English.xml', 'rules-e-English.xml', 'rules-en-English-extra.xml', 'rules--English.xml', 'rules-en-.xml', 'rules-de-Däutsch.xml', '', '.xml', 'rules-en_US.xml', 'rules-xxxx-Foo.xml', 'rules-en_US_X-Foo.xml'];
add('builder', 'LanguageBuilder.makeAdditionalLanguage: valid/invalid file names, extending known vs unknown language, RuleFilenameException messages, null', [{ op: 'lang-dynamic', args: { calls: [...bld.flatMap((n) => [{ fn: 'builder', path: `/tmp/ltjs-rules/${n}` }]), { fn: 'builder', path: 'rules-en-English.xml' }, { fn: 'builder', path: null }] } }]);

// http
add('http-languages', 'GET /v2/languages (api comparator, dev006-languages filter), POST, and unknown-language errors listing supported codes', [], {
  http: [
    { method: 'GET', path: '/v2/languages' }, { method: 'POST', path: '/v2/languages' },
    { method: 'GET', path: '/v2/languages', params: { foo: 'bar' } },
    { method: 'POST', path: '/v2/check', params: { language: 'xx-nonexistent', text: 'x' } },
    { method: 'POST', path: '/v2/check', params: { language: 'de-DE-x-nope', text: 'x' } },
    { method: 'POST', path: '/v2/check', params: { language: 'a-b-c-d', text: 'x' } },
    { method: 'POST', path: '/v2/check', params: { language: 'ca', text: 'x' } },
    { method: 'POST', path: '/v2/check', params: { language: '', text: 'x' } },
    { method: 'POST', path: '/v2/check', params: { language: 'DE_de', text: 'Das ist ein Test.' } },
    { method: 'POST', path: '/v2/check', params: { language: 'de-DE-x-simple-language', text: 'Das ist ein Test.' } },
    { method: 'POST', path: '/v2/check', params: { language: 'fr-FR', text: 'Ceci est un test.' } },
    { method: 'POST', path: '/v2/check', params: { language: 'en', text: 'This is a test.' } },
    { method: 'POST', path: '/v2/check', params: { text: 'x' } },
  ],
});

for (const [name, description, ops, extra] of cases) {
  const cs = extra.http
    ? { kind: 'http', clock: 'fixed', description, compare: 'api', normalize: ['buildDate', 'commit'], serverArgs: [], requests: extra.http }
    : { kind: 'harness', clock: 'fixed', description, normalize: [], compare: 'jsonl', ops };
  writeFileSync(path.join(DIR, `${name}.json`), JSON.stringify(cs, null, 1) + '\n');
}
console.log(`X-LANG-REGISTRY: ${cases.length} case files, ${uniq.length} codes`);
