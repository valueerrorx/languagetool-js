// Generates oracle/cases/X-AUDIT (inputs only; expected values come from the Java jars, F74).
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';

const OUT = path.join(ROOT, 'oracle/cases/X-AUDIT');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const NORM = ['buildDate', 'commit', 'stackFrames', 'paths'];
const put = (name, o) => writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(o, null, 1) + '\n');
const cli = (name, description, args, extra = {}) => put(name, { kind: 'cli', clock: 'fixed', compare: 'cli', normalize: NORM, description, args, ...extra });
const http = (name, description, requests, extra = {}) => put(name, { kind: 'http', clock: 'fixed', description, compare: 'api', normalize: ['buildDate', 'commit'], serverArgs: [], requests, ...extra });
const check = (params) => ({ method: 'POST', path: '/v2/check', params });
const a = (n) => 'a'.repeat(n);

// ---- bitext lines (source TAB target), both directions
const lenLines = [
  [a(25), a(10)], [a(26), a(10)], [a(24), a(10)], [a(10), a(33)], [a(10), a(34)], [a(10), a(32)],
  [a(3), a(10)], [a(3), a(11)], [a(30), a(12)], [a(1), a(4)], [a(1), a(3)], [a(250), a(100)], [a(251), a(100)],
  [a(1000), a(2)], [a(2), a(1000)], ['x', 'x'], ['Hello world', 'Hallo Welt'], ['Äpfel ÖÜ', 'ÄÖÜß'], ['😀😀😀😀😀😀', '😀'],
  ['', 'Hallo Welt'], ['Hello world', ' '],
];
const mk = (lines) => lines.map(([s, t]) => `${s}\t${t}`).join('\n') + '\n';
cli('bt-length-en-de', 'CORE-0451: TRANSLATION_LENGTH boundaries, source en target de', ['-l', 'de-DE', '-m', 'en', '-b2', '-e', 'TRANSLATION_LENGTH', 'input.txt'], { files: { 'input.txt': mk(lenLines) } });
cli('bt-length-de-en', 'CORE-0451: TRANSLATION_LENGTH boundaries, source de target en', ['-l', 'en-US', '-m', 'de', '-b2', '-e', 'TRANSLATION_LENGTH', 'input.txt'], { files: { 'input.txt': mk(lenLines) } });
cli('bt-length-fr-de', 'CORE-0451: TRANSLATION_LENGTH, source fr target de', ['-l', 'de-DE', '-m', 'fr', '-b2', '-e', 'TRANSLATION_LENGTH', 'input.txt'], { files: { 'input.txt': mk(lenLines.slice(0, 8)) } });
cli('bt-length-empty-target', 'U-1: empty target (src.length/0 = Infinity) with a tab and no trailing text', ['-l', 'de-DE', '-m', 'en', '-b2', 'input.txt'], { files: { 'input.txt': 'Hello world\t' } });
cli('bt-length-empty-target-nl', 'U-1: empty target followed by newline', ['-l', 'de-DE', '-m', 'en', '-b2', 'input.txt'], { files: { 'input.txt': 'Hello world\t\nSecond line\tZweite Zeile\n' } });
cli('bt-length-empty-target-de-en', 'U-1: empty target, source de target en', ['-l', 'en-US', '-m', 'de', '-b2', 'input.txt'], { files: { 'input.txt': 'Hallo Welt\t\n' } });
cli('bt-length-empty-source', 'U-1: empty source', ['-l', 'de-DE', '-m', 'en', '-b2', 'input.txt'], { files: { 'input.txt': '\tHallo Welt\n' } });
cli('bt-length-empty-target-only-length', 'U-1: empty target, only TRANSLATION_LENGTH enabled', ['-l', 'de-DE', '-m', 'en', '-b2', '-e', 'TRANSLATION_LENGTH', 'input.txt'], { files: { 'input.txt': 'Hello world\t\n' } });
cli('bt-length-empty-target-json', 'U-1: empty target with --json', ['-l', 'de-DE', '-m', 'en', '-b2', '--json', 'input.txt'], { files: { 'input.txt': 'Hello world\t\n' } });

const punct = [
  ['Hello', 'Hallo.'], ['Hello.', 'Hallo.'], ['Hello?', 'Hallo.'], ['Hello.', 'Hallo!'], ['Hello', 'Hallo,'], ['Hello', 'Hallo...'], ['Hello!', 'Hallo?'],
  ['Hello', 'Hallo?!'], ['Hello', 'Hallo?'], ['Hello', 'Hallo!'], ['Hello. ', 'Hallo.'], ['Hello', 'Hallo. '], ['Hello', 'Hallo;'], ['Hello', 'Hallo:'],
  ['Hello', 'Hallo…'], ['Hello', 'Hallo。'], ['Hello؟', 'Hallo?'], ['Hello "quoted".', 'Hallo "zitiert"'], ['Hello "quoted".', 'Hallo "zitiert".'], ['Hello "quoted"', 'Hallo "zitiert".'],
  ['Is it?', 'Ist es?'], ['Über uns', 'Über uns.'],
];
const degenerate = [['Hi.', '.'], ['Hi', '?'], ['.', '.'], ['!', '.'], ['Hi', '!'], ['Hi', ' .']];
degenerate.forEach(([s, t], i) => cli(`bt-punct-degenerate-${i}`, `CORE-0451: DIFFERENT_PUNCTUATION with a single punctuation target token (fromPos 1 >= toPos 1), pair ${i}`, ['-l', 'de-DE', '-m', 'en', '-b2', 'input.txt'], { files: { 'input.txt': mk([[s, t]]) } }));
cli('bt-punct-en-de', 'CORE-0451: DIFFERENT_PUNCTUATION, source en target de', ['-l', 'de-DE', '-m', 'en', '-b2', '-e', 'DIFFERENT_PUNCTUATION', 'input.txt'], { files: { 'input.txt': mk(punct) } });
cli('bt-punct-de-en', 'CORE-0451: DIFFERENT_PUNCTUATION, source de target en', ['-l', 'en-US', '-m', 'de', '-b2', '-e', 'DIFFERENT_PUNCTUATION', 'input.txt'], { files: { 'input.txt': mk(punct) } });
cli('bt-punct-all-rules', 'CORE-0451: DIFFERENT_PUNCTUATION with all bitext rules (order of rules)', ['-l', 'de-DE', '-m', 'en', '-b2', 'input.txt'], { files: { 'input.txt': mk(punct.slice(0, 10)) } });

const same = [
  ['A', 'A'], ['A B', 'A B'], ['A B C', 'A B C'], ['A B C D', 'A B C D'], ['One two three', 'One two three'], ['One two three four', 'One two three four'],
  ['One two three four', 'one two three four'], ['One two three four', 'One two three four '], ['One two three four', 'One  two three four'], ['A, B', 'A, B'],
  ['A, B, C', 'A, B, C'], ['Das ist gut.', 'Das ist gut.'], ['Das ist ein Test.', 'Das ist ein Test.'], ['Über große Äpfel sind gut.', 'Über große Äpfel sind gut.'],
  ['a b c d e f g h', 'a b c d e f g h'], ['1 2 3 4', '1 2 3 4'], ['Berlin', 'Berlin'], ['Hello! World!', 'Hello! World!'], ['x y z w', 'x y z w'], ['😀 😀 😀 😀', '😀 😀 😀 😀'],
];
cli('bt-same-en-de', 'CORE-0451: SAME_TRANSLATION token-count boundary, source en target de', ['-l', 'de-DE', '-m', 'en', '-b2', '-e', 'SAME_TRANSLATION', 'input.txt'], { files: { 'input.txt': mk(same) } });
cli('bt-same-de-en', 'CORE-0451: SAME_TRANSLATION, source de target en', ['-l', 'en-US', '-m', 'de', '-b2', '-e', 'SAME_TRANSLATION', 'input.txt'], { files: { 'input.txt': mk(same) } });
cli('bt-same-fr-en', 'CORE-0451: SAME_TRANSLATION, source fr target en', ['-l', 'en-US', '-m', 'fr', '-b2', '-e', 'SAME_TRANSLATION', 'input.txt'], { files: { 'input.txt': mk(same.slice(0, 14)) } });
cli('bt-same-all-rules', 'CORE-0451: all bitext rules on identical text', ['-l', 'de-DE', '-m', 'en', '-b2', 'input.txt'], { files: { 'input.txt': mk(same.slice(2, 8)) } });
cli('bt-same-json', 'CORE-0451: bitext rules with --json', ['-l', 'de-DE', '-m', 'en', '-b2', '--json', 'input.txt'], { files: { 'input.txt': mk([...same.slice(3, 4), ...punct.slice(0, 2), ...lenLines.slice(1, 2)]) } });

// http bitext, both directions (language = target)
const pairs = (src, trg, rows) => rows.map(([s, t]) => check({ language: trg, text: t, sourceLanguage: src, sourceText: s }));
const hp = [...lenLines.slice(0, 18), ...punct.slice(0, 14), ...same.slice(0, 14)].filter(([s, t]) => s.trim() && t.trim());
http('http-bitext-en-de', 'CORE-0451: /v2/check bitext, sourceLanguage en target de', pairs('en-US', 'de-DE', hp));
http('http-bitext-de-en', 'CORE-0451: /v2/check bitext, sourceLanguage de target en', pairs('de-DE', 'en-US', hp));
http('http-bitext-degenerate', 'CORE-0451: bitext with single punctuation target (RuleMatch fromPos >= toPos)', pairs('en-US', 'de-DE', degenerate));
http('http-bitext-edge', 'U-1: bitext empty/blank target and source, multi sentence, enabledRules', [
  check({ language: 'de-DE', text: '', sourceLanguage: 'en-US', sourceText: 'Hello world' }),
  check({ language: 'de-DE', text: ' ', sourceLanguage: 'en-US', sourceText: 'Hello world' }),
  check({ language: 'de-DE', text: 'Hallo Welt', sourceLanguage: 'en-US', sourceText: '' }),
  check({ language: 'de-DE', text: 'Hallo Welt', sourceLanguage: 'en-US', sourceText: ' ' }),
  check({ language: 'de-DE', text: 'Hallo Welt. Zweiter Satz.', sourceLanguage: 'en-US', sourceText: 'Hello world. Second sentence.' }),
  check({ language: 'de-DE', text: 'Hallo Welt.', sourceLanguage: 'en-US', sourceText: 'Hello world. Second sentence.' }),
  check({ language: 'de-DE', text: 'Hallo Welt. Zweiter Satz.', sourceLanguage: 'en-US', sourceText: 'Hello world.' }),
  check({ language: 'de-DE', text: 'Hallo Welt.', sourceLanguage: 'en-US', sourceText: 'Hello world', enabledRules: 'DIFFERENT_PUNCTUATION', enabledOnly: 'true' }),
  check({ language: 'de-DE', text: 'Hallo Welt.', sourceLanguage: 'en-US', sourceText: 'Hello world', disabledRules: 'DIFFERENT_PUNCTUATION' }),
  check({ language: 'de-DE', text: 'Hallo Welt.', sourceLanguage: 'en-US', sourceText: 'Hello world', disabledRules: 'DIFFERENT_PUNCTUATION,TRANSLATION_LENGTH,SAME_TRANSLATION' }),
  check({ language: 'de-DE', text: 'Das ist ein Test.', sourceLanguage: 'de-DE', sourceText: 'Das ist ein Test.' }),
  check({ language: 'en-US', text: 'This is a test.', sourceLanguage: 'en-GB', sourceText: 'This is a test.' }),
  check({ language: 'de-DE', text: 'Das ist ein Test.', sourceLanguage: 'fr', sourceText: 'Ceci est un test.' }),
  check({ language: 'fr', text: 'Ceci est un test.', sourceLanguage: 'de-DE', sourceText: 'Das ist ein Test.', level: 'picky' }),
]);

// ---- XML load-time errors via --rulefile (en-US)
const XML = '<?xml version="1.0" encoding="UTF-8"?>\n';
const rule = (pat, o = {}) => `<rule id="${o.id ?? 'R1'}" name="r"><pattern>${pat}</pattern>${o.pre ?? ''}<message>${o.msg ?? 'msg'}</message>${o.post ?? ''}${o.ex ?? '<example correction="">foo bar</example>'}</rule>`;
const rf = (inner, lang = 'en') => `${XML}<rules lang="${lang}">\n<category id="CAT1" name="cat">\n${inner}\n</category>\n</rules>\n`;
const tok = (t, at = '') => `<token${at}>${t}</token>`;
const RF = (name, desc, xml, o = {}) => cli(name, desc, [...(o.pre ?? []), '-l', o.lang ?? 'en-US', '--rulefile', 'rules.xml', ...(o.post ?? ['-'])], { stdin: o.stdin ?? 'This is foo bar and 25 more.', files: { 'rules.xml': xml } });
RF('rf-ref-empty', 'CORE-0452 XMLRuleHandler:425 empty match no in message', rf(rule(tok('foo') + tok('bar'), { msg: 'x <match no=""/>' })));
RF('rf-ref-zero', 'CORE-0452 XMLRuleHandler:429 match no=0 in message', rf(rule(tok('foo') + tok('bar'), { msg: 'x <match no="0"/>' })));
RF('rf-ref-zero-suggestion', 'CORE-0452 match no=0 in suggestion', rf(rule(tok('foo') + tok('bar'), { msg: '<suggestion><match no="0"/></suggestion>' })));
RF('rf-ref-forward', 'CORE-0452 XMLRuleHandler:437 forward reference in token', rf(rule(tok('foo') + tok('<match no="3"/>'))));
RF('rf-ref-forward-self', 'CORE-0452 reference to the token itself', rf(rule(tok('<match no="1"/>'))));
RF('rf-ref-nonnumeric', 'CORE-0452 non numeric match no (NumberFormatException)', rf(rule(tok('foo') + tok('bar'), { msg: '<match no="x"/>' })));
RF('rf-regex-contradict-lu', 'CORE-0452 XMLRuleHandler:506 (?i) with \\p{Lu}', rf(rule(tok('(?i)\\p{Lu}foo', ' regexp="yes"'))));
RF('rf-regex-contradict-ll', 'CORE-0452 XMLRuleHandler:506 (?i) with \\p{Ll}', rf(rule(tok('\\p{Ll}(?i)foo', ' regexp="yes"'))));
RF('rf-regex-contradict-exception', 'CORE-0452 contradicting regex in exception', rf(rule(`<token>foo<exception regexp="yes">(?i)\\p{Lu}x</exception></token>`)));
RF('rf-regex-invalid', 'CORE-0452 invalid regex (PatternSyntaxException) at load', rf(rule(tok('foo(', ' regexp="yes"'))));
RF('rf-chunk-both', 'CORE-0452 XMLRuleHandler:536 chunk and chunk_re', rf(rule(`<token chunk="B-NP-singular" chunk_re="B-NP.*">foo</token>`)));
RF('rf-and-minmax', 'CORE-0452 XMLRuleHandler:635 min on non-first AND token', rf(rule(`<token><and>${tok('foo')}${tok('bar', ' min="0"')}</and></token>`)));
RF('rf-and-minmax-max', 'CORE-0452 max on non-first AND token', rf(rule(`<token><and>${tok('foo')}${tok('bar', ' max="2"')}</and></token>`)));
RF('rf-skip-200', 'CORE-0452 PatternToken:404 skip 200', rf(rule(tok('foo', ' skip="200"') + tok('bar'))));
RF('rf-skip-127', 'PatternToken skip 127 boundary ok', rf(rule(tok('foo', ' skip="127"') + tok('bar'))));
RF('rf-skip-128', 'CORE-0452 PatternToken:404 skip 128', rf(rule(tok('foo', ' skip="128"') + tok('bar'))));
RF('rf-skip-neg2', 'CORE-0452 PatternToken:404 skip -2', rf(rule(tok('foo', ' skip="-2"') + tok('bar'))));
RF('rf-skip-neg1', 'PatternToken skip -1 boundary ok', rf(rule(tok('foo', ' skip="-1"') + tok('bar'))));
RF('rf-skip-nonnumeric', 'CORE-0452 skip not a number', rf(rule(tok('foo', ' skip="x"') + tok('bar'))));
RF('rf-min-2', 'CORE-0452 PatternToken:415 min 2', rf(rule(tok('foo', ' min="2"') + tok('bar'))));
RF('rf-min-neg', 'CORE-0452 PatternToken:415 min -1', rf(rule(tok('foo', ' min="-1"') + tok('bar'))));
RF('rf-max-0', 'CORE-0452 PatternToken:426 max 0', rf(rule(tok('foo', ' max="0"') + tok('bar'))));
RF('rf-max-200', 'CORE-0452 PatternToken:429 max 200', rf(rule(tok('foo', ' max="200"') + tok('bar'))));
RF('rf-max-neg2', 'CORE-0452 PatternToken:429 max -2', rf(rule(tok('foo', ' max="-2"') + tok('bar'))));
RF('rf-max-127', 'PatternToken max 127 boundary ok', rf(rule(tok('foo', ' max="127"') + tok('bar'))));
RF('rf-example-nomarker-correction', 'CORE-0452 Example:51 incorrect example with correction but no marker', rf(rule(tok('foo'), { ex: '<example correction="x">foo bar</example>' })));
RF('rf-example-marker-nested', 'CORE-0452 nested marker in example', rf(rule(tok('foo'), { ex: '<example correction="x"><marker>foo <marker>bar</marker></marker></example>' })));
RF('rf-example-marker-ok', 'valid rule with marker example (control)', rf(rule(tok('foo') + tok('bar'), { ex: '<example correction="x"><marker>foo bar</marker></example>' })));
RF('rf-example-two-markers', 'two marker pairs in one example', rf(rule(tok('foo'), { ex: '<example correction="x"><marker>foo</marker> <marker>bar</marker></example>' })));
RF('rf-filter-unknown', 'CORE-0452 RuleFilterCreator:64 unknown filter class', rf(rule(tok('foo'), { post: '', pre: '<filter class="org.languagetool.rules.NoSuchFilter" args="a:b"/>' })));
RF('rf-filter-not-filter', 'CORE-0452 RuleFilterCreator filter class that is not a RuleFilter', rf(rule(tok('foo'), { pre: '<filter class="java.lang.String" args="a:b"/>' })));
RF('rf-filter-no-args', 'filter element without args attribute', rf(rule(tok('foo'), { pre: '<filter class="org.languagetool.rules.en.YMDDateCheckFilter"/>' })));
RF('rf-filter-args-nocolon', 'filter args without colon', rf(rule(tok('foo'), { pre: '<filter class="org.languagetool.rules.en.YMDDateCheckFilter" args="abc"/>' })));
RF('rf-unknown-element', 'unknown element in rule', rf('<rule id="R1" name="r"><pattern><token>foo</token></pattern><bogus/><message>m</message></rule>'));
RF('rf-missing-id', 'rule without id', rf('<rule name="r"><pattern><token>foo</token></pattern><message>m</message></rule>'));
RF('rf-no-pattern', 'rule without pattern', rf('<rule id="R1" name="r"><message>m</message></rule>'));
RF('rf-no-message', 'rule without message', rf('<rule id="R1" name="r"><pattern><token>foo</token></pattern></rule>'));
RF('rf-empty-pattern', 'empty pattern', rf('<rule id="R1" name="r"><pattern></pattern><message>m</message></rule>'));
RF('rf-regexp-no-attr-suggest', 'suggestion with regexp_replace on missing', rf(rule(tok('foo') + tok('bar'), { msg: '<match no="1" regexp_match="(" regexp_replace="x"/>' })));
RF('rf-ok-control', 'valid user rule (control: output format with message and match)', rf(rule(tok('foo') + tok('bar'), { msg: 'Found <match no="1"/> then <suggestion>baz</suggestion>' })));
RF('rf-malformed', 'malformed XML (unclosed element)', XML + '<rules lang="en"><category id="C" name="c"><rule id="R1" name="r">\n</category></rules>\n');
RF('rf-empty-file', 'empty rule file', '');
RF('rf-not-xml', 'rule file with plain text', 'this is not xml\n');
RF('rf-wrong-root', 'unexpected root element', XML + '<foo lang="en"/>\n');
RF('rf-no-lang', 'rules element without lang', XML + '<rules><category id="C" name="c">' + rule(tok('foo')) + '</category></rules>\n');
RF('rf-lang-de-on-en', 'rules lang=de used with -l en-US', rf(rule(tok('foo')), 'de'));
RF('rf-doctype-missing-dtd', 'DOCTYPE referring to a missing external DTD', XML + '<!DOCTYPE rules SYSTEM "does-not-exist.dtd">\n<rules lang="en"><category id="C" name="c">' + rule(tok('foo')) + '</category></rules>\n');
RF('rf-entity-undefined', 'undefined entity reference', rf(rule(tok('&nope;'))));
cli('rf-missing-file2', 'CORE-0452 --rulefile with non existing path', ['-l', 'en-US', '--rulefile', 'nope.xml', '-'], { stdin: 'This is foo bar.' });
cli('rf-directory', '--rulefile pointing to a directory', ['-l', 'en-US', '--rulefile', 'd', '-'], { stdin: 'This is foo bar.', files: { 'd/x.txt': 'x' } });
RF('rf-dup-id', 'two rules with the same id', rf(rule(tok('foo')) + rule(tok('bar'))));
RF('rf-de-ok', 'valid de rule file with de text (control)', rf(rule(tok('Hund'), { ex: '<example correction="">Hund</example>' }), 'de'), { lang: 'de-DE', stdin: 'Der Hund bellt.' });
RF('rf-fr-ref-empty', 'CORE-0452 empty match no with fr', rf(rule(tok('chat'), { msg: '<match no=""/>' }), 'fr'), { lang: 'fr', stdin: 'Le chat dort.' });
RF('rf-de-ref-forward', 'CORE-0452 forward reference with de', rf(rule(tok('Hund') + tok('<match no="4"/>'), {}), 'de'), { lang: 'de-DE', stdin: 'Der Hund bellt.' });

// ---- filter argument errors via user XML (de/en/fr), the match must fire so the filter runs
const FIL = (name, desc, lang, cls, args, pat, text, extra = '') => RF(name, desc, rf(rule(pat, { pre: `<filter class="${cls}" args="${args}"/>`, ex: extra || `<example correction="">${text}</example>` }), lang.slice(0, 2)), { lang, stdin: text });
const EN = 'org.languagetool.rules.en.', FR = 'org.languagetool.rules.fr.', DE = 'org.languagetool.rules.de.';
FIL('flt-en-ymd-nodate', 'EN-0224/CORE-0452 YMDDateHelper:34 Missing key date', 'en-US', EN + 'YMDDateCheckFilter', 'weekDay:\\1', tok('foo'), 'It is foo.');
FIL('flt-en-ymd-baddate', 'CORE-0452 YMDDateHelper:38 date format', 'en-US', EN + 'YMDDateCheckFilter', 'date:2020-01 weekDay:\\1', tok('foo'), 'It is foo.');
FIL('flt-en-ymd-yearkey', 'EN-0224 YMDDateCheckFilter:39 year key set', 'en-US', EN + 'YMDDateCheckFilter', 'year:2020 date:2020-01-01 weekDay:\\1', tok('foo'), 'It is foo.');
FIL('flt-en-ymd-badday', 'EN-0224 DateFilterHelper:45 Could not find day of week', 'en-US', EN + 'YMDDateCheckFilter', 'date:2020-01-01 weekDay:\\1', tok('foo'), 'It is foo.');
FIL('flt-en-ymd-ok-weekday', 'EN-0224 YMDDateCheckFilter control with valid weekday', 'en-US', EN + 'YMDDateCheckFilter', 'date:2020-01-01 weekDay:\\1', tok('Monday'), 'It is Monday.');
FIL('flt-en-ymdny-nodate', 'EN-0224 YMDNewYearDateFilter missing date', 'en-US', EN + 'YMDNewYearDateFilter', 'x:y', tok('foo'), 'It is foo.');
FIL('flt-en-ymdny-yearkey', 'EN-0224 YMDNewYearDateFilter:39 year key', 'en-US', EN + 'YMDNewYearDateFilter', 'year:2020 date:2020-01-01', tok('foo'), 'It is foo.');
FIL('flt-en-ymdny-baddate', 'EN-0224 YMDNewYearDateFilter bad date', 'en-US', EN + 'YMDNewYearDateFilter', 'date:2020-01', tok('foo'), 'It is foo.');
FIL('flt-en-partial-noargs', 'CORE-0452 PartialPosTagFilter:57 missing args (English)', 'en-US', EN + 'EnglishPartialPosTagFilter', 'no:1', tok('foo'), 'It is foo.');
FIL('flt-en-partial-nodis-noargs', 'EN-0224 NoDisambiguationEnglishPartialPosTagFilter missing args', 'en-US', EN + 'NoDisambiguationEnglishPartialPosTagFilter', 'no:1', tok('foo'), 'It is foo.');
FIL('flt-en-partial-groups', 'PartialPosTagFilter group count error', 'en-US', EN + 'EnglishPartialPosTagFilter', 'no:1 regexp:foo postag_regexp:NN', tok('foo'), 'It is foo.');
FIL('flt-en-partial-groups2', 'PartialPosTagFilter two_groups group count error', 'en-US', EN + 'EnglishPartialPosTagFilter', 'no:1 regexp:(f)oo postag_regexp:NN two_groups_regexp:yes', tok('foo'), 'It is foo.');
FIL('flt-en-partial-badno', 'PartialPosTagFilter no out of range', 'en-US', EN + 'EnglishPartialPosTagFilter', 'no:5 regexp:(f)oo postag_regexp:NN', tok('foo'), 'It is foo.');
FIL('flt-en-partial-nonnum', 'PartialPosTagFilter no not numeric', 'en-US', EN + 'EnglishPartialPosTagFilter', 'no:x regexp:(f)oo postag_regexp:NN', tok('foo'), 'It is foo.');
FIL('flt-en-partial-badregex', 'PartialPosTagFilter invalid regexp', 'en-US', EN + 'EnglishPartialPosTagFilter', 'no:1 regexp:(f postag_regexp:NN', tok('foo'), 'It is foo.');
FIL('flt-en-partial-ok', 'PartialPosTagFilter control, valid args', 'en-US', EN + 'EnglishPartialPosTagFilter', 'no:1 regexp:(.*)ing postag_regexp:VB', tok('running', ''), 'It is running.');
FIL('flt-fr-dmy-nodate', 'FR-0222 DMYDateCheckFilter missing date', 'fr', FR + 'DMYDateCheckFilter', 'weekDay:\\1', tok('foo'), 'Il est foo.');
FIL('flt-fr-dmy-baddate', 'FR-0222 DMYDateCheckFilter:41 date format', 'fr', FR + 'DMYDateCheckFilter', 'date:2020-01 weekDay:\\1', tok('foo'), 'Il est foo.');
FIL('flt-fr-dmy-yearkey', 'FR-0222 DMYDateCheckFilter:36 year key', 'fr', FR + 'DMYDateCheckFilter', 'year:2020 date:01-01-2020 weekDay:\\1', tok('foo'), 'Il est foo.');
FIL('flt-fr-dmy-badday', 'FR-0222 DateFilterHelper:43 day of week', 'fr', FR + 'DMYDateCheckFilter', 'date:01-01-2020 weekDay:\\1', tok('foo'), 'Il est foo.');
FIL('flt-fr-dmy-ok', 'FR-0222 DMYDateCheckFilter control', 'fr', FR + 'DMYDateCheckFilter', 'date:01-01-2020 weekDay:\\1', tok('lundi'), 'Il est lundi.');
FIL('flt-fr-partial-noargs', 'FR-0222 FrenchPartialPosTagFilter missing args', 'fr', FR + 'FrenchPartialPosTagFilter', 'no:1', tok('foo'), 'Il est foo.');
FIL('flt-fr-wwd-noargs', 'FR-0222 WordWithDeterminerFilter:73 missing params', 'fr', FR + 'WordWithDeterminerFilter', 'x:y', tok('foo'), 'Il est foo.');
FIL('flt-fr-wwd-onearg', 'FR-0222 WordWithDeterminerFilter one param missing', 'fr', FR + 'WordWithDeterminerFilter', 'wordFrom:1', tok('foo'), 'Il est foo.');
FIL('flt-fr-wwd-word-range', 'FR-0222 WordWithDeterminerFilter:64 wordFrom out of range', 'fr', FR + 'WordWithDeterminerFilter', 'wordFrom:9 determinerFrom:1', tok('foo'), 'Il est foo.');
FIL('flt-fr-wwd-det-range', 'FR-0222 WordWithDeterminerFilter:69 determinerFrom out of range', 'fr', FR + 'WordWithDeterminerFilter', 'wordFrom:1 determinerFrom:9', tok('foo'), 'Il est foo.');
FIL('flt-fr-wwd-zero', 'FR-0222 WordWithDeterminerFilter wordFrom 0', 'fr', FR + 'WordWithDeterminerFilter', 'wordFrom:0 determinerFrom:1', tok('foo'), 'Il est foo.');
FIL('flt-fr-wwd-nonnum', 'FR-0222 WordWithDeterminerFilter wordFrom not a number', 'fr', FR + 'WordWithDeterminerFilter', 'wordFrom:x determinerFrom:1', tok('foo'), 'Il est foo.');
FIL('flt-fr-wwd-sameunk', 'FR-0222 WordWithDeterminerFilter on unanalysable tokens', 'fr', FR + 'WordWithDeterminerFilter', 'wordFrom:2 determinerFrom:1', tok('foo') + tok('bar'), 'Il est foo bar.');
FIL('flt-fr-interrog-noargs', 'FR-0222 InterrogativeVerbFilter missing args', 'fr', FR + 'InterrogativeVerbFilter', 'x:y', tok('foo'), 'Il est foo.');
FIL('flt-fr-interrog-pron-range', 'FR-0222 InterrogativeVerbFilter:68 PronounFrom out of range', 'fr', FR + 'InterrogativeVerbFilter', 'PronounFrom:9 VerbFrom:1', tok('foo'), 'Il est foo.');
FIL('flt-fr-interrog-verb-range', 'FR-0222 InterrogativeVerbFilter VerbFrom out of range', 'fr', FR + 'InterrogativeVerbFilter', 'PronounFrom:1 VerbFrom:9', tok('foo'), 'Il est foo.');
FIL('flt-de-ymd-nodate', 'DE-0227 de YMDDateCheckFilter missing date', 'de-DE', DE + 'YMDDateCheckFilter', 'weekDay:\\1', tok('foo'), 'Es ist foo.');
FIL('flt-de-ymd-baddate', 'DE-0227 de YMDDateCheckFilter bad date', 'de-DE', DE + 'YMDDateCheckFilter', 'date:2020-01 weekDay:\\1', tok('foo'), 'Es ist foo.');
FIL('flt-de-ymd-yearkey', 'DE-0227 de YMDDateCheckFilter year key', 'de-DE', DE + 'YMDDateCheckFilter', 'year:2020 date:2020-01-01 weekDay:\\1', tok('foo'), 'Es ist foo.');
FIL('flt-de-ymd-badday', 'DE-0227 de DateFilterHelper day of week', 'de-DE', DE + 'YMDDateCheckFilter', 'date:2020-01-01 weekDay:\\1', tok('foo'), 'Es ist foo.');
FIL('flt-de-ymd-ok', 'DE-0227 de YMDDateCheckFilter control', 'de-DE', DE + 'YMDDateCheckFilter', 'date:2020-01-01 weekDay:\\1', tok('Montag'), 'Es ist Montag.');
FIL('flt-de-ymdny-nodate', 'DE-0227 de YMDNewYearDateFilter missing date', 'de-DE', DE + 'YMDNewYearDateFilter', 'x:y', tok('foo'), 'Es ist foo.');
FIL('flt-core-partial-noargs', 'CORE-0452 PartialPosTagFilter via de class', 'de-DE', 'org.languagetool.rules.de.GermanPartialPosTagFilter', 'no:1', tok('foo'), 'Es ist foo.');
FIL('flt-core-regexanti-missing', 'CORE-0452 RegexAntiPatternFilter:41 missing antipatterns in a regex rule', 'en-US', 'org.languagetool.rules.patterns.RegexAntiPatternFilter', 'x:y', tok('foo'), 'It is foo.');
// regex rules (RegexRuleFilterCreator, RegexAntiPatternFilter)
const rrule = (re, filter) => `<rule id="RX1" name="rx"><regexp>${re}</regexp>${filter}<message>msg</message><example correction="">foo</example></rule>`;
RF('rx-antipattern-missing', 'CORE-0452 RegexAntiPatternFilter:41 missing antipatterns', rf(rrule('foo', '<filter class="org.languagetool.rules.patterns.RegexAntiPatternFilter" args="x:y"/>')));
RF('rx-antipattern-ok', 'RegexAntiPatternFilter control: antipattern suppresses', rf(rrule('foo', '<filter class="org.languagetool.rules.patterns.RegexAntiPatternFilter" args="antipatterns:is foo"/>')));
RF('rx-antipattern-badregex', 'RegexAntiPatternFilter invalid antipattern regex', rf(rrule('foo', '<filter class="org.languagetool.rules.patterns.RegexAntiPatternFilter" args="antipatterns:(foo"/>')));
RF('rx-filter-unknown', 'CORE-0452 RegexRuleFilterCreator:54 unknown class', rf(rrule('foo', '<filter class="org.languagetool.rules.NoSuch" args="a:b"/>')));
RF('rx-filter-not-regex-filter', 'RegexRuleFilterCreator class that is no RegexRuleFilter', rf(rrule('foo', '<filter class="org.languagetool.rules.patterns.RuleFilter" args="a:b"/>')));
RF('rx-invalid-regex', 'invalid regexp in regex rule', rf(rrule('foo(', '')));
RF('rx-mark-out-of-range', 'regexp rule with mark out of range', rf(`<rule id="RX1" name="rx"><regexp mark="3">(foo)</regexp><message>msg</message><example correction="">foo</example></rule>`));

// ---- false friends via --falsefriends (needs -m)
const ffx = (inner) => `${XML}<rules>\n${inner}\n</rules>\n`;
const FF = (name, desc, xml, o = {}) => cli(name, desc, ['-l', o.lang ?? 'en-US', ...((o.mt ?? 'de') ? ['-m', o.mt ?? 'de'] : []), '--falsefriends', 'ff.xml', ...(o.extra ?? []), '-'], { stdin: o.stdin ?? 'A gift for language tool.', files: { 'ff.xml': xml } });
const ffRule = (ex = '') => `<rulegroup id="FF1"><rule><pattern lang="en"><token>gift</token></pattern><translation lang="de">Geschenk</translation></rule><rule><pattern lang="de"><token>Gift</token></pattern><translation lang="en">poison</translation></rule>${ex}</rulegroup>`;
FF('ff-ok-control', 'valid false friends file (control)', ffx(ffRule()));
FF('ff-same-lang', 'CORE-0452 FalseFriendRuleHandler:106 translation lang equals pattern lang (non-test mode)', ffx(`<rulegroup id="FF1"><rule><pattern lang="en"><token>gift</token></pattern><translation lang="en">present</translation></rule></rulegroup>`));
FF('ff-triggers-error', 'CORE-0452 FalseFriendRuleHandler:120 triggers_error example', ffx(`<rulegroup id="FF1"><rule><pattern lang="en"><token>gift</token></pattern><translation lang="de">Geschenk</translation><example type="triggers_error"><marker>gift</marker></example></rule></rulegroup>`));
FF('ff-example-correct', 'false friend rule with correct and incorrect examples', ffx(`<rulegroup id="FF1"><rule><pattern lang="en"><token>gift</token></pattern><translation lang="de">Geschenk</translation><example type="incorrect"><marker>gift</marker></example><example type="correct">present</example></rule></rulegroup>`));
FF('ff-example-no-type', 'false friend example without type attribute', ffx(`<rulegroup id="FF1"><rule><pattern lang="en"><token>gift</token></pattern><translation lang="de">Geschenk</translation><example><marker>gift</marker></example></rule></rulegroup>`));
FF('ff-example-bad-type', 'false friend example with unknown type', ffx(`<rulegroup id="FF1"><rule><pattern lang="en"><token>gift</token></pattern><translation lang="de">Geschenk</translation><example type="bogus">gift</example></rule></rulegroup>`));
FF('ff-malformed', 'CORE-0452 FalseFriendRuleLoader:69 malformed XML', ffx('<rulegroup id="FF1"><rule>'));
FF('ff-empty-file', 'CORE-0452 FalseFriendRuleLoader:69 empty file', '');
FF('ff-not-xml', 'false friends file with plain text', 'plain text\n');
FF('ff-no-rules', 'false friends file with empty rules', ffx(''));
FF('ff-wrong-root', 'false friends file with other root', XML + '<foo/>\n');
FF('ff-unknown-lang', 'false friends pattern with unsupported language code', ffx(`<rulegroup id="FF1"><rule><pattern lang="xx"><token>gift</token></pattern><translation lang="de">Geschenk</translation></rule></rulegroup>`));
FF('ff-ref-forward', 'false friends token with forward reference', ffx(`<rulegroup id="FF1"><rule><pattern lang="en"><token>gift</token><token><match no="5"/></token></pattern><translation lang="de">Geschenk</translation></rule></rulegroup>`));
FF('ff-skip-200', 'false friends token skip out of range', ffx(`<rulegroup id="FF1"><rule><pattern lang="en"><token skip="200">gift</token></pattern><translation lang="de">Geschenk</translation></rule></rulegroup>`));
FF('ff-regex-contradict', 'false friends contradicting regex', ffx(`<rulegroup id="FF1"><rule><pattern lang="en"><token regexp="yes">(?i)\\p{Lu}gift</token></pattern><translation lang="de">Geschenk</translation></rule></rulegroup>`));
cli('ff-missing-file2', 'CORE-0452 --falsefriends non existing path', ['-l', 'en-US', '-m', 'de', '--falsefriends', 'nope.xml', '-'], { stdin: 'A gift for language tool.' });
FF('ff-de-text', 'false friends with source language de, mother tongue en', ffx(ffRule()), { lang: 'de-DE', mt: 'en', stdin: 'Ein Gift für Sprache.' });
FF('ff-no-mothertongue', 'false friends without -m', ffx(ffRule()), { mt: '' });

// ---- bitext XML via --bitextrules
const btx = (inner, root = 'targetLang="de"') => `${XML}<rules ${root}>\n<category id="CAT1" name="c">\n${inner}\n</category>\n</rules>\n`;
const btRule = (o = {}) => `<rule lang="${o.lang ?? 'de'}" id="${o.id ?? 'BT1'}" name="bt"><pattern><source lang="en">${o.src ?? tok('is') + tok('a')}</source><target>${o.trg ?? tok('ein')}</target></pattern><message>${o.msg ?? 'Meinten Sie <suggestion>x</suggestion>?'}</message>${o.ex ?? '<example type="incorrect" correction="x"><srcExample><marker>is a</marker></srcExample><trgExample><marker>ein</marker></trgExample></example>'}</rule>`;
const BT = (name, desc, xml, o = {}) => cli(name, desc, ['-l', o.lang ?? 'de-DE', ...((o.mt ?? 'en') ? ['-m', o.mt ?? 'en'] : []), '-b2', '--bitextrules', 'bt.xml', ...(o.extra ?? []), 'input.txt'], { files: { 'input.txt': o.input ?? 'This is a test.\tDas ist ein Test.\nHello world\tHallo Welt\n', 'bt.xml': xml } });
BT('bt-xml-ok-control', 'valid bitext rule file (control)', btx(btRule()));
BT('bt-xml-triggers-error', 'CORE-0452 BitextPatternRuleHandler:158 triggers_error example', btx(btRule({ ex: '<example type="triggers_error"><srcExample>is a</srcExample><trgExample>ein</trgExample></example>' })));
BT('bt-xml-malformed', 'CORE-0452 BitextPatternRuleLoader:48 malformed XML', btx('<rule lang="de" id="X">'));
BT('bt-xml-empty-file', 'CORE-0452 BitextPatternRuleLoader:48 empty file', '');
BT('bt-xml-not-xml', 'bitext rule file with plain text', 'plain\n');
BT('bt-xml-no-targetlang', 'bitext rules without targetLang', btx(btRule(), ''));
BT('bt-xml-bad-targetlang', 'bitext rules with unknown targetLang', btx(btRule(), 'targetLang="xx"'));
BT('bt-xml-bad-srclang', 'bitext source lang unknown', btx(btRule().replace('<source lang="en">', '<source lang="xx">')));
BT('bt-xml-no-srclang', 'bitext source without lang', btx(btRule().replace('<source lang="en">', '<source>')));
BT('bt-xml-ref-forward', 'bitext forward reference in source', btx(btRule({ src: tok('is') + tok('<match no="5"/>') })));
BT('bt-xml-skip-200', 'bitext skip out of range', btx(btRule({ src: tok('is', ' skip="200"') })));
BT('bt-xml-min-2', 'bitext min 2', btx(btRule({ trg: tok('ein', ' min="2"') })));
BT('bt-xml-max-0', 'bitext max 0', btx(btRule({ trg: tok('ein', ' max="0"') })));
BT('bt-xml-chunk-both', 'bitext chunk and chunk_re', btx(btRule({ trg: '<token chunk="a" chunk_re="b">ein</token>' })));
BT('bt-xml-regex-contradict', 'bitext contradicting regex', btx(btRule({ trg: tok('(?i)\\p{Lu}ein', ' regexp="yes"') })));
BT('bt-xml-ref-empty', 'bitext empty match no', btx(btRule({ msg: '<match no=""/>' })));
BT('bt-xml-ref-zero', 'bitext match no 0', btx(btRule({ msg: '<match no="0"/>' })));
BT('bt-xml-example-nomarker', 'bitext incorrect example without marker', btx(btRule({ ex: '<example type="incorrect" correction="x"><srcExample>is a</srcExample><trgExample>ein</trgExample></example>' })));
BT('bt-xml-example-no-type', 'bitext example without type', btx(btRule({ ex: '<example><srcExample>is a</srcExample><trgExample>ein</trgExample></example>' })));
BT('bt-xml-wrong-root-order', 'bitext target element before source', btx(`<rule lang="de" id="B"><pattern><target>${tok('ein')}</target><source lang="en">${tok('is')}</source></pattern><message>m</message></rule>`));
cli('bt-xml-missing-file2', 'CORE-0452 --bitextrules non existing path', ['-l', 'de-DE', '-m', 'en', '-b2', '--bitextrules', 'nope.xml', 'input.txt'], { files: { 'input.txt': 'This is a test.\tDas ist ein Test.\n' } });
BT('bt-xml-lang-mismatch', 'bitext rules targetLang=fr with -l de-DE', btx(btRule({ lang: 'fr' }), 'targetLang="fr"'));
BT('bt-xml-no-m', 'bitext rules --bitextrules without -m', btx(btRule()), { mt: '' });

// ---- server: rulesFile is a .languagetool.cfg style file, never XML (XML error texts are not reachable); cfg variants + cacheSize
const SRV = (name, desc, props, requests, extra = {}) => http(name, desc, requests, { serverArgs: ['--config', '{WORK}/server.properties'], stopAfter: true, files: { 'server.properties': props, ...(extra.files ?? {}) } });
SRV('srv-rulesfile-xml', 'server rulesFile pointing to a pattern rule XML (cfg parser reads it as properties)', 'rulesFile={WORK}/rules.xml\n', [check({ language: 'en-US', text: 'This is foo bar.' })], { files: { 'rules.xml': rf(rule(tok('foo') + tok('bar'))) } });
cli('srv-rulesfile-missing', 'server rulesFile that does not exist: start fails', ['--config', 'p.properties', '--port', '19192'], { jar: 'languagetool-server.jar', mainClass: 'org.languagetool.server.HTTPServer', stripTimestamp: true, stderrExceptionOnly: true, files: { 'p.properties': 'rulesFile=missing.cfg\n' } });
SRV('srv-rulesfile-garbage', 'server rulesFile with malformed cfg lines', 'rulesFile={WORK}/rules.cfg\n', [check({ language: 'en-US', text: 'This is a test,, ok.' }), check({ language: 'de-DE', text: 'Das ist ein Test,, ok.' })], { files: { 'rules.cfg': 'disabledRules.en=\nenabledRules=\\\nmotherTongue=\nfoo\n=bar\ndisabledCategories.en=NOPE\n' } });
SRV('srv-rulesfile-motherTongue-bad', 'server rulesFile with motherTongue unknown language', 'rulesFile={WORK}/rules.cfg\n', [check({ language: 'en-US', text: 'A gift for language tool.' })], { files: { 'rules.cfg': 'motherTongue=xx\n' } });
SRV('srv-rulesfile-motherTongue-same', 'server rulesFile with motherTongue equal to the text language', 'rulesFile={WORK}/rules.cfg\n', [check({ language: 'en-US', text: 'A gift for language tool.' })], { files: { 'rules.cfg': 'motherTongue=en\n' } });
cli('srv-cachesize-negative', 'CORE-0452 ResultCache:69 cacheSize=-1 at server start', ['--config', 'p.properties', '--port', '19190'], { jar: 'languagetool-server.jar', mainClass: 'org.languagetool.server.HTTPServer', stripTimestamp: true, stderrExceptionOnly: true, files: { 'p.properties': 'cacheSize=-1\n' } });
cli('srv-cachesize-nonnumeric', 'server cacheSize not a number', ['--config', 'p.properties', '--port', '19191'], { jar: 'languagetool-server.jar', mainClass: 'org.languagetool.server.HTTPServer', stripTimestamp: true, stderrExceptionOnly: true, files: { 'p.properties': 'cacheSize=abc\n' } });

// ---- U-2 preferredVariants
const pv = (v, extra = {}) => check({ text: 'This is a test.', language: 'auto', preferredVariants: v, ...extra });
http('u2-preferred-variants', 'U-2 SRV-0120: both preferredVariants error texts and valid values', [
  pv('enGB'), pv('xx-YY'), pv('en-GB'), pv('en-GB,de-AT'), pv('en-GB, de-AT'), pv('de-XX'), pv('en-gb'), pv('EN-GB'), pv('en-'), pv('-GB'), pv('en-GB,enGB'), pv('en-GB,xx-YY'), pv('enGB,xx-YY'), pv(''), pv(','), pv('en-GB,'),
  pv('en_GB'), pv('en-GB-x'), pv('xx-'), pv('x-y'),
  check({ text: 'This is a test.', language: 'en-US', preferredVariants: 'enGB' }),
  check({ text: 'This is a test.', language: 'en-US', preferredVariants: 'xx-YY' }),
  check({ text: 'This is a test.', language: 'en-US', preferredVariants: 'en-GB' }),
  check({ text: 'This is a test.', language: 'en', preferredVariants: 'en-GB' }),
  check({ text: 'Das ist ein Test.', language: 'auto', preferredVariants: 'de-AT' }),
  check({ text: 'Das ist ein Test.', language: 'auto', preferredVariants: 'de-DE,de-AT,de-CH' }),
  check({ text: 'This is a test.', language: 'auto', preferredVariants: 'en-GB', multilingual: 'true' }),
  check({ text: 'This is a test.', language: 'auto', preferredVariants: 'enGB', multilingual: 'true' }),
  check({ text: 'This is a test.', language: 'auto', preferredVariants: 'xx-YY', multilingual: 'true' }),
  check({ text: 'This is a test.', language: 'auto', preferredVariants: 'xx-YY', noopLanguages: 'en' }),
  check({ text: 'This is a test.', language: 'auto', preferredVariants: 'xx-YY', mode: 'textLevelOnly' }),
  pv('en-XX'), pv('en-ZZ,de-AT'), pv('en-US-x'), pv('en-1'), pv('en-GB-oed'), pv('en--'),
  check({ text: 'Das ist ein Test.', language: 'auto', preferredVariants: 'de-XX' }),
  check({ text: 'Das ist ein Test.', language: 'auto', preferredVariants: 'de-DE-x-simple-language' }),
  check({ text: 'Ceci est un test.', language: 'auto', preferredVariants: 'fr-XX' }),
  check({ text: 'Ceci est un test.', language: 'auto', preferredVariants: 'fr-CA' }),
]);
http('u2-preferred-variants-get', 'U-2 preferredVariants through GET query', [
  { method: 'GET', path: '/v2/check', params: { text: 'This is a test.', language: 'auto', preferredVariants: 'enGB' } },
  { method: 'GET', path: '/v2/check', params: { text: 'This is a test.', language: 'auto', preferredVariants: 'xx-YY' } },
  { method: 'GET', path: '/v2/check', params: { text: 'This is a test.', language: 'auto', preferredVariants: 'en-GB' } },
]);

// ---- U-4 SENTENCE_FRAGMENT priority
const frag = ['Though the dog likes to bark loudly.', 'After we had a lovely dinner.', 'Because I am a student of old language.', 'When the wind howls in the trees.'];
cli('u4-sentence-fragment', 'U-4 EN-0004 prio= of SENTENCE_FRAGMENT matches (CLI output)', ['-l', 'en-US', '--level', 'PICKY', '-eo', '-e', 'SENTENCE_FRAGMENT', '-'], { stdin: frag.join('\n') + '\n' });
cli('u4-sentence-fragment-json', 'U-4 SENTENCE_FRAGMENT with --json', ['-l', 'en-US', '--level', 'PICKY', '-eo', '-e', 'SENTENCE_FRAGMENT', '--json', '-'], { stdin: frag.join('\n') + '\n' });
cli('u4-fragment-vs-others', 'U-4 rule order and prio with other rules in one sentence', ['-l', 'en-US', '--level', 'PICKY', '-e', 'SENTENCE_FRAGMENT', '-'], { stdin: 'Though the the dog likes to bark loudly,, yes.\nBecause i am a student.\n' });
cli('u4-fragment-clean-overlapping', 'U-4 SENTENCE_FRAGMENT with --clean-overlapping', ['-l', 'en-US', '--level', 'PICKY', '-e', 'SENTENCE_FRAGMENT', '--clean-overlapping', '-'], { stdin: 'Though the the dog likes to bark loudly,, yes.\nBecause i am a student.\n' });
cli('u4-prio-apostrophe', 'U-4 EN-0004 SPURIOUS_APOSTROPHE prio (put twice with 1)', ['-l', 'en-US', '-eo', '-e', 'SPURIOUS_APOSTROPHE', '-'], { stdin: "The dog's' bone. Its' a nice day. Two dogs's bones.\n" });
cli('u4-prio-assorted', 'EN-0004 prio= output of assorted rules (CLI)', ['-l', 'en-US', '--level', 'PICKY', '-eo', '-e', 'I_E,PROFANITY,MISSING_HYPHEN,UPPERCASE_SENTENCE_START,COMMA_PARENTHESIS_WHITESPACE,EN_UNPAIRED_BRACKETS,WHITESPACE_RULE,ENGLISH_WORD_REPEAT_RULE,SENTENCE_FRAGMENT', '-'], { stdin: 'i.e. this is is a (test. Because he  said so.\n' });
http('u4-sentence-fragment-http', 'U-4 SENTENCE_FRAGMENT via /v2/check (match order with level picky)', [
  check({ language: 'en-US', text: frag.join(' '), level: 'picky', enabledRules: 'SENTENCE_FRAGMENT', enabledOnly: 'true' }),
  check({ language: 'en-US', text: 'Though the the dog likes to bark loudly,, yes. Because i am a student.', level: 'picky', enabledRules: 'SENTENCE_FRAGMENT' }),
  check({ language: 'en-GB', text: frag.join(' '), level: 'picky', enabledRules: 'SENTENCE_FRAGMENT', enabledOnly: 'true' }),
  check({ language: 'en-US', text: frag.join(' '), level: 'picky', enabledRules: 'SENTENCE_FRAGMENT', enabledOnly: 'true', useragent: 'x', enableTempOffRules: 'true' }),
]);

// ---- U-5 /v2/users/me OPTIONS
const rec = ['access-control-allow-methods', 'access-control-allow-headers', 'access-control-allow-origin'];
const opt = (headers, method = 'OPTIONS', p = '/v2/users/me', more = {}) => ({ method, path: p, ...(headers ? { headers } : {}), recordHeaders: rec, ...more });
http('u5-users-me-options', 'U-5 SRV-0105: OPTIONS/GET /v2/users/me incl. Access-Control-Request-Headers variants', [
  opt(), opt({ 'Access-Control-Request-Headers': 'x-a,x-b' }), opt({ 'Access-Control-Request-Headers': 'x-a, x-b' }), opt({ 'Access-Control-Request-Headers': '' }),
  opt({ 'Access-Control-Request-Headers': 'Authorization' }), opt({ 'Access-Control-Request-Headers': 'x-a,x-b', Origin: 'https://example.org' }),
  opt({ Origin: 'https://example.org' }), opt({ 'Access-Control-Request-Method': 'GET' }), opt({ 'Access-Control-Request-Headers': 'x-a,x-b', 'Access-Control-Request-Method': 'GET', Origin: 'https://example.org' }),
  opt({ 'Access-Control-Request-Headers': 'x-a,x-b' }, 'options'), opt({ 'Access-Control-Request-Headers': 'x-a,x-b' }, 'OPTIONS', '/v2/users/me?authMethod=apiKey'), opt({ 'Access-Control-Request-Headers': 'x-a' }, 'OPTIONS', '/v2/users/me/'),
  opt({ 'Access-Control-Request-Headers': 'x-a' }, 'OPTIONS', '/v2/users/me?authMethod=bogus'),
  opt(undefined, 'GET'), opt({ Authorization: 'Basic ' + Buffer.from('a:b').toString('base64') }, 'GET'), opt({ Authorization: 'Basic ' + Buffer.from('a:b').toString('base64') }, 'GET', '/v2/users/me?authMethod=apiKey'),
  opt({ Authorization: 'Bearer abc' }, 'GET'), opt({ Authorization: 'Basic !!!' }, 'GET'), opt({ Authorization: 'Basic ' + Buffer.from('nocolon').toString('base64') }, 'GET'),
  opt(undefined, 'GET', '/v2/users/me?authMethod=addonToken'), opt(undefined, 'GET', '/v2/users/me?authMethod=bogus'), opt(undefined, 'POST'), opt(undefined, 'PUT'), opt(undefined, 'DELETE'), opt(undefined, 'HEAD'), opt(undefined, 'PATCH'),
]);
http('u5-users-me-options-origin', 'U-5 OPTIONS /v2/users/me with allowOriginUrl configured', [
  opt({ 'Access-Control-Request-Headers': 'x-a,x-b', Origin: 'https://example.org' }), opt(), opt(undefined, 'GET'),
], { serverArgs: ['--allow-origin', 'https://allowed.example'] });
http('u5-users-me-options-origin-star', 'U-5 OPTIONS /v2/users/me with --allow-origin *', [
  opt({ 'Access-Control-Request-Headers': 'x-a,x-b', Origin: 'https://example.org' }), opt(), opt(undefined, 'GET'),
], { serverArgs: ['--allow-origin', '*'] });
console.log('generated', OUT);
