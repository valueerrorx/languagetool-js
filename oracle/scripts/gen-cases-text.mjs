// Authors oracle/cases/X-TEXT/*.json (inputs only). Ops annotated-text / string-tools / context-tools / analyzed-token: docs/review/F09-oracle.md.
import { writeCases } from './gen-probe-cases-numbers.mjs';

const chunks = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, (i + 1) * n));
const cases = [];

// ---------- annotated-text ----------
const T = (v) => ({ t: 'text', v });
const M = (v, interpretAs) => (interpretAs === undefined ? { t: 'markup', v } : { t: 'markup', v, interpretAs });
const AT = (name, parts, extra = {}) => ({ name, op: { op: 'annotated-text', args: { parts, ...extra } } });
const SHY = '­', LRO = '‭', PDF = '‬';
const at = [
  AT('empty', []), AT('plain', [T('This is a test.')]), AT('plain-empty-text', [T('')]), AT('plain-two', [T('abc'), T('def')]),
  AT('markup-only', [M('<b>')]), AT('markup-only-interpret', [M('<p>', '\n\n')]), AT('markup-start', [M('<b>'), T('bold text')]),
  AT('markup-end', [T('bold text'), M('</b>')]), AT('markup-both', [M('<p>'), T('Hello'), M('</p>')]),
  AT('basic', [T('Here is '), M('<b>'), T('some text'), M('</b>')]),
  AT('adjacent-markups', [T('a'), M('<i>'), M('<b>'), T('bc'), M('</b>'), M('</i>'), T('d')]),
  AT('adjacent-text-markup-text', [T('x'), M('<br/>'), T('y'), M('<br/>'), T('z')]),
  AT('interpret-newlines', [T('First'), M('<p>', '\n\n'), T('Second'), M('<br>', '\n'), T('Third')]),
  AT('interpret-start', [M('<p>', '\n\n'), T('Text')]), AT('interpret-end', [T('Text'), M('</p>', '\n\n')]),
  AT('interpret-adjacent', [T('a'), M('<p>', '\n\n'), M('<p>', '\n\n'), T('b')]),
  AT('interpret-empty', [T('a'), M('<x>', ''), T('b')]), AT('interpret-empty-start', [M('<x>', ''), T('b')]),
  AT('interpret-long-markup', [T('a'), M('<span class="very-long-attribute-name" style="color: red">', ' '), T('b')]),
  AT('interpret-shorter', [T('One'), M('<div>', ' '), T('Two'), M('</div>', ' ')]),
  AT('interpret-longer-than-markup', [T('A'), M('<p>', 'xxxxxxxxxx'), T('B')]),
  AT('interpret-then-text-then-interpret', [M('<h1>', '\n'), T('Title'), M('</h1>', '\n\n'), T('Body '), M('<b>'), T('bold'), M('</b>'), T('.')]),
  AT('interpret-no-text-between', [T('a'), M('<p>', '\n'), M('</p>', '\n'), T('b')]),
  AT('markup-markup-interpret', [T('a'), M('<i>'), M('<p>', '\n\n'), T('b')]),
  AT('surrogate-text', [T('a😀b'), M('<b>'), T('𝒜𝒷'), M('</b>')]),
  AT('surrogate-markup', [T('x'), M('<😀>'), T('y')]), AT('surrogate-interpret', [T('x'), M('<e>', '😀'), T('y')]),
  AT('lone-surrogate', [T('a\uD800b'), M('<x>'), T('\uDC00c')]),
  AT('crlf', [T('line1\r\nline2'), M('<br>', '\r\n'), T('line3\r\n')]), AT('crlf-only', [T('\r\n')]), AT('cr-lf-separate', [T('a\r'), M('<x>'), T('\nb')]),
  AT('umlauts', [T('Käse '), M('<b>'), T('Übergrößen'), M('</b>'), T(' ß ẞ')]),
  AT('nbsp-zwsp', [T('a b​c'), M('&nbsp;', ' '), T('d')]),
  AT('hidden-shy', [T(`ab${SHY}cd`)]), AT('hidden-lro-pdf', [T(`${LRO}abc${PDF}`)]), AT('hidden-only', [T(SHY)]), AT('hidden-adjacent', [T(`${SHY}${SHY}x${PDF}${LRO}`)]),
  AT('hidden-with-markup', [T(`a${SHY}b`), M('<i>'), T(`c${LRO}d${PDF}`)]), AT('hidden-start-end', [T(`${SHY}abc${SHY}`)]),
  AT('hidden-with-interpret', [T(`a${SHY}`), M('<p>', '\n'), T(`${SHY}b`)]),
  AT('text-with-angle', [T('1 < 2 > 0'), M('<b>'), T('&amp;')]),
  AT('long-text', Array.from({ length: 40 }, (_, i) => (i % 2 ? M(`<span id="s${i}">`) : T(`Sentence number ${i}. `)))),
  AT('long-interpret', Array.from({ length: 30 }, (_, i) => [T(`Para ${i}`), M('<p>', '\n\n')]).flat()),
  AT('long-single', [T('x'.repeat(10000)), M('<b>'), T('y'.repeat(5000))]),
  AT('many-small', Array.from({ length: 200 }, (_, i) => (i % 3 === 0 ? M('<a>') : T(String.fromCharCode(97 + (i % 26)))))),
  AT('add-text-part', [{ t: 'add', type: 'TEXT', v: 'abc' }, { t: 'add', type: 'MARKUP', v: '<b>' }, { t: 'add', type: 'FAKE_CONTENT', v: 'zz' }, { t: 'add', type: 'TEXT', v: 'def' }]),
  AT('add-fake-first', [{ t: 'add', type: 'FAKE_CONTENT', v: 'zz' }, T('abc')]),
  AT('add-markup-fake-pair', [T('ab'), { t: 'add', type: 'MARKUP', v: '<p>' }, { t: 'add', type: 'FAKE_CONTENT', v: '\n\n' }, T('cd')]),
  AT('add-bad-type', [{ t: 'add', type: 'NOPE', v: 'x' }]),
  AT('add-null', [{ t: 'add', type: 'TEXT', v: null }]),
  AT('text-null', [{ t: 'text', v: null }]),
  AT('markup-null', [{ t: 'markup', v: null }]),
  AT('meta-all-keys', [T('x'), { t: 'meta', key: 'DocumentTitle', value: 'My Title' }, { t: 'meta', key: 'EmailToAddress', value: 'a@b.c' }, { t: 'meta', key: 'FullName', value: 'Max Müller' }, { t: 'meta', key: 'EmailNumberOfAttachments', value: '3' }]),
  AT('meta-custom', [T('x'), { t: 'meta', key: 'foo', value: 'bar' }, { t: 'meta', key: 'documenttitle', value: 'lower' }, { t: 'customMeta', key: 'DocumentTitle', value: 'custom-same-name' }], { customKeys: ['foo', 'documenttitle', 'DocumentTitle', 'missing'] }),
  AT('meta-overwrite', [{ t: 'meta', key: 'FullName', value: 'A' }, { t: 'meta', key: 'FullName', value: 'B' }, T('t')]),
  AT('meta-null-value', [{ t: 'meta', key: 'FullName', value: null }, { t: 'customMeta', key: 'k', value: null }, T('t')], { customKeys: ['k'] }),
  AT('meta-unicode', [T('t'), { t: 'customMeta', key: 'schlüssel', value: 'wert 😀' }], { customKeys: ['schlüssel'] }),
  AT('error-small-mapping-negative', [T('abc')], { positions: [-1, -5, -2147483648] }),
  AT('error-beyond', [T('abc'), M('<b>'), T('d')], { positions: [0, 3, 4, 5, 100, 2147483647] }),
  AT('error-map-3-entries', [T('a'), M('<b>'), T('b'), M('<c>'), T('c')], { positions: [3, 4, 9] }),
  AT('error-map-5-entries', [T('a'), M('<b>'), T('b'), M('<c>'), T('c'), M('<d>'), T('d'), M('<e>'), T('e')], { positions: [5, 6] }),
  AT('error-map-hash-order', [T('x'.repeat(17)), M('<b>'), T('y'.repeat(16)), M('<c>', 'zzz'), T('w')], { positions: [40, 41] }),
  AT('error-map-fake', [T('a'), M('<p>', '\n\n'), T('b')], { positions: [10] }),
  AT('markup-only-nothing-mapped', [M('<a>'), M('<b>')], { positions: [0, 1] }),
  AT('only-fake', [{ t: 'add', type: 'FAKE_CONTENT', v: 'zz' }], { positions: [0, 1, 2, 3] }),
  AT('same-pos-text-after-fake', [T('a'), M('<p>', ''), T('')], {}),
  AT('empty-text-between', [T('a'), T(''), M('<b>'), T(''), T('c')]),
  AT('fake-then-empty-text', [T('ab'), M('<p>', '\n'), T(''), T('cd')]),
  AT('first-wins-fake', [T('ab'), M('<i>'), M('<p>', '\n'), M('<q>', '\n'), T('cd')]),
];
cases.push(['annotated-text', 'annotated-text: AnnotatedTextBuilder parts -> plain/markup text, parts, mapping positions 0..len+1 (from/to), metadata', at.map((x) => x.op)]);

// ---------- context-tools ----------
const ML = 'Zeile eins hat einen Fehler.\nZeile zwei ist auch hier.\r\nZeile drei\tmit Tab und <b>HTML</b> & Umlauten: äöüß.\n';
const LONG = 'The quick brown fox jumps over the lazy dog. '.repeat(10);
const ctxCalls = [];
const cx = (text, from, to, o = {}) => ctxCalls.push({ text, from, to, ...o });
for (const t of ['abc', 'This is a test.', 'Hello world', 'one\ntwo\nthree', 'a\r\nb\r\nc', 'tab\there', LONG, ML, '<b>&"\'</b>', 'a b  c', '', 'x', '😀 emoji 😀 text', 'äöü ÄÖÜ ß'])
  for (const [f, to] of [[0, 0], [0, 1], [0, t.length], [Math.floor(t.length / 2), Math.floor(t.length / 2) + 1], [Math.max(0, t.length - 1), t.length], [t.length, t.length], [Math.floor(t.length / 3), Math.floor(t.length / 3) + 2]])
    if (f <= t.length && to <= t.length) cx(t, f, to);
for (const cs of [0, 1, 3, 5, 10, 40, 100, 1000])
  for (const [t, f, to] of [[LONG, 100, 105], [LONG, 0, 3], [LONG, LONG.length - 4, LONG.length], [ML, 20, 28], [ML, 30, 35], [ML, 60, 70], ['short text here', 6, 10]])
    cx(t, f, to, { contextSize: cs });
for (const esc of [true, false])
  for (const [t, f, to] of [['a < b & c > "d"', 2, 3], ['a < b & c > "d"', 0, 15], ['x  y', 1, 3], ['Hello world', 5, 6], ['Hello world', 0, 5], ['<tag> text', 0, 5], ['a\nb', 1, 2], ['a\nb', 0, 3], ["it's \"q\"", 3, 8], ['äöü & ß', 4, 5]])
    for (const mk of [undefined, ['<span class="err">', '</span>'], ['[', ']'], ['', ''], ['<<', '>>']])
      cx(t, f, to, { escapeHtml: esc, ...(mk ? { marker: mk } : {}) });
cx(LONG, 100, 104, { escapeHtml: true, markerStart: '<u>' }); cx(LONG, 100, 104, { escapeHtml: true, markerEnd: '</u>' }); cx(LONG, 100, 104, { markerStart: '<u>', markerEnd: '</u>', contextSize: 7 });
cx(ML, 0, 5, { contextSize: 200 }); cx(ML, 0, 5, { contextSize: 200, escapeHtml: true });
// error cases: bad positions
for (const [t, f, to] of [['abc', -1, 2], ['abc', 2, 1], ['abc', 0, 10], ['abc', 5, 6], ['abc', 1, 1], [null, 0, 1]]) cx(t, f, to);
cx('abc', 0, 1, { contextSize: -1 }); cx('abc', 1, 2, { contextSize: -2 });
cases.push(['context-tools', 'ContextTools.getContext / getPlainTextContext: positions, context sizes, markers, escaping, line breaks, error paths', chunks(ctxCalls, 150).map((c) => ({ op: 'context-tools', args: { calls: c } }))]);

// ---------- string-tools ----------
const S = ['', ' ', '  ', 'a', 'A', 'z', 'Z', '1', '0', '12', '1a', 'a1', 'A1', 'ab', 'AB', 'Ab', 'aB', 'abc', 'ABC', 'Abc', 'aBc', 'abC', 'AbC', 'ABc', 'aBC', 'Hello', 'hello', 'HELLO', 'hELLO', 'HeLLo', 'Hello World', 'hello world', 'HELLO WORLD', 'Hello world', 'hello World',
  'a b', 'A B', 'The Lord Of The Rings', 'the lord of the rings', 'a tale of two cities', 'The  double  space', ' leading', 'trailing ', ' both ', '  both  ', '\tTab', 'Tab\t', 'a\tb', 'a\nb', 'a\r\nb', '\n', '\r', '\r\n', '\n\n', 'a\n\nb', '\n\nx', 'x\n',
  'Äpfel', 'äpfel', 'ÄPFEL', 'Öl', 'öl', 'ÖL', 'Übel', 'übel', 'ÜBEL', 'Straße', 'straße', 'STRASSE', 'STRAẞE', 'ß', 'ẞ', 'ßa', 'ẞa', 'Ssa', 'ǅ', 'ǆ', 'Ǆ', 'ǈ', 'ﬁsh', 'ﬃ', 'FIsh', 'ŉ', 'ΐ',
  'İstanbul', 'istanbul', 'Istanbul', 'ıstanbul', 'İ', 'ı', 'I', 'i', 'IİıiI', 'TITLE', 'title', 'Ώ', 'ώ', 'ΣΑΣ', 'σας', 'Σας', 'ὈΔΥΣΣΕΎΣ', 'οδυσσεύς', 'Ὀδυσσεύς', 'ΑΣ', 'ας', 'Ας', 'ς', 'Σ', 'σ', 'αβγ', 'Αβγ', 'ΑΒΓ', 'αΒΓ',
  'élève', 'Élève', 'ÉLÈVE', 'élÈve', 'œuvre', 'Œuvre', 'ŒUVRE', 'ç', 'Ç', 'ÿ', 'Ÿ', 'ñ', 'Ñ', 'Ø', 'ø', 'þ', 'Þ', 'ÿa', 'ÝÞ',
  "d'accord", "D'accord", "l'homme", "L'Homme", "L’homme", "l’homme", "'quoted'", '"Quoted"', '«Guillemets»', '»Anführung«', '„Anführung“', '(Klammer)', '(klammer)', '[x]', '"hello"', '"Hello"', "'a'", '--x', '-Abc', '-abc', '...Abc', '...abc', '¿Qué?', '¡Hola!', '*Stern', '3D', '3d', '3 D', '4Ever', '4ever',
  'ij', 'IJ', 'Ij', 'iJ', 'ijsselmeer', 'IJsselmeer', 'Ijsselmeer', 'ijs', 'i', 'ij-', 'ï', 'Ïj',
  'hello-world', 'Hello-World', 'Hello-world', 'ABC-def', 'camelCase', 'CamelCase', 'camelCaseWord', 'camelCASE', 'camel', 'aB', 'aBc', 'abcDef', 'abcDefGhi', 'aBCD', 'myURLParser', 'iPhone', 'eBay', 'McDonald', 'macOS', 'äBc', 'ÄBc', 'abcÄ', 'a1B', 'a_B', 'x-Y',
  ' ', 'a b', ' a ', ' ', '​', '​a', 'a​', '​​', ' ', ' ', '　', '﻿', '﻿a', '\u0001', '\u0002', '\u0000', 'a\u0000b', '\u0003', '\u000B', '\u000C', '\u001F', '\u0085', ' ', ' ', ' ', '᠎',
  '­', 'a­b', '‌', '‍', '⁠', '‎', '‏', '‪', '‬', '‭', 'á', 'é', '́', 'ä', 'ö', 'ä', 'über', 'café', 'Café',
  '😀', '😀a', 'a😀', '😀😀', '👍🏽', '👨‍👩‍👧', '❤️', '❤', '©', '®', '™', '€', '$', '£', '¥', '%', '‰', '°', '+', '=', '<', '>', '|', '~', '^', '`', '¬', '±', '×', '÷', '∑', '∞',
  '𝒜', '𝒜bc', 'a𝒜', '𐐨', '𐐀', '𐐀𐐨', '𐐨𐐀', '𝟙', '𝟏𝟐', '𠀀', 'a𠀀b',
  '.', ',', ';', ':', '!', '?', '-', '–', '—', '…', '...', '..', '(', ')', '[', ']', '{', '}', '"', "'", '’', '‘', '“', '”', '„', '«', '»', '‹', '›', '/', '\\', '_', '*', '&', '#', '@', '§', '¿', '¡', '·', '•', '،', '؟', '。', '、', '！', '？',
  '&', '&amp;', '&lt;', '&#39;', '<', '<b>', '</b>', '<b>bold</b>', '<<b>>', '<<b>', '<b>>', '<a href="x">link</a>', '<!-- c -->', 'a<!-- c -->b', '<!-- a --><!-- b -->', '<!-- unclosed', '<!--x-->y<!--z-->', 'x <!-- multi\nline --> y', '<br/>', '<br />', '< b>', '<>', '< >', '<a<b>c', '<\n>', 'a<\nb>c',
  '"quoted" & \'single\' <tag>', 'x > y', 'x < y', 'a&b', 'a & b', '&&', '""', "''", '<![CDATA[x]]>', '<?xml version="1.0"?>', '<tag attr="v">t</tag>', '\u0000<', '€ & £',
  '123', '+123', '-123', '1.5', '1,5', '1 000', '1,000.5', '1.000,5', '.5', '5.', ',5', '1..2', '1.', '   ', '1 2', '12 ', ' 12', '١٢٣', '１２３', '१२३', '²', '½', 'Ⅻ', '1e5', '0x1F', '1_000',
  'Wort', 'Haus', 'Häuser', 'Straßenbahn', 'Donaudampfschifffahrtsgesellschaft', 'E-Mail', 'e-mail', 'U-Bahn', 'u-bahn', 'A-B-C', "O'Neil", "o'neil", 'McDonald’s', 'ǆa', 'ǅa',
  'ٱلْعَرَبِيَّةُ', 'العربية', 'كَتَبَ', 'كتب', 'ـكتابـ', 'ـ', 'שלום', 'שָׁלוֹם', 'Привет', 'привет', 'ПРИВЕТ', 'Ёж', 'ёж', '日本語', 'ひらがな', '한국어', 'ภาษาไทย', 'ខ្មែរ', 'हिन्दी',
  'x'.repeat(300), 'X'.repeat(300), 'Ab'.repeat(300), 'a b '.repeat(100), ' '.repeat(100), '\n'.repeat(50), 'äö'.repeat(400), '<b>'.repeat(200), 'a<!-- c -->'.repeat(50), '&'.repeat(100), ('word '.repeat(60)).trim(), ('Word '.repeat(60)).trim()];
const uniq = [...new Set(S)];
const calls1 = [];
const fns1 = ['isAllUppercase', 'isMixedCase', 'isNotAllLowercase', 'IsAllLowercase', 'isCapitalizedWord', 'startsWithUppercase', 'startsWithLowercase', 'allStartWithLowercase', 'uppercaseFirstChar', 'lowercaseFirstChar', 'lowercaseFirstCharIfCapitalized', 'titlecaseGlobal', 'convertToTitleCaseIteratingChars', 'isCamelCase', 'splitCamelCase',
  'isWhitespace', 'isNonBreakingWhitespace', 'isAllWhitespace', 'trimWhitespace', 'trimSpecialCharacters', 'trimLeadingAndTrailingSpaces', 'containsLineBreak', 'escapeXML', 'escapeForXmlAttribute', 'escapeForXmlContent', 'escapeHTML', 'filterXML', 'isEmpty', 'hasDiacritics', 'removeDiacritics', 'normalizeNFKC', 'normalizeNFC', 'asString',
  'isPunctuationMark', 'isPunctuationOrSymbol', 'isNotWordCharacter', 'isNotWordString', 'makeWrong', 'removeTashkeel', 'isEmoji', 'stringForSpeller', 'splitDigitsAtEnd', 'isNumeric', 'assureSet'];
const byFn = new Map();
for (const fn of fns1) byFn.set(fn, uniq.map((s) => ({ fn, args: fn === 'assureSet' ? [s, 'myVar'] : [s] })));
for (const fn of fns1) cases.push([`string-tools-${fn}`, `StringTools.${fn} over ${uniq.length} strings (ASCII, umlauts, sharp s, Turkish i, Greek sigma, digits, apostrophes, NBSP/zero-width, non-BMP, controls, long)`, chunks(byFn.get(fn), 400).map((c) => ({ op: 'string-tools', args: { calls: c } }))]);
// null and special args
const nul = ['isAllUppercase', 'isMixedCase', 'isNotAllLowercase', 'IsAllLowercase', 'isCapitalizedWord', 'startsWithUppercase', 'startsWithLowercase', 'allStartWithLowercase', 'uppercaseFirstChar', 'lowercaseFirstChar', 'lowercaseFirstCharIfCapitalized', 'titlecaseGlobal', 'convertToTitleCaseIteratingChars', 'isCamelCase', 'splitCamelCase', 'isWhitespace', 'isNonBreakingWhitespace', 'isAllWhitespace', 'trimWhitespace', 'trimSpecialCharacters', 'trimLeadingAndTrailingSpaces', 'containsLineBreak', 'escapeXML', 'escapeForXmlAttribute', 'escapeForXmlContent', 'escapeHTML', 'filterXML', 'isEmpty', 'hasDiacritics', 'removeDiacritics', 'normalizeNFKC', 'normalizeNFC', 'asString', 'isPunctuationMark', 'isPunctuationOrSymbol', 'isNotWordCharacter', 'isNotWordString', 'makeWrong', 'removeTashkeel', 'isEmoji', 'stringForSpeller', 'splitDigitsAtEnd', 'isNumeric', 'assureSet'].map((fn) => ({ fn, args: fn === 'assureSet' ? [null, 'v'] : [null] }));
cases.push(['string-tools-null', 'StringTools single-string functions with null argument (NPE / null passthrough)', [{ op: 'string-tools', args: { calls: nul } }]]);
// lists
const lists = [[], [''], ['A'], ['A', 'B'], ['A', 'b'], ['ABC', 'DEF', 'GHI'], ['ABC', 'Def'], ['a', 'b'], ['Ä', 'Ö', 'Ü'], ['ÄB', 'ö'], ['1', '2'], ['1', 'A'], ['A', null], [null], ['ǅ', 'A'], ['ß'], ['SS', 'ẞ'], ['A', ' '], ['', ''], ['a', 'B'], ['Ab', 'Cd'], ['ab', 'cd', 'ef'], ['ab', 'Cd']];
cases.push(['string-tools-list', 'StringTools isAllUppercase(List) / allStartWithLowercase(String) over lists', [{ op: 'string-tools', args: { calls: lists.flatMap((l) => [{ fn: 'isAllUppercase', args: [l] }]).concat(['a b c', 'a B c', 'A b', 'a', 'a  b', ' a b', 'a b ', 'ä ö ü', 'ä Ö', '1 2', 'a 1', '', ' ', 'a-b c', 'x.y z', '𝒜 b', 'a 😀'].map((s) => ({ fn: 'allStartWithLowercase', args: [s] }))) } }]]);
// two-string functions
const P = [['', ''], ['a', ''], ['', 'a'], ['a', 'a'], ['a', 'b'], ['abc', 'abd'], ['abc', 'xbc'], ['abc', 'axc'], ['stress', 'stresses'], ['stresses', 'stress'], ['abcabc', 'abc'], ['abc', 'abcabc'], ['abab', 'ab'], ['ab', 'abab'], ['aaa', 'aa'], ['aa', 'aaa'], ['Haus', 'Häuser'], ['Häuser', 'Haus'], ['Straße', 'Strasse'], ['hello world', 'hello there world'], ['kitten', 'sitting'], ['x', 'xx'], ['xx', 'x'], ['😀a', '😀b'], ['a😀', 'b😀'], ['😀', '😁'], ['abc', 'ABC'], ['résumé', 'resume'], ['ÀÉ', 'AE'], ['été', 'ete'], ['Café', 'cafe'], ['Café', 'Café'], ['ÄÖÜ', 'aou'], ['a b', 'a  b'], ['a', 'a '], ['İ', 'i'], ['ß', 'SS'], ['ß', 'ss'],
  ['listen', 'silent'], ['listen', 'Silent'], ['abc', 'cab'], ['abc', 'abcd'], ['', ''], ['ä', 'ae'], ['dormitory', 'dirty room'], ['aab', 'abb'], ['Schule', 'Schüle'], ['hello', 'HELLO'], ['hello', 'Hello'], ['hello world', 'HELLO WORLD'], ['hello world', 'Hello World'], ['hello-world', 'HELLO-WORLD'], ['hello', 'Hello World'], ['Hello World', 'hello'], ['x y z', 'A B'], ['x y', 'A B C'], ['abc', ' ABC'], ['', 'ABC'], ['abc', ''], ['äpfel', 'ÄPFEL'], ['äpfel', 'Apfel'], ['ÄPFEL', 'äpfel'], ['über', 'Über'], ['über uns', 'Über Uns'], ['ß', 'ẞ'], ['ǆ', 'Ǆ'], ['ǆ', 'ǅ'], ['i', 'İ'], ['ΣΑΣ', 'σας'], ['σας', 'ΣΑΣ'], ['σας', 'Σας'], ['a  b', 'X'], ['a\tb', 'X Y'], ['one', 'ONE TWO'], ['1', '2'], ['one two', 'ONE'], ['one two', 'a b c d'], ['a-b', 'C-D'], ['a-b', 'C D'], ['a b-c', 'X Y-Z'], ['the cat', 'A Dog'], ['the', 'A'], ['THE', 'a'], ['the-cat', 'A Dog'], [' x', 'A'], ['x ', 'A']];
const calls2 = [];
for (const fn of ['getDifference', 'equalsIgnoreCaseAndDiacritics', 'preserveCase', 'preserveCaseWordByWord', 'numberOf', 'isAnagram']) for (const [x, y] of P) calls2.push({ fn, args: [x, y] });
for (const s of ['aaa', 'abcabc', '', 'a.b.c', '...', '😀😀', 'aXa']) for (const t of ['a', 'aa', '.', '', '😀', 'X', 'abc']) calls2.push({ fn: 'numberOf', args: [s, t] });
cases.push(['string-tools-pairs', 'StringTools two-string functions: getDifference, equalsIgnoreCaseAndDiacritics, preserveCase(+WordByWord), numberOf, isAnagram', chunks(calls2, 400).map((c) => ({ op: 'string-tools', args: { calls: c } }))]);
// language dependent
const LANGS = ['de', 'en', 'fr', 'nl', 'el', 'tr', 'es', 'pt', 'ca', 'uk'];
const calls3 = [];
const LS = uniq.filter((_, i) => i % 3 === 0).concat(['ijsselmeer', 'IJsselmeer', 'Ijsselmeer', 'ij', 'IJ', 'iJsselmeer', 'ijs', 'i', 'ijssel', 'İjs', 'ΐ', 'ǆ', 'ß', 'ßa', 'ο', 'ὀδυσσεύς', 'ΐα']);
for (const lang of LANGS) for (const s of LS.concat(['ijsselmeer'])) calls3.push({ fn: 'uppercaseFirstChar', args: [s, { lang }] });
cases.push(['string-tools-uppercaseFirstChar-lang', 'StringTools.uppercaseFirstChar(str, Language) for de/en/fr/nl/el/tr/es/pt/ca/uk (nl: ij hack; null language handled separately)', chunks(calls3, 400).map((c) => ({ op: 'string-tools', args: { calls: c } })).concat([{ op: 'string-tools', args: { calls: [{ fn: 'uppercaseFirstChar', args: ['ijsselmeer', null] }, { fn: 'uppercaseFirstChar', args: [null, { lang: 'nl' }] }, { fn: 'uppercaseFirstChar', args: ['', { lang: 'nl' }] }, { fn: 'uppercaseFirstChar', args: [null, null] }] } }])]);
const calls4 = [];
for (const lang of ['de', 'en', 'fr', 'ca', 'nl']) {
  for (const w of ['.', ',', ';', ':', '?', '!', 'a', '', '..', ' ', '«', '»', '-', '(', ')', '…', '’', "'", 'word', '\n', 'ä', '😀', ' ']) calls4.push({ fn: 'addSpace', args: [w, { lang }] });
  for (const s of ['Hello World', "L'été", 'Ärger mit Öl', 'ä ö ü ß', 'straße', ' a b ', '', 'a', 'A-B', 'x_y', 'Ünïcödé', 'ÀÉÎÕÜ', 'ŒUVRE', 'œ', 'ǆ', 'ñandú', 'ΑΒΓ', 'abc123', '123', '😀', 'it\'s', 'a\tb', 'a  b', 'Äpfel & Birnen', 'x'.repeat(50), 'İstanbul', 'i̇', 'Ž', 'ž', 'ï', 'Ø', 'Æ', 'æ', 'ß-ß', '-', '--', 'a-', '-a', ' ']) calls4.push({ fn: 'toId', args: [s, { lang }] });
}
calls4.push({ fn: 'addSpace', args: [null, { lang: 'de' }] }, { fn: 'addSpace', args: ['.', null] }, { fn: 'addSpace', args: ['ab', null] }, { fn: 'toId', args: [null, { lang: 'de' }] }, { fn: 'toId', args: ['x', null] });
cases.push(['string-tools-lang', 'StringTools.addSpace / toId for de/en/fr/ca/nl (+ null language)', chunks(calls4, 400).map((c) => ({ op: 'string-tools', args: { calls: c } }))]);
// chars, bytes, readers
const ch = ['0', '1', '9', 'a', 'A', ' ', '.', '-', '+', '٣', '５', '²', '½', 'Ⅻ', '\u0000', ' ', 'ä', '😀'.charAt(0), '१'];
const hex = (s, enc = 'utf8') => Buffer.from(s, enc).toString('hex');
const sample = ['', 'a', 'a\n', 'a\nb', 'a\r\nb\r\n', 'a\rb', '\n', '\n\n', 'Zeile 1\nZeile 2', 'ÄÖÜ äöü ß', '😀 emoji', '﻿BOM', 'tab\tsep', 'x'.repeat(10000) + '\n' + 'y'.repeat(100), 'last line without newline', 'a b', 'a\u0085b', 'a\u000Bb\u000Cc'];
const calls5 = ch.map((c) => ({ fn: 'isPositiveNumber', args: [{ char: c }] }));
for (const s of sample) {
  for (const enc of ['utf-8', 'UTF-8', 'iso-8859-1', 'us-ascii', 'utf-16', null, 'nosuch']) {
    const bytes = enc === 'utf-16' ? Buffer.from(s, 'utf16le') : Buffer.from(s, 'utf8');
    calls5.push({ fn: 'readStream', args: [{ bytesHex: bytes.toString('hex') }, enc] });
  }
  calls5.push({ fn: 'readerToString', args: [{ reader: s }] });
  for (const enc of ['utf-8', 'iso-8859-1']) calls5.push({ fn: 'streamToString', args: [{ bytesHex: hex(s) }, enc] });
}
for (const [h, enc] of [['c3', 'utf-8'], ['c328', 'utf-8'], ['ff', 'utf-8'], ['e4f6fc', 'iso-8859-1'], ['e4f6fc', 'utf-8'], ['00', 'utf-8'], ['efbbbf61', 'utf-8'], ['fffe6100', 'utf-16'], ['feff0061', 'utf-16'], ['0061', 'utf-16']]) calls5.push({ fn: 'readStream', args: [{ bytesHex: h }, enc] }, { fn: 'streamToString', args: [{ bytesHex: h }, enc] });
calls5.push({ fn: 'readStream', args: [null, 'utf-8'] }, { fn: 'readerToString', args: [null] });
calls5.push({ fn: 'ApiPrintMode.values', args: [] }, { fn: 'UPPERCASE_GREEK_LETTERS', args: [] }, { fn: 'LOWERCASE_GREEK_LETTERS', args: [] });
for (const s of ['', 'a', 'a\nb', 'abc\n\n', '\n', '\r\n', 'x\r', 'a b', 'a.', 'a. ', 'a.\n', 'a.\n\n', 'a\n\n\n', '\n\n']) for (const b of [true, false]) calls5.push({ fn: 'isParagraphEnd', args: [s, b] });
for (const p of ['/de/nosuchfile.txt', '/en/nosuchfile.txt', '']) calls5.push({ fn: 'loadLines', args: [p] });
cases.push(['string-tools-io', 'StringTools isPositiveNumber(char), readStream/readerToString/streamToString (encodings, BOM, line endings), isParagraphEnd, enums, Greek sets, loadLines errors', chunks(calls5, 300).map((c) => ({ op: 'string-tools', args: { calls: c } }))]);
// loadLines on a real resource (first line count + content)
cases.push(['string-tools-loadlines', 'StringTools.loadLines on wave-1 resource files (comments and empty lines skipped)', ['/de/case_rule_exceptions.txt', '/de/added.txt', '/en/added.txt', '/fr/added.txt'].map((p) => ({ op: 'string-tools', args: { calls: [{ fn: 'loadLines', args: [p] }] } }))]);
// unknown function / arity
cases.push(['string-tools-misc', 'string-tools harness meta: unknown fn, wrong arity', [{ op: 'string-tools', args: { calls: [{ fn: 'noSuch', args: ['a'] }, { fn: 'isEmpty', args: [] }, { fn: 'isEmpty', args: ['a', 'b'] }] } }]]);

// ---------- analyzed-token ----------
const tk = (token, readings, o = {}) => ({ token, readings, ...o });
const SS = tk('', [['SENT_START', null]], { startPos: 0 });
const synth = [
  [SS, tk('Hello', [['UH', 'hello']]), tk(' ', [[null, null]]), tk('world', [['NN', 'world'], ['VB', 'world']], { sentEnd: true })],
  [SS, tk('Das', [['ART:DEF:NOM:SIN:NEU', 'der']]), tk(' ', [[null, null]]), tk('Haus', [['SUB:NOM:SIN:NEU', 'Haus']], { chunkTags: ['NPS', 'B-NP'] }), tk('.', [['PKT', '.']], { sentEnd: true, paraEnd: true })],
  [SS, tk('unknown', [[null, null]]), tk('word', [[null, null]])],
  [SS, tk('x', [['A', 'a']], { immunize: 7 }), tk('y', [['B', 'b']])],
  [tk('only', [['T', 'only']])], [], [tk('empty-readings', [])],
  [SS, tk('\n', [[null, null]]), tk('a', [['X', 'a']]), tk('\r\n', [[null, null]]), tk('b', [['X', null]])],
  [SS, tk('Ünï', [['N', 'ünï'], ['N', 'Ünï']]), tk('😀', [['SYM', '😀']])],
  [SS, tk('a', [['P', 'a'], ['P', 'a']], { chunkTags: ['B-NP', 'E-NP', 'NPP'] })],
  [SS, tk(' ', [[null, null]]), tk(' ', [[null, null]]), tk('a', [['X', 'a']])],
  [SS, tk('end', [['X', 'end']], { sentEnd: true }), tk('', [['PARA_END', null]])],
];
const atcalls = synth.map((tokens) => ({ op: 'analyzed-token', args: { mode: 'synthetic', tokens } }));
for (const [token, pos, lemma] of [['a', 'NN', 'a'], ['a', null, null], [null, null, null], ['', '', ''], ['Haus', 'SUB:NOM', 'Haus'], ['x', 'P', null], ['x', null, 'y'], ['😀', 'SYM', '😀'], ['ä', 'N/A', 'ä/b']])
  atcalls.push({ op: 'analyzed-token', args: { mode: 'token', token, pos, lemma } });
cases.push(['analyzed-token-synthetic', 'AnalyzedToken#toString / AnalyzedTokenReadings#toString / AnalyzedSentence#toString with synthetic tokens (flags, chunk tags, immunize)', atcalls]);
const texts = {
  de: ['Das ist ein Test.', 'Das Haus ist groß. Es steht in Wien!', 'Ich gehe nach Hause.\n\nMorgen kommt er.', 'Äpfel & Birnen kosten 3,50 €.', '', 'Wir haben gestern einen Fehler gemacht', 'z. B. bei Dr. Müller', 'Straße', '😀 Emoji', '  Leerzeichen   mehrfach  '],
  en: ['This is a test.', 'The houses are big. They stand in London!', "I don't know. Isn't it nice?", 'Line one.\nLine two.', 'Running dogs went home.', 'The quick brown fox.', '', '3.5 % of $10', 'Café au lait'],
  fr: ["Ceci est un test.", "L'homme est allé à l'école. Il pleut!", 'Les chevaux mangent des pommes.', "Aujourd'hui, c'est l'été.", 'Ça va ?', ''],
};
cases.push(['analyzed-token-tagger', 'CLI -t / --taggeronly path: sentenceTokenize + getAnalyzedSentence, AnalyzedSentence#toString and token details', Object.entries(texts).flatMap(([lang, ts]) => ts.map((text) => ({ op: 'analyzed-token', args: { mode: 'tagger', lang, text } })))]);

writeCases('X-TEXT', cases);
console.log(`X-TEXT: ${cases.length} case files, ${uniq.length} base strings`);
