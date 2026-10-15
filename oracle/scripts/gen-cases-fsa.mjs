// Authors oracle/cases/X-FSA/*.json (inputs only). Ops fsa-info / fsa-lookup / fsa-enum: docs/review/F08-oracle.md.
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { writeCases } from './gen-probe-cases-numbers.mjs';
import { ROOT } from '../lib/env.mjs';

const RES = path.join(ROOT, 'resources/org/languagetool');
const rd = (f) => readFileSync(path.join(RES, f), 'utf8');
const sha = (s) => createHash('sha1').update(s).digest('hex');

// example sentences (incl. corrections) of grammar/style/disambiguation of a language -> unique tokens
function tokensOf(lang) {
  const files = [`rules/${lang}/grammar.xml`, `rules/${lang}/style.xml`, `resource/${lang}/disambiguation.xml`, ...(lang === 'en' ? ['rules/en/grammar-l2-de.xml', 'rules/en/grammar-l2-fr.xml'] : [])];
  const set = new Set();
  for (const f of files) {
    if (!existsSync(path.join(RES, f))) continue;
    const x = rd(f);
    const texts = [];
    for (const m of x.matchAll(/<example\b([^>]*)>([\s\S]*?)<\/example>/g)) {
      texts.push(m[2].replace(/<\/?marker>/g, ' '));
      const c = m[1].match(/\bcorrection="([^"]*)"/);
      if (c) texts.push(...c[1].split('|'));
    }
    for (const t of texts) for (const w of t.matchAll(/[\p{L}\p{M}\p{N}]+(?:['’\-][\p{L}\p{M}\p{N}]+)*/gu)) set.add(w[0].replace(/&[a-z]+;/g, ''));
  }
  return [...set].sort((a, b) => (sha(a) < sha(b) ? -1 : 1));
}

const EDGE = ['', ' ', '  ', '\t', 'a', 'A', 'z', '.', ',', '-', '--', "'", '’', '+', '_', '|', '\u0000', '\n', 'a+b', 'a_b', 'a|b', 'a\tb', '+a', 'a+', '_a', 'a_',
  '123', '0', '3.14', '1990s', '12.5%', '€', '©', '😀', '𝒜bc', 'ab😀cd', '\uD800', 'a\uD800b', '\uDC00', 'ab\u0301', 'e\u0301', 'é', 'é', 'ǅ', 'ﬁ', 'İ', 'ı', 'I', 'i',
  'x'.repeat(300), 'a'.repeat(10000), 'Donaudampfschifffahrtsgesellschaft', 'Haus-Tür', 'E-Mail', 'well-known', "don't", 'don’t', "l'homme", 'l’homme', "aujourd'hui", "qu'est-ce", 'Äpfel', 'äpfel', 'ÄPFEL', 'Straße', 'STRASSE', 'strasse', 'Straßen', 'ß', 'ẞ', 'Öl', 'öl', 'Übel', 'über', 'Ü', 'ü', 'œuvre', 'Œuvre', 'cœur', 'garçon', 'Garçon', 'élève', 'ÉLÈVE', 'élève', 'naïve', 'café', 'Café', 'CAFÉ', 'zoë', 'the', 'The', 'THE', 'tHe', 'house', 'House', 'running', 'went', 'children', 'better', 'best', 'Haus', 'haus', 'HAUS', 'Häuser', 'ging', 'gegangen', 'schöner', 'am', 'zum', 'beim', 'allez', 'été', 'mangé', 'chevaux', 'yeux', 'qu', 'j', 'l', 'd'];
const KEYS = { de: ['Haus|SUB:NOM:SIN:NEU', 'gehen|VER:INF:NON', 'schön|ADJ:PRD:GRU', 'schön|ADJ:NOM:SIN:MAS:GRU:SOL', 'Mann|SUB:NOM:PLU:MAS', 'sein|VER:1:SIN:PRÄ:NON', 'gehen|VER:.*', 'Haus|', '|SUB:NOM:SIN:NEU', 'Haus', 'Haus|XXX', 'Haus|SUB'],
  en: ['house|NN', 'house|NNS', 'go|VBD', 'go|VBG', 'be|VBZ', 'good|JJR', 'good|JJS', 'child|NNS', 'run|VBN', 'the|DT', 'house|.*', 'house|', '|NN', 'house', 'house|XXX', 'house|N'],
  fr: ['maison|N f s', 'aller|V ppre', 'aller|V inf', 'manger|V ind pa 3 s', 'beau|J m s', 'beau|J f p', 'cheval|N m p', 'être|V ind pr 1 s', 'maison|.*', 'maison|', '|N f s', 'maison', 'maison|XXX'] };

const L = { de: { tag: '/de/german.dict', syn: '/de/german_synth.dict', sp: ['/de/hunspell/de_AT.dict', '/de/hunspell/de_CH.dict', '/de/hunspell/de_DE.dict'] },
  en: { tag: '/en/english.dict', syn: '/en/english_synth.dict', sp: ['en_AU', 'en_CA', 'en_GB', 'en_NZ', 'en_US', 'en_ZA'].map((x) => `/en/hunspell/${x}.dict`) },
  fr: { tag: '/fr/french.dict', syn: '/fr/french_synth.dict', sp: [] } };

const name = (d) => d.replace(/^\//, '').replace(/\.dict$/, '').replace(/[\/_]/g, '-');
const chunks = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, (i + 1) * n));
const lookup = (dict, words, extra = {}) => ({ op: 'fsa-lookup', args: { dict, words, ...extra } });

const cases = [];
const all = [];
for (const [lang, c] of Object.entries(L)) {
  const toks = tokensOf(lang);
  const sample = toks.slice(0, 2500);
  const lower = sample.slice(0, 900).map((t) => t.toLowerCase()).filter((t) => !sample.includes(t));
  const words = [...EDGE, ...sample, ...lower];
  all.push([lang, toks.length, words.length]);
  for (const d of [c.tag, ...c.sp]) {
    cases.push([`lookup-${name(d)}`, `fsa-lookup ${d}: ${words.length} words (edge cases + ${lang} grammar/disambiguation example tokens + lowercase variants)`, chunks(words, 500).map((w) => lookup(d, w))]);
  }
  // tagger path (MorfologikTagger#tag: frequency byte stripped, TaggedWord)
  cases.push([`tagger-${name(c.tag)}`, `MorfologikTagger.tag on ${c.tag}`, chunks(words.slice(0, 1200), 600).map((w) => lookup(c.tag, w, { mode: 'tagger' }))]);
  // synthesizer: keys lemma|tag built from the tagger readings of the first tokens, plus fixed keys
  cases.push([`lookup-${name(c.syn)}`, `fsa-lookup ${c.syn}: keys lemma|tag derived (in Java) from tagger readings of ${lang} tokens + fixed/edge keys`, [
    ...[0, 1, 2, 3].map((i) => lookup(c.syn, sample.slice(i * 150, (i + 1) * 150), { keysFromTagger: { dict: c.tag }, extraKeys: i === 0 ? [...KEYS[lang], ...EDGE] : [] }))]]);
  for (const d of [c.tag, c.syn, ...c.sp]) {
    cases.push([`enum-${name(d)}`, `fsa-enum ${d}: full FSA sequence enumeration (count, SHA-256, first/last 100) and DictionaryLookup iteration`, [
      { op: 'fsa-enum', args: { dict: d, mode: 'fsa' } }, { op: 'fsa-enum', args: { dict: d, mode: 'lookup' } }]]);
  }
}
// encoder / separator / encoding overrides on real dicts (INFIX/PREFIX/NONE unused in wave 1 dicts, but supported by the library)
const eng = tokensOf('en').slice(0, 250);
const ov = [];
for (const [dict, base] of [['/en/english.dict', 'fsa.dict.separator=+\nfsa.dict.encoding=utf-8\n'], ['/de/german.dict', 'fsa.dict.separator=+\nfsa.dict.encoding=utf-8\n']]) {
  const w = dict.includes('/en/') ? eng : tokensOf('de').slice(0, 250);
  for (const enc of ['SUFFIX', 'PREFIX', 'INFIX', 'NONE', 'prefix', 'Infix', 'none', 'suffix'])
    ov.push(lookup(dict, w, { info: `${base}fsa.dict.encoder=${enc}\n` }));
  for (const sep of ['_', '|', ' ', '\\u0000', '\\t', 'ab', '\\u00e4'])
    ov.push(lookup(dict, w.slice(0, 120), { info: `fsa.dict.separator=${sep}\nfsa.dict.encoding=utf-8\nfsa.dict.encoder=SUFFIX\n` }));
  for (const e of ['iso-8859-1', 'ISO-8859-1', 'utf8', 'UTF-16', 'windows-1252', 'us-ascii', 'nosuch'])
    ov.push(lookup(dict, [...EDGE.filter((x) => x.length < 40), ...w.slice(0, 80)], { info: `fsa.dict.separator=+\nfsa.dict.encoding=${e}\nfsa.dict.encoder=SUFFIX\n` }));
  ov.push(lookup(dict, w.slice(0, 120), { info: `${base}fsa.dict.encoder=SUFFIX\nfsa.dict.frequency-included=true\n` }));
}
cases.push(['lookup-overrides', 'fsa-lookup with overridden .info (encoder SUFFIX/PREFIX/INFIX/NONE incl. case variants, separator, encoding) on english.dict and german.dict', ov]);
cases.push(['enum-overrides', 'fsa-enum with overridden .info (encoder / separator / encoding)', ['PREFIX', 'INFIX', 'NONE'].flatMap((enc) => [
  { op: 'fsa-enum', args: { dict: '/en/english.dict', mode: 'lookup', info: `fsa.dict.separator=+\nfsa.dict.encoding=utf-8\nfsa.dict.encoder=${enc}\n` } }]).concat(
  [{ op: 'fsa-enum', args: { dict: '/en/english.dict', mode: 'lookup', info: 'fsa.dict.separator=_\nfsa.dict.encoding=utf-8\nfsa.dict.encoder=SUFFIX\n' } },
   { op: 'fsa-enum', args: { dict: '/en/english.dict', mode: 'lookup', info: 'fsa.dict.separator=+\nfsa.dict.encoding=iso-8859-1\nfsa.dict.encoder=SUFFIX\n' } }])]);

// fsa-info: every wave-1 dict, plus .info variants and failures
const dicts = Object.values(L).flatMap((c) => [c.tag, c.syn, ...c.sp]);
cases.push(['info-wave1', 'fsa-info of every wave-1 .dict (FSA class/version/flags/node+arc counts, parsed .info metadata)', dicts.map((dict) => ({ op: 'fsa-info', args: { dict } }))]);
const I = (info, dict = '/en/english.dict') => ({ op: 'fsa-info', args: { dict, info } });
const B = 'fsa.dict.separator=+\nfsa.dict.encoding=utf-8\nfsa.dict.encoder=SUFFIX\n';
cases.push(['info-synthetic', 'fsa-info with synthetic .info content (Properties syntax, missing/invalid keys, options) and failure modes (no .info, missing dict)', [
  { op: 'fsa-info', args: { dict: '/en/english.dict', noInfo: true } },
  { op: 'fsa-info', args: { dict: '/en/nosuch.dict' } },
  { op: 'fsa-info', args: { dict: '/en/english.info' } },
  I(B), I(''), I('# only comment\n'), I('fsa.dict.separator=+\n'), I('fsa.dict.separator=+\nfsa.dict.encoding=utf-8\n'),
  I('fsa.dict.encoding=utf-8\nfsa.dict.encoder=SUFFIX\n'), I('fsa.dict.separator=\nfsa.dict.encoding=utf-8\nfsa.dict.encoder=SUFFIX\n'),
  I('fsa.dict.separator=ab\nfsa.dict.encoding=utf-8\nfsa.dict.encoder=SUFFIX\n'), I('fsa.dict.separator=\\u00e4\nfsa.dict.encoding=utf-8\nfsa.dict.encoder=SUFFIX\n'),
  I('fsa.dict.separator=\\u20ac\nfsa.dict.encoding=utf-8\nfsa.dict.encoder=SUFFIX\n'), I('fsa.dict.separator=\\t\nfsa.dict.encoding=utf-8\nfsa.dict.encoder=SUFFIX\n'),
  I('fsa.dict.separator = +\nfsa.dict.encoding : utf-8\nfsa.dict.encoder\tSUFFIX\n'), I('fsa.dict.separator=+ \nfsa.dict.encoding=utf-8 \nfsa.dict.encoder=SUFFIX \n'),
  I('fsa.dict.separator=+\nfsa.dict.encoding=utf-8\nfsa.dict.encoder=NOSUCH\n'), ...['prefix', 'PREFIX', 'Prefix', 'infix', 'none', 'NONE', 'suffix', 'Suffix', ' SUFFIX'].map((e) => I(`fsa.dict.separator=+\nfsa.dict.encoding=utf-8\nfsa.dict.encoder=${e}\n`)),
  I('fsa.dict.separator=+\nfsa.dict.encoding=nosuch\nfsa.dict.encoder=SUFFIX\n'), I('fsa.dict.separator=+\nfsa.dict.encoding=UTF-16\nfsa.dict.encoder=SUFFIX\n'), I('fsa.dict.separator=+\nfsa.dict.encoding=iso-8859-1\nfsa.dict.encoder=SUFFIX\n'),
  I(B + 'fsa.dict.frequency-included=true\n'), I(B + 'fsa.dict.frequency-included=TRUE\n'), I(B + 'fsa.dict.frequency-included=yes\n'), I(B + 'fsa.dict.frequency-included=\n'),
  I(B + 'fsa.dict.speller.ignore-numbers=true\nfsa.dict.speller.ignore-punctuation=true\nfsa.dict.speller.ignore-camel-case=true\nfsa.dict.speller.ignore-all-uppercase=true\nfsa.dict.speller.ignore-diacritics=true\nfsa.dict.speller.convert-case=true\nfsa.dict.speller.runon-words=true\n'),
  I(B + 'fsa.dict.speller.ignore-numbers=false\nfsa.dict.speller.ignore-punctuation=false\nfsa.dict.speller.ignore-camel-case=false\nfsa.dict.speller.convert-case=false\nfsa.dict.speller.runon-words=false\n'),
  I(B + 'fsa.dict.speller.ignore-numbers=maybe\n'), I(B + 'fsa.dict.speller.locale=en_US\n'), I(B + 'fsa.dict.speller.locale=de\n'), I(B + 'fsa.dict.speller.locale=de-AT\n'), I(B + 'fsa.dict.speller.locale=nosuch\n'), I(B + 'fsa.dict.speller.locale=\n'),
  I(B + 'fsa.dict.speller.replacement-pairs=a b, c d,e f\n'), I(B + 'fsa.dict.speller.replacement-pairs=a b,a c,a b\n'), I(B + 'fsa.dict.speller.replacement-pairs=a\n'), I(B + 'fsa.dict.speller.replacement-pairs=a b c\n'), I(B + 'fsa.dict.speller.replacement-pairs=\n'),
  I(B + 'fsa.dict.speller.equivalent-chars=a à,à a,e é\n'), I(B + 'fsa.dict.speller.equivalent-chars=a àb\n'), I(B + 'fsa.dict.speller.equivalent-chars=a\n'), I(B + 'fsa.dict.speller.equivalent-chars=a à, a á\n'),
  I(B + 'fsa.dict.input-conversion=a b, c d\nfsa.dict.output-conversion=x y\n'), I(B + 'fsa.dict.input-conversion=a\n'), I(B + 'fsa.dict.input-conversion=\\u2019 \'\n'),
  I(B + 'fsa.dict.license=x\nfsa.dict.author=y\nfsa.dict.created=2020-01-01\n'), I(B + 'fsa.dict.unknown=foo\nrandom.key=1\n'), I(B + 'fsa.dict.speller.ignore-numbers=true\nfsa.dict.speller.ignore-numbers=false\n'),
  I('# c\n! c2\n' + B), I('fsa.dict.separator=+\\\n\nfsa.dict.encoding=utf-8\nfsa.dict.encoder=SUFFIX\n'), I('fsa.dict.separator=+\r\nfsa.dict.encoding=utf-8\r\nfsa.dict.encoder=SUFFIX\r\n'),
  I('fsa.dict.separator=+\nfsa.dict.encoding=utf-8\nfsa.dict.encoder=SUFFIX\nfsa.dict.speller.replacement-pairs=ä ae, ö oe\u00fc\n'), I(B, '/de/hunspell/de_DE.dict'), I(B, '/fr/french.dict'),
]]);

writeCases('X-FSA', cases);
console.log(`X-FSA: ${cases.length} case files; tokens/words per lang: ${all.map((a) => a.join('/')).join(' ')}`);
import fs from 'node:fs';
{
  const f = path.join(ROOT, 'oracle/cases/X-FSA/info-synthetic.json'); const j = JSON.parse(fs.readFileSync(f)); j.normalize = ['paths']; fs.writeFileSync(f, JSON.stringify(j, null, 1) + '\n');
}
