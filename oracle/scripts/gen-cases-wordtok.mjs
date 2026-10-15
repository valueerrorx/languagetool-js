// Authors oracle/cases/X-WORDTOK/*.json (inputs only). Ops word-tokenize / wordtok-static: docs/review/F12-oracle.md.
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';

const DIR = path.join(ROOT, 'oracle/cases/X-WORDTOK');
rmSync(DIR, { recursive: true, force: true });
mkdirSync(DIR, { recursive: true });
const LTSRC = path.join(ROOT, 'oracle/java-src/languagetool-language-modules');
const write = (name, description, ops) => writeFileSync(path.join(DIR, `${name}.json`), JSON.stringify({ kind: 'harness', clock: 'fixed', description, normalize: [], compare: 'jsonl', ops }, null, 1) + '\n');

// ---- inputs
const corpus = (l) => readFileSync(path.join(ROOT, `oracle/corpus/${l}/corpus.txt`), 'utf8').split('\n\n').map((p) => p.replace(/\n+$/, '')).filter(Boolean);
const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
function examples(file) {
  const xml = readFileSync(file, 'utf8');
  const out = [];
  for (const m of xml.matchAll(/<example\b[^>]*>([\s\S]*?)<\/example>/g)) {
    const t = m[1].replace(/<\/?(marker|suggestion)\b[^>]*>/g, '').replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, e) => entities[e])
      .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d));
    if (t.trim()) out.push(t);
  }
  return out;
}
// multi-sentence examples (terminal punctuation followed by whitespace and more text, or line breaks) all kept; single sentences sampled
const multi = (t) => /[.!?…:;»"“”)]\s+\S/.test(t) || /[\n\r]/.test(t);
function select(list, every) {
  const seen = new Set();
  const out = [];
  let k = 0;
  for (const t of list) {
    if (seen.has(t)) continue;
    seen.add(t);
    if (multi(t) || k++ % every === 0) out.push(t);
  }
  return out.length > 1200 ? out.filter((_, i) => i % Math.ceil(out.length / 1200) === 0) : out; // cap fixture size
}
const rulesDir = (l) => path.join(LTSRC, `${l}/src/main/resources/org/languagetool/rules/${l}`);
const EX = {
  de: select([...examples(`${rulesDir('de')}/grammar.xml`), ...examples(`${rulesDir('de')}/style.xml`)], 40),
  en: select([...examples(`${rulesDir('en')}/grammar.xml`), ...examples(`${rulesDir('en')}/style.xml`)], 60),
  fr: select([...examples(`${rulesDir('fr')}/grammar.xml`), ...examples(`${rulesDir('fr')}/style.xml`)], 50),
};
const varEx = (l, sub) => select(readdirSync(path.join(rulesDir(l), sub)).filter((f) => f.endsWith('.xml')).flatMap((f) => examples(path.join(rulesDir(l), sub, f))), 1);
const VEX = { 'de-CH': varEx('de', 'de-CH'), 'de-AT': varEx('de', 'de-DE-AT'), 'de-DE': varEx('de', 'de-DE-AT'), 'en-GB': varEx('en', 'en-GB'), 'en-US': varEx('en', 'en-US') };

const S = '­', NB = ' ', NNB = ' ';
const common = [
  '', ' ', '   ', '\n', '\t', NB, NNB, ' ', '​', 'a', '.', '...', '…', '?!',
  'Hello world', 'Hello,world', 'Hello  world', ' Hello ', 'a\tb\nc\r\nd',
  // URLs
  'Visit http://www.example.com/index.html now', 'Visit http://www.example.com/index.html.', 'See https://example.org/a.b.c?x=1&y=2, ok', 'Go to www.example.com today', 'Go to www.example.com.', 'example.com/path ist toll', 'sub.example.co.uk bar', 'ftp://ftp.example.org/file.txt', 'ws://host:8080/chat wss://host/x', 'mailto:john@example.com bar', 'https://de.wikipedia.org/wiki/Käse_(Lebensmittel)', 'http://example.com/ä?q=ü#frag', '(http://example.com)', '"http://example.com"', '<http://example.com>', 'http://', 'http://a', 'https://example.com:8080/a/b/', 'http://192.168.0.1/index', 'Siehe http://x.de/a,b;c und https://y.de.', 'file.txt und readme.md', 'foo.bar', 'a.b.c.d', 'www.', 'www.x', 'http://example.com/a_b-c~d', 'http://example.com/{x}',
  // e-mails
  'Mail me at john.doe@example.com, thanks', 'john.doe@example.com.', 'Schreib an max.mustermann@beispiel.de!', '<max@example.org>', 'a@b', 'a@b.c', 'user+tag@sub.example.co.uk', 'user@[192.168.0.1] x', 'foo@bar@baz.com', 'mailto:me@example.com', 'E-Mail: me@example.com; you@example.org', '@mention hallo', 'Hi @user, #hashtag!', '@user@example.com', 'a@@b.com', '@', '#', '#1 #tag_x #Tag-y', 'x@y.zz.', 'Ärger@ünï.de',
  // numbers
  '3.14 und 2,50 EUR', '1.000.000 Stück', '1,000,000.50', '1 000 000', '12.30 Uhr', '3. Oktober 1990', '03.10.1990', '1990-10-03', '2026-03-15T10:00:00+01:00', '10:30:15', '10:30 Uhr', '5%', '5 %', '50‰', '100-prozentig', '5-10 Minuten', '+49 123 456', '(0123) 45-67', '-5', '−5', '-5,5', '1/2', '3/4 Stunde', '2^3', '1e10', '0x1F', '1_000', '½ ¼', '²³', '٣٤٥', '１２３',
  '$5.99', '5.99$', '€ 50', '50 €', '50€', '€50.00', 'USD100', '100USD', '£1,000.50', '¥100', '$', '€', '$5 $6', 'AUD$5', 'US$ 5', '₹1,00,000', '₿0.5', 'Preis: 2,50€.', '12 €/Monat', '5$-Note',
  '20°C', '20 °C', '20°', '5 km/h', '100 m²', '3 cm³', '5 µm', 'Dr. h. c. Müller', 'z. B. das', 'z.B. das', 'u.a. das', 'U.S.A.', 'e.g. this', 'i.e. that', 'Mr. Smith', 'etc.', 'Nr. 5', 'ca. 5', 'Ph.D.', 'a.m. p.m.', 'J. R. R. Tolkien',
  // apostrophes
  "don't", 'don’t', "can't won't", "I'm you're he's she's it's we've they'd I'll", 'I’m you’re he’s', "Peter's book", 'Peter’s book', "the dogs' bones", "o'clock", "rock 'n' roll", "'quoted'", '‘quoted’', "'tis 'twas", "ma'am y'all", "O'Brien O’Brien", "l'homme", 'l’homme', "aujourd'hui", 'aujourd’hui', "qu'il jusqu'à lorsqu'on puisqu'elle quoiqu'il", "c'est j'ai n'a m'a t'a s'il d'un", "C'est J'ai L'Homme D'Artagnan", "L’HOMME", "prud'homme", "presqu'île", "entr'acte", "quelqu'un", "aujourd'", "l'", "'", "''", "x'y'z", "don''t", "he said 'hi' to me", "Geht's", "geht’s", "wie geht's dir?", "d'accord", "n'importe quoi", "l'a-t-il", "peut-être",
  // hyphens, dashes
  'E-Mail-Adresse', 'e-mail', 'well-known fact', 'state-of-the-art', 'Baden-Württemberg', 'Bindestrich-Wort', '100-prozentig', 'US-Präsident', 'S-Bahn-Station', 'Ost- und Westdeutschland', 'Haus- und Gartenarbeit', 'vor- und nachher', 'a - b', 'a -- b', 'a--b', 'a – b', 'a—b', 'a ‑ b', 'a‑b', 'a–b', 'a—b', '-', '--', '- -', 'x-', '-x', '3-D', 'T-Shirt', 'Wi-Fi', 'co-operate', 'self-esteem', 'mother-in-law', 'rendez-vous', "c'est-à-dire", 'sars-cov-2', 'Sars-CoV-2', 'peut-être', 'est-ce que', 'vas-y', 'dis-moi', 'dites-le-moi', 'a-t-il', 'a-t-elle', 'va-t-on', 'Où est-il ?', 'Peut-il venir ?', 'donne-lui', 'donne-le-moi', 'Paris-Saint-Germain', 'Saint-Étienne', 'arc-en-ciel', 'week-end', 'celui-ci', 'celle-là', 'c’est-à-dire', 'Qu’est-ce que c’est ?', 'viens-tu', 'sont-ils', 'dit-on', 'Jean-Pierre', 'quatre-vingt-dix-neuf', 'porte-monnaie', 'ci-dessus', 'là-bas', 'hors-jeu',
  `soft${S}hyphen`, `Soft${S}`, `${S}`, `Trennungs${S}strich ${S}x`, `co${S}operate don't`, `a${S}-b`,
  'zero‍width', 'a‍b', 'a‌b', '‍', 'a﻿b', '⁠word', 'a b', 'a b', 'a\u0085b', 'a b', 'a b', 'a b', 'a　b', 'a᠎b', '  ',
  // French spacing
  '« Bonjour »', `«${NB}Bonjour${NB}»`, `«${NNB}Bonjour${NNB}»`, 'Il dit : « Non ! »', `Vraiment${NB}? Oui${NB}!`, `Vraiment${NNB}? Oui${NNB}!`, `Un prix de 1${NB}000${NB}€`, `1${NNB}000,50${NNB}€`, '1 000 km', '1 000,50', '3,50 €', '12 345 678', '1,5', '1.5', ',5', '5,', "'3,5'",
  // emoji
  '😀', 'Emoji 😀 text', '👍🏽 ok', '👨‍👩‍👧‍👦 family', '🏳️‍🌈 flag', '🇩🇪🇫🇷', '❤️', '❤', '©', '®', '™', '1️⃣', '😀😀😀', 'a😀b', '😀.', 'x👍🏽y', 'Lone \ud83d surrogate', 'Lone \ude00 low', '☺', '✔', '#️⃣',
  // non-BMP letters
  '𝒳𝒴𝒵', '𝒜 bc', '𠀀𠀁 text', '𐍈', '\u{1D400}x', 'a\u{10FFFF}b', 'ä̈', 'é', 'é', 'fi', 'ǅ',
  // quotes, brackets
  '„Komm her“, sagte er.', '"Hello," he said.', '»Guten Tag«', '‹x›', '“Quote”', '‚Single‘', '(a) [b] {c} <d>', 'f(x)=y', '[1]', '(siehe oben)', '(,)', ')(', 'a/b', 'und/oder', 'a\\b', 'a&b', 'Q&A', 'AT&T', 'R&D', '&amp;', 'a|b', 'a+b=c', 'a*b', 'a~b', 'a^b', 'a_b', '_x_', 'a`b', '"', '“', '„', ';:,!?', 'a;b:c', 'a“b', 'x…y', 'x...y', '!!!', '???', '„‚x‘“', '¡Hola! ¿Qué?', '§ 5 Abs. 2', '§§', '© 2020', 'a©b', 'a§b', 'a±b', '±5', 'x²', '¬a', 'a¨b', 'a·b', '•x', 'a†',
  'Привет мир', '日本語の文です。', '中文句子，第二句。', 'العربية، جملة', 'Ελληνικά', 'ÄÖÜ äöü ß ẞ', 'İstanbul', 'ĳ Ĳ',
  'Wort '.repeat(300), 'x'.repeat(5000), 'a-'.repeat(500), 'http://example.com/' + 'a'.repeat(3000), 'a@'.repeat(200), '😀'.repeat(300), '1 '.repeat(500), '.'.repeat(1000),
];
const lang = {
  de: ['Das ist ein Beispielsatz.', 'Herr Dr. Müller wohnt in der Hauptstr. 5.', 'Die E-Mail-Adresse lautet max@beispiel.de.', 'Das ist 100-prozentig sicher.', 'Es kostet 1.234,56 €.', 'Gibt\'s das? Geht\'s los? Wie geht’s?', 'Das ist ein ‚Test‘ und ein „Test“.', 'Wir treffen uns um 12.30 Uhr am 3.10.2020.', 'Der Ex-Präsident und die Ex-Frau.', 'Mehr-Wege-Ticket', 'Kaffee-/Tee-Auswahl', 'Müller/Meier', 'Müller-Lüdenscheidt', 'Arbeits-, Wohn- und Schlafzimmer', 'das A-Team, das B-Movie, der U-Boot-Krieg', 'Sie sagte: „Ja!“', 'Ich glaub\' es nicht', "Wie geht's?", 'x_y', 'Wort‚Wort', '‚', 'a‚b', 'Wort, ‚Zitat‘', 'Nr.1', 'km/h', '5-Euro-Schein', 'Straße', 'Über-Ich', 'ver.di', 'Dipl.-Ing.', 'z. B. das', '10 000', '10 000', 'Fußball-Weltmeisterschaft', 'IT-Sicherheit', 'IT-Sicherheits-Experten', 'Mitarbeiter/innen', 'Mitarbeiter:innen', 'Mitarbeiter*innen', 'Mitarbeiter_innen', 'Kund*in', '#Hashtag @Mention'],
  en: ['This is a sentence.', "Don't worry, it's fine.", 'The dogs\' bones are Peter\'s.', 'It’s the "best" ever.', 'a well-known state-of-the-art system', 'He said: "Wait!"', 'Visit www.example.com or mail info@example.com.', 'It costs $5.99 or £4.50 or €5.', 'The U.S. economy grew 3.5% in Q3.', 'Rock \'n\' roll, y\'all.', "Let's go", "We'd've gone", "shouldn't've", "ain't", "Ma'am", "'Twas the night", "cannot", "gonna wanna gotta", "dunno", "d'ye", "o'er ne'er e'er", "I'd", "Who'd've", "John's", "the '90s", "the 1990's", "rock-n-roll", "12-year-old", "5'10\"", "5′10″", "x-ray", "e-mail", "non-existent", "pre-1990", "Mc-Donald", "the e-mail-address", "word‐hyphen", "word--dash", "Jack-o'-lantern", "ex-president", "A.B.C.", "wi-fi", "Anglo-Saxon", "post-war", "twenty-one", "a–b", "6–8 weeks", "high-quality", "COVID-19", "H1N1", "MS-DOS", "can't-miss", "it's-a-me", "'hello'", "say 'hi'.", "‘hi’ ’tis", "st. louis", "I am", "3 km"],
  fr: ["C'est l'homme qu'il a vu aujourd'hui.", "L’homme n’a pas dit qu’il viendrait.", "Peut-être qu'il viendra.", "Où est-il allé ? A-t-il mangé ?", "Dis-moi, donne-le-lui, vas-y.", "Il a dit : « Je viens. »", "1 000 000 d'euros, soit 3,50 € l'unité.", "Jusqu'à demain, lorsqu'il viendra, puisqu'elle veut, quoiqu'il dise.", "Qu'est-ce que c'est ?", "Elle l'a-t-elle vu ?", "Est-ce qu'il y a un arc-en-ciel ?", "Mais l'on y va.", "Aujourd'hui est un jour.", "M. Dupont et Mme Dupont", "Dr. Martin", "n°5", "5 h 30", "10 h", "50 %", "50 %", "3 km", "c'est", "C'EST", "J'AI", "L'ÉTÉ", "QU'IL", "jusqu’à", "d’abord", "t'a-t-il", "m'a-t-on", "l'ont-ils", "y a-t-il", "ira-t-elle", "ira-t-on", "parle-t-il", "chante-je", "dis-je", "puis-je", "suis-je", "fais-moi ça", "dis-lui", "donne-nous", "laisse-les", "vois-tu", "voulez-vous", "veux-tu", "va-t'en", "allez-vous-en", "chez-soi", "après-midi", "s'il vous plaît", "s'il", "s’ils", "quelqu'un", "presqu'ile", "lorsqu'", "d'", "-", "-t-il", "a-t-", "Anne-Sophie", "Jean-Jacques Rousseau", "l'Anne-Sophie", "SARS-CoV-2", "covid-19", "Covid-19", "tout-à-coup", "à-peu-près", "c'est-à-dire que", "peut-être pas", "porte-clés", "N'est-ce pas ?", "ne-t-il", "mi-juin", "x-y", "1 234,56", "1 234 567,89", "12 345", "0,5", "3,", ",3", "3 ,5", "1,2,3", "1 2 3", "10 000 000", "10 000 000,5 m", "2 000 €", "12 janvier 2020"],
};
const ALL = { de: [...common, ...lang.de], en: [...common, ...lang.en], fr: [...common, ...lang.fr] };
const variants = [['de', 'de-DE'], ['de', 'de-AT'], ['de', 'de-CH'], ['en', 'en-US'], ['en', 'en-GB'], ['fr', 'fr'], ['en', 'en-AU'], ['en', 'en-CA'], ['en', 'en-NZ'], ['en', 'en-ZA'], ['fr', 'fr-CA'], ['fr', 'fr-BE'], ['fr', 'fr-CH'], ['de', 'de-DE-x-simple-language']];
const BASE = { de: 'de-DE', en: 'en-US', fr: 'fr' };
const wt = (l, texts, extra = {}) => ({ op: 'word-tokenize', args: { lang: l, texts, ...extra } });
const chunks = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

for (const [base, v] of variants) write(`edge-${v}`, `word tokenizer ${v}: ${ALL[base].length} edge cases (tokens incl. whitespace)`, [wt(v, ALL[base])]);
write('core-edge', 'core WordTokenizer directly: all edge cases', [wt('en-US', [...new Set([...common, ...lang.de, ...lang.en, ...lang.fr])], { tokenizer: 'core' })]);
// sentences from the sentence tokenizer (as LT does), then word tokens per sentence
for (const [base, v] of variants.slice(0, 6)) {
  chunks(corpus(base), 40).forEach((c, i) => write(`corpus-${v}-${String(i).padStart(2, '0')}`, `word tokenizer ${v}: corpus paragraphs split into sentences, tokens per sentence, chunk ${i}`, [wt(v, c, { split: true })]));
}
write('corpus-core', 'core WordTokenizer on sentences of the en/de/fr corpora', ['en', 'de', 'fr'].map((b) => wt(BASE[b], corpus(b).slice(0, 60), { tokenizer: 'core', split: true })));
for (const base of ['de', 'en', 'fr']) {
  chunks(EX[base], 1000).forEach((c, i) => write(`examples-${BASE[base]}-${String(i).padStart(2, '0')}`, `word tokenizer ${BASE[base]}: rule example texts split into sentences, chunk ${i}`, [wt(BASE[base], c, { split: true })]));
}
for (const [v, list] of Object.entries(VEX)) {
  if (!list.length) continue;
  chunks(list, 1000).forEach((c, i) => write(`examples-variant-${v}-${i}`, `word tokenizer ${v}: variant example texts`, [wt(v, c, { split: true })]));
}
write('errors', 'null text, unknown language', [wt('de-DE', [null, '']), wt('en-US', [null], { tokenizer: 'core' }), wt('zz', ['a b']), wt('pl-PL', ['a b'])]);
// static helpers
const statics = ['http://example.com', 'https://example.com/a?b=c', 'www.example.com', 'www.', 'example.com', 'sub.example.co.uk', 'example.com/path', 'foo.bar', 'foo.txt', 'a.b', 'ftp://x', 'mailto:a@b.de', 'ws://x', 'wss://x', 'HTTP://X.COM', 'http:/x', 'http//x.com', '', ' ', 'x', 'Äpfel.de', 'ä.de', 'a-b.de', '-a.de', 'a.de.', 'a.de/', 'a.b.c.d.e', '1.2', '1.2.3', 'v1.0.0', 'e.g.', 'a@b.de', 'max.mustermann@beispiel.de', 'a@b', 'a@b.c', 'a@[1.2.3.4]', 'a@[1.2.3.4.5]', 'user+tag@x.org', '@x', 'x@', '@x@y.de', 'a b@c.de', 'a@b.de ', 'Ä@b.de', 'a@ä.de', "o'brien@x.com", 'a..b@x.com', '.a@x.com', 'a@x..com', 'a@-x.com', ':a@b.de', 'a@b.de:', 'a@b-c.de', 'a@b_c.de', 'a@b.123', 'mailto:', '€5', '$5', '5€', '5 €', 'USD5', '5USD', 'US$5', 'A$5.00', '€1.000,50', '€1,000.50', '£', '$$5', '5$$', '€5€', '1,5', '₿0.5', '¥100', '100¥', '₹5', 'EUR 5', '', null];
write('static', 'WordTokenizer static/instance helpers: getProtocols, isUrl, isEMail, isCurrencyExpression, splitCurrencyExpression', [
  { op: 'wordtok-static', args: { fn: 'getProtocols', texts: [] } },
  ...['isUrl', 'isEMail', 'isCurrencyExpression', 'splitCurrencyExpression'].map((fn) => ({ op: 'wordtok-static', args: { fn, texts: statics } })),
  { op: 'wordtok-static', args: { fn: 'nope', texts: ['x'] } },
]);
write('long', 'very long inputs per tokenizer', ['de-DE', 'en-US', 'fr'].map((l) => wt(l, ['x'.repeat(100000), 'Wort '.repeat(10000), 'a-b '.repeat(5000), 'l\'a '.repeat(5000), 'a@b.de '.repeat(3000), 'http://x.de/a '.repeat(3000), '😀'.repeat(20000)])));
console.log('X-WORDTOK case files:', readdirSync(DIR).length, 'edge', ALL.de.length, ALL.en.length, ALL.fr.length);
