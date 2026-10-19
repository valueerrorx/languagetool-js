// Authors oracle/cases/X-SPELLRULE and X-HUNSPELL (inputs only). Ops sr-check/sr-word/sr-misc (SpellRuleOps) and hs-dict/hs-rule (HunspellOps): docs/review/F42-oracle.md, F43-oracle.md.
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';

const D1 = path.join(ROOT, 'oracle/cases/X-SPELLRULE');
const D2 = path.join(ROOT, 'oracle/cases/X-HUNSPELL');
for (const d of [D1, D2]) { rmSync(d, { recursive: true, force: true }); mkdirSync(d, { recursive: true }); }
const mk = (dir) => (name, description, ops) => writeFileSync(path.join(dir, `${name}.json`), JSON.stringify({ kind: 'harness', clock: 'fixed', description, normalize: ['paths'], compare: 'jsonl', ops }) + '\n');
const w1 = mk(D1), w2 = mk(D2);
const op = (o, args) => ({ op: o, args });
const RES = path.join(ROOT, 'resources/org/languagetool/resource');
const sha = (s) => createHash('sha1').update(s).digest('hex');
const shaSort = (a) => [...a].sort((x, y) => (sha(x) < sha(y) ? -1 : 1));
const chunks = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, (i + 1) * n));
let seed = 424242;
const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const ri = (n) => Math.floor(rnd() * n);
const ALPHA = { fr: 'abcdefghijklmnopqrstuvwxyzéèêàçùô', en: 'abcdefghijklmnopqrstuvwxyz', de: 'abcdefghijklmnopqrstuvwxyzäöüß' };
function typo(w, al) {
  const cs = [...w]; const k = ri(4); const i = ri(cs.length);
  if (k === 0) cs.splice(i, 0, al[ri(al.length)]);
  else if (k === 1 && cs.length > 1) cs.splice(i, 1);
  else if (k === 2 && cs.length > 1) { const j = Math.min(i, cs.length - 2); [cs[j], cs[j + 1]] = [cs[j + 1], cs[j]]; } else cs[i] = al[ri(al.length)];
  return cs.join('');
}
const lines = (f) => (existsSync(f) ? readFileSync(f, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')) : []);
const corpus = (l) => readFileSync(path.join(ROOT, `oracle/corpus/${l}/corpus.txt`), 'utf8');
const sentences = (l) => shaSort(corpus(l).split(/(?<=[.!?])\s+/).map((s) => s.replace(/\s+/g, ' ').trim()).filter((s) => s.length > 20 && s.length < 220));
const tokens = (l) => shaSort([...new Set([...corpus(l).matchAll(/[\p{L}\p{M}]+(?:['’\-][\p{L}\p{M}]+)*/gu)].map((m) => m[0]))]);
const pick = (a, n) => shaSort(a).slice(0, n);
const SPECIAL = ['', ' ', 'LanguageTool', 'LanguageTooler', 'languagetool', 'LanguageToolers', 'a', 'I', '-', '--', "'", '.', ',', '1', '1234', '12.5', '1,000', '3rd', '1990s', 'abc123', '123abc', '10%', '€5', '++', '...', '?!', '(', '©', 'http://languagetool.org', 'https://www.example.com/a/b?x=1', 'www.example.org', 'ftp://x.y/z', 'info@example.org', 'a@b', '@user', 'user@host', 'foo.bar', 'photo.jpg', 'Photo.JPG', 'archive.tar.gz', 'my-file_1.docx', 'x.exe', 'notes.txt', 'file.unknownext', 'x.md', 'well-known', 'half-baked-idea', "don't", 'don’t', "o'clock", 'McDonald', 'iPhone', 'eBay', 'camelCase', 'CamelCaseWord', 'getElementById', 'NASA', 'USA', 'HTML5', 'ABC', 'Abc', 'aBC', 'ABc', 'CAFÉ', 'Café', 'cafe', 'Naïve', 'Straße', 'STRASSE', 'Äpfel', 'ÄPFEL', 'Übel', 'schön', 'alot', 'incase', 'noone', 'abouta', 'thehouse', 'dasHaus', 'zuhause', 'ichbin', 'Haus-', '-Haus', '-hous', '--hous', 'Ha-us', 'a😀b', '😀', 'ab\uD800cd', '\uD800', 'tab\tchar', 'new\nline', 'x'.repeat(50), 'x'.repeat(199), 'x'.repeat(200), 'x'.repeat(201), 'x'.repeat(300), 'house'.repeat(30), 'ä'.repeat(120), 'Haus'.repeat(70), 'ЯЗЫК', 'язык', '日本語', 'ελληνικά', 'العربية', 'ñandú', 'İstanbul', 'ǅ', 'ﬁne', 'Æsir'];
const FILES = ['photo.jpg', 'report.docx', 'archive.tar.gz', 'index.html', 'script.js', 'data.csv', 'readme.md', 'setup.exe', 'song.mp3', 'my-file_2.pdf'];

// ---------- X-SPELLRULE ----------
const ENV = [
  { lang: 'en-US', id: 'MORFOLOGIK_RULE_EN_US', l: 'en', full: true },
  { lang: 'en-GB', id: 'MORFOLOGIK_RULE_EN_GB', l: 'en', full: true },
  { lang: 'en-AU', id: 'MORFOLOGIK_RULE_EN_AU', l: 'en', full: false },
  { lang: 'en-CA', id: 'MORFOLOGIK_RULE_EN_CA', l: 'en', full: false },
  { lang: 'en-NZ', id: 'MORFOLOGIK_RULE_EN_NZ', l: 'en', full: false },
  { lang: 'en-ZA', id: 'MORFOLOGIK_RULE_EN_ZA', l: 'en', full: false },
];
const enIgnore = lines(path.join(RES, 'en/hunspell/ignore.txt'));
const enProhibit = lines(path.join(RES, 'en/hunspell/prohibit.txt'));
const enSpelling = lines(path.join(RES, 'en/hunspell/spelling.txt'));
const enTok = tokens('en');
const enSent = sentences('en');
const enWords = [...SPECIAL, ...FILES, ...pick(enIgnore, 70), ...pick(enProhibit, 40), ...pick(enSpelling.map((l) => l.replace(/\/.*$/, '')), 40), ...lines(path.join(RES, 'en/hunspell/spelling_en-US.txt')).slice(0, 15), ...enTok.slice(0, 80), ...enTok.slice(80, 160).map((t) => typo(t, ALPHA.en)), ...enTok.slice(160, 180).map((t) => t.toUpperCase()), ...enTok.slice(180, 200).map((t) => t[0].toUpperCase() + t.slice(1))];
const LISTS = [['This', 'is', 'a', 'test'], ['a', 'lot', 'of', 'things'], ['New', 'York', 'City'], ['well', '-', 'known'], ['foo', '.', 'jpg'], [], ['x'], ['http', '://', 'a.b'], ['e', '-', 'mail'], ['can', 'not', 'go']];
for (const e of ENV) {
  const ws = e.full ? enWords : enWords.slice(0, 160);
  const reqs = chunks(ws, 25).map((c, i) => op('sr-word', { lang: e.lang, id: e.id, words: c, sugg: i % 2 === 0 || undefined, ...(i === 0 ? { lists: LISTS.map((words) => ({ words })) } : {}) }));
  w1(`words-${e.lang}`, `SpellingCheckRule word lists / ignore logic / Morfologik suggestions ${e.lang}`, reqs);
}
w1('words-opts-en-US', 'ignoreTokens, acceptPhrases, considerIgnoreWords=false, user dictionary words (en-US)', [
  op('sr-word', { lang: 'en-US', id: 'MORFOLOGIK_RULE_EN_US', words: ['tset', 'foo', 'bar', 'foobar', 'Foo', 'FOO', 'Baz', 'New Yorkk', 'zzz', 'qux', 'quxs', 'xyzzy'], ignoreTokens: ['foo', 'Baz', 'zzz', ''], sugg: true, lists: [{ words: ['New', 'Yorkk', 'is', 'big'] }, { words: ['foo', 'bar', 'baz'] }] }),
  op('sr-word', { lang: 'en-US', id: 'MORFOLOGIK_RULE_EN_US', words: ['tset', 'foo', 'Yorkk', 'New', 'xyzzy plugh', 'plugh'], acceptPhrases: ['New Yorkk', 'xyzzy plugh', 'Foo Bar Baz', 'single', '', ' spaced  phrase '], lists: [{ words: ['New', 'Yorkk', 'is', 'big'] }, { words: ['xyzzy', 'plugh', 'x'] }, { words: ['Foo', 'Bar', 'Baz', 'Qux'] }] }),
  op('sr-word', { lang: 'en-US', id: 'MORFOLOGIK_RULE_EN_US', words: ['ad-on', 'al', 'easter', 'LanguageTool', 'LanguageTooler', 'foo', 'http://x.y', 'a@b.c'], considerIgnore: false }),
  op('sr-word', { lang: 'en-US', id: 'MORFOLOGIK_RULE_EN_US', words: ['tset', 'mydictword', 'MyDictWord', 'mydictwords', 'Müller', 'zzyx'], userWords: ['mydictword', 'Müller', 'zzyx'], sugg: true }),
  op('sr-word', { lang: 'en-US', id: 'MORFOLOGIK_RULE_EN_US', words: ['tset', 'mydictword', 'zzyx'], userWords: ['mydictword', 'zzyx'], userCache: 100, userName: 'oracle-user-1', sugg: true }),
  op('sr-word', { lang: 'en-US', id: 'MORFOLOGIK_RULE_EN_US', words: ['tset', 'mydictword', 'zzyx'], userWords: [], sugg: true }),
  op('sr-word', { lang: 'en-US', id: 'NO_SUCH_RULE', words: ['x'] }),
]);
w1('filter-en-US', 'SpellingCheckRule#filterSuggestions / filterNoSuggestWords / expandLine (en-US, en-GB)', ['en-US', 'en-GB'].map((lang) => op('sr-word', {
  lang, id: lang === 'en-US' ? 'MORFOLOGIK_RULE_EN_US' : 'MORFOLOGIK_RULE_EN_GB', words: ['x'],
  expand: ['', 'foo', 'foo/S', 'foo/', '/S', 'foo bar/S', 'Teresa von Ávila/S', 'foo/XY', 'a/Z b', '  spaced  ', 'ünï/S', 'x/ä'],
  filter: [[], ['foo'], ['foo', 'foo', 'bar'], ...pick(enProhibit, 8).map((p) => [p, 'house', p, 'hous']), [...pick(enProhibit, 6), 'ok'], ['LanguageTool', 'languagetool'], ['a b', 'a  b', 'ab', ''], ['x', 'X', 'x']],
})));
// rule matches
const SENT_TYPOS = (l, sents, n) => sents.slice(0, n).map((s) => {
  const toks = [...s.matchAll(/[\p{L}]{4,}/gu)].map((m) => m[0]);
  let t = s;
  if (toks.length) { const k = toks[ri(toks.length)]; t = t.replace(k, typo(k, ALPHA[l])); }
  if (toks.length > 3 && ri(2) === 0) { const k = toks[ri(toks.length)]; t = t.replace(k, typo(k, ALPHA[l])); }
  return t;
});
const SPECIAL_SENT_EN = [
  'Visit http://languagetool.org or https://www.example.com/a/b?x=1 now.', 'Mail me at info@example.org or foo.bar@example.co.uk, please.', 'The file photo.jpg and archive.tar.gz were not report.docx.', 'Open index.html, script.js and unknownfile.zzz today.',
  'He uses camelCase and getElementById and iPhone and eBay daily.', 'NASA and NATO and HTML5 and USA are all-caps words.', 'The a lot alot of things, in case incase, noone knows.', 'Tset the speller with teh word hous and 123abc and abc123.',
  'We went to the half-baked-idea and well-knwon places.', "Don't dont don’t o'clock oclock.", 'LanguageTool and LanguageTooler and Languagetool are brands.', 'Café cafe naive Naïve naïvve resume résumé.',
  'The color colour favorite favourite center centre organize organise.', 'x'.repeat(210) + ' is long.', 'house'.repeat(30) + ' is longer.', 'A\tB  C    D   speling.', 'He said "tset" and (tset) and [tset] and “tset”.',
  '1st 2nd 3rd 4th 21st 1990s 90s 5th-grade 10th-', 'A mispelled wrod at the start. Wrod at sentence start. Another sentnce.', 'Tset.', 'tset', '', ' ', 'Hello,wrold!How are you?Fine.', 'Dr. Smth and Mr. Jhon met Mrs. Brwon.',
  'I live in New Yrok and Los Angelos and San Fransisco.', 'The mouse-click and e-mail and email and E-Mail and e-mial.', 'ad-on ad-ons easter al de i aint arent', 'anArtificialTestWordForLanguageTool is ignored.', 'Smilies 😀 and tset 😀 tset.',
  'Das ist ein deutscher Satz mit Fehlern.', 'Привет мир and bonjour le monde and tset.', 'I ’ve seen ‘tset’ and ‘teh’.', 'wasnt hasnt isnt couldnt shouldnt wouldnt.', 'a-b a- -b a--b - -- --- tset-tset',
];
for (const e of ENV.filter((x) => x.full)) {
  const ss = SENT_TYPOS('en', enSent.slice(0, 120), 120);
  chunks(ss, 30).forEach((c, i) => w1(`check-${e.lang}-${String(i).padStart(2, '0')}`, `${e.id} matches over corpus sentences with seeded typos (${e.lang})`, [op('sr-check', { lang: e.lang, ids: [e.id], cases: c.map((text) => ({ text })) })]));
  w1(`check-special-${e.lang}`, `${e.id} matches: URLs, e-mails, file names, camelCase, caps, digits, emoji, long tokens (${e.lang})`, [
    op('sr-check', { lang: e.lang, ids: [e.id], cases: SPECIAL_SENT_EN.map((text) => ({ text })) }),
    op('sr-check', { lang: e.lang, ids: [e.id], cases: SPECIAL_SENT_EN.slice(0, 12).map((text) => ({ text, level: 'PICKY' })) }),
    op('sr-check', { lang: e.lang, ids: [e.id], cases: [{ text: 'tset one.\n\ntset two.', paraMode: 'NORMAL' }, { text: 'tset ' + 'wrod '.repeat(60) }] }),
  ]);
  w1(`check-user-${e.lang}`, `${e.id} matches with user dictionary words, ignoreTokens, acceptPhrases (${e.lang})`, [
    op('sr-check', { lang: e.lang, ids: [e.id], userWords: ['mydictword', 'Müller', 'zzyx'], cases: [{ text: 'The mydictword and Müller and zzyx and tset words.' }, { text: 'Mydictword MYDICTWORD mydictwords zzyxs.' }, { text: 'mydictwrd is close to zzyxx.' }] }),
    op('sr-check', { lang: e.lang, ids: [e.id], userWords: ['mydictword'], userCache: 100, userName: 'oracle-user-2', cases: [{ text: 'The mydictword and tset words.' }, { text: 'mydictwrd' }] }),
    op('sr-check', { lang: e.lang, ids: [e.id], ignoreTokens: ['tset', 'foo'], cases: [{ text: 'tset foo bar wrod.' }, { text: 'Tset Foo.' }] }),
    op('sr-check', { lang: e.lang, ids: [e.id], acceptPhrases: ['New Yrok', 'wrod tset', 'foo bar'], cases: [{ text: 'I live in New Yrok. Foo bar and wrod tset and wrod.' }, { text: 'new yrok' }] }),
    op('sr-check', { lang: e.lang, ids: [e.id], considerIgnore: false, cases: [{ text: 'ad-on al easter anArtificialTestWordForLanguageTool LanguageTool.' }] }),
  ]);
}
for (const e of ENV.filter((x) => !x.full)) w1(`check-${e.lang}`, `${e.id} matches (${e.lang})`, [op('sr-check', { lang: e.lang, ids: [e.id], cases: [...SENT_TYPOS('en', enSent.slice(120, 140), 20), ...SPECIAL_SENT_EN.slice(0, 10)].map((text) => ({ text })) })]);

// fr: MorfologikFrenchSpellerRule (FR_SPELLING_RULE)
{
  const frIgnore = lines(path.join(RES, 'fr/hunspell/ignore.txt')), frProhibit = lines(path.join(RES, 'fr/hunspell/prohibit.txt')), frSpelling = lines(path.join(RES, 'fr/hunspell/spelling.txt')).map((l) => l.replace(/\/.*$/, ''));
  const frTok = tokens('fr'), frSent = sentences('fr');
  const FR_SPECIAL = ["l'homme", 'l’homme', "aujourd'hui", "jusqu'à", "qu'il", 'c’est', "n'est-ce", 'peut-être', 'est-ce', 'dit-il', 'a-t-il', 'vingt-et-un', 'Saint-Étienne', 'quarante-deux', 'e-mail', 'Qu’est-ce', 'œuvre', 'oeuvre', 'cœur', 'coeur', 'Œdipe', 'ÉCOLE', 'école', 'ecole', 'Ecole', 'à', 'a', 'où', 'ou', 'là', 'la'];
  const ws = [...SPECIAL, ...FR_SPECIAL, ...pick(frIgnore, 40), ...pick(frProhibit, 40), ...pick(frSpelling, 40), ...frTok.slice(0, 100), ...frTok.slice(100, 180).map((t) => typo(t, ALPHA.fr)), ...frTok.slice(180, 200).map((t) => t.toUpperCase())];
  w1('words-fr', 'SpellingCheckRule word lists / ignore logic / Morfologik suggestions fr (FR_SPELLING_RULE)', chunks(ws, 25).map((c, i) => op('sr-word', { lang: 'fr', id: 'FR_SPELLING_RULE', words: c, sugg: i % 2 === 0 || undefined, ...(i === 0 ? { lists: LISTS.map((words) => ({ words })) } : {}) })));
  chunks(SENT_TYPOS('fr', frSent.slice(0, 60), 60), 30).forEach((c, i) => w1(`check-fr-${String(i).padStart(2, '0')}`, 'FR_SPELLING_RULE matches over corpus sentences with seeded typos', [op('sr-check', { lang: 'fr', ids: ['FR_SPELLING_RULE'], cases: c.map((text) => ({ text })) })]));
  w1('check-special-fr', 'FR_SPELLING_RULE matches: URLs, apostrophes, hyphens, file names, user words', [
    op('sr-check', { lang: 'fr', ids: ['FR_SPELLING_RULE'], cases: [...SPECIAL_SENT_EN.slice(0, 12), "L'homme et l’homme aujourd'hui, jusqu'à qu'il c’est.", 'Peut-être est-ce dit-il a-t-il vingt-et-un Saint-Étienne.', 'Le cœur et le coeur, l’œuvre et l’oeuvre, ÉCOLE ecole.', 'Mon ami a mangé des pomes et des poirres.', 'Tset.', ''].map((text) => ({ text })) }),
    op('sr-check', { lang: 'fr', ids: ['FR_SPELLING_RULE'], userWords: ['mondico', 'zzyx'], cases: [{ text: 'Le mondico et zzyx et mondicos et tset.' }] }),
    op('sr-check', { lang: 'fr', ids: ['FR_SPELLING_RULE'], ignoreTokens: ['tset'], acceptPhrases: ['pomes rouges'], cases: [{ text: 'Des pomes rouges et tset et pomes.' }] }),
  ]);
}
// fr probe: other rule ids
w1('fr-probe', 'French speller rule lookup (id variants)', [
  op('sr-word', { lang: 'fr', id: 'FR_SPELLING_RULE', words: ['maison', 'maizon'], sugg: true }),
  op('sr-word', { lang: 'fr', id: 'MORFOLOGIK_RULE_FR_FR', words: ['maison', 'maizon'], sugg: true }),
  op('sr-check', { lang: 'fr', ids: ['FR_SPELLING_RULE', 'MORFOLOGIK_RULE_FR_FR'], cases: [{ text: 'La maizon est belle.' }] }),
  op('sr-misc', { kind: 'vague', lang: 'fr', words: ['maison', 'maizon'] }),
]);
// misc
w1('misc-filetypes', 'CommonFileTypes suffix pattern (CORE-0240)', [op('sr-misc', { kind: 'filetypes', words: [...FILES, 'a.JPG', '.jpg', 'jpg', 'a.', 'a.b', '.', '', 'file.tar.gz', 'file.TAR.GZ', 'äöü-1.docx', 'Straße.pdf', 'a b.jpg', 'a/b.jpg', 'a\\b.jpg', 'x.jpgg', 'x.jp', 'x.c', 'x.cs', 'x.h', 'x.ai', 'x.woff2', 'x.sketch', 'http://x.y/z.png', '(a).png', 'a.png.', 'a..png', '...png', 'é.png', 'ç.png', 'ж.png', 'a\n.png'] })]);
w1('misc-vague', 'VagueSpellChecker#isValidWord (CORE-0239)', [
  ...[['en-US', enTok.slice(0, 30)], ['en-GB', enTok.slice(30, 50)], ['de-DE', tokens('de').slice(0, 30)], ['de-AT', tokens('de').slice(30, 50)], ['de-CH', tokens('de').slice(50, 60)]].map(([lang, ws]) => op('sr-misc', { kind: 'vague', lang, words: [...ws, ...ws.slice(0, 10).map((t) => typo(t, ALPHA[lang.startsWith('de') ? 'de' : 'en'])), 'LanguageTool', 'x', '', '123', 'http://a.b', 'a@b.cc', 'tset', 'Haus', 'hous'] })),
  op('sr-misc', { kind: 'vague', lang: 'xx-nonexistent', words: ['x'] }),
]);
const mt = lines(path.join(RES, 'de/multitoken-suggest.txt')).map((l) => l.replace(/\t.*$/, '').replace(/\/.*$/, ''));
const mtWords = pick(mt, 60);
w1('misc-multitoken', 'MultitokenSpeller#getSuggestions per language (CORE-0237)', [
  ...chunks([...mtWords, ...mtWords.slice(0, 40).map((t) => typo(t, ALPHA.de)), ...mtWords.slice(0, 20).map((t) => t.toLowerCase()), ...mtWords.slice(0, 10).map((t) => t.replace(/ /g, '')), ...mtWords.slice(0, 10).map((t) => t.replace(/ /g, '-')), 'Mercedes Benz', 'mercedes-benz', 'Frank Walter Steinmaier', 'Franz Walter Steinmaier', 'Hans Mueller', '', 'a', 'a b', 'x'.repeat(100)], 40).map((c) => op('sr-misc', { kind: 'multitoken', lang: 'de', words: c })),
  ...['en', 'fr', 'es', 'pt', 'ca', 'nl', 'it', 'xx'].map((lang) => op('sr-misc', { kind: 'multitoken', lang, words: ['New Yorkk', 'new york', 'Unitd States', 'Los Angelos', 'Mercedes Benz', 'Sao Paulo', 'Saint Etienne', 'Rio de Janero', 'Pariss', 'Hans Mueller', 'a b', ''] })),
]);
const SYM = ['the 23135851162', 'of 13151942776', 'and 12997637966', 'to 12136980858', 'a 9081174698', 'in 8469404971', 'for 5933321709', 'is 4705743816', 'on 3750423199', 'that 3400031103', 'by 3350048871', 'this 3228469771', 'with 3183110675', 'house 80000', 'horse 70000', 'mouse 60000', 'hose 5000', 'hello 90000', 'world 95000', 'quick 4000', 'brown 5000', 'fox 3000', 'jumps 2000', 'over 40000', 'lazy 1000', 'dog 30000', 'where 50000', 'there 60000', 'their 61000', 'receive 3000', 'believe 3100', 'separate 2100', 'definitely 1500', 'rhythm 1200', 'accommodate 800', 'ü 5', 'straße 700', 'hello 10'];
const SYMW = ['hose', 'thehouse', 'helo', 'wrold', 'quikc', 'recieve', 'beleive', 'seperate', 'definately', 'rythm', 'acommodate', 'whereis', 'theirhouse', 'thequickbrownfox', 'hello world', 'hello wrold', 'the quikc brown fox', 'jumpsoverthelazydog', 'strasse', 'straße', 'üü', '', 'x', 'a'.repeat(30), 'the', 'THE', 'The', 'hose house', 'bi g'];
w1('misc-symspell', 'SymSpell lookup / lookupCompound / wordSegmentation (CORE-0238), inline dictionary', [
  ...[[1, 7, 1], [2, 7, 1], [2, 5, 2], [3, 7, 1], [0, 7, 1], [2, 7, 3]].map(([maxDist, prefix, threshold]) => op('sr-misc', { kind: 'symspell', maxDist, prefix, threshold, lines: SYM, termIdx: 0, countIdx: 1, words: SYMW })),
  op('sr-misc', { kind: 'symspell', maxDist: 2, prefix: 7, threshold: 1, lines: ['the', 'a b', 'x 1 2', '', 'bad notanumber', 'ok 5'], termIdx: 0, countIdx: 1, words: ['ok', 'the', 'bad'] }),
  op('sr-misc', { kind: 'symspell', maxDist: 2, prefix: 7, threshold: 1, lines: SYM.map((l) => l.split(' ').reverse().join(' ')), termIdx: 1, countIdx: 0, words: ['hose', 'helo'] }),
  op('sr-misc', { kind: 'symspell', maxDist: 2, prefix: 7, threshold: 1, lines: SYM, termIdx: 5, countIdx: 0, words: ['hose'] }),
  op('sr-misc', { kind: 'symspell', maxDist: 2, prefix: 3, threshold: 1, lines: SYM, termIdx: 0, countIdx: 1, words: ['hose'] }),
  op('sr-misc', { kind: 'symspell', maxDist: -1, prefix: 7, threshold: 1, lines: SYM, termIdx: 0, countIdx: 1, words: ['hose'] }),
]);
w1('misc-foreign', 'ForeignLanguageChecker#check thresholds (CORE-0239; no language identifier model in the build)', [op('sr-misc', {
  kind: 'foreign', cases: [[3, 1], [3, 2], [3, 0], [2, 2], [10, 4], [10, 5], [0, 0], [1, 1], [4, 2], [4, 3]].flatMap(([length, matches]) => [{ lang: 'en', sentence: 'Das ist ein kleiner Test.', length, matches, preferred: ['en', 'de'] }, { lang: 'de', sentence: 'This is a small test.', length, matches, preferred: [] }]),
})]);

// ---------- X-HUNSPELL ----------
const deTok = tokens('de');
const deSent = sentences('de');
const COMP = ['Donaudampfschiffahrtsgesellschaft', 'Donaudampfschiff', 'Rindfleischetikettierungsüberwachungsaufgabenübertragungsgesetz', 'Haustür', 'Haustuer', 'Hausstür', 'Hausturm', 'Kuchenteller', 'Kuchenteler', 'Tischlampe', 'Tischlampen', 'Lampentisch', 'Bundesregierung', 'Bundesregirung', 'Weihnachtsbaumschmuck', 'Weihnachtsbaumschmuk', 'Autobahnraststätte', 'Autobahnraststaette', 'Computerspielentwickler', 'Computerspielentwickelr', 'Wasserflasche', 'Waserflasche', 'Apfelbaumblatt', 'Apfelbaumblat', 'Handschuhfach', 'Handschufach', 'Zahnarztpraxis', 'Zahnartzpraxis', 'Krankenversicherungskarte', 'Krankenversicherungskarte', 'Feuerwehrmann', 'Feuerwehrman', 'Sonnenblumenöl', 'Sonnenblumenoel', 'Bäckereifachverkäuferin', 'Bäckereifachverkaeuferin', 'Fußballweltmeisterschaft', 'Fussballweltmeisterschaft', 'Fußballweltmeisterschaftsendspiel', 'Schiffahrt', 'Schifffahrt', 'Schiffahrtskapitän', 'Schifffahrtskapitän', 'Kaffeemaschine', 'Kaffemaschine', 'Kaffee-Maschine', 'Kaffee-Maschinen', 'Haus-Tür', 'Haus-tür', 'haus-Tür', 'Tür-Haus', 'USB-Stick', 'USB-Sticks', 'USB-stick', 'E-Mail', 'E-Mails', 'e-mail', 'Email', 'Wi-Fi', 'Auto-Bahn', 'Bahn-Hof', 'Bahnhof', 'Bahnhoff', 'Hochschulabsolvent', 'Hochschulabsolvet', 'Abfallentsorgung', 'Abfalentsorgung', 'Gesundheitsministerium', 'Gesundheitsminsterium'];
const DESPECIAL = ['', ' ', 'LanguageTool', 'x', '-', 'Haus-', '-Haus', 'ß', 'Ä', 'ÄÖÜ', 'Straße', 'STRASSE', 'Strasse', 'Fuss', 'Fuß', 'heißen', 'heissen', 'Mueller', 'Müller', 'Muller', 'Schön', 'schoen', 'Bauern', 'bauern', 'Bayern', 'hause', 'zuhause', 'zu Hause', 'ichbin', 'dasHaus', 'Hause', 'abc123', '123abc', '1.', '3te', '3-te', '3.', '3-jährig', '3-Jährige', '10er', 'ABC', 'NATO-Staaten', 'EU-Länder', 'bzw', 'bzw.', 'z.B.', 'usw.', 'Dr.', 'Prof.-Dr.', 'x'.repeat(70), 'Haus'.repeat(30), 'ä'.repeat(60), 'a😀b', '\uD800', 'tab\tchar', 'ǅ', 'İstanbul', 'ﬁnden', 'ſchön', 'déjà', 'Café', 'naïve', 'Zoë', 'Łódź', 'Ångström', 'ǆ', 'Ab-', "Opa's", 'Opa’s', "geht's", 'geht’s', "l'homme", 'm²', '5%', '€', 'e.V.', 'GmbH', 'Gmbh', 'gmbh'];
const deAll = [...DESPECIAL, ...COMP, ...deTok.slice(0, 200), ...deTok.slice(200, 400).map((t) => typo(t, ALPHA.de)), ...deTok.slice(400, 440).map((t) => t.toUpperCase()), ...deTok.slice(440, 480).map((t) => t.toLowerCase()), ...deTok.slice(480, 520).map((t) => t[0].toUpperCase() + t.slice(1))];
const DEV = [
  { c: 'DE', lang: 'de-DE', dict: 'de_DE', id: 'GERMAN_SPELLER_RULE', n: 1 },
  { c: 'AT', lang: 'de-AT', dict: 'de_AT', id: 'AUSTRIAN_GERMAN_SPELLER_RULE', n: 0.5 },
  { c: 'CH', lang: 'de-CH', dict: 'de_CH', id: 'SWISS_GERMAN_SPELLER_RULE', n: 0.5 },
];
for (const v of DEV) {
  const ws = deAll.slice(0, Math.round(deAll.length * v.n));
  w2(`dict-${v.lang}`, `Hunspell dictionary spell/suggest ${v.dict}`, chunks(ws, 20).map((c) => op('hs-dict', { language: v.dict, prefix: '/de/hunspell/', words: c })));
  w2(`rule-${v.lang}`, `${v.id}#isMisspelled / getSuggestions`, chunks(deAll.slice(0, Math.round(deAll.length * v.n * 0.5)), 20).map((c) => op('hs-rule', { lang: v.lang, id: v.id, words: c, sugg: true })));
}
const deIgnore = lines(path.join(RES, 'de/hunspell/ignore.txt'));
const deProhibit = lines(path.join(RES, 'de/hunspell/prohibit.txt'));
const deSpelling = lines(path.join(RES, 'de/hunspell/spelling.txt')).map((l) => l.replace(/\/.*$/, ''));
for (const v of DEV) {
  const ws = [...DESPECIAL.slice(0, 60), ...pick(deIgnore, 50), ...pick(deProhibit, 50), ...pick(deSpelling, 50), ...pick(lines(path.join(RES, `de/hunspell/spelling-de-${v.c === 'DE' ? 'AT' : v.c}.txt`)), 20)];
  w2(`words-${v.lang}`, `SpellingCheckRule lists / ignore logic for ${v.id}`, chunks(ws, 25).map((c, i) => op('sr-word', { lang: v.lang, id: v.id, words: c, sugg: i % 3 === 0 || undefined, ...(i === 0 ? { lists: [['Das', 'ist', 'ein', 'Test'], ['Haus', '-', 'Tür'], ['3', '.', 'Stock'], ['z', '.', 'B', '.'], []].map((words) => ({ words })) } : {}) })));
  const ss = deSent.slice(v.c === 'DE' ? 0 : v.c === 'AT' ? 40 : 60, v.c === 'DE' ? 40 : v.c === 'AT' ? 60 : 80);
  w2(`check-${v.lang}`, `${v.id} matches over corpus sentences with seeded typos`, [op('sr-check', { lang: v.lang, ids: [v.id], cases: SENT_TYPOS('de', ss, ss.length).map((text) => ({ text })) })]);
}
w2('check-special-de-DE', 'GERMAN_SPELLER_RULE matches: URLs, compounds, hyphens, digits, abbreviations, user dictionary, ignore/accept lists', [
  op('sr-check', { lang: 'de-DE', ids: ['GERMAN_SPELLER_RULE'], cases: [
    'Besuchen Sie http://languagetool.org oder https://www.example.de/a/b?x=1 jetzt.', 'Schreib mir an info@example.org oder foo.bar@example.co.at, bitte.', 'Die Datei foto.jpg und archiv.tar.gz und bericht.docx.', 'Das Donaudampfschiffahrtsgesellschaft und die Haustuer sind falsch geschrieben.',
    'Der Kaffee-Maschine und die Kaffemaschine und Kaffee-Maschinen.', 'Das USB-Stick und der E-Mail und die Wi-Fi und die Auto-Bahn.', 'Ich wohne in der 3-Zimmer-Wohnung im 3. Stock, 10er Pack, 3te, 3-jährig.',
    'Das ist Fussball und Fußball und Schiffahrt und Schifffahrt und Strasse.', 'Dr. Mueller und Prof. Müller und z.B. bzw. usw. e.V. GmbH Gmbh.', 'Er sagt "Haus-Tür" und (Hausstür) und [Hausturm].',
    'LanguageTool und LanguageTooler und Languagetool.', 'x'.repeat(210) + ' ist lang.', 'Haus'.repeat(40) + ' ist länger.', 'Das ist ein Sätzchen. das ist klein. Und noch eins', 'Ein Wort mit 😀 Emoji und Tippfehlr.', 'Mit Opa\'s Auto und geht’s los, aber geht’s nicht.', 'Hause zuhause zu Hause ichbin dasHaus.', '', ' ', 'Tset.', 'Schöne Grüsse aus Zürich und Wien und Bern, ß ss.',
    'ab-', '-ab', 'Haus-', '-Haus', 'Haus--Tür', 'Haus-Tür-Schloss-Schlüssel-Kasten-Deckel.',
  ].map((text) => ({ text })) }),
  op('sr-check', { lang: 'de-DE', ids: ['GERMAN_SPELLER_RULE'], userWords: ['Mydictwort', 'Zzyxx'], cases: [{ text: 'Das Mydictwort und das Zzyxx und Mydictwörter und Mydictwrt und Tippfehlr.' }, { text: 'mydictwort ZZYXX Zzyxxe' }] }),
  op('sr-check', { lang: 'de-DE', ids: ['GERMAN_SPELLER_RULE'], ignoreTokens: ['Tippfehlr', 'foo'], cases: [{ text: 'Tippfehlr foo Foo bar.' }] }),
  op('sr-check', { lang: 'de-DE', ids: ['GERMAN_SPELLER_RULE'], acceptPhrases: ['Neu Yorkk', 'foo bar'], cases: [{ text: 'In Neu Yorkk ist foo bar und Neu York.' }] }),
  op('sr-check', { lang: 'de-DE', ids: ['GERMAN_SPELLER_RULE'], considerIgnore: false, cases: [{ text: 'LanguageTool und Zzyxx und xx.' }] }),
  op('sr-check', { lang: 'de-DE', ids: ['GERMAN_SPELLER_RULE'], cases: [{ text: 'Tippfehlr hier.', level: 'PICKY' }, { text: 'Tippfehlr hier.', mode: 'TEXTLEVEL_ONLY' }, { text: 'Tippfehlr hier.', mode: 'ALL_BUT_TEXTLEVEL_ONLY' }] }),
]);
w2('dict-errors', 'Hunspell dictionary loading errors (CORE-0443), add(), closed state, caching, non-de dictionaries', [
  op('hs-dict', { language: 'de_DE', prefix: '/de/hunspell/', words: ['Haus', 'Tset', 'TsetX'], add: ['Tset'] }),
  op('hs-dict', { language: 'de_DE', prefix: '/de/hunspell/', words: ['Haus', 'Tset', 'TsetX'] }),
  op('hs-dict', { language: 'de_DE', dic: '/de/hunspell/de_DE.dic', aff: '/de/hunspell/de_DE.aff', words: ['Haus'] }),
  op('hs-dict', { language: 'xx_XX', prefix: '/xx/hunspell/', words: ['x'] }),
  op('hs-dict', { language: 'de_DE', dic: '/de/hunspell/de_DE.dic', aff: '/de/hunspell/nonexistent.aff', words: ['x'] }),
  op('hs-dict', { language: 'de_DE', dic: '/de/hunspell/nonexistent.dic', aff: '/de/hunspell/de_DE.aff', words: ['x'] }),
  op('hs-dict', { language: 'de_DE', dic: '/de/hunspell/de_DE.dict', aff: '/de/hunspell/de_DE.aff', words: ['Haus', 'Hauss'] }),
  op('hs-dict', { language: 'de_DE', dic: '/de/hunspell/de_DE.aff', aff: '/de/hunspell/de_DE.dic', words: ['Haus', 'Hauss'] }),
  op('hs-dict', { language: 'de_DE', dic: '/de/hunspell/ignore.txt', aff: '/de/hunspell/de_DE.aff', words: ['Haus'] }),
  op('hs-dict', { language: 'de_DE', dic: '/de/hunspell/de_DE.dic', aff: '/de/hunspell/ignore.txt', words: ['Haus'] }),
  op('hs-dict', { language: 'de_DE', dic: '/de/hunspell/de_DE.dic', aff: '/de/hunspell/de_DE.aff', words: [null] }),
  op('hs-dict', { language: null, words: ['Haus'] }),
  op('hs-dict', { language: '', words: ['Haus'] }),
  op('hs-dict', { language: 'de_DE', dic: '', aff: '', words: ['Haus'] }),
  op('hs-dict', { language: 'en_US', prefix: '/en/hunspell/', words: ['house'] }),
  op('hs-dict', { language: 'de_AT', prefix: '/de/hunspell/', words: ['Jänner', 'Januar', 'Paradeiser', 'Tomate', 'Grüezi', 'Grüessech', 'Velo', 'Fahrrad', 'Natel'], sugg: true }),
  op('hs-dict', { language: 'de_CH', prefix: '/de/hunspell/', words: ['Jänner', 'Januar', 'Paradeiser', 'Tomate', 'Grüezi', 'Strasse', 'Straße', 'Velo', 'Fahrrad', 'Natel'], sugg: true }),
]);
w2('fr-probe', 'French hunspell availability (fr uses Morfologik without a dict in this build): UNORACLED beyond what Java reports', [
  op('hs-dict', { language: 'fr_FR', prefix: '/fr/hunspell/', words: ['maison', 'maizon'] }),
  op('hs-rule', { lang: 'fr', id: 'HUNSPELL_RULE', words: ['maison'], sugg: true }),
]);
console.log('ok');
