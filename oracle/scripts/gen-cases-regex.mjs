// Authors oracle/cases/X-REGEX/*.json (inputs only; expected values come from the Java run).
// Tiers: synthetic (hand-picked construct suite), shallow (every harvested pattern, few inputs), deep (construct sample, many inputs).
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';
import { constructs } from './lib-regex-constructs.mjs';
import { sample } from './lib-regex-sample.mjs';

const DIR = path.join(ROOT, 'oracle/cases/X-REGEX');
const pats = JSON.parse(readFileSync(path.join(DIR, 'harvest/patterns.json'), 'utf8'));
for (const f of readdirSync(DIR)) if (f.endsWith('.json')) rmSync(path.join(DIR, f));

const fnv = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h; };
const U = (...cps) => String.fromCodePoint(...cps);
const EDGE = ['', ' ', 'a', 'Ab', 'ß', 'İ', 'ı', 'é', 'é', 'ǅ', 'ſ', 'K', 'ΑΣ', 'ς', U(0x1f600), 'x' + U(0x1f600) + 'y', '\ud800', 'a b', 'a\nb', 'a\r\nb', 'a b', 'Zürich', '1,5', 'ÄÖÜäöüß', 'Straße', 'İstanbul', 'STRASSE', 'a\u0085b', ' a ', 'über', 'x́y', '_', '-', '.'];
const TAGS = ['NN', 'VB', 'UNKNOWN', 'SENT_START', 'VER:1:SIN:PRÄ:NON', 'SUB:NOM:SIN:MAS', 'ADJ:PRD:GRU', 'N f s', 'V ind pres 3 s', 'NNP', 'JJ', 'PCT', '_PUNCT'];

// corpus words/sentences per language (the de corpus file currently holds English text, see report)
const corpus = {};
for (const l of ['de', 'en', 'fr']) {
  const t = readFileSync(path.join(ROOT, `oracle/corpus/${l}/corpus.txt`), 'utf8');
  const words = [...new Set(t.match(/[\p{L}\p{M}][\p{L}\p{M}'’-]*/gu) ?? [])];
  const sents = t.split(/(?<=[.!?])\s+/).filter((s) => s.length > 15 && s.length < 220);
  corpus[l] = { words: words.filter((_, i) => i % 7 === 0).slice(0, 300), sents: sents.slice(0, 80) };
}
const langOf = (p) => {
  const w = p.where[0] ?? '';
  const m = /^(de|en|fr)\b/.exec(w) ?? /\/(de|en|fr)\/|language-modules\/(de|en|fr)/.exec(w);
  return m ? (m[1] ?? m[2]) : 'en';
};
const clean = (s) => s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const tokensOf = (s) => s.match(/[\p{L}\p{M}\p{N}]+(?:['’.\-:_][\p{L}\p{M}\p{N}]+)*/gu) ?? [];
const pick = (arr, seed) => (arr.length ? arr[fnv(seed) % arr.length] : undefined);
const trunc = (s) => (s.length > 300 ? s.slice(0, 300) : s);
const uniq = (a) => [...new Set(a.filter((x) => x !== undefined))];

function shallowInputs(p) {
  const l = langOf(p);
  const isRegexRule = p.kinds.some((k) => k.endsWith('regexp-rule'));
  const isPos = p.kinds.every((k) => /postag|match-postag|chunk|filter-arg:(desiredPostag|postagSelect|lemmaSelect)/.test(k));
  const exs = p.examples.map(clean).filter(Boolean);
  const toks = uniq(exs.flatMap(tokensOf));
  const s1 = sample(p.pattern, 'first');
    const out = [s1];
  if (isRegexRule) {
    out.push(pick(exs, p.id + 'e'));
  } else if (isPos) {
    out.push(pick(TAGS, p.id + 't'));
  } else {
    out.push(toks.length ? pick(toks, p.id + 'x') : pick(corpus[l].words, p.id + 'w'));
  }
  out.push(pick(EDGE, p.id + 'g'));
  return uniq(out).slice(0, 3).map(trunc);
}

function deepInputs(p) {
  const l = langOf(p);
  const exs = p.examples.map(clean).filter(Boolean);
  const toks = uniq(exs.flatMap(tokensOf));
  const out = [sample(p.pattern, 'first'), sample(p.pattern, 'last')];
  for (let i = 0; i < 4; i++) out.push(pick(toks, p.id + 'dx' + i), pick(corpus[l].words, p.id + 'dw' + i));
  out.push(pick(exs, p.id + 'de'), pick(corpus[l].sents, p.id + 'dc'), pick(TAGS, p.id + 'dt'));
  out.push(...EDGE);
  return uniq(out).map(trunc);
}

function write(name, desc, requests) {
  const cs = { kind: 'harness', clock: 'fixed', description: desc, normalize: [], compare: 'jsonl', ops: requests.map((args) => ({ op: 'regex', args })) };
  writeFileSync(path.join(DIR, `${name}.json`), JSON.stringify(cs));
}

// ---- shallow ----
const CH = 700;
let nShallow = 0;
for (let i = 0; i < pats.length; i += CH) {
  const reqs = pats.slice(i, i + CH).map((p) => ({ pattern: p.pattern, flags: p.flags, inputs: shallowInputs(p), ops: ['matches', 'lookingAt', 'find'] }));
  write(`shallow-${String(nShallow).padStart(3, '0')}`, `harvested patterns ${pats[i].id}..${pats[Math.min(i + CH, pats.length) - 1].id}: compile result + few inputs`, reqs);
  nShallow++;
}

// ---- deep: up to 6 patterns per construct (hash order) + regexp-rule patterns ----
const byC = new Map();
for (const p of pats) {
  if (p.pattern.length > 400) continue;
  for (const c of constructs(p.pattern, p.flags)) { if (!byC.has(c)) byC.set(c, []); byC.get(c).push(p); }
}
const deepSet = new Map();
for (const [c, list] of [...byC].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
  const sorted = [...list].sort((a, b) => fnv(a.id + c) - fnv(b.id + c));
  const quota = list.length < 200 ? 12 : 4;
  for (const p of sorted.slice(0, quota)) deepSet.set(p.id, p);
}
for (const p of pats.filter((x) => x.kinds.some((k) => k.endsWith('regexp-rule')) && x.pattern.length <= 400).sort((a, b) => fnv(a.id) - fnv(b.id)).slice(0, 60)) deepSet.set(p.id, p);
const deep = [...deepSet.values()].sort((a, b) => (a.id < b.id ? -1 : 1));
let nDeep = 0;
for (let i = 0; i < deep.length; i += 120) {
  write(`deep-${String(nDeep).padStart(2, '0')}`, 'construct sample: all ops, split limits 0,-1,2,1, many inputs',
    deep.slice(i, i + 120).map((p) => ({ pattern: p.pattern, flags: p.flags, inputs: deepInputs(p), limits: [0, -1, 2, 1] })));
  nDeep++;
}

// ---- synthetic ----
const S = ['', 'a', 'A', 'aa', 'aaa', 'ab', 'abc', 'abcd', 'aBc', 'ABC', 'b', 'x', 'xyz', '1', '12', '123', 'a1', 'a b', ' a ', 'a-b', 'a_b', 'a.b', 'a,b;c', 'a\nb', 'a\r\nb', 'a\rb', 'a\u0085b', 'a b', 'a\n', '\na', 'a\n\n', 'ä', 'Ä', 'äöü', 'ÄÖÜ', 'über', 'Über', 'Straße', 'STRASSE', 'ß', 'ẞ', 'SS', 'ss', 'İ', 'i', 'I', 'ı', 'ſ', 's', 'S', 'K', 'k', 'K', 'σ', 'ς', 'Σ', 'ǅ', 'ǆ', 'Ǆ', 'é', 'é', 'É', 'á', U(0x1f600), 'a' + U(0x1f600) + 'b', '\ud800', '\udc00', 'a\ud800b', 'a b', 'a b', 'a b', 'a\tb', 'a\u0000b', 'a\u0001b', '­', 'a​b', '٣', 'a٣', 'x😀', '日本語', 'Привет', 'αβγ', 'a(b)c', 'a[b]c', 'a$b', 'a^b', 'a\\b', 'a+b', 'a*b', '(', 'aaaa aaaa', 'foo bar foo', 'abab', 'abcabc', 'xx yy', 'ab12cd', 'AbC dEf', "l'été", 'd’un', '1,5', '3.14', '€5', 'a@b.de', 'Mr. Smith', 'a  b'];
const SYN = [];
const add = (pattern, flags = 0, extra = [], repls = null) => SYN.push({ pattern, flags, extra, repls });
const F = { UX: 1, I: 2, C: 4, M: 8, L: 16, S: 32, UC: 64, CE: 128, U: 256 };
// possessive, atomic, lazy
for (const p of ['a*+a', 'a++b', 'a?+a', 'a{1,2}+a', '(?>a+)a', '(?>a|ab)c', '(a|ab)(?>c|bcd)d', '[a-c]*+c', '\\d{2,3}+\\d', 'x*+', '(?>x*)y', '.*+b', 'a*?b', 'a+?', 'a??a', 'a{2,3}?', '(?:a|ab)*?c']) add(p, 0, ['aaa', 'aab', 'abcd', 'xxxy', 'aabab', '1234', 'abccc']);
// classes and set operations
for (const p of ['[a-z&&[^aeiou]]+', '[\\p{L}&&[^\\p{Lu}]]+', '[a-d[m-p]]+', '[^a-c&&[^x]]', '[\\w&&[^\\d]]+', '[a-z&&[def]]+', '[\\p{Punct}…–—&&[^"\'_]]', "['’\\p{L}-[_]]+", '[^\\s]+', '[^\\S]+', '[\\s\\S]', '[a-]', '[-a]', '[a\\-z]', '[]a]', '[^]a]', '[\\]]', '[\\[]', '[a-c-e]', '[ab&&]', '[&&a]', '[a&b]', '[\\Q]\\E]', '[\\x41-\\x43]+', '[\\u0041-\\u0043]+', '[äöü]+', '[ä-ü]+', '[\\p{L}\\p{M}]+', '[\\p{IsAlphabetic}&&\\p{ASCII}]+', '[^\\p{L}]', '[\\h\\v]', '[\\R]', '[.]', '[$^]', '[a-a]', '[\\d-x]', '[x-\\d]', '[z-a]', '[a', '[', ']', '[]', '[^]', '[a--b]', '[[a]]', '[[a-c]&&[b-d]]', '[\\p{Lu}[\\p{Ll}]]+', '[^\\p{L}&&\\p{ASCII}]']) add(p);
// unicode properties
const props = ['L', 'Lu', 'Ll', 'Lt', 'Lm', 'Lo', 'M', 'Mn', 'Mc', 'N', 'Nd', 'Nl', 'No', 'P', 'Pd', 'Ps', 'Pe', 'Pi', 'Pf', 'Pc', 'Po', 'S', 'Sm', 'Sc', 'Sk', 'So', 'Z', 'Zs', 'Zl', 'Zp', 'C', 'Cc', 'Cf', 'Co', 'Cn', 'LC', 'L&', 'IsAlphabetic', 'IsLetter', 'IsDigit', 'IsUppercase', 'IsLowercase', 'IsPunctuation', 'IsWhite_Space', 'IsWhiteSpace', 'IsIdeographic', 'IsControl', 'IsHex_Digit', 'IsTitlecase', 'IsLu', 'IsL', 'javaLowerCase', 'javaUpperCase', 'javaWhitespace', 'javaLetter', 'javaLetterOrDigit', 'javaAlphabetic', 'javaDigit', 'javaSpaceChar', 'javaTitleCase', 'javaMirrored', 'javaISOControl', 'InGreek', 'InBasicLatin', 'InLatin-1Supplement', 'InLatin_1_Supplement', 'InLatinExtended-A', 'InCyrillic', 'IsLatin', 'IsGreek', 'IsCyrillic', 'IsHan', 'script=Latn', 'script=latin', 'sc=Greek', 'block=Greek', 'blk=Greek', 'gc=Lu', 'general_category=Lu', 'Alpha', 'Alnum', 'Punct', 'Upper', 'Lower', 'Digit', 'Space', 'Blank', 'Cntrl', 'Graph', 'Print', 'XDigit', 'ASCII', 'IsEmoji', 'Foo', '', 'InFoo', 'IsFoo', 'script=Foo', 'lu', 'LU', 'Latin', 'Greek', 'IsAlpha', 'IsPunct', 'Is'];
for (const nm of props) { add(`\\p{${nm}}`); add(`\\P{${nm}}`); }
for (const nm of ['L', 'Lu', 'IsAlphabetic', 'Alpha', 'Upper']) { add(`\\p{${nm}}+`, F.I); add(`\\p{${nm}}+`, F.I | F.UC); add(`[\\p{${nm}}]+`, F.I | F.UC); add(`\\p{${nm}}+`, F.U); add(`\\p{${nm}}+`, F.U | F.I); }
for (const p of ['\\pL+', '\\PL+', '\\pN', '\\p', '\\p{', '\\p{L', '\\p{^L}', '[\\pL]', '[\\p{L}&&\\p{Lu}]', '\\p{L}{2}', '\\p{Lu}\\p{Ll}+', '(?U)\\p{Alpha}+', '(?U)\\p{Upper}+', '(?U)\\p{Punct}+', '(?U)\\p{Space}+', '(?U)\\p{Digit}+', '(?U)\\p{Lower}+', '(?U)\\p{Alnum}+']) add(p);
// predefined classes and boundaries, with and without UNICODE_CHARACTER_CLASS
for (const p of ['\\w+', '\\W+', '\\d+', '\\D+', '\\s+', '\\S+', '\\h+', '\\H+', '\\v+', '\\V+', '\\R', '\\X', '\\b', '\\B', '\\bü', 'ü\\b', '\\b.', '.\\b', '\\Bü', '\\ba', 'a\\b', '\\b\\w+\\b', '\\w\\b', '\\b{g}', '[\\w]+', '[\\W]+', '[\\d]+', '[\\s]+', '[\\b]', '[^\\w]+', '[\\w-]+', '\\.', '\\-', '.', '.+', '.*', '(?s).', '(?s).*', '\\N{LATIN SMALL LETTER A}', '\\e', '\\a', '\\t', '\\n', '\\r', '\\f', '\\z', '\\Z', '\\A', '\\G', '^', '$', '^$', '^a', 'a$', '\\Aa', 'a\\z', 'a\\Z', '\\Ga', '(?m)^a', '(?m)a$', '(?m)^$', '(?m)^', '(?m)$', '(?d).', '(?d)a$', '(?md)^a', '(?sm)^.$']) { add(p, 0); add(p, F.U); }
for (const fl of [F.M, F.S, F.UX, F.M | F.UX, F.S | F.UX, F.M | F.S, F.U | F.M]) for (const p of ['.', '^a', 'a$', '^$', '.*', '\\Z', 'a\\Z', 'a.b', '$']) add(p, fl);
// inline flags
for (const p of ['(?i)a', '(?i)ä', '(?i)ß', '(?i)ss', '(?iu)ä', '(?u)ä', '(?iu)ß', '(?iu)ss', '(?iu)i', '(?iu)k', '(?iu)s', '(?iu)σ', '(?iu)ǆ', '(?i)(a)\\1', '(?iu)(ä)\\1', '(?i)(a)(?-i)\\1', '(a)\\1', '(a)\\1', '(?i-i)a', '(?-i)a', 'a(?i)b', 'a(?i)b(?-i)c', '(a(?i)b)c', '((?i)a)b', '(?:(?i)a)b', '(?i:a)b', '(?i:a)(?-i:b)', '(?i:a|b)c', '(a|(?i)b)c', '(?i)a|b', 'a|(?i)b', '(?i)', '(?i)(?-i)a', '(?-i)(?i)a', '(?s)a.b', '(?s:.)', '(?m)^a', '(?x) a b # comment\n c', '(?x)a\\ b', '(?x)a[ ]b', '(?x)a#c', '(?U)\\w+', '(?U)\\b', '(?U)ä', '(?u)\\w', '(?d)a', '(?isu)a', '(?isuxmdU)a', '(?q)a', '(?i', '(?', '(?)', '(?:', '(?-)a', '(?i-)a', '(?i-i)a', '(?<n>a)', '(?<n>a)\\k<n>', '(?<n>a)(?<n>b)', '(?<1n>a)', '(?<n-m>a)', '(?<n>a)\\k<m>', '(?<name>ä)\\k<name>', '(?i)(?<n>a)\\k<n>', '(?#comment)a', '(?=a)a', '(?!a)b', '(?<=a)b', '(?<!a)b', '(?<=a*)b', '(?<=a+)b', '(?<=a{1,3})b', '(?<=a|bc)d', '(?<=\\w)b', '(?<![a-z])b', '(?<=(a))b', '(?<=\\b)b', '(?<=^)a', '(?=)', '(?!)', '(?<=)', '(?<=a)', '(?<!a)', 'a(?=b)', 'a(?!b)', 'a(?=.*b)', '(?=a)(?=ab)', '(?=(a))\\1', '(?>a)', '(?>)', '(?<=x?)a', '(?<=x{0,2})a', '(?<=(?i)x)a', '(?i)(?<=X)a']) add(p);
for (const p of ['a', 'ä', 'ß', 'ss', 'SS', 'ǆ', 'i', 'İ', 'ı', 'k', 's', 'σ', 'ς', '[a-z]', '[A-Z]', '[^a]', '[^A]', '[äöü]', '[ä-ü]', '\\p{Lu}', '\\p{Ll}', '\\p{L}', '[\\p{Lu}]', '[^\\p{Lu}]', '\\w', '(a)\\1', '(ä)\\1', '(ß)\\1', '(?<n>a)\\k<n>', 'straße', 'STRASSE', 'é', 'é', '\\Qab\\E', '\\Q.\\E', 'a.c', 'ǅ', '[ǅ]', '[ǆ-ǈ]', 'ſ', '[ſ]', '[s]', 'K', '[k]', '[K]', 'Σ', 'ΑΣ', 'ΑΣ$', U(0x10428), '[' + U(0x10400) + '-' + U(0x10427) + ']']) {
  add(p, F.I); add(p, F.I | F.UC); add(p, F.UC); add(p, F.I | F.UC | F.U);
}
// escapes and quoting
for (const p of ['\\u0041', '\\u00e4', '\\uD83D\\uDE00', '\\ud83d', '\\u12', '\\u', '\\x41', '\\xE4', '\\x{41}', '\\x{1F600}', '\\x{110000}', '\\x{', '\\x4', '\\0101', '\\0', '\\08', '\\0777', '\\cA', '\\c', '\\Qa.b\\E', '\\Qa.b', '\\Q', '\\E', 'a\\Eb', '\\Q\\E', '\\Q\\\\E', '\\Q[\\E', '\\\\', '\\', 'a\\', '\\/', '\\ ', '\\_', '\\é', '\\q', '\\y', '\\i', '\\1', '(a)\\1', '(a)\\2', '(a)\\10', '(a)(b)(c)(d)(e)(f)(g)(h)(i)(j)\\10', '(a)(b)(c)(d)(e)(f)(g)(h)(i)(j)\\11', '(a)(b)(c)(d)(e)(f)(g)(h)(i)(j)(k)\\11', '(a)\\01', '\\k', '\\k<', '\\k<a>', '\\g', '\\G', '\\Z', '\\N', '\\N{', '\\N{x}', '\\o']) add(p);
// quantifier and syntax errors
for (const p of ['a{2}', 'a{2,}', 'a{2,3}', 'a{,2}', 'a{', 'a{}', 'a{1', 'a{1,', 'a{1,2', 'a{2,1}', 'a{0}', 'a{0,0}', 'a{1}{2}', 'a{99999999999}', 'a{2147483647}', 'a{1,2147483648}', '{', '}', '{1}', 'x{1}}', 'a**', 'a*+*', 'a+++', 'a???', '*a', '+a', '?a', '|', 'a|', '|a', '||', 'a||b', '(|)', '()', '(', ')', '(a', 'a)', '((a)', '(a))', '(?:a', '(?:)', '(?:|)', 'a|*', '(*)', '(+)', '(?)', '^*', '$*', '^+', '\\b*', '\\b+', '(?=a)*', '(?=a)+', '(?<=a)*', '\\A*', '', 'a{1,2}{3}', 'a{1,2}?', 'a{1,2}+', 'a?*', '.?', '.{0}', '(a*)*', '(a*)+', '(a+)+', '(a|b)*', '(a?)*', '(a|)*', '(|a)*', '(a*)*b', '(x+x+)+y', '((a)|b)+', '(a)|(b)', '(a)?', '(a)*', '(a){2}', '(a){0}', '(a|b|c)', '(a)(b)?', '((a)(b))', '((a))((b))', '(((((((((((a)))))))))))', 'a{1000}', '(?:(?:(?:a)))']) add(p);
// empty matches and splitting / replacement semantics
for (const p of ['x*', 'a*', 'a*?', '\\b', '\\B', '(?=a)', '(?<=a)', '(?!a)', '^', '$', '(?m)^', '(?m)$', '', '|', 'a|', '|a', '\\s*', '\\s+', '\\s', ',', ';', ' ', ' +', '[,;]', '\\.', '\\|', '\\R', '\\n', 'ab', '(?<=\\d)(?=\\D)', '(?<=\\D)(?=\\d)', '(?<=[a-z])(?=[A-Z])', '(?<=a)b?', '(?=b)', '(?=\\p{Lu})', '(?<!^)(?=[A-Z])']) add(p, 0, [',', 'a,b', 'a,b,,', ',a', ',,', 'a,b;c', 'a b  c', ' a b ', '1a2B3c', 'abAbC', 'a' + U(0x1f600) + 'b', U(0x1f600) + U(0x1f600), '𐀀x', 'x\ud800', 'aXbXc', 'a\nb\r\nc\n\n', 'camelCaseWord']);
// replacement syntax
const repls = ['<$0>', '[$1]', '$1$1', '${n}', '${m}/${y}', '${x}', '$2', '$3', '$10', '$11', '$0$0', '$', 'a$', '\\', 'a\\', '\\$1', '\\\\', '\\n', '$a', '$-1', '$1a', '${', '${}', '${1}', '$&', '$`', "$'", '', 'ä', U(0x1f600), '\\u0041', '$$', '\\$', '$0\\$0'];
for (const p of ['(b)', 'b', '(?<n>b)', '(?<y>\\d{4})-(?<m>\\d\\d)', '(a)(b)?', '(a)|(b)', '(\\d)(\\d)(\\d)(\\d)(\\d)(\\d)(\\d)(\\d)(\\d)(\\d)(\\d)', 'x*', '', '^', '$', '\\b']) add(p, 0, ['abc', 'b', 'abab', '2026-03', '2026-03 1999-12', 'ab', 'a', 'xyz', '12345678901', '\n', 'abc\n'], repls);
// harvest-typical shapes
for (const p of ['.*', '.*\\d.*', '(.*)[\\d@](.*)', '.*foo', 'foo.*', '.*foo.*', '(?i)foo.*', 'foo|bar|baz', '(foo|bar)s?', '\\p{P}', '\\p{Punct}', "'s|per|\\p{P}", '[\\p{L}\\p{Nd}_\\-.]+[@_][\\p{L}\\p{Nd}_\\-.]+', '\\0', '[A-Z][A-Z]\\p{javaLowerCase}+', '^[^\\p{script=latin}]+$', '^[^\\p{L}]+$', '(\\p{Lu}\\p{Ll}+)\\s+(\\p{Lu}\\p{Ll}+)', '(?<!\\p{L})[a-z]{1,2}(?!\\p{L})', '\\b(\\w+)\\s+\\1\\b', '(?i)\\b(\\w+)\\s+\\1\\b', '(?iu)\\b(\\w+)\\s+\\1\\b', '(?U)\\b(\\w+)\\s+\\1\\b', '(?-i)(?!Artur(?:[\\s  ]+)Avila\\b)(?i)\\bArth?ur(?:[\\s  ]+)Avv?ill?a?\\b', '(?:[\\s  ]+)', '[\\s  ]+', '((\\-)?[0-9]{0,10}[0-9.,]{0,10})(?:[\\s  ]+)(°)(?!\\s*[CFKSN])']) add(p, 0, ['Arthur Avila', 'Artur Avila', 'Arthur Avvilla', 'foo bar bar', 'Foo Bar', 'user@exämple.de', 'a1@b2', 'ABc', '5 °C', '5 °F', '-3,5 °', 'x.y', 'foos', 'BAR']);
// StringMatcher-style token patterns under the LT token flags
for (const p of ['Haus', 'haus', 'Häuser|Haus', 'ge.*t', '.*ung', 'a.c', '[A-Z][a-z]+', '\\d+', '(?i)abc', 'Ä.*', 'straße|strasse', 'ǅ', 'ı', 'İ.*', 'i̇', 'ß', 'ss', 'SS', 'K', 'Ω', 'ω', 'Σ.*', 'σ|ς']) { add(p, F.I | F.UC); add(p, 0); }

for (let i = 0, k = 0; i < SYN.length; i += 120, k++) {
  const reqs = [];
  for (const s of SYN.slice(i, i + 120)) {
    const w = 40; const off = fnv(s.pattern + s.flags) % S.length; const base = Array.from({ length: w }, (_, j) => S[(off + j) % S.length]); const inputs = uniq([...base, ...s.extra, '', 'a', 'ä']);
    if (s.repls) {
      reqs.push({ pattern: s.pattern, flags: s.flags, inputs: s.extra, limits: [0, -1, 2] });
      for (const r of s.repls) reqs.push({ pattern: s.pattern, flags: s.flags, inputs: s.extra, replacement: r, ops: ['replaceAll', 'replaceFirst'] });
    } else reqs.push({ pattern: s.pattern, flags: s.flags, inputs, limits: [0, -1] });
  }
  write(`synthetic-${String(k).padStart(2, '0')}`, 'hand-picked constructs from SEMANTICS S2: all ops, 100+ inputs', reqs);
}
console.log(JSON.stringify({ patterns: pats.length, shallowCases: nShallow, deepPatterns: deep.length, deepCases: nDeep, syntheticPatterns: SYN.length, syntheticCases: Math.ceil(SYN.length / 120) }));
