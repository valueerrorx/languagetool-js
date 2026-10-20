// Generates oracle/cases/X-DECHUNK (inputs only; expectations come from the Java run).
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let seed = 51;
const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const text = readFileSync(path.join(ROOT, 'oracle/corpus/de/corpus.txt'), 'utf8').replace(/\s+/g, ' ');
const all = text.split(/(?<=[.!?“"])\s+(?=[A-ZÄÖÜ„"])/).map((s) => s.trim()).filter((s) => s.length > 3);
const picked = []; const used = new Set();
while (picked.length < 300 && picked.length < all.length) { const i = Math.floor(rnd() * all.length); if (!used.has(i)) { used.add(i); picked.push(all[i]); } }
const hand = ['Der große Hund und die kleine Katze spielen im Garten.', 'Die Kinder der Nachbarn gehen mit ihren Eltern in die Schule.', 'Ein Haus mit einem schönen Garten kostet viel Geld.',
  'Das Auto meines Vaters steht vor dem Haus.', 'Die Mitarbeiter und Mitarbeiterinnen des Unternehmens trafen sich am Montag.', 'Viele alte Menschen leben allein in großen Städten.',
  'Er gab dem Mann das Buch seiner Frau.', 'Die Bundesregierung hat gestern neue Maßnahmen beschlossen.', 'Mit dem Zug nach Berlin zu fahren ist bequem.',
  'Wegen des schlechten Wetters fiel das Spiel aus.', 'Sie sah den Mann mit dem Hut auf der Bank sitzen.', 'Zwei Millionen Euro wurden an die Stadt Wien überwiesen.',
  'Der Präsident der Vereinigten Staaten besuchte die Hauptstadt der Schweiz.', 'Peter und Maria kaufen Äpfel, Birnen und Bananen auf dem Markt.', 'Das ist das beste Essen, das ich je hatte.',
  'Die Katze schläft.', 'Hunde bellen.', 'Auf dem Tisch liegen drei rote Bücher.', 'Der Bürgermeister von München eröffnete das Oktoberfest.', 'Die Entscheidung des Gerichts überraschte alle Beteiligten.',
  'Frau Dr. Müller, die neue Leiterin der Abteilung, begrüßte die Gäste.', 'Er arbeitet bei der Deutschen Bahn AG in Frankfurt am Main.', 'Alle diese Fragen bleiben offen.',
  'In den letzten Jahren stiegen die Preise für Wohnungen deutlich.', 'Ich habe einen Hund, eine Katze und zwei Fische.'];
const edge = ['', ' ', '.', '!!!', '...', '?', ',', '„“', '()', 'a', 'Ich', 'Der', '1', '3,14', '1.000.000', '5,99 € für 10 % Rabatt.', 'Dr. Meier, Ph.D., wohnt in der Hauptstr. 12 in Wien.',
  'E-Mail: foo@bar.de oder http://example.org/a?b=c#d', 'Das ist\'s, wie\'s geht\'s.', 'Über Müller’s Straße naïve café.', 'Ärger, Öl, Übel, Äpfel, ÄÖÜ äöüß ẞ.', 'Emoji 😀 und astral 𝒳 Zeichen.',
  'x­y z.', 'tab\tseparated\tvalues', 'Zeile eins\nZeile zwei', 'Zeile.\r\nZeile2.', 'Donaudampfschifffahrtsgesellschaftskapitän und Rindfleischetikettierungsüberwachungsaufgabenübertragungsgesetz.',
  'DER SCHNELLE BRAUNE FUCHS SPRINGT ÜBER DEN FAULEN HUND', 'der schnelle braune fuchs springt über den faulen hund', '2026-03-15 um 10:30 Uhr', '12345678901234567890',
  'Ein sehr langer Satz '.repeat(120) + 'endet hier.', 'Wort'.repeat(800), 'Der alte Mann und das Meer, '.repeat(60) + 'Ende.', 'Chinesisch 中文 und Arabisch العربية Text.', 'Der der der der die die das das.', 'Und und und.',
  'Die Bundesrepublik Deutschland.', 'Der kleine, freundliche, alte, weise Mann.', 'Bayern-München, Baden-Württemberg, Nordrhein-Westfalen.', 'Lieber Herr Schmidt, vielen Dank für Ihre Nachricht.', 'z. B. u. a. d. h. usw.'];
const out = (id, name, c) => { const d = path.join(ROOT, 'oracle/cases', id); mkdirSync(d, { recursive: true }); writeFileSync(path.join(d, name + '.json'), JSON.stringify(c)); };
const base = (description, ops, compare = 'check-pipe') => ({ kind: 'harness', clock: 'fixed', description, normalize: [], compare, ops });
const chunks = (a, n) => { const r = []; for (let i = 0; i < a.length; i += n) r.push(a.slice(i, i + n)); return r; };
const pad = (i) => String(i).padStart(2, '0');
const id = 'X-DECHUNK';
rmSync(path.join(ROOT, 'oracle/cases', id), { recursive: true, force: true });
const ar = (lang, texts) => [{ op: 'analyze-raw', args: { lang, texts } }];
const dc = (lang, texts) => [{ op: 'de-chunker', args: { lang, texts } }];
chunks(picked, 20).forEach((c, i) => out(id, `analyze-corpus-${pad(i)}`, base('analyze-raw de-DE corpus: raw/post/pre with chunk tags (DE-0028, DE-0029, DE-0155)', ar('de-DE', c))));
chunks([...hand, ...edge], 12).forEach((c, i) => out(id, `analyze-edge-${pad(i)}`, base('analyze-raw de-DE hand-made NP/PP sentences and edge inputs', ar('de-DE', c))));
// multitoken lists as sentences
const dir = path.join(ROOT, 'oracle/java-src/languagetool-language-modules/de/src/main/resources/org/languagetool/resource/de');
const entries = (f) => readFileSync(path.join(dir, f), 'utf8').split('\n').filter((l) => l && !l.startsWith('#')).map((l) => l.split('\t')[0].replace(/\/[ESN]+$/, '')).filter((x) => x.includes(' '));
for (const [f, n] of [['multitoken-ignore.txt', 'ignore'], ['multitoken-suggest.txt', 'suggest']]) {
  const mw = entries(f); const step = Math.max(1, Math.floor(mw.length / 120)); const s = [];
  for (let i = 0; i < mw.length && s.length < 120; i += step) s.push(`Wir trafen ${mw[i]} gestern. ${mw[i]} ist hier.`);
  chunks(s, 20).forEach((c, i) => out(id, `analyze-multiword-${n}-${pad(i)}`, base(`analyze-raw de-DE entries of ${f} as sentences (DE-0028, DE-0179)`, ar('de-DE', c))));
}
const sg = readFileSync(path.join(ROOT, 'oracle/java-src/languagetool-core/src/main/resources/org/languagetool/resource/spelling_global.txt'), 'utf8').split('\n').filter((l) => l && !l.startsWith('#')).map((l) => l.split('\t')[0]).filter((x) => x.includes(' '));
{ const s = []; const step = Math.max(1, Math.floor(sg.length / 40)); for (let i = 0; i < sg.length && s.length < 40; i += step) s.push(`Wir sahen ${sg[i]} gestern. ${sg[i]} ist hier.`); chunks(s, 20).forEach((c, i) => out(id, `analyze-multiword-global-${pad(i)}`, base('analyze-raw de-DE entries of spelling_global.txt as sentences (DE-0028)', ar('de-DE', c)))); }
for (const v of ['de-AT', 'de-CH', 'de-DE-x-simple-language']) out(id, `analyze-variant-${v}`, base(`analyze-raw ${v}`, ar(v, [...picked.slice(0, 15), ...hand.slice(0, 5)])));
// GermanChunker direct
chunks([...hand, ...picked.slice(0, 60)], 17).forEach((c, i) => out(id, `chunker-${pad(i)}`, base('GermanChunker run directly on post-disambiguation and raw tokens vs pipeline (DE-0029, DE-0207)', dc('de-DE', c), 'jsonl')));
chunks(edge, 12).forEach((c, i) => out(id, `chunker-edge-${pad(i)}`, base('GermanChunker edge inputs', dc('de-DE', c), 'jsonl')));
for (const v of ['de-AT', 'de-CH']) out(id, `chunker-variant-${v}`, base(`GermanChunker ${v}`, dc(v, hand), 'jsonl'));
console.log('ok');
