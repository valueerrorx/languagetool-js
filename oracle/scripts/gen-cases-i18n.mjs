// Authors oracle/cases/X-I18N/*.json (inputs only). Raw MessageFormat coverage lives in X-PROBE-FORMAT; here only Tools.i18n.
import { T, writeCases } from './gen-probe-cases-numbers.mjs';

const S = (v) => T('string', v), I = (v) => T('int', v), L = (v) => T('long', v), D = (v) => T('double', v), F = (v) => T('float', v);
const bundle = (lang) => ({ op: 'i18n-bundle', args: { lang } });
const fmt = (lang, key, ...args) => ({ op: 'i18n-format', args: { lang, key, args } });
const pat = (pattern, ...args) => ({ op: 'i18n-format', args: { lang: 'en-US', pattern, args } });

const cases = [];
cases.push(['bundle-dump-wave1', 'JLanguageTool.getMessageBundle(lang) for wave-1 codes: resolved key->string map, bundle locales, missing-key behaviour',
  ['de-DE', 'de-AT', 'de-CH', 'en-US', 'en-GB', 'fr'].map(bundle)]);
cases.push(['bundle-dump-other', 'bundle dump for default (no arg), short codes and languages without own bundle (fallback chain), variants',
  [null, 'de', 'en', 'fr-CA', 'fr-FR', 'en-CA', 'en-AU', 'de-DE-x-simple-language', 'ca-ES', 'es', 'pl-PL', 'uk-UA', 'nl', 'pt-PT', 'ar', 'sv', 'zh-CN', 'ja-JP', 'ga-IE', 'el-GR', 'ru-RU'].map(bundle)]);

const keys = {
  checkDone: 2, checkDoneNoTime: 1, false_friend_hint: 4, false_friend_suggestion: 1, guiLongParagraphsText: 1, result1: 3, resultTime: 1,
  startChecking: 1, unpaired_brackets: 1, http_server_start_failed: 2, long_sentence_rule_desc: 1, long_sentence_rule_msg2: 1,
  long_paragraph_rule_desc: 1, statistics_rule_description: 2, statistics_suggest1_new: 4, statistics_suggest3_new: 2, loRemoteInfoOtherServer: 1,
};
const fcases = [];
// each real key in three languages with typical args
for (const lang of ['en-US', 'de-DE', 'fr']) {
  for (const [k, n] of Object.entries(keys)) fcases.push(fmt(lang, k, ...['ä\'x', S('b"c'), S('Ünï'), S('d{0}')].slice(0, n)));
}
// number types and formatting
for (const lang of ['en-US', 'de-DE']) {
  const nums = [I('0'), I('-1'), I('5'), I('1000'), I('1234567'), I('-1234567'), I('2147483647'), I('-2147483648'), L('9223372036854775807'), L('-9223372036854775808'),
    D('0.0'), D('-0.0'), D('1234.5'), D('1234.56789'), D('0.0005'), D('0.0015'), D('2.5'), D('1e7'), D('1e-7'), D('1.7976931348623157e308'), D('NaN'), D('Infinity'), D('-Infinity'),
    F('1.1'), F('3.4028235e38'), T('short', '-7'), T('byte', '127'), T('bigdecimal', '12345678901234567890.123456'), T('biginteger', '-123456789012345678901234567890'),
    T('bool', 'true'), T('char', 'x'), T('date', '1773564000000'), null, S('')];
  for (const n of nums) fcases.push(fmt(lang, 'long_sentence_rule_desc', n));
}
// missing / extra / null / many args
fcases.push(fmt('en-US', 'checkDone'), fmt('en-US', 'checkDone', I('3')), fmt('en-US', 'checkDone', null, null), fmt('en-US', 'checkDone', I('1'), I('2'), I('3'), I('4')),
  fmt('en-US', 'result1', I('1'), I('1200'), L('34')), fmt('en-US', 'resultTime', D('12345.6789')), fmt('de-DE', 'resultTime', L('1234567'), I('-5')),
  fmt('en-US', 'startChecking'), fmt('en-US', 'false_friend_hint', S('a'), null, S('c'), S('d')));
// keys containing single quotes without args (quote handling) and a key without placeholders
for (const lang of ['en-US', 'de-DE', 'fr'])
  for (const k of ['no_space_after', 'desc_repetition', 'guiUseServerWarning2', 'unsupportedWarning', 'unpaired_brackets', 'statistics_suggest4_new', 'checkDone', 'atd']) fcases.push(fmt(lang, k));
// errors: missing key, null key
fcases.push(fmt('en-US', 'no_such_key_xyz', S('a')), fmt('de-DE', 'no_such_key_xyz'), fmt('en-US', null), fmt('ca-ES', 'checkDone', I('7'), I('8')), fmt('default', 'checkDone', D('1.5'), I('8')));
cases.push(['i18n-format-keys', 'Tools.i18n with real MessagesBundle keys (de/en/fr/ca fallbacks), arg types, quoting', fcases]);

// synthetic patterns through Tools.i18n (bundle-free), only constructs; broad MessageFormat coverage is X-PROBE-FORMAT
const P = [
  ['plain'], ["It's"], ["It''s"], ["'{0}'"], ["''{0}''"], ["'{'0}"], ['{0}'], ['{0}{1}{0}', S('a'), S('b')], ['{1}', S('a')], ['{0} {0}', I('1000')],
  ['{0,number}', D('1234.5678')], ['{0,number,#.##}', D('1234.5678')], ['{0,number,integer}', D('2.5')], ['{0,number,percent}', D('0.256')],
  ['{0,choice,0#none|1#one|1<many {0}}', I('0')], ['{0,choice,0#none|1#one|1<many {0}}', I('1')], ['{0,choice,0#none|1#one|1<many {0}}', I('5')],
  ['{0,date}', T('date', '1773564000000')], ['{0,time}', T('date', '1773564000000')], ['{0,date,short}', T('date', '1773564000000')], ['{0}', T('date', '1773564000000')],
  ['{', S('a')], ['}', S('a')], ['{0', S('a')], ['{a}', S('a')], ['{-1}', S('a')], ['{0,foo}', S('a')], ['{0}} {', S('a')], ['{ 0 }', S('a')], ['{0}\n{1}\t', S('a'), S('b')],
  ['{10}', S('a')], ['{0}', S('ü😀')], ['Ünï {0} ä', S('ß')], ['{0}', I('-0')], ['{0}', L('100000000000')],
];
cases.push(['i18n-format-patterns', 'Tools.i18n on synthetic patterns (one-key bundle): placeholders, quotes, number/choice/date subformats, malformed patterns', P.map(([p, ...a]) => pat(p, ...a))]);
cases.push(['build-info', 'JLanguageTool.VERSION, BUILD_DATE, GIT_SHORT_ID (buildDate/commit normalised)', [{ op: 'i18n-buildinfo', args: {} }]]);
writeCases('X-I18N', cases);
const fs = await import('node:fs'); const path = await import('node:path');
const dir = new URL('../cases/X-I18N/', import.meta.url).pathname;
const bi = path.join(dir, 'build-info.json'); const j = JSON.parse(fs.readFileSync(bi)); j.normalize = ['buildDate', 'commit'];
fs.writeFileSync(bi, JSON.stringify(j, null, 1) + '\n');
