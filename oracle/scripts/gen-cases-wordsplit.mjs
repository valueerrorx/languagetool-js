// Authors oracle/cases/X-WORDSPLIT/*.json (inputs only). Op wordsplit: docs/review/F23-oracle.md.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';

const DIR = path.join(ROOT, 'oracle/cases/X-WORDSPLIT');
rmSync(DIR, { recursive: true, force: true });
mkdirSync(DIR, { recursive: true });
const write = (name, description, ops) => writeFileSync(path.join(DIR, `${name}.json`), JSON.stringify({ kind: 'harness', clock: 'fixed', description, normalize: [], compare: 'jsonl', ops }, null, 1) + '\n');
const op = (args) => ({ op: 'wordsplit', args });
const chunks = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const uniq = (a) => [...new Set(a)];
const sample = (a, n) => (a.length <= n ? a : a.filter((_, i) => i % Math.ceil(a.length / n) === 0));

// corpus nouns: capitalised tokens of the de corpus
const corpus = readFileSync(path.join(ROOT, 'oracle/corpus/de/corpus.txt'), 'utf8');
const toks = uniq(corpus.match(/\p{Lu}\p{Ll}+/gu) ?? []).filter((w) => w.length >= 5);
const long = toks.filter((w) => w.length >= 10);
const mid = toks.filter((w) => w.length < 10);
const corpusNouns = uniq([...sample(long, 220), ...sample(mid, 180)]);
// spelling.txt plain words (compounds) and added.txt noun forms
const RES = path.join(ROOT, 'oracle/java-src/languagetool-language-modules/de/src/main/resources/org/languagetool/resource/de');
const sp = readFileSync(path.join(RES, 'hunspell/spelling.txt'), 'utf8').split('\n').map((l) => l.split('#')[0].trim()).filter((l) => l && !l.includes('/') && !l.includes('_') && /^\p{Lu}\p{Ll}+$/u.test(l) && l.length >= 9);
const spNouns = sample(sp, 250);

const EDGE = [
  '', ' ', 'a', 'ab', 'Ab', 'Haus', 'haus', 'HAUS', 'Hausa', 'Tür', 'Haustür', 'haustür', 'HAUSTÜR', 'Haustüren', 'Haustürschloss', 'Haustürschlüssel', 'Schlüssel',
  'Arbeitszimmer', 'Arbeitszimmertür', 'Arbeitsamt', 'Arbeitsamts', 'Arbeitsplatz', 'Arbeitsplätze', 'Arbeitszeit', 'Arbeitszeiten', 'Geburtstag', 'Geburtstagsfeier', 'Geburtstagskind', 'Geburtstagsgeschenk', 'Liebesbrief', 'Liebeskummer', 'Kindergarten', 'Kindergärten', 'Kindergartentante', 'Kinderzimmer', 'Kindesmissbrauch', 'Frühstück', 'Frühstückstisch', 'Frühstücksei', 'Hochzeit', 'Hochzeitstag', 'Hochzeitsreise', 'Hochzeitskleid', 'Zeitung', 'Zeitungsartikel', 'Zeitungspapier',
  'Donaudampfschifffahrt', 'Donaudampfschifffahrtsgesellschaft', 'Donaudampfschifffahrtsgesellschaftskapitän', 'Rindfleischetikettierungsüberwachungsaufgabenübertragungsgesetz', 'Bundesausbildungsförderungsgesetz', 'Lebensversicherungsgesellschaft', 'Lebensmittelgeschäft', 'Lebensmittelpunkt', 'Staatsangehörigkeit', 'Staatsexamen', 'Staatsanwalt', 'Staatsanwaltschaft', 'Landwirtschaft', 'Landwirtschaftsministerium', 'Landesregierung', 'Bundesregierung', 'Regierungschef', 'Wirtschaftswachstum', 'Wirtschaftskrise', 'Weltwirtschaftskrise', 'Gesundheitsministerium', 'Haushaltsdebatte', 'Verkehrsminister', 'Verkehrsministerium', 'Verkehrsschild', 'Verkehrszeichen',
  'Bindestrich-Kompositum', 'Bindestrich-Komposita', 'E-Mail-Adresse', 'E-Mail', 'Mail-Adresse', 'USB-Stick', 'WLAN-Router', 'Rhein-Main-Gebiet', 'Baden-Württemberg', 'Müller-Lüdenscheidt', 'Ost-West-Konflikt', 'Anti-Terror-Gesetz', 'Pro-Kopf-Einkommen', 'Haus-', '-Haus', '-', '--', '-Haus-', 'Haus-Tür', 'Haus-tür', 'haus-Tür', 'Haus--Tür', 'Haus-Tür-', 'Hausschlüssel-Tür', 'Kindergarten-Tante', 'Vitamin-C-Mangel', 'Sauerstoff-Flasche', 'S-Bahn-Station', 'U-Bahn-Station', 'U-Bahnhof',
  'Schweinebraten', 'Schweinsbraten', 'Hundehütte', 'Hundehuette', 'Hundshütte', 'Katzenfutter', 'Tagesschau', 'Tageszeitung', 'Tagebuch', 'Tageslicht', 'Wochenende', 'Wochenendhaus', 'Sonnenschein', 'Sonnenbrille', 'Sonnenaufgang', 'Sonnenuntergang', 'Mondschein', 'Liebling', 'Lieblingsfarbe', 'Lieblingsessen', 'Aufgabe', 'Aufgabenstellung', 'Aufgabenbereich', 'Bahnhof', 'Bahnhofshalle', 'Bahnhofsvorsteher', 'Bahnhofsuhr', 'Bahnhofsplatz', 'Handschuh', 'Handschuhe', 'Handschuhfach', 'Handtuch', 'Handtücher', 'Handgelenk', 'Wurstsalat', 'Wurstbrot', 'Wurstwaren', 'Käsekuchen', 'Käsebrot', 'Apfelbaum', 'Apfelsaft', 'Apfelkuchen', 'Kartoffelsalat', 'Kartoffelsuppe', 'Tomatensuppe', 'Tomatensalat', 'Gemüsesuppe', 'Hühnersuppe', 'Hühnerei', 'Bundesland', 'Bundesländer', 'Vaterland', 'Vaterlands', 'Vatertag', 'Vatertags', 'Muttertag', 'Muttertags', 'Muttersprache', 'Muttersprachler', 'Wehrmacht', 'Wehrmachts', 'Absolventen', 'Alkoholabstinenz', 'Patriarchen', 'Phosgen',
  'Verhalten', 'Verhaltensregel', 'Verhaltensweise', 'Verhaltenstherapie', 'Verhaltensforschung', 'Aufenthalt', 'Aufenthaltsort', 'Aufenthaltsgenehmigung', 'Aufenthaltsraum', 'Ausbildung', 'Ausbildungsplatz', 'Ausbildungsvergütung', 'Einsamkeit', 'Freiheit', 'Freiheitsstrafe', 'Freiheitsstatue', 'Gesellschaft', 'Gesellschaftsspiel', 'Gesellschaftsform', 'Krankenhaus', 'Krankenhäuser', 'Krankenkasse', 'Krankenschwester', 'Krankenwagen', 'Krankheit', 'Krankheitsverlauf', 'Krankheitssymptom',
  'Samt', 'Samtes', 'Samthandschuh', 'Samtjacke', 'Samtkleid', 'Gesamtheit', 'Gesamtschule', 'Gesamtsumme', 'Gesamtbetrag', 'Insgesamt', 'Beisammensein', 'Beisammen', 'Amtsgericht', 'Amtsleiter', 'Amtszeit', 'Amtssprache', 'Amtsblatt', 'Amtsgeheimnis', 'Bürgermeister', 'Bürgermeisterin', 'Oberbürgermeister', 'Bürgersteig', 'Bürgerinitiative', 'Bürgerrecht', 'Bürgerrechte', 'Menschenrecht', 'Menschenrechte', 'Menschenrechtsverletzung', 'Menschenwürde', 'Menschenmenge', 'Friedensnobelpreis', 'Friedensvertrag', 'Friedensbewegung', 'Kriegsende', 'Kriegsverbrechen', 'Kriegsgefangene', 'Weltkrieg', 'Zweiter', 'Weltmeisterschaft', 'Fußballweltmeisterschaft', 'Fussballweltmeisterschaft', 'Fußballspiel', 'Fußballplatz', 'Fußball', 'Fussball', 'Straßenbahn', 'Strassenbahn', 'Straßenbahnhaltestelle', 'Straßenschild', 'Straße', 'Strasse', 'Großstadt', 'Grossstadt', 'Großmutter', 'Großvater', 'Großeltern', 'Größenwahn', 'Gruppenfoto', 'Maßnahme', 'Maßnahmen', 'Maßnahmenkatalog', 'Fußgängerzone', 'Fußgänger', 'Fußgängerübergang', 'Süßigkeit', 'Süßwaren', 'Süßwasser', 'Weißbrot', 'Weißwein', 'Rotwein', 'Rotkohl', 'Schwarzwald', 'Schwarzbrot', 'Schwarzmarkt', 'Österreich', 'Österreicher', 'Schüler', 'Schülerausweis', 'Schülerzeitung', 'Mädchenname', 'Mädchen', 'Äpfel', 'Äpfelchen', 'Öffnungszeiten', 'Öffnungszeit', 'Übersetzung', 'Übersetzungsfehler', 'Überweisung', 'Überweisungsformular', 'Übergangszeit', 'Überraschungsei', 'Ölpreis', 'Ölwechsel', 'Ölheizung', 'Ärztehaus', 'Ärztekammer', 'Ärztin', 'Ärztinnen',
  'Haushalt', 'Haushaltsgerät', 'Haushaltsgeräte', 'Haushaltshilfe', 'Computerspiel', 'Computerspiele', 'Internetseite', 'Internetseiten', 'Handyvertrag', 'Handyverträge', 'Staubsaugerbeutel', 'Zahnarzttermin', 'Zahnarztpraxis', 'Zahnbürste', 'Zahnpasta', 'Autobahnraststätte', 'Autobahn', 'Autobahnauffahrt', 'Autoschlüssel', 'Autoreifen', 'Reifenwechsel', 'Fahrradweg', 'Fahrradschloss', 'Fahrradständer', 'Schreibtischlampe', 'Schreibtisch', 'Schreibmaschine', 'Schreibwaren', 'Schreibweise', 'Wohnzimmerschrank', 'Wohnzimmer', 'Wohnungstür', 'Wohnungsnot', 'Wohnungssuche', 'Gartenzaun', 'Gartentor', 'Gartenhaus', 'Gartenarbeit', 'Weihnachtsbaum', 'Weihnachtsbaumschmuck', 'Weihnachtsmarkt', 'Weihnachtsmann', 'Weihnachtsgeschenk', 'Osterhase', 'Osterei', 'Ostereier', 'Osterfest',
  // misspellings / unsplittable / non-nouns
  'Hauptbahnhoff', 'Haustuer', 'Haustüür', 'Hausstür', 'Hausstuer', 'Kindergarden', 'Kinderzimer', 'Arbeitszimmmer', 'Geburtstagsfeier', 'Geburtstagfeier', 'Xyzzy', 'Qwertz', 'Asdfgh', 'Blablabla', 'Zzzzzz', 'Aaaaaaaa', 'xxxxxxxxxxxx', 'Qwertzuiop', 'Lorem', 'Ipsum', 'Dolor', 'laufen', 'gehen', 'schnell', 'schnelle', 'unglaublich', 'Unglaublichkeit', 'schwarzweiß', 'rotgrün', 'dunkelblau', 'hellgrün', 'bitte', 'danke', 'und', 'oder', 'der', 'Die', 'Das', 'Ein', 'ICH', 'nicht', 'wegen', 'trotzdem', 'deswegen', 'Weg', 'Wegweiser', 'Wegen', 'Wegrand',
  // short words
  'ab', 'an', 'ei', 'Ei', 'Eis', 'Eisen', 'Eisenbahn', 'Eisbär', 'Eiscreme', 'Eiswürfel', 'Ofen', 'Backofen', 'Pizzaofen', 'Zug', 'Zugfahrt', 'Zugführer', 'Tee', 'Teetasse', 'Teekanne', 'See', 'Seeufer', 'Seereise', 'Meer', 'Meeresrauschen', 'Meeresfrüchte', 'Uhr', 'Uhrzeit', 'Armbanduhr', 'Ohr', 'Ohrring', 'Ohrringe', 'Ohrwurm', 'Bus', 'Busfahrer', 'Busbahnhof', 'Bushaltestelle', 'Kuh', 'Kuhmilch', 'Kuhstall', 'Gas', 'Gasherd', 'Gasheizung', 'Öl', 'Tal', 'Talsperre', 'Tor', 'Torwart', 'Torschütze',
  // digits / punctuation / whitespace / non-latin
  '1', '12', '123', 'Haus1', '1Haus', 'Haus2Tür', '3-Zimmer-Wohnung', '3-Zimmer', '5-jährig', '20er', '2024er', '90er-Jahre', 'Haus 2', 'Haus Tür', ' Haustür', 'Haustür ', 'Haus\tTür', 'Haus\nTür', 'Haus.Tür', 'Haus_Tür', 'Haus/Tür', 'Haus,Tür', "Haus'Tür", 'Haus’s', "Haus's", 'Hauses', 'Hauss', 'Haus s', 'Häuser', 'Häuschen', 'Hausen', 'Hausens', 'Hausaufgabe', 'Hausaufgaben', 'Hausaufgabenhilfe',
  'Ünïcödé', 'Café', 'Zürich', 'Zuerich', 'Ꜳ', 'ß', 'ẞ', 'SS', 'STRASSE', 'STRAßE', 'FUSSBALL', 'FUSSBALLSPIEL', 'Fussballspiel', 'ÄPFEL', 'ÖLPREIS', 'ÜBERSETZUNG', 'ΑΒΓ', 'Дом', '家', '😀', 'Haus😀Tür', 'Haus̈Tür', 'Haus­Tür', 'Haus​Tür', 'Ｈａｕｓ', 'ǅaus', 'İstanbul', 'ı', 'ﬁ', 'Haus\u0000Tür',
];
// length boundary (max word length 70)
const rep = (s, n) => { let r = ''; while (r.length < n) r += s; return r.slice(0, n); };
const LEN = [60, 69, 70, 71, 72, 100, 500, 5000].map((n) => rep('Haus', n)).concat([69, 70, 71].map((n) => rep('Tür', n)), [70, 71].map((n) => rep('Haus-', n)), [70, 71].map((n) => 'Ä' + rep('ö', n - 1)), ['Donaudampfschifffahrtsgesellschaftskapitänsmützenhalterungsschraubenhersteller', 'Donaudampfschifffahrtsgesellschaftskapitänsmütze', 'Rindfleischetikettierungsüberwachungsaufgabenübertragungsgesetzes']);
// case variants
const CASE = ['Haustür', 'Kindergarten', 'Geburtstagsfeier', 'Bundesregierung', 'Fußballspiel', 'Arbeitszimmer'].flatMap((w) => [w.toLowerCase(), w.toUpperCase(), w[0].toLowerCase() + w.slice(1), w[0] + w.slice(1).toUpperCase(), w.replace(/(.)(.)/g, (m, a, b) => a.toUpperCase() + b.toLowerCase())]);
// Fugen-s / interfix probes: X + s + Y combos
const FUG_A = ['Geburt', 'Arbeit', 'Liebe', 'Staat', 'Bund', 'Land', 'Wirtschaft', 'Gesellschaft', 'Freiheit', 'Regierung', 'Stadt', 'Heimat', 'Zeit', 'Tag', 'Jahr', 'Haus', 'Kind', 'Hund', 'Schwein', 'Rind', 'Hilfe', 'Hilf', 'Krieg', 'Frieden'];
const FUG_B = ['Tag', 'Amt', 'Zimmer', 'Feier', 'Recht', 'Rat', 'Hilfe', 'Haus', 'Tür', 'Platz', 'Plan', 'Samt', 'Sache'];
const FUG = FUG_A.flatMap((a) => FUG_B.flatMap((b) => [a + b, a + 's' + b, a + 'es' + b, a + 'e' + b, a + 'en' + b, a + 'n' + b, a + '-' + b, a + 's-' + b]));
const FUGS = sample(FUG, 700);

const tokOps = (words, impls) => impls.map((impl) => op({ impl, words }));
const ALL_IMPLS = ['tok-strict', 'tok-nonstrict'];
// (1) corpus nouns, strict and non-strict (+ german-* on every chunk)
chunks(corpusNouns, 100).forEach((c, i) => write(`corpus-nouns-${String(i).padStart(2, '0')}`, 'corpus nouns: tokenizer strict / non-strict, German accessors', tokOps(c, [...ALL_IMPLS, 'german-strict', 'german-nonstrict'])));
chunks(spNouns, 125).forEach((c, i) => write(`spelling-nouns-${i}`, 'spelling.txt nouns: strict / non-strict', tokOps(c, [...ALL_IMPLS, 'german-strict', 'german-nonstrict'])));
// (2) edge words
chunks(uniq(EDGE), 150).forEach((c, i) => write(`edge-${i}`, 'edge words: strict / non-strict / ctor / default / German accessors', tokOps(c, ['tok-strict', 'tok-nonstrict', 'tok-ctor-strict', 'tok-ctor-nonstrict', 'tok-default', 'german-strict', 'german-nonstrict'])));
write('length', 'length boundary around max 70', tokOps(LEN, ['tok-strict', 'tok-nonstrict', 'german-strict', 'german-nonstrict']));
write('case', 'case variants', tokOps(CASE, ALL_IMPLS));
chunks(FUGS, 175).forEach((c, i) => write(`interfix-${i}`, 'Fugen-s / interfix combinations', tokOps(c, ALL_IMPLS)));
write('null-input', 'null word', [...tokOps([null, '', 'Haus'], ['tok-strict', 'tok-nonstrict', 'tok-default', 'german-strict', 'german-nonstrict']), op({ impl: 'ws', method: 'getAllSplits', words: [null, '', 'Haus'] }), op({ impl: 'ws', method: 'splitWord', words: [null, ''] })]);
write('identity', 'memoised instances, result list types, mutability', [op({ impl: 'identity' })]);

// (3) plain jwordsplitter (DE-0206 / DE-0208): options, getAllSplits, hide interfix, sub words
const WS_WORDS = uniq([...sample(corpusNouns, 90), ...sample(spNouns, 30), ...EDGE.filter((w) => w.length > 2).filter((_, i) => i % 3 === 0), 'Haustür', 'Arbeitszimmertür', 'Geburtstagsfeier', 'Liebesbrief', 'Samthandschuh', 'Gesamtschule', 'Amtsgericht', 'Schweinebraten', 'Sauerstoff-Flasche', 'Haus-Tür', 'Haus-', '-Haus', '-', 'Haus--Tür']);
const wsMatrix = [
  ['default', {}], ['strict', { strict: true }], ['nonstrict', { strict: false }], ['hide', { hide: true }], ['hide-nonstrict', { hide: true, strict: false }],
  ['min5', { min: 5 }], ['min1', { min: 1 }], ['min0', { min: 0 }], ['min-1', { min: -1 }], ['minhuge', { min: 2147483647 }], ['max10', { max: 10 }], ['max0', { max: 0 }], ['max-1', { max: -1 }], ['maxhuge', { max: 2147483647 }],
];
for (const [name, o] of wsMatrix) {
  const ws = WS_WORDS.length > 150 ? sample(WS_WORDS, 150) : WS_WORDS;
  write(`ws-${name}`, `plain GermanWordSplitter options ${JSON.stringify(o)}: splitWord / getAllSplits / splitWord(collect) / getSubWords`, ['splitWord', 'getAllSplits', 'splitWordSub', 'getSubWords'].map((method) => op({ impl: 'ws', method, words: ws, ...o })));
}
const EXC = { Haustür: ['Haus', 'tür'], 'HAUSKATZE': ['Haus', 'Katze'], Kindergarten: ['Kindergarten'], 'Liebesbrief': ['Liebes', 'brief'], 'Samthandschuh': ['Samt', 'Handschuh'], 'Sauerstoff-Flasche': ['Sauerstoff', 'Flasche'], '': ['x'] };
write('ws-exceptions', 'addException (key lowercased) incl. empty key and case variants', ['splitWord', 'getAllSplits'].map((method) => op({ impl: 'ws', method, words: ['Haustür', 'haustür', 'HAUSTÜR', 'Hauskatze', 'Kindergarten', 'Kindergartens', 'Liebesbrief', 'Samthandschuh', 'Sauerstoff-Flasche', '', 'Haus', 'Haustüren', 'Kinderzimmer'], exceptions: EXC })));
write('ws-exceptions-nonstrict', 'addException in non-strict mode', [op({ impl: 'ws', method: 'splitWord', words: ['Haustür', 'Hauskatze', 'Kindergarten', 'Xyzabc', 'Haustürxyz'], exceptions: EXC, strict: false })]);
const CW = ['Haus', 'Tür', 'Schloss', 'Schlüssel', 'Katze', 'Kater', 'Hund', 'Arbeit', 'Zimmer', 'Amt', 'Samt', 'Hand', 'Schuh', 'Tag', 'Geburt', 'Feier', 'Liebe', 'Brief', 'Ab', 'Abc'];
for (const [name, o] of [['strict', {}], ['nonstrict', { strict: false }], ['hide', { hide: true }], ['min2', { min: 2 }]]) {
  write(`ws-customwords-${name}`, 'GermanWordSplitter(boolean, Set) custom word list', ['splitWord', 'getAllSplits', 'getSubWords'].map((method) => op({ impl: 'ws', method, customWords: CW, words: ['Haustür', 'Haustürschloss', 'Hausschlüssel', 'Hauskatze', 'Katzenhaus', 'Hundehaus', 'Arbeitszimmer', 'Arbeitsamt', 'Samthandschuh', 'Geburtstag', 'Geburtstagsfeier', 'Liebesbrief', 'Amtstür', 'Abc', 'Abhaus', 'Hausab', 'Haus-Tür', 'Haus-', '-Tür', 'Tür-Haus', 'Haussamt', 'Haussamts', 'Haussamtes', 'Hausstür', 'Haustürs', 'Hauses', 'Xyz', ''], ...o })));
}
write('ws-customwords-empty', 'empty custom word list', [op({ impl: 'ws', method: 'splitWord', customWords: [], words: ['Haustür', 'Haus', ''] }), op({ impl: 'ws', method: 'splitWord', customWords: [], strict: false, words: ['Haustür', 'Haus', ''] })]);

// (4) main(args)
write('main', 'GermanCompoundTokenizer.main with words / file (stdout captured)', [
  op({ impl: 'main', words: ['Haustür'] }),
  op({ impl: 'main', words: ['Haustür', 'Arbeitszimmertür', 'Geburtstagsfeier', 'Xyzzy', ''] }),
  op({ impl: 'main', words: ['Donaudampfschifffahrtsgesellschaft', 'Vatertag', 'Vaterland', 'Müller-Lüdenscheidt', rep('Haus', 71)] }),
  op({ impl: 'main', words: [], fileContent: 'Haustür\nArbeitszimmertür\n\nGeburtstagsfeier\nKindergarten-Tante\nÄpfel\r\nÜbersetzung\n' }),
  op({ impl: 'main', words: ['Haus'], fileContent: 'Haustür\n' }),
  op({ impl: 'main', words: [], fileContent: '' }),
]);
console.log(`wrote ${DIR}`);
