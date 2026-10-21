// Authors oracle/cases/X-DERULES-A (F56, inputs only). Op: replace-check mode rules (StyleOps). Docs: docs/review/F56-oracle.md.
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';

const D = path.join(ROOT, 'oracle/cases/X-DERULES-A'); rmSync(D, { recursive: true, force: true }); mkdirSync(D, { recursive: true });
const w = (name, description, ops) => writeFileSync(path.join(D, `${name}.json`), JSON.stringify({ kind: 'harness', clock: 'fixed', description, normalize: ['paths'], compare: 'jsonl', ops }) + '\n');
const sha = (s) => createHash('sha1').update(String(s)).digest('hex');
const pick = (a, n) => [...a].sort((x, y) => (sha(x) < sha(y) ? -1 : 1)).slice(0, n);
const chunks = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, (i + 1) * n));
const uniq = (a) => [...new Set(a)];
const C = (text, level = 'DEFAULT') => ({ text, level });
const lv = (arr, level = 'DEFAULT') => arr.map((t) => C(t, level));
const rop = (lang, ids, cases, extra = {}) => ({ op: 'replace-check', args: { mode: 'rules', lang, ids, ...extra, cases } });
const JT = path.join(ROOT, 'oracle/java-src/languagetool-language-modules/de/src/test/java/org/languagetool/rules/de');
const RES = path.join(ROOT, 'resources/org/languagetool/resource/de');
const unesc = (s) => s.replace(/\\(u[0-9a-fA-F]{4}|.)/g, (_, c) => c[0] === 'u' && c.length === 5 ? String.fromCharCode(parseInt(c.slice(1), 16)) : ({ n: '\n', t: '\t', r: '\r' }[c] ?? c));
// all string literals of a JUnit file, text-like only
function lits(name) {
  const src = readFileSync(path.join(JT, `${name}Test.java`), 'utf8').replace(/\/\/[^\n]*/g, (m) => (m.includes('"') ? m : '')).replace(/\/\*[\s\S]*?\*\//g, '');
  const res = []; const re = /"((?:[^"\\\n]|\\.)*)"/g; let m;
  while ((m = re.exec(src))) { const s = unesc(m[1]).replace(/<\/?marker>/g, ''); if (s.length >= 3 && /[A-Za-zÄÖÜäöüß]/.test(s) && !res.includes(s)) res.push(s); }
  return res;
}
const dataLines = (f) => readFileSync(path.join(RES, f), 'utf8').split('\n').map((l) => l.replace(/\s*#.*$/, '').trim()).filter(Boolean);

const VARS = ['de-DE', 'de-AT', 'de-CH'];
const EDGE = ['', ' ', 'x', 'Ünï cödé wörds — „zitiert“ ‚Text‘.', 'a'.repeat(300), 'Zeile eins.\nZeile zwei.', 'Tab\tgetrennt.', '1234 5678.', '😀 Emoji 😀.', 'Der der der der.', 'Ein ein Haus.', '  Leading and trailing  ', '. . .', '!!', '..'];
const corpus = readFileSync(path.join(ROOT, 'oracle/corpus/de/corpus.txt'), 'utf8');
const sentences = pick(corpus.split(/(?<=[.!?])\s+/).map((s) => s.replace(/\s+/g, ' ').trim()).filter((s) => s.length > 20 && s.length < 240), 400);
const paras = chunks(sentences.slice(0, 160), 8).map((c) => c.join(' '));

// rule table: name -> [ids, test file, targeted]
const R = {
  coherency: { ids: ['DE_COMPOUND_COHERENCY'], test: 'CompoundCoherencyRule', inv: 'DE-0047' },
  infinitiv: { ids: ['COMPOUND_INFINITIV_RULE'], test: 'CompoundInfinitivRule', inv: 'DE-0048', full: true },
  conjunction: { ids: ['SENTENCE_BEGINNING_WITH_CONJUNCTION_DE'], test: null, inv: 'DE-0049' },
  dash: { ids: ['DE_DASH'], test: 'DashRule', inv: 'DE-0050' },
  du: { ids: ['DE_DU_UPPER_LOWER'], test: 'DuUpperLowerCaseRule', inv: 'DE-0051' },
  commaws: { ids: ['COMMA_PARENTHESIS_WHITESPACE'], test: 'GermanCommaWhitespaceRule', inv: 'DE-0052' },
  compounds: { ids: ['DE_COMPOUNDS'], test: 'GermanCompoundRule', inv: 'DE-0053/0177' },
  chcompounds: { ids: ['DE_CH_COMPOUNDS'], test: 'SwissCompoundRule', inv: 'DE-0054' },
  doublepunct: { ids: ['DE_DOUBLE_PUNCTUATION'], test: null, inv: 'DE-0056' },
  relclause: { ids: ['COMMA_IN_FRONT_RELATIVE_CLAUSE', 'COMMA_BEHIND_RELATIVE_CLAUSE'], test: 'MissingCommaRelativeClauseRule', inv: 'DE-0075' },
  missingverb: { ids: ['MISSING_VERB'], test: 'MissingVerbRule', inv: 'DE-0076' },
  oldspelling: { ids: ['OLD_SPELLING_RULE'], test: 'OldSpellingRule', inv: 'DE-0078/0082?' },
  sentws: { ids: ['DE_SENTENCE_WHITESPACE'], test: 'SentenceWhitespaceRule', inv: 'DE-0082' },
  subjverb: { ids: ['DE_SUBJECT_VERB_AGREEMENT'], test: 'SubjectVerbAgreementRule', inv: 'DE-0090', full: true },
  verbagree: { ids: ['DE_VERBAGREEMENT'], test: 'VerbAgreementRule', inv: 'DE-0094', full: true },
  wieder: { ids: ['DE_WIEDER_VS_WIDER'], test: 'WiederVsWiderRule', inv: 'DE-0095' },
};

// targeted inputs per rule (in addition to JUnit literals)
const T = {};
T.coherency = ['Das Wort E-Mail und die Email sind gleich.', 'Eine E-Mail kam an. Die Email war lang.', 'Der Zoo-Besuch war schön. Der Zoobesuch dauerte lange.', 'Der Online-Shop ist offen. Der Onlineshop ist offen.', 'Das Wi-Fi geht. Das WiFi geht nicht.', 'Der Blog-Eintrag und der Blogeintrag.', 'Der Foto-Apparat und der Fotoapparat.', 'Eine Mail. Eine E-Mail.', 'Der Make-up-Artist. Der Makeup-Artist.', 'Der Eis-Bär. Der Eisbär. Der Eis-Bär.'];
T.infinitiv = ['Ich brachte ihn dazu, mein Zimmer sauber zu machen.', 'Du brauchst nicht bei mir vorbei zu kommen.', 'Er versucht das Auto kaputt zu machen.', 'Sie hat vor, das Haus fertig zu bauen.', 'Wir wollen das Fenster auf zu machen.', 'Ich habe keine Lust, dort hin zu gehen.', 'Er scheint hier her zu kommen.', 'Es ist schwer, Rad zu fahren.', 'Das Kind versucht, sitzen zu bleiben.', 'Er begann, sauber zu machen.', 'Um wieder zu errichten.', 'Er hat keine Zeit, spazieren zu gehen.', 'Er versucht, nach Hause zu laufen.', 'Sie lernt, Auto zu fahren.', 'Ich versuche, das Buch fertig zu lesen.'];
T.conjunction = ['Und dann ging er. Aber er kam zurück. Oder auch nicht.', 'Er ging. Doch sie blieb. Denn es war spät. Sondern er wollte.', 'Und. Aber. Oder. Denn. Sowie. Weil es so ist.', 'Aber das stimmt nicht.', 'Das stimmt. Und das auch.', 'Er kam. Sie ging. Wir blieben.', '„Und dann?“ fragte sie. Aber er schwieg.', '- Und so weiter.\nUnd noch eine Zeile.', 'Und ' + 'doch '.repeat(20) + 'sicher. Und noch einer. Und noch einer. Und noch einer.', 'Sowohl er als auch sie. Weder noch. Entweder oder.'];
T.dash = ['Diäten- Erhöhung', 'Diäten-Erhöhung', 'Die Diäten- Erhöhung kommt.', 'Das ist eine Haus- und Gartenarbeit.', 'Die Zucker- und Salzmenge.', 'Er kauft Vor- bzw. Nachnamen.', 'Kosten- und Nutzenanalyse', 'Ein Test- Fall.', 'Die A- Klasse.', 'Der Rund- Kurs und Rund -Kurs.', 'Berlin- Mitte', 'E- Mail', 'Ein Bindestrich - kein Problem.', 'Und- Verknüpfung.', 'Top- 10 Liste', '10- Euro-Schein', 'Pro- und Contra-Argumente'];
T.du = ['Wie geht es Dir? Bist du wieder gesund?', 'Wie geht es dir? Bist Du wieder gesund?', 'Hast du dich gefreut? Ich freue mich für Dich.', 'Du bist toll. Ich mag du.', 'Ich liebe Dich. Ich liebe dich.', 'Dein Haus und dein Auto. Dein Hund und Dein Hund.', 'Euer Haus, euer Auto. Euch gefällt Euer Haus.', 'Ihr kommt. Ihr geht. Euch ist kalt.', 'Dir gehört das. Deiner ist schöner. deiner nicht.', 'Du, du, Du.', 'Hallo Du, wie geht es dir?', 'Sie kommen. Du kommst. Dich sehe ich. dich nicht.', 'Du kannst dir überlegen, ob Du kommst.'];
T.commaws = ['Das ist ein Satz , mit Fehler .', 'Das ist ein Satz,ohne Leerzeichen.', 'Die Partei( die große) gewinnt.', 'Hallo ( Welt ) hier.', 'Besuchen Sie www.beispiel.de.', 'Die .de-Domain ist alt.', 'Eine .com-Domain und .net-Domains.', 'Hier steht .at-Domain und .ch-Domains und .info-Domains.', 'Siehe .abcdefghijk-Domain.', 'Text .a-Domain.', 'Zahlen 3,5 und 3, 5 und 3 ,5.', 'Ein Test…und noch einer .', '„Zitat “ und „ Zitat“.', 'Satz ; Semikolon : Doppelpunkt .'];
T.compounds = ['Das ist eine CD ROM.', 'Wir kaufen eine CD-ROM.', 'Die Mund zu Mund Beatmung.', 'Ein Start up Unternehmen.', 'Das Wort Sauerstoff Flasche.', 'Er trinkt Eis Kaffee.', 'Die Hand Tasche ist schön.', 'Ein Bahn Hof in Berlin.', 'Er wohnt in Bad Homburg.', 'Der Auto Bahn Ring.'];
T.chcompounds = ['Das ist eine Straße Bahn.', 'Die Fuss Ball Mannschaft.', 'Eine Stras sen bahn.', 'Das Gross Mutter Haus.', 'Das Fuß Ball Spiel.'];
T.doublepunct = ['Das ist ein Satz..', 'Das ist ein Satz...', 'Das ist ein Satz....', 'Er kam z. B..', 'Er kam z.B..', 'Hier steht usw..', 'Wirklich?? Ja!!', 'Wirklich?! Ja!?', 'Wort,, Wort.', 'Wort;; Wort.', 'Ein Satz.. Noch ein Satz.', 'Das ist.. . ein Test.', 'Eine Zahl 3.. und 4...', 'Das ist nicht.. gut.', '..', '...', '. .', 'Punkt . . Punkt.', 'Das ist ein Satz..\n\nNoch einer..'];
T.relclause = ['Das Auto das ich gekauft habe ist rot.', 'Das Auto, das ich gekauft habe ist rot.', 'Das Auto das ich gekauft habe, ist rot.', 'Das Auto, das ich gekauft habe, ist rot.', 'Der Mann der dort steht ist mein Vater.', 'Die Frau die ich liebe wohnt hier.', 'Das ist ein Buch das ich gelesen habe und das mir gefallen hat.', 'Ich kenne den Mann der dort wohnt.', 'Sie kauft Kleider die schön sind und die nichts kosten.', 'Das Haus in dem wir wohnen ist alt.', 'Die Kinder deren Eltern kommen sind froh.', 'Der Hund den ich sah bellte laut.', 'Er sagt dass das Auto das dort steht rot ist.', 'Der Mann, der kommt und der geht.', 'Das Mädchen welches dort steht lacht.', 'Wer das sagt der lügt.'];
T.missingverb = ['Nix für ungut!', 'Bis nächste Woche.', 'Nicht schon wieder!', 'Ein Haus in der Stadt am See.', 'Das schöne Haus am See dort.', 'Der Mann mit dem Hut aus Wolle.', 'Er geht nach Hause.', 'Ein sehr langer Satz ohne ein einziges Verb hier.', 'Die Katze auf dem Dach im Regen heute.', '1 2 3 4 5 6 7', 'A B C D E F', 'Ein Haus. Ein Baum. Ein Strauch am Weg dort.', 'Wie schön, dass du da bist und mit uns feierst.', 'Herzlichen Glückwunsch zum Geburtstag und alles Gute!', '„Guten Tag, meine sehr verehrten Damen und Herren“'];
T.oldspelling = ['Er läßt das Fenster offen.', 'Er lässt das Fenster offen.', 'Das daß ist alt.', 'Ich weiß, daß er kommt.', 'Das Photo ist schön.', 'Der Delphin und der Delfin.', 'Die Potential und das Potenzial.', 'Er ißt gerne.', 'Der Schiffahrt Verein.', 'Schifffahrt und Schiffahrt.', 'Er wußte es.', 'Das Geschoß und das Geschoss.', 'Ein Büffet und ein Buffet.', 'Das Stengel und der Stängel.', 'Rauhreif und Raureif.', 'Der Känguruh.', 'Das Quentchen und das Quäntchen.', 'Aufwendig und aufwändig.', 'Greuel und Gräuel.', 'Das ist ein Missbrauch, nein ein Mißbrauch.'];
T.sentws = ['Das ist ein Satz.Das ist der nächste.', 'Das ist ein Satz. Das ist der nächste.', 'Am 1.Mai gehen wir.', 'Am 1. Mai gehen wir.', 'Am 12.März und am 3.April.', 'Der 1.FC Köln.', 'Siehe S.5 und S. 6.', 'Das ist z.B. ein Beispiel.Und noch eins.', 'Ein Satz!Ein zweiter?Ein dritter.', 'Satz eins.\nSatz zwei.', 'www.beispiel.de ist toll.', 'Version 3.5 ist da.', 'Er kam um 10.30 Uhr.', 'Datum 1.1.2020 und 31.12.2020.', 'Wirklich?Ja.', 'Hallo.“Welt“.', 'Ende.', '1.', '1.A', 'Der 3.Platz.', 'Uhrzeit 12.Dezember.'];
T.subjverb = ['Wer ist da, die Kinder sind da.', 'Alle Mitarbeiter, die das sagt, sind falsch.', 'Jeder, der das sagen, hat recht.', 'Die Kinder, die das sagt.', 'Der Mann, der das sagen.', 'Wer das sagen, hat recht.', 'Wer das sagt, hat recht.', 'Alle, die das sagt.', 'Manche, die kommt, geht.', 'Jede, die kommen, irrt.', 'Ich und er gehen.', 'Er und ich geht.', 'Du und ich gehe.', 'Wir und ihr geht.', 'Weder er noch ich gehst.', 'Entweder du oder ich gehe.', 'Er oder sie gehen.', 'Er oder ich gehe.', 'Hier ist die Männer.', 'Hier sind der Mann.', 'Die Frau und der Mann ist da.', 'Der Mann und die Frau sind da.', 'Das Mädchen und der Junge sind da.', 'Wer von uns beiden kommen?', 'Einer der Männer sind da.', 'Eine der Frauen ist da.', 'Keiner der Männer waren da.', 'Die meisten sagt es.'];
T.wieder = ['Das spiegelt die Situation wieder.', 'Das spiegelt die Situation wider.', 'Das spiegelt wieder die Situation.', 'Die Situation spiegelt sich wieder.', 'Das Bild spiegelt sich im See wider.', 'Er spiegelte das Licht wieder.', 'Das spiegelt sich in vielen Dingen wieder, die wir sehen.', 'Wir sehen uns wieder.', 'Er kommt wieder und spiegelt nichts.', 'Das spiegelt. Wieder ein Satz.', 'Es spiegeln sich die Werte wieder.', 'Das Wasser spiegelt den Himmel Wieder.', 'Das Ergebnis spiegelt die Leistung nicht wieder.', 'Sie spiegelt nicht wieder und nicht wider.'];

// verb agreement grid
const prons = ['ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'Ich', 'Du', 'Er', 'Wir', 'Ihr', 'Sie', 'man', 'wer', 'was', 'jemand', 'niemand'];
const verbs = ['bin', 'bist', 'ist', 'sind', 'seid', 'war', 'warst', 'waren', 'habe', 'hast', 'hat', 'haben', 'habt', 'gehe', 'gehst', 'geht', 'gehen', 'kann', 'kannst', 'können', 'könnt', 'will', 'willst', 'wollen', 'wollt', 'esse', 'isst', 'essen', 'werde', 'wirst', 'wird', 'werden', 'werdet', 'mache', 'machst', 'macht', 'machen', 'sage', 'sagte', 'sagtest', 'sagten', 'sagtet', 'muss', 'musst', 'müssen', 'müsst', 'darf', 'darfst', 'dürfen', 'soll', 'sollst', 'sollen', 'sollt'];
const grid = []; for (const p of prons) for (const v of verbs) grid.push(`${p} ${v} das.`);
for (const p of prons.slice(0, 7)) for (const v of ['gehe', 'gehst', 'geht', 'gehen']) grid.push(`Heute ${v} ${p} nach Hause.`, `Ich glaube, dass ${p} ${v}.`);
const subjGrid = []; const subjs = ['Wer', 'Alle', 'Jeder', 'Jede', 'Manche', 'Mancher', 'Jedes', 'Allen', 'wer', 'Keiner', 'Einige'];
for (const s of subjs) for (const rel of ['der', 'die', 'das', 'denen', 'was']) for (const v of ['kommt', 'kommen', 'kommst', 'komme', 'sagt', 'sagen']) subjGrid.push(`${s}, ${rel} dort ${v}, hat Recht.`, `${s} ${v} dort, ${rel} sich meldet.`);

// data-derived
const comp = dataLines('compounds.txt').filter((x) => !/[\\()|\[\]{}.]/.test(x));
const cities = dataLines('compound-cities.txt').filter((x) => !/[\\()|\[\]{}.]/.test(x));
const strip = (e) => e.replace(/[$+?*]+$/, '');
const apart = (e) => strip(e).replace(/-/g, ' ');
const compApart = pick(comp, 2400).map((e) => `Das ist ${apart(e)} hier.`);
const compLowerApart = pick(comp, 800).map((e) => { const p = strip(e).split('-'); return `Wir sahen ${p.map((x, i) => (i ? x.toLowerCase() : x)).join(' ')} dort.`; });
const compHyph = pick(comp, 800).map((e) => `Wir sahen ${strip(e)} dort.`);
const compJoined = pick(comp, 800).map((e) => { const p = strip(e).split('-'); return `Wir sahen ${p[0]}${p.slice(1).map((x) => x.toLowerCase()).join('')} dort.`; });
const cityApart = cities.map((e) => `Wir fuhren nach ${apart(e)} heute.`);
const cityHyph = cities.map((e) => `Wir fuhren nach ${strip(e)} heute.`);
const cohPairs = pick(comp, 500).map((e) => { const s = strip(e); const p = s.split('-'); return p.length > 1 ? `Der ${s} war da. Später sahen wir den ${p[0]}${p.slice(1).map((x) => x.toLowerCase()).join('')} wieder.` : null; }).filter(Boolean);
const cohPairs2 = pick(comp, 300).map((e) => { const s = strip(e); const p = s.split('-'); return p.length > 1 ? `Der ${p[0]}${p.slice(1).map((x) => x.toLowerCase()).join('')} war da.\n\nDann kam der ${s}.` : null; }).filter(Boolean);
const old = dataLines('alt_neu.csv').map((l) => l.split(';')).filter((p) => p.length >= 2 && /^[A-Za-zÄÖÜäöüß]+$/.test(p[0]));
const oldS = pick(old, 600).map((p) => `Wir sahen ${p[0]} dort.`);
const oldNew = pick(old, 200).map((p) => `Wir sahen ${p[1]} dort.`);
const oldCap = pick(old, 200).map((p) => `${p[0].charAt(0).toUpperCase()}${p[0].slice(1)} war hier.`);

// corpus variants
const corpusVariants = (fn) => sentences.map(fn).filter((s, i) => s !== sentences[i]);
const noComma = corpusVariants((s) => s.replace(/, (der|die|das|den|dem|welche|welcher|welches|dessen|deren)\b/g, ' $1'));
const noSpace = corpusVariants((s) => s.replace(/\. ([A-ZÄÖÜ])/, '.$1'));
const swapDu = corpusVariants((s) => s.replace(/\b(ich|wir)\b/, (m) => (m === 'ich' ? 'du' : 'ihr')));
const dblp = corpusVariants((s) => s.replace(/\.$/, '..'));
const noSpPunct = corpusVariants((s) => s.replace(/, /, ' , '));
const wiederInj = corpusVariants((s) => s.replace(/\.$/, ' wieder.'));
const pronInj = corpusVariants((s) => s.replace(/\b(ich|wir|er|sie)\b (\w+)/, (m, a, b) => `${a === 'ich' ? 'du' : a === 'wir' ? 'er' : 'ich'} ${b}`));

const chunksOps = (l, ids, items, levels = ['DEFAULT', 'PICKY'], extra = {}, sz = 80) => levels.flatMap((lvl) => chunks(lv(items, lvl), sz).map((c) => rop(l, ids, c, extra)));

for (const [k, r] of Object.entries(R)) {
  const test = r.test ? lits(r.test) : [];
  const targeted = uniq([...(T[k] ?? []), ...test]);
  const vars = ['compounds', 'chcompounds'].includes(k) || true ? VARS : ['de-DE'];
  for (const l of vars) {
    const full = l === 'de-DE';
    const nm = r.full ? 'full-' : '';
    let items = targeted.concat(EDGE);
    let extraOps = [];
    if (k === 'verbagree' || k === 'subjverb') { items = items.concat(k === 'verbagree' ? grid : subjGrid); }
    if (!full) { items = items.slice(0, 160); }
    w(`${k}-${nm}targeted-${l}`, `${r.inv}: ${r.ids.join('+')} on JUnit literals + targeted + edge (${l}), DEFAULT and PICKY${r.full ? '; rule needs full JLanguageTool rule list' : ''}`, chunksOps(l, r.ids, items));
  }
}
// data-derived
const dd = (name, desc, k, items, vars = VARS, n = 99999) => { for (const l of vars) w(`${name}-${l}`, desc + ` (${l})`, chunksOps(l, R[k].ids, l === 'de-DE' ? items : items.slice(0, 200), l === 'de-DE' ? ['DEFAULT', 'PICKY'] : ['DEFAULT'], {}, 100)); };
dd('compounds-data-apart', 'DE-0053/0177: compounds.txt entries written apart', 'compounds', compApart);
dd('compounds-data-lower', 'DE-0053/0177: compounds.txt entries apart, lowercase tails', 'compounds', compLowerApart);
dd('compounds-data-hyphen', 'DE-0053/0177: compounds.txt entries correct hyphenated (no match expected)', 'compounds', compHyph);
dd('compounds-data-joined', 'DE-0053/0177: compounds.txt entries joined', 'compounds', compJoined);
dd('compounds-cities', 'DE-0053/0177: compound-cities.txt apart and hyphenated', 'compounds', cityApart.concat(cityHyph));
dd('chcompounds-data-apart', 'DE-0054/0177: Swiss compounds from compounds.txt apart (ss/ß)', 'chcompounds', compApart.map((s) => s).concat(compApart.slice(0, 600).map((s) => s.replace(/ss/g, 'ß'))));
dd('chcompounds-data-hyphen', 'DE-0054: Swiss compounds hyphenated/joined', 'chcompounds', compHyph.concat(compJoined));
dd('chcompounds-cities', 'DE-0054: compound-cities for Swiss rule', 'chcompounds', cityApart);
dd('coherency-data', 'DE-0047: hyphen/joined pairs from compounds.txt', 'coherency', cohPairs.concat(cohPairs2));
dd('oldspelling-data', 'DE-0078: alt_neu.csv old forms, new forms, capitalised', 'oldspelling', oldS.concat(oldNew, oldCap));
// both compound rules together (priority/overlap)
w('compounds-both-de-CH', 'DE-0053/0054: DE_COMPOUNDS and DE_CH_COMPOUNDS active together (de-CH, de-DE)', ['de-CH', 'de-DE'].map((l) => rop(l, ['DE_COMPOUNDS', 'DE_CH_COMPOUNDS'], lv(pick(compApart, 300).concat(T.compounds, T.chcompounds)))));
// config for conjunction
w('conjunction-config-de-DE', 'DE-0049: percent threshold config 0,1,10,50,100,-1', [0, 1, 10, 50, 100, -1, 7].map((n) => rop('de-DE', R.conjunction.ids, lv(T.conjunction.concat(paras.slice(0, 6), [sentences.slice(0, 10).map((s) => 'Und ' + s).join(' ')])), { config: { SENTENCE_BEGINNING_WITH_CONJUNCTION_DE: [n] } })));
// corpus
const corpusFor = { coherency: [], infinitiv: sentences, conjunction: paras, dash: sentences, du: swapDu, commaws: noSpPunct, compounds: sentences, chcompounds: sentences, doublepunct: dblp, relclause: noComma.concat(sentences), missingverb: sentences, oldspelling: sentences, sentws: noSpace, subjverb: sentences, verbagree: pronInj.concat(sentences), wieder: wiederInj };
for (const [k, r] of Object.entries(R)) {
  const nm = r.full ? 'full-' : '';
  const base = corpusFor[k].length ? corpusFor[k] : sentences;
  w(`${k}-${nm}corpus-de-DE`, `${r.inv}: ${r.ids.join('+')} on corpus sentences and variants (de-DE), DEFAULT and PICKY`, chunksOps('de-DE', r.ids, base.slice(0, 400), ['DEFAULT', 'PICKY'], {}, 100));
  w(`${k}-${nm}corpus-paras`, `${r.inv}: ${r.ids.join('+')} on multi-sentence paragraphs (text-level behaviour), de-DE/de-AT/de-CH`, VARS.map((l) => rop(l, r.ids, lv(paras.concat(chunks(base.slice(0, 80), 10).map((c) => c.join(' '))), 'DEFAULT'))));
}
w('coherency-corpus-paras-injected', 'DE-0047: paragraphs with injected hyphen/joined pairs', [rop('de-DE', R.coherency.ids, lv(paras.slice(0, 10).map((p, i) => p + ' ' + cohPairs[i])))]);
// all rules together
const allIds = Object.values(R).flatMap((r) => r.ids);
w('combined-de-DE', 'DE-0047..0095: all F56 rules active together, targeted + corpus (de-DE/de-AT/de-CH)', VARS.flatMap((l) => ['DEFAULT', 'PICKY'].map((lvl) => rop(l, allIds, lv(Object.values(T).flat().concat(sentences.slice(0, 60)), lvl)))));
console.log('ok');
