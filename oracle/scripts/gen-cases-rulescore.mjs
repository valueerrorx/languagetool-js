// Authors oracle/cases/X-RULES-CORE/*.json (inputs only). Op check-rules: docs/review/F16-oracle.md.
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';
import { stripComments, unescapeJava } from './lib-java-literals.mjs';

const DIR = path.join(ROOT, 'oracle/cases/X-RULES-CORE');
rmSync(DIR, { recursive: true, force: true });
mkdirSync(DIR, { recursive: true });
const SRC = path.join(ROOT, 'oracle/java-src');
const CT = `${SRC}/languagetool-core/src/test/java/org/languagetool/rules`;
const LM = (l) => `${SRC}/languagetool-language-modules/${l}/src/test/java/org/languagetool/rules/${l}`;

// Java-authored inputs: every string literal of the JUnit test class (adjacent "a" + "b" joined), minus ids/codes
function testStrings(file) {
  if (!existsSync(file)) return [];
  const src = stripComments(readFileSync(file, 'utf8'));
  const joined = src.replace(/"((?:[^"\\]|\\.)*)"\s*\+\s*(?=")/g, (m, a) => `"${a}`.replace(/$/, '') + '\u0001').replace(/\u0001"/g, '');
  const out = [];
  for (const m of joined.matchAll(/"((?:[^"\\]|\\.)*)"/g)) {
    const s = unescapeJava(m[1].replace(/\u0001/g, ''));
    if (s.length < 2 || /^[A-Z_0-9]+$/.test(s) || /^[a-z]{2}(-[A-Z]{2})?$/.test(s) || /^org\.|\.(java|txt)$/.test(s)) continue;
    out.push(s);
  }
  return out;
}
const uniq = (a) => [...new Set(a)];
const corpus = (l) => readFileSync(path.join(ROOT, `oracle/corpus/${l}/corpus.txt`), 'utf8').split('\n\n').map((p) => p.replace(/\n+$/, '')).filter(Boolean);

const RULES = {
  CommaWhitespaceRule: { cls: 'org.languagetool.rules.CommaWhitespaceRule', tests: { core: ['CommaWhitespaceRuleTest'], de: ['GermanCommaWhitespaceRuleTest'] } },
  DoublePunctuationRule: { cls: 'org.languagetool.rules.DoublePunctuationRule', tests: { core: ['DoublePunctuationRuleTest'] } },
  GenericUnpairedBracketsRule: { cls: 'org.languagetool.rules.GenericUnpairedBracketsRule', tests: { core: ['GenericUnpairedBracketsRuleTest'], de: ['GenericUnpairedBracketsRuleTest'], en: ['EnglishUnpairedBracketsRuleTest'], fr: ['GenericUnpairedBracketsRuleTest'] } },
  GenericUnpairedQuotesRule: { cls: 'org.languagetool.rules.GenericUnpairedQuotesRule', tests: { core: ['GenericUnpairedQuotesRuleTest'], de: ['GermanUnpairedQuotesRuleTest'], en: ['EnglishUnpairedQuotesRuleTest'] } },
  UppercaseSentenceStartRule: { cls: 'org.languagetool.rules.UppercaseSentenceStartRule', tests: { core: ['UppercaseSentenceStartRuleTest'], de: ['UppercaseSentenceStartRuleTest'], en: ['UppercaseSentenceStartRuleTest'] } },
  WordRepeatRule: { cls: 'org.languagetool.rules.WordRepeatRule', tests: { core: ['WordRepeatRuleTest'], de: ['WordRepeatRuleTest', 'GermanWordRepeatRuleTest'], en: ['WordRepeatRuleTest', 'EnglishWordRepeatRuleTest'] } },
  MultipleWhitespaceRule: { cls: 'org.languagetool.rules.MultipleWhitespaceRule', tests: { core: ['MultipleWhitespaceRuleTest'] } },
  SentenceWhitespaceRule: { cls: 'org.languagetool.rules.SentenceWhitespaceRule', tests: { core: ['SentenceWhitespaceRuleTest'], de: ['SentenceWhitespaceRuleTest'] } },
  WhitespaceBeforePunctuationRule: { cls: 'org.languagetool.rules.WhitespaceBeforePunctuationRule', tests: { core: ['WhitespaceBeforePunctuationRuleTest'] } },
};

// generic edge cases for all rules (quotes, brackets, smileys, lists, numbers, ellipsis, URLs, line breaks)
const EDGE = [
  '', ' ', '\n', 'a', 'Hello, world.', 'Hello , world .', 'Hello,world', 'Hello ,world', '( Hello )', '(Hello)', 'Hello (world', 'Hello world)', '((a)', '(a))', '([a)]', '{a [b (c) d] e}', '[a (b] c)',
  '„Hallo“ sagte er.', '„Hallo sagte er.', 'Hallo“ sagte er.', '«Bonjour» dit-il.', '« Bonjour » dit-il.', '«Bonjour dit-il.', '"Hello" he said.', '"Hello he said.', "'Hello' he said.", "'Hello he said.", '‚Hallo‘ sagte er.', '‚Hallo sagte er.', '“Hello” he said.', '“Hello he said.', '“Hello„ he said.',
  'He said "a" and "b" and "c".', "It's a dog's life, isn't it?", "The '90s were fun.", 'Rock ’n’ roll.', 'The 5" screen and 6\' pole.', 'Er sagte: „Das ist ‚gut‘ so“.', '„Hallo\nWelt“', '„Hallo\n\nWelt“', '"A\n\nB"',
  'Smile :-) now', 'Sad :-( now', 'Wink ;-) and :( and :) done', 'Look :) (here)', '(Look :)', 'Look :-)) now', '(a :-) b', 'a) first\nb) second', 'a) first b) second', '1) one 2) two', '1) one\n2) two\n3) three', 'a) b) c)', '- item (one\n- item two)', '• Punkt\n• Punkt (zwei',
  'The price is 1.000,5 euros.', 'Der Preis ist 1.000,5 Euro.', '1,5 und 2,5', '1, 2, 3', '1 , 2', '3.14 and 2,718', 'Value: 12.5 %', 'Wert : 12 %', 'Wert: 12 %', 'Wert; 12 % ; fertig', 'Il a dit : oui ; non', 'Ce n\'est pas 100 % sûr !', '10 % ,', 'x : y',
  'Wait... what?', 'Wait.. what?', 'Wait…. what?', 'Wait,, what?', 'Wait,,, what?', 'Wait.... what', 'Wait ... what', 'Wait . . .', '..', ',,', '.. ..', 'So... ..', 'Eh?? Really!! Ok..', '?!', 'Hi!!', 'Hi,,.',
  'See https://example.org/a,b.c?x=1&y=2 for more.', 'See www.example.org , please', 'Mail me at foo@bar.com, thanks', 'URL: http://a.b/c..d', 'file.txt,file2.txt', 'a.b.c.d', 'e.g. this, i.e. that', 'z.B. das und d.h. dies',
  'First sentence.Second sentence.', 'First sentence. Second sentence.', 'First sentence.  Second sentence.', 'First sentence.   Second', 'First sentence?Second', 'Wie geht es?Gut!', 'First.\nSecond.', 'First.\n\nSecond.', 'First.\r\nSecond.', 'Eins. Zwei.Drei', 'A.B', 'A. B', 'Dr.Müller kommt', 'Visit www.a.org.Then go', 'Hello:World', 'ok.Next',
  'This is  a test.', 'This is   a test.', 'This is a  test.  Another  one.', 'Tab\there', 'Tab\t\there', 'a   b', 'a  b', 'a  b', 'a \t b', '  Leading two spaces', ' Leading one', 'Trailing two  ', 'Para one.\n\n  Para two.', 'Para one.\n   Para two.', 'a\n  b', '    indented code', 'a  \n  b',
  'This is is a test.', 'This is IS a test.', 'is is', 'Is is it', 'Das ist ist ein Test.', 'Das ist ein ein Test.', 'Das das ist gut.', 'Il y a a un chat.', 'Nous nous lavons.', 'That that is that.', 'A a a a', 'bla bla bla', 'ha ha', 'no no no!', 'one, one', 'one one,', 'foo-foo foo foo-bar', '1 1 2', '2 2', 'Test.\nTest test.', 'ich ich', 'Ich ich', 'sehr sehr gut', 'wie wie', 'there there',
  'sentence one. and the second', 'etwas beginnen. und der auch nicht', 'schön!', 'Schön! der Hund', 'Hello. the world', 'Hello! the world', 'Hello? the world', 'Hello.\nthe world', 'Hello.\n\nthe world', 'hello', 'hello world', 'Hello world. 1. item', '1. an item\n2. another item.', '"quoted. lowercase after"', 'He said. „lowercase quote“', 'Ellipsis… lowercase', 'Ellipsis... lowercase', 'Colon: lowercase', 'Q: what? a: this', 'e-mail. foo', 'etc. und so weiter', 'bspw. und z.B. inside', 'microRNA is. mRNA is. iDeal is', 'ℹ️ Tree Structure.', 'ℹ Tree Structure.', '— dash item', '— Dash item', 'ß ist ein Buchstabe. ßtrasse', 'Ändern. äpfel', 'Ärger. über uns', 'État. été', 'Ça. ça va', '😀 emoji. 😀 lower', 'Mr. smith. mrs. brown', 'Ph.D. thesis.', 'a. b. c.', 'U.S. army. u.s. army', 'List:\n- one\n- two', 'List:\n\n• one\n• two',
  'Satz mit Umlauten: äöü ÄÖÜ ß, und Komma ,falsch', 'Ein Satz.\nEin zweiter Satz.\n\nEin dritter (unvollständiger Satz', 'Kein Absatzende', 'Das ist ein Test (mit Klammer) und „Zitat“.', 'ʻOkina and ʼ apostrophe', 'Hyphen­ated soft­hyphen, test .', 'Soft ­ hyphen  spaces', 'a­,b', '﻿Hello ,BOM', 'Emoji 😀 ,after', '😀  😀', '​zero width , space', 'Very long line ' + 'word, '.repeat(15) + 'end .',
  'x'.repeat(600), 'a, '.repeat(20), '(a '.repeat(15), 'word word '.repeat(8), 'S. T '.repeat(15),
];
// multi-paragraph / line-break texts
const MULTI = [
  'First paragraph with a (bracket.\n\nSecond paragraph closes it).', 'First „quote\n\nsecond“ paragraph.', 'Para one , bad.\n\nPara two ..\n\nPara three  spaces.', 'Line one.\nline two lowercase.\n\nline three.', 'Title\n\nBody text.Missing space. next', 'a\r\nb\r\n\r\nc  d', 'one\n\n\n\ntwo', 'one\n \ntwo', 'List\n1. a\n2. b\n\n(see above', 'Der Hund (Canis lupus) ist ein Tier.\n\nDie Katze („Felis catus“) auch.\n\nEnde .',
];

const CHUNK = 60;
const chunks = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const write = (name, description, ops) => writeFileSync(path.join(DIR, `${name}.json`), JSON.stringify({ kind: 'harness', clock: 'fixed', description, normalize: [], compare: 'check-pipe', ops }, null, 1) + '\n');
const T = (text, extra = {}) => ({ text, ...extra });
const LANGS = [['en-US', 'en'], ['fr', 'fr'], ['de-DE', 'de']];

for (const [lang, c] of LANGS) {
  const paras = corpus(c);
  const corp = paras.slice(0, 8).map((p) => p.slice(0, 220));
  const corpMulti = [];
  for (let i = 0; i + 3 <= paras.length && corpMulti.length < 3; i += 23) corpMulti.push(paras.slice(i, i + 3).map((p) => p.slice(0, 150)).join('\n\n'));
  for (const [name, def] of Object.entries(RULES)) {
    const java = [...(def.tests.core ?? []).map((n) => `${CT}/${n}.java`), ...(def.tests[c] ?? []).map((n) => `${LM(c)}/${n}.java`)];
    const junit = uniq(java.flatMap(testStrings));
    const texts = uniq([...junit, ...EDGE, ...MULTI, ...corp, ...corpMulti]);
    const cases = texts.map((t) => T(t));
    const paraCases = [T('A (b.\n\nC) d.', { paraMode: 'ONLYNONPARA' }), T('A (b.\n\nC) d.', { paraMode: 'ONLYPARA' }), T('x  y ,z.\n\nu  v', { mode: 'TEXTLEVEL_ONLY' }), T('x  y ,z.\n\nu  v', { mode: 'ALL_BUT_TEXTLEVEL_ONLY' }), T('x  y ,z', { level: 'PICKY' }), T('x  y ,z', { tokenizeText: false })];
    const mk = (cleanOverlapping) => chunks([...cases, ...paraCases], CHUNK).map((ch) => ({ op: 'check-rules', args: { lang, classes: [def.cls], cleanOverlapping, cases: ch } }));
    // markup parts
    const parts = [
      { parts: [{ type: 'markup', text: '<b>' }, { type: 'text', text: 'Hello ,world  and (bracket' }, { type: 'markup', text: '</b>' }] },
      { parts: [{ type: 'text', text: 'One.' }, { type: 'markup', text: '<p>', interpretAs: '\n\n' }, { type: 'text', text: 'two  spaces ..' }] },
    ];
    write(`${name}-${lang}`, `check-rules ${lang}: ${name} (enabledOnly, clean-overlapping off); ${junit.length} JUnit literals + edge + corpus`, [...mk(false), { op: 'check-rules', args: { lang, classes: [def.cls], cleanOverlapping: false, cases: parts } }]);
    write(`${name}-${lang}-cleanOn`, `check-rules ${lang}: ${name} with default clean-overlapping ON (F35 flag)`, mk(true).slice(0, 1));
  }
}
console.log('X-RULES-CORE cases written');
