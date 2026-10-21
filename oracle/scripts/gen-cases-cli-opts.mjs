// Authors oracle/cases/X-CLI-OPTS/*.json and oracle/cases/X-CLI-BITEXT/*.json (inputs only). Semantics: docs/review/F64-oracle.md.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';

const BASE = { kind: 'cli', clock: 'fixed', compare: 'cli', normalize: ['buildDate', 'commit', 'stackFrames', 'paths'] };
function mk(id) {
  const dir = path.join(ROOT, 'oracle/cases', id);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  return (name, description, args, extra = {}) => writeFileSync(path.join(dir, `${name}.json`), JSON.stringify({ ...BASE, description, args, ...extra }, null, 1) + '\n');
}

const EN_RULES = 'COMMA_PARENTHESIS_WHITESPACE,DOUBLE_PUNCTUATION,UPPERCASE_SENTENCE_START,WHITESPACE_RULE,EN_UNPAIRED_BRACKETS,ENGLISH_WORD_REPEAT_RULE,SENTENCE_WHITESPACE';
const FR_RULES = 'COMMA_PARENTHESIS_WHITESPACE,DOUBLE_PUNCTUATION,UPPERCASE_SENTENCE_START,WHITESPACE_RULE,UNPAIRED_BRACKETS,SENTENCE_WHITESPACE';
const DE_RULES = 'COMMA_PARENTHESIS_WHITESPACE,DE_DOUBLE_PUNCTUATION,UPPERCASE_SENTENCE_START,WHITESPACE_RULE,UNPAIRED_BRACKETS,GERMAN_WORD_REPEAT_RULE,DE_SENTENCE_WHITESPACE';
const EN = ['-l', 'en-US', '-eo', '-e', EN_RULES];
const DE = ['-l', 'de-DE', '-eo', '-e', DE_RULES];
const FR = ['-l', 'fr', '-eo', '-e', FR_RULES];
const ENR = (ids) => ['-l', 'en-US', '-eo', '-e', `${EN_RULES},${ids}`];
const T_EN = 'This is is a test of of language tool.  Hi ,there ( ok.. this is an test.\n\nlowercase start here.';
const T_DE = 'Das ist ein ein Test ,ok.. (ohne Ende.  Über größere Ärzte sprechen wir wir später.\n\nkleiner Anfang.';
const T_FR = 'Bonjour  le monde , voici voici un test (sans fin.  Il y a un un problème..\n\nminuscule.';
const MAIN_FILE = 'This is an test.\n\nThis is a test of of language tool.\n\nThis is is a test of language tool.';
const LT = ['logTimestamp'];
const PEN = 'The report was written by him and it was decided that we should basically proceed. Really, it is very good. In order to do so, we will, at this point in time, utilize the tool. This is an extremely long sentence that keeps going and going with many many words so that it surely exceeds the usual limit of words that is acceptable for a sentence in any text, and furthermore it does not stop there either, which is bad.';
const PDE = 'Der Bericht wurde von ihm geschrieben und es wurde beschlossen, dass wir im Prinzip weitermachen. Das ist wirklich sehr gut. Er hat es gemacht gehabt und dann ist er gegangen worden. Zu diesem Zeitpunkt benutzen wir das Werkzeug, das man verwenden kann, um etwas zu tun, was nötig ist.';
const PFR = 'Le rapport a été écrit par lui et il a été décidé que nous allons continuer. C\'est vraiment très bien. Il faut que nous allions plus vite car c\'est une phrase extrêmement longue qui continue encore et encore avec beaucoup de mots pour dépasser la limite habituelle acceptable pour une phrase dans un texte, et en outre cela ne s\'arrête pas là non plus.';

// ---------------- X-CLI-OPTS ----------------
{
  const w = mk('X-CLI-OPTS');
  const f = (n, d, a, ex = {}) => w(n, d, a, ex);

  // --level (CLI-0004)
  f('level-picky-en', 'CLI-0004: --level PICKY en', [...EN, '--level', 'PICKY', '-'], { stdin: T_EN });
  f('level-picky-de', 'CLI-0004: --level PICKY de', [...DE, '--level', 'PICKY', '-'], { stdin: T_DE });
  f('level-picky-fr', 'CLI-0004: --level PICKY fr', [...FR, '--level', 'PICKY', '-'], { stdin: T_FR });
  f('level-picky-full-en', 'CLI-0004: --level PICKY full en rule set (picky rules fire)', ['-l', 'en-US', '--level', 'PICKY', '-'], { stdin: PEN });
  f('level-picky-full-fr', 'CLI-0004: --level PICKY full fr rule set', ['-l', 'fr', '--level', 'PICKY', '-'], { stdin: PFR });
  f('level-default-full-en', 'CLI-0004: baseline without level, same text (picky rules silent)', ['-l', 'en-US', '-'], { stdin: PEN });
  f('level-default-full-de', 'CLI-0004: baseline without level (de)', ['-l', 'de-DE', '-'], { stdin: PDE });
  f('level-default-full-fr', 'CLI-0004: baseline without level (fr)', ['-l', 'fr', '-'], { stdin: PFR });
  f('level-picky-full-de', 'CLI-0004: --level PICKY full de rule set', ['-l', 'de-DE', '--level', 'PICKY', '-'], { stdin: PDE });
  f('level-default', 'CLI-0004: --level DEFAULT', [...EN, '--level', 'DEFAULT', '-'], { stdin: T_EN });
  for (const lv of ['ACADEMIC', 'CLARITY', 'PROFESSIONAL', 'CREATIVE', 'CUSTOMER', 'JOBAPP', 'OBJECTIVE', 'ELEGANT']) f(`level-${lv.toLowerCase()}`, `CLI-0004: --level ${lv} (valid enum name)`, [...EN, '--level', lv, '-'], { stdin: T_EN });
  f('level-lowercase', 'CLI-0004: --level picky (case-sensitive -> unknown)', [...EN, '--level', 'picky', '-'], { stdin: T_EN });
  f('level-unknown', 'CLI-0004: --level FOO', [...EN, '--level', 'FOO', '-'], { stdin: T_EN });
  f('level-empty', 'CLI-0004: --level with empty value', [...EN, '--level', '', '-'], { stdin: T_EN });
  f('level-missing', 'CLI-0004: --level as last arg (ArrayIndexOutOfBounds)', ['--level']);
  f('level-missing-after-lang', 'CLI-0004: --level last after -l', ['-l', 'en-US', '--level']);
  f('level-takes-file', 'CLI-0004: --level swallows the next arg as value (file name)', ['-l', 'en-US', '--level', '-']);
  f('level-twice', 'CLI-0004: --level PICKY then DEFAULT (last wins)', [...EN, '--level', 'PICKY', '--level', 'DEFAULT', '-'], { stdin: T_EN });
  f('level-json', 'CLI-0004/0051: --level PICKY with --json', [...EN, '--level', 'PICKY', '--json', '-'], { stdin: T_EN });

  // -adl (CLI-0009, CLI-0044, CLI-0045)
  const AD = { normalize: [...BASE.normalize, ...LT] };
  f('adl-en-file', 'CLI-0009/0044: -adl English file', ['-adl', '-eo', '-e', EN_RULES, 'input.txt'], { ...AD, files: { 'input.txt': MAIN_FILE } });
  f('adl-de-file', 'CLI-0009/0044: -adl German file', ['-adl', '-eo', '-e', DE_RULES, 'input.txt'], { ...AD, files: { 'input.txt': 'Das ist ein kleiner deutscher Text zum Testen der Spracherkennung, mit  zwei Leerzeichen und und Wiederholung.\n' } });
  f('adl-fr-stdin', 'CLI-0009/0044: -adl French stdin', ['-adl', '-eo', '-e', FR_RULES], { ...AD, stdin: 'Ceci est un petit texte français pour tester la détection de la langue, avec  deux espaces.\n' });
  f('adl-long-flag', 'CLI-0009: --autoDetect', ['--autoDetect', '-eo', '-e', EN_RULES, 'input.txt'], { ...AD, files: { 'input.txt': MAIN_FILE } });
  f('adl-undetectable', 'CLI-0044: -adl too short/unclear text -> fallback American English', ['-adl', '-eo', '-e', EN_RULES, '-'], { ...AD, stdin: 'xx' });
  f('adl-empty', 'CLI-0044: -adl empty stdin', ['-adl', '-eo', '-e', EN_RULES, '-'], { ...AD, stdin: '' });
  f('adl-with-lang', 'CLI-0009: -adl together with -l (detection replaces language)', ['-adl', '-l', 'en-US', '-eo', '-e', 'DOUBLE_PUNCTUATION,WHITESPACE_RULE', '-'], { ...AD, stdin: 'Das ist ein kleiner deutscher Text zum Testen der Spracherkennung,  mit zwei Leerzeichen.' });
  f('adl-mixed-lang-after', 'CLI-0009: -l after -adl', ['-adl', '-l', 'de-DE', '-eo', '-e', DE_RULES, '-'], { ...AD, stdin: 'This is a small English text to test the language detection, with  two spaces.' });
  f('adl-mothertongue', 'CLI-0009/0022: -adl with -m', ['-adl', '-m', 'de', '-eo', '-e', EN_RULES, '-'], { ...AD, stdin: 'This is a small English text to test the language detection, with  two spaces.' });
  f('adl-apply', 'CLI-0009/0053: -adl -a', ['-adl', '-a', '-eo', '-e', EN_RULES, '-'], { ...AD, stdin: 'This is a small English text to test the language detection,  with two spaces.' });
  f('adl-json', 'CLI-0009/0051: -adl --json', ['-adl', '--json', '-eo', '-e', EN_RULES, '-'], { ...AD, stdin: 'This is a small English text to test the language detection,  with two spaces.' });
  f('adl-tagger', 'CLI-0009/0054: -adl -t', ['-adl', '-t', '-'], { ...AD, stdin: 'This is a small English text to test the language detection.' });
  f('adl-line-by-line', 'CLI-0009/0057: -adl --line-by-line (language from first line)', ['-adl', '--line-by-line', '-eo', '-e', EN_RULES, '-'], { ...AD, stdin: 'This is a small English text to test the language detection,  with two spaces.\nSecond line here here.\n' });
  f('adl-recursive', 'CLI-0009/0060: -adl -r', ['-adl', '-r', '-eo', '-e', EN_RULES, 'dir'], { ...AD, files: { 'dir/a.txt': 'This is a small English text to test the language detection,  with two spaces.\n' } });
  f('adl-disable', 'CLI-0009/0018: -adl with -d (rules re-selected after detection)', ['-adl', '-d', 'WHITESPACE_RULE', '-m', 'de', '-'], { ...AD, stdin: 'This is a small English text to test the language detection,  with two spaces and and repeats.' });
  f('adl-no-lang-arg-mixed', 'CLI-0009/0037: -adl suppresses no-language warning', ['-adl', '-'], { ...AD, stdin: 'Hello.' });

  // -v verbose (CLI-0010, CLI-0041, CLI-0047)
  f('verbose-en-file', 'CLI-0010/0041: -v English file, restricted rules (MainTest.testEnglishFileVerbose style)', [...EN, '-v', 'input.txt'], { files: { 'input.txt': MAIN_FILE } });
  f('verbose-en-full', 'CLI-0010/0041/0047: -v English full rule set (rule line, antipatterns)', ['-l', 'en', '-v', 'input.txt'], { files: { 'input.txt': MAIN_FILE } });
  f('verbose-de-full', 'CLI-0010/0041/0047: -v German full rule set', ['-l', 'de-DE', '-v', '-'], { stdin: 'Das ist ein ein Test. Er hat eine Auto gekauft, dass ist schön.' });
  f('verbose-fr-full', 'CLI-0010/0041/0047: -v French full rule set', ['-l', 'fr', '-v', '-'], { stdin: 'Voici voici un test. Il a acheté une voiture , c\'est beau.' });
  f('verbose-de', 'CLI-0041: -v German restricted rules', [...DE, '-v', '-'], { stdin: T_DE });
  f('verbose-fr', 'CLI-0041: -v French restricted rules', [...FR, '-v', '-'], { stdin: T_FR });
  f('verbose-long-flag', 'CLI-0010: --verbose', [...EN, '--verbose', '-'], { stdin: 'Hi there there.' });
  f('verbose-no-matches', 'CLI-0041: -v without matches', [...EN, '-v', '-'], { stdin: 'This is a fine sentence.' });
  f('verbose-umlauts-multiline', 'CLI-0041: -v umlauts, several sentences and paragraphs', [...DE, '-v', '-'], { stdin: 'Über größere Ärzte.  Zweiter Satz mit mit Fehler!\n\nDritter Absatz.' });
  f('verbose-json', 'CLI-0041/0051: -v --json', [...EN, '-v', '--json', '-'], { stdin: 'Hi there there.' });
  f('verbose-tagger', 'CLI-0041/0054: -v -t', ['-l', 'en-US', '-v', '-t', '-'], { stdin: 'This is an test.' });
  f('verbose-line-by-line', 'CLI-0041/0057: -v --line-by-line', [...EN, '-v', '--line-by-line', '-'], { stdin: 'Hi there there.\nSecond line.\n' });
  f('verbose-apply', 'CLI-0041/0053: -v -a', [...EN, '-v', '-a', '-'], { stdin: 'Hi there there.' });
  f('verbose-unknown-words', 'CLI-0041/0050: -v -u', [...EN, '-v', '-u', '-'], { stdin: 'Zwuasdac is here.' });
  f('verbose-temp-off', 'CLI-0041/0012: -v --enable-temp-off', [...EN, '-v', '--enable-temp-off', '-'], { stdin: 'Hi there there.' });
  f('verbose-picky-full-en', 'CLI-0041/0047: -v --level PICKY full en', ['-l', 'en-US', '-v', '--level', 'PICKY', '-'], { stdin: PEN });

  // --line-by-line (CLI-0011, CLI-0056..0059)
  const LBL = 'first line here here\nsecond  line\n\nthird paragraph ,here\nfourth line (open\n';
  f('lbl-stdin', 'CLI-0011/0056/0057: --line-by-line stdin', [...EN, '--line-by-line', '-'], { stdin: LBL });
  f('lbl-file', 'CLI-0011/0056: --line-by-line file', [...EN, '--line-by-line', 'input.txt'], { files: { 'input.txt': LBL } });
  f('lbl-b', 'CLI-0031/0057: --line-by-line -b (every line a chunk)', [...EN, '--line-by-line', '-b', '-'], { stdin: LBL });
  f('lbl-crlf', 'CLI-0057: --line-by-line CRLF terminators', [...EN, '--line-by-line', '-'], { stdin: 'first line here here\r\nsecond  line\r\n\r\nthird there there' });
  f('lbl-cr', 'CLI-0057: --line-by-line CR terminators', [...EN, '--line-by-line', '-'], { stdin: 'first line here here\rsecond  line\r\rthird there there' });
  f('lbl-no-trailing-newline', 'CLI-0057: --line-by-line no final newline', [...EN, '--line-by-line', '-'], { stdin: 'only there there' });
  f('lbl-empty', 'CLI-0057: --line-by-line empty stdin', [...EN, '--line-by-line', '-'], { stdin: '' });
  f('lbl-blank-lines-only', 'CLI-0057: --line-by-line blank lines only', [...EN, '--line-by-line', '-'], { stdin: '\n\n\n' });
  f('lbl-de', 'CLI-0057: --line-by-line German umlauts', [...DE, '--line-by-line', '-'], { stdin: 'Über größere Ärzte ,sprechen.\n\nZweiter Absatz mit mit Fehler.\n' });
  f('lbl-fr', 'CLI-0057: --line-by-line French', [...FR, '--line-by-line', '-'], { stdin: 'Bonjour  le monde ,voici.\n\nDeuxième paragraphe..\n' });
  f('lbl-many-lines', 'CLI-0057: --line-by-line line offsets over many paragraphs', [...EN, '--line-by-line', '-'], { stdin: Array.from({ length: 40 }, (_, i) => `Para ${i} here${i % 3 === 0 ? ' and and again' : ''}.\n`).join('\n') });
  f('lbl-apply', 'CLI-0057: --line-by-line -a', [...EN, '--line-by-line', '-a', '-'], { stdin: 'first line here here\nsecond  line\n\nthird\n' });
  f('lbl-tagger', 'CLI-0054/0057: --line-by-line -t', ['-l', 'en-US', '--line-by-line', '-t', '-'], { stdin: 'This is an test.\n\nSecond one.\n' });
  f('lbl-unknown', 'CLI-0050/0057: --line-by-line -u', [...EN, '--line-by-line', '-u', '-'], { stdin: 'Zwuasdac is here.\n\nQwertzuiop too.\n' });
  f('lbl-json', 'CLI-0032: --line-by-line then --json -> error', [...EN, '--line-by-line', '--json', '-'], { stdin: LBL });
  f('lbl-json-first', 'CLI-0032/0059: --json then --line-by-line (no parse error; output recorded)', [...EN, '--json', '--line-by-line', '-'], { stdin: LBL });
  f('lbl-profile-stdin', 'CLI-0056: --line-by-line -p with stdin -> error', [...EN, '--line-by-line', '-p', '-'], { stdin: LBL });
  f('lbl-profile-file', 'CLI-0058: --line-by-line -p file (crash on first text-level rule)', [...EN, '--line-by-line', '-p', 'input.txt'], { files: { 'input.txt': LBL } });
  f('lbl-profile-file-nontext', 'CLI-0058: --line-by-line -p with only non-text-level rules', ['-l', 'en-US', '-eo', '-e', 'DOUBLE_PUNCTUATION,WHITESPACE_RULE', '--line-by-line', '-p', 'input.txt'], { files: { 'input.txt': LBL } });
  f('lbl-missing-file', 'CLI-0056: --line-by-line missing file', [...EN, '--line-by-line', 'nope.txt']);
  f('lbl-charset', 'CLI-0029/0057: --line-by-line -c latin1', [...EN, '--line-by-line', '-c', 'latin1', 'input.txt'], { filesB64: { 'input.txt': Buffer.from('Über  größere Ärzte, die die Straße.\n', 'latin1').toString('base64') } });
  f('lbl-bom', 'CLI-0043/0057: --line-by-line file with UTF-8 BOM', [...EN, '--line-by-line', 'input.txt'], { files: { 'input.txt': '﻿Hi there there.\n' } });
  f('lbl-xmlfilter', 'CLI-0035/0057: --line-by-line --xmlfilter', [...EN, '--line-by-line', '--xmlfilter', '-'], { stdin: 'This <b>is is</b> text.\n' });
  f('lbl-verbose', 'CLI-0041/0057: --line-by-line -v', [...EN, '--line-by-line', '-v', '-'], { stdin: 'Hi there there.\n' });
  f('lbl-recursive', 'CLI-0060/0057: -r --line-by-line', [...EN, '-r', '--line-by-line', 'dir'], { files: { 'dir/a.txt': 'Hi there there.\n\nSecond  line.\n' } });
  f('lbl-adl-file', 'CLI-0057: --line-by-line -adl file', ['-adl', '--line-by-line', '-eo', '-e', DE_RULES, 'input.txt'], { ...AD, files: { 'input.txt': 'Das ist ein kleiner deutscher Text zum Testen der Spracherkennung, mit  zwei Leerzeichen.\n\nZweiter Absatz mit mit Fehler.\n' } });

  // --enable-temp-off (CLI-0012)
  f('tempoff-en-eo', 'CLI-0012: --enable-temp-off with -eo restricted set', [...EN, '--enable-temp-off', '-'], { stdin: T_EN });
  f('tempoff-en-full', 'CLI-0012: --enable-temp-off full en (Activating ... lines on stdout)', ['-l', 'en-US', '--enable-temp-off', '-'], { stdin: T_EN });
  f('tempoff-de-full', 'CLI-0012: --enable-temp-off full de', ['-l', 'de-DE', '--enable-temp-off', '-'], { stdin: T_DE });
  f('tempoff-fr-full', 'CLI-0012: --enable-temp-off full fr', ['-l', 'fr', '--enable-temp-off', '-'], { stdin: T_FR });
  f('tempoff-no-eo-with-e', 'CLI-0012: --enable-temp-off with -e (no -eo)', ['-l', 'en-US', '-e', 'ENGLISH_WORD_REPEAT_RULE', '--enable-temp-off', '-'], { stdin: T_EN });
  f('tempoff-disable', 'CLI-0012: --enable-temp-off with -d', ['-l', 'en-US', '-d', 'WHITESPACE_RULE', '--enable-temp-off', '-'], { stdin: T_EN });
  f('tempoff-json', 'CLI-0012/0051: --enable-temp-off --json', ['-l', 'en-US', '--enable-temp-off', '--json', '-'], { stdin: 'Hi there.' });
  f('tempoff-picky', 'CLI-0012: --enable-temp-off --level PICKY', ['-l', 'en-US', '--enable-temp-off', '--level', 'PICKY', '-'], { stdin: T_EN });

  // --clean-overlapping (CLI-0013)
  const OV = 'This is is ( ok.. and ,done. He have a apple. Their is a problem there there.';
  f('overlap-default-en', 'CLI-0013: default (overlapping matches kept) en full', ['-l', 'en-US', '-'], { stdin: OV });
  f('overlap-clean-en', 'CLI-0013: --clean-overlapping en full', ['-l', 'en-US', '--clean-overlapping', '-'], { stdin: OV });
  f('overlap-default-de', 'CLI-0013: default de full', ['-l', 'de-DE', '-'], { stdin: 'Das ist ein ein Test ,ok.. Ich habe ein Auto gekauft, dass ist schön. Er gehen nach Hause.' });
  f('overlap-clean-de', 'CLI-0013: --clean-overlapping de full', ['-l', 'de-DE', '--clean-overlapping', '-'], { stdin: 'Das ist ein ein Test ,ok.. Ich habe ein Auto gekauft, dass ist schön. Er gehen nach Hause.' });
  f('overlap-default-fr', 'CLI-0013: default fr full', ['-l', 'fr', '-'], { stdin: 'Voici voici un test , ok.. Il a acheté une voiture,c\'est beau. Je suis aller au marché.' });
  f('overlap-clean-fr', 'CLI-0013: --clean-overlapping fr full', ['-l', 'fr', '--clean-overlapping', '-'], { stdin: 'Voici voici un test , ok.. Il a acheté une voiture,c\'est beau. Je suis aller au marché.' });
  f('overlap-clean-eo', 'CLI-0013: --clean-overlapping with restricted rules', [...EN, '--clean-overlapping', '-'], { stdin: OV });
  f('overlap-clean-json', 'CLI-0013/0051: --clean-overlapping --json', ['-l', 'en-US', '--clean-overlapping', '--json', '-'], { stdin: OV });
  f('overlap-clean-apply', 'CLI-0013/0053: --clean-overlapping -a', ['-l', 'en-US', '--clean-overlapping', '-a', '-'], { stdin: OV });

  // -t tagger only (CLI-0014, CLI-0054)
  f('tagger-en', 'CLI-0054: -t English', ['-l', 'en-US', '-t', '-'], { stdin: 'This is an test. Second sentence here!' });
  f('tagger-en-long', 'CLI-0014: --taggeronly', ['-l', 'en-US', '--taggeronly', '-'], { stdin: 'This is an test.' });
  f('tagger-de', 'CLI-0054: -t German umlauts', ['-l', 'de-DE', '-t', '-'], { stdin: 'Über größere Ärzte sprechen. Das ist ein Test!' });
  f('tagger-fr', 'CLI-0054: -t French', ['-l', 'fr', '-t', '-'], { stdin: "Bonjour le monde. C'est un test." });
  f('tagger-en-file', 'CLI-0054: -t file with paragraphs', ['-l', 'en-US', '-t', 'input.txt'], { files: { 'input.txt': MAIN_FILE } });
  f('tagger-empty', 'CLI-0054: -t empty stdin', ['-l', 'en-US', '-t', '-'], { stdin: '' });
  f('tagger-unknown-words', 'CLI-0054: -t with unknown word', ['-l', 'en-US', '-t', '-'], { stdin: 'Zwuasdac qwertzuiop.' });
  f('tagger-no-lang', 'CLI-0054/0037: -t without -l', ['-t', '-'], { stdin: 'This is a test.' });
  f('tagger-with-rules', 'CLI-0054: -t ignores rule selection', [...EN, '-t', '-'], { stdin: 'This is is a test.' });
  f('tagger-json', 'CLI-0054/0051: -t --json', ['-l', 'en-US', '-t', '--json', '-'], { stdin: 'This is a test.' });
  f('tagger-b', 'CLI-0054/0031: -t -b single line breaks', ['-l', 'en-US', '-t', '-b', '-'], { stdin: 'First line\nsecond line\nthird line' });
  f('tagger-xmlfilter', 'CLI-0054/0035: -t --xmlfilter', ['-l', 'en-US', '-t', '--xmlfilter', '-'], { stdin: 'This <b>is</b> a test.' });
  f('tagger-after-u', 'CLI-0014: -u then -t -> error', ['-l', 'en-US', '-u', '-t', '-'], { stdin: 'x' });
  f('tagger-before-u', 'CLI-0030: -t then -u -> error', ['-l', 'en-US', '-t', '-u', '-'], { stdin: 'x' });
  f('tagger-after-a', 'CLI-0014: -a then -t -> error', ['-l', 'en-US', '-a', '-t', '-'], { stdin: 'x' });
  f('tagger-before-a', 'CLI-0033: -t then -a -> error', ['-l', 'en-US', '-t', '-a', '-'], { stdin: 'x' });
  f('tagger-before-p', 'CLI-0034: -t then -p -> error', ['-l', 'en-US', '-t', '-p', '-'], { stdin: 'x' });
  f('tagger-after-p', 'CLI-0034: -p then -t (no conflict at -t; recorded)', [...EN, '-p', '-t', '-'], { stdin: 'x' });
  f('tagger-recursive', 'CLI-0054/0060: -t -r', ['-l', 'en-US', '-t', '-r', 'dir'], { files: { 'dir/a.txt': 'This is a test.\n' } });

  // -r recursive (CLI-0015, CLI-0060)
  f('recursive-one-file', 'CLI-0060: -r dir with one file', [...EN, '-r', 'dir'], { files: { 'dir/a.txt': 'Hi there there.\n' } });
  f('recursive-long-flag', 'CLI-0015: --recursive', [...EN, '--recursive', 'dir'], { files: { 'dir/a.txt': 'Hi there there.\n' } });
  f('recursive-nested', 'CLI-0060: nested dirs, one file per directory', [...EN, '-r', 'dir'], { files: { 'dir/sub1/deep/a.txt': 'Hi there there.\n', 'dir/sub2/b.txt': 'Second  file.\n' } });
  f('recursive-two-files', 'CLI-0060: two files (listFiles order is filesystem dependent; order recorded as-is)', [...EN, '-r', 'dir'], { files: { 'dir/a.txt': 'Hi there there.\n', 'dir/b.txt': 'Second  file.\n' }, orderDependent: true });
  f('recursive-not-dir', 'CLI-0060: -r on a regular file -> error', [...EN, '-r', 'input.txt'], { files: { 'input.txt': 'Hi.\n' } });
  f('recursive-missing', 'CLI-0060: -r on missing path', [...EN, '-r', 'nodir']);
  f('recursive-stdin', 'CLI-0060: -r with stdin', [...EN, '-r', '-'], { stdin: 'Hi there there.' });
  f('recursive-bad-charset', 'CLI-0060/0029: -r -c bogus -> RuntimeException "Could not check text in file"', [...EN, '-r', '-c', 'foo-bar', 'dir'], { files: { 'dir/a.txt': 'Hi.\n' } });
  f('recursive-apply', 'CLI-0060/0053: -r -a', [...EN, '-r', '-a', 'dir'], { files: { 'dir/a.txt': 'Hi there there.\n' } });
  f('recursive-json', 'CLI-0060/0051: -r --json', [...EN, '-r', '--json', 'dir'], { files: { 'dir/a.txt': 'Hi there there.\n' } });
  f('recursive-unknown-words', 'CLI-0060/0050: -r -u', [...EN, '-r', '-u', 'dir'], { files: { 'dir/a.txt': 'Zwuasdac here.\n' } });
  f('recursive-de', 'CLI-0060: -r German', [...DE, '-r', 'dir'], { files: { 'dir/a.txt': 'Das ist ein ein Test.\n' } });
  f('recursive-fr', 'CLI-0060: -r French', [...FR, '-r', 'dir'], { files: { 'dir/a.txt': 'Bonjour  le monde.\n' } });
  f('recursive-dir-with-empty-file', 'CLI-0060: -r dir with empty file', [...EN, '-r', 'dir'], { files: { 'dir/e.txt': '' } });
  f('recursive-bom-file', 'CLI-0060/0043: -r with BOM file', [...EN, '-r', 'dir'], { files: { 'dir/a.txt': '﻿Hi there there.\n' } });

  // rule selection -eo/-d/-e/categories (CLI-0017..0020, CLI-0039, CLI-0040)
  f('sel-eo-then-d', 'CLI-0017: -eo then -d -> error', ['-l', 'en-US', '-eo', '-d', 'WHITESPACE_RULE', '-'], { stdin: T_EN });
  f('sel-d-then-eo', 'CLI-0017: -d then -eo -> error', ['-l', 'en-US', '-d', 'WHITESPACE_RULE', '-eo', '-'], { stdin: T_EN });
  f('sel-enabledonly-long', 'CLI-0017: --enabledonly --disable -> error', ['-l', 'en-US', '--enabledonly', '--disable', 'WHITESPACE_RULE', '-'], { stdin: T_EN });
  f('sel-d-empty-then-eo', 'CLI-0017/0018: -d "" then -eo (empty list size 1 -> error)', ['-l', 'en-US', '-d', '', '-eo', '-e', EN_RULES, '-'], { stdin: T_EN });
  f('sel-d-missing-value-eo', 'CLI-0017: -eo -d as last arg (conflict before missing-arg check)', ['-eo', '-d']);
  f('sel-d-basic', 'CLI-0018: -d single rule en', ['-l', 'en-US', '-d', 'ENGLISH_WORD_REPEAT_RULE', '-'], { stdin: T_EN });
  f('sel-d-de', 'CLI-0018: -d de', ['-l', 'de-DE', '-d', 'GERMAN_WORD_REPEAT_RULE,UPPERCASE_SENTENCE_START', '-'], { stdin: T_DE });
  f('sel-d-fr', 'CLI-0018: -d fr', ['-l', 'fr', '-d', 'WHITESPACE_RULE,FR_SPELLING_RULE', '-'], { stdin: T_FR });
  f('sel-d-empty', 'CLI-0018: -d "" (list [""])', ['-l', 'en-US', '-d', '', '-'], { stdin: T_EN });
  f('sel-d-inner-empty', 'CLI-0018: -d a,,b keeps empty element', ['-l', 'en-US', '-d', 'WHITESPACE_RULE,,DOUBLE_PUNCTUATION', '-'], { stdin: T_EN });
  f('sel-d-trailing-comma', 'CLI-0018: -d a, (trailing empty removed)', ['-l', 'en-US', '-d', 'WHITESPACE_RULE,', '-'], { stdin: T_EN });
  f('sel-d-only-commas', 'CLI-0018: -d ",," (split gives empty array)', ['-l', 'en-US', '-d', ',,', '-'], { stdin: T_EN });
  f('sel-d-leading-comma', 'CLI-0018: -d ,a (leading empty kept)', ['-l', 'en-US', '-d', ',WHITESPACE_RULE', '-'], { stdin: T_EN });
  f('sel-d-spaces', 'CLI-0018: -d "A, B" (spaces are part of ids)', ['-l', 'en-US', '-d', 'WHITESPACE_RULE, DOUBLE_PUNCTUATION', '-'], { stdin: T_EN });
  f('sel-d-replaced', 'CLI-0018: second -d replaces the first', ['-l', 'en-US', '-d', 'WHITESPACE_RULE', '-d', 'DOUBLE_PUNCTUATION', '-'], { stdin: T_EN });
  f('sel-d-unknown', 'CLI-0018: -d unknown id', ['-l', 'en-US', '-d', 'FOO_BAR_BLABLA', '-'], { stdin: T_EN });
  f('sel-d-all-ported', 'CLI-0039: -d all restricted rules leaves full set', ['-l', 'en-US', '-d', EN_RULES, '-'], { stdin: T_EN });
  f('sel-d-case', 'CLI-0018: -d with lower-case id (case-sensitive)', ['-l', 'en-US', '-d', 'whitespace_rule', '-'], { stdin: T_EN });
  f('sel-d-missing', 'CLI-0018: -d without value', ['-l', 'en-US', '-d']);
  f('sel-e-no-eo-en', 'CLI-0019: -e without -eo en (enables a normally-on rule; full set)', ['-l', 'en-US', '-e', 'WHITESPACE_RULE', '-'], { stdin: T_EN });
  f('sel-e-empty', 'CLI-0019: -e "" with -eo -> no rules active', ['-l', 'en-US', '-eo', '-e', '', '-'], { stdin: T_EN });
  f('sel-e-empty-no-eo', 'CLI-0019: -e "" without -eo', ['-l', 'en-US', '-e', '', '-'], { stdin: T_EN });
  f('sel-e-only-commas', 'CLI-0019: -eo -e ",," -> empty list', ['-l', 'en-US', '-eo', '-e', ',,', '-'], { stdin: T_EN });
  f('sel-e-inner-empty', 'CLI-0019: -e a,,b with -eo', ['-l', 'en-US', '-eo', '-e', 'WHITESPACE_RULE,,DOUBLE_PUNCTUATION', '-'], { stdin: T_EN });
  f('sel-e-trailing-comma', 'CLI-0019: -e a, with -eo', ['-l', 'en-US', '-eo', '-e', 'WHITESPACE_RULE,', '-'], { stdin: T_EN });
  f('sel-e-replaced', 'CLI-0019: second -e replaces the first', ['-l', 'en-US', '-eo', '-e', 'WHITESPACE_RULE', '-e', 'DOUBLE_PUNCTUATION', '-'], { stdin: T_EN });
  f('sel-e-unknown-mixed', 'CLI-0019/0039: -eo -e known,unknown', ['-l', 'en-US', '-eo', '-e', 'WHITESPACE_RULE,FOO_BAR', '-'], { stdin: T_EN });
  f('sel-e-unknown-only', 'CLI-0039: -eo -e unknown -> No rules are active', ['-l', 'en-US', '-eo', '-e', 'FOO_BAR_BLABLA', '-'], { stdin: T_EN });
  f('sel-e-unknown-de', 'CLI-0039: no rules active de', ['-l', 'de-DE', '-eo', '-e', 'FOO', '-'], { stdin: T_DE });
  f('sel-e-unknown-fr', 'CLI-0039: no rules active fr', ['-l', 'fr', '-eo', '-e', 'FOO', '-'], { stdin: T_FR });
  f('sel-e-and-d-same', 'CLI-0040: -e X -d X (no -eo)', ['-l', 'en-US', '-e', 'WHITESPACE_RULE', '-d', 'WHITESPACE_RULE', '-'], { stdin: T_EN });
  f('sel-e-multiple-eo-d-after', 'CLI-0040: -e then -d then -eo -> error', ['-l', 'en-US', '-e', 'WHITESPACE_RULE', '-d', 'DOUBLE_PUNCTUATION', '-eo', '-'], { stdin: T_EN });
  f('sel-eo-no-e', 'CLI-0039: -eo without -e -> no rules active', ['-l', 'en-US', '-eo', '-'], { stdin: T_EN });
  f('sel-eo-no-e-de', 'CLI-0039: -eo without -e de', ['-l', 'de-DE', '-eo', '-'], { stdin: T_DE });
  f('sel-eo-no-e-fr', 'CLI-0039: -eo without -e fr', ['-l', 'fr', '-eo', '-'], { stdin: T_FR });
  f('sel-eo-no-lang', 'CLI-0039/0037: -eo without -l', ['-eo', '-'], { stdin: T_EN });
  f('sel-eo-long-de', 'CLI-0017: --enabledonly --enable de', ['-l', 'de-DE', '--enabledonly', '--enable', DE_RULES, '-'], { stdin: T_DE });
  f('sel-eo-categories-only', 'CLI-0020: -eo with --enablecategories PUNCTUATION', ['-l', 'en-US', '-eo', '--enablecategories', 'PUNCTUATION', '-'], { stdin: T_EN });
  f('sel-eo-categories-multi', 'CLI-0020: -eo with several categories', ['-l', 'en-US', '-eo', '--enablecategories', 'PUNCTUATION,TYPOGRAPHY,CASING', '-'], { stdin: T_EN });
  f('sel-eo-categories-repeated', 'CLI-0020: repeated --enablecategories (replace or accumulate)', ['-l', 'en-US', '-eo', '--enablecategories', 'PUNCTUATION', '--enablecategories', 'CASING', '-'], { stdin: T_EN });
  f('sel-categories-de', 'CLI-0020: de -eo --enablecategories', ['-l', 'de-DE', '-eo', '--enablecategories', 'PUNCTUATION,CASING', '-'], { stdin: T_DE });
  f('sel-categories-fr', 'CLI-0020: fr -eo --enablecategories', ['-l', 'fr', '-eo', '--enablecategories', 'PUNCTUATION', '-'], { stdin: T_FR });
  f('sel-categories-unknown', 'CLI-0039/0020: -eo with unknown category -> No rules active (HashSet printing)', ['-l', 'en-US', '-eo', '--enablecategories', 'FOO_CAT', '-'], { stdin: T_EN });
  f('sel-categories-unknown-multi', 'CLI-0039/0020: several unknown categories (HashSet order)', ['-l', 'en-US', '-eo', '--enablecategories', 'ZETA,ALPHA,Mid,B,aa,AB,Aa', '-'], { stdin: T_EN });
  f('sel-categories-and-rules-unknown', 'CLI-0039: unknown rules and categories together', ['-l', 'en-US', '-eo', '-e', 'X1,X2', '--enablecategories', 'C1,C2', '-'], { stdin: T_EN });
  f('sel-categories-empty', 'CLI-0020: --enablecategories "" -> IllegalArgumentException', ['-l', 'en-US', '--enablecategories', '', '-'], { stdin: T_EN });
  f('sel-categories-inner-empty', 'CLI-0020: --enablecategories a,,b', ['-l', 'en-US', '--enablecategories', 'PUNCTUATION,,CASING', '-'], { stdin: T_EN });
  f('sel-categories-trailing-comma', 'CLI-0020: --enablecategories a, (trailing removed)', ['-l', 'en-US', '--enablecategories', 'PUNCTUATION,', '-'], { stdin: T_EN });
  f('sel-disablecategories-empty', 'CLI-0020: --disablecategories ""', ['-l', 'en-US', '--disablecategories', '', '-'], { stdin: T_EN });
  f('sel-disablecategories-basic', 'CLI-0020: --disablecategories full en', ['-l', 'en-US', '--disablecategories', 'PUNCTUATION,TYPOS', '-'], { stdin: T_EN });
  f('sel-disablecategories-de', 'CLI-0020: --disablecategories de', ['-l', 'de-DE', '--disablecategories', 'TYPOS,PUNCTUATION', '-'], { stdin: T_DE });
  f('sel-disablecategories-fr', 'CLI-0020: --disablecategories fr', ['-l', 'fr', '--disablecategories', 'TYPOS', '-'], { stdin: T_FR });
  f('sel-disablecategories-repeated', 'CLI-0020: repeated --disablecategories', ['-l', 'en-US', '--disablecategories', 'PUNCTUATION', '--disablecategories', 'TYPOS', '-'], { stdin: T_EN });
  f('sel-disablecategories-eo', 'CLI-0020: --disablecategories with -eo -e', [...EN, '--disablecategories', 'PUNCTUATION', '-'], { stdin: T_EN });
  f('sel-enablecat-and-disablecat', 'CLI-0020: enable and disable the same category', ['-l', 'en-US', '-eo', '--enablecategories', 'PUNCTUATION', '--disablecategories', 'PUNCTUATION', '-'], { stdin: T_EN });
  f('sel-enablecat-rule-combo', 'CLI-0040: -eo -e rule + --enablecategories', ['-l', 'en-US', '-eo', '-e', 'ENGLISH_WORD_REPEAT_RULE', '--enablecategories', 'PUNCTUATION', '-'], { stdin: T_EN });
  f('sel-cat-missing', 'CLI-0020: --enablecategories without value', ['--enablecategories']);
  f('sel-cat-lowercase', 'CLI-0020: category id is case-sensitive', ['-l', 'en-US', '-eo', '--enablecategories', 'punctuation', '-'], { stdin: T_EN });
  f('sel-d-rule-fr-full', 'CLI-0040: fr full set without selection (baseline)', ['-l', 'fr', '-'], { stdin: T_FR });
  f('sel-baseline-en-full', 'CLI-0040: en full set baseline', ['-l', 'en-US', '-'], { stdin: T_EN });
  f('sel-baseline-de-full', 'CLI-0040: de full set baseline', ['-l', 'de-DE', '-'], { stdin: T_DE });

  // -m mother tongue (CLI-0022); false-friend rules are tagged picky
  const MTEN = 'He wants to become a chef. This is a decent box. The concern is also curious.';
  const MTDE = 'Ich möchte ein Chef werden. Das ist ein Argument. Er will ein Dom sehen. Das ist aktuell.';
  const MTFR = 'Il est actuellement ici. Il va rester et crier. Elle a une crâne.';
  const MTEF = 'He is actually here. He wants to cry and rest. This is a bribe.';
  f('mt-en-de', 'CLI-0022: -l en-US -m de PICKY (built-in en/de false friends)', ['-l', 'en-US', '-m', 'de', '--level', 'PICKY', '-'], { stdin: MTEN });
  f('mt-en-de-default-level', 'CLI-0022: -m de without PICKY (false friends are picky -> silent)', ['-l', 'en-US', '-m', 'de', '-'], { stdin: MTEN });
  f('mt-de-en', 'CLI-0022: -l de-DE -m en PICKY', ['-l', 'de-DE', '-m', 'en', '--level', 'PICKY', '-'], { stdin: MTDE });
  f('mt-de-en-default-level', 'CLI-0022: -l de-DE -m en default level', ['-l', 'de-DE', '-m', 'en', '-'], { stdin: MTDE });
  f('mt-fr-en', 'CLI-0022: -l fr -m en PICKY', ['-l', 'fr', '-m', 'en', '--level', 'PICKY', '-'], { stdin: MTFR });
  f('mt-en-fr', 'CLI-0022: -l en-US -m fr PICKY', ['-l', 'en-US', '-m', 'fr', '--level', 'PICKY', '-'], { stdin: MTEF });
  f('mt-de-fr', 'CLI-0022: -l de-DE -m fr PICKY (few/no pairs)', ['-l', 'de-DE', '-m', 'fr', '--level', 'PICKY', '-'], { stdin: 'Er hat eine Bibliothek. Das ist aktuell.' });
  f('mt-fr-de', 'CLI-0022: -l fr -m de PICKY (no pairs)', ['-l', 'fr', '-m', 'de', '--level', 'PICKY', '-'], { stdin: 'Il a un cadeau. Je vais devenir fou.' });
  f('mt-de-en-json', 'CLI-0022/0051: -m en PICKY --json', ['-l', 'de-DE', '-m', 'en', '--level', 'PICKY', '--json', '-'], { stdin: MTDE });
  f('mt-de-en-apply', 'CLI-0022/0053: -m en PICKY -a', ['-l', 'de-DE', '-m', 'en', '--level', 'PICKY', '-a', '-'], { stdin: MTDE });
  f('mt-de-en-verbose', 'CLI-0022/0041: -m en PICKY -v (rule count line)', ['-l', 'de-DE', '-m', 'en', '--level', 'PICKY', '-v', '-'], { stdin: 'Ich möchte ein Chef werden.' });
  f('mt-de-en-disable', 'CLI-0022/0018: -d CHEF with false friends', ['-l', 'de-DE', '-m', 'en', '--level', 'PICKY', '-d', 'CHEF', '-'], { stdin: MTDE });
  f('mt-de-en-eo-rule', 'CLI-0022/0040: -eo -e CHEF (group id as rule id)', ['-l', 'de-DE', '-m', 'en', '--level', 'PICKY', '-eo', '-e', 'CHEF', '-'], { stdin: MTDE });
  f('mt-de-en-category', 'CLI-0022/0020: -eo --enablecategories FALSE_FRIENDS', ['-l', 'de-DE', '-m', 'en', '--level', 'PICKY', '-eo', '--enablecategories', 'FALSE_FRIENDS', '-'], { stdin: MTDE });
  f('mt-de-en-disablecategory', 'CLI-0022/0020: --disablecategories FALSE_FRIENDS', ['-l', 'de-DE', '-m', 'en', '--level', 'PICKY', '--disablecategories', 'FALSE_FRIENDS', '-'], { stdin: MTDE });
  f('mt-eo', 'CLI-0022/0040: -m with -eo restricted (false friends not enabled)', ['-l', 'en-US', '-m', 'de', '--level', 'PICKY', ...EN.slice(2), '-'], { stdin: MTEN });
  f('mt-same', 'CLI-0022: -m same as -l', ['-l', 'en-US', '-m', 'en', ...EN.slice(2), '-'], { stdin: T_EN });
  f('mt-long-flag', 'CLI-0022: --mothertongue (de text, en)', ['-l', 'de-DE', '--mothertongue', 'en', '--level', 'PICKY', '-'], { stdin: MTDE });
  f('mt-unknown', 'CLI-0022: -m zz', ['-l', 'en-US', '-m', 'zz', '-'], { stdin: 'Hi.', listCut: true });
  f('mt-empty', 'CLI-0022: -m ""', ['-l', 'en-US', '-m', '', '-'], { stdin: 'Hi.', listCut: true });
  f('mt-missing', 'CLI-0022: -m without value', ['-l', 'en-US', '-m']);
  f('mt-variant', 'CLI-0022: -m en-GB variant', ['-l', 'de-DE', '-m', 'en-GB', '--level', 'PICKY', '-'], { stdin: MTDE });
  f('mt-no-lang', 'CLI-0022/0037: -m without -l', ['-m', 'de', '--level', 'PICKY', '-'], { stdin: MTEN });

  // --rulefile (CLI-0025)
  const RF = (lang, tok1, tok2, msg, id = 'EXAMPLE_RULE') => `<?xml version="1.0" encoding="UTF-8"?>\n<rules lang="${lang}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xs="http://www.w3.org/2001/XMLSchema">\n<category id="CAT1" name="trivial category">\n<rule id="${id}" name="External rule to test">\n<pattern><token>${tok1}</token><token>${tok2}</token></pattern>\n<message>${msg}</message>\n<example correction="">${tok1} ${tok2}</example>\n</rule></category></rules>`;
  f('rulefile-en', 'CLI-0025: --rulefile en pattern rule', [...ENR('EXAMPLE_RULE'), '--rulefile', 'rules.xml', '-'], { stdin: 'This is a test of language tool and more.', files: { 'rules.xml': RF('en', 'language', 'tool', 'This is wrong!') } });
  f('rulefile-en-full', 'CLI-0025: --rulefile with full rule set', ['-l', 'en-US', '--rulefile', 'rules.xml', '-'], { stdin: 'This is a test of language tool and more.', files: { 'rules.xml': RF('en', 'language', 'tool', 'This is wrong!') } });
  f('rulefile-de', 'CLI-0025: --rulefile de', ['-l', 'de-DE', '-eo', '-e', `${DE_RULES},EXAMPLE_RULE`, '--rulefile', 'rules.xml', '-'], { stdin: 'Das ist ein Test mit Sprach Werkzeug.', files: { 'rules.xml': RF('de', 'Sprach', 'Werkzeug', 'Das ist falsch, Größe äöü!') } });
  f('rulefile-fr', 'CLI-0025: --rulefile fr', ['-l', 'fr', '-eo', '-e', `${FR_RULES},EXAMPLE_RULE`, '--rulefile', 'rules.xml', '-'], { stdin: 'Ceci est un test du outil de langue.', files: { 'rules.xml': RF('fr', 'outil', 'de', 'Ceci est faux, élève!') } });
  f('rulefile-eo-conflict-d', 'CLI-0025/0017: --rulefile with -eo and -d -> error', [...EN, '-d', 'EXAMPLE_RULE', '--rulefile', 'rules.xml', '-'], { stdin: 'language tool.', files: { 'rules.xml': RF('en', 'language', 'tool', 'This is wrong!') } });
  f('rulefile-eo-excluded', 'CLI-0025/0040: --rulefile with -eo -e other (external rule id not enabled)', ['-l', 'en-US', '-eo', '-e', 'ENGLISH_WORD_REPEAT_RULE', '--rulefile', 'rules.xml', '-'], { stdin: 'language tool tool.', files: { 'rules.xml': RF('en', 'language', 'tool', 'This is wrong!') } });
  f('rulefile-eo-included', 'CLI-0025/0040: --rulefile with -eo -e EXAMPLE_RULE', ['-l', 'en-US', '-eo', '-e', 'EXAMPLE_RULE', '--rulefile', 'rules.xml', '-'], { stdin: 'language tool tool.', files: { 'rules.xml': RF('en', 'language', 'tool', 'This is wrong!') } });
  f('rulefile-disabled', 'CLI-0025/0018: --rulefile rule disabled by -d (no -eo)', ['-l', 'en-US', '-d', 'EXAMPLE_RULE', '--rulefile', 'rules.xml', '-'], { stdin: 'language tool.', files: { 'rules.xml': RF('en', 'language', 'tool', 'This is wrong!') } });
  f('rulefile-json', 'CLI-0025/0051: --rulefile --json', [...ENR('EXAMPLE_RULE'), '--rulefile', 'rules.xml', '--json', '-'], { stdin: 'language tool.', files: { 'rules.xml': RF('en', 'language', 'tool', 'This is wrong!') } });
  f('rulefile-apply', 'CLI-0025/0053: --rulefile -a (rule with suggestion)', [...ENR('EXT_COLOR'), '--rulefile', 'rules.xml', '-a', '-'], { stdin: 'This is a color.', files: { 'rules.xml': '<?xml version="1.0" encoding="UTF-8"?>\n<rules lang="en">\n<category id="CAT1" name="c">\n<rule id="EXT_COLOR" name="n">\n<pattern><token>color</token></pattern>\n<message>Use <suggestion>colour</suggestion>.</message>\n<example correction="colour">This is a <marker>color</marker>.</example>\n</rule></category></rules>' } });
  f('rulefile-suggestion-listing', 'CLI-0025/0046: external rule with suggestion listing', [...ENR('EXT_COLOR'), '--rulefile', 'rules.xml', '-'], { stdin: 'This is a color.', files: { 'rules.xml': '<?xml version="1.0" encoding="UTF-8"?>\n<rules lang="en">\n<category id="CAT1" name="c">\n<rule id="EXT_COLOR" name="n">\n<pattern><token>color</token></pattern>\n<message>Use <suggestion>colour</suggestion>.</message>\n<url>https://example.org/colour</url>\n<short>Spelling</short>\n<example correction="colour">This is a <marker>color</marker>.</example>\n</rule></category></rules>' } });
  f('rulefile-subid', 'CLI-0025/0046: external rulegroup with sub ids', [...ENR('EXT_GROUP'), '--rulefile', 'rules.xml', '-'], { stdin: 'foo bar and baz.', files: { 'rules.xml': '<?xml version="1.0" encoding="UTF-8"?>\n<rules lang="en">\n<category id="CAT1" name="c">\n<rulegroup id="EXT_GROUP" name="g">\n<rule><pattern><token>foo</token></pattern><message>foo msg</message><example correction="">This is <marker>foo</marker>.</example></rule>\n<rule><pattern><token>baz</token></pattern><message>baz msg</message><example correction="">This is <marker>baz</marker>.</example></rule>\n</rulegroup></category></rules>' } });
  f('rulefile-missing', 'CLI-0025: --rulefile missing file -> FileNotFoundException', [...EN, '--rulefile', 'nope.xml', '-'], { stdin: 'Hi.' });
  f('rulefile-invalid-xml', 'CLI-0025: --rulefile with malformed XML', [...EN, '--rulefile', 'bad.xml', '-'], { stdin: 'Hi.', files: { 'bad.xml': '<rules lang="en"><category></rules>' } });
  f('rulefile-empty', 'CLI-0025: --rulefile empty file', [...EN, '--rulefile', 'empty.xml', '-'], { stdin: 'Hi.', files: { 'empty.xml': '' } });
  f('rulefile-wrong-lang', 'CLI-0025: --rulefile with lang="de" rules while checking en', [...ENR('EXAMPLE_RULE'), '--rulefile', 'rules.xml', '-'], { stdin: 'language tool.', files: { 'rules.xml': RF('de', 'language', 'tool', 'wrong') } });
  f('rulefile-missing-arg', 'CLI-0025: --rulefile without value', ['--rulefile']);
  f('rulefile-dir', 'CLI-0025: --rulefile pointing to a directory', [...EN, '--rulefile', 'd', '-'], { stdin: 'Hi.', files: { 'd/x.txt': 'x' } });
  f('rulefile-umlaut-pattern', 'CLI-0025/0043: --rulefile with umlaut token and message', ['-l', 'de-DE', '-eo', '-e', 'EXT_UML', '--rulefile', 'rules.xml', '-'], { stdin: 'Er trägt eine Größe über Äpfel.', files: { 'rules.xml': RF('de', 'Größe', 'über', 'Äpfel ß', 'EXT_UML') } });
  f('rulefile-line-by-line', 'CLI-0025/0057: --rulefile --line-by-line', [...ENR('EXAMPLE_RULE'), '--rulefile', 'rules.xml', '--line-by-line', '-'], { stdin: 'language tool.\n', files: { 'rules.xml': RF('en', 'language', 'tool', 'This is wrong!') } });
  f('rulefile-verbose', 'CLI-0025/0041: --rulefile -v (line number of pattern rule)', [...ENR('EXAMPLE_RULE'), '--rulefile', 'rules.xml', '-v', '-'], { stdin: 'language tool.', files: { 'rules.xml': RF('en', 'language', 'tool', 'This is wrong!') } });
  f('rulefile-twice', 'CLI-0025: --rulefile given twice (last wins)', [...ENR('SECOND_RULE'), '--rulefile', 'rules.xml', '--rulefile', 'rules2.xml', '-'], { stdin: 'language tool and foo bar.', files: { 'rules.xml': RF('en', 'language', 'tool', 'first'), 'rules2.xml': RF('en', 'foo', 'bar', 'second', 'SECOND_RULE') } });

  // --falsefriends (CLI-0027)
  // pair file: rule1 pattern a/wa -> translation b/wb; rule2 pattern b/ra -> translation a/rb (suggestion for a-text is rb, for b-text wb)
  const FFX = (a, b, wa, wb, ra, rb, grp = 'EXT_FF') => `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE rules SYSTEM "false-friends.dtd">\n<rules>\n<rulegroup id="${grp}">\n<rule>\n<pattern lang="${a}">\n<token>${wa}</token>\n</pattern>\n<translation lang="${b}">${wb}</translation>\n</rule>\n<rule>\n<pattern lang="${b}">\n<token>${ra}</token>\n</pattern>\n<translation lang="${a}">${rb}</translation>\n</rule>\n</rulegroup>\n</rules>\n`;
  const FFEN = FFX('en', 'de', 'gift', 'Geschenk', 'Gift', 'poison');
  const PK = ['--level', 'PICKY'];
  f('ff-en-de', 'CLI-0027: --falsefriends external file en/de with -m de (restricted rules)', [...EN, '-m', 'de', '--falsefriends', 'ff.xml', ...PK, '-'], { stdin: 'Thank you for the gift today.', files: { 'ff.xml': FFEN } });
  f('ff-en-de-full', 'CLI-0027: external en/de full rule set', ['-l', 'en-US', '-m', 'de', '--falsefriends', 'ff.xml', ...PK, '-'], { stdin: 'Thank you for the gift today.', files: { 'ff.xml': FFEN } });
  f('ff-en-de-default-level', 'CLI-0027/0004: external rule is picky: silent without --level PICKY', [...EN, '-m', 'de', '--falsefriends', 'ff.xml', '-'], { stdin: 'Thank you for the gift today.', files: { 'ff.xml': FFEN } });
  f('ff-de-en', 'CLI-0027: de text, -m en', [...DE, '-m', 'en', '--falsefriends', 'ff.xml', ...PK, '-'], { stdin: 'Das ist ein Gift im Glas.', files: { 'ff.xml': FFEN } });
  f('ff-fr-en', 'CLI-0027: fr text, -m en', [...FR, '-m', 'en', '--falsefriends', 'ff.xml', ...PK, '-'], { stdin: 'Il est actuellement ici.', files: { 'ff.xml': FFX('en', 'fr', 'actually', 'en fait', 'actuellement', 'currently') } });
  f('ff-en-fr', 'CLI-0027: en text, -m fr', [...EN, '-m', 'fr', '--falsefriends', 'ff.xml', ...PK, '-'], { stdin: 'He is actually here.', files: { 'ff.xml': FFX('en', 'fr', 'actually', 'en fait', 'actuellement', 'currently') } });
  f('ff-no-mothertongue', 'CLI-0027: --falsefriends without -m (no rules loaded)', [...EN, '--falsefriends', 'ff.xml', ...PK, '-'], { stdin: 'Thank you for the gift today.', files: { 'ff.xml': FFEN } });
  f('ff-mothertongue-not-in-file', 'CLI-0027: --falsefriends file for other language pair', [...EN, '-m', 'fr', '--falsefriends', 'ff.xml', ...PK, '-'], { stdin: 'Thank you for the gift today.', files: { 'ff.xml': FFEN } });
  f('ff-same-suggestion-filtered', 'CLI-0027: suggestion equal to pattern is dropped -> rule filtered out', [...EN, '-m', 'de', '--falsefriends', 'ff.xml', ...PK, '-'], { stdin: 'Thank you for the gift today.', files: { 'ff.xml': FFX('en', 'de', 'gift', 'Geschenk', 'Geschenk', 'gift') } });
  f('ff-missing', 'CLI-0027: --falsefriends missing file', [...EN, '-m', 'de', '--falsefriends', 'nope.xml', '-'], { stdin: 'Hi.' });
  f('ff-missing-no-mothertongue', 'CLI-0027: --falsefriends missing file without -m (not opened)', [...EN, '--falsefriends', 'nope.xml', '-'], { stdin: 'Hi.' });
  f('ff-invalid', 'CLI-0027: --falsefriends malformed XML', [...EN, '-m', 'de', '--falsefriends', 'bad.xml', '-'], { stdin: 'Hi.', files: { 'bad.xml': '<rules><rulegroup></rules>' } });
  f('ff-missing-arg', 'CLI-0027: --falsefriends without value', ['--falsefriends']);
  f('ff-eo', 'CLI-0027/0040: external ff rule added after selection (-eo -e other)', ['-l', 'en-US', '-m', 'de', '-eo', '-e', 'ENGLISH_WORD_REPEAT_RULE', '--falsefriends', 'ff.xml', ...PK, '-'], { stdin: 'gift gift.', files: { 'ff.xml': FFEN } });
  f('ff-eo-only-ff', 'CLI-0027/0040: -eo -e EXT_FF (id unknown at selection time -> No rules are active?)', ['-l', 'en-US', '-m', 'de', '-eo', '-e', 'EXT_FF', '--falsefriends', 'ff.xml', ...PK, '-'], { stdin: 'gift.', files: { 'ff.xml': FFEN } });
  f('ff-disabled', 'CLI-0027/0018: external ff rule with -d EXT_FF', ['-l', 'en-US', '-m', 'de', '-d', 'EXT_FF', '--falsefriends', 'ff.xml', ...PK, '-'], { stdin: 'gift.', files: { 'ff.xml': FFEN } });
  f('ff-umlauts', 'CLI-0027/0043: external ff file with umlauts', [...DE, '-m', 'en', '--falsefriends', 'ff.xml', ...PK, '-'], { stdin: 'Das ist eine Beere im Wald.', files: { 'ff.xml': FFX('en', 'de', 'bear', 'Bär', 'Beere', 'Größe') } });
  f('ff-json', 'CLI-0027/0051: --falsefriends --json', [...EN, '-m', 'de', '--falsefriends', 'ff.xml', ...PK, '--json', '-'], { stdin: 'Thank you for the gift today.', files: { 'ff.xml': FFEN } });
  f('ff-apply', 'CLI-0027/0053: --falsefriends -a', [...EN, '-m', 'de', '--falsefriends', 'ff.xml', ...PK, '-a', '-'], { stdin: 'Thank you for the gift today.', files: { 'ff.xml': FFEN } });
  f('ff-twice', 'CLI-0027: --falsefriends twice (last wins)', [...EN, '-m', 'de', '--falsefriends', 'ff.xml', '--falsefriends', 'ff2.xml', ...PK, '-'], { stdin: 'A gift and a box.', files: { 'ff.xml': FFEN, 'ff2.xml': FFX('en', 'de', 'box', 'Kasten', 'Box', 'Schachtel', 'EXT_BOX') } });
  f('ff-with-rulefile', 'CLI-0025/0027: --rulefile and --falsefriends together', [...EN, '-m', 'de', '--falsefriends', 'ff.xml', '--rulefile', 'rules.xml', ...PK, '-'], { stdin: 'A gift for language tool.', files: { 'ff.xml': FFEN, 'rules.xml': RF('en', 'language', 'tool', 'This is wrong!') } });
  f('ff-dir', 'CLI-0027: --falsefriends pointing to a directory', [...EN, '-m', 'de', '--falsefriends', 'd', '-'], { stdin: 'Hi.', files: { 'd/x.txt': 'x' } });
  f('ff-builtin-name', 'CLI-0027: --falsefriends with the built-in resource path (loaded from classpath)', [...EN, '-m', 'de', '--falsefriends', '/org/languagetool/rules/false-friends.xml', ...PK, '-'], { stdin: 'He wants to become a chef.' });

  // -c encoding (CLI-0029)
  const L1 = (s) => Buffer.from(s, 'latin1').toString('base64');
  f('enc-utf8-explicit', 'CLI-0029: -c utf-8 file with umlauts', [...DE, '-c', 'utf-8', 'input.txt'], { files: { 'input.txt': 'Über größere Ärzte  sprechen wir wir später.\n' } });
  f('enc-utf8-upper', 'CLI-0029: -c UTF-8 (upper case name)', [...DE, '-c', 'UTF-8', 'input.txt'], { files: { 'input.txt': 'Über größere Ärzte  sprechen wir wir später.\n' } });
  f('enc-latin1-de', 'CLI-0029: -c latin1 German', [...DE, '-c', 'latin1', 'input.txt'], { filesB64: { 'input.txt': L1('Über größere Ärzte  sprechen wir wir später.\n') } });
  f('enc-iso-8859-1', 'CLI-0029: -c ISO-8859-1', [...DE, '-c', 'ISO-8859-1', 'input.txt'], { filesB64: { 'input.txt': L1('Über größere Ärzte  sprechen.\n') } });
  f('enc-iso-8859-15', 'CLI-0029: -c ISO-8859-15 (euro sign)', [...EN, '-c', 'ISO-8859-15', 'input.txt'], { filesB64: { 'input.txt': Buffer.concat([Buffer.from('Price  is 5 '), Buffer.from([0xa4]), Buffer.from(' there there.\n')]).toString('base64') } });
  f('enc-windows-1252', 'CLI-0029: -c windows-1252 (smart quotes)', [...EN, '-c', 'windows-1252', 'input.txt'], { filesB64: { 'input.txt': Buffer.concat([Buffer.from([0x93]), Buffer.from('quoted'), Buffer.from([0x94]), Buffer.from('  text text.\n')]).toString('base64') } });
  f('enc-latin1-fr', 'CLI-0029: -c latin1 French accents', [...FR, '-c', 'latin1', 'input.txt'], { filesB64: { 'input.txt': L1('Élève  français à Noël, déjà vu vu.\n') } });
  f('enc-ascii-nonascii', 'CLI-0029: -c US-ASCII with non-ASCII bytes (replacement chars)', [...EN, '-c', 'US-ASCII', 'input.txt'], { filesB64: { 'input.txt': L1('Café  there there.\n') } });
  f('enc-utf16le-nobom', 'CLI-0029: -c UTF-16LE without BOM', [...EN, '-c', 'UTF-16LE', 'input.txt'], { filesB64: { 'input.txt': Buffer.from('Hi  there there.\n', 'utf16le').toString('base64') } });
  f('enc-utf16-nobom', 'CLI-0029: -c UTF-16 without BOM (big endian default)', [...EN, '-c', 'UTF-16', 'input.txt'], { filesB64: { 'input.txt': Buffer.from('Hi  there there.\n', 'utf16le').swap16().toString('base64') } });
  f('enc-bad-charset', 'CLI-0029: -c unknown charset name', [...EN, '-c', 'foo-bar', 'input.txt'], { files: { 'input.txt': 'Hi.\n' } });
  f('enc-illegal-name', 'CLI-0029: -c with illegal charset name characters', [...EN, '-c', 'a b', 'input.txt'], { files: { 'input.txt': 'Hi.\n' } });
  f('enc-empty-name', 'CLI-0029: -c ""', [...EN, '-c', '', 'input.txt'], { files: { 'input.txt': 'Hi.\n' } });
  f('enc-stdin-latin1', 'CLI-0029: -c latin1 on stdin text (UTF-8 bytes decoded as latin1)', [...EN, '-c', 'latin1', '-'], { stdin: 'Über  there there.\n' });
  f('enc-stdin-utf16', 'CLI-0029: -c UTF-16LE on stdin (UTF-8 bytes decoded as UTF-16LE)', [...EN, '-c', 'UTF-16LE', '-'], { stdin: 'Hi there there.\n' });
  f('enc-missing-file-bad-charset', 'CLI-0029/0042: bad charset and missing file', [...EN, '-c', 'foo-bar', 'nope.txt']);
  f('enc-bom-overrides-nothing', 'CLI-0029/0043: -c latin1 with UTF-8 BOM file (BOM not used)', [...EN, '-c', 'latin1', 'input.txt'], { files: { 'input.txt': '﻿Hi there there.\n' } });
  f('enc-json-umlauts', 'CLI-0029/0051: -c latin1 --json', [...DE, '-c', 'latin1', '--json', 'input.txt'], { filesB64: { 'input.txt': L1('Über größere Ärzte  sprechen wir wir später.\n') } });
  f('enc-long-flag', 'CLI-0029: --encoding', [...EN, '--encoding', 'latin1', 'input.txt'], { filesB64: { 'input.txt': L1('Über  there there.\n') } });
  f('enc-apply-latin1', 'CLI-0029/0053: -c latin1 -a (output UTF-8)', [...DE, '-c', 'latin1', '-a', 'input.txt'], { filesB64: { 'input.txt': L1('Über größere Ärzte  sprechen.\n') } });

  // -u list unknown (CLI-0030, CLI-0050, CLI-0052)
  f('unk-en', 'CLI-0050: -u English', ['-l', 'en-US', '-u', '-'], { stdin: 'This is a Zwuasdac test with qwertzuiop and Foobarbaz.' });
  f('unk-en-eo', 'CLI-0050: -u with restricted rules', [...EN, '-u', '-'], { stdin: 'This is a Zwuasdac test with qwertzuiop and Foobarbaz.' });
  f('unk-en-long', 'CLI-0030: --list-unknown', [...EN, '--list-unknown', '-'], { stdin: 'Zwuasdac here.' });
  f('unk-de', 'CLI-0050: -u German umlauts', ['-l', 'de-DE', '-u', '-'], { stdin: 'Das ist ein Zwuasdäc mit Größenwahnsinnigkeit und qwertzüiop.' });
  f('unk-de-eo', 'CLI-0050: -u German restricted', [...DE, '-u', '-'], { stdin: 'Das ist ein Zwuasdäc mit Größenwahnsinnigkeit.' });
  f('unk-fr', 'CLI-0050: -u French', ['-l', 'fr', '-u', '-'], { stdin: 'Ceci est un zwuasdac avec qwertzuiop et déjà.' });
  f('unk-fr-eo', 'CLI-0050: -u French restricted', [...FR, '-u', '-'], { stdin: 'Ceci est un zwuasdac avec qwertzuiop.' });
  f('unk-none', 'CLI-0050: -u with no unknown words', ['-l', 'en-US', '-u', '-'], { stdin: 'This is a test.' });
  f('unk-empty', 'CLI-0050: -u empty input', ['-l', 'en-US', '-u', '-'], { stdin: '' });
  f('unk-sorted-dups', 'CLI-0050: -u sorting and duplicates (sorted, set semantics)', ['-l', 'en-US', '-u', '-'], { stdin: 'Zzzq aaaq Zzzq Bbbq bbbq Äääq 123abc xyzzy.' });
  f('unk-file', 'CLI-0050: -u file', ['-l', 'en-US', '-u', 'input.txt'], { files: { 'input.txt': MAIN_FILE } });
  f('unk-no-lang', 'CLI-0050/0037: -u without -l', ['-u', '-'], { stdin: 'Zwuasdac here.' });
  f('unk-apply', 'CLI-0050/0053: -u -a (unknown words printed after the corrected text)', [...EN, '-u', '-a', '-'], { stdin: 'Zwuasdac there there.' });
  f('unk-json', 'CLI-0052: -u then --json -> error', [...EN, '-u', '--json', '-'], { stdin: 'Zwuasdac.' });
  f('unk-json-first', 'CLI-0052: --json then -u (no parse error; no unknown line in JSON mode)', [...EN, '--json', '-u', '-'], { stdin: 'Zwuasdac.' });
  f('unk-b', 'CLI-0050/0031: -u -b', [...EN, '-u', '-b', '-'], { stdin: 'Zwuasdac\nqwertzuiop\n' });
  f('unk-xmlfilter', 'CLI-0050/0035: -u --xmlfilter', ['-l', 'en-US', '-u', '--xmlfilter', '-'], { stdin: '<p>Zwuasdac</p> here.' });
  f('unk-profile', 'CLI-0050/0055: -u -p', [...EN, '-u', '-p', 'input.txt'], { files: { 'input.txt': 'Zwuasdac here.\n' }, profileTimes: true });
  f('unk-after-lang-order', 'CLI-0050: -u before -l', ['-u', '-l', 'en-US', '-'], { stdin: 'Zwuasdac here.' });

  // -b (CLI-0031)
  const BTXT = 'first line here here\nsecond  line\nthird line, ok.. a a\n\nfourth after blank';
  f('b-en', 'CLI-0031: -b English', [...EN, '-b', '-'], { stdin: BTXT });
  f('b-en-off', 'CLI-0031: baseline without -b', [...EN, '-'], { stdin: BTXT });
  f('b-de', 'CLI-0031: -b German', [...DE, '-b', '-'], { stdin: 'erste Zeile\nzweite Zeile mit mit Fehler\ndritte Zeile.' });
  f('b-de-off', 'CLI-0031: German baseline without -b', [...DE, '-'], { stdin: 'erste Zeile\nzweite Zeile mit mit Fehler\ndritte Zeile.' });
  f('b-fr', 'CLI-0031: -b French', [...FR, '-b', '-'], { stdin: 'première ligne\nseconde ligne  ici\ntroisième.' });
  f('b-fr-off', 'CLI-0031: French baseline without -b', [...FR, '-'], { stdin: 'première ligne\nseconde ligne  ici\ntroisième.' });
  f('b-file', 'CLI-0031: -b file', [...EN, '-b', 'input.txt'], { files: { 'input.txt': BTXT } });
  f('b-before-lang', 'CLI-0031: -b before -l (order irrelevant; tokenizer flag set on selected language)', ['-b', ...EN, '-'], { stdin: BTXT });
  f('b-twice', 'CLI-0031: -b twice', [...EN, '-b', '-b', '-'], { stdin: BTXT });
  f('b-crlf', 'CLI-0031: -b with CRLF', [...EN, '-b', '-'], { stdin: 'first line here here\r\nsecond  line\r\nthird' });
  f('b-json', 'CLI-0031/0051: -b --json', [...EN, '-b', '--json', '-'], { stdin: BTXT });
  f('b-apply', 'CLI-0031/0053: -b -a', [...EN, '-b', '-a', '-'], { stdin: BTXT });
  f('b-full-en', 'CLI-0031: -b with full rule set en', ['-l', 'en-US', '-b', '-'], { stdin: 'this is a test\nsecond line without capital\nthird.' });
  f('b-full-en-off', 'CLI-0031: baseline without -b full rule set en', ['-l', 'en-US', '-'], { stdin: 'this is a test\nsecond line without capital\nthird.' });
  f('b-no-lang', 'CLI-0031/0037: -b without -l', ['-b', '-'], { stdin: BTXT });
  f('b-tokenizer-shared', 'CLI-0031: -b with en-GB variant', ['-l', 'en-GB', '-eo', '-e', EN_RULES, '-b', '-'], { stdin: BTXT });

  // --json (CLI-0032, CLI-0051)
  f('json-en', 'CLI-0051: --json English', [...EN, '--json', '-'], { stdin: T_EN });
  f('json-de', 'CLI-0051: --json German umlauts', [...DE, '--json', '-'], { stdin: T_DE });
  f('json-fr', 'CLI-0051: --json French', [...FR, '--json', '-'], { stdin: T_FR });
  f('json-no-matches', 'CLI-0051: --json without matches', [...EN, '--json', '-'], { stdin: 'This is fine.' });
  f('json-empty', 'CLI-0051: --json empty input', [...EN, '--json', '-'], { stdin: '' });
  f('json-full-en', 'CLI-0051: --json full en rule set', ['-l', 'en-US', '--json', '-'], { stdin: MAIN_FILE });
  f('json-full-de', 'CLI-0051: --json full de rule set', ['-l', 'de-DE', '--json', '-'], { stdin: 'Das ist ein Test mit ein ein Fehler. Ich habe ein Auto gekauft, dass ist schön.' });
  f('json-full-fr', 'CLI-0051: --json full fr rule set', ['-l', 'fr', '--json', '-'], { stdin: 'Voici voici un test. Il a acheté une voiture , c\'est beau.' });
  f('json-file', 'CLI-0051: --json file', [...EN, '--json', 'input.txt'], { files: { 'input.txt': MAIN_FILE } });
  f('json-multiline', 'CLI-0051: --json multi-paragraph context', [...EN, '--json', '-'], { stdin: 'Some text here\nthe the next line goes on\n\nand on and on.' });
  f('json-quotes-escapes', 'CLI-0051: --json escaping of quotes, backslash, tab, control chars', [...EN, '--json', '-'], { stdin: 'He said "there there" \\ back\tslash  and  \u0001 ctrl.' });
  f('json-astral', 'CLI-0051: --json astral characters (offsets in UTF-16 units)', [...EN, '--json', '-'], { stdin: 'Emoji \u{1F600}\u{1F600} then then and 𝒳 more  text.' });
  f('json-long-line', 'CLI-0051: --json long text (context window 45)', [...EN, '--json', '-'], { stdin: `${'word '.repeat(300)}end end,  ok.. (x` });
  f('json-suggestions', 'CLI-0051: --json replacements (uppercase start)', [...EN, '--json', '-'], { stdin: 'first sentence. second one!' });
  f('json-json-twice', 'CLI-0051: --json twice', [...EN, '--json', '--json', '-'], { stdin: 'Hi there there.' });
  f('json-apply-after', 'CLI-0032: --json then -a -> error', [...EN, '--json', '-a', '-'], { stdin: 'x' });
  f('json-apply-before', 'CLI-0032: -a then --json -> error', [...EN, '-a', '--json', '-'], { stdin: 'x' });
  f('json-bitext-before', 'CLI-0032: -b2 then --json -> error', [...EN, '-m', 'de', '-b2', '--json', 'input.txt'], { files: { 'input.txt': 'a\tb\n' } });
  f('json-profile-after', 'CLI-0034: --json then -p -> error', [...EN, '--json', '-p', '-'], { stdin: 'x' });
  f('json-profile-before', 'CLI-0032: -p then --json (no check at --json for -p; recorded)', [...EN, '-p', '--json', 'input.txt'], { files: { 'input.txt': 'Hi there there.\n' }, profileTimes: true });
  f('json-unknown-before', 'CLI-0032: -u then --json -> error', [...EN, '-u', '--json', '-'], { stdin: 'x' });
  f('json-xmlfilter', 'CLI-0051/0035: --json --xmlfilter (positions refer to filtered text)', [...EN, '--json', '--xmlfilter', '-'], { stdin: '<p>This is is</p> text.' });
  f('json-no-lang', 'CLI-0051/0037: --json without -l', ['--json', '-'], { stdin: 'Hi there there.' });
  f('json-level', 'CLI-0051: --json --level PICKY full en', ['-l', 'en-US', '--json', '--level', 'PICKY', '-'], { stdin: PEN });
  f('json-mothertongue', 'CLI-0051: --json -m de', ['-l', 'en-US', '-m', 'de', '--json', '-'], { stdin: 'I will become a steak.' });
  f('json-categories', 'CLI-0051: --json shows category/rule ids', ['-l', 'en-US', '-eo', '--enablecategories', 'PUNCTUATION', '--json', '-'], { stdin: T_EN });
  f('json-b-linebreak', 'CLI-0051/0031: --json with CRLF', [...EN, '--json', '-'], { stdin: 'first there there\r\nsecond  line\r\n' });
  f('json-stdin-adl-undetectable', 'CLI-0051/0044: --json with -adl and tiny text', ['--json', '-adl', '-eo', '-e', EN_RULES, '-'], { ...AD, stdin: 'a' });

  // -a apply (CLI-0033, CLI-0053)
  f('apply-en', 'CLI-0053: -a English', [...EN, '-a', '-'], { stdin: 'first sentence there there.  second one!' });
  f('apply-en-long', 'CLI-0053: --apply', [...EN, '--apply', '-'], { stdin: 'first sentence there there.' });
  f('apply-en-full', 'CLI-0053: -a full en rule set', ['-l', 'en-US', '-a', 'input.txt'], { files: { 'input.txt': MAIN_FILE } });
  f('apply-de', 'CLI-0053: -a German', [...DE, '-a', '-'], { stdin: 'erster Satz  mit mit Fehler. zweiter Satz.' });
  f('apply-de-full', 'CLI-0053: -a full de', ['-l', 'de-DE', '-a', '-'], { stdin: 'Das ist ein Test mit ein ein Fehler. Ich habe eine Auto.' });
  f('apply-fr', 'CLI-0053: -a French', [...FR, '-a', '-'], { stdin: 'premier test  ici. deuxième test.' });
  f('apply-fr-full', 'CLI-0053: -a full fr', ['-l', 'fr', '-a', '-'], { stdin: 'Il a acheté une voiture , c\'est beau. voici voici.' });
  f('apply-no-matches', 'CLI-0053: -a with nothing to fix', [...EN, '-a', '-'], { stdin: 'This is fine.' });
  f('apply-empty', 'CLI-0053: -a empty input', [...EN, '-a', '-'], { stdin: '' });
  f('apply-no-trailing-newline', 'CLI-0053: -a output has no added newline', [...EN, '-a', '-'], { stdin: 'there there' });
  f('apply-multi-paragraph', 'CLI-0053: -a paragraphs and CRLF', [...EN, '-a', '-'], { stdin: 'first line  here\r\n\r\nsecond there there\r\n' });
  f('apply-overlap', 'CLI-0053: -a overlapping matches (skip changed)', ['-l', 'en-US', '-a', '-'], { stdin: 'This is is ( ok.. and ,done. He have a apple.' });
  f('apply-umlauts', 'CLI-0053: -a umlauts preserved', [...DE, '-a', '-'], { stdin: 'Über größere  Ärzte.' });
  f('apply-astral', 'CLI-0053: -a astral characters', [...EN, '-a', '-'], { stdin: 'Emoji \u{1F600} there there  ok.' });
  f('apply-no-expected-language', 'CLI-0053/0038: -a prints no "Expected text language"', ['-l', 'en-US', '-a', '-'], { stdin: 'Hi.' });
  f('apply-file', 'CLI-0053: -a file', [...EN, '-a', 'input.txt'], { files: { 'input.txt': 'there there and  more.\n' } });
  f('apply-after-tagger', 'CLI-0033: -t then -a -> error (see tagger-before-a)', ['-t', '-a', '-'], { stdin: 'x' });
  f('apply-profile-after', 'CLI-0034: -a then -p -> error', [...EN, '-a', '-p', '-'], { stdin: 'x' });
  f('apply-profile-before', 'CLI-0033: -p then -a (no conflict check at -a; recorded)', [...EN, '-p', '-a', 'input.txt'], { files: { 'input.txt': 'there there.\n' } });
  f('apply-xmlfilter', 'CLI-0053/0035: -a --xmlfilter', [...EN, '-a', '--xmlfilter', '-'], { stdin: '<p>there there</p> ok.' });
  f('apply-b', 'CLI-0053/0031: -a -b', [...EN, '-a', '-b', '-'], { stdin: 'there there\nsecond  line' });
  f('apply-level', 'CLI-0053/0004: -a --level PICKY full en', ['-l', 'en-US', '-a', '--level', 'PICKY', '-'], { stdin: 'This is an test.' });

  // -p profile (CLI-0034, CLI-0055)
  f('profile-en-file', 'CLI-0055: -p restricted en file', [...EN, '-p', 'input.txt'], { files: { 'input.txt': 'Hi there there.\n\nSecond  paragraph.\n' }, profileTimes: true });
  f('profile-en-nontext', 'CLI-0055: -p with non-text-level rules only', ['-l', 'en-US', '-eo', '-e', 'DOUBLE_PUNCTUATION,WHITESPACE_RULE,ENGLISH_WORD_REPEAT_RULE', '-p', 'input.txt'], { files: { 'input.txt': 'Hi there there.\n\nSecond  paragraph.\n' }, profileTimes: true });
  f('profile-en-stdin', 'CLI-0055: -p stdin', [...EN, '-p', '-'], { stdin: 'Hi there there.', profileTimes: true });
  f('profile-de', 'CLI-0055: -p German restricted', [...DE, '-p', 'input.txt'], { files: { 'input.txt': 'Das ist ein ein Test.\n' }, profileTimes: true });
  f('profile-fr', 'CLI-0055: -p French restricted', [...FR, '-p', 'input.txt'], { files: { 'input.txt': 'Bonjour  le monde.\n' }, profileTimes: true });
  f('profile-en-full', 'CLI-0055: -p full en rule set', ['-l', 'en-US', '-p', 'input.txt'], { files: { 'input.txt': MAIN_FILE }, profileTimes: true });
  f('profile-long-flag', 'CLI-0055: --profile', [...EN, '--profile', 'input.txt'], { files: { 'input.txt': 'Hi there there.\n' }, profileTimes: true });
  f('profile-empty', 'CLI-0055: -p empty file', [...EN, '-p', 'input.txt'], { files: { 'input.txt': '' }, profileTimes: true });
  f('profile-json-before', 'CLI-0034: --json then -p -> error', [...EN, '--json', '--profile', '-'], { stdin: 'x' });
  f('profile-apply-before', 'CLI-0034: -a then -p -> error', [...EN, '-a', '--profile', '-'], { stdin: 'x' });
  f('profile-tagger-before', 'CLI-0034: -t then -p -> error', [...EN, '-t', '--profile', '-'], { stdin: 'x' });
  f('profile-recursive', 'CLI-0055/0060: -p -r', [...EN, '-p', '-r', 'dir'], { files: { 'dir/a.txt': 'Hi there there.\n' }, profileTimes: true });
  f('profile-missing-file', 'CLI-0055/0042: -p missing file', [...EN, '-p', 'nope.txt']);

  // --xmlfilter (CLI-0035)
  f('xml-on-en', 'CLI-0035: --xmlfilter removes markup (MainTest.testXmlFiltering text)', [...EN, '--xmlfilter', 'input.txt'], { files: { 'input.txt': 'This < is is > filtered.\n' } });
  f('xml-off-en', 'CLI-0035: no filter by default (MainTest.testNoXmlFilteringByDefault)', [...EN, 'input.txt'], { files: { 'input.txt': 'This < is is > filtered.\n' } });
  f('xml-on-full-en', 'CLI-0035: --xmlfilter full rule set (MainTest text)', ['-l', 'en', '--xmlfilter', 'input.txt'], { files: { 'input.txt': 'This < is is > filtered.\n' } });
  f('xml-off-full-en', 'CLI-0035: full rule set without filter', ['-l', 'en', 'input.txt'], { files: { 'input.txt': 'This < is is > filtered.\n' } });
  f('xml-html', 'CLI-0035: --xmlfilter HTML with attributes and entities', [...EN, '--xmlfilter', '-'], { stdin: '<html><body><p class="a">Hi there there &amp; more.</p><p>Second  one.</p></body></html>' });
  f('xml-html-off', 'CLI-0035: HTML without filter', [...EN, '-'], { stdin: '<html><body><p class="a">Hi there there &amp; more.</p><p>Second  one.</p></body></html>' });
  f('xml-multiline-positions', 'CLI-0035: line/column refer to filtered text', [...EN, '--xmlfilter', '-'], { stdin: '<a>\n<b>one one</b>\n</a>\nlast  line' });
  f('xml-de', 'CLI-0035: --xmlfilter German umlauts', [...DE, '--xmlfilter', '-'], { stdin: '<p>Über größere Ärzte sprechen wir wir.</p>' });
  f('xml-fr', 'CLI-0035: --xmlfilter French', [...FR, '--xmlfilter', '-'], { stdin: '<p>Élève  français.</p>' });
  f('xml-comment-cdata', 'CLI-0035: comments, CDATA, processing instruction', [...EN, '--xmlfilter', '-'], { stdin: '<?xml version="1.0"?><!-- a a --><r><![CDATA[x x]]>there there</r>' });
  f('xml-unclosed', 'CLI-0035: unclosed tag', [...EN, '--xmlfilter', '-'], { stdin: 'text <b there there and more' });
  f('xml-plain-text', 'CLI-0035: --xmlfilter on text without markup', [...EN, '--xmlfilter', '-'], { stdin: 'Plain there there.' });
  f('xml-empty', 'CLI-0035: --xmlfilter empty', [...EN, '--xmlfilter', '-'], { stdin: '' });
  f('xml-recursive', 'CLI-0035/0060: --xmlfilter -r', [...EN, '--xmlfilter', '-r', 'dir'], { files: { 'dir/a.txt': '<p>there there</p>\n' } });
  f('xml-file-bom', 'CLI-0035/0043: --xmlfilter BOM file', [...EN, '--xmlfilter', 'input.txt'], { files: { 'input.txt': '﻿<p>there there</p>\n' } });
  f('xml-json-positions', 'CLI-0035/0051: --xmlfilter --json', [...EN, '--xmlfilter', '--json', '-'], { stdin: '<p>there there</p> and  more' });

  // misc option interplay / parse-order (CLI-0002..0003 neighbours of the F64 options)
  f('combo-verbose-json-apply', 'CLI-0010/0032: -v --json -a -> error', [...EN, '-v', '--json', '-a', '-'], { stdin: 'x' });
  f('combo-all-flags-en', 'CLI-0010-0035: many compatible flags together', [...EN, '-b', '-v', '--clean-overlapping', '--enable-temp-off', '--level', 'PICKY', '-u', '-c', 'utf-8', '-'], { stdin: T_EN });
  f('combo-lang-after-file', 'CLI-0002: option after file name (file is last arg -> unknown parameter)', ['input.txt', '-l', 'en-US'], { files: { 'input.txt': 'Hi.\n' } });
  f('combo-json-de-umlaut-apply-err', 'CLI-0033: error text for --json -a in de', [...DE, '--json', '-a', '-'], { stdin: 'x' });
}

// ---------------- X-CLI-BITEXT ----------------
{
  const w = mk('X-CLI-BITEXT');
  const f = w;
  const P = (...pairs) => pairs.map(([a, b]) => `${a}\t${b}`).join('\n') + '\n';
  const EN_DE = P(['This is a test.', 'Das ist ein Test.'], ['Hello world', 'Hallo Welt'], ['Short', 'Dies ist eine sehr lange Übersetzung, die viel länger ist als das Original und deshalb auffällt.']);
  const SAME = P(['Berlin', 'Berlin'], ['This is a test.', 'This is a test.'], ['Same!', 'Same!'], ['A', 'B']);
  const PUNCT = P(['Is this a question?', 'Ist das eine Frage.'], ['Hello!', 'Hallo'], ['Stop...', 'Halt'], ['Fine.', 'Gut']);
  const BASEARGS = ['-l', 'de-DE', '-m', 'en', '-b2'];

  // mode flags and requirements (CLI-0016, CLI-0061)
  f('bt-basic-en-de', 'CLI-0016/0064: -b2 -m en -l de generic bitext rules', [...BASEARGS, 'input.txt'], { files: { 'input.txt': EN_DE } });
  f('bt-long-flag', 'CLI-0016: --bitext', ['-l', 'de-DE', '-m', 'en', '--bitext', 'input.txt'], { files: { 'input.txt': EN_DE } });
  f('bt-no-mothertongue', 'CLI-0061: -b2 without -m -> error', ['-l', 'de-DE', '-b2', 'input.txt'], { files: { 'input.txt': EN_DE } });
  f('bt-no-mothertongue-no-lang', 'CLI-0061: -b2 without -m and -l', ['-b2', 'input.txt'], { files: { 'input.txt': EN_DE } });
  f('bt-no-lang', 'CLI-0061/0037: -b2 -m en without -l (English target default)', ['-m', 'de', '-b2', 'input.txt'], { files: { 'input.txt': P(['Das ist ein Test.', 'This is a test.']) } });
  f('bt-unknown-mothertongue', 'CLI-0061/0021: -m zz', ['-l', 'de-DE', '-m', 'zz', '-b2', 'input.txt'], { files: { 'input.txt': EN_DE }, listCut: true });
  f('bt-b2-last-arg', 'CLI-0016: -b2 as only option, stdin', ['-b2'], { stdin: EN_DE });
  f('bt-stdin', 'CLI-0063: bitext from stdin (-)', [...BASEARGS, '-'], { stdin: EN_DE });
  f('bt-stdin-implicit', 'CLI-0063: bitext, no file arg', [...BASEARGS], { stdin: EN_DE });
  f('bt-en-de-reverse', 'CLI-0064: de source -> en target', ['-l', 'en-US', '-m', 'de', '-b2', 'input.txt'], { files: { 'input.txt': P(['Das ist ein Test.', 'This is a test.'], ['Hallo', 'Hello world, this is a much longer translation text than the original one is.']) } });
  f('bt-fr-en', 'CLI-0064: fr source -> en target', ['-l', 'en-US', '-m', 'fr', '-b2', 'input.txt'], { files: { 'input.txt': P(['Bonjour le monde.', 'Hello world.'], ['Salut', 'Hi, this is a really long English translation of a very short word.']) } });
  f('bt-en-fr', 'CLI-0064: en source -> fr target', ['-l', 'fr', '-m', 'en', '-b2', 'input.txt'], { files: { 'input.txt': P(['Hello world.', 'Bonjour le monde.'], ['Hi', 'Salut, ceci est une traduction française vraiment très longue pour un mot.']) } });
  f('bt-de-fr', 'CLI-0064: de source -> fr target', ['-l', 'fr', '-m', 'de', '-b2', 'input.txt'], { files: { 'input.txt': P(['Guten Tag.', 'Bonjour.'], ['Ja', 'Oui, bien sûr, absolument et complètement certainement.']) } });
  f('bt-fr-de', 'CLI-0064: fr source -> de target', ['-l', 'de-DE', '-m', 'fr', '-b2', 'input.txt'], { files: { 'input.txt': P(['Bonjour.', 'Guten Tag.'], ['Oui', 'Ja, selbstverständlich, absolut und vollkommen sicher natürlich.']) } });
  f('bt-same-lang', 'CLI-0064: -m same as -l', ['-l', 'en-US', '-m', 'en', '-b2', 'input.txt'], { files: { 'input.txt': SAME } });
  f('bt-same-translation', 'CLI-0064: SameTranslationRule cases', [...BASEARGS, 'input.txt'], { files: { 'input.txt': SAME } });
  f('bt-diff-punctuation', 'CLI-0064: DifferentPunctuationRule cases', [...BASEARGS, 'input.txt'], { files: { 'input.txt': PUNCT } });
  f('bt-empty-file', 'CLI-0063: empty file', [...BASEARGS, 'input.txt'], { files: { 'input.txt': '' } });
  f('bt-empty-stdin', 'CLI-0063: empty stdin', [...BASEARGS, '-'], { stdin: '' });
  f('bt-newline-only', 'CLI-0063: newline only', [...BASEARGS, 'input.txt'], { files: { 'input.txt': '\n' } });
  f('bt-blank-line-middle', 'CLI-0063: blank line between pairs', [...BASEARGS, 'input.txt'], { files: { 'input.txt': 'One\tEins\n\nTwo\tZwei\n' } });
  f('bt-no-tab', 'CLI-0063: line without tab -> error', [...BASEARGS, 'input.txt'], { files: { 'input.txt': 'This is a test without a tab.\n' } });
  f('bt-no-tab-second', 'CLI-0063: second line without tab (first output printed first)', [...BASEARGS, 'input.txt'], { files: { 'input.txt': 'Short\tDies ist eine sehr lange Übersetzung, die viel länger ist als das Original und deshalb auffällt.\nBroken line\n' } });
  f('bt-three-columns', 'CLI-0063: three columns (extra column ignored?)', [...BASEARGS, 'input.txt'], { files: { 'input.txt': 'One\tEins\tdrei\nShort\tDies ist eine sehr lange Übersetzung, die viel länger ist als das Original.\tx\n' } });
  f('bt-empty-columns', 'CLI-0063: empty source or target', [...BASEARGS, 'input.txt'], { files: { 'input.txt': '\tEins\nOne\t\n\t\n' } });
  f('bt-trailing-tab', 'CLI-0063: trailing tab', [...BASEARGS, 'input.txt'], { files: { 'input.txt': 'One\tEins\t\n' } });
  f('bt-no-final-newline', 'CLI-0063: no newline at EOF', [...BASEARGS, 'input.txt'], { files: { 'input.txt': 'Short\tDies ist eine sehr lange Übersetzung, die viel länger ist als das Original und deshalb auffällt.' } });
  f('bt-crlf', 'CLI-0063: CRLF line endings', [...BASEARGS, 'input.txt'], { files: { 'input.txt': 'Short\tDies ist eine sehr lange Übersetzung, die viel länger ist als das Original.\r\nTwo\tZwei\r\n' } });
  f('bt-umlauts', 'CLI-0064: umlauts and context', [...BASEARGS, 'input.txt'], { files: { 'input.txt': P(['Beautiful', 'Schöne Größe über Äpfel, die sehr viel länger sind als ein einziges englisches Wort.']) } });
  f('bt-long-line', 'CLI-0064: very long pair (context 45 on whole tab line)', [...BASEARGS, 'input.txt'], { files: { 'input.txt': P(['word '.repeat(200) + 'end', 'Wort ' + 'x'.repeat(10)], ['Short', 'Dies ist eine sehr lange Übersetzung, die viel länger ist als das Original.']) } });
  f('bt-many-pairs', 'CLI-0064: numbering continues across lines (60 pairs)', [...BASEARGS, 'input.txt'], { files: { 'input.txt': Array.from({ length: 60 }, (_, i) => (i % 3 === 0 ? `Same${i}\tSame${i}` : `Source number ${i}\tQuelle Nummer ${i}`)).join('\n') + '\n' } });
  f('bt-astral', 'CLI-0064: astral characters in pair', [...BASEARGS, 'input.txt'], { files: { 'input.txt': P(['Hi \u{1F600}', 'Hallo \u{1F600} sehr lange Zeichenfolge ohne Sinn, die lang genug ist, um aufzufallen im Vergleich.']) } });
  f('bt-missing-file', 'CLI-0063: missing input file', [...BASEARGS, 'nope.txt']);
  f('bt-directory', 'CLI-0063: directory as input', [...BASEARGS, 'dir'], { files: { 'dir/x.txt': 'a\tb\n' } });
  f('bt-encoding-latin1', 'CLI-0063: -c latin1', [...BASEARGS, '-c', 'latin1', 'input.txt'], { filesB64: { 'input.txt': Buffer.from('Short\tDies ist eine sehr lange Übersetzung, die viel länger ist als das Original.\n', 'latin1').toString('base64') } });
  f('bt-encoding-utf8', 'CLI-0063: -c UTF-8', [...BASEARGS, '-c', 'UTF-8', 'input.txt'], { files: { 'input.txt': EN_DE } });
  f('bt-encoding-bad', 'CLI-0063: -c bogus', [...BASEARGS, '-c', 'foo-bar', 'input.txt'], { files: { 'input.txt': EN_DE } });
  f('bt-bom', 'CLI-0063: UTF-8 BOM in bitext file', [...BASEARGS, 'input.txt'], { files: { 'input.txt': '﻿' + EN_DE } });

  // rule selection in bitext (CLI-0062)
  f('bt-disable-length', 'CLI-0062: -d TRANSLATION_LENGTH', [...BASEARGS, '-d', 'TRANSLATION_LENGTH', 'input.txt'], { files: { 'input.txt': EN_DE } });
  f('bt-disable-several', 'CLI-0062: -d several bitext ids and unknown', [...BASEARGS, '-d', 'TRANSLATION_LENGTH,SAME_TRANSLATION,DIFFERENT_PUNCTUATION,FOO', 'input.txt'], { files: { 'input.txt': EN_DE + SAME + PUNCT } });
  f('bt-disable-mono', 'CLI-0062: -d monolingual rule id', [...BASEARGS, '-d', 'UPPERCASE_SENTENCE_START', 'input.txt'], { files: { 'input.txt': P(['this is not', 'das ist nicht.']) } });
  f('bt-disable-same', 'CLI-0062: -d SAME_TRANSLATION', [...BASEARGS, '-d', 'SAME_TRANSLATION', 'input.txt'], { files: { 'input.txt': SAME } });
  f('bt-disable-punct', 'CLI-0062: -d DIFFERENT_PUNCTUATION', [...BASEARGS, '-d', 'DIFFERENT_PUNCTUATION', 'input.txt'], { files: { 'input.txt': PUNCT } });
  f('bt-enable-length', 'CLI-0062: -e TRANSLATION_LENGTH only that bitext rule', [...BASEARGS, '-e', 'TRANSLATION_LENGTH', 'input.txt'], { files: { 'input.txt': EN_DE + SAME + PUNCT } });
  f('bt-enable-same', 'CLI-0062: -e SAME_TRANSLATION', [...BASEARGS, '-e', 'SAME_TRANSLATION', 'input.txt'], { files: { 'input.txt': EN_DE + SAME + PUNCT } });
  f('bt-enable-order', 'CLI-0062: -e B,A runs in enabled-list order', [...BASEARGS, '-e', 'SAME_TRANSLATION,TRANSLATION_LENGTH', 'input.txt'], { files: { 'input.txt': EN_DE + SAME } });
  f('bt-enable-order-rev', 'CLI-0062: -e A,B (reversed list)', [...BASEARGS, '-e', 'TRANSLATION_LENGTH,SAME_TRANSLATION', 'input.txt'], { files: { 'input.txt': EN_DE + SAME } });
  f('bt-enable-duplicate', 'CLI-0062: -e A,A (duplicate id)', [...BASEARGS, '-e', 'TRANSLATION_LENGTH,TRANSLATION_LENGTH', 'input.txt'], { files: { 'input.txt': EN_DE } });
  f('bt-enable-unknown', 'CLI-0062: -e unknown id (no bitext rules, monolingual selection)', [...BASEARGS, '-e', 'FOO_BAR', 'input.txt'], { files: { 'input.txt': EN_DE } });
  f('bt-enable-mono', 'CLI-0062: -e monolingual rule id', [...BASEARGS, '-e', 'UPPERCASE_SENTENCE_START', 'input.txt'], { files: { 'input.txt': P(['this is not', 'das ist nicht.']) } });
  f('bt-enable-and-disable', 'CLI-0062: -e X -d X', [...BASEARGS, '-e', 'TRANSLATION_LENGTH', '-d', 'TRANSLATION_LENGTH', 'input.txt'], { files: { 'input.txt': EN_DE } });
  f('bt-disable-all', 'CLI-0062: -d all three generic rules', [...BASEARGS, '-d', 'TRANSLATION_LENGTH,SAME_TRANSLATION,DIFFERENT_PUNCTUATION', 'input.txt'], { files: { 'input.txt': EN_DE + SAME + PUNCT } });
  f('bt-eo-flag', 'CLI-0062/0017: -eo with -b2', [...BASEARGS, '-eo', '-e', 'TRANSLATION_LENGTH', 'input.txt'], { files: { 'input.txt': EN_DE } });
  f('bt-eo-then-d', 'CLI-0017: -eo then -d -> error', [...BASEARGS, '-eo', '-d', 'X', 'input.txt'], { files: { 'input.txt': EN_DE } });
  f('bt-disable-then-eo', 'CLI-0017: -d then -eo -> error', [...BASEARGS, '-d', 'X', '-eo', 'input.txt'], { files: { 'input.txt': EN_DE } });
  f('bt-enable-empty', 'CLI-0062: -e "" ([""]; size 1, no bitext rule matches)', [...BASEARGS, '-e', '', 'input.txt'], { files: { 'input.txt': EN_DE } });
  f('bt-disable-empty', 'CLI-0062: -d ""', [...BASEARGS, '-d', '', 'input.txt'], { files: { 'input.txt': EN_DE } });
  f('bt-categories', 'CLI-0062: --enablecategories in bitext (discarded after setup?)', [...BASEARGS, '--enablecategories', 'PUNCTUATION', 'input.txt'], { files: { 'input.txt': P(['this is not.', 'das ist nicht ,so.']) } });
  f('bt-disablecategories', 'CLI-0062: --disablecategories in bitext', [...BASEARGS, '--disablecategories', 'PUNCTUATION', 'input.txt'], { files: { 'input.txt': EN_DE } });
  f('bt-rulefile-discarded', 'CLI-0062: --rulefile is lost in bitext mode (lt re-created)', [...BASEARGS, '--rulefile', 'rules.xml', '-e', 'EXAMPLE_RULE', 'input.txt'], { files: { 'input.txt': P(['x', 'language tool']), 'rules.xml': '<?xml version="1.0" encoding="UTF-8"?>\n<rules lang="de">\n<category id="CAT1" name="c">\n<rule id="EXAMPLE_RULE" name="n">\n<pattern><token>language</token><token>tool</token></pattern>\n<message>wrong</message>\n<example correction="">language tool</example>\n</rule></category></rules>' } });
  f('bt-falsefriends-discarded', 'CLI-0062: --falsefriends file in bitext mode', [...BASEARGS, '--falsefriends', 'ff.xml', 'input.txt'], { files: { 'input.txt': P(['gift', 'Geschenk']), 'ff.xml': '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE rules SYSTEM "false-friends.dtd">\n<rules><rulegroup id="EXT_FF"><rule><pattern lang="en"><token>gift</token></pattern><translation lang="de">Geschenk</translation></rule><rule><pattern lang="de"><token>Geschenk</token></pattern><translation lang="en">gift</translation></rule></rulegroup></rules>\n' } });
  f('bt-enable-temp-off', 'CLI-0062: --enable-temp-off in bitext', [...BASEARGS, '--enable-temp-off', 'input.txt'], { files: { 'input.txt': EN_DE } });
  f('bt-clean-overlapping', 'CLI-0062: --clean-overlapping in bitext', [...BASEARGS, '--clean-overlapping', 'input.txt'], { files: { 'input.txt': EN_DE } });
  f('bt-level-picky', 'CLI-0062/0004: --level PICKY in bitext', [...BASEARGS, '--level', 'PICKY', 'input.txt'], { files: { 'input.txt': EN_DE } });
  f('bt-monolingual-both', 'CLI-0062: -e UPPERCASE_SENTENCE_START with both sides lowercase', [...BASEARGS, '-e', 'UPPERCASE_SENTENCE_START,TRANSLATION_LENGTH', 'input.txt'], { files: { 'input.txt': P(['this is a test.', 'das ist ein test.']) } });
  f('bt-verbose', 'CLI-0041/0016: -v in bitext', [...BASEARGS, '-v', 'input.txt'], { files: { 'input.txt': EN_DE } });

  // external bitext rules (CLI-0028)
  const BR = (src, trg, id, srcToks, trgToks, msg, sugg = '') => `<?xml version="1.0" encoding="UTF-8"?>
<rules targetLang="${trg}" xsi:noNamespaceSchemaLocation="../bitext.xsd" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xs="http://www.w3.org/2001/XMLSchema">
<category id="CAT1" name="idioms">
<rule lang="${trg}" id="${id}" name="Ext bitext rule">
<pattern>
\t<source lang="${src}">
${srcToks.map((t) => `\t\t<token>${t}</token>`).join('\n')}
\t</source>
\t<target>
${trgToks.map((t) => `\t\t<token>${t}</token>`).join('\n')}
\t</target>
</pattern>
<message>${msg}${sugg ? ` <suggestion>${sugg}</suggestion>?` : ''}</message>
<example type="correct"><srcExample>${srcToks.join(' ')}</srcExample>
<trgExample>ok ok</trgExample></example>
<example type="incorrect"${sugg ? ` correction="${sugg}"` : ''}><srcExample><marker>${srcToks.join(' ')}</marker></srcExample>
<trgExample><marker>${trgToks.join(' ')}</marker></trgExample></example>
</rule></category></rules>
`;
  const RH_DE = BR('en', 'de', 'red_herring', ['is', 'a', 'red', 'herring'], ['ein', 'roter', 'Hering'], 'Meinten Sie', 'ein Ablenkungsmanöver');
  const RH_IN = 'This is a red herring.\tDas ist ein roter Hering.\nThis is a fine day.\tDas ist ein schöner Tag.\n';
  f('bt-ext-en-de', 'CLI-0028: --bitextrules en->de with suggestion', [...BASEARGS, '--bitextrules', 'bt.xml', 'input.txt'], { files: { 'input.txt': RH_IN, 'bt.xml': RH_DE } });
  f('bt-ext-en-de-eo-excluded', 'CLI-0028/0062: external rule with -e TRANSLATION_LENGTH (external rule filtered out)', [...BASEARGS, '--bitextrules', 'bt.xml', '-e', 'TRANSLATION_LENGTH', 'input.txt'], { files: { 'input.txt': RH_IN, 'bt.xml': RH_DE } });
  f('bt-ext-en-de-eo-included', 'CLI-0028/0062: -e red_herring selects external rule', [...BASEARGS, '--bitextrules', 'bt.xml', '-e', 'red_herring', 'input.txt'], { files: { 'input.txt': RH_IN, 'bt.xml': RH_DE } });
  f('bt-ext-en-de-disabled', 'CLI-0028/0062: -d red_herring', [...BASEARGS, '--bitextrules', 'bt.xml', '-d', 'red_herring', 'input.txt'], { files: { 'input.txt': RH_IN, 'bt.xml': RH_DE } });
  f('bt-ext-apply', 'CLI-0028/0065: --bitextrules with -a', [...BASEARGS, '--bitextrules', 'bt.xml', '-a', 'input.txt'], { files: { 'input.txt': RH_IN, 'bt.xml': RH_DE } });
  f('bt-ext-de-en', 'CLI-0028: de->en external rule', ['-l', 'en-US', '-m', 'de', '-b2', '--bitextrules', 'bt.xml', 'input.txt'], { files: { 'input.txt': 'Das ist ein Geschenk.\tThis is a gift.\n', 'bt.xml': BR('de', 'en', 'gift_rule', ['Geschenk'], ['gift'], 'Did you mean', 'present') } });
  f('bt-ext-fr-en', 'CLI-0028: fr->en external rule', ['-l', 'en-US', '-m', 'fr', '-b2', '--bitextrules', 'bt.xml', 'input.txt'], { files: { 'input.txt': "C'est actuellement bon.\tIt is actually good.\n", 'bt.xml': BR('fr', 'en', 'actuel_rule', ['actuellement'], ['actually'], 'Did you mean', 'currently') } });
  f('bt-ext-en-fr', 'CLI-0028: en->fr external rule', ['-l', 'fr', '-m', 'en', '-b2', '--bitextrules', 'bt.xml', 'input.txt'], { files: { 'input.txt': 'He is actually here.\tIl est actuellement ici.\n', 'bt.xml': BR('en', 'fr', 'actually_rule', ['actually'], ['actuellement'], 'Vouliez-vous dire', 'en fait') } });
  f('bt-ext-de-fr-umlauts', 'CLI-0028: de->fr external rule with umlauts in file', ['-l', 'fr', '-m', 'de', '-b2', '--bitextrules', 'bt.xml', 'input.txt'], { files: { 'input.txt': 'Die Größe über alles.\tLa grandeur sur tout.\n', 'bt.xml': BR('de', 'fr', 'gr_rule', ['Größe', 'über'], ['grandeur'], 'Hinweis: Äpfel ß', 'taille') } });
  f('bt-ext-wrong-target-lang', 'CLI-0028: external rule file targetLang does not match target language', [...BASEARGS, '--bitextrules', 'bt.xml', 'input.txt'], { files: { 'input.txt': RH_IN, 'bt.xml': RH_DE.replace('targetLang="de"', 'targetLang="fr"').replace('rule lang="de"', 'rule lang="fr"') } });
  f('bt-ext-wrong-source-lang', 'CLI-0028: external rule source lang differs from -m', ['-l', 'de-DE', '-m', 'fr', '-b2', '--bitextrules', 'bt.xml', 'input.txt'], { files: { 'input.txt': RH_IN, 'bt.xml': RH_DE } });
  f('bt-ext-missing', 'CLI-0028: --bitextrules missing file', [...BASEARGS, '--bitextrules', 'nope.xml', 'input.txt'], { files: { 'input.txt': RH_IN } });
  f('bt-ext-invalid-xml', 'CLI-0028: --bitextrules malformed XML', [...BASEARGS, '--bitextrules', 'bad.xml', 'input.txt'], { files: { 'input.txt': RH_IN, 'bad.xml': '<rules targetLang="de"><category></rules>' } });
  f('bt-ext-empty', 'CLI-0028: --bitextrules empty file', [...BASEARGS, '--bitextrules', 'empty.xml', 'input.txt'], { files: { 'input.txt': RH_IN, 'empty.xml': '' } });
  f('bt-ext-missing-arg', 'CLI-0028: --bitextrules without value', ['--bitextrules']);
  f('bt-ext-without-b2', 'CLI-0028: --bitextrules without -b2 (ignored)', ['-l', 'de-DE', '-m', 'en', '--bitextrules', 'bt.xml', '-'], { stdin: 'Das ist ein roter Hering.\n', files: { 'bt.xml': RH_DE } });
  f('bt-ext-json', 'CLI-0028/0032: --bitextrules -b2 --json -> error', [...BASEARGS, '--bitextrules', 'bt.xml', '--json', 'input.txt'], { files: { 'input.txt': RH_IN, 'bt.xml': RH_DE } });
  f('bt-ext-twice', 'CLI-0028: --bitextrules twice (last wins)', [...BASEARGS, '--bitextrules', 'bt.xml', '--bitextrules', 'bt2.xml', 'input.txt'], { files: { 'input.txt': RH_IN + 'Good day.\tGuten Tag.\n', 'bt.xml': RH_DE, 'bt2.xml': BR('en', 'de', 'good_day', ['good', 'day'], ['Guten', 'Tag'], 'Meinten Sie', 'Hallo') } });
  f('bt-ext-multiple-rules', 'CLI-0028: external file with several rules and -e list order', [...BASEARGS, '--bitextrules', 'bt.xml', '-e', 'good_day,red_herring', 'input.txt'], { files: { 'input.txt': RH_IN + 'Good day.\tGuten Tag.\n', 'bt.xml': RH_DE.replace('</category></rules>', '') + '<rule lang="de" id="good_day" name="Good day"><pattern><source lang="en"><token>good</token><token>day</token></source><target><token>Guten</token><token>Tag</token></target></pattern><message>Meinten Sie <suggestion>Hallo</suggestion>?</message><example type="correct"><srcExample>Good day.</srcExample><trgExample>Hallo.</trgExample></example><example type="incorrect" correction="Hallo"><srcExample><marker>Good day</marker>.</srcExample><trgExample><marker>Guten Tag</marker>.</trgExample></example></rule></category></rules>' } });

  // bitext apply (CLI-0065)
  const ST = [['There is a dog.', 'Ein Hund.'], ['A cat.', 'Eine Katze, mit viel zu viel Text, um kurz zu sein und aufzufallen.']];
  f('bt-apply-basic', 'CLI-0065: -a in bitext, target printed per line', [...BASEARGS, '-a', 'input.txt'], { files: { 'input.txt': EN_DE } });
  f('bt-apply-long-flag', 'CLI-0065: --apply', [...BASEARGS, '--apply', 'input.txt'], { files: { 'input.txt': EN_DE } });
  f('bt-apply-same-punct', 'CLI-0065: -a with punctuation/same-translation rules', [...BASEARGS, '-a', 'input.txt'], { files: { 'input.txt': SAME + PUNCT } });
  f('bt-apply-monolingual', 'CLI-0065: -a with monolingual rule suggestion (-e)', [...BASEARGS, '-a', '-e', 'UPPERCASE_SENTENCE_START', 'input.txt'], { files: { 'input.txt': P(['this is a test.', 'das ist ein Test. und noch einer.']) } });
  f('bt-apply-monolingual-both', 'CLI-0065: -a with monolingual rules and bitext rule', [...BASEARGS, '-a', '-e', 'UPPERCASE_SENTENCE_START,TRANSLATION_LENGTH', 'input.txt'], { files: { 'input.txt': P(['this is a test.', 'das ist ein test.']) } });
  f('bt-apply-stdin', 'CLI-0065: -a stdin', [...BASEARGS, '-a', '-'], { stdin: EN_DE });
  f('bt-apply-empty', 'CLI-0065: -a empty file', [...BASEARGS, '-a', 'input.txt'], { files: { 'input.txt': '' } });
  f('bt-apply-no-tab', 'CLI-0065: -a line without tab', [...BASEARGS, '-a', 'input.txt'], { files: { 'input.txt': 'no tab here\n' } });
  f('bt-apply-umlauts', 'CLI-0065: -a umlauts preserved', [...BASEARGS, '-a', '-e', 'UPPERCASE_SENTENCE_START', 'input.txt'], { files: { 'input.txt': P(['x', 'über Größe. äpfel sind gut.']) } });
  f('bt-apply-json', 'CLI-0065/0032: -a then --json -> error', [...BASEARGS, '-a', '--json', 'input.txt'], { files: { 'input.txt': EN_DE } });
  f('bt-apply-tagger', 'CLI-0065/0014: -a then -t -> error', [...BASEARGS, '-a', '-t', 'input.txt'], { files: { 'input.txt': EN_DE } });
  f('bt-apply-no-trailing-newline', 'CLI-0065: last line without newline', [...BASEARGS, '-a', 'input.txt'], { files: { 'input.txt': 'a\tb' } });
  f('bt-apply-ext-multiple-suggestions', 'CLI-0065: external rule with suggestion applied; unchanged other lines', [...BASEARGS, '-a', '--bitextrules', 'bt.xml', 'input.txt'], { files: { 'input.txt': RH_IN + ST.map(([a, b]) => `${a}\t${b}`).join('\n') + '\n', 'bt.xml': RH_DE } });
  f('bt-apply-fr-en', 'CLI-0065: -a fr->en external rule', ['-l', 'en-US', '-m', 'fr', '-b2', '-a', '--bitextrules', 'bt.xml', 'input.txt'], { files: { 'input.txt': "C'est actuellement bon.\tIt is actually good.\n", 'bt.xml': BR('fr', 'en', 'actuel_rule', ['actuellement'], ['actually'], 'Did you mean', 'currently') } });

  // bitext interplay with other options
  f('bt-json-after', 'CLI-0032: -b2 then --json -> error', [...BASEARGS, '--json', 'input.txt'], { files: { 'input.txt': EN_DE } });
  f('bt-json-before', 'CLI-0032: --json then -b2 (no parse error; recorded)', ['-l', 'de-DE', '-m', 'en', '--json', '-b2', 'input.txt'], { files: { 'input.txt': EN_DE } });
  f('bt-line-by-line', 'CLI-0011/0016: -b2 --line-by-line (bitext wins?)', [...BASEARGS, '--line-by-line', 'input.txt'], { files: { 'input.txt': EN_DE } });
  f('bt-tagger', 'CLI-0014/0016: -b2 -t', [...BASEARGS, '-t', 'input.txt'], { files: { 'input.txt': EN_DE } });
  f('bt-unknown-words', 'CLI-0050/0016: -b2 -u', [...BASEARGS, '-u', 'input.txt'], { files: { 'input.txt': EN_DE } });
  f('bt-recursive', 'CLI-0060/0016: -b2 -r dir', [...BASEARGS, '-r', 'dir'], { files: { 'dir/a.txt': EN_DE } });
  f('bt-profile', 'CLI-0055/0016: -b2 -p', [...BASEARGS, '-p', 'input.txt'], { files: { 'input.txt': EN_DE }, profileTimes: true });
  f('bt-xmlfilter', 'CLI-0035/0016: -b2 --xmlfilter', [...BASEARGS, '--xmlfilter', 'input.txt'], { files: { 'input.txt': '<p>Short</p>\t<p>Dies ist eine sehr lange Übersetzung, die viel länger ist als das Original.</p>\n' } });
  f('bt-b-flag', 'CLI-0031/0016: -b -b2', [...BASEARGS, '-b', 'input.txt'], { files: { 'input.txt': EN_DE } });
  f('bt-adl', 'CLI-0009/0016: -adl -b2 -m en', ['-adl', '-m', 'en', '-b2', 'input.txt'], { ...AD0(), files: { 'input.txt': EN_DE } });
  f('bt-b2-twice', 'CLI-0016: -b2 twice', [...BASEARGS, '-b2', 'input.txt'], { files: { 'input.txt': EN_DE } });
  f('bt-mothertongue-after', 'CLI-0061: -m after file-less -b2 (order irrelevant)', ['-b2', '-m', 'en', '-l', 'de-DE', 'input.txt'], { files: { 'input.txt': EN_DE } });
  f('bt-en-us-gb-variants', 'CLI-0061: -l en-GB -m de-DE', ['-l', 'en-GB', '-m', 'de-DE', '-b2', 'input.txt'], { files: { 'input.txt': P(['Das ist gut.', 'This is good.'], ['Hallo', 'Hello there, this is a rather long translation for a single word indeed.']) } });
  f('bt-de-at-source', 'CLI-0061: -l fr -m de-AT', ['-l', 'fr', '-m', 'de-AT', '-b2', 'input.txt'], { files: { 'input.txt': P(['Servus', 'Bonjour, ceci est une traduction française beaucoup trop longue pour un mot.']) } });
  f('bt-level-lowercase-err', 'CLI-0004: --level picky in bitext -> error', [...BASEARGS, '--level', 'picky', 'input.txt'], { files: { 'input.txt': EN_DE } });
  f('bt-no-matches', 'CLI-0064: no matches, Time line with pair count', [...BASEARGS, 'input.txt'], { files: { 'input.txt': P(['Good morning.', 'Guten Morgen.']) } });
  f('bt-time-line-count', 'CLI-0064: Time line uses number of pairs', [...BASEARGS, 'input.txt'], { files: { 'input.txt': Array.from({ length: 5 }, (_, i) => `Pair ${i}.\tPaar ${i}.`).join('\n') + '\n' } });
  f('bt-same-with-uppercase', 'CLI-0064: monolingual rules enabled with uppercase source start', [...BASEARGS, '-e', 'UPPERCASE_SENTENCE_START', 'input.txt'], { files: { 'input.txt': P(['this is a test.', 'das ist ein test.'], ['Fine.', 'Gut.']) } });
  f('bt-monolingual-german-rule', 'CLI-0062: German monolingual rule on target side', [...BASEARGS, '-e', 'GERMAN_WORD_REPEAT_RULE', 'input.txt'], { files: { 'input.txt': P(['This is a test.', 'Das ist ein ein Test.']) } });
  f('bt-monolingual-source-rule', 'CLI-0062: English monolingual rule on source side', [...BASEARGS, '-e', 'ENGLISH_WORD_REPEAT_RULE', 'input.txt'], { files: { 'input.txt': P(['This is is a test.', 'Das ist ein Test.']) } });
  f('bt-monolingual-fr-source', 'CLI-0062: French source repeat/whitespace rules', ['-l', 'de-DE', '-m', 'fr', '-b2', '-e', 'WHITESPACE_RULE,DOUBLE_PUNCTUATION', 'input.txt'], { files: { 'input.txt': P(['Voici  un test..', 'Das ist ein Test.']) } });
}
function AD0() { return { normalize: [...BASE.normalize, 'logTimestamp'] }; }
