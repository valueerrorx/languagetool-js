// Authors oracle/cases/X-CLI-BASIC/*.json (inputs only). Semantics: docs/review/F21-oracle.md.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';

const DIR = path.join(ROOT, 'oracle/cases/X-CLI-BASIC');
rmSync(DIR, { recursive: true, force: true });
mkdirSync(DIR, { recursive: true });
const BASE = { kind: 'cli', clock: 'fixed', compare: 'cli', normalize: ['buildDate', 'commit', 'stackFrames', 'paths'] };
const w = (name, description, args, extra = {}) => writeFileSync(path.join(DIR, `${name}.json`), JSON.stringify({ ...BASE, description, args, ...extra }, null, 1) + '\n');

// rules restricted to the ported core rules (F16); full rule sets are portLater
const EN_RULES = 'COMMA_PARENTHESIS_WHITESPACE,DOUBLE_PUNCTUATION,UPPERCASE_SENTENCE_START,WHITESPACE_RULE,EN_UNPAIRED_BRACKETS,ENGLISH_WORD_REPEAT_RULE,SENTENCE_WHITESPACE';
const FR_RULES = 'COMMA_PARENTHESIS_WHITESPACE,DOUBLE_PUNCTUATION,UPPERCASE_SENTENCE_START,WHITESPACE_RULE,UNPAIRED_BRACKETS,SENTENCE_WHITESPACE';
const DE_RULES = 'COMMA_PARENTHESIS_WHITESPACE,DE_DOUBLE_PUNCTUATION,UPPERCASE_SENTENCE_START,WHITESPACE_RULE,UNPAIRED_BRACKETS,GERMAN_WORD_REPEAT_RULE,DE_SENTENCE_WHITESPACE';
const only = (r) => ['-eo', '-e', r];
const EN = only(EN_RULES);
const FR = only(FR_RULES);
const DE = only(DE_RULES);

// MainTest.enTestFile and MainTest stdin text
const MAIN_FILE = 'This is an test.\n\nThis is a test of of language tool.\n\nThis is is a test of language tool.';
const MAIN_STDIN = 'This is an test.';
const MIXED = 'This is a test of of language tool.  Hi ,there ( ok.. this is is a test.\n\nlowercase start';

// usage, version, list, option errors
w('no-args', 'CLI-0001: no args -> usage on stdout, exit 1', []);
w('usage-h', 'CLI-0007: -h', ['-h']);
w('usage-help', 'CLI-0007: -help', ['-help']);
w('usage-dash-help', 'CLI-0007: --help', ['--help']);
w('usage-qmark', 'CLI-0007: --?', ['--?']);
w('usage-before-version', 'CLI-0007: usage precedes --version', ['-h', '--version']);
w('usage-before-list', 'CLI-0007: usage precedes --list', ['--list', '-h']);
w('too-many-args', 'CLI-0001: 15 args -> usage', Array(15).fill('-b'));
w('max-args-14', 'CLI-0001: 14 args accepted (stdin empty)', [...Array(13).fill('-b'), '-'], { stdin: '' });
w('version', 'CLI-0005: --version', ['--version']);
w('version-with-lang', 'CLI-0005: --version ignores -l', ['-l', 'en-US', '--version']);
w('list', 'CLI-0006: --list (DEV-006: Java lists all languages)', ['--list'], { listDev006: true, expect: 'dev006' });
w('list-version-order', 'CLI-0006: --list precedes --version?', ['--version', '--list'], { listDev006: true, expect: 'dev006' });
w('unknown-param', 'CLI-0002: unknown option before the file', ['--bogus', 'input.txt'], { files: { 'input.txt': 'Hi.\n' } });
w('unknown-param-middle', 'CLI-0002: unknown option in the middle', ['-l', 'en-US', '--bogus', '-b', 'input.txt'], { files: { 'input.txt': 'Hi.\n' } });
w('unknown-last-is-file', 'CLI-0002: last non-option arg is the file name', ['-l', 'en-US', '--bogus'], { stdin: '' });
w('first-match-wins', 'CLI-0002: option scanning left to right', ['-l', 'en-US', '-l', 'fr', ...EN, 'input.txt'], { files: { 'input.txt': 'Bonjour  le monde.\n' } });
for (const [o, d] of [['-l', 'language'], ['--language', 'language'], ['-d', 'disable'], ['-e', 'enable'], ['-c', 'encoding'], ['-m', 'mothertongue'], ['--enablecategories', 'cat'], ['--disablecategories', 'cat'], ['--rulefile', 'rulefile'], ['--languagemodel', 'lm']]) {
  w(`missing-arg${o.replace(/^-+/, '-')}`, `CLI-0003: ${o} without value`, [o]);
}
w('missing-arg-after-file', 'CLI-0003: value option as last arg after other options', ['-b', '-l']);
w('unknown-language', 'CLI-0021: -l zz', ['-l', 'zz', '-'], { stdin: 'Hi.' , listCut: true });
w('unknown-language-country', 'CLI-0021: -l en-XX', ['-l', 'en-XX', '-'], { stdin: 'Hi.', listCut: true });
w('unknown-language-empty', 'CLI-0021: -l with empty value', ['-l', '', '-'], { stdin: 'Hi.', listCut: true });
w('unknown-language-case', 'CLI-0021: -l EN-us (case)', ['-l', 'EN-us', ...EN, '-'], { stdin: MIXED });

// languages
w('lang-en-us', 'CLI-0021/0038: -l en-US plain listing', ['-l', 'en-US', ...EN, '-'], { stdin: MIXED });
w('lang-en', 'CLI-0021/0038: -l en (non-variant hint)', ['-l', 'en', ...EN, '-'], { stdin: MIXED });
w('lang-en-gb', 'CLI-0021: -l en-GB', ['-l', 'en-GB', ...EN, '-'], { stdin: MIXED });
w('lang-en-long', 'CLI-0021: --language', ['--language', 'en-US', ...EN, '-'], { stdin: MIXED });
w('lang-fr', 'CLI-0021: -l fr', ['-l', 'fr', ...FR, '-'], { stdin: 'Bonjour  le  monde , ok.. voici voici un test (sans fin.\n\nminuscule.' });
w('lang-fr-fr', 'CLI-0021: -l fr-FR', ['-l', 'fr-FR', ...FR, '-'], { stdin: 'Bonjour , voici voici un test.' });
w('lang-fr-ca', 'CLI-0021: -l fr-CA', ['-l', 'fr-CA', ...FR, '-'], { stdin: 'Bonjour , voici voici un test.' });
w('lang-de-de', 'CLI-0021: -l de-DE (German rules not ported)', ['-l', 'de-DE', ...DE, '-'], { stdin: 'Das ist ein ein Test ,ok.. (ohne Ende.\n\nkleiner Anfang.', portLater: true });
w('lang-de', 'CLI-0021: -l de', ['-l', 'de', ...DE, '-'], { stdin: 'Das ist ein ein Test ,ok.. (ohne Ende.', portLater: true });
w('lang-de-at', 'CLI-0021: -l de-AT', ['-l', 'de-AT', ...DE, '-'], { stdin: 'Das ist ein ein Test.', portLater: true });
w('lang-de-umlauts', 'CLI-0021/0043: -l de-DE umlauts', ['-l', 'de-DE', ...DE, '-'], { stdin: 'Über größere Ärzte  sprechen wir wir später .', portLater: true });
w('no-language', 'CLI-0037: no -l -> English default, message on stderr', [...EN, '-'], { stdin: MIXED });
w('no-language-file', 'CLI-0037: no -l with file', [...EN, 'input.txt'], { files: { 'input.txt': MIXED } });
w('no-language-noargs-stdin', 'CLI-0037: only stdin (no file arg, no -l)', [], { stdin: MIXED, expectUsage: true });
w('only-lang-implicit-stdin', 'CLI-0037: -l en, FILE defaults to -', ['-l', 'en-US', ...EN], { stdin: MIXED });
w('autodetect-en', 'CLI-0037: -adl on English file (detector, F18)', ['-adl', ...EN, 'input.txt'], { files: { 'input.txt': MAIN_FILE } });
w('autodetect-stdin', 'CLI-0037: -adl stdin', ['-adl', ...EN], { stdin: MAIN_STDIN });
w('autodetect-fr', 'CLI-0037: -adl on French text', ['-adl', ...FR, 'input.txt'], { files: { 'input.txt': 'Ceci est un petit texte français pour tester la détection de la langue, avec  deux espaces.\n' } });
w('autodetect-de', 'CLI-0037: -adl on German text', ['-adl', ...DE, 'input.txt'], { files: { 'input.txt': 'Das ist ein kleiner deutscher Text zum Testen der Spracherkennung, mit  zwei Leerzeichen.\n' }, portLater: true });
w('mothertongue', 'CLI-0040: -m de with -l en', ['-l', 'en-US', '-m', 'de', ...EN, '-'], { stdin: MIXED });

// rule selection (CLI-0040)
w('rules-eo-only-repeat', 'CLI-0040: -eo -e ENGLISH_WORD_REPEAT_RULE', ['-l', 'en-US', '-eo', '-e', 'ENGLISH_WORD_REPEAT_RULE', '-'], { stdin: MIXED });
w('rules-disable', 'CLI-0040: -eo set minus -d', ['-l', 'en-US', ...EN, '-d', 'DOUBLE_PUNCTUATION,WHITESPACE_RULE', '-'], { stdin: MIXED });
w('rules-disable-order', 'CLI-0040: -d before -e', ['-l', 'en-US', '-d', 'UPPERCASE_SENTENCE_START', ...EN, '-'], { stdin: MIXED });
w('rules-enable-unknown', 'CLI-0040: -e with unknown rule id', ['-l', 'en-US', '-eo', '-e', 'FOO_BAR_BLABLA', '-'], { stdin: 'Zwuasdac?' });
w('rules-enable-and-disable', 'CLI-0040: same id enabled and disabled', ['-l', 'en-US', '-eo', '-e', 'DOUBLE_PUNCTUATION', '-d', 'DOUBLE_PUNCTUATION', '-'], { stdin: MIXED });
w('rules-enablecategories', 'CLI-0040: --enablecategories with -eo', ['-l', 'en-US', '-eo', '--enablecategories', 'PUNCTUATION', '-'], { stdin: MIXED });
w('rules-disablecategories', 'CLI-0040: --disablecategories', ['-l', 'en-US', ...EN, '--disablecategories', 'PUNCTUATION', '-'], { stdin: MIXED });
w('rules-clean-overlapping', 'CLI-0040: --clean-overlapping', ['-l', 'en-US', ...EN, '--clean-overlapping', '-'], { stdin: MIXED });
w('rules-enable-temp-off', 'CLI-0040: --enable-temp-off', ['-l', 'en-US', ...EN, '--enable-temp-off', '-'], { stdin: MIXED });
w('rules-fr', 'CLI-0040: fr selection', ['-l', 'fr', '-eo', '-e', 'DOUBLE_PUNCTUATION', '-'], { stdin: 'Voici voici un test.. ok' });
w('rules-no-eo', 'CLI-0040: -e without -eo (full rule set, English dictionary rules) - ported rules + spelling not ported', ['-l', 'en-US', '-e', 'ENGLISH_WORD_REPEAT_RULE', '-'], { stdin: MIXED, portLater: true });
w('rules-default-all', 'CLI-0040: default rule set (MainTest.testEnglishFile)', ['-l', 'en', 'input.txt'], { files: { 'input.txt': MAIN_FILE }, portLater: true });
w('rules-default-all-stdin', 'CLI-0040: default rule set stdin (MainTest.testEnglishStdIn1)', ['-l', 'en'], { stdin: MAIN_STDIN, portLater: true });
w('rules-default-fr', 'CLI-0040: default rule set fr', ['-l', 'fr', '-'], { stdin: 'Voici voici un test.', portLater: true });
w('maintest-file-eo', 'CLI-0046: MainTest.testEnglishFile text, ported rules only', ['-l', 'en', ...EN, 'input.txt'], { files: { 'input.txt': MAIN_FILE } });
w('maintest-stdin1', 'CLI-0042: MainTest.testEnglishStdIn1 text', ['-l', 'en', ...EN], { stdin: MAIN_STDIN });
w('maintest-stdin2', 'CLI-0042: MainTest.testEnglishStdIn2 text', ['-l', 'en', ...EN, '-'], { stdin: MAIN_STDIN });
w('maintest-fake-rule', 'CLI-0040: MainTest.testEnglishFileFakeRuleEnabled', ['-l', 'en', '-e', 'FOO_BAR_BLABLA', '-'], { stdin: 'Zwuasdac?', portLater: true });
w('maintest-disabled', 'CLI-0040: MainTest.testEnglishFileRuleDisabled', ['-l', 'en', '-d', 'EN_A_VS_AN', 'input.txt'], { files: { 'input.txt': MAIN_FILE }, portLater: true });

// input reading (CLI-0042, CLI-0043)
const enc = (s, e) => Buffer.from(s, e).toString('base64');
const UMLAUT = 'Über  größere Ärzte, die die Straße suchen.  Ünd  naïve café – “quotes” ok.. (x';
w('input-file-utf8', 'CLI-0043: UTF-8 file with umlauts', ['-l', 'en-US', ...EN, 'input.txt'], { files: { 'input.txt': UMLAUT + '\n' } });
w('input-file-bom', 'CLI-0043: UTF-8 BOM stripped', ['-l', 'en-US', ...EN, 'input.txt'], { files: { 'input.txt': '﻿' + UMLAUT + '\n' } });
w('input-file-bom-c', 'CLI-0043: BOM with -c utf-8 (BOM char stays)', ['-l', 'en-US', ...EN, '-c', 'utf-8', 'input.txt'], { files: { 'input.txt': '﻿' + UMLAUT + '\n' } });
w('input-file-latin1-c', 'CLI-0043: -c latin1 file', ['-l', 'en-US', ...EN, '-c', 'latin1', 'input.txt'], { filesB64: { 'input.txt': enc('Über  größere Ärzte, die die Straße.\n', 'latin1') } });
w('input-file-latin1-no-c', 'CLI-0043: latin1 bytes decoded as UTF-8 (malformed)', ['-l', 'en-US', ...EN, 'input.txt'], { filesB64: { 'input.txt': enc('Über  größere Ärzte, die die Straße.\n', 'latin1') } });
w('input-file-utf16le-bom', 'CLI-0043: UTF-16LE BOM detection', ['-l', 'en-US', ...EN, 'input.txt'], { filesB64: { 'input.txt': Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('Hi  there there, ok..\n', 'utf16le')]).toString('base64') } });
w('input-file-utf16be-bom', 'CLI-0043: UTF-16BE BOM detection', ['-l', 'en-US', ...EN, 'input.txt'], { filesB64: { 'input.txt': Buffer.concat([Buffer.from([0xfe, 0xff]), Buffer.from('Hi  there there, ok..\n', 'utf16le').swap16()]).toString('base64') } });
w('input-file-utf32le-bom', 'CLI-0043: UTF-32LE BOM detection', ['-l', 'en-US', ...EN, 'input.txt'], { filesB64: { 'input.txt': Buffer.concat([Buffer.from([0xff, 0xfe, 0, 0]), ...[...'Hi  there there.'].map((c) => { const b = Buffer.alloc(4); b.writeUInt32LE(c.codePointAt(0)); return b; })]).toString('base64') } });
w('input-file-utf16-c', 'CLI-0043: -c UTF-16 file', ['-l', 'en-US', ...EN, '-c', 'UTF-16', 'input.txt'], { filesB64: { 'input.txt': Buffer.concat([Buffer.from([0xfe, 0xff]), Buffer.from('Hi  there there.\n', 'utf16le').swap16()]).toString('base64') } });
w('input-bad-charset', 'CLI-0043: -c with unknown charset', ['-l', 'en-US', '-c', 'foo-bar', 'input.txt'], { files: { 'input.txt': 'Hi.\n' } });
w('input-file-empty', 'CLI-0043: empty file', ['-l', 'en-US', ...EN, 'input.txt'], { files: { 'input.txt': '' } });
w('input-stdin-empty', 'CLI-0043: empty stdin', ['-l', 'en-US', ...EN, '-'], { stdin: '' });
w('input-file-newline-only', 'CLI-0043: newline only', ['-l', 'en-US', ...EN, 'input.txt'], { files: { 'input.txt': '\n\n\n' } });
w('input-file-missing', 'CLI-0042: missing file', ['-l', 'en-US', ...EN, 'does-not-exist.txt']);
w('input-file-missing-nolang', 'CLI-0042: missing file without -l', ['does-not-exist.txt']);
w('input-file-directory', 'CLI-0042: directory as file', ['-l', 'en-US', ...EN, 'dir'], { files: { 'dir/a.txt': 'Hi.\n' } });
w('input-recursive-dir', 'CLI-0042: -r on a directory (recursive mode, not in these IDs; recorded)', ['-l', 'en-US', ...EN, '-r', 'dir'], { files: { 'dir/a.txt': 'Hi  there there.\n' }, portLater: true });
w('input-stdin-dash', 'CLI-0042: stdin via -', ['-l', 'en-US', ...EN, '-'], { stdin: MIXED });
w('input-stdin-bom', 'CLI-0043: stdin is not BOM-checked', ['-l', 'en-US', ...EN, '-'], { stdin: '﻿Hi  there there.' });
w('input-stdin-umlauts', 'CLI-0043: stdin umlauts UTF-8', ['-l', 'en-US', ...EN, '-'], { stdin: UMLAUT });
w('input-stdin-crlf', 'CLI-0043: CRLF line endings', ['-l', 'en-US', ...EN, '-'], { stdin: 'First line there there.\r\nsecond line  here.\r\n\r\nthird.' });
w('input-stdin-cr', 'CLI-0043: CR-only line endings', ['-l', 'en-US', ...EN, '-'], { stdin: 'First line there there.\rsecond line  here.\r\rthird.' });
w('input-no-trailing-newline', 'CLI-0043: no trailing newline', ['-l', 'en-US', ...EN, '-'], { stdin: 'Hi there there.' });
w('input-trailing-newlines', 'CLI-0043: trailing newlines', ['-l', 'en-US', ...EN, '-'], { stdin: 'Hi there there.\n\n\n' });
w('input-astral', 'CLI-0043/0046: astral chars (columns/context)', ['-l', 'en-US', ...EN, '-'], { stdin: 'Emoji \u{1F600}\u{1F600} then then and 𝒳 more  text.' });
w('input-nbsp-tab', 'CLI-0046: nbsp, tab, zero-width', ['-l', 'en-US', ...EN, '-'], { stdin: 'a  b\tc​d  e e, ok' });
w('input-soft-hyphen', 'CLI-0049: soft hyphen / U+202D markup', ['-l', 'en-US', ...EN, '-'], { stdin: 'Soft­hyphen word word here.‭RTL‬  done' });
w('input-long-line', 'CLI-0046: very long line (context window 45)', ['-l', 'en-US', ...EN, '-'], { stdin: `${'word '.repeat(2000)}end end,  ok.. (x` });
w('input-many-lines', 'CLI-0046: line numbers over many paragraphs', ['-l', 'en-US', ...EN, '-'], { stdin: Array.from({ length: 60 }, (_, i) => `Line ${i} text${i % 7 === 0 ? ' with with repeat' : ''}${i % 11 === 0 ? ' and ,comma' : ''}.`).join('\n') });
w('input-many-paragraphs', 'CLI-0046: line numbers with blank lines', ['-l', 'en-US', ...EN, '-'], { stdin: Array.from({ length: 30 }, (_, i) => `Para ${i} here${i % 4 === 0 ? ' and and again' : ''}.`).join('\n\n') });
w('input-no-errors', 'CLI-0048: no matches, time line only', ['-l', 'en-US', ...EN, '-'], { stdin: 'This is a perfectly fine sentence. And another one follows.' });
w('input-one-char', 'CLI-0048: single char', ['-l', 'en-US', ...EN, '-'], { stdin: 'a' });
w('input-whitespace-only', 'CLI-0048: spaces only', ['-l', 'en-US', ...EN, '-'], { stdin: '   ' });
w('input-many-sentences', 'CLI-0048: sentence count in time line', ['-l', 'en-US', ...EN, '-'], { stdin: Array.from({ length: 200 }, (_, i) => `Sentence number ${i} is here.`).join(' ') });
w('input-file-and-stdin-ignored', 'CLI-0042: stdin ignored when file given', ['-l', 'en-US', ...EN, 'input.txt'], { files: { 'input.txt': 'From file file.\n' }, stdin: 'From stdin stdin.\n' });
w('input-spaces-in-name', 'CLI-0042: file name with spaces and umlaut', ['-l', 'en-US', ...EN, 'my fäle name.txt'], { files: { 'my fäle name.txt': 'Hi there there.\n' } });
w('input-file-path', 'CLI-0042: relative path with subdir', ['-l', 'en-US', ...EN, 'sub/dir/input.txt'], { files: { 'sub/dir/input.txt': 'Hi there there.\n' } });

// match listing (CLI-0046): more rule triggers
w('listing-brackets-quotes', 'CLI-0046: unpaired brackets with More info URL', ['-l', 'en-US', ...EN, '-'], { stdin: 'He said (hello and [there. Also {x}. Close ) wrongly.' });
w('listing-uppercase', 'CLI-0046: uppercase sentence start (prio, suggestion)', ['-l', 'en-US', ...EN, '-'], { stdin: 'first sentence. second one! third? Fourth is ok. "quoted start"' });
w('listing-whitespace', 'CLI-0046: whitespace rules', ['-l', 'en-US', ...EN, '-'], { stdin: 'Two  spaces. No space.After dot. Three   spaces   here ,and there .' });
w('listing-double-punct', 'CLI-0046: double punctuation', ['-l', 'en-US', ...EN, '-'], { stdin: 'Wait.. what,, really?? Yes.' });
w('listing-context-edges', 'CLI-0046: match at start and end of text', ['-l', 'en-US', ...EN, '-'], { stdin: 'the the' });
w('listing-multiline-context', 'CLI-0046: context across newline', ['-l', 'en-US', ...EN, '-'], { stdin: 'Some text here\nthe the next line goes on\nand on.' });
w('listing-overlap', 'CLI-0046: overlapping matches order', ['-l', 'en-US', ...EN, '-'], { stdin: 'This is is ( ok.. and ,done' });
w('listing-fr', 'CLI-0046: French listing', ['-l', 'fr', ...FR, '-'], { stdin: 'Il y a un un problème ( ici.. et  là ,voilà.' });
w('listing-json-flag', 'CLI-0048: --json has no Time line (other ID, recorded)', ['-l', 'en-US', ...EN, '--json', '-'], { stdin: MIXED });
w('listing-verbose', 'CLI-0046: -v verbose (tagger output on stderr, not ported -> portLater)', ['-l', 'en-US', ...EN, '-v', '-'], { stdin: 'Hi there there.', portLater: true });
w('listing-profile', 'CLI-0048: -p profile', ['-l', 'en-US', ...EN, '-p', '-'], { stdin: 'Hi there there.', portLater: true });
w('listing-apply', 'CLI-0046: -a apply (other ID)', ['-l', 'en-US', ...EN, '-a', '-'], { stdin: 'Hi there there.', portLater: true });
w('listing-level-picky', 'CLI-0040: --level PICKY', ['-l', 'en-US', ...EN, '--level', 'PICKY', '-'], { stdin: MIXED });
w('listing-level-bad', 'CLI-0040: --level with bad value', ['-l', 'en-US', ...EN, '--level', 'FOO', '-'], { stdin: MIXED });
w('listing-b-linebreak', 'CLI-0043: -b single line break = paragraph end', ['-l', 'en-US', ...EN, '-b', '-'], { stdin: 'first line here here\nsecond line\nthird line' });
w('listing-line-by-line', 'CLI-0043: --line-by-line', ['-l', 'en-US', ...EN, '--line-by-line', '-'], { stdin: 'first line here here\nsecond  line\nthird line', portLater: true });
w('exit-success', 'CLI-0066/0068: successful run exit 0 with matches', ['-l', 'en-US', ...EN, '-'], { stdin: 'Oops oops there there.' });
w('threads-order', 'CLI-0071: multi-threaded result order equals sequential (many sentences with matches)', ['-l', 'en-US', ...EN, '-'], { stdin: Array.from({ length: 150 }, (_, i) => `Sentence ${i} has has a repeat${i % 3 ? ' ,comma' : ''}.`).join(' ') });
w('rules-disable-full', 'CLI-0040: -d without -eo (full rule set, only ported rule effect compared) ', ['-l', 'en-US', '-d', 'ENGLISH_WORD_REPEAT_RULE,WHITESPACE_RULE', '-'], { stdin: MIXED, portLater: true });
