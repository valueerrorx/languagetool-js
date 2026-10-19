// Authors oracle/cases/X-SPELL/*.json (inputs only). Ops spell-speller / spell-multi / spell-rank: docs/review/F41-oracle.md.
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';

const DIR = path.join(ROOT, 'oracle/cases/X-SPELL');
rmSync(DIR, { recursive: true, force: true });
mkdirSync(DIR, { recursive: true });
const write = (name, description, ops) => writeFileSync(path.join(DIR, `${name}.json`), JSON.stringify({ kind: 'harness', clock: 'fixed', description, normalize: ['paths'], compare: 'jsonl', ops }) + '\n');
const op = (o, args) => ({ op: o, args });
const RES = path.join(ROOT, 'resources/org/languagetool');
const sha = (s) => createHash('sha1').update(s).digest('hex');
const chunks = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, (i + 1) * n));

let seed = 12345;
const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const ri = (n) => Math.floor(rnd() * n);

function tokensOf(lang) {
  const files = [`rules/${lang}/grammar.xml`, `rules/${lang}/style.xml`];
  const set = new Set();
  for (const f of files) {
    const p = path.join(RES, f);
    if (!existsSync(p)) continue;
    const x = readFileSync(p, 'utf8');
    for (const m of x.matchAll(/<example\b([^>]*)>([\s\S]*?)<\/example>/g)) {
      for (const w of m[2].replace(/<\/?marker>/g, ' ').matchAll(/[\p{L}\p{M}]+(?:['’\-][\p{L}\p{M}]+)*/gu)) set.add(w[0].replace(/&[a-z]+;/g, ''));
    }
  }
  return [...set].sort((a, b) => (sha(a) < sha(b) ? -1 : 1));
}
function dicWords(f) {
  return readFileSync(path.join(RES, f), 'utf8').split('\n').slice(1).map((l) => l.replace(/\/.*$/, '').trim()).filter((l) => l && !l.startsWith('#'));
}
const ALPHA = { en: 'abcdefghijklmnopqrstuvwxyz', de: 'abcdefghijklmnopqrstuvwxyzäöüß' };
function typo(w, al) {
  const cs = [...w];
  const k = ri(4);
  const i = ri(cs.length);
  if (k === 0) cs.splice(i, 0, al[ri(al.length)]);
  else if (k === 1 && cs.length > 1) cs.splice(i, 1);
  else if (k === 2 && cs.length > 1) { const j = Math.min(i, cs.length - 2); [cs[j], cs[j + 1]] = [cs[j + 1], cs[j]]; } else cs[i] = al[ri(al.length)];
  return cs.join('');
}
const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);
const SPECIAL = ['', ' ', 'LanguageTool', 'LanguageTooler', 'languagetool', 'LANGUAGETOOL', 'LanguageToolers', 'a', 'I', 'x', '-', '--', "'", '’', '.', ',', '1', '1234', '12.5', '1,000', '3rd', '1990s', 'abc123', '123abc', 'a1b2', '1-2', '10%', '€5', 'a-b', 'well-known', 'half-baked-idea', "don't", 'don’t', "o'clock", "l'homme", "aujourd'hui", 'McDonald', 'iPhone', 'eBay', 'camelCase', 'NASA', 'USA', 'HTML5', 'NATO-Staaten', 'ABC', 'Abc', 'aBC', 'ABc', 'Café', 'CAFÉ', 'cafe', 'Naïve', 'naive', 'Zoë', 'zoe', 'Straße', 'STRASSE', 'Strasse', 'strasse', 'Äpfel', 'ÄPFEL', 'Apfel', 'Äpfeln', 'Ubel', 'Übel', 'ÜBEL', 'schön', 'schon', 'schoen', 'Fuß', 'Fuss', 'Müller', 'Mueller', 'Muller', 'a😀b', '😀', '𝒜bc', 'Ab😀', 'ab\uD800cd', '\uD800', 'é', 'é', 'tab\tchar', 'new\nline', ' leading', 'trailing ', 'two words', 'alot', 'incase', 'noone', 'abouta', 'thehouse', 'dasHaus', 'zuhause', 'ichbin', 'x'.repeat(48), 'x'.repeat(49), 'x'.repeat(50), 'x'.repeat(51), 'x'.repeat(249), 'x'.repeat(250), 'x'.repeat(251), 'house'.repeat(20), 'Haus'.repeat(70), 'ä'.repeat(120)];
const INFO_VARIANTS = {
  'convert-case-false': 'fsa.dict.speller.convert-case=false',
  'convert-case-true': 'fsa.dict.speller.convert-case=true',
  'ignore-numbers-false': 'fsa.dict.speller.ignore-numbers=false',
  'ignore-numbers-true': 'fsa.dict.speller.ignore-numbers=true',
  'ignore-punct-false': 'fsa.dict.speller.ignore-punctuation=false',
  'ignore-punct-true': 'fsa.dict.speller.ignore-punctuation=true',
  'camel-true': 'fsa.dict.speller.ignore-camel-case=true',
  'camel-false': 'fsa.dict.speller.ignore-camel-case=false',
  'allupper-true': 'fsa.dict.speller.ignore-all-uppercase=true',
  'allupper-false': 'fsa.dict.speller.ignore-all-uppercase=false',
  'diacritics-true': 'fsa.dict.speller.ignore-diacritics=true',
  'diacritics-false': 'fsa.dict.speller.ignore-diacritics=false',
  'runon-false': 'fsa.dict.speller.runon-words=false',
  'runon-true': 'fsa.dict.speller.runon-words=true',
  'equiv': 'fsa.dict.speller.equivalent-chars=a \\u00e4, e \\u00e9, o \\u00f6, u \\u00fc, i y',
  'replpairs-none': 'fsa.dict.speller.replacement-pairs=',
  'replpairs-simple': 'fsa.dict.speller.replacement-pairs=ph f, f ph, ie ei, ei ie',
  'freq-off': 'fsa.dict.frequency-included=false',
  'all-strict': 'fsa.dict.speller.ignore-numbers=false\nfsa.dict.speller.ignore-punctuation=false\nfsa.dict.speller.ignore-camel-case=false\nfsa.dict.speller.ignore-all-uppercase=false\nfsa.dict.speller.convert-case=false\nfsa.dict.speller.ignore-diacritics=false',
  'all-lenient': 'fsa.dict.speller.ignore-numbers=true\nfsa.dict.speller.ignore-punctuation=true\nfsa.dict.speller.ignore-camel-case=true\nfsa.dict.speller.ignore-all-uppercase=true\nfsa.dict.speller.ignore-diacritics=true',
};

const DICTS = [
  { id: 'en-US', dict: '/en/hunspell/en_US.dict', lang: 'en', al: 'en', big: true },
  { id: 'en-GB', dict: '/en/hunspell/en_GB.dict', lang: 'en', al: 'en', big: true },
  { id: 'de-DE', dict: '/de/hunspell/de_DE.dict', lang: 'de', al: 'de', big: true },
  { id: 'en-AU', dict: '/en/hunspell/en_AU.dict', lang: 'en', al: 'en', big: false },
  { id: 'de-AT', dict: '/de/hunspell/de_AT.dict', lang: 'de', al: 'de', big: false },
];
const BATCH = 40;
const isW = (w) => w.length >= 3 && w.length <= 14;
const spellOps = (d, words, extra = {}) => chunks(words, BATCH).map((ws) => op('spell-speller', { dict: d.dict, words: ws, ...extra }));

for (const d of DICTS) {
  seed = parseInt(sha(d.id).slice(0, 6), 16);
  const toks = tokensOf(d.lang).filter(isW);
  const dic = d.lang === 'de' ? dicWords('resource/de/hunspell/' + d.dict.split('/').pop().replace('.dict', '.dic')).filter(isW) : [];
  const pick = (arr, n) => Array.from({ length: n }, () => arr[ri(arr.length)]);
  const base = toks.slice(0, 400);
  const n = d.big ? 1 : 0.4;
  const ops = [];
  // correct words (tokens, plus dic words for de) and special inputs
  ops.push(...spellOps(d, base.slice(0, Math.round(100 * n)), { extra: true }));
  if (dic.length) ops.push(...spellOps(d, pick(dic, Math.round(60 * n))));
  ops.push(...spellOps(d, SPECIAL.slice(0, d.big ? SPECIAL.length : 60), { extra: d.big }));
  // typos by edit op, dist 1
  const typos = pick(base, Math.round(160 * n)).map((w) => typo(w, ALPHA[d.al]));
  ops.push(...spellOps(d, typos));
  if (dic.length) ops.push(...spellOps(d, pick(dic, Math.round(60 * n)).map((w) => typo(w, ALPHA[d.al]))));
  // dist 2/3
  ops.push(...spellOps(d, pick(base, Math.round(40 * n)).map((w) => typo(typo(w, ALPHA[d.al]), ALPHA[d.al])), { dist: 2 }));
  if (d.big) ops.push(...spellOps(d, pick(base.filter((w) => w.length <= 8), 8).map((w) => typo(typo(typo(w, ALPHA[d.al]), ALPHA[d.al]), ALPHA[d.al])), { dist: 3 }));
  // double typo dist 1 (expect none), case variants of words and typos
  const cv = [];
  for (const w of pick(base, Math.round(35 * n))) { const t = typo(w, ALPHA[d.al]); cv.push(cap(w), w.toUpperCase(), cap(t), t.toUpperCase(), t.toLowerCase(), w.charAt(0) + w.slice(1).toUpperCase()); }
  ops.push(...spellOps(d, cv));
  // diacritics / hyphen / apostrophe / digits mutations of real words
  const mut = [];
  for (const w of pick(base, Math.round(30 * n))) { const i = 1 + ri(Math.max(1, w.length - 1)); mut.push(w.slice(0, i) + '-' + w.slice(i), w.slice(0, i) + "'" + w.slice(i), w + '1', '1' + w, w.slice(0, i) + '7' + w.slice(i), w + '.', w + ',', w.slice(0, i) + '😀' + w.slice(i), w.replace(/[aeou]/, (c) => ({ a: 'ä', e: 'é', o: 'ö', u: 'ü' })[c])); }
  ops.push(...spellOps(d, mut));
  // run-on candidates: two words glued
  const ro = []; for (let k = 0; k < Math.round(30 * n); k++) ro.push(pick(base, 1)[0] + pick(base, 1)[0]);
  ops.push(...spellOps(d, ro));
  if (d.big) ops.push(op('spell-speller', { dict: d.dict, dist: 1, words: base.slice(100, 112), noSugg: true }));
  write(`speller-${d.id}`, `CORE-0374..0376 MorfologikSpeller on ${d.dict}`, ops);
}

// info option variants on en_US and de_DE
for (const d of [DICTS[0], DICTS[2]]) {
  seed = parseInt(sha('v' + d.id).slice(0, 6), 16);
  const info0 = readFileSync(path.join(RES, d.dict.replace(/^\//, 'resource/').replace('.dict', '.info')), 'latin1');
  const toks = tokensOf(d.lang).filter(isW).slice(0, 300);
  const pick = (arr, k) => Array.from({ length: k }, () => arr[ri(arr.length)]);
  const words = [];
  for (const w of pick(toks, 12)) { const t = typo(w, ALPHA[d.al]); words.push(w, t, cap(t), t.toUpperCase(), w.toUpperCase(), w + '1', w + '.', w.charAt(0) + w.slice(1, 3).toUpperCase() + w.slice(3), w.replace(/[aeou]/, (c) => ({ a: 'ä', e: 'é', o: 'ö', u: 'ü' })[c]), w.slice(0, 2) + '-' + w.slice(2)); }
  words.push('123', '3rd', 'ABC', 'McDonald', 'iPhone', 'café', 'Café', 'Straße', 'zoë', 'a-b', "don't", 'x.y', '', 'USA');
  const ops = [];
  for (const [name, extra] of Object.entries(INFO_VARIANTS)) {
    ops.push(op('spell-speller', { dict: d.dict, info: info0 + '\n' + extra + '\n', dist: 1, words, extra: name === 'all-lenient' }));
  }
  ops.push(op('spell-speller', { dict: d.dict, info: info0, dist: 1, words: words.slice(0, 40) }));
  write(`options-${d.id}`, `CORE-0374/0376 speller options via modified .info (${d.dict})`, ops);
}

// errors
write('speller-errors', 'CORE-0375 constructor errors', [
  ...[0, -1, -100, 1, 2, Number.MAX_SAFE_INTEGER > 0 ? 2147483647 : 1].slice(0, 5).map((dist) => op('spell-speller', { dict: '/en/hunspell/en_US.dict', dist, words: ['hause', 'House', ''] })),
  op('spell-speller', { dict: '/en/hunspell/en_US.dict', dist: 0, info: readFileSync(path.join(RES, 'resource/en/hunspell/en_US.info'), 'latin1'), words: ['x'] }),
  op('spell-speller', { dict: '/en/hunspell/nonexistent.dict', dist: 1, words: ['x'] }),
  op('spell-speller', { dict: '/en/hunspell/en_US.info', dist: 1, words: ['x'] }),
  op('spell-speller', { dict: '', dist: 1, words: ['x'] }),
  op('spell-speller', { dict: '/en/english.dict', dist: 1, words: ['house', 'hause', 'went'] }),
  op('spell-speller', { dict: '/de/german.dict', dist: 1, words: ['Haus', 'Hause', 'gehen'] }),
  op('spell-speller', { dict: '/fr/french.dict', dist: 1, words: ['maison', 'maisn', 'être'] }),
]);

// ---- MultiSpeller
const mw = (list, extra) => [...list, ...list.map((w) => typo(w, ALPHA.en)), ...extra];
const L1 = ['fooba', 'quuxify', 'Zorgblat', 'xyzzy', 'WIKIPEDIA', 'iPadOS', 'foo-bar', "x'y", 'ünïcödé', 'wordone', 'wordtwo'];
const L1lines = ['# comment', '', ...L1, 'withcomment # trailing', '   padded   ', 'a#b', '#', '  # x', 'dup', 'dup', 'ünïcödé', 'tab\tsep', 'a b'];
const mq = ['fooba', 'foobar', 'fobar', 'quuxify', 'quuxfy', 'Zorgblat', 'zorgblat', 'ZORGBLAT', 'xyzzy', 'xyzzz', 'WIKIPEDIA', 'wikipedia', 'wikipedya', 'iPadOS', 'ipados', 'foo-bar', 'foo', 'bar', "x'y", 'ünïcödé', 'unicode', 'wordone', 'wordtwo', 'wordtree', 'withcomment', 'trailing', 'padded', 'a', 'a#b', 'ab', 'dup', 'dupe', 'tab', 'house', 'hause', 'House', 'HOUSE', '', 'LanguageTool', 'fooba1', 'FOOBA', 'Fooba', 'x'.repeat(60), 'alot', 'foobaquuxify'];
let pn = 0;
const P = () => `/spell-test/list-${++pn}.txt`;
const multi = [];
for (const [bin, lang] of [['/en/hunspell/en_US.dict', null], ['/en/hunspell/en_US.dict', 'en-US'], ['/en/hunspell/en_GB.dict', 'en-GB'], ['/de/hunspell/de_DE.dict', 'de-DE'], ['/de/hunspell/de_DE.dict', null]]) {
  multi.push(op('spell-multi', { binary: bin, dist: 1, lists: [{ path: P(), lines: L1lines }], ...(lang ? { lang } : {}), words: mq }));
}
multi.push(op('spell-multi', { binary: '/en/hunspell/en_US.dict', dist: 2, lists: [{ path: P(), lines: L1lines }], words: mq }));
multi.push(op('spell-multi', { binary: '/en/hunspell/en_US.dict', dist: 1, lists: [{ path: P(), lines: [] }], words: mq.slice(0, 12) }));
multi.push(op('spell-multi', { binary: '/en/hunspell/en_US.dict', dist: 1, lists: [{ path: P(), lines: ['# only comments', '', '   '] }], words: mq.slice(0, 12) }));
multi.push(op('spell-multi', { binary: '/en/hunspell/en_US.dict', dist: 1, lists: [{ path: P(), lines: ['wordone', 'wordtwo'] }], variant: P(), variantLines: ['varianta', 'variantb', 'wordone'], words: ['wordone', 'wordtwo', 'varianta', 'variantb', 'varianc', 'LanguageTool', 'LanguageTooler', 'languagetoo', 'house'] }));
multi.push(op('spell-multi', { binary: '/en/hunspell/en_US.dict', dist: 1, lists: [{ path: P(), lines: ['wordone'] }], variant: P(), variantLines: [], words: ['wordone', 'LanguageTool', 'LanguageTooler', 'languagetoo'] }));
// caching traps: same path, different content; two paths on one reader
const SAME = '/spell-test/same.txt';
multi.push(op('spell-multi', { binary: '/en/hunspell/en_US.dict', dist: 1, lists: [{ path: SAME, lines: ['cachedone', 'cachedtwo'] }], words: ['cachedone', 'cachedtwo', 'cachedthree', 'cachedon'] }));
multi.push(op('spell-multi', { binary: '/en/hunspell/en_US.dict', dist: 1, lists: [{ path: SAME, lines: ['cachedthree', 'cachedfour'] }], words: ['cachedone', 'cachedtwo', 'cachedthree', 'cachedfour', 'cachedon'] }));
multi.push(op('spell-multi', { binary: '/en/hunspell/en_GB.dict', dist: 1, lists: [{ path: SAME, lines: ['cachedthree', 'cachedfour'] }], words: ['cachedone', 'cachedthree', 'cachedfour'] }));
const A = P(), B = P();
multi.push(op('spell-multi', { binary: '/en/hunspell/en_US.dict', dist: 1, lists: [{ path: A, lines: ['alphaone', 'alphatwo'] }, { path: B, lines: ['betaone', 'betatwo'] }], words: ['alphaone', 'alphatwo', 'betaone', 'betatwo', 'alphaon', 'betaon'] }));
multi.push(op('spell-multi', { binary: '/en/hunspell/en_US.dict', dist: 1, lists: [{ path: A, lines: ['alphaone', 'alphatwo'] }, { path: B, lines: ['betaone', 'betatwo'] }], words: ['alphaone', 'betaone'] }));
// invalid names
multi.push(op('spell-multi', { binary: '/en/hunspell/en_US.dict', dist: 1, lists: [{ path: '/spell-test/notxt.dic', lines: ['a'] }], words: ['a'] }));
multi.push(op('spell-multi', { binary: '/en/hunspell/en_US.dict', dist: 1, lists: [{ path: '/spell-test/x.txt', lines: ['abcd'] }], variant: '/spell-test/v.dic', variantLines: ['b'], words: ['abcd'] }));
multi.push(op('spell-multi', { binary: '/en/hunspell/en_US.info', dist: 1, lists: [{ path: P(), lines: ['abcd'] }], words: ['abcd'] }));
multi.push(op('spell-multi', { binary: '/en/hunspell/nonexistent.dict', dist: 1, lists: [{ path: P(), lines: ['abcd'] }], words: ['abcd'] }));
multi.push(op('spell-multi', { binary: '/en/hunspell/en_US.dict', dist: 0, lists: [{ path: P(), lines: ['abcd'] }], words: ['abcd'] }));
multi.push(op('spell-multi', { binary: '/en/hunspell/en_US.dict', dist: -3, paths: ['/en/hunspell/spelling.txt'], words: ['abcd'] }));
// path based (resource spelling.txt)
const enSp = readFileSync(path.join(RES, 'resource/en/hunspell/spelling.txt'), 'utf8').split('\n').filter((l) => l && !l.startsWith('#')).map((l) => l.split('#')[0].trim()).filter(Boolean);
const enUS = readFileSync(path.join(RES, 'resource/en/hunspell/spelling_en-US.txt'), 'utf8').split('\n').filter((l) => l && !l.startsWith('#')).map((l) => l.split('#')[0].trim()).filter(Boolean);
const deSp = readFileSync(path.join(RES, 'resource/de/hunspell/spelling.txt'), 'utf8').split('\n').filter((l) => l && !l.startsWith('#')).map((l) => l.split('#')[0].trim()).filter(Boolean);
seed = 777;
const pk = (arr, k) => Array.from({ length: k }, () => arr[ri(arr.length)]);
const enW = pk(enSp, 60), usW = pk(enUS, 20), deW = pk(deSp, 70);
multi.push(op('spell-multi', { binary: '/en/hunspell/en_US.dict', dist: 1, paths: ['/en/hunspell/spelling.txt'], words: [...enW, ...enW.map((w) => typo(w, ALPHA.en))] }));
multi.push(op('spell-multi', { binary: '/en/hunspell/en_US.dict', dist: 1, paths: ['/en/hunspell/spelling.txt'], lang: 'en-US', variant: '/en/hunspell/spelling_en-US.txt', words: [...enW.slice(0, 20), ...usW, ...usW.map((w) => typo(w, ALPHA.en)), 'LanguageTool', 'LanguageTooler'] }));
multi.push(op('spell-multi', { binary: '/en/hunspell/en_GB.dict', dist: 1, paths: ['/en/hunspell/spelling.txt'], variant: '/en/hunspell/spelling_en-GB.txt', words: enW.slice(0, 30) }));
multi.push(op('spell-multi', { binary: '/de/hunspell/de_DE.dict', dist: 1, paths: ['/de/hunspell/spelling.txt'], lang: 'de-DE', words: [...deW, ...deW.map((w) => typo(w, ALPHA.de))] }));
multi.push(op('spell-multi', { binary: '/de/hunspell/de_DE.dict', dist: 1, paths: ['/de/hunspell/spelling.txt', '/de/hunspell/spelling_custom.txt'], words: deW.slice(0, 30) }));
multi.push(op('spell-multi', { binary: '/en/hunspell/en_US.dict', dist: 1, paths: [], words: ['house', 'hause'] }));
multi.push(op('spell-multi', { binary: '/en/hunspell/en_US.dict', dist: 1, paths: ['/en/hunspell/nonexistent.txt'], words: ['house'] }));
multi.push(op('spell-multi', { binary: '/en/hunspell/en_US.dict', dist: 1, paths: ['/en/hunspell/spelling.dic'], words: ['house'] }));
multi.push(op('spell-multi', { binary: '/en/hunspell/en_US.dict', dist: 1, paths: ['/en/hunspell/spelling.txt'], variant: '/en/hunspell/spelling_en-US.dic', words: ['house'] }));
multi.push(op('spell-multi', { binary: '/en/hunspell/en_US.dict', dist: 1, paths: ['/en/hunspell/spelling.txt'], variant: '/en/hunspell/nonexistent.txt', words: ['house'] }));
multi.push(op('spell-multi', { binary: '/en/hunspell/en_US.dict', dist: 1, paths: [null], words: ['house'] }));
// user dictionaries
const U = ['mynameisfoo', 'Quuxington', 'zzfoo', 'Ünïque'];
multi.push(op('spell-multi', { binary: '/en/hunspell/en_US.dict', dist: 1, lists: [{ path: P(), lines: L1lines }], userWords: U, words: [...U, 'mynameisfo', 'quuxington', 'QUUXINGTON', 'fooba', 'foobar', 'zzfo', 'house', 'hause'] }));
multi.push(op('spell-multi', { binary: '/en/hunspell/en_US.dict', dist: 1, lists: [{ path: P(), lines: L1lines }], userWords: [], words: ['fooba', 'foobar'] }));
multi.push(op('spell-multi', { binary: '/en/hunspell/en_US.dict', dist: 1, lists: [{ path: P(), lines: L1lines }], userWords: U, userCache: 1000, userName: 'u1', words: [...U, 'mynameisfo', 'zzfo'] }));
multi.push(op('spell-multi', { binary: '/en/hunspell/en_US.dict', dist: 1, lists: [{ path: P(), lines: L1lines }], userWords: ['other1', 'other2'], userCache: 1000, userName: 'u1', words: ['other1', 'other2', ...U, 'mynameisfo'] }));
multi.push(op('spell-multi', { binary: '/en/hunspell/en_US.dict', dist: 1, lists: [{ path: P(), lines: L1lines }], userWords: ['other1', 'other2'], userCache: 1000, userName: 'u2', words: ['other1', 'other2', 'other3', ...U] }));
multi.push(op('spell-multi', { binary: '/de/hunspell/de_DE.dict', dist: 1, paths: ['/de/hunspell/spelling.txt'], userWords: ['Fooböse', 'Barfüßler'], words: ['Fooböse', 'Foobösee', 'Barfüßler', 'Barfüssler', 'Haus', 'Hause'] }));
write('multi', 'CORE-0232 MorfologikMultiSpeller runtime FSAs', multi);

// ---- ranking helpers
const pairs = [['', ''], ['', 'a'], ['a', ''], ['a', 'a'], ['abc', 'abc'], ['abc', 'abd'], ['abc', 'ab'], ['abc', 'abcd'], ['abc', 'acb'], ['abc', 'bac'], ['abc', 'cba'], ['ab', 'ba'], ['ca', 'abc'], ['kitten', 'sitting'], ['house', 'hause'], ['house', 'huose'], ['house', 'hosue'], ['house', 'houses'], ['house', 'hous'], ['house', 'ouse'], ['house', 'xhouse'], ['house', 'HOUSE'], ['Haus', 'haus'], ['Straße', 'Strasse'], ['Straße', 'Strase'], ['Äpfel', 'Apfel'], ['Äpfel', 'Äpfle'], ['café', 'cafe'], ['a😀b', 'ab'], ['a😀b', 'a😁b'], ['😀', '😁'], ['😀😁', '😁😀'], ['\uD800', 'a'], ['é', 'é'], ['aaaa', 'aa'], ['abab', 'baba'], ['abcdef', 'badcfe'], ['abcdef', 'fedcba'], ['aaa', 'bbb'], ['ab', 'bca'], ['xyz', 'zyx'], ['transpose', 'trasnpose'], ['recieve', 'receive'], ['teh', 'the'], ['hte', 'the'], ['hello world', 'hello  world'], ['hello world', 'helloworld'], ['a-b', 'ab'], ["don't", 'dont'], ['x'.repeat(100), 'x'.repeat(99) + 'y'], ['abcdefghij'.repeat(10), 'badcfehgji'.repeat(10)], ['a'.repeat(200), 'b'.repeat(150)], [null, 'a'], ['a', null], [null, null], ['ab', 'abab'], ['abc', 'cab'], ['12345', '12435'], ['AbC', 'aBc']];
write('rank', 'CORE-0233 ranking helpers (DetailedDamerauLevenstheinDistance, WeightedSuggestion, SuggestionsOrdererConfig)', [
  op('spell-rank', { fn: 'compare', pairs }),
  ...['insert', 'delete', 'replace', 'transpose'].flatMap((o) => [1, 2, 42, -7, 123456789].map((s) => op('spell-rank', { fn: 'edits', op: o, seed: s, repeat: 6, inputs: ['', 'a', 'ab', 'abc', 'house', 'Haus', 'Straße', 'a😀b', 'x'.repeat(40), '😀😁'] }))),
  op('spell-rank', { fn: 'distance', chain: ['insert', 'delete', 'replace', 'transpose', 'track-insert', 'track-delete', 'track-replace', 'track-transpose', 'track-anon'], eq: [2, 2, 2, 2] }),
  op('spell-rank', { fn: 'distance', chain: ['insert', 'insert'], eq: [2, 0, 0, 0] }),
  op('spell-rank', { fn: 'distance', chain: [], eq: [0, 0, 0, 0] }),
  op('spell-rank', { fn: 'weighted', items: [['b', 2], ['a', 1], ['c', 1], ['d', 0], ['e', -1], ['f', 2147483647], ['g', -2147483648], ['a', 1], ['ß', 3], ['😀', 5], ['', 1], [null, 1]] }),
  op('spell-rank', { fn: 'weighted', items: [] }),
  op('spell-rank', { fn: 'config', props: [null, 'true', 'TRUE', 'True', 'false', 'yes', '1', '', ' true', 'tRuE', null] }),
]);
