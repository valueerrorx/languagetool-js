// Authors oracle/cases/X-DESPELL (inputs only): GermanSpellerRule A (a-*, F52) and B (b-*, F53). Ops sr-check/sr-word/sr-misc (de-* kinds, DeSpellOps), hs-rule, enspell-misc. Doc: docs/review/F52-oracle.md, F53-oracle.md.
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';

const D = path.join(ROOT, 'oracle/cases/X-DESPELL');
rmSync(D, { recursive: true, force: true }); mkdirSync(D, { recursive: true });
const w = (name, description, ops) => writeFileSync(path.join(D, `${name}.json`), JSON.stringify({ kind: 'harness', clock: 'fixed', description, normalize: ['paths'], compare: 'jsonl', ops }) + '\n');
const op = (o, args) => ({ op: o, args });
const RES = path.join(ROOT, 'resources/org/languagetool/resource');
const DE = path.join(RES, 'de');
const sha = (s) => createHash('sha1').update(s).digest('hex');
const shaSort = (a, salt = '') => [...a].sort((x, y) => (sha(salt + x) < sha(salt + y) ? -1 : 1));
const chunks = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, (i + 1) * n));
let seed = 770077;
const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const ri = (n) => Math.floor(rnd() * n);
const AL = 'abcdefghijklmnopqrstuvwxyzäöüß';
function typo(x) {
  const cs = [...x]; const k = ri(4); const i = ri(cs.length);
  if (k === 0) cs.splice(i, 0, AL[ri(AL.length)]);
  else if (k === 1 && cs.length > 1) cs.splice(i, 1);
  else if (k === 2 && cs.length > 1) { const j = Math.min(i, cs.length - 2); [cs[j], cs[j + 1]] = [cs[j + 1], cs[j]]; } else cs[i] = AL[ri(AL.length)];
  return cs.join('');
}
const lines = (f) => (existsSync(f) ? readFileSync(f, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')) : []);
const corpus = readFileSync(path.join(ROOT, 'oracle/corpus/de/corpus.txt'), 'utf8');
const sents = shaSort(corpus.split(/(?<=[.!?])\s+/).map((s) => s.replace(/\s+/g, ' ').trim()).filter((s) => s.length > 20 && s.length < 200), 'de-despell');
const toks = shaSort([...new Set([...corpus.matchAll(/[\p{L}\p{M}]+(?:-[\p{L}\p{M}]+)*/gu)].map((m) => m[0]))], 'tok');
const strip = (l) => l.replace(/\/.*$/, '');
const pick = (a, n, salt = 'p') => shaSort(a, salt).slice(0, n);
const typoSent = (s) => { const ws = s.split(' '); const i = ri(ws.length); ws[i] = typo(ws[i]); if (rnd() < 0.3) { const j = ri(ws.length); ws[j] = typo(ws[j]); } return ws.join(' '); };

const VARS = [
  { c: 'DE', lang: 'de-DE', id: 'GERMAN_SPELLER_RULE' },
  { c: 'AT', lang: 'de-AT', id: 'AUSTRIAN_GERMAN_SPELLER_RULE' },
  { c: 'CH', lang: 'de-CH', id: 'SWISS_GERMAN_SPELLER_RULE' },
];
const ignore = lines(path.join(DE, 'hunspell/ignore.txt'));
const prohibit = lines(path.join(DE, 'hunspell/prohibit.txt'));
const spelling = lines(path.join(DE, 'hunspell/spelling.txt'));
const spellingW = spelling.map(strip);
const altNeu = lines(path.join(DE, 'alt_neu.csv')).map((l) => l.split(';')[0]);
const infixS = lines(path.join(DE, 'words_infix_s.txt'));
const verbStems = lines(path.join(DE, 'verb_stems.txt'));
const verbPrefixes = lines(path.join(DE, 'verb_prefixes.txt'));
const otherPrefixes = lines(path.join(DE, 'other_prefixes.txt'));
const cap = (x) => x[0].toUpperCase() + x.slice(1);
const nouns = toks.filter((t) => /^[A-ZÄÖÜ][a-zäöüß]{3,}$/.test(t));

// ---- compound / special inputs (F52)
const compounds = [];
for (let i = 0; i < 40; i++) compounds.push(nouns[ri(nouns.length)] + nouns[ri(nouns.length)].toLowerCase());
for (const s of pick(infixS, 25, 'infix')) compounds.push(cap(nouns[ri(nouns.length)].toLowerCase()) + s + nouns[ri(nouns.length)].toLowerCase());
for (const v of pick(verbStems, 15, 'vs')) for (const p of pick(verbPrefixes, 1, v)) compounds.push(p + v + 'en', cap(p + v) + 'ung');
for (const p of pick(otherPrefixes, 20, 'op')) compounds.push(cap(p) + nouns[ri(nouns.length)].toLowerCase(), p + 'haus');
const compoundTypos = compounds.slice(0, 40).map(typo);
const SPECIAL = ['Lehrer*innen', 'Lehrer:innen', 'Lehrer_innen', 'Lehrer/-innen', 'LehrerInnen', 'Schüler*in', 'Schüler:in', 'Ärzt*innen', 'Kolleg*innen', 'Student_in', 'Mitarbeiter:innen', 'Bürger*innenmeister', 'Xyzabc*innen',
  'Stil- und Grammatikprüfung', 'Stil-, Text- und Grammatikprüfung', 'Vor- und Nachteile', 'Ein- und Ausgang', 'Haus- oder Gartentür', 'Xyzab- und Grammatikprüfung', 'Stil- und Grammatikprüfunk', 'An- bzw. Abreise',
  'Bund/Länder-Konferenz', 'Hin- & Rückfahrt', 'Auf-', 'ab- und zuzahlen', 'Ost- und Westdeutschland',
  'USB-Stick', 'E-Mail-Adresse', 'S-Bahn', 'U-Bahn-Station', 'SBahn', 'UBahn', 'Wi-Fi', 'CD-ROM', 'Dipl.-Ing.', 'z.B.', 'bzw.', 'u.a.', 'Abb.', 'Prof.', 'Dr.-Ing.',
  'http://www.example.com', 'www.beispiel.de', 'a.b@c.de', 'datei_name.txt', '@user_name_x', '3-jährig', '3-Jährige', '10er', 'Nr.5', '1.Mai', '25%', '€5', 'x1', 'Ü30', 'LKW-Fahrer', 'PKWs', 'GmbH', 'Hallo,Welt', 'Haus.Tür',
  'daß', 'muß', 'Fluß', 'Fluss', 'Strasse', 'Straße', 'Maßnahme', 'Massnahme', 'Abgasausstoss', 'Mueller', 'Müller', 'Grüezi', 'Velo', 'Jänner', 'Paradeiser', 'heute abend', 'Heute Abend', 'zuhause', 'nichtsdestotrotz', 'garnicht', 'Garnicht', 'AuthentIsch', 'Spielzug', 'Spielzugs'];

// ---- A: checks over corpus sentences
let n = 0;
const sCases = (list) => list.map((text) => ({ text }));
for (const v of VARS) {
  const k = v.c === 'DE' ? 5 : 3;
  for (let i = 0; i < k; i++) {
    const base = sents.slice(300 + i * 80 + (v.c === 'DE' ? 0 : 20), 300 + i * 80 + 60 + (v.c === 'DE' ? 0 : 20));
    const list = [...base.slice(0, 40).map(typoSent), ...base.slice(40, 50), ...base.slice(50, 60).map((s) => s.replace(/ss/g, 'ß').replace(/ß/g, 'ss'))];
    w(`a-check-${v.lang}-${String(i).padStart(2, '0')}`, `${v.id} matches over corpus sentences with seeded typos`, [op('sr-check', { lang: v.lang, ids: [v.id], cases: sCases(list) })]);
    n++;
  }
  const cs = [...compounds.slice(0, 60), ...compoundTypos, ...SPECIAL];
  w(`a-check-compound-${v.lang}`, `${v.id} matches: compound acceptance and special acceptance as sentences`, [
    op('sr-check', { lang: v.lang, ids: [v.id], cases: chunks(cs, 4).map((c) => ({ text: `${c.join(' ')}.` })) }),
    op('sr-check', { lang: v.lang, ids: [v.id], cases: cs.map((x) => ({ text: `Das ist ${x} und mehr.` })) }),
  ]);
  w(`a-check-opts-${v.lang}`, `${v.id} matches: user words, ignoreTokens, acceptPhrases, considerIgnore, levels, modes`, [
    op('sr-check', { lang: v.lang, ids: [v.id], userWords: ['Mydictwort', 'Zzyxx', 'Lehrerin'], cases: [{ text: 'Das Mydictwort und das Zzyxx und Mydictwörter und Mydictwrt und Tippfehlr Zzyxxe.' }, { text: 'mydictwort ZZYXX Lehrerinnen Lehrerinen.' }, { text: 'Hausmydictwort Mydictwortbuch.' }] }),
    op('sr-check', { lang: v.lang, ids: [v.id], ignoreTokens: ['Tippfehlr', 'foo', 'Haus Tür'], cases: [{ text: 'Tippfehlr foo Foo bar Tippfehlrs.' }] }),
    op('sr-check', { lang: v.lang, ids: [v.id], acceptPhrases: ['Neu Yorkk', 'foo bar', 'Zwei Wörterr'], cases: [{ text: 'In Neu Yorkk ist foo bar und Neu York und Zwei Wörterr hier.' }] }),
    op('sr-check', { lang: v.lang, ids: [v.id], considerIgnore: false, cases: [{ text: 'LanguageTool und Zzyxx und xx und ' + pick(ignore, 3, v.c).join(' ') + '.' }] }),
    op('sr-check', { lang: v.lang, ids: [v.id], cases: [{ text: 'Tippfehlr hier.', level: 'PICKY' }, { text: 'Tippfehlr hier.', mode: 'TEXTLEVEL_ONLY' }, { text: 'Tippfehlr hier.', mode: 'ALL_BUT_TEXTLEVEL_ONLY' }, { text: '' }, { text: ' ' }, { text: 'x' }] }),
  ]);
  n += 2;
  // lists
  const ws = [...pick(ignore, 80, 'ig' + v.c), ...pick(prohibit, 80, 'pr' + v.c), ...pick(spellingW, 60, 'sp' + v.c), ...pick(lines(path.join(DE, `hunspell/spelling-de-${v.c === 'DE' ? 'AT' : v.c}.txt`)).map(strip), 30), ...pick(altNeu, 30, 'alt'), ...pick(infixS, 15, 'ifx'), ...pick(verbStems, 15, 'vst'), ...pick(otherPrefixes, 15, 'opx'), ...pick(spelling.filter((l) => l.includes('/')), 40, 'exp').map(strip)];
  const lw = [...new Set(ws.filter(Boolean))];
  w(`a-words-${v.lang}`, `${v.id} sr-word: ignore/prohibit/spelling lists, old spelling, prefixes, ignorePotentiallyMisspelledWord, isMisspelled (no suggestions)`, chunks(lw, 30).map((c) => op('sr-word', { lang: v.lang, id: v.id, words: c })));
  w(`a-hsrule-${v.lang}`, `${v.id} hs-rule isMisspelled: compounds, specials, typos`, chunks([...compounds, ...compoundTypos, ...SPECIAL], 40).map((c) => op('hs-rule', { lang: v.lang, id: v.id, words: c })));
  n += 2;
}

// ---- A: messages, data, line expander, prepareLineForSpeller, addIgnoreWords
const ssWords = ['Strasse', 'Fluss', 'Gruss', 'Fuss', 'Maass', 'Mass', 'Spass', 'Abgasausstoss', 'Strasse und Fluss', 'Baumstrasse', 'Hausstrasse', 'aussen', 'draussen', 'heissen', 'weissen', 'Gebaeudemass', 'Preiss', 'Passs', 'ss', 'xss', 'Aasss', 'Hoss', 'Beeuss', 'Haus', 'Streiss', 'Flusss', 'Kuss', 'Biss', 'Riss', 'Schloss'];
w('a-messages', 'GermanSpellerRule#getMessage ss->ß branches (pairs and derived) in de-DE/AT/CH', [
  ...VARS.map((v) => op('sr-misc', { kind: 'de-gsr', lang: v.lang, id: v.id, words: ssWords, messages: [['Strasse', 'Straße'], ['Strasse', 'Strasse'], ['Aussen', 'Außen'], ['aussen', 'außen'], ['ssa', 'ßa'], ['Ssa', 'ßa'], ['xssa', 'xßa'], ['Hauss', 'Haußx'], ['Fluss', null], ['Fluss', 'Fluß'], ['Aassen', 'Aaßen'], ['Moossen', 'Mooßen'], ['abcssd', 'abcßd'], ['Strassse', 'Straßsse']] })),
  ...VARS.map((v) => op('sr-check', { lang: v.lang, ids: [v.id], cases: sCases(ssWords.map((x) => `Wir gehen die ${x} entlang.`)) })),
]);
w('a-data', 'GermanSpellerRule data sets (sizes, hashes, membership), ADDITIONAL_SUGGESTIONS size', VARS.map((v) => op('sr-misc', { kind: 'de-data', lang: v.lang, id: v.id, probes: [...pick(verbStems, 3, 'p1'), ...pick(verbPrefixes, 3, 'p2'), ...pick(otherPrefixes, 3, 'p3'), ...pick(infixS, 3, 'p4'), ...pick(altNeu, 4, 'p5'), 'Haus', 'läßt', 'ab', 'fahr', 'ZZZ', ''] })));
const leLines = [...pick(spelling.filter((l) => l.includes('/')), 120, 'le'), ...pick(spelling.filter((l) => !l.includes('/')), 20, 'le2'),
  'Haus/S', 'Haus/N', 'Haus/E', 'Haus/A', 'Haus/ESNA', 'Haus/P', 'Haus/F', 'Haus/T', 'Haus/X', 'laufen/E', 'gehen/E', 'sein/E', 'Lehrer_in', 'Lehrer_innen', 'Schüler_in/S', '', '/', '/S', 'a/', '#', 'x#y', 'x/S#c', 'Haus/S # c', 'Haus/{S}', 'Haus/{X}', 'Haus/', 'ab-gehen/E', 'Haus/SN', 'schön/A', 'groß/A', 'rot/A', 'Test/P', 'Test/F', 'Test/T', 'mach+en/E', '|', 'a b/S', 'Bäcker/N', 'ß/S', 'Süß/A', 'Käse/N', 'Frau/N', 'Mensch/EN', 'Au/S', 'Ei/S'];
w('a-lineexpander', 'LineExpander#expandLine on spelling.txt lines and synthetic edge cases', chunks(leLines, 30).map((c) => op('sr-misc', { kind: 'de-lineexpand', lines: c })));
w('a-prepare-line', 'German#prepareLineForSpeller (DE-0006) for de/de-AT/de-CH', ['de', 'de-AT', 'de-CH'].map((lang) => op('enspell-misc', { kind: 'prepare', lang, lines: ['', 'foo', 'foo/E', 'foo/S', 'foo/N', 'foo/ES', 'foo/SN', 'foo/X', 'foo/', '/E', '/', '#', 'foo # c', 'foo/E # c', 'foo#bar/E', ' foo/E', 'foo /E', 'Haus/S', 'laufen/E', 'Äpfel/N', 'foo/E/S', '#foo', 'a/N#b', ...pick(spelling.filter((l) => l.includes('/')), 30, 'pl')] })));
const ig = ['Foo-*', 'Fooß-*', 'Bar', 'Baß/S', 'Haus/S', 'Straße/N', 'Fußball-*', 'Ein/E', 'Xyzabc', '-*', 'Lehrer_in', 'Nein/{X}'];
w('a-addignore', 'GermanSpellerRule#addIgnoreWords ß->ss (CH), "-*" compound words, expansion', VARS.map((v) => op('sr-misc', { kind: 'de-gsr', lang: v.lang, id: v.id, words: [], addIgnore: ig, afterWords: ['Foo', 'Foos', 'Fooß', 'Fooss', 'Bar', 'Bars', 'Baß', 'Bass', 'Basses', 'Hauses', 'Straße', 'Strasse', 'Straßen', 'Strassen', 'Fußballs', 'Fussball', 'Fooverein', 'Fusshallenverein', 'Xyzabc', 'Xyzabcs', 'Foobar', 'Barfoo', 'Fußballfoo', 'Lehrer_in', 'Lehrer_innen'] })));
n += 6;

// ---- B: suggestions
const tokPool = toks.filter((t) => t.length >= 4 && t.length <= 18);
for (const v of VARS) {
  const k = v.c === 'DE' ? 4 : 2;
  for (let i = 0; i < k; i++) {
    const ws = [...tokPool.slice(i * 60, i * 60 + 30).map(typo), ...tokPool.slice(i * 60 + 30, i * 60 + 40).map((t) => typo(typo(t))), ...tokPool.slice(i * 60 + 40, i * 60 + 45).map((t) => t.toLowerCase().replace(/^./, (c) => c)), ...compoundTypos.slice(i * 8, i * 8 + 8)];
    w(`b-sugg-${v.lang}-${String(i).padStart(2, '0')}`, `${v.id} candidates/suggestions/sorted/message per typo word (order)`, chunks(ws, 20).map((c) => op('sr-misc', { kind: 'de-gsr', lang: v.lang, id: v.id, words: c })));
    n++;
  }
  const base = sents.slice(700, 740);
  w(`b-check-${v.lang}`, `${v.id} matches with suggestions over typo sentences`, [op('sr-check', { lang: v.lang, ids: [v.id], cases: sCases(base.map(typoSent)) })]);
  n++;
}

// ADDITIONAL_SUGGESTIONS keys: derive sample words from the put(...) regex keys in the original source
const src = readFileSync(path.join(ROOT, 'oracle/java-src/languagetool-language-modules/de/src/main/java/org/languagetool/rules/de/GermanSpellerRule.java'), 'utf8');
const keys = [...src.matchAll(/^\s*(put|putRepl)\("((?:[^"\\]|\\.)*)"/gm)].map((m) => m[2].replace(/\\\\/g, '\\'));
function sample(rx, alt) {
  let out = '', i = 0;
  const parse = () => {
    let s = '';
    while (i < rx.length && rx[i] !== ')' && rx[i] !== '|') {
      let atom;
      const ch = rx[i];
      if (ch === '(') { i++; if (rx.startsWith('?:', i)) i += 2; const opts = []; opts.push(parse()); while (rx[i] === '|') { i++; opts.push(parse()); } i++; atom = opts[alt % opts.length]; }
      else if (ch === '[') { const j = rx.indexOf(']', i); const cls = rx.slice(i + 1, j); i = j + 1; atom = cls.startsWith('^') ? 'x' : /[a-zäöüßA-Z]-/.test(cls) ? cls[0] : cls[alt % cls.length]; }
      else if (ch === '\\') { atom = rx[i + 1] === 'w' ? 'a' : rx[i + 1] === 's' ? ' ' : rx[i + 1] === 'd' ? '1' : rx[i + 1]; i += 2; }
      else if (ch === '.') { atom = 'a'; i++; }
      else if (ch === '^' || ch === '$') { atom = ''; i++; }
      else { atom = ch; i++; }
      const q = rx[i];
      if (q === '?') { i++; if (alt % 2 === 0) atom = atom; else atom = ''; }
      else if (q === '*') { i++; if (alt % 2) atom = ''; }
      else if (q === '+') { i++; }
      else if (q === '{') { const j = rx.indexOf('}', i); i = j + 1; }
      s += atom;
    }
    return s;
  };
  out = parse();
  return out;
}
const sampled = [];
for (const k of keys) for (const alt of [0, 1]) { try { const s = sample(k, alt); if (s && s.length < 60 && !sampled.includes(s)) sampled.push(s); } catch { /* skip */ } }
const keyWords = [...new Set(sampled)];
for (const v of VARS) {
  const ws = v.c === 'DE' ? keyWords : keyWords.filter((_, i) => i % 6 === (v.c === 'AT' ? 0 : 3));
  const withCase = v.c === 'DE' ? [...ws, ...ws.filter((_, i) => i % 7 === 0).map(cap), ...ws.filter((_, i) => i % 11 === 0).map((x) => x.toUpperCase())] : ws;
  const reqs = chunks(withCase, 25).map((c) => op('sr-misc', { kind: 'de-gsr', lang: v.lang, id: v.id, words: c }));
  chunks(reqs, 28).forEach((r, i) => { w(`b-addsugg-${v.lang}-${String(i).padStart(2, '0')}`, `${v.id} ADDITIONAL_SUGGESTIONS keys (sampled from put(...) regexes) + case variants`, r); n++; });
}
// getOnlySuggestions, filterNoSuggestWords, patterns
const only = ['Büffet', 'Buffett', 'Bufett', 'Büffett', 'Bufet', 'Büfet', 'Buffet', 'Büfett', 'symphatisch', 'symphatische', 'symphatischem', 'symphatischere', 'Autentisch', 'autentische', 'autentischsten', 'brilliant', 'brilliante', 'brilliantem', 'rechtmässig', 'rechtmässige', 'rechtmässigeren', 'Massnahme', 'Massnahmen', 'Maßnamen', 'Holzpanel', 'Spiegelpanels', 'Holzpanelen', 'SBahn', 'SBahnhof', 'SBahnhofs', 'SBahnzüge', 'UBahn', 'UBahnlinien', 'UBahntunnel', 'Neger', 'negerhaus', 'Hausneger', 'Haus-neger-x', 'hunger arbeit', 'zeit lang', 'Haus hunger', 'Lager', 'angst haben', 'ibelkeit', 'Übelkeit', 'Unibelkeit', 'Mayonnaise', 'Majonäse', 'Mayonäse', 'Reservierung', 'Resavirung', 'Reschaschierx', 'Laborants', 'Professionell', 'Proffesionell', 'Verstehendniss', 'Verstehendnis', 'diagnozier', 'diagnosierte', 'ab', 'Abc', 'Zb', 'zB', 'z.B', 'zBx', 'nord', 'Montags', 'Montagx', 'Allmähllich', 'allmählig', 'Schaf', 'Alpenschaf', 'Alpenschafe', 'Hausschafen', 'Gruße', 'Grußes', 'Emailadresse', 'Irelandreise', 'Standartwerk', 'Makeupartist', 'Krisenmanagment', 'Kreissaalx', 'Ei', 'ES', '', 'a', ' '];
w('b-onlysugg', 'getOnlySuggestions / filterNoSuggestWords / pattern branches (SYMPHATISCH, BRILLIANT, SBahn, Büffet de-AT/CH, ...)', VARS.map((v) => op('sr-misc', { kind: 'de-gsr', lang: v.lang, id: v.id, words: only })));
n++;
// old spelling words / spelling.txt typo derivation
const old = pick(altNeu, 60, 'oldsp');
w('b-oldspelling', 'alt_neu.csv words: check + suggestions (OldSpelling) in de-DE/AT/CH', [
  ...VARS.map((v) => op('sr-misc', { kind: 'de-gsr', lang: v.lang, id: v.id, words: old.slice(0, v.c === 'DE' ? 60 : 25) })),
  op('sr-check', { lang: 'de-DE', ids: ['GERMAN_SPELLER_RULE'], cases: sCases(old.map((x) => `Das Wort ${x} steht hier.`)) }),
]);
const spT = pick(spellingW, 80, 'spt').map(typo);
const igT = pick(ignore, 40, 'igt').map(typo);
const vT = ['AT', 'CH'].map((c) => pick(lines(path.join(DE, `hunspell/spelling-de-${c}.txt`)).map(strip), 30, 'vt' + c).map(typo));
w('b-datatypos', 'typos derived from spelling.txt / ignore.txt / variant dictionaries: suggestions', [
  ...chunks(spT, 20).map((c) => op('sr-misc', { kind: 'de-gsr', lang: 'de-DE', id: 'GERMAN_SPELLER_RULE', words: c })),
  ...chunks(igT, 20).map((c) => op('sr-misc', { kind: 'de-gsr', lang: 'de-DE', id: 'GERMAN_SPELLER_RULE', words: c })),
  op('sr-misc', { kind: 'de-gsr', lang: 'de-AT', id: 'AUSTRIAN_GERMAN_SPELLER_RULE', words: vT[0] }),
  op('sr-misc', { kind: 'de-gsr', lang: 'de-CH', id: 'SWISS_GERMAN_SPELLER_RULE', words: vT[1] }),
]);
n++;
// DE-0220 regression inputs (left side only)
const reg = lines(path.join(ROOT, 'oracle/java-src/languagetool-language-modules/de/src/test/resources/suggestions.txt')).map((l) => l.split(' => ')[0]).filter(Boolean);
const regPick = pick(reg, 140, 'reg');
w('b-regression-inputs', 'SuggestionRegressionTest inputs (suggestions.txt, left column only): suggestions de-DE', chunks(regPick, 20).map((c) => op('sr-misc', { kind: 'de-gsr', lang: 'de-DE', id: 'GERMAN_SPELLER_RULE', words: c })));
n++;
// multitoken + morfologik
const mt = lines(path.join(DE, 'multitoken-suggest.txt')).map((l) => l.replace(/\t.*$/, '').replace(/\/.*$/, ''));
const mtW = pick(mt, 80, 'mt');
const mtAll = [...mtW, ...mtW.slice(0, 40).map(typo), ...mtW.slice(0, 20).map((t) => t.toLowerCase()), ...mtW.slice(0, 10).map((t) => t.replace(/ /g, '')), ...mtW.slice(0, 10).map((t) => t.replace(/ /g, '-')), 'Hans Mueller', 'Frank Walter Steinmaier', '', 'a', 'a b', 'x'.repeat(100)];
w('b-multitoken', 'GermanMultitokenSpeller suggestions (de, de-AT, de-CH)', ['de', 'de-AT', 'de-CH'].map((lang) => op('sr-misc', { kind: 'multitoken', lang, words: lang === 'de' ? mtAll : mtAll.slice(0, 60) })));
n++;
const mw = [...tokPool.slice(500, 540), ...tokPool.slice(540, 580).map(typo), ...tokPool.slice(580, 590).map((t) => t.toLowerCase()), 'Haus', 'Hauss', 'LanguageTool', '', 'x', 'Straße', 'Strasse', 'daß', 'Fußbal', 'Mueller'];
w('b-morfologik-de', 'MorfologikGermanyGermanSpellerRule MORFOLOGIK_RULE_DE_DE (not registered) on de_DE.dict', [
  op('sr-misc', { kind: 'de-morfologik', lang: 'de-DE', words: mw, cases: sCases([...sents.slice(800, 830).map(typoSent), ...mw.slice(0, 80).map((x) => x)]) }),
  op('sr-misc', { kind: 'de-morfologik', lang: 'de-AT', words: mw.slice(0, 20), cases: sCases(sents.slice(830, 840).map(typoSent)) }),
]);
n++;
// ranking pipeline: sentence-level suggestions for known confusions
w('b-check-special', 'matches with suggestions: ss/ß, gender, hyphen, camel case, abbreviations, concatenations in all three variants', VARS.map((v) => op('sr-check', { lang: v.lang, ids: [v.id], cases: sCases(['Das Wort Büffet und Buffett.', 'Ich gehe zu Fuss in die Strasse.', 'Er ist symphatisch und autentisch.', 'Wir fahren mit der SBahn und UBahn.', 'Die Lehrerinen und Lehrer*innen.', 'Ein Stil- und Grammatikprüfunk.', 'Ich habe es garnicht gewusst, nichtdestotrotz.', 'Das Wort Hausaufgabenhefft ist falsch.', 'Der Abgasausstoss war hoch.', 'Er wohnt in Wienn und Grazz.', 'Ich möchte ein Paradeiser und eine Semmel.', 'Wir sehen uns im Jänner.', 'Das ist ein Mißverständniss, daß man nicht wußte.', 'Heute Abent gehen wir ins Kinno.', 'iPhone und eBay und McDonalds.', 'Das HausHaus ist gross.', 'Die Mayonäse und Majonäse.'].concat(sents.slice(900, 915).map(typoSent))) })));
n++;
console.log('cases', n, 'keyWords', keyWords.length, 'keys', keys.length);
