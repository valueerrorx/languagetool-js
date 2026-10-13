// Authors oracle/cases/X-PROBE-STRINGS/*.json (inputs only).
import { T, writeCases } from './gen-probe-cases-numbers.mjs';

const o = (args) => ({ op: 'probe-strings', args });
const cases = [];
const U = (...cps) => String.fromCodePoint(...cps);

const trimIn = ['', ' ', '   ', ' a ', 'a', '\u0000a\u0001', '\u0001', ' a ', ' ', ' a ', '﻿a', ' \t\n\r\u000b\u000c a \u001f', '\u001fa ', '\u0085a\u0085', '​a​', 'a　', '　a', ' a', ' a ', ' a', ' a', '\u001c\u001d\u001e\u001fa', 'a b', ' ä ', 'x\u0000', '\u0000', '\u007f', ' \u007fa\u007f '];
cases.push(['trim-strip', 'trim (<= U+0020) vs strip/isBlank (Character.isWhitespace) vs isEmpty', ['trim', 'strip', 'stripLeading', 'stripTrailing', 'isBlank', 'isEmpty'].flatMap((fn) => trimIn.map((s) => o({ fn, s })))]);

const rep = [
  ['line # comment', '#.*', ''], ['a.b.c', '.', '-'], ['abc', '', '-'], ['', '', '-'], ['aaa', 'a', 'aa'], ['aaa', 'aa', 'b'], ['a$b', '$', '€'], ['a\\b', '\\', '/'], ['x.*y', '.*', '?'], ['ä ö ü', 'ö', 'oe'], ['😀a😀', '😀', 'x'], ['abc', 'abc', ''], ['abc', 'x', 'y'], ['abc', 'b', null],
];
cases.push(['replace-literal', 'String.replace(CharSequence): literal, all occurrences, empty target, null replacement', [
  ...rep.map(([s, t, u]) => o({ fn: 'replace', s, t, u })),
  ...[['banana', 'a', 'o'], ['a.b', '.', '-'], ['', 'a', 'b'], ['ß', 'ß', 'S'], ['ab', 'a', '\ud800']].map(([s, t, u]) => o({ fn: 'replaceChar', s, t, u })),
]]);
const rx = [
  ['line # comment', '#.*', ''], ['a.b.c', '.', 'x'], ['abc', '', '-'], ['', '', '-'], ['aaa', 'a*', 'X'], ['abc', 'b*', 'X'], ['abc', '(b)', '[$1]'], ['abc', '(b)', '[$0]'], ['abc', '(b)', '[$2]'], ['abc', '(b)', '[$11]'], ['abc', '(b)', '$'], ['abc', '(b)', '\\'], ['abc', '(b)', '\\$1'], ['abc', '(b)', '\\\\'], ['abc', '(b)', '\\n'],
  ['abc', '(?<n>b)', '[${n}]'], ['abc', '(?<n>b)', '[${x}]'], ['abc', '(?<n>b)', '[${n']
  , ['abc', '(b)', '$a'], ['abc', '(b)', '${1}'], ['a1b22', '(\\d+)', '<$1>'], ['abc', '(', 'x'], ['abc', '[a-', 'x'], ['abc', '*', 'x'], ['aBc', '(?i)b', 'x'], ['a b  c', '\\s+', ' '], ['ÄÖÜ', '\\p{Lu}', 'u'], ['äöü', '\\w', 'w'], ['äöü', '(?U)\\w', 'w'], ['ab\nc', '.', 'x'], ['ab\nc', '(?s).', 'x'], ['a b', '.', 'x'], ['a\u0085b', '.', 'x'], ['😀', '.', 'x'], ['a,b', '[,;]', '\\\\$0'],
  ['ab', 'a|', 'X'], ['x.y', '\\.', '\\.'], ['abc', 'b', '$0$0'], ['tab\there', '\\t', '    '], ['abab', '(ab)+', '$1'], ['abc', '(a)(b)(c)', '$3$2$1'], ['abc', '^', '>'], ['abc', '$', '<'], ['a\nb', '$', '<'], ['a\n', '$', '<'], ['abc', '\\b', '|'], ['über', '\\b', '|'], ['über', '(?U)\\b', '|'],
];
cases.push(['replaceAll-regex', 'replaceAll/replaceFirst/matches: regex + replacement syntax ($n, \\, named groups), PatternSyntaxException', [
  ...rx.map(([s, t, u]) => o({ fn: 'replaceAll', s, t, u })), ...rx.map(([s, t, u]) => o({ fn: 'replaceFirst', s, t, u })),
  ...[['abc', 'abc'], ['abc', 'ab'], ['abc', 'b'], ['abc', '.*'], ['', '.*'], ['a\nb', '.*'], ['a\nb', '(?s).*'], ['abc', 'ABC'], ['abc', '(?i)ABC'], ['abc', 'a.c'], ['äöü', '\\p{L}+'], ['äöü', '[a-z]+'], ['ab', 'a|ab'], ['ab', '(a|ab)'], ['a', '['], ['x', null]].map(([s, t]) => o({ fn: 'matches', s, t })),
  ...['a.b', '', '\\E', '\\Q', 'a\\Eb', '$1'].map((s) => o({ fn: 'quote', s })), ...['a$b', '\\', '$1\\1', ''].map((s) => o({ fn: 'quoteReplacement', s })),
]]);
const sp = [['', ','], ['a,,b', ','], ['a,b,,', ','], [',', ','], [',a', ','], ['abc', ''], ['', ''], ['a b  c', ' '], ['a b  c', ' +'], [' a', ' '], ['  a', ' '], ['  a', ' +'], ['a1b2c3', '\\d'], ['a1b2c3', '(?<=\\d)'], ['abc', '(?=b)'], ['abc', 'b'], ['a.b', '.'], ['a.b', '\\.'], ['a|b', '|'], ['a|b', '\\|'], ['a\nb\r\nc', '\\R'], ['a\nb\r\nc\n\n', '\n'], ['😀😀', ''], ['a😀b', ''], ['ab', '(?<=a)'], ['aXXb', 'X'], ['aXXb', 'XX'], ['a,b;c', '[,;]'], ['a:b', ':'], ['a::b', '::'], [':', ':'], ['::', ':'], ['a', 'a'], ['aa', 'a'], ['abc', 'abc'], ['ä,ö', ','], ['a b', ' '], ['ab', '^'], ['ab', '$'], ['a b', '\\s*'], ['abc', '$|b'], ['x', '(']];
cases.push(['split', 'String.split(regex[, limit]) edge cases: trailing empties, leading empty, zero-width, fast path chars', [
  ...sp.map(([s, t]) => o({ fn: 'split', s, t })),
  ...sp.flatMap(([s, t]) => [-1, 1, 2, 3].map((limit) => o({ fn: 'split', s, t, limit }))),
  o({ fn: 'split', s: 'a,b', t: ',', limit: 0 }), o({ fn: 'split', s: 'a,b,,', t: ',', limit: 0 }),
]]);

const cmpPairs = [['a', 'b'], ['b', 'a'], ['a', 'a'], ['a', 'A'], ['A', 'a'], ['', ''], ['', 'a'], ['a', ''], ['abc', 'abd'], ['abc', 'ab'], ['ab', 'abc'], ['ä', 'z'], ['ä', 'a'], ['ß', 'ss'], ['ß', 'SS'], ['Ä', 'ä'], ['～', U(0x1f600)], [U(0x1f600), '￿'], [U(0x10000), '\ud800'], ['\ud800', '\ud800'], ['\ud800', '\udc00'], ['Z', 'a'], ['a', '_'], ['10', '9'], ['abc', 'ABC'], ['i', 'İ'], ['ı', 'I'], ['i', 'I'], ['K', 'k'], ['K', 'K'], ['ſ', 's'], ['ſ', 'S'], ['σ', 'ς'], ['σ', 'Σ'], ['ς', 'Σ'], ['ǅ', 'Ǆ'], ['ǅ', 'ǆ'], [U(0x10428), U(0x10400)], [U(0x10428), U(0x10400, 0x41)], ['SS', 'ß'], ['ǆ', 'Ǆ'], ['é', 'é'], ['é', 'é'], ['ẞ', 'ß'], ['ẞ', 'SS'], ['straße', 'STRASSE'], ['ΣΣ', 'σς'], ['ǅ', 'ǆ'], ['µ', 'μ'], ['µ', 'Μ'], ['ι', 'ι'], ['ι', 'Ι'], ['Ä', 'ä'], ['Ä', 'Ae']];
cases.push(['compare-equalsIgnoreCase', 'compareTo (code units), compareToIgnoreCase, equalsIgnoreCase, equals, CASE_INSENSITIVE_ORDER', [
  ...['compareTo', 'compareToIgnoreCase', 'equalsIgnoreCase', 'equals', 'caseInsensitiveOrder', 'contentEquals'].flatMap((fn) => cmpPairs.map(([s, t]) => o({ fn, s, t }))),
  o({ fn: 'compareTo', s: 'a', t: null }), o({ fn: 'equalsIgnoreCase', s: 'a', t: null }), o({ fn: 'equals', s: 'a', t: null }), o({ fn: 'compareToIgnoreCase', s: 'a', t: null }),
]]);
const rm = [];
for (const ic of [true, false]) for (const [s, t, off, ooff, len] of [['Hello', 'hELLO', 0, 0, 5], ['Hello', 'hELLO', 1, 1, 4], ['Hello', 'LL', 2, 0, 2], ['Hello', 'LL', -1, 0, 2], ['Hello', 'LL', 0, -1, 2], ['Hello', 'LL', 4, 0, 2], ['Hello', 'LL', 2, 0, 0], ['Hello', 'LL', 2, 0, -1], ['Hello', 'LL', 5, 0, 0], ['Hello', 'LL', 6, 0, 0], ['Straße', 'STRASSE', 0, 0, 6], ['İ', 'i', 0, 0, 1], ['K', 'k', 0, 0, 1], [U(0x10428), U(0x10400), 0, 0, 2], [U(0x10428) + 'x', U(0x10400) + 'X', 0, 0, 3], [U(0x10428), U(0x10400), 0, 0, 1], ['äöü', 'ÄÖÜ', 0, 0, 3], ['σ', 'ς', 0, 0, 1], ['ı', 'I', 0, 0, 1], ['ſ', 'S', 0, 0, 1], ['ǅ', 'Ǆ', 0, 0, 1]]) rm.push(o({ fn: 'regionMatches', s, t, ic, off, ooff, len }));
cases.push(['regionMatches', 'regionMatches(ignoreCase,...) incl. bounds, surrogates, special case folding', rm]);

const hs = ['', 'a', 'abc', 'Hello, World!', 'ä', 'äöüß', 'ÄÖÜ', U(0x1f600), '\ud800', 'The quick brown fox jumps over the lazy dog', 'x'.repeat(1000), 'polygenelubricants', 'Aa', 'BB', 'AaAa', 'BBBB', 'AaBB', 'zzzzzzzz', 'ffffffff', 'hello world', '0', '1', '10', '-1', 'true', 'null', 'de', 'de-AT', 'en-US', 'ro-RO', 'ONE_WORD', 'a'.repeat(31), '\u0000', 'ÿ', 'Ā', 'ǅ', '일본어', 'Привет'];
cases.push(['hash-string', 'String.hashCode', [...hs.map((s) => o({ fn: 'hashCode', s })), o({ fn: 'hashCodes', list: hs })]]);
const S = (v) => v; const I = (v) => T('int', v);
cases.push(['hash-objects', 'Objects.hash / Arrays.hashCode / List/Set/Map hashCode with mixed types and null', [
  o({ fn: 'objectsHash', args: [] }), o({ fn: 'objectsHash', args: ['a'] }), o({ fn: 'objectsHash', args: ['a', 'b'] }), o({ fn: 'objectsHash', args: ['a', null] }), o({ fn: 'objectsHash', args: [null] }), o({ fn: 'objectsHash', args: [null, null] }), o({ fn: 'objectsHash', args: ['b', 'a'] }),
  o({ fn: 'objectsHash', args: [I(1), I(2), I(3)] }), o({ fn: 'objectsHash', args: [I(1), 'x', T('long', '4294967296'), T('double', '1.5'), T('bool', 'true'), T('char', 'c')] }), o({ fn: 'objectsHash', args: [T('long', '9223372036854775807')] }), o({ fn: 'objectsHash', args: [T('double', '-0.0')] }), o({ fn: 'objectsHash', args: [T('double', 'NaN'), T('float', '1.5')] }), o({ fn: 'objectsHash', args: ['äöü', U(0x1f600)] }),
  o({ fn: 'objectsHash', args: [T('bool', 'false'), T('bool', 'true')] }), o({ fn: 'objectsHash', args: [T('short', '5'), T('byte', '-1')] }),
  o({ fn: 'arraysHashCode', args: [] }), o({ fn: 'arraysHashCode', args: ['a', 'b'] }), o({ fn: 'arraysHashCode', args: [I(1), I(2)] }), o({ fn: 'arraysHashCode', args: [null, 'a'] }),
  o({ fn: 'listHashCode', args: [] }), o({ fn: 'listHashCode', args: ['a', 'b', 'c'] }), o({ fn: 'listHashCode', args: ['a', null] }), o({ fn: 'listHashCode', args: [I(1), I(2), I(3)] }),
  o({ fn: 'setHashCode', args: [] }), o({ fn: 'setHashCode', args: ['a', 'b', 'c'] }), o({ fn: 'setHashCode', args: ['c', 'b', 'a', 'a'] }), o({ fn: 'setHashCode', args: ['a', null] }),
  o({ fn: 'mapHashCode', pairs: [] }), o({ fn: 'mapHashCode', pairs: ['a', 'b'] }), o({ fn: 'mapHashCode', pairs: ['a', null] }), o({ fn: 'mapHashCode', pairs: ['k1', 'v1', 'k2', 'v2'] }),
  o({ fn: 'boxedHash', v: I('42') }), o({ fn: 'boxedHash', v: 'abc' }), o({ fn: 'boxedHash', v: T('char', 'a') }), o({ fn: 'boxedHash', v: T('bool', 'true') }), o({ fn: 'boxedHash', v: T('bool', 'false') }),
]]);

const caseIn = ['i', 'I', 'İ', 'ı', 'iIİı', 'ß', 'Straße', 'ẞ', 'ŉ', 'ǰ', 'ΐ', 'Σ', 'ΑΣ', 'ΑΣ Α', 'ΣΣ', 'aΣ', 'Σa', 'ﬁ', 'ﬃ', 'ǅ', 'Ǆǅǆ', 'ÄÖÜ äöü', 'ǰ', 'ΐ', 'ᾀ', 'ᾳ', 'և', 'i̇', 'İ', 'Ì', 'abİ', 'TITLE', 'title', 'Mixed Case ÄÖ', '', U(0x10428), U(0x10400), 'ͅ', 'ᾈ', 'Ⅰ', 'Ⓐ', 'Ａ', 'ÀÉÎÕÜ', 'ÿ', 'Ÿ', 'µ', 'ſ', 'K', 'Ω', 'İ', 'İstanbul', 'ISTANBUL', 'ı', 'i̇', 'DİYARBAKIR', 'ΌΣΟΣ', 'ὈΔΥΣΣΕΎΣ', 'ß ẞ', 'µÿ'];
const locs = ['default', 'ROOT', 'en', 'en-US', 'tr', 'tr-TR', 'az', 'lt', 'de', 'de-AT', 'fr', 'el', 'nl'];
cases.push(['case-mapping-default', 'toUpperCase()/toLowerCase() with default locale (en_US) and ROOT', ['toUpperCase', 'toLowerCase'].flatMap((fn) => caseIn.flatMap((s) => [o({ fn, s }), o({ fn, s, locale: 'ROOT' })]))]);
cases.push(['case-mapping-locales', 'toUpperCase/toLowerCase(Locale): tr, az, lt special rules', ['toUpperCase', 'toLowerCase'].flatMap((fn) => caseIn.flatMap((s) => locs.filter((l) => !['default', 'ROOT'].includes(l)).map((locale) => o({ fn, s, locale }))))]);
const cps = [...Array(128).keys()].concat([0x85, 0xa0, 0xa1, 0xaa, 0xad, 0xb2, 0xb5, 0xba, 0xbc, 0xc0, 0xd7, 0xdf, 0xe4, 0xf7, 0xff, 0x100, 0x130, 0x131, 0x149, 0x17f, 0x1c4, 0x1c5, 0x1c6, 0x1f0, 0x2b0, 0x2c6, 0x345, 0x370, 0x37a, 0x386, 0x390, 0x3a3, 0x3c2, 0x3c3, 0x3d0, 0x587, 0x5d0, 0x61c, 0x660, 0x66b, 0x6f0, 0x966, 0x9e6, 0xe50, 0x1680, 0x180e, 0x1c5, 0x1e9e, 0x1f88, 0x1fbe, 0x2000, 0x2003, 0x2007, 0x200a, 0x200b, 0x200c, 0x200d, 0x200e, 0x2010, 0x2013, 0x2018, 0x2028, 0x2029, 0x202a, 0x202f, 0x205f, 0x2060, 0x2070, 0x2126, 0x212a, 0x2160, 0x2170, 0x2460, 0x24b6, 0x24d0, 0x2c60, 0x3000, 0x3007, 0x3042, 0x30a2, 0x4e00, 0xa7c0, 0xac00, 0xd7ff, 0xd800, 0xdb7f, 0xdbff, 0xdc00, 0xdfff, 0xe000, 0xf8ff, 0xfb01, 0xfeff, 0xff10, 0xff21, 0xff41, 0xff66, 0xfffd, 0xfffe, 0xffff, 0x10000, 0x10400, 0x10428, 0x1d400, 0x1d7d8, 0x1f600, 0x1f1e6, 0x20000, 0xe0001, 0xe0100, 0xf0000, 0x10ffff, 0x378, 0x20c0, 0x1f6dd, 0x1f6dc, 0x1faa9, 0x1fa75, 0x1e4d0, 0x31350, 0x2b739, 0x2b73a, 0x870, 0x1fad7, 0x1fb70, 0x1fbf0, 0x10fb0, 0x16fe4, 0x18d00, 0x1e100, 0x11a50, 0x11b00, 0x1b150, 0x1ccd6, 0x1ac0, 0x1df00, 0x0c3c, 0x1c80, 0xa7f2]);
cases.push(['char-info', 'Character predicates/types/scripts for ~270 code points incl. post-Unicode-13 additions (P1)', cps.map((cp) => o({ fn: 'charInfo', cp }))]);
cases.push(['char-case', 'Character.toUpperCase/toLowerCase/toTitleCase(int|char) vs String mapping', cps.filter((c) => c < 0x3000 || c > 0xfb00).map((cp) => o({ fn: 'charCase', cp }))]);

const idx = [];
for (const [s, b, e] of [['hello', 0, 5], ['hello', 1, 3], ['hello', 5, 5], ['hello', 2, 1], ['hello', -1, 3], ['hello', 0, 6], ['hello', 6, 6], ['hello', 3, 100], ['', 0, 0], ['', 0, 1], ['', 1, 1], [U(0x1f600) + 'a', 0, 1], [U(0x1f600) + 'a', 1, 3], [U(0x1f600) + 'a', 1, 2]]) idx.push(o({ fn: 'substring', s, b, e }), o({ fn: 'subSequence', s, b, e }));
for (const [s, b] of [['hello', 0], ['hello', 5], ['hello', 6], ['hello', -1], ['', 0], ['', 1]]) idx.push(o({ fn: 'substring', s, b }));
for (const [s, i] of [['hello', 0], ['hello', 4], ['hello', 5], ['hello', -1], ['', 0], [U(0x1f600), 0], [U(0x1f600), 1], [U(0x1f600), 2]]) idx.push(o({ fn: 'charAt', s, i }), o({ fn: 'codePointAt', s, i }), o({ fn: 'codePointBefore', s, i }));
cases.push(['index-errors', 'charAt/substring/codePointAt bounds and StringIndexOutOfBoundsException messages (JDK 17)', idx]);

const cpS = ['', 'abc', U(0x1f600), U(0x1f600) + 'a' + U(0x1f601), '\ud800', '\udc00', '\ud800a', 'a\udc00', '\udc00\ud800', 'äöü', 'é', U(0x10400, 0x10428), '\ud83d' + '\ude00' + '\ud83d', '👨‍👩‍👧', '🇦🇹', '\u0000'];
cases.push(['codepoints', 'length / codePointCount / codePoints / chars / offsetByCodePoints on surrogates', [
  ...cpS.flatMap((s) => [o({ fn: 'length', s }), o({ fn: 'codePoints', s }), o({ fn: 'chars', s })]),
  ...[[U(0x1f600) + 'ab', 0, 1], [U(0x1f600) + 'ab', 0, 2], [U(0x1f600) + 'ab', 0, 3], [U(0x1f600) + 'ab', 0, 4], [U(0x1f600) + 'ab', 1, 1], [U(0x1f600) + 'ab', 4, -1], [U(0x1f600) + 'ab', 4, -3], [U(0x1f600) + 'ab', 4, -4], ['\ud800\ud800', 0, 1], ['abc', 0, 0], ['abc', 3, 0], ['abc', 4, 0]].map(([s, i, n]) => o({ fn: 'offsetByCodePoints', s, i, n })),
]]);
const ix = [['banana', 'an'], ['banana', 'na'], ['banana', ''], ['banana', 'x'], ['', ''], ['', 'a'], ['banana', 'a', 2], ['banana', 'a', -5], ['banana', 'a', 100], ['banana', '', 3], ['banana', '', 100], ['äöüß', 'ü'], [U(0x1f600) + 'a', U(0x1f600)], [U(0x1f600) + 'a', '\ud83d'], [U(0x1f600) + 'a', '\ude00'], ['ABC', 'abc'], ['abc', 'abcd']];
cases.push(['search', 'indexOf/lastIndexOf/contains/startsWith/endsWith/concat/repeat/join/lines', [
  ...ix.flatMap(([s, t, from]) => ['indexOf', 'lastIndexOf'].map((fn) => o({ fn, s, t, ...(from === undefined ? {} : { from }) }))),
  ...ix.map(([s, t]) => o({ fn: 'contains', s, t })), ...ix.map(([s, t, off]) => o({ fn: 'startsWith', s, t, ...(off === undefined ? {} : { off }) })), ...ix.map(([s, t]) => o({ fn: 'endsWith', s, t })),
  ...[97, 0xe4, 0x1f600, 0x10ffff, 0x110000, -1, 0xd800].map((ch) => o({ fn: 'indexOfChar', s: 'xaä' + U(0x1f600), ch })),
  o({ fn: 'indexOf', s: 'a', t: null }), o({ fn: 'contains', s: 'a', t: null }), o({ fn: 'concat', s: 'a', t: 'b' }), o({ fn: 'concat', s: 'a', t: null }),
  ...[0, 1, 3, -1].map((n) => o({ fn: 'repeat', s: 'ab', n })), o({ fn: 'repeat', s: '', n: 5 }),
  o({ fn: 'join', s: ', ', list: [] }), o({ fn: 'join', s: ', ', list: ['a'] }), o({ fn: 'join', s: ', ', list: ['a', null, 'c'] }), o({ fn: 'join', s: '', list: ['a', 'b'] }),
  ...['a\nb', 'a\r\nb', 'a\rb', 'a\n\nb', 'a\n', '\n', '', 'a b', 'a\u0085b', 'a\u000bb', 'a\u000cb', 'a\r\n\r\nb\r'].map((s) => o({ fn: 'lines', s })),
  o({ fn: 'valueOfNull', s: '' }),
]]);
cases.push(['stringbuilder', 'StringBuilder append/insert/delete/replace/reverse/setLength with bounds errors and surrogates', [
  o({ fn: 'sb', s: 'hello', ops: [['append', ' world'], ['appendNull'], ['appendChar', 65], ['appendInt', -5], ['appendDouble', '1.0E10'], ['appendDouble', '100.0'], ['appendFloat', '0.1'], ['appendFloat', '1.0E-4'], ['appendCodePoint', 0x1f600], ['appendCodePoint', 0x110000], ['appendCodePoint', 0xd800], ['length']] }),
  o({ fn: 'sb', s: 'hello', ops: [['insert', 0, 'X'], ['insert', 6, 'Y'], ['insert', 8, 'Z'], ['insert', -1, 'Z'], ['insert', 3, '']] }),
  o({ fn: 'sb', s: 'hello', ops: [['delete', 1, 3], ['delete', 0, 100], ['delete', 5, 3], ['delete', -1, 2], ['delete', 10, 11], ['delete', 1, 1]] }),
  o({ fn: 'sb', s: 'hello', ops: [['deleteCharAt', 0], ['deleteCharAt', 4], ['deleteCharAt', -1], ['deleteCharAt', 3], ['deleteCharAt', 0], ['deleteCharAt', 0], ['deleteCharAt', 0]] }),
  o({ fn: 'sb', s: 'hello', ops: [['replace', 1, 3, 'XYZ'], ['replace', 0, 100, 'q'], ['replace', 2, 1, 'q'], ['replace', 5, 5, 'e'], ['replace', -1, 0, 'x']] }),
  ...['abc', U(0x1f600) + 'ab', 'a' + U(0x1f600), '\ud800a', 'a\udc00', '\udc00\ud800', U(0x1f600, 0x1f601), 'a𐀀𐀀b', ''].map((s) => o({ fn: 'sb', s, ops: [['reverse']] })),
  o({ fn: 'sb', s: 'hello', ops: [['setLength', 3], ['setLength', 6], ['setLength', 0], ['setLength', -1], ['length']] }),
  o({ fn: 'sb', s: 'hello', ops: [['setCharAt', 0, 72], ['setCharAt', 5, 72], ['setCharAt', -1, 72], ['charAt', 1], ['charAt', 5], ['charAt', -1], ['substring', 1], ['substring', 1, 3], ['substring', 3, 1], ['substring', 0, 6], ['substring', 6], ['indexOf', 'l'], ['indexOf', 'zz']] }),
  o({ fn: 'sb', s: '', ops: [['nope']] }),
]]);
cases.push(['string-tokenizer', 'java.util.StringTokenizer with/without returnDelims, surrogate delimiters', [
  ...[['a b  c', ' '], [' a b ', ' '], ['', ' '], ['   ', ' '], ['a,b;c', ',;'], ['abc', ''], ['a\tb\nc', ' \t\n'], ['hello, world!', ' ,!'], ['a b', '  '], ['a b', ' '], [U(0x1f600) + 'a' + U(0x1f600), U(0x1f600)], ['x\ud83dy', '\ud83d'], ['x😀y', '\ud83d'], ['x😀y', '\ude00'], ['x😀y', '😀'], ['a', 'a'], ['aa', 'a'], ['äöü', 'ö']]
    .flatMap(([s, t]) => [o({ fn: 'tokenizer', s, t }), o({ fn: 'tokenizer', s, t, returnDelims: true })]),
  o({ fn: 'tokenizer', s: null, t: ' ' }), o({ fn: 'tokenizer', s: 'a', t: null }),
]]);
cases.push(['normalize-bytes', 'Normalizer forms, getBytes/new String charsets incl. malformed input and lone surrogates', [
  ...['NFC', 'NFD', 'NFKC', 'NFKD'].flatMap((t) => ['ä', 'ä', 'ﬁ', 'Å', 'Å', 'ẛ̣', 'abc', '', 'Ạ̈', 'Å', 'Ω', 'ϓ'].map((s) => o({ fn: 'normalize', s, t }))),
  o({ fn: 'normalize', s: 'a', t: 'BAD' }),
  ...['UTF-8', 'ISO-8859-1', 'US-ASCII', 'UTF-16', 'UTF-16BE', 'UTF-16LE', 'windows-1252'].flatMap((t) => ['abc', 'äöüß', '€', U(0x1f600), '\ud800', '\ud800a', '\udc00', '﻿', ''].map((s) => o({ fn: 'bytes', s, t }))),
  o({ fn: 'bytes', s: 'a', t: 'NOPE-CS' }),
  ...[['UTF-8', [97, 195, 164]], ['UTF-8', [195]], ['UTF-8', [195, 40]], ['UTF-8', [255, 254]], ['UTF-8', [237, 160, 128]], ['UTF-8', [240, 159, 152]], ['UTF-8', [240, 159, 152, 128]], ['UTF-8', [192, 128]], ['UTF-8', [239, 187, 191, 97]], ['UTF-8', [244, 144, 128, 128]], ['UTF-8', [226, 130]], ['UTF-8', [226, 130, 97]], ['ISO-8859-1', [228, 246, 252]], ['US-ASCII', [97, 228]], ['UTF-16', [254, 255, 0, 97]], ['UTF-16', [255, 254, 97, 0]], ['UTF-16', [0, 97]], ['UTF-16BE', [216, 0, 0, 97]], ['UTF-16LE', [97]], ['windows-1252', [128, 129, 150]]].map(([t, bytes]) => o({ fn: 'fromBytes', t, bytes })),
]]);
writeCases('X-PROBE-STRINGS', cases);
console.log(`X-PROBE-STRINGS: ${cases.length} case files`);
