// Authors oracle/cases/X-SRX/*.json (inputs only). Ops sentence-tokenize / srx-segment / srx-rules: docs/review/F11-oracle.md.
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';

const DIR = path.join(ROOT, 'oracle/cases/X-SRX');
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

const common = [
  '', ' ', '   ', '\n', '\n\n', '\r\n', '\t', ' ', ' ', ' ', 'a', '.', '...', '!', '?', '?!', '!!!',
  'Hello.', 'Hello. World.', 'Hello.World.', 'Hello. world.', 'Hello! World? Yes.', 'Hello.  Two spaces. Next.', 'Hello.\tTab. Next.', 'Trailing space. ', ' Leading space. Next.',
  'Das ist Satz eins. Das ist Satz zwei.', 'Version 3.14 ist da. Preis: 2,50 EUR. Danach 1.000.000 Stück.', 'Es kostet 3.5 Dollar. Wirklich.', 'Temperatur 21.5 Grad. Morgen 22.',
  'Visit http://www.example.com/index.html. Then go home.', 'See https://example.org/a.b.c?x=1&y=2. Done.', 'Mail me at john.doe@example.com. Thanks.', 'Schreib an max.mustermann@beispiel.de. Danke!', 'www.example.com ist toll. Wirklich.',
  'Dr. Müller kommt. Er ist spät.', 'Mr. Smith went to Washington. He came back.', 'J. R. R. Tolkien wrote books. Many.', 'A. B. Schmidt wohnt hier. Er arbeitet.', 'Sie wohnt in Berlin, Hauptstr. 5. Das ist nah.',
  '3. Oktober 1990. Das war ein Tag.', 'Am 3. Oktober ist Feiertag. Alle freuen sich.', 'Der 3. Platz. Der 4. auch.', 'Chapter 1. Chapter 2. Chapter 3.', '1. Punkt\n2. Punkt\n3. Punkt',
  'Wait... what? Really... Yes. No...', 'Wait… what? Really… Yes.', 'Er sagte: „Komm her.“ Dann ging er.', 'Er fragte: „Kommst du?“ Sie nickte.', '"Hello," he said. "How are you?" She smiled.', '"Stop!" he shouted. "Now."', '«Bonjour.» Il part.', '»Guten Tag.« Er geht.', '“Quote.” Next sentence.', '‚Single.‘ Next.',
  'Das (siehe oben.) Ist wichtig. Ja.', 'Das ist (z. B. dies.) Danach kommt es. Ja.', 'Text [1]. Mehr Text [2]. Ende.', 'Text {a.} Next. End.', 'Satz (Ende.) Neuer Satz.', '(Ganzer Satz.) Neuer Satz.', '(Whole sentence.) New one.',
  'First line\nSecond line', 'First line\nSecond line\n', 'First.\nSecond.', 'First.\n\nSecond.', 'First.\n\n\nSecond.', 'First. \n Second.', 'Eins.\r\nZwei.\r\n\r\nDrei.', 'Eins.\rZwei.\r\rDrei.', 'Zeile ohne Punkt\nnoch eine\n\nAbsatz zwei\nzeile', '\nStarts with newline. Then.', 'Ends with newlines.\n\n', 'A\n\nB\n\nC',
  'Emoji 😀 sentence. Next 😀. Third 👍🏽! Done.', 'Non-BMP 𝒳𝒴𝒵. Next 𝒜.', '😀', '😀. 😀', 'Lone \ud83d surrogate. Next.', 'Zero​width. Next.', 'Tab\tseparated.\tNext.', 'Tab\tseparated.\tnext.',
  'Short. Very short. Tiny.', 'ABC. DEF. GHI.', 'USA. Und mehr.', 'The U.S. Army is big. Yes.', 'He arrived at 5 p.m. Then left.', 'Etc. is short. Yes.', 'e.g. this one. Not that.', 'i.e. that one. Yes.',
  'Q&A: What? Everything.', 'Price: $5.99. Buy now!', '10 % Rabatt. Nur heute.', '5 Uhr 30 Min. Dann kommen wir.', 'Fußball ist toll. Ärger gibt es nie. Übung macht den Meister. Öl ist teuer.',
  'Ein sehr langer Satz '.repeat(40) + 'endet hier. Und noch einer.', 'a. '.repeat(60), 'Wort '.repeat(600) + '.', 'x'.repeat(5000), 'Satz eins. '.repeat(100), ('Zeile\n').repeat(60), 'Hallo.'.repeat(60),
  'Ünïcödé. Ñandú. Ça va. Œuvre. Ærø. Straße. İstanbul. Ǆ. Ⅻ.', 'ΑΒΓ. ΔΕΖ. Ωμέγα.', 'Русский текст. Второе предложение. Третье.', '日本語の文です。二つ目の文です。', '中文句子。第二句。', 'العربية. جملة ثانية.',
  'Satz.“ Nächster.', 'Satz.) Nächster.', 'Satz." Next.', "Satz.' Next.", 'Satz.» Nächster.', 'Frage?“ Antwort.', 'Ausruf!« Antwort.',
  '1.\n2.\n3.', '- Item eins.\n- Item zwei.\n', '* Point.\n* Other.', '# Heading\nText. More.', 'Mr.\nSmith.', 'Hello. World.', 'Hello. World.', 'Hello.​World.', '. Start dot. End.', 'End dot .', 'Space before .', 'Two ..dots. Next.',
];
const lang = {
  de: [
    'z. B. dies ist ein Beispiel. Und noch eins.', 'z.B. dies ist ein Beispiel. Und noch eins.', 'Es gibt Äpfel, Birnen usw. Die Ernte war gut.', 'Äpfel, Birnen u. a. sind da. Die Ernte war gut.', 'Das ist d. h. nicht gut. Aber ok.', 'Das gilt bzw. galt. Aber nicht mehr.', 'Prof. Dr. Meier hält einen Vortrag. Alle kommen.', 'Dr. med. Schmidt. Praxis offen.',
    'Das kostet ca. 5 Euro. Wirklich.', 'Vgl. Seite 5. Dort steht mehr.', 'Nr. 5 ist da. Nr. 6 nicht.', 'Es war am 24. Dezember. Es schneite.', 'Am 24. Dezember 2020 war es kalt. Sehr kalt.', 'Der 1. FC Köln spielt. Er gewinnt.', 'Ich bin der 2. Sohn. Er der 3.', 'Es ist 12.30 Uhr. Wir essen.', 'Bis zum 31.12. gilt das Angebot. Danach nicht.',
    'Er sagte: „Das geht nicht.“ Sie lachte.', 'Er sagte: „Das geht nicht!“ Sie lachte.', '„Wirklich?“, fragte sie. „Ja.“', '„Komm!“ rief er. „Jetzt.“', '„Satz eins. Satz zwei.“ Satz drei.', 'Sie sagte „Ja“. Dann ging sie.', '„Er kommt.“\n„Wann?“', 'Der Satz („wie bitte?“). Danach.', 'Das steht in § 5 Abs. 2 BGB. Dort steht mehr.',
    'Gehe nach Kap. 3. Dort steht es.', 'Sa. und So. frei. Mo. bis Fr. offen.', 'Die Fa. Müller & Co. liefert. Pünktlich.', 'Wir treffen uns um 9 Uhr. Pünktlich bitte.', 'Herr Meier, geb. 1.1.1950, wohnt hier. Er ist alt.', 'Hr. Müller und Fr. Müller kommen. Sie sind pünktlich.', 'Das ist so (s. u.). Das ist anders.',
    'Der Zug fährt um 14.05 Uhr ab. Er kommt um 16.00 Uhr an.', 'Ca. 20 Personen kamen. Viele blieben.', 'St. Pauli verliert. Wieder.', 'Mio. Euro Verlust. Schlimm.', 'Das Haus ist 100 m² groß. Es kostet 5 Mio. Euro.', 'Straße 1\nStraße 2\n\nStraße 3',
    'Ich bin Dr. Faust. Ich studierte alles. Philosophie, Juristerei und Medizin. Und leider auch Theologie!', 'Geh bis zur Kreuzung. Dann links. Dann rechts. Fertig!', 'Hallo Welt!!! Wie geht es dir??? Gut...', 'Herr Dr. Müller (CDU) sagte: „Wir schaffen das.“ Und dann ging er.',
  ],
  en: [
    "Mr. and Mrs. Smith arrived. They sat.", 'Dr. Jones and Prof. Brown met. They talked.', 'He lives in St. Louis. She does not.', 'The meeting is at 5 p.m. tomorrow. Be there.', 'Cf. page 5. See also p. 7.', 'It cost approx. $5. Cheap.', 'Fig. 3 shows it. Fig. 4 not.', 'No. 5 is here. No. 6 is not.',
    'I went to the U.S.A. It was fun.', 'She said, "I don\'t know." He shrugged.', 'She said, "Stop!" He did.', '"Stop," she said. "Please."', "'Yes,' he said. 'Fine.'", 'It is 5 o\'clock. Time to go.', 'Jan. 5 is cold. Feb. 6 is colder.', 'Sept. 3 was hot. Oct. 4 was not.', 'Inc. and Ltd. are suffixes. Corp. too.', 'Mon. to Fri. we work. Sat. we rest.',
    'He is 5 ft. 10 in. tall. She is shorter.', 'etc. and so on. Done.', 'Hi! How are you? Fine, thanks. And you?', 'I said no... but he insisted. So I went.', 'The U.K. and the E.U. agreed. Finally.', 'Ph.D. students work hard. Always.', 'Visit our site at example.com. It is new.', 'Call 555-1234 ext. 5. Ask for Bob.', 'He wrote "Hamlet." It is famous.',
    "That's all, folks. Goodbye.", 'A. Smith and B. Jones. Both came.', 'Use vol. 3, ch. 4, pp. 5-6. It helps.', 'Lt. Col. Smith spoke. Everyone listened.', 'Sen. Smith (D-Ill.) said no. Then left.', 'Paragraph one.\n\nParagraph two.\nStill two?',
  ],
  fr: [
    "M. Dupont est arrivé. Mme Dupont aussi.", "Dr. Martin et Pr. Durand discutent. Ils partent.", "Il a dit : « Non. » Elle a ri.", "Il a dit : « Non ! » Elle a ri.", "« Vraiment ? », demanda-t-elle. « Oui. »", "C'est-à-dire que non. Voilà.", "Il est 5 h. 30 min. Allons-y.", "Cf. page 5. Voir aussi p. 7.",
    "Le 1er janvier est férié. Le 2 aussi.", "Il habite rue de la Paix, n° 5. C'est loin.", "Etc. et ainsi de suite. Fin.", "Il coûte env. 5 euros. Pas cher.", "Voir fig. 3. Voir fig. 4.", "Elle dit : « Je viens. » Puis elle part.", "« Viens ! » cria-t-il. « Vite. »", "L'homme qui vient d'arriver. Il est grand.", "J'ai vu M. le Maire. Il était pressé.",
    "Les Éts. Dupont ferment. Tant pis.", "Il a 5 ans. Elle en a 6.", "Le prix est de 3,50 €. C'est peu.", "Le 14 juillet 1789. La Bastille tomba.", "Mlle Julie arrive. Mme Dupont part.", "Par ex. ceci. Ou cela.", "Il vit à Saint-Étienne. Elle à Paris.", "Après 1 000 km, il s'arrêta. Fatigué.", "Il dit… puis se tut. Silence.",
    "Chapitre 1. Chapitre 2.", "Un instant!... Voilà.", "«Bonjour» dit-il. «Salut» dit-elle.", "Ligne un\nLigne deux\n\nLigne trois",
  ],
};
const ALL = { de: [...common, ...lang.de], en: [...common, ...lang.en], fr: [...common, ...lang.fr] };
const variants = [['de', 'de-DE'], ['de', 'de-AT'], ['de', 'de-CH'], ['en', 'en-US'], ['en', 'en-GB'], ['fr', 'fr'], ['en', 'en-AU'], ['en', 'en-CA'], ['en', 'en-NZ'], ['en', 'en-ZA'], ['fr', 'fr-CA'], ['fr', 'fr-BE'], ['fr', 'fr-CH'], ['de', 'de-DE-x-simple-language']];
const BASE = { de: 'de-DE', en: 'en-US', fr: 'fr' };
const modes = [false, true];
const st = (lang, texts, extra = {}) => ({ op: 'sentence-tokenize', args: { lang, modes, texts, ...extra } });
const chunks = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

let count = 0;
for (const [base, v] of variants) {
  write(`edge-${v}`, `sentence tokenizer ${v}: ${ALL[base].length} edge cases, single line breaks mark paragraph false and true`, [st(v, ALL[base])]);
  count++;
}
// default mode / setter state: tokenizer state across calls (initial value, last set wins)
for (const l of ['de-DE', 'en-US', 'fr']) write(`state-${l}`, `tokenizer state ${l}: initial singleLineBreaksMarksPara, order of mode switches on the cached tokenizer`, [
  { op: 'sentence-tokenize', args: { lang: l, modes: [true, false, true, true, false, false], texts: ['A.\nB.\n\nC.', 'Eins\nzwei\n\ndrei. Vier'] } },
  { op: 'sentence-tokenize', args: { lang: l, modes: [false], texts: ['A.\nB.\n\nC.'] } },
]);
for (const [base, v] of variants.slice(0, 6)) {
  const paras = corpus(base);
  chunks(paras, 60).forEach((c, i) => write(`corpus-${v}-${String(i).padStart(2, '0')}`, `sentence tokenizer ${v}: corpus paragraphs ${i * 60}..${i * 60 + c.length - 1}`, [st(v, c)]));
  // paragraphs joined with single and double line breaks, and the whole corpus as one text
  write(`corpus-joined-${v}`, `sentence tokenizer ${v}: corpus joined by blank line (whole text), by single line break`, [st(v, [paras.join('\n\n'), paras.join('\n')])]);
}
for (const base of ['de', 'en', 'fr']) {
  chunks(EX[base], 1500).forEach((c, i) => write(`examples-${BASE[base]}-${String(i).padStart(2, '0')}`, `sentence tokenizer ${BASE[base]}: grammar/style rule example texts (all multi-sentence + sampled singles), chunk ${i}`, [st(BASE[base], c)]));
}
for (const [v, list] of Object.entries(VEX)) {
  if (!list.length) continue;
  const base = v.split('-')[0];
  const target = base === 'de' ? v : v;
  chunks(list, 1500).forEach((c, i) => write(`examples-variant-${v}-${i}`, `sentence tokenizer ${target}: variant grammar example texts`, [st(target, c)]));
}
// SimpleSentenceTokenizer (not on a wave-1 check path; CORE-0201)
const simpleTexts = [...ALL.en, ...ALL.de.slice(common.length), ...corpus('en').slice(0, 40), ...corpus('de').slice(0, 40), ...corpus('fr').slice(0, 20), ...EX.en.filter(multi).slice(0, 300)];
write('simple', 'SimpleSentenceTokenizer (segment-simple.srx): edge cases, corpus paragraphs, multi-sentence examples', [{ op: 'sentence-tokenize', args: { tokenizer: 'simple', lang: 'en', modes, texts: simpleTexts } }]);
write('simple-junit', 'SimpleSentenceTokenizerTest#testTokenize inputs', [{ op: 'sentence-tokenize', args: { tokenizer: 'simple', lang: 'en', modes, texts: ['This is a sentence.', 'This is a sentence. ', 'This is a sentence. And another one.', 'This is a sentence. And another one. ', 'This is a sentence! And another one?', 'Mr. Smith is here. Dr. Who too.', 'Hello... world. Next', 'A\nB\n\nC'] } }]);
// SRX engine level
const srxTexts = [...common, ...lang.de, ...lang.en, ...lang.fr, ...corpus('de').slice(0, 15), ...corpus('en').slice(0, 15), ...corpus('fr').slice(0, 15)];
const codes = ['de', 'en', 'fr'].flatMap((l) => [`${l}_two`, `${l}_one`]);
write('srx-segment-wave1', 'SrxTools.tokenize with segment.srx for de/en/fr, _two and _one', codes.map((code) => ({ op: 'srx-segment', args: { srx: '/segment.srx', code, texts: srxTexts } })));
const others = ['pl_two', 'pl_one', 'es_two', 'ca_two', 'ru_two', 'uk_two', 'ja_two', 'zh_one', 'el_two', 'nl_two', 'it_two', 'pt_two', 'sv_two', 'zz_two', 'zz_one', 'xx_two', 'xx_one', 'de', 'de_', 'DE_two', 'De_Two', 'deu_two', 'en-US_two', 'de_three', '', '_two', 'ast_two', 'lt_one', 'x_two'];
const small = [...common.slice(0, 120).filter((t) => t.length < 1000), ...lang.de.slice(0, 12), ...lang.en.slice(0, 12), ...lang.fr.slice(0, 12)];
write('srx-segment-codes', 'SrxTools.tokenize: other language codes, case variants, bad codes (cascade fallback to Default/GeneralImportant)', others.map((code) => ({ op: 'srx-segment', args: { srx: '/segment.srx', code, texts: small } })));
write('srx-segment-null', 'SrxTools.tokenize: null language code and null text', [{ op: 'srx-segment', args: { srx: '/segment.srx', code: null, texts: ['A. B.'] } }, { op: 'srx-segment', args: { srx: '/segment.srx', code: 'de_two', texts: [null, 'A. B.'] } }]);
write('srx-segment-simple', 'SrxTools.tokenize with segment-simple.srx', ['xx_two', 'xx_one', 'en_two', 'de_one', ''].map((code) => ({ op: 'srx-segment', args: { srx: '/org/languagetool/tokenizers/segment-simple.srx', code, texts: small } })));
write('srx-errors', 'SRX loading errors: missing resource, directory, non-SRX resource, custom SRX path through SRXSentenceTokenizer and unknown language', [
  { op: 'srx-segment', args: { srx: '/nope.srx', code: 'de_two', texts: ['A. B.'] } },
  { op: 'srx-segment', args: { srx: '', code: 'de_two', texts: ['A. B.'] } },
  { op: 'srx-segment', args: { srx: '/org/languagetool/tokenizers', code: 'de_two', texts: ['A. B.'] } },
  { op: 'srx-segment', args: { srx: '/META-INF/MANIFEST.MF', code: 'de_two', texts: ['A. B.'] } },
  { op: 'srx-segment', args: { srx: '/org/languagetool/language/de/hunspell/de_DE.info', code: 'de_two', texts: ['A. B.'] } },
  { op: 'sentence-tokenize', args: { tokenizer: 'srx', srx: '/nope.srx', lang: 'de-DE', modes: [false], texts: ['A. B.'] } },
  { op: 'sentence-tokenize', args: { tokenizer: 'srx', srx: '/org/languagetool/tokenizers/segment-simple.srx', lang: 'de-DE', modes: [false, true], texts: ['A. B.', 'Dr. Müller kommt. Er ist spät.'] } },
  { op: 'sentence-tokenize', args: { tokenizer: 'srx', srx: '/segment.srx', lang: 'en-US', modes: [false, true], texts: ['Mr. Smith came. He left.', null] } },
  { op: 'sentence-tokenize', args: { lang: 'zz', modes: [false], texts: ['A. B.'] } },
  { op: 'sentence-tokenize', args: { lang: 'pl-PL', modes: [false, true], texts: ['A. B. C.'] } },
  { op: 'sentence-tokenize', args: { lang: 'de-DE', modes: [false], texts: [null, 'A. B.'] } },
]);
write('srx-rules', 'SrxDocument structure of segment.srx and segment-simple.srx: cascade flag, language maps (pattern, flags, rule name), rule lists per code (break, before, after)', [
  { op: 'srx-rules', args: { srx: '/segment.srx', codes: [...codes, 'pl_two', 'zz_two', 'ja_one', 'xx_two', 'de', ''] } },
  { op: 'srx-rules', args: { srx: '/org/languagetool/tokenizers/segment-simple.srx', codes: ['xx_two', 'xx_one', 'en_two', 'de_one'] } },
]);

console.log('X-SRX case files:', readdirSync(DIR).length, 'examples', Object.fromEntries(Object.entries(EX).map(([k, v]) => [k, v.length])), Object.fromEntries(Object.entries(VEX).map(([k, v]) => [k, v.length])));

write('long', 'very long inputs: 100000 chars without break, 5000 words, 2000 sentences, 2000 lines; per-language tokenizer and raw SRX', [
  ...['de-DE', 'en-US', 'fr'].map((l) => st(l, ['x'.repeat(100000), 'Wort '.repeat(2000) + '.', 'Satz eins. '.repeat(1000), 'Zeile\n'.repeat(1000), 'a. '.repeat(1000)])),
]);
