// Authors oracle/cases/X-BITEXT/*.json (inputs only). Ops bitext-*, ff-load: docs/review/F39-oracle.md.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';

const DIR = path.join(ROOT, 'oracle/cases/X-BITEXT');
rmSync(DIR, { recursive: true, force: true });
mkdirSync(DIR, { recursive: true });
const write = (name, description, ops) => writeFileSync(path.join(DIR, `${name}.json`), JSON.stringify({ kind: 'harness', clock: 'fixed', description, normalize: ['paths'], compare: 'jsonl', ops }, null, 1) + '\n');
const op = (o, args) => ({ op: o, args });

// ---- readers
const R = (kind, content, extra = {}) => op('bitext-reader', { kind, content, ...extra });
const longCell = 'x'.repeat(5000);
write('reader-tab', 'CORE-0290 TabBitextReader', [
  R('tab', 'This is not actual.\tTo nie jest aktualne.\nTest\tTest\nab\tVery strange data indeed, much longer than input\n', { encoding: 'UTF-8' }),
  R('tab', 'Hello\tHallo\n', { encoding: 'UTF-8' }),
  R('tab', 'Hello\tHallo', { encoding: 'UTF-8' }),
  R('tab', 'Hello\tHallo\r\nWorld\tWelt\r\n', { encoding: 'UTF-8' }),
  R('tab', 'Hello\tHallo\rWorld\tWelt\r', { encoding: 'UTF-8' }),
  R('tab', '', { encoding: 'UTF-8' }),
  R('tab', '\n', { encoding: 'UTF-8' }),
  R('tab', 'only one column\n', { encoding: 'UTF-8' }),
  R('tab', 'ok\tfine\nbroken line\nlater\tlines\n', { encoding: 'UTF-8' }),
  R('tab', 'ok\tfine\n\nlater\tlines\n', { encoding: 'UTF-8' }),
  R('tab', 'ok\tfine\n\t\n', { encoding: 'UTF-8' }),
  R('tab', 'a\t\n', { encoding: 'UTF-8' }),
  R('tab', '\tb\n', { encoding: 'UTF-8' }),
  R('tab', 'a\tb\tc\td\n', { encoding: 'UTF-8' }),
  R('tab', 'a\t\tc\n', { encoding: 'UTF-8' }),
  R('tab', 'Größe überprüfen äöüß\tCheck the size ÄÖÜ\nÀ la carte\tNach Karte\n', { encoding: 'UTF-8' }),
  R('tab', 'Emoji 😀 text\tText 😀 Emoji\n日本語の文\tJapanese sentence\n', { encoding: 'UTF-8' }),
  R('tab', 'Größe\tgrößer\n', { encoding: 'ISO-8859-1', writeEncoding: 'ISO-8859-1' }),
  R('tab', 'Größe\tgrößer\n', { encoding: 'UTF-8', writeEncoding: 'ISO-8859-1' }),
  R('tab', 'Größe\tgrößer\n', { encoding: 'ISO-8859-1', writeEncoding: 'UTF-8' }),
  R('tab', 'Größe\tgrößer\n', { writeEncoding: 'UTF-8' }),
  R('tab', 'Größe\tgrößer\n', { encoding: null, writeEncoding: 'UTF-8' }),
  R('tab', 'x\ty\n', { encoding: 'NO-SUCH-ENCODING' }),
  R('tab', '', { noFile: 'does-not-exist.txt', encoding: 'UTF-8' }),
  R('tab', '', { noFile: 'does-not-exist.txt' }),
  R('tab', `${longCell}\t${longCell}\nshort\tshort\n`, { encoding: 'UTF-8' }),
  R('tab', Array.from({ length: 300 }, (_, i) => `Source sentence number ${i}.\tZielsatz Nummer ${i}.`).join('\n') + '\n', { encoding: 'UTF-8', maxSteps: 400 }),
  R('tab', 'a b\tc d\n  \t  \n', { encoding: 'UTF-8' }),
  R('tab', 'He said "hi".\t„Hallo“ sagte er.\n', { encoding: 'UTF-8' }),
  R('tab', 'a b\tc d\ne\tf\n', { encoding: 'UTF-8' }),
  R('tab', 'a\tb\n', { encoding: 'UTF-8', maxSteps: 1 }),
  R('tab', '﻿BOM\tbom\n', { encoding: 'UTF-8' }),
]);
const H = '%20240101~120000\tUSER\t0\tEN-US\tHdr\tDE-DE\tHdr';
const wf = (n, s, t) => ['20240101~120000', 'USER', '0', 'EN-US', s, 'DE-DE', t, ''].slice(0, 7).join('\t') + (n ?? '');
write('reader-wordfast', 'CORE-0290 WordFastTMReader', [
  R('wordfast', '%20240101~120000\tUSER\t0\tEN-US\tHeader\tDE-DE\tHeader\n' + wf('', 'Hello world.', 'Hallo Welt.') + '\n' + wf('', 'Second one.', 'Zweite.') + '\n', { encoding: 'UTF-8' }),
  R('wordfast', 'header only line\n', { encoding: 'UTF-8' }),
  R('wordfast', '', { encoding: 'UTF-8' }),
  R('wordfast', H + '\n' + wf('', 'One.', 'Eins.') + '\n', { encoding: 'UTF-8' }),
  R('wordfast', H + '\n' + wf('', 'One.', 'Eins.'), { encoding: 'UTF-8' }),
  R('wordfast', H + '\r\n' + wf('', 'One.', 'Eins.') + '\r\n' + wf('', 'Two.', 'Zwei.') + '\r\n', { encoding: 'UTF-8' }),
  R('wordfast', H + '\ntoo\tfew\tcolumns\n', { encoding: 'UTF-8' }),
  R('wordfast', H + '\na\tb\tc\td\te\n', { encoding: 'UTF-8' }),
  R('wordfast', H + '\na\tb\tc\td\te\tf\n', { encoding: 'UTF-8' }),
  R('wordfast', H + '\na\tb\tc\td\te\tf\tg\n', { encoding: 'UTF-8' }),
  R('wordfast', H + '\na\tb\tc\td\te\tf\tg\th\ti\n', { encoding: 'UTF-8' }),
  R('wordfast', H + '\n\n', { encoding: 'UTF-8' }),
  R('wordfast', H + '\n' + wf('', 'Ä Größe überall.', 'Ünïcödé 😀') + '\n', { encoding: 'UTF-8' }),
  R('wordfast', H + '\n' + wf('', 'Größe', 'größer') + '\n', { encoding: 'ISO-8859-1', writeEncoding: 'ISO-8859-1' }),
  R('wordfast', H + '\n' + wf('', 'x'.repeat(4000), 'y'.repeat(4000)) + '\n', { encoding: 'UTF-8' }),
  R('wordfast', H + '\n' + wf('', 'ok', 'ok') + '\n' + 'bad\n' + wf('', 'after', 'after') + '\n', { encoding: 'UTF-8' }),
  R('wordfast', '', { noFile: 'missing.tm', encoding: 'UTF-8' }),
  R('wordfast', H + '\n' + wf('', 'Null enc.', 'Ohne.') + '\n', {}),
  R('wordfast', 'a\tb\tc\td\te\tf\tg\n' + wf('', 'data', 'Daten') + '\n', { encoding: 'UTF-8' }),
]);

// ---- builtin bitext rules
const pairsLen = [['Hello.', 'Hallo.'], ['Hello world, this is a test.', 'Hi.'], ['Hi.', 'Hallo Welt, dies ist ein Test mit vielen Wörtern.'], ['Hello', 'Hallo Welt, das ist lang genug'], ['aaaaaaaaaa', 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'],
  ['aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbb'], ['a', 'a'], ['abcd', 'abcdefghijkl'], ['abcdefghij', 'abc'], ['abcdefghij', 'abcd'], ['0123456789', '0123'], ['0123456789', '01234'], ['01234', '012'], ['abcde', 'ab'],
  ['The quick brown fox.', 'Der schnelle braune Fuchs.'], ['Größe.', 'Size is something.'], ['😀', 'Smiley'], ['😀😀😀😀', 'a'], ['', 'Hallo.'], ['Hello.', ''], ['', ''], ['   ', '   '], ['Hello.', 'H'], ['x'.repeat(2500), 'y'.repeat(1000)], ['x'.repeat(2500), 'y'.repeat(1001)], ['x'.repeat(300), 'y'.repeat(1000)], ['x'.repeat(301), 'y'.repeat(1000)],
  ['Satz mit\nZeilenumbruch.', 'Sentence.'], ['Tab\tsep.', 'Tab sep.'], ['Ein Satz. Zwei Sätze.', 'One.']];
const pairsPunct = [['Hello.', 'Hallo.'], ['Hello.', 'Hallo!'], ['Hello!', 'Hallo.'], ['Hello?', 'Hallo.'], ['Hello?', 'Hallo?'], ['Hello', 'Hallo.'], ['Hello.', 'Hallo'], ['Hello', 'Hallo'], ['Hello…', 'Hallo.'], ['Hello.', 'Hallo…'], ['Hello,', 'Hallo.'], ['Hello:', 'Hallo!'],
  ['Hello!', 'Hallo?'], ['Hello.', 'Hallo. '], ['Hello. ', 'Hallo.'], ['Hello.', 'Hallo ..'], ['Hello "quoted."', 'Hallo "zitiert".'], ['Hello.', '"Hallo."'], ['What?!', 'Was?!'], ['What?!', 'Was?'], ['What?', 'Was?!'], ['', 'Hallo.'], ['Hello.', '.'], ['.', 'Hallo.'], ['.', '.'], ['。', '.'], ['Hello。', 'Hallo.'], ['Größe!', 'Größe.'],
  ['Ein Satz. Noch einer!', 'One sentence. Another.'], ['Dots...', 'Punkte.'], ['Hello.\n', 'Hallo.'], ['Hello.', 'Hallo.\n']];
const pairsSame = [['Hello world.', 'Hello world.'], ['Hello world today.', 'Hello world today.'], ['Hello world today.', 'Hello world today!'], ['Hello world', 'Hello world'], ['Hello', 'Hello'], ['Hello you', 'Hello you'], ['Hello you all', 'Hello you all'], ['Hello  you  all', 'Hello you all'], ['Hello you all', 'hello you all'], ['Hello you all', 'Hello you all '],
  ['a b c', 'a b c'], ['a b', 'a b'], ['1 2 3 4', '1 2 3 4'], ['Das ist ein Satz.', 'Das ist ein Satz.'], ['Das ist ein Satz.', 'This is a sentence.'], ['', ''], ['Mitteilung Größe für alle', 'Mitteilung Größe für alle'], ['😀 😀 😀', '😀 😀 😀'], ['Hello, you all.', 'Hello, you all.'], ['Hello, you.', 'Hello, you.'], ['x y z.', 'x y z.'], ['It is.', 'It is.'], ['A-B C-D', 'A-B C-D'], ['Don\'t go there', 'Don\'t go there'], ['New York City', 'New York City'], ['http://a.b/c d e', 'http://a.b/c d e']];
for (const [name, rule, pairs] of [['DifferentLengthRule', 'DifferentLengthRule', pairsLen], ['DifferentPunctuationRule', 'DifferentPunctuationRule', pairsPunct], ['SameTranslationRule', 'SameTranslationRule', pairsSame]]) {
  write(`rule-${name}`, `CORE-0291 ${name}`, [
    op('bitext-rule', { rule, srcLang: 'en', trgLang: 'de', pairs }),
    op('bitext-rule', { rule, srcLang: 'de', trgLang: 'en', pairs: pairs.map(([a, b]) => [b, a]) }),
    op('bitext-rule', { rule, srcLang: 'en', trgLang: 'pl', pairs: pairs.slice(0, 12) }),
    op('bitext-rule', { rule, srcLang: 'fr', trgLang: 'en', pairs: pairs.slice(0, 12) }),
    op('bitext-rule', { rule, srcLang: 'en', trgLang: 'en', pairs: pairs.slice(0, 12) }),
  ]);
}

// ---- pattern bitext xml
const bx = (body, attrs = 'targetLang="de"') => `<?xml version="1.0" encoding="UTF-8"?>\n<rules ${attrs}>\n${body}\n</rules>\n`;
const rule1 = (id, src, trg, msg, ex = '') => `<category id="C1" name="Cat one"><rule lang="de" id="${id}" name="Name ${id}"><pattern><source lang="en">${src}</source><target>${trg}</target></pattern><message>${msg}</message>${ex}</rule></category>`;
const exs = '<example type="correct"><srcExample>There is a dog.</srcExample><trgExample>Es gibt einen Hund.</trgExample></example><example type="incorrect"><srcExample><marker>There is a</marker> dog.</srcExample><trgExample><marker>Da ist ein</marker> Hund.</trgExample></example>';
const thereIs = rule1('THERE_IS', '<token>there</token><token>is</token>', '<marker><token>da</token><token>ist</token></marker><token/>', 'Meinten Sie <suggestion>es gibt</suggestion>?', exs);
const pp = [['There is a dog.', 'Da ist ein Hund.'], ['There is a dog.', 'Es gibt einen Hund.'], ['Here is a dog.', 'Da ist ein Hund.'], ['there is', 'da ist ein'], ['There is a dog.', ''], ['', 'Da ist ein Hund.'], ['There is a dog. There is a cat.', 'Da ist ein Hund. Da ist eine Katze.'], ['THERE IS A DOG.', 'DA IST EIN HUND.']];
write('load-inline', 'CORE-0292 BitextPatternRuleLoader inline', [
  op('bitext-load', { mode: 'inline', xml: bx(thereIs), srcLang: 'en', trgLang: 'de', pairs: pp }),
  op('bitext-load', { mode: 'inline', xml: bx(thereIs + rule1('SECOND', '<token regexp="yes">cat|dog</token>', '<token>Katze</token>', 'Nachricht <suggestion>Kater</suggestion>'), 'targetLang="de"'), srcLang: 'en', trgLang: 'de', pairs: pp }),
  op('bitext-load', { mode: 'inline', xml: bx(''), srcLang: 'en', trgLang: 'de' }),
  op('bitext-load', { mode: 'inline', xml: bx('', 'targetLang="xx"') }),
  op('bitext-load', { mode: 'inline', xml: bx('', '') }),
  op('bitext-load', { mode: 'inline', xml: '' }),
  op('bitext-load', { mode: 'inline', xml: 'not xml at all' }),
  op('bitext-load', { mode: 'inline', xml: '<rules targetLang="de"><category id="A" name="b"><rule' }),
  op('bitext-load', { mode: 'inline', xml: bx(thereIs).replace('</rules>', '') }),
  op('bitext-load', { mode: 'inline', xml: bx(thereIs.replace('lang="en"', 'lang="zz"')) }),
  op('bitext-load', { mode: 'inline', xml: bx(thereIs.replace('<target>', '<target2>').replace('</target>', '</target2>')) }),
  op('bitext-load', { mode: 'inline', xml: bx(thereIs.replace('<source lang="en">', '<source>')) }),
  op('bitext-load', { mode: 'inline', xml: bx(rule1('NOEX', '<token>a</token>', '<token>b</token>', 'msg')), filename: 'äöü-name.xml' }),
  op('bitext-load', { mode: 'inline', xml: bx(rule1('MARK', '<token>a</token><token>b</token>', '<token>x</token><marker><token>y</token></marker><token>z</token>', 'msg <suggestion>\\1</suggestion>'), 'targetLang="de"'), srcLang: 'en', trgLang: 'de', pairs: [['a b', 'x y z'], ['a b', 'x y']] }),
  op('bitext-load', { mode: 'inline', xml: bx(rule1('UMLAUT', '<token>house</token>', '<token>Häuser</token>', 'Größe: <suggestion>Haus</suggestion>'), 'targetLang="de"'), srcLang: 'en', trgLang: 'de', pairs: [['a house', 'viele Häuser'], ['a house', 'Haus']] }),
  op('bitext-load', { mode: 'inline', xml: bx(rule1('DUP', '<token>a</token>', '<token>b</token>', 'm') + rule1('DUP', '<token>c</token>', '<token>d</token>', 'm2')), srcLang: 'en', trgLang: 'de', pairs: [['c', 'd'], ['a', 'b']] }),
  op('bitext-load', { mode: 'inline', xml: bx(rule1('REGEXBAD', '<token regexp="yes">(</token>', '<token>b</token>', 'm')) }),
  op('bitext-load', { mode: 'inline', xml: bx(rule1('PHRASE', '<token>a</token>', '<token>b</token>', 'm').replace('<category', '<phrases><phrase id="p"><token>b</token></phrase></phrases><category')) }),
  op('bitext-load', { mode: 'inline', xml: bx('<category id="X" name="n"></category>'), srcLang: 'en', trgLang: 'de' }),
]);
write('load-resource', 'CORE-0292 bitext.xml resources (pl, ru, gl)', [
  op('bitext-load', { mode: 'resource', name: '/pl/bitext.xml', srcLang: 'en', trgLang: 'pl', pairs: [['There is a dog.', 'Nie ma psa.'], ['There is no dog.', 'Nie ma psa.'], ['There is a dog.', 'Jest pies.']] }),
  op('bitext-load', { mode: 'resource', name: '/ru/bitext.xml', srcLang: 'en', trgLang: 'ru', pairs: [['I like it.', 'Мне нравится.'], ['He is a hotel.', 'Он отель.']] }),
  op('bitext-load', { mode: 'resource', name: '/gl/bitext.xml', srcLang: 'en', trgLang: 'gl', pairs: [['I like it.', 'Gústame.'], ['This is correct.', 'Isto é correcto.']] }),
  op('bitext-load', { mode: 'resource', name: '/de/bitext.xml' }),
  op('bitext-load', { mode: 'resource', name: '/nonexistent/bitext.xml' }),
]);

// ---- Tools.getBitextRules / checkBitext / selectBitextRules
const tp = [['This is a test.', 'Das ist ein Test.'], ['Hello.', 'Hallo!'], ['Hello world today.', 'Hello world today.'], ['Hi.', 'Das ist ein sehr langer Satz mit vielen Wörtern.'], ['Is this correct?', 'Ist das korrekt?'], ['I have a gift.', 'Ich habe ein Gift.'], ['He is a gymnasium.', 'Er ist ein Gymnasium.'], ['', 'Leer.'], ['Der Test', 'The test'], ['This are wrong.', 'Das sind falsch geschrieben Wörter']];
write('tools-bitext', 'CORE-0293 Tools.getBitextRules/checkBitext/selectBitextRules', [
  op('bitext-tools', { srcLang: 'en', trgLang: 'de', pairs: tp, brief: true }),
  op('bitext-tools', { srcLang: 'de', trgLang: 'en', pairs: tp.map(([a, b]) => [b, a]) }),
  op('bitext-tools', { srcLang: 'en', trgLang: 'pl', pairs: [['There is a dog.', 'Nie ma psa.'], ['Hello.', 'Cześć!'], ['I like actually.', 'Aktualnie lubię.']], detail: true }),
  op('bitext-tools', { srcLang: 'en', trgLang: 'ru', pairs: [['I like it.', 'Мне нравится.']] }),
  op('bitext-tools', { srcLang: 'en', trgLang: 'gl', pairs: [['I like it.', 'Gústame.']] }),
  op('bitext-tools', { srcLang: 'en', trgLang: 'fr', pairs: [['I am actually here.', 'Je suis actuellement ici.'], ['Hello.', 'Bonjour!']] }),
  op('bitext-tools', { srcLang: 'fr', trgLang: 'en', pairs: [['Je suis actuellement ici.', 'I am actually here.']] }),
  op('bitext-tools', { srcLang: 'en', trgLang: 'es', pairs: [['Hello.', 'Hola!']] }),
  op('bitext-tools', { srcLang: 'en', trgLang: 'en', pairs: [['Hello.', 'Hello.']] }),
  op('bitext-tools', { srcLang: 'xx', trgLang: 'de' }),
  op('bitext-tools', { srcLang: 'en', trgLang: 'de', select: { disabled: ['TRANSLATION_LENGTH'], enabled: [], enabledOnly: false }, pairs: tp.slice(0, 5) }),
  op('bitext-tools', { srcLang: 'en', trgLang: 'de', select: { disabled: ['TRANSLATION_LENGTH', 'SAME_TRANSLATION', 'NOPE'], enabled: [], enabledOnly: false }, pairs: tp.slice(0, 5) }),
  op('bitext-tools', { srcLang: 'en', trgLang: 'de', select: { disabled: [], enabled: ['SAME_TRANSLATION'], enabledOnly: true }, pairs: tp.slice(0, 5) }),
  op('bitext-tools', { srcLang: 'en', trgLang: 'de', select: { disabled: [], enabled: ['SAME_TRANSLATION', 'DIFFERENT_PUNCTUATION'], enabledOnly: true }, pairs: tp.slice(0, 5) }),
  op('bitext-tools', { srcLang: 'en', trgLang: 'de', select: { disabled: [], enabled: [], enabledOnly: true } }),
  op('bitext-tools', { srcLang: 'en', trgLang: 'de', select: { disabled: ['X'], enabled: ['SAME_TRANSLATION'], enabledOnly: false } }),
  op('bitext-tools', { srcLang: 'en', trgLang: 'de', extContent: bx(thereIs), pairs: [['There is a dog.', 'Da ist ein Hund.'], ['Hello.', 'Hallo.']] }),
  op('bitext-tools', { srcLang: 'en', trgLang: 'de', extContent: 'broken', pairs: [] }),
  op('bitext-tools', { srcLang: 'en', trgLang: 'de', extMissing: 'no-such-file.xml' }),
]);

// ---- false-friends.xml loading and loadPatternRules / loadFalseFriendRules
const ffxml = readFileSync(path.join(ROOT, 'oracle/java-src/languagetool-core/src/main/resources/org/languagetool/rules/false-friends.xml'), 'utf8');
function words(textLang, mt, n) {
  const out = [];
  const re = /<rule>\s*<pattern lang="([a-z]+)">\s*<token[^>]*>([^<\s]+)<\/token>\s*<\/pattern>\s*<translation lang="([a-z]+)">/g;
  let m;
  while ((m = re.exec(ffxml))) if (m[1] === textLang && m[3] === mt && /^[\p{L}-]+$/u.test(m[2])) out.push(m[2]);
  const step = Math.max(1, Math.floor(out.length / n));
  return out.filter((_, i) => i % step === 0).slice(0, n);
}
const frame = { en: (w) => `This is about the ${w} here.`, de: (w) => `Das ist ${w} hier.`, fr: (w) => `C'est ${w} ici.`, pl: (w) => `To jest ${w} tutaj.`, es: (w) => `Es ${w} aqui.`, sv: (w) => `Det ${w} här.` };
const ffPair = (lang, mt, n = 40) => {
  const ws = words(lang, mt, n);
  return op('ff-load', { lang, motherTongue: mt, kind: 'falsefriends', filename: '/org/languagetool/rules/false-friends.xml', brief: true, texts: ws.flatMap((w) => [frame[lang](w), w[0].toUpperCase() + w.slice(1) + '.']).concat(['', 'Nothing here.']) });
};
const ffOps = [['en', 'de'], ['de', 'en'], ['en', 'fr'], ['fr', 'en'], ['en', 'pl'], ['pl', 'en'], ['es', 'en'], ['en', 'es'], ['de', 'fr'], ['en', 'ja'], ['sv', 'en']].map(([l, m]) => ffPair(l, m));
write('ff-pairs', 'CORE-0300/0057 false-friends.xml per language pair', [
  ...ffOps,
  op('ff-load', { lang: 'en', motherTongue: 'de', kind: 'falsefriends', filename: '/org/languagetool/rules/false-friends.xml', texts: ['I want to become a doctor.', 'I will become a gift.'] }),
  op('ff-load', { lang: 'en', motherTongue: 'en', kind: 'falsefriends', filename: '/org/languagetool/rules/false-friends.xml', brief: true }),
  op('ff-load', { lang: 'en', motherTongue: null, kind: 'falsefriends', filename: '/org/languagetool/rules/false-friends.xml', brief: true }),
  op('ff-load', { lang: 'de', motherTongue: 'en', kind: 'falsefriends', filename: 'rules/false-friends.xml', brief: true }),
  op('ff-load', { lang: 'en', motherTongue: 'de', kind: 'falsefriends', filename: 'does-not-exist.xml', brief: true }),
  op('ff-load', { lang: 'en', motherTongue: null, kind: 'falsefriends', filename: 'does-not-exist.xml', brief: true }),
]);
const ffRule = (id, p, t, extra = '') => `<rulegroup id="${id}"><rule><pattern lang="en"><token>${p}</token></pattern><translation lang="de">${t}</translation></rule><rule><pattern lang="de"><token>${t}</token></pattern><translation lang="en">${p}</translation></rule>${extra}</rulegroup>`;
const ffDoc = (body) => `<?xml version="1.0" encoding="UTF-8"?>\n<rules>${body}</rules>\n`;
const ffI = (c, extra = {}) => op('ff-load', { lang: 'en', motherTongue: 'de', kind: 'falsefriends', filename: 'inline-ff.xml', content: c, ...extra });
write('ff-inline', 'CORE-0300 FalseFriendRuleLoader on small inline files', [
  ffI(ffDoc(ffRule('GIFT', 'gift', 'Gift')), { texts: ['A gift for you.', 'Gifts for you.', 'Nothing.'] }),
  ffI(ffDoc(ffRule('GIFT', 'gift', 'Gift') + ffRule('MULTI', 'actual', 'aktuell; derzeit, gegenwärtig')), { texts: ['The actual value.', 'a gift'] }),
  ffI(ffDoc(ffRule('UMLAUT', 'house', 'Haus, Häuser, Größe')), { texts: ['A house.'] }),
  ffI(ffDoc('')),
  ffI(''),
  ffI('garbage'),
  ffI('<rules><rulegroup id="X"><rule><pattern lang="en"><token>a</token></pattern>'),
  ffI(ffDoc('<rulegroup id="NOTR"><rule><pattern lang="en"><token>a</token></pattern></rule></rulegroup>')),
  ffI(ffDoc('<rulegroup id="NOPAT"><rule><translation lang="de">x</translation></rule></rulegroup>')),
  ffI(ffDoc('<rulegroup id="ONLYDE"><rule><pattern lang="de"><token>Gift</token></pattern><translation lang="en">poison</translation></rule></rulegroup>'), { texts: ['Gift.'] }),
  ffI(ffDoc('<rulegroup id="REGEXP"><rule><pattern lang="en"><token regexp="yes">gift(s|ed)</token></pattern><translation lang="de">Gabe</translation></rule></rulegroup>'), { texts: ['gifts', 'gifted', 'gift'] }),
  ffI(ffDoc('<rulegroup id="INFL"><rule><pattern lang="en"><token inflected="yes">give</token></pattern><translation lang="de">geben</translation></rule></rulegroup>'), { texts: ['He gave it.', 'gives'] }),
  ffI(ffDoc('<rulegroup id="PHR"><rule><pattern lang="en"><token>new</token><token>york</token></pattern><translation lang="de">Neu York</translation></rule></rulegroup>'), { texts: ['In New York.', 'new'] }),
  ffI(ffDoc('<rulegroup id="BADRX"><rule><pattern lang="en"><token regexp="yes">(</token></pattern><translation lang="de">x</translation></rule></rulegroup>')),
  ffI(ffDoc('<rulegroup id="MSG"><rule><pattern lang="en"><token>gift</token></pattern><translation lang="de">Gift</translation></rule></rulegroup>').replace('</rulegroup>', '<message>custom</message></rulegroup>')),
  ffI(ffDoc(ffRule('A1', 'x', 'y') + ffRule('A1', 'z', 'w')), { texts: ['x z'] }),
  ffI(ffDoc('<rulegroup id="EX"><rule><pattern lang="en"><token>gift</token></pattern><translation lang="de">Gift</translation><example type="incorrect" correction="present"><marker>gift</marker></example></rule></rulegroup>')),
  op('ff-load', { lang: 'en', motherTongue: 'de', kind: 'falsefriends', filename: 'dir/sub/ff-nested.xml', content: ffDoc(ffRule('GIFT', 'gift', 'Gift')), texts: ['gift'] }),
  op('ff-load', { lang: 'de', motherTongue: 'en', kind: 'falsefriends', filename: 'inline-ff.xml', content: ffDoc(ffRule('GIFT', 'gift', 'Gift')), texts: ['Das Gift.'] }),
]);
const prDoc = (rules) => `<?xml version="1.0" encoding="UTF-8"?>\n<rules lang="en"><category id="CAT" name="Cat">${rules}</category></rules>\n`;
const prI = (c, extra = {}) => op('ff-load', { lang: 'en', motherTongue: null, kind: 'pattern', filename: 'inline-rules.xml', content: c, ...extra });
write('load-pattern', 'CORE-0057 JLanguageTool#loadPatternRules (classpath first, then file system)', [
  prI(prDoc('<rule id="R1" name="r1"><pattern><token>foo</token></pattern><message>bad foo</message><example correction="bar"><marker>foo</marker></example></rule>'), { texts: ['a foo here', 'bar'] }),
  prI(prDoc('<rule id="R1" name="r1"><pattern><token>foo</token></pattern><message>bad foo</message></rule>'), { texts: ['a foo here'] }),
  prI(prDoc('')),
  prI(''),
  prI('<rules>'),
  op('ff-load', { lang: 'en', motherTongue: 'de', kind: 'pattern', filename: 'inline-rules.xml', content: prDoc('<rule id="R2" name="r2"><pattern><token>foo</token></pattern><message>m</message></rule>'), brief: true }),
  op('ff-load', { lang: 'en', motherTongue: null, kind: 'pattern', filename: 'x-test-rules.xml', brief: true }),
  op('ff-load', { lang: 'en', motherTongue: null, kind: 'pattern', filename: 'x-test-rules.xml', content: prDoc('<rule id="R3" name="r3"><pattern><token>foo</token></pattern><message>m</message></rule>'), brief: true }),
  op('ff-load', { lang: 'en', motherTongue: null, kind: 'pattern', filename: 'missing-rules.xml', brief: true }),
  op('ff-load', { lang: 'en', motherTongue: null, kind: 'pattern', filename: '/org/languagetool/rules/en/grammar.xml', brief: true }),
  op('ff-load', { lang: 'de', motherTongue: null, kind: 'pattern', filename: '/org/languagetool/rules/de/grammar.xml', brief: true }),
  op('ff-load', { lang: 'en', motherTongue: null, kind: 'pattern', filename: '/org/languagetool/rules/false-friends.xml', brief: true }),
  op('ff-load', { lang: 'en', motherTongue: null, kind: 'pattern', filename: '/org/languagetool/rules/en/', brief: true }),
  op('ff-load', { lang: 'en', motherTongue: null, kind: 'pattern', filename: '', brief: true }),
  op('ff-load', { lang: 'en', motherTongue: null, kind: 'pattern', filename: 'ünïcödé-rules.xml', content: prDoc('<rule id="R4" name="r4"><pattern><token>über</token></pattern><message>m</message></rule>'), texts: ['über'] }),
]);
console.log('X-BITEXT cases written');
