// Authors oracle/cases/X-ENSPELL (F46) and X-ENREPLACE (F47) (inputs only). Ops: sr-check/sr-word/sr-misc (SpellRuleOps), replace-check mode rules (StyleOps), enspell-misc (EnSpellOps). Docs: docs/review/F46-oracle.md, F47-oracle.md.
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';

const mkDir = (id) => { const d = path.join(ROOT, 'oracle/cases', id); rmSync(d, { recursive: true, force: true }); mkdirSync(d, { recursive: true }); return d; };
const D1 = mkDir('X-ENSPELL'), D2 = mkDir('X-ENREPLACE');
const mk = (dir) => (name, description, ops) => writeFileSync(path.join(dir, `${name}.json`), JSON.stringify({ kind: 'harness', clock: 'fixed', description, normalize: ['paths'], compare: 'jsonl', ops }) + '\n');
const w1 = mk(D1), w2 = mk(D2);
const op = (o, args) => ({ op: o, args });
const RES = path.join(ROOT, 'resources/org/languagetool');
const sha = (s) => createHash('sha1').update(String(s)).digest('hex');
const shaSort = (a) => [...a].sort((x, y) => (sha(x) < sha(y) ? -1 : 1));
const pick = (a, n) => shaSort(a).slice(0, n);
const chunks = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, (i + 1) * n));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
let seed = 777001;
const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const ri = (n) => Math.floor(rnd() * n);
const AL = 'abcdefghijklmnopqrstuvwxyz';
function typo(w) {
  const cs = [...w]; const k = ri(4); const i = ri(cs.length);
  if (k === 0) cs.splice(i, 0, AL[ri(26)]);
  else if (k === 1 && cs.length > 1) cs.splice(i, 1);
  else if (k === 2 && cs.length > 1) { const j = Math.min(i, cs.length - 2); [cs[j], cs[j + 1]] = [cs[j + 1], cs[j]]; } else cs[i] = AL[ri(26)];
  return cs.join('');
}
const lines = (f) => (existsSync(f) ? readFileSync(f, 'utf8').split('\n').map((l) => l.replace(/\r$/, '')).filter((l) => l.trim() && !l.startsWith('#')) : []);
const corpus = readFileSync(path.join(ROOT, 'oracle/corpus/en/corpus.txt'), 'utf8');
const sentences = shaSort(corpus.split(/(?<=[.!?])\s+/).map((s) => s.replace(/\s+/g, ' ').trim()).filter((s) => s.length > 20 && s.length < 220));
const VARS = [['en-US', 'MORFOLOGIK_RULE_EN_US'], ['en-GB', 'MORFOLOGIK_RULE_EN_GB'], ['en-AU', 'MORFOLOGIK_RULE_EN_AU'], ['en-CA', 'MORFOLOGIK_RULE_EN_CA'], ['en-NZ', 'MORFOLOGIK_RULE_EN_NZ'], ['en-ZA', 'MORFOLOGIK_RULE_EN_ZA']];

// ================= X-ENSPELL (F46) =================
// EN-0006 prepareLineForSpeller
{
  const mw = lines(path.join(RES, 'resource/en/multiwords.txt'));
  const added = lines(path.join(RES, 'resource/en/added.txt'));
  const edge = ['', ' ', '#', '##', 'a#b', '#a', 'a+b', 'a#b+c', 'x\tNN', 'x\tNNS', 'x\tNNP', 'x\tJJ', 'x\tJJR', 'x\tVB', 'x\tRB', ' x \t NN ', 'x\t', '\tNN', 'x\tNN\ty', 'x\tNN # comment', 'x y\tNN', 'x+y\tNN', 'x\tNN+', '\t', 'x\t\tNN', 'Ünï\tNN', 'ménage à trois\tNN', 'a\tb\tc', 'NN', 'x\tnn', 'x\tNNx#y', 'x # y\tNN', ' # ', '+', '#+', 'x\r', 'x y\tNN'];
  const ls = [...edge, ...pick(mw, 120), ...pick(added, 60)];
  w1('misc-prepare', 'EN-0006 English#prepareLineForSpeller (edge lines, multiwords.txt, added.txt)', [op('enspell-misc', { kind: 'prepare', lang: 'en', lines: ls }), op('enspell-misc', { kind: 'prepare', lang: 'en-GB', lines: edge.slice(0, 12) }), op('enspell-misc', { kind: 'prepare', lang: 'de', lines: edge.slice(0, 12) })]);
}
// EN-0121 Inflector
{
  const tags = [null, '', 'SUB:NOM:PLU:MAS', 'SUB:AKK:PLU:FEM', 'SUB:NOM:SIN:NEU', 'VER:3:SIN:PRÄ:NON', 'VER:3:SIN:PRÄ:SFT', 'VER:3:SIN:PRT:NON', 'VER:3:SIN:PRT:SFT', 'VER:3:PLU:PRÄ:NON', 'PA1:PRD:GRU:VER', 'PA2:PRD:GRU:VER', 'PA2:PRD:GRU:VER:X', 'ADJ:PRD:KOM', 'ADJ:NOM:SIN:MAS:GRU:KOM', 'ADJ:PRD:GRU', 'ADJ:NOM:SIN:MAS:SUP', 'ADJ:PRD:SUP', 'VER:INF:NON', 'PRP:LOK', 'XYZ', 'SUBPLU', 'SUB:PLU', 'subplu', 'VER:3:SIN:PRÄ'];
  const toks = ['house', 'tire', 'pump', 'go', 'be', 'have', 'do', 'child', 'man', 'woman', 'mouse', 'foot', 'big', 'good', 'bad', 'well', 'run', 'stop', 'tyre pump', 'to go', 'to be done', 'family doctor', 'a b c', 'x', '', ' ', 'Ünï', 'sheep', 'analyze', 'analyse', 'quickly', 'search word {one; to}', 'to', 'to to', 'tire  pump'];
  const cases = [];
  for (const t of toks) for (const g of tags) cases.push({ token: t, tag: g });
  w1('misc-inflect', 'EN-0121 Inflector#inflect / inflectSingleWord over tokens x German tags (reflection into package-private class)', chunks(cases, 200).map((c) => op('enspell-misc', { kind: 'inflect', cases: c })));
}
// EN-0081 / EN-0120 BeoLingus
{
  const base = readFileSync(path.join(ROOT, 'oracle/java-src/languagetool-standalone/src/test/resources/beolingus_test.txt'), 'utf8').split('\n').filter((l) => l !== '');
  const terms = ['Luftpumpen', 'Luftpumpe', 'luftpumpe', 'Haus', 'haus', 'Häuser', 'Hauses', 'Zuhause', 'zuhause', 'Hausarzt', 'Hausärzte', 'Hausärztin', 'Hausanzug', 'Hausanzüge', 'Hausanschluss', 'Suchwort', 'Suchworte', 'suchwort', 'Testluftpumpe', 'Testluftpumpen', 'Voltenklammer', 'reifenwechseln', 'Reifen wechseln', 'Reifen', 'Zuführungskabel', 'Hauseinführungskabel', 'Teilnehmeranschluss', 'gehen', 'Tür', 'nach Hause gehen', 'ein Haus bauen', 'nicht vorhanden', '', ' ', 'Ü', 'Haus {n}', 'Häuserchen', 'Pumpe', 'Pumpen'];
  const ops = [];
  for (const t of terms) ops.push({ fn: 'translate', term: t, from: 'de', to: 'en' });
  ops.push({ fn: 'translate', term: 'house', from: 'en', to: 'de' }, { fn: 'translate', term: 'Haus', from: 'de', to: 'fr' }, { fn: 'translate', term: 'Haus', from: 'fr', to: 'en' }, { fn: 'translate', term: 'Haus', from: 'DE', to: 'EN' });
  const splits = ['foo', 'foo { bar } foo', 'foo { bar }; foo', 'foo; bar; foo', 'foo; bar { blah }; foo', 'foo; bar { blah; blubb }; foo', 'foo; bar { blah; blubb; three four }; foo', '', ';', '; ', 'a;b', 'a; b', 'a;  b;  c', '{', '}', '} {', 'x { a; b } y { c; d } z', 'tyre [Br.]/tire [Am.] pump', 'tyre [Br.]/tire [Am.] pump; tyre [Br.]/tire [Am.] inflator', 'tire [Am.]/tyre [Br.] pump', 'to change the tyres [Br.] / tires [Am.]', 'a [Br.]/b [Am.]', 'colour [Br.] / color [Am.] scheme', 'x [Br.]/y [Am.] [coll.]', 'tyre [Br.]/tire [Am.]', '[Br.]/[Am.]', 'a [Am.]/b [Br.]; c [Br.]/d [Am.]'];
  for (const s of splits) ops.push({ fn: 'split', s }, { fn: 'splitAtSemicolon', s });
  const cleans = ['house', 'to go', 'to go {went; gone}', 'icebox (old-fashioned)', 'heavy goods vehicle /HGV/', 'Tuesday /Tue/', 'station /Sta./', 'to fathom out <> sth.', 'decease [adm.]; demise [poet.] <death>', 'sth./sb. to do', 'to give sb. sth.', 'to  be   done', 'to', 'to ', 'tire [Am.] pump', '', ' ', 'to help sb.', 'to want', 'search word {one; to}', 'a (b) c [d] {e} <f> g'];
  for (const s of cleans) for (const prev of [null, 'to', 'want', 'help', 'I', '']) ops.push({ fn: 'clean', s, prev });
  for (const s of [...cleans, 'tire [Am.] pump', 'a [b] (c) {d} <e>', '[', ']', '[[]]', '(()', '{} <>', 'x ] y', 'x > y', 'a <b [c> d] e', 'to go {went; gone} [coll.] (x)']) ops.push({ fn: 'suffix', s });
  w1('misc-beolingus-test', 'EN-0120 BeoLingusTranslator over the Java test file beolingus_test.txt: translate (inflection via German tagger + Inflector), split, splitAtSemicolon, cleanTranslationForReplace, getTranslationSuffix', [op('enspell-misc', { kind: 'beolingus', lines: base, ops })]);
  const extra = [
    '# comment', '', '   ', 'Auto {n} | Autos {pl} :: car | cars', 'Auto {n}; Wagen {m} :: car; automobile', 'gehen {vi} :: to go; to walk', 'laufen {vi} | läuft | lief | gelaufen :: to run | runs | ran | run',
    'schnell {adj} | schneller | am schnellsten :: fast | faster | fastest', 'Kind {n} | Kinder {pl} :: child | children', 'rot :: red', 'Freund {m}; Freundin {f} :: friend; girlfriend', 'Hund {m} :: dog', 'Hunde :: dogs', 'Äpfel :: apples', 'Apfel {m} :: apple', 'sehen {vt} | sieht :: to see | sees',
    'Blume {f} :: flower /Fl./', 'Haus der offenen Tür :: open house', 'etw. kaufen {vt} :: to buy sth.', 'jdm. helfen {vi} :: to help sb.', 'Straße {f} :: street [Am.]/road [Br.]',
  ];
  const eops = [];
  for (const t of ['Auto', 'Autos', 'Wagen', 'gehen', 'geht', 'ging', 'gegangen', 'gehend', 'laufen', 'läuft', 'lief', 'schnell', 'schneller', 'schnellsten', 'Kind', 'Kinder', 'Kindern', 'Freund', 'Freunde', 'Freundin', 'Hund', 'Hunde', 'Äpfel', 'Apfel', 'Apfels', 'sehen', 'sieht', 'sah', 'Blume', 'Blumen', 'kaufen', 'kauft', 'gekauft', 'helfen', 'hilft', 'Straße', 'Straßen', 'rot', 'rote', 'roter', 'rötlich', 'x', '']) eops.push({ fn: 'translate', term: t, from: 'de', to: 'en' });
  w1('misc-beolingus-own', 'EN-0120 BeoLingusTranslator with an own small German-English file (comments, blank lines, variants, inflected German forms)', [op('enspell-misc', { kind: 'beolingus', lines: extra, ops: eops })]);
  w1('misc-beolingus-errors', 'EN-0120 BeoLingusTranslator constructor errors and getInstance(GlobalConfig) without file', [
    op('enspell-misc', { kind: 'beolingus', lines: ['Haus :: house | houses'], ops: [{ fn: 'translate', term: 'Haus', from: 'de', to: 'en' }] }),
    op('enspell-misc', { kind: 'beolingus', lines: ['Haus | Hause :: house'], ops: [] }),
    op('enspell-misc', { kind: 'beolingus', lines: ['no separator line'], ops: [] }),
    op('enspell-misc', { kind: 'beolingus', lines: ['Haus :: '], ops: [{ fn: 'translate', term: 'Haus', from: 'de', to: 'en' }] }),
    op('enspell-misc', { kind: 'beolingus', lines: [' :: house'], ops: [{ fn: 'translate', term: '', from: 'de', to: 'en' }] }),
    op('enspell-misc', { kind: 'beolingus', lines: ['Haus :: house :: home'], ops: [{ fn: 'translate', term: 'Haus', from: 'de', to: 'en' }] }),
    op('enspell-misc', { kind: 'beolingus', lines: ['Haus :: house'], missingFile: true, ops: [] }),
    op('enspell-misc', { kind: 'beolingus', lines: [], ops: [{ fn: 'translate', term: 'Haus', from: 'de', to: 'en' }, { fn: 'bogus' }] }),
    op('enspell-misc', { kind: 'instance' }),
  ]);
}
// EN-0221 DynamicMorfologikLanguage
{
  const cs = ['This is a test.', 'This is a tset.', 'The quick brown fox jumps over the lazy dog.', 'The quik brwn fox.', 'color colour', '', 'tset', 'I live in New Yrok.', 'x', 'LanguageTool', 'info@example.org http://languagetool.org', 'Ünïcode wörds', 'tset one.\n\ntset two.'].map((text) => ({ text }));
  const sent = sentences.slice(0, 15).map((s) => ({ text: s.replace(/[A-Za-z]{5,}/, (m) => typo(m)) }));
  w1('misc-dynamic', 'EN-0221 DynamicMorfologikLanguage (reflection) built over the en_US/en_GB/en_AU dict copied to a temp dir: rule id <CODE>_SPELLER_RULE, matches', [
    op('enspell-misc', { kind: 'dynamic', name: 'Testlang', code: 'zz', cases: [...cs, ...sent] }),
    op('enspell-misc', { kind: 'dynamic', name: 'Britlang', code: 'zb', dict: 'en_GB', cases: cs }),
    op('enspell-misc', { kind: 'dynamic', name: 'Austlang', code: 'za', dict: 'en_AU', cases: cs.slice(0, 5) }),
    op('enspell-misc', { kind: 'dynamic', name: 'Testlang', code: 'zz', noInfo: true, cases: cs.slice(0, 3) }),
    op('enspell-misc', { kind: 'dynamic', name: 'Testlang', code: 'zz', missingDict: true, cases: cs.slice(0, 3) }),
    op('enspell-misc', { kind: 'dynamic', name: 'Mixed Case', code: 'xY', cases: cs.slice(0, 3) }),
  ]);
}
// EN-0028 EnglishMultitokenSpeller
{
  const mw = lines(path.join(RES, 'resource/en/multiwords.txt')).map((l) => l.split('\t')[0].split('#')[0].trim()).filter((x) => x);
  const g = lines(path.join(RES, 'resource/spelling_global.txt')).map((l) => l.replace(/\/.*$/, '').trim());
  const ws = pick(mw, 60);
  const words = [...ws, ...ws.slice(0, 30).map(typo), ...ws.slice(0, 20).map((t) => t.toLowerCase()), ...ws.slice(0, 15).map((t) => t.toUpperCase()), ...ws.slice(0, 10).map((t) => t.replace(/ /g, '')), ...ws.slice(0, 10).map((t) => t.replace(/ /g, '-')), ...pick(g, 20), ...pick(g, 10).map(typo), 'New Yorkk', 'new york', 'Los Angelos', 'Unitd States', 'Mercedes Benz', 'a b', 'ab', ''];
  w1('misc-multitoken-en', 'EN-0028 EnglishMultitokenSpeller via Language#getMultitokenSpeller (en, en-GB, en-AU): suggestions for multiwords.txt / spelling_global.txt entries and typos', ['en', 'en-GB', 'en-AU'].flatMap((lang, i) => chunks(i === 0 ? words : words.slice(0, 40), 50).map((c) => op('sr-misc', { kind: 'multitoken', lang, words: c }))));
}
// variant messages (EN-0043..0049, EN-0176): US<->GB pairs
const pairs = lines(path.join(RES, 'resource/en/en-US-GB.txt')).map((l) => l.split(';').map((x) => x.trim())).filter((p) => p.length === 2);
const samePairs = pairs.filter((p) => p[0] === p[1]);
const diffPairs = pairs.filter((p) => p[0] !== p[1]);
const pp = pick(diffPairs, 90);
const vsent = [];
for (const [us, gb] of pp) vsent.push(`This ${us} is nice.`, `This ${gb} is nice.`);
for (const [us, gb] of pp.slice(0, 20)) vsent.push(`${cap(us)} first.`, `${cap(gb)} first.`, `THE ${us.toUpperCase()} AND ${gb.toUpperCase()}.`, `Both ${us} and ${gb}, ${us}s and ${gb}s.`);
vsent.push('The colour and color, the centre and center.', 'A realise realize organisation organization.', 'Cheque check, tyre tire, grey gray, aluminium aluminum.', 'Favourite favorite; neighbour neighbor; honour honor.', 'Programme program, catalogue catalog, dialogue dialog.', 'COLOUR COLOR Colour Color colOur.');
for (const [lang, id] of VARS) {
  const ws = vsent;
  chunks(ws, 70).forEach((c, i) => w1(`variant-${lang}-${String(i).padStart(2, '0')}`, `${id} variant messages: US/GB spelling pairs from en-US-GB.txt in sentences (${lang})`, [op('sr-check', { lang, ids: [id], cases: c.map((text) => ({ text })) })]));
  const words = [...pp.flat(), ...pick(samePairs, 8).flat(), ...pick(diffPairs.map((p) => p[0]), 30).map((x) => cap(x)), 'colour', 'Colour', 'COLOUR', 'color', 'ä'];
  w1(`variant-words-${lang}`, `${id} word-level ignore/misspelled/suggestions for US/GB pairs (${lang})`, chunks(words, 40).map((c) => op('sr-word', { lang, id, words: c, sugg: true })));
}
// topSuggestions (EN-0041)
{
  const src = readFileSync(path.join(ROOT, 'src/lang/en/rules/AbstractEnglishSpellerRuleData.js'), 'utf8');
  const part = (name) => { const i = src.indexOf(`export function ${name}`); const j = src.indexOf('\nexport', i + 10); return src.slice(i, j < 0 ? undefined : j); };
  const keys = (name) => [...part(name).matchAll(/\bs\.set\((".*?"),/g)].map((m) => JSON.parse(m[1]));
  const top = keys('getTopSuggestions'), ic = keys('getTopSuggestionsIgnoreCase');
  const sentOf = (k) => `I wrote ${k} in the text.`;
  const all = [...new Set([...top, ...ic])];
  chunks(all.map(sentOf), 120).forEach((c, i) => w1(`topsugg-en-US-${String(i).padStart(2, '0')}`, `AbstractEnglishSpellerRule top suggestions: every key of getTopSuggestions/getTopSuggestionsIgnoreCase in a sentence (en-US), ${all.length} keys total`, [op('sr-check', { lang: 'en-US', ids: ['MORFOLOGIK_RULE_EN_US'], cases: c.map((text) => ({ text })) })]));
  w1('topsugg-words-en-US', 'AbstractEnglishSpellerRule top suggestions at word level (isMisspelled + getSpellingSuggestions) for all keys (en-US)', chunks(all, 100).map((c) => op('sr-word', { lang: 'en-US', id: 'MORFOLOGIK_RULE_EN_US', words: c, sugg: true })));
  const sub = pick(all, 90);
  for (const [lang, id] of VARS.slice(1)) w1(`topsugg-${lang}`, `top suggestions subset in sentences (${lang})`, [op('sr-check', { lang, ids: [id], cases: sub.map(sentOf).map((text) => ({ text })) }), op('sr-check', { lang, ids: [id], cases: sub.slice(0, 30).map((k) => ({ text: `${cap(k)} starts. ${k.toUpperCase()} shouts.` })) })]);
  w1('topsugg-case-en-US', 'top suggestions case handling: capitalised, upper case and sentence-initial forms of keys (en-US)', [op('sr-check', { lang: 'en-US', ids: ['MORFOLOGIK_RULE_EN_US'], cases: sub.flatMap((k) => [`${cap(k)} here.`, `${k.toUpperCase()}!`, `See "${k}" and (${cap(k)}).`]).map((text) => ({ text })) })]);
}
// lists: prohibit / ignore / spelling / variant spelling files (EN-0180..0182, EN-0040)
{
  const prohibit = lines(path.join(RES, 'resource/en/hunspell/prohibit.txt')).concat(lines(path.join(RES, 'resource/en/hunspell/prohibit_custom.txt')));
  const ignore = lines(path.join(RES, 'resource/en/hunspell/ignore.txt'));
  const spelling = lines(path.join(RES, 'resource/en/hunspell/spelling.txt')).concat(lines(path.join(RES, 'resource/en/hunspell/spelling_custom.txt'))).map((l) => l.replace(/\/.*$/, ''));
  for (const [lang, id] of VARS) {
    const own = lines(path.join(RES, `resource/en/hunspell/spelling_${lang}.txt`)).map((l) => l.replace(/\/.*$/, ''));
    const ws = [...pick(prohibit, 45), ...pick(ignore, 45), ...pick(spelling, 45), ...own];
    const ss = [];
    for (const w of ws) ss.push(`We use ${w} here.`, `${cap(w)} is here.`);
    chunks(ss, 120).forEach((c, i) => w1(`lists-${lang}-${String(i).padStart(2, '0')}`, `${id} prohibit/ignore/spelling/variant-spelling words in sentences (${lang})`, [op('sr-check', { lang, ids: [id], cases: c.map((text) => ({ text })) })]));
    w1(`lists-words-${lang}`, `${id} word-level checks for prohibit/ignore/spelling/variant words (${lang})`, chunks(ws, 50).map((c, i) => op('sr-word', { lang, id, words: c, sugg: i % 2 === 0 || undefined })));
  }
}
// corpus sentences with typos in all 6 variants, new slice
for (const [lang, id] of VARS) {
  const ss = sentences.slice(140, 267).map((s) => {
    const toks = [...s.matchAll(/[A-Za-z]{4,}/g)].map((m) => m[0]);
    let t = s;
    for (let k = 0; k < 1 + ri(3) && toks.length; k++) { const w = toks[ri(toks.length)]; t = t.replace(w, typo(w)); }
    return t;
  });
  chunks(ss, 64).forEach((c, i) => w1(`corpus-${lang}-${String(i).padStart(2, '0')}`, `${id} matches over corpus sentences with seeded typos, slice 140+ (${lang})`, [op('sr-check', { lang, ids: [id], cases: c.map((text) => ({ text })) })]));
}
// special constructs of the English speller: hyphens, compounds, contractions, case, digits
{
  const SP = [
    'We discussed well-knwon issues and e-mial, non-existant facts, co-operate, re-enter, anti-clocwise.', 'The long-term, short-term, mid-term plans; semi-final results.', 'I dont know, cant say, wont go, isnt it, thats right.', "Its' wrong; it's right; the dog's; dogs'; o'clok.",
    'Alot of people, incase of fire, infront of me, aswell as you, eachother, atleast.', 'Mr. Smith, Dr. Jhon and Prof. Brwon met St. Jame.', 'TEh quick, THe QUICK, thE quick.', 'McDonalds, MacDonald, O\'Brien, D\'Arcy, DeVito.', 'Pre-wwar, post-wwar, ex-wife, ex-wfe.',
    'The wi-fi, Wifi, WiFi, wi fi connection; blu-ray; e-book; ebook.', 'Un-American activitys and non-profit organizations.', 'goverment enviroment recieve seperate definately occured untill wich', 'Teh teh Teh TEH.', 'Ths prev kilotonne litehouse whitout compability enroute.',
    'I hav 3 aples and 12 orenges, 1st 2nd 3rd 4th 5th 21th 101th.', 'The 1990s and 90s and 1990\'s and 90\'s.', 'https://example.com/pth and www.exmple.com and foo@exmple.com.', 'Heloo wrld! Hwo are yuo? Fine.', 'A quick-brwn-fox jumps.', '--hous -hous hous- hous--', 'Cafés café cafe naïve naive Zoë Zoe', 'résumé resume résume',
    'f**k sh*t b*llshit', 'Asshole, bullshit and cocksucker are not suggested.', 'I want to be a doctr, lawyr or enginer.', 'The Unted States and the Untied Kingdom, Britian, Austrlia, Canda.', 'Pyhton, Javascript, JavaScirpt, Typescript, nodejs, Node.js.', 'Gogle, Googel, Facebok, Twiter, Youtub.', 'ab cd ef gh', 'I', 'a', 'Tset', 'tset.', 'The the the.', "He said 'helo' and \"wrld\".",
  ];
  for (const [lang, id] of VARS) w1(`special-${lang}`, `${id} English speller special constructs: hyphens, contractions, case, digits, URLs, do-not-suggest words (${lang})`, [op('sr-check', { lang, ids: [id], cases: SP.map((text) => ({ text })) }), op('sr-check', { lang, ids: [id], cases: SP.slice(0, 14).map((text) => ({ text, level: 'PICKY' })) })]);
}

// ================= X-ENREPLACE (F47) =================
const rop = (lang, ids, cases, extra = {}) => op('replace-check', { mode: 'rules', lang, ids, ...extra, cases });
const C = (text, level = 'DEFAULT') => ({ text, level });
const keysOf = (f) => lines(f).map((l) => l.split('=')[0].split('\t')[0].split('|')).flat().map((s) => s.trim()).filter(Boolean);
const rr = (rel) => path.join(RES, 'rules/en', rel);
function derived(keys, n, tmpl) {
  const ts = [];
  for (const w of pick(keys, n)) ts.push(...tmpl(w));
  return ts;
}
const T_STD = (w) => [`This is ${w} here.`, `${cap(w)} is it.`, `THIS IS ${w.toUpperCase()}.`];
const EDGE = ['', ' ', 'x', 'Ünï cödé wörds — “quoted” ‘text’.', 'a'.repeat(300), 'Line one.\nLine two.', 'Tab\tseparated.', '1234 5678.', '😀 emoji 😀.'];
const RULES_ALL = ['EN_DIACRITICS_REPLACE_ORTHOGRAPHY', 'EN_PLAIN_ENGLISH_REPLACE', 'EN_REDUNDANCY_REPLACE', 'EN_SIMPLE_REPLACE', 'PROFANITY', 'EN_SPECIFIC_CASE', 'EN_WORD_COHERENCY', 'EN_US_SIMPLE_REPLACE', 'EN_GB_SIMPLE_REPLACE', 'EN_NZ_SIMPLE_REPLACE'];
const lv = (arr, level = 'DEFAULT') => arr.map((t) => C(t, level));
// per-rule data-derived
{
  const dia = keysOf(rr('diacritics.txt'));
  const ts = [...derived(dia, 70, T_STD), 'The naive facade of the cafe at the resume.', 'The naïve façade of the café.', 'Cafe, Cafes, cafés. CAFE. Café!', 'abbes and Abbes and ABBES', 'a contrecaeur, a gogo, aide-memoire; aide memoire.', 'fiance fiancee. fiancé fiancée', 'He lives in Zurich, near Sao Paulo and Malaga.', ...EDGE];
  w2('diacritics-en-US', 'EN-0059/0185 EN_DIACRITICS_REPLACE_ORTHOGRAPHY: data-derived entries (3 casings each) + targeted', chunks(lv(ts), 40).map((c) => rop('en-US', ['EN_DIACRITICS_REPLACE_ORTHOGRAPHY'], c)));
  w2('diacritics-variants', 'EN_DIACRITICS_REPLACE_ORTHOGRAPHY in en-GB/en-AU/en-CA/en-NZ/en-ZA', ['en-GB', 'en-AU', 'en-CA', 'en-NZ', 'en-ZA'].map((l) => rop(l, ['EN_DIACRITICS_REPLACE_ORTHOGRAPHY'], lv(ts.slice(0, 30)))));
  const wo = keysOf(rr('wordiness.txt'));
  const wts = [...derived(wo, 70, T_STD), 'In the event that you ask, a number of people utilize it.', 'I myself wish to acknowledge receipt of your letter.', 'The Congress met. In view of the fact that it rained, we stayed.', ...EDGE];
  w2('plainenglish-en-US', 'EN-0062/0186 EN_PLAIN_ENGLISH_REPLACE (default off, enabled explicitly): data-derived + targeted', [...chunks(lv(wts), 40).map((c) => rop('en-US', ['EN_PLAIN_ENGLISH_REPLACE'], c)), rop('en-US', [], lv(wts.slice(0, 20)))]);
  w2('plainenglish-variants', 'EN_PLAIN_ENGLISH_REPLACE in en-GB/en-AU/en-NZ', ['en-GB', 'en-AU', 'en-NZ'].map((l) => rop(l, ['EN_PLAIN_ENGLISH_REPLACE'], lv(wts.slice(0, 40)))));
  const re = keysOf(rr('redundancies.txt'));
  const rts = [...derived(re, 70, T_STD), 'This is an absolute guarantee, absolutely essential and absolutely necessary at 12 noon.', 'We met at 12 noon.', ...EDGE];
  w2('redundancy-en-US', 'EN-0063/0187 EN_REDUNDANCY_REPLACE (default off, enabled explicitly): data-derived + targeted', [...chunks(lv(rts), 40).map((c) => rop('en-US', ['EN_REDUNDANCY_REPLACE'], c)), rop('en-US', [], lv(rts.slice(0, 20)))]);
  w2('redundancy-variants', 'EN_REDUNDANCY_REPLACE in en-GB/en-AU/en-NZ', ['en-GB', 'en-AU', 'en-NZ'].map((l) => rop(l, ['EN_REDUNDANCY_REPLACE'], lv(rts.slice(0, 40)))));
  const sr = [...keysOf(rr('replace.txt')), ...keysOf(rr('replace_custom.txt'))];
  const sts = [...derived(sr, 60, T_STD), "Crohn's disease is chron's disease.", 'A bussines and bussiness.', ...EDGE];
  w2('simplereplace-en-US', 'EN-0072/0188 EN_SIMPLE_REPLACE (replace.txt + replace_custom.txt)', chunks(lv(sts), 40).map((c) => rop('en-US', ['EN_SIMPLE_REPLACE'], c)));
  w2('simplereplace-variants', 'EN_SIMPLE_REPLACE in en-GB/en-AU/en-CA/en-NZ/en-ZA', ['en-GB', 'en-AU', 'en-CA', 'en-NZ', 'en-ZA'].map((l) => rop(l, ['EN_SIMPLE_REPLACE'], lv(sts.slice(0, 45)))));
  const prof = lines(rr('replace_profanity.txt')).map((l) => l.split('=')[0].trim());
  const pts = [...derived(prof, 60, (w) => [`This is ${w} here.`, `${cap(w)} is it.`, `Oh, ${w.toUpperCase()}!`]), 'The shit hit the fan.', 'Fuck this shit.', 'Scunthorpe and Essex and assess.', ...EDGE];
  w2('profanity-en-US', 'EN-0073/0189 PROFANITY (picky, no suggestions): data-derived at PICKY and DEFAULT', [...chunks(lv(pts, 'PICKY'), 40).map((c) => rop('en-US', ['PROFANITY'], c)), rop('en-US', ['PROFANITY'], lv(pts.slice(0, 30), 'DEFAULT'))]);
  w2('profanity-variants', 'PROFANITY in en-GB/en-AU/en-CA/en-NZ/en-ZA (PICKY)', ['en-GB', 'en-AU', 'en-CA', 'en-NZ', 'en-ZA'].map((l) => rop(l, ['PROFANITY'], lv(pts.slice(0, 40), 'PICKY'))));
}
// variant replace rules (EN-0050..0052, EN-0190)
{
  const mkv = (file) => { const out = []; for (const l of lines(file)) { const [k, v] = l.split('='); out.push([k.split('|').map((s) => s.trim()), (v ?? '').split('\t')[0].split('|').map((s) => s.trim())]); } return out; };
  const vs = { 'en-US': mkv(rr('en-US/replace.txt')), 'en-GB': mkv(rr('en-GB/replace.txt')), 'en-NZ': mkv(rr('en-NZ/replace.txt')) };
  const ids = { 'en-US': 'EN_US_SIMPLE_REPLACE', 'en-GB': 'EN_GB_SIMPLE_REPLACE', 'en-NZ': 'EN_NZ_SIMPLE_REPLACE' };
  const allIds = Object.values(ids);
  for (const [v, ents] of Object.entries(vs)) {
    const phrases = ents.map((e) => e[0]).flat();
    const repls = ents.map((e) => e[1]).flat().filter(Boolean);
    const ts = [...derived(phrases, 70, T_STD), ...derived(repls, 30, (w) => [`The ${w} is fine.`]), 'He bought a sidewalk and a pavement; a truck and a lorry; the fall and the autumn.', 'Airplanes, aeroplanes, automaker, carmaker; pram, stroller.', ...EDGE];
    w2(`variant-${v}`, `${ids[v]} data-derived (phrases and their replacements), all three variant rules active, lang ${v}`, chunks(lv(ts), 40).map((c) => rop(v, allIds, c)));
    for (const l of ['en-US', 'en-GB', 'en-NZ', 'en-AU', 'en-CA', 'en-ZA'].filter((x) => x !== v)) w2(`variant-${v}-in-${l}`, `rules of ${v} data run in ${l}`, [rop(l, allIds, lv(ts.slice(0, 40)))]);
  }
  w2('variant-targeted', 'EN-0050..0052 targeted: rule activity per language, case variants, multiple matches, sentence boundaries', ['en-US', 'en-GB', 'en-NZ', 'en-AU', 'en-CA', 'en-ZA'].map((l) => rop(l, allIds, lv([
    'The sidewalk and the pavement. Sidewalks!', 'SIDEWALK, Sidewalk, sidewalk.', 'The airplane left; the aeroplane arrived.', 'Pram or stroller? Automaker or carmaker?', 'A truck, a lorry, a flat, an apartment, the elevator, the lift.', 'Mum and mom, colour and color.', 'sidewalk sidewalk sidewalk', 'The (sidewalk) "sidewalk" \'sidewalk\' sidewalk-like.', 'Sidewalk\n\nPavement', 'Ünï sidewalk wörd.',
  ]))));
}
// specific case, coherency: more variants + data
{
  const sc = lines(path.join(RES, 'resource/en/specific_case.txt'));
  const ts = [];
  for (const p of pick(sc, 45)) ts.push(`I like ${p.toLowerCase()} very much.`, `${cap(p.toLowerCase())} is great.`, `I like ${p}.`);
  ts.push('harry potter and elon musk.', 'Harry potter', 'Dr. harry potter', 'empire state building. The Empire State Building.', ...EDGE);
  for (const l of ['en-GB', 'en-CA', 'en-AU', 'en-NZ', 'en-ZA']) w2(`specificcase-${l}`, `EN-0065/0175 EN_SPECIFIC_CASE data-derived (${l})`, chunks(lv(ts), 50).map((c) => rop(l, ['EN_SPECIFIC_CASE'], c)));
  const co = lines(rr('coherency.txt')).map((l) => l.split(';'));
  const cts = [];
  for (const [a, b] of pick(co.map((x) => x.join(';')), 40).map((x) => x.split(';'))) cts.push(`We use ${a} here. And later we use ${b} there.`, `${cap(b)} first.\n\nThen ${a}.`, `${a} ${a} ${b}.`);
  cts.push('We organise and then organize.', 'colour color Colour COLOR', 'Gaol and jail. Jail and gaol.', ...EDGE);
  for (const l of ['en-GB', 'en-AU', 'en-NZ']) w2(`coherency-${l}`, `EN-0079/0193 EN_WORD_COHERENCY data-derived (${l})`, chunks(lv(cts), 45).map((c) => rop(l, ['EN_WORD_COHERENCY'], c)));
}
// all F47 rules together on corpus sentences (rule interaction, offsets)
for (const l of ['en-US', 'en-GB', 'en-NZ']) {
  const ss = sentences.slice(l === 'en-US' ? 0 : l === 'en-GB' ? 70 : 140, l === 'en-US' ? 70 : l === 'en-GB' ? 140 : 210);
  w2(`corpus-${l}`, `all F47 rules active on corpus sentences (${l}), DEFAULT and PICKY`, [rop(l, RULES_ALL, lv(ss.slice(0, 40))), rop(l, RULES_ALL, lv(ss.slice(0, 30), 'PICKY')), rop(l, RULES_ALL, [C(ss.slice(40, 60).join(' ')), C(ss.slice(60, 70).join('\n\n'))], {})]);
}
w2('combined-targeted', 'all F47 rules active together: overlapping phrases from several data files in one text, en-US/en-GB', ['en-US', 'en-GB'].map((l) => rop(l, RULES_ALL, lv([
  'In the event that the cafe sidewalk is a shit absolute guarantee, a number of people utilize it at 12 noon.', 'The naive facade of the harry potter airplane, colour and color, organise and organize.', 'I myself wish to acknowledge receipt of the fiance fiancee at the empire state building.',
  'Due to the fact that the aeroplane arrived, absolutely essential cafes closed.', 'It is bussines. In order to utilize the resume, a majority of the time.',
]).concat(lv(['In the event that the cafe sidewalk is a shit absolute guarantee, a number of people utilize it at 12 noon.'], 'PICKY')))));
console.log('ok');
