// Authors oracle/cases/X-TAGGER/*.json (inputs only). Ops tag / manual-tagger: docs/review/F13-oracle.md.
// Text inputs are reused from the X-WORDTOK case files (run gen-cases-wordtok.mjs first).
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';

const DIR = path.join(ROOT, 'oracle/cases/X-TAGGER');
const WT = path.join(ROOT, 'oracle/cases/X-WORDTOK');
rmSync(DIR, { recursive: true, force: true });
mkdirSync(DIR, { recursive: true });
const write = (name, description, ops) => writeFileSync(path.join(DIR, `${name}.json`), JSON.stringify({ kind: 'harness', clock: 'fixed', description, normalize: [], compare: 'jsonl', ops }, null, 1) + '\n');
const chunks = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const uniq = (a) => [...new Set(a)];
const wtTexts = (f) => JSON.parse(readFileSync(path.join(WT, f), 'utf8')).ops.flatMap((o) => o.args.texts ?? []);
const corpus = (l) => readFileSync(path.join(ROOT, `oracle/corpus/${l}/corpus.txt`), 'utf8').split('\n\n').map((p) => p.replace(/\n+$/, '')).filter(Boolean);
const wtFiles = (re) => readdirSync(WT).filter((f) => re.test(f));

const RES = path.join(ROOT, 'oracle/java-src/languagetool-language-modules');
const resFile = (l, f) => readFileSync(path.join(RES, `${l}/src/main/resources/org/languagetool/resource/${l}/${f}`), 'utf8');
function forms(l, f) {
  const sep = f.startsWith('removed') && l === 'fr' ? ';' : l === 'fr' && f === 'added.txt' ? ';' : '\t';
  const out = [];
  let s = sep;
  for (const line of resFile(l, f).split('\n')) {
    const t = line.trim();
    const m = t.match(/^#separatorRegExp=(.*)$/);
    if (m) s = m[1];
    if (!t || t[0] === '#') continue;
    const p = t.split(s);
    if (p.length >= 1) out.push(p[0]);
  }
  return out;
}
const upper = (w) => w.toUpperCase();
const title = (w) => w.charAt(0).toUpperCase() + w.slice(1);
const lower = (w) => w.toLowerCase();
const variantsOf = (ws) => uniq(ws.flatMap((w) => [w, lower(w), upper(w), title(w), w.replace(/'/g, '’')]));

// ~200 edge words per language
const COMMON = ['', ' ', 'a', 'A', 'I', 'i', '.', ',', '?', '1', '0', '-1', '2147483647', '9223372036854775807', '3.14', '1,000', '12:30', '1990s', "'90s", 'the', 'The', 'THE', 'tHe', 'McDonald', 'mcdonald', 'iPhone', 'eBay', 'NASA', 'Nasa', 'nasa', 'FRANCE', 'France', 'france', 'PARIS', 'paris', 'Paris', 'London', 'LONDON', 'xyzzy', 'Xyzzy', 'qwertyuiop', 'asdfghjkl', 'zzzzzz', 'Zzzzzz', 'ZZZZZZ', 'ünïcödé', 'Ünïcödé', 'ÜNÏCÖDÉ', 'straße', 'Straße', 'STRASSE', 'ǅ', 'İstanbul', 'ı', 'I', '😀', '𝒳𝒴𝒵', '𠀀', 'a😀', 'x­y', 'soft­hyphen', '​', ' ', '\t', '\n', ' ', 'e-mail', 'E-mail', 'E-MAIL', 'e-Mail', 'x-ray', 'X-Ray', 'well-known', 'WELL-KNOWN', 'Well-Known', 'self-esteem', 'anti-', '-anti', '--', '-', '–', '—', '...', '…', '@', '#', '#hash', '@user', 'a@b.com', 'http://example.com', 'www.example.com', '$5', '€', '5%', '50‰', '20°C', '½', '²', '٣٤٥', '１２３', 'ａｂｃ', 'Ａ', 'ß', 'ẞ', 'ſ', 'ﬁ', 'ﬀ', 'Œuvre', 'œuvre', 'ŒUVRE', 'Æon', 'æon', 'ÆON', 'Ø', 'ø', 'ł', 'Ł', 'ð', 'Þ', 'ñ', 'Ñ'];
const EN = ["don't", 'don’t', "Don't", "DON'T", 'DON’T', "can't", "won't", "isn't", "I'm", 'I’m', "I'M", "he's", "she's", "it's", "It's", "IT'S", "we've", "they'd", "I'll", "you're", "Peter's", "Peter’s", "dogs'", "o'clock", "O'Clock", "O’CLOCK", "ma'am", "y'all", "Y'ALL", "'tis", "'twas", "'em", "'cause", "gonna", "Gonna", "GONNA", "wanna", "gotta", "dunno", "ain't", "ne'er", "e'er", "o'er", "let's", "Let's", "LET'S", "goin'", "Goin'", "GOIN'", "nothin'", "NOTHIN'", "Nothin'", "doin’", "rock'n'roll", "rock'n'rollin'", "in'", "IN'", "'", "’", "''", "x'y", "walkin'", "talkin", "Talkin'", "sing'", "running'", "ex-president", "Ex-President", "EX-PRESIDENT", "co-operate", "co-operation", "non-existent", "pre-1990", "post-war", "twenty-one", "Twenty-One", "mother-in-law", "mothers-in-law", "jack-o'-lantern", "12-year-old", "4-H", "T-shirt", "t-shirt", "T-SHIRT", "U.S.", "u.s.", "U.S.A.", "e.g.", "i.e.", "etc.", "Mr.", "Mrs.", "Dr.", "St.", "Jr.", "Ph.D.", "a.m.", "p.m.", "am", "AM", "Am", "US", "us", "Us", "it", "IT", "It", "I.T.", "ok", "OK", "Ok", "okay", "OKAY", "colour", "color", "Colour", "COLOUR", "COLOR", "organise", "organize", "ORGANISE", "centre", "center", "defence", "defense", "theatre", "theater", "grey", "gray", "tyre", "tire", "aluminium", "aluminum", "whilst", "while", "learnt", "learned", "spelt", "spelled", "analyse", "analyze", "catalogue", "catalog", "licence", "license", "practise", "practice", "program", "programme", "cheque", "check", "kerb", "curb", "mum", "mom", "Mum", "MUM", "arse", "ass", "bloody", "COVID-19", "Covid-19", "covid", "Covid", "COVID", "H1N1", "iOS", "IOS", "ios", "macOS", "MacOS", "YouTube", "Youtube", "YOUTUBE", "youtube", "Wi-Fi", "wifi", "WiFi", "wi-fi", "email", "Email", "EMAIL", "emails", "blog", "Blog", "BLOG", "selfie", "hashtag", "Brexit", "brexit", "BREXIT", "Trump", "TRUMP", "Obama", "Müller", "Zürich", "ZÜRICH", "zürich", "café", "Café", "CAFÉ", "naïve", "NAÏVE", "résumé", "RÉSUMÉ", "façade", "FAÇADE", "déjà", "vu", "cliché", "fiancé", "Dr", "DR", "Mr", "MR", "mr", "ms", "Ms", "MS", "Hello", "hello", "HELLO", "hELLO", "Hello,", "hello.", "Good-bye", "goodbye", "GOODBYE", "Goodbye", "walk", "walked", "walking", "walks", "Walk", "WALK", "Walked", "run", "ran", "running", "Run", "RUN", "be", "is", "are", "was", "were", "been", "being", "Be", "IS", "ARE", "Was", "have", "has", "had", "do", "does", "did", "done", "go", "went", "gone", "better", "best", "good", "well", "Well", "WELL", "more", "most", "many", "much", "Much", "MUCH", "lead", "Lead", "LEAD", "read", "Read", "READ", "will", "Will", "WILL", "may", "May", "MAY", "march", "March", "MARCH", "can", "Can", "CAN", "bill", "Bill", "BILL", "bob", "Bob", "BOB", "mark", "Mark", "MARK", "rose", "Rose", "ROSE", "wind", "Wind", "WIND", "polish", "Polish", "POLISH", "turkey", "Turkey", "TURKEY", "china", "China", "CHINA", "Japan", "JAPAN", "japan", "english", "English", "ENGLISH", "german", "German", "GERMAN", "Monday", "monday", "MONDAY", "January", "january", "JANUARY", "Sept.", "Dec", "DEC", "dec"];
const FR = ["l'homme", 'l’homme', "L'homme", "L'HOMME", "L’HOMME", "d'abord", "D'abord", "D'ABORD", "j'ai", "J'ai", "J'AI", "j’ai", "n'a", "N'A", "m'a", "t'a", "s'il", "S'IL", "S’IL", "c'est", "C'est", "C'EST", "C’EST", "qu'il", "Qu'il", "QU'IL", "jusqu'à", "Jusqu'à", "JUSQU'À", "lorsqu'on", "puisqu'elle", "quoiqu'il", "aujourd'hui", "Aujourd'hui", "AUJOURD'HUI", "aujourd’hui", "presqu'île", "prud'homme", "entr'acte", "quelqu'un", "Quelqu'un", "quelqu’un", "l'", "d'", "qu'", "'", "’", "l'a-t-il", "a-t-il", "A-t-il", "A-T-IL", "a-t-elle", "va-t-on", "y a-t-il", "dit-on", "parle-t-il", "chante-je", "dis-moi", "Dis-moi", "DIS-MOI", "donne-le-moi", "donne-lui", "donne-nous", "laisse-les", "vas-y", "Vas-y", "VAS-Y", "va-t'en", "va-t’en", "allez-vous-en", "voulez-vous", "veux-tu", "puis-je", "suis-je", "est-ce", "Est-ce", "est-ce que", "peut-être", "Peut-être", "PEUT-ÊTRE", "c'est-à-dire", "arc-en-ciel", "Arc-en-ciel", "week-end", "Week-end", "WEEK-END", "porte-monnaie", "porte-clés", "après-midi", "Après-midi", "chez-soi", "celui-ci", "celle-là", "ci-dessus", "là-bas", "hors-jeu", "quatre-vingt-dix-neuf", "Jean-Pierre", "jean-pierre", "JEAN-PIERRE", "Anne-Sophie", "Saint-Étienne", "SAINT-ÉTIENNE", "Paris-Saint-Germain", "SARS-CoV-2", "covid-19", "Covid-19", "COVID-19", "tout-à-coup", "à-peu-près", "mi-juin", "-t-il", "a-t-", "-le", "-Le", "-LE", "-les", "-Les", "-il", "-Il", "-IL", "-ils", "-Ils", "-elle", "-nous", "-vous", "-lui", "-leur", "-moi", "-toi", "-y", "-en", "-ce", "-t", "-je", "-tu", "-on", "auto", "auto-", "autoécole", "auto-école", "Auto-école", "autoproclamer", "auto-proclamer", "autocritique", "re-", "re-faire", "refaire", "re-lire", "relire", "sur-", "sur-estimer", "surestimer", "post-", "post-moderne", "postmoderne", "post-scriptum", "mini", "mini-jupe", "minijupe", "Mini", "MINI", "méga", "méga-fête", "mégafête", "Méga", "anti-", "anti-bruit", "antibruit", "anti-américain", "ANTI-BRUIT", "Anti-bruit", "pré-", "pré-requis", "ex-mari", "ex-", "vice-président", "vice-", "demi-heure", "demi-", "contre-", "contre-exemple", "extra-", "extra-large", "inter-", "inter-États", "micro-ondes", "micro-", "super-héros", "super-", "ultra-", "ultra-rapide", "sous-", "sous-marin", "non-", "non-sens", "néo-", "néo-zélandais", "bonjour", "Bonjour", "BONJOUR", "été", "Été", "ÉTÉ", "être", "Être", "ÊTRE", "avoir", "est", "Est", "EST", "sont", "ont", "ai", "as", "a", "à", "A", "À", "ça", "Ça", "ÇA", "où", "ou", "Où", "OÙ", "la", "La", "LA", "là", "Là", "le", "Le", "LE", "les", "Les", "LES", "un", "Un", "UN", "une", "des", "du", "Du", "DU", "dû", "de", "De", "DE", "en", "En", "EN", "on", "On", "ON", "y", "Y", "ne", "Ne", "NE", "pas", "Pas", "PAS", "si", "Si", "SI", "se", "ce", "Ce", "CE", "ces", "ses", "ceux", "celle", "elle", "Elle", "ELLE", "il", "Il", "IL", "ils", "Ils", "ILS", "je", "Je", "JE", "tu", "Tu", "TU", "nous", "Nous", "NOUS", "vous", "Vous", "VOUS", "mais", "Mais", "MAIS", "et", "Et", "ET", "ni", "car", "donc", "or", "Or", "OR", "pour", "Pour", "POUR", "par", "Par", "PAR", "avec", "dans", "sans", "sous", "sur", "vers", "chez", "mangé", "mange", "manger", "mangeons", "mangèrent", "mangerions", "chevaux", "cheval", "yeux", "œil", "Œil", "ŒIL", "cœur", "CŒUR", "sœur", "œuf", "Œuf", "bœuf", "BŒUF", "œuvre", "Œuvre", "ŒUVRE", "hôtel", "Hôtel", "HÔTEL", "forêt", "FORÊT", "François", "FRANÇOIS", "françois", "Noël", "NOËL", "Zoë", "maïs", "Maïs", "MAÏS", "ambiguë", "ciguë", "Québec", "QUÉBEC", "québec", "Montréal", "MONTRÉAL", "France", "FRANCE", "france", "français", "Français", "FRANÇAIS", "Français(e)", "français(e)", "étudiant·e", "étudiant(e)s", "M.", "Mme", "MM.", "Dr", "Dr.", "Pr", "St", "Ste", "Sté", "n°", "N°", "no", "nº", "1er", "1re", "2e", "2ème", "3ᵉ", "XXe", "XXIe", "XIXème", "Ier", "IIe", "h", "km", "kg", "€", "%", "etc.", "cf.", "p.", "pp.", "ex.", "c.-à-d.", "Lundi", "lundi", "LUNDI", "janvier", "Janvier", "JANVIER"];
const ONLYEN = uniq([...COMMON, ...EN]);
const ONLYFR = uniq([...COMMON, ...FR]);

// ---- tag cases
const LANGS = { en: ['en-US', 'en-GB', 'en-AU', 'en-CA', 'en-NZ', 'en-ZA'], fr: ['fr', 'fr-CA', 'fr-BE', 'fr-CH'] };
const tag = (lang, texts, extra = {}) => ({ op: 'tag', args: { lang, texts, ...extra } });
const tagList = (lang, tokenLists) => ({ op: 'tag', args: { lang, tokenLists } });
const enAdded = variantsOf([...forms('en', 'added.txt'), ...forms('en', 'added_custom.txt')]);
const enRemoved = variantsOf([...forms('en', 'removed.txt'), ...forms('en', 'removed_custom.txt')]);
const frAdded = variantsOf([...forms('fr', 'added.txt'), ...forms('fr', 'added_custom.txt')]);
const frRemoved = variantsOf([...forms('fr', 'removed.txt'), ...forms('fr', 'removed_custom.txt')]);
const manualWords = { en: uniq([...enAdded, ...enRemoved]), fr: uniq([...frAdded, ...frRemoved]) };

for (const [base, vs] of Object.entries(LANGS)) {
  const words = base === 'en' ? ONLYEN : ONLYFR;
  for (const v of vs) {
    // single words as one-token lists (no tokenization), plus edge sentences from X-WORDTOK
    (v === LANGS[base][0] ? chunks(words, 400) : chunks(words.filter((_, i) => i % 3 === 0), 400)).forEach((c, i) => write(`words-${v}-${i}`, `tagger ${v}: edge words as single-token lists`, [tagList(v, c.map((w) => [w]))]));
    const edge0 = wtTexts(`edge-${v}.json`);
    const edge = v === LANGS[base][0] ? edge0 : edge0.filter((_, i) => i % 4 === 0); // variants: every 4th text (size cap)
    write(`edge-${v}`, `tagger ${v}: X-WORDTOK edge texts (sentence split, word tokenized, tagged)`, [tag(v, edge)]);
  }
  chunks(manualWords[base], 600).forEach((c, i) => write(`manual-words-${LANGS[base][0]}-${i}`, `tagger ${LANGS[base][0]}: forms of added/removed files (+ case and apostrophe variants) as single tokens`, [tagList(LANGS[base][0], c.map((w) => [w]))]));
  // token lists with whitespace tokens and sequences
  write(`sequences-${LANGS[base][0]}`, `tagger ${LANGS[base][0]}: token sequences incl. whitespace tokens, empty list, null token`, [
    tagList(LANGS[base][0], [[], [' '], ['\n'], ['a', ' ', 'b'], ['The', ' ', 'dog', '’', 's'], ['  ', '\t', 'x'], [null], ['x', null]]),
  ]);
}
// corpus and rule examples
const corpusCases = (base, v) => chunks(corpus(base), 25).forEach((c, i) => write(`corpus-${v}-${String(i).padStart(2, '0')}`, `tagger ${v}: corpus paragraphs`, [tag(v, c)]));
corpusCases('en', 'en-US'); corpusCases('en', 'en-GB'); corpusCases('fr', 'fr');
for (const [v, re] of [['en-US', /^examples-en-US-\d+\.json$/], ['en-GB', /^examples-variant-en-GB-\d+\.json$/], ['fr', /^examples-fr-\d+\.json$/]]) {
  let texts = uniq(wtFiles(re).flatMap(wtTexts));
  if (texts.length > 450) texts = texts.filter((_, i) => i % Math.ceil(texts.length / 450) === 0); // size cap
  chunks(texts, 500).forEach((c, i) => write(`examples-${v}-${String(i).padStart(2, '0')}`, `tagger ${v}: rule example texts`, [tag(v, c)]));
}
write('errors', 'null text, null token list, unknown language, out-of-scope language', [tag('en-US', [null, '']), tag('fr', [null]), { op: 'tag', args: { lang: 'zz', texts: ['a'] } }, tag('pl-PL', ['a b'])]);
write('long', 'very long inputs', ['en-US', 'fr'].map((v) => tag(v, ['x'.repeat(20000), 'dog '.repeat(800), "l'homme ".repeat(400), 'go-go '.repeat(400)])));

// ---- manual-tagger / word tagger lookups
const mt = (tagger, words) => ({ op: 'manual-tagger', args: { tagger, words } });
const ADD = (l) => ({ kind: 'manual', lang: l, files: ['added.txt', 'added_custom.txt'] });
const REM = (l) => ({ kind: 'manual', lang: l, files: ['removed.txt', 'removed_custom.txt'] });
for (const [l, base] of [['en', ONLYEN], ['fr', ONLYFR]]) {
  const words = uniq([...manualWords[l], ...base]);
  chunks(words, 1500).forEach((c, i) => {
    write(`wordtagger-${l}-${i}`, `${l}: ManualTagger(added+custom), ManualTagger(removed+custom), dictionary MorfologikTagger, BaseTagger word tagger of the language, for forms/edge words`, [
      mt(ADD(l), c), mt(REM(l), c),
      mt({ kind: 'dict', dict: `/${l}/${l === 'en' ? 'english' : 'french'}.dict` }, c),
      mt({ kind: 'dict', dict: `/${l}/${l === 'en' ? 'english' : 'french'}.dict`, internTags: true }, c.slice(0, 50)),
      mt({ kind: 'language', lang: l === 'en' ? 'en-US' : 'fr' }, c),
      mt({ kind: 'combining', tagger1: { kind: 'dict', dict: `/${l}/${l === 'en' ? 'english' : 'french'}.dict` }, tagger2: ADD(l), removal: REM(l), overwrite: true }, c),
      mt({ kind: 'combining', tagger1: { kind: 'dict', dict: `/${l}/${l === 'en' ? 'english' : 'french'}.dict` }, tagger2: ADD(l), overwrite: false }, c),
    ]);
  });
}
// inline manual tagger content: format traps (CORE-0211)
const T = '\t';
const content = [
  ['basic', `# comment\nfoo${T}foo${T}NN\nfoo${T}bar${T}VB\nbaz${T}baz${T}JJ # trailing\n\n   \nqux${T}qux${T}NN\n`],
  ['order-and-dups', `a${T}x${T}T1\na${T}y${T}T2\na${T}x${T}T1\nb${T}z${T}T3\n`],
  ['header-separator', `#separatorRegExp=;\nfoo;foo;NN\nfoo;bar;VB\nsp ace;lem;TAG\n`],
  ['header-separator-regex', `#separatorRegExp=\\s*\\|\\s*\nfoo | foo | NN\nbar|bar|VB\n`],
  ['header-late', `foo${T}foo${T}NN\n#separatorRegExp=;\nbar;bar;VB\nbaz${T}baz${T}X\n`],
  ['empty', ''],
  ['only-comments', '# a\n# b\n'],
  ['crlf', `foo${T}foo${T}NN\r\nbar${T}bar${T}VB\r\n`],
  ['bom', `﻿foo${T}foo${T}NN\nbar${T}bar${T}VB\n`],
  ['nbsp-error', `foo${T}foo${T}NN\nba r${T}bar${T}VB\n`],
  ['two-fields-error', `foo${T}foo\n`],
  ['four-fields-error', `foo${T}foo${T}NN${T}extra\n`],
  ['trailing-tab', `foo${T}foo${T}NN${T}\n`],
  ['trailing-empty-field', `foo${T}foo${T}\n`],
  ['empty-lemma', `foo${T}${T}NN\n`],
  ['empty-form', `${T}foo${T}NN\n`],
  ['hash-in-field', `fo#o${T}foo${T}NN\nbar${T}b#ar${T}VB\n`],
  ['hash-first-char', `#foo${T}foo${T}NN\nbar${T}bar${T}VB\n`],
  ['spaces-around', `  foo${T}foo${T}NN  \n foo ${T} foo ${T} NN \n`],
  ['spaces-tag-trim', `foo${T}foo${T}  NN  \n`],
  ['unicode', `Müller${T}Müller${T}NNP\nÄpfel${T}Apfel${T}NN:PLU\n😀${T}emoji${T}SYM\n𝒳${T}x${T}SYM\n`],
  ['case-sensitive', `Foo${T}foo${T}NN\nfoo${T}foo${T}NN\nFOO${T}foo${T}NN\n`],
  ['lemma-equals-form', `foo${T}foo${T}NN\nbar${T}baz${T}NN\n`],
  ['intern-tags', `foo${T}foo${T}NN\nbar${T}bar${T}NN\n`],
  ['regex-separator-special', `#separatorRegExp=.\nfoo.foo.NN\n`],
  ['separator-empty', `#separatorRegExp=\nfoo${T}foo${T}NN\n`],
  ['separator-invalid-regex', `#separatorRegExp=(\nfoo(foo(NN\n`],
  ['many-readings', Array.from({ length: 70 }, (_, i) => `w${T}l${i}${T}T${i}`).join('\n') + '\n'],
  ['many-forms', Array.from({ length: 300 }, (_, i) => `f${i}${T}l${i}${T}T${i % 7}`).join('\n') + '\n'],
];
const probe = ['foo', 'bar', 'baz', 'qux', 'Foo', 'FOO', 'a', 'b', 'x', 'w', 'f0', 'f299', 'f300', 'sp ace', 'sp', 'space', '', ' ', 'Müller', 'Äpfel', '😀', '𝒳', 'fo#o', 'fo', '#foo', 'nope', null];
write('manual-content', 'ManualTagger from inline UTF-8 content: format, separators, comments, errors', [
  ...content.map(([n, c]) => ({ op: 'manual-tagger', args: { tagger: { kind: 'manual', content: c }, words: probe, label: n } })),
  { op: 'manual-tagger', args: { tagger: { kind: 'manual', content: content[0][1], internTags: true }, words: probe, label: 'basic-intern' } },
]);
// combining tagger over inline taggers (CORE-0212)
const A = { kind: 'manual', content: `x${T}x1${T}A\nx${T}x2${T}B\ny${T}y1${T}A\nz${T}z1${T}C\n` };
const B = { kind: 'manual', content: `x${T}x3${T}D\nx${T}x1${T}A\ny${T}y2${T}E\nw${T}w1${T}F\n` };
const R = { kind: 'manual', content: `x${T}x1${T}A\ny${T}y2${T}E\nz${T}z1${T}C\nw${T}nolemma${T}F\n` };
const cw = ['x', 'y', 'z', 'w', 'v', '', null];
write('combining', 'CombiningTagger: union, overwrite, removal, duplicates (removeAll removes all equal), null removal', [
  ...[false, true].flatMap((o) => [
    mt({ kind: 'combining', tagger1: A, tagger2: B, overwrite: o }, cw),
    mt({ kind: 'combining', tagger1: A, tagger2: B, removal: R, overwrite: o }, cw),
    mt({ kind: 'combining', tagger1: B, tagger2: A, removal: R, overwrite: o }, cw),
    mt({ kind: 'combining', tagger1: A, tagger2: { kind: 'manual', content: '' }, removal: R, overwrite: o }, cw),
  ]),
  mt({ kind: 'combining', tagger1: { kind: 'manual', content: 'bad line\n' }, tagger2: B, overwrite: false }, cw),
]);
write('errors-wordtagger', 'unknown tagger kind, missing dict, language without BaseTagger', [
  mt({ kind: 'nope' }, ['x']),
  mt({ kind: 'dict', dict: '/en/nonexistent.dict' }, ['x']),
  mt({ kind: 'manual', lang: 'xx', files: ['added.txt'] }, ['x']),
]);
console.log('X-TAGGER case files:', readdirSync(DIR).length);
