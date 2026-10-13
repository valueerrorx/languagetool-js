// Authors oracle/cases/X-PROBE-COLLECTIONS/*.json (inputs only).
import { writeCases } from './gen-probe-cases-numbers.mjs';

const o = (args) => ({ op: 'probe-collections', args });
const cases = [];
const range = (a, b, s = 1) => { const r = []; for (let i = a; i < b; i += s) r.push(String(i)); return r; };
const mapCase = (kind, keyType, keys, extra = {}) => o({ fn: 'map', kind, keyType, keys, ...extra });
const KINDS = ['HashMap', 'HashSet', 'LinkedHashMap', 'Hashtable', 'ConcurrentHashMap', 'TreeMap', 'TreeSet'];
const nonTree = ['HashMap', 'HashSet', 'Hashtable', 'ConcurrentHashMap'];

const words = ['banana', 'apple', 'cherry', 'date', 'elderberry', 'fig', 'grape', 'Zebra', 'ant', 'Äpfel', 'über', 'straße', 'naïve', '', ' ', 'a', 'b', 'c', 'aa', 'ab', 'ba', '1', '2', '10', '20', '100', 'null', 'true'];
const langs = ['de', 'en', 'fr', 'es', 'pt', 'it', 'nl', 'pl', 'ru', 'uk', 'sv', 'da', 'ca', 'gl', 'el', 'ja', 'zh', 'ar', 'fa', 'sk', 'sl', 'ro', 'br', 'eo', 'ga', 'ast', 'be', 'km', 'ta', 'tl', 'sr', 'lt', 'ml', 'crh', 'de-DE', 'de-AT', 'de-CH', 'en-US', 'en-GB', 'en-AU', 'en-CA', 'en-NZ', 'en-ZA', 'fr-FR', 'fr-CH', 'fr-CA', 'fr-BE', 'pt-PT', 'pt-BR', 'pt-AO', 'pt-MZ', 'es-ES', 'ca-ES', 'ca-ES-valencia', 'de-DE-x-simple-language', 'nl-BE', 'zh-CN', 'sr-RS', 'ar-DZ'];
const colliding = []; // 2^k strings with equal String.hashCode ("Aa" vs "BB")
for (let m = 0; m < 32; m++) { let s = ''; for (let b = 0; b < 5; b++) s += (m >> b) & 1 ? 'BB' : 'Aa'; colliding.push(s); }
const colliding4 = colliding.slice(0, 16).map((s) => s.slice(0, 8));
const shuffled = (a, seed) => { const r = a.slice(); let x = seed; for (let i = r.length - 1; i > 0; i--) { x = (x * 1103515245 + 12345) & 0x7fffffff; const j = x % (i + 1); [r[i], r[j]] = [r[j], r[i]]; } return r; };

cases.push(['order-strings', 'iteration order of HashMap/HashSet/LinkedHashMap/Hashtable/ConcurrentHashMap/TreeMap/TreeSet for varied String keys incl. language codes', [
  ...KINDS.flatMap((k) => [words, langs, shuffled(langs, 7), shuffled(langs, 99), langs.slice(0, 12), langs.slice(0, 13), langs.slice(0, 6), words.slice(0, 3), [], ['x']].map((keys) => mapCase(k, 'string', keys))),
  ...KINDS.map((k) => mapCase(k, 'string', [...words, 'Aa', 'BB', 'AaAa', 'BBBB', 'AaBB', 'BBAa'])),
]]);
cases.push(['order-collisions', 'colliding String hashes ("Aa"/"BB" combos): bucket chains, treeification at >=8 per bin and table >=64', [
  ...nonTree.map((k) => mapCase(k, 'string', colliding4)), ...nonTree.map((k) => mapCase(k, 'string', colliding)),
  ...nonTree.map((k) => mapCase(k, 'string', colliding.slice(0, 9))), ...nonTree.map((k) => mapCase(k, 'string', [...colliding, ...range(0, 70)])),
  ...nonTree.map((k) => mapCase(k, 'string', [...shuffled(colliding, 5), ...langs])), ...nonTree.map((k) => mapCase(k, 'string', colliding.slice().reverse())),
]]);
const sizes = [0, 1, 2, 3, 5, 6, 7, 8, 11, 12, 13, 14, 15, 16, 17, 23, 24, 25, 26, 47, 48, 49, 50, 96, 97, 100, 192, 193, 500, 1000];
cases.push(['order-int-keys-resize', 'Integer keys 0..N around resize thresholds (12/13, 24/25, 48/49, ...) for all kinds', [
  ...nonTree.flatMap((k) => sizes.map((n) => mapCase(k, 'int', range(0, n)))),
  ...['HashMap', 'HashSet', 'Hashtable'].flatMap((k) => sizes.filter((n) => n > 1).map((n) => mapCase(k, 'int', range(0, n).reverse()))),
  ...['HashMap', 'HashSet', 'Hashtable'].flatMap((k) => [8, 12, 13, 25, 49, 100].map((n) => mapCase(k, 'int', shuffled(range(0, n), n)))),
  ...['LinkedHashMap', 'TreeMap', 'TreeSet'].map((k) => mapCase(k, 'int', shuffled(range(0, 30), 3))),
]]);
cases.push(['order-int-keys-varied', 'Integer keys: negative, same bucket (multiples of 16/64), high-bit spreading, MIN/MAX, large steps', [
  ...nonTree.flatMap((k) => [range(0, 400, 16), range(0, 100 * 64, 64), range(-10, 10), ['-1', '-2147483648', '2147483647', '0', '65536', '131072', '1048576', '16777216', '65535', '65537'], range(0, 40, 1).map((x) => String(x * 65536)), range(0, 30).map((x) => String(x * 1000)), range(100000, 100020), ['1', '17', '33', '49', '65', '81', '97', '113'], range(0, 20).map((x) => String(-x * 1000003)), ['2147483647', '-2147483648', '1073741824', '-1073741824', '1', '-1']].map((keys) => mapCase(k, 'int', keys))),
  ...['TreeMap', 'TreeSet', 'LinkedHashMap'].map((k) => mapCase(k, 'int', ['5', '-1', '2147483647', '-2147483648', '0', '65536'])),
]]);
cases.push(['order-other-key-types', 'Long/Double/Character/Boolean keys (hashCode folding)', [
  ...nonTree.flatMap((k) => [
    mapCase(k, 'long', ['0', '1', '-1', '4294967296', '4294967297', '9223372036854775807', '-9223372036854775808', '1000000000000', '123456789012345678', '2', '3', '4294967295']),
    mapCase(k, 'long', range(0, 30)), mapCase(k, 'double', ['0.0', '-0.0', '1.0', '1.5', '-1.5', '0.1', '0.2', '0.3', '100.0', 'NaN', 'Infinity', '-Infinity', '1e100', '4.9e-324', '2.5', '3.14159']),
    mapCase(k, 'double', range(0, 30).map((x) => x + '.5')), mapCase(k, 'char', ['a', 'b', 'z', 'A', 'Z', '0', 'ä', 'ö', 'ü', 'ß', ' ', '€']), mapCase(k, 'char', 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')),
    mapCase(k, 'bool', ['true', 'false']), mapCase(k, 'bool', ['false', 'true']),
  ]),
]]);
cases.push(['ctor-sizing', 'initial capacity / load factor / copy-constructor sizing changes iteration order', [
  ...['HashMap', 'HashSet', 'Hashtable', 'LinkedHashMap'].flatMap((k) => ['cap:0', 'cap:1', 'cap:2', 'cap:3', 'cap:4', 'cap:5', 'cap:7', 'cap:8', 'cap:9', 'cap:16', 'cap:17', 'cap:31', 'cap:32', 'cap:100', 'cap:1:lf:2.0', 'cap:16:lf:0.5', 'cap:16:lf:1.0', 'cap:4:lf:0.1', 'cap:16:lf:0.0', 'cap:-1', 'copy'].flatMap((ctor) => [range(0, 20), langs.slice(0, 20), range(0, 40).map((x) => String(x * 17))].map((keys, i) => mapCase(k, i === 0 || i === 2 ? 'int' : 'string', keys, { ctor })))),
  ...['HashMap', 'HashSet'].flatMap((k) => [0, 1, 2, 3, 6, 11, 12, 13, 24, 25, 100].map((n) => mapCase(k, 'int', range(0, n).map((x) => String(x * 3)), { ctor: 'copy' }))),
]]);
cases.push(['ops-remove-null', 'remove/re-put/clear sequences, null keys, TreeMap/TreeSet null and comparator behaviour', [
  ...['HashMap', 'HashSet', 'LinkedHashMap', 'Hashtable', 'TreeMap', 'TreeSet'].map((k) => o({ fn: 'map', kind: k, keyType: 'string', ops: [['put', 'a'], ['put', 'b'], ['put', 'c'], ['put', null], ['put', 'a'], ['remove', 'b'], ['put', 'b'], ['contains', 'c'], ['contains', null], ['get', 'a'], ['remove', 'zz'], ['remove', null], ['size'], ['clear'], ['put', 'q'], ['size']] })),
  ...['HashMap', 'LinkedHashMap', 'Hashtable', 'TreeMap'].map((k) => o({ fn: 'map', kind: k, keyType: 'string', ops: [['put', 'x', 'v1'], ['put', 'y', 'v2'], ['put', 'x', 'v3'], ['putIfAbsent', 'x'], ['putIfAbsent', 'z'], ['get', 'x'], ['get', 'nope'], ['remove', 'y']] })),
  ...['HashMap', 'HashSet'].map((k) => o({ fn: 'map', kind: k, keyType: 'int', ops: [...range(0, 14).map((x) => ['put', x]), ...range(0, 10).map((x) => ['remove', x]), ['put', '100'], ['put', '16'], ['put', '32']] })),
  ...['TreeMap', 'TreeSet'].map((k) => o({ fn: 'map', kind: k, keyType: 'string', cmp: 'ci', ops: [['put', 'Apple'], ['put', 'apple'], ['put', 'APPLE'], ['put', 'banana'], ['put', 'Banana'], ['put', 'Äpfel'], ['put', 'äpfel'], ['put', 'ß'], ['put', 'SS'], ['put', 'ss'], ['contains', 'BANANA'], ['floor', 'b'], ['ceiling', 'b']] })),
  ...['TreeMap', 'TreeSet'].flatMap((k) => ['natural', 'reverse', 'len', 'ci', 'nullsFirst'].map((cmp) => o({ fn: 'map', kind: k, keyType: 'string', cmp, ops: [['put', 'b'], ['put', 'a'], ['put', 'C'], ['put', 'aa'], ['put', 'Ab'], ['put', null], ['put', '1'], ['put', '10'], ['put', '9'], ['put', 'ä'], ['put', 'z'], ['put', '😀'], ['put', '￿'], ['put', 'B']] }))),
  o({ fn: 'map', kind: 'TreeSet', keyType: 'int', ops: [['first'], ['put', '3'], ['put', '1'], ['first'], ['floor', '2'], ['ceiling', '2'], ['floor', '0'], ['ceiling', '4']] }),
  o({ fn: 'map', kind: 'TreeMap', keyType: 'string', ops: [['firstKey'], ['put', 'a']] }),
  o({ fn: 'map', kind: 'Nope', keyType: 'string', keys: [] }),
]]);

const props = [
  'a=b\nc:d\ne f\n', 'a = b\nc : d\ne\tf\n', '# comment\n! comment\nk=v\n', '  # indented comment\nk=v', 'a=b\\\n   c\nd=e', 'a=b\\\r\n   c', 'a=b\\\n\n', 'a=b\\', 'a\\\nb=c', 'a=b \\\n  # not comment\n',
  'k=\\n\\t\\r\\f\\\\\\=\\:\\#\\!\\ \\x', 'k=\\u00e4\\u00F6\\u0041', 'k=\\uD83D\\uDE00', 'k=\\u12', 'k=\\uXYZW', 'k=\\u', '\\u0041=x', 'a\\ b=c', 'a b c', 'a\\:b:c', 'a\\=b=c', 'a=b=c', 'a:b:c', 'a==b', 'a::b', 'a:=b', 'a=:b',
  'key', 'key=', 'key:', 'key ', '=value', ':value', ' =value', ' ', '', '\n\n\n', 'k=v\r\nk2=v2\r\n', 'k=v\rk2=v2\r', 'k=v\n\rk2=v2', 'k=v\u000ck2=v2', '\u000ck=v', 'k\u000c=\u000cv', 'k=  v  ', 'k=\\  v', 'k=v\\ ', 'k=v\\\\', 'k=v # not a comment', 'k=v ! no', ' k = v ',
  'k=v\nk=w', 'k=v\nK=w', 'k=ä', 'k=äöü', 'k=€', 'k=😀', 'ä=1', '€=1', 'k=\u0000', 'k= x', 'k= x', ' k=v', 'k =v', 'k=　x', 'a=1\nb=2\nc=3\nd=4\ne=5\nf=6\ng=7\nh=8\ni=9\nj=10\nk=11\nl=12',
  'a=\\\n  \\\n  b', 'a=b\\\n\\\nc', '#a=b\n#c=d', '!a=b', 'a=b\n# c=d\n', 'a.b.c=1\na.b=2\na=3', 'maxTextLength=50000\nmaxCheckTimeMillis=-1\nmaxErrorsPerWordRate=0.5\nrequestLimit=10\ntrustXForwardForHeader=true\nlanguageModel=/data/lm\nfasttextModel=\nunknownKey=1\ncacheSize=1000', 'x\\\ty=1',
];
const props50 = range(0, 50).map((i) => `k${i}=v${i}`).join('\n');
const propsVar = ['de-DE', 'en-US', 'fr', 'abc', 'Abc', 'ABC', 'x', 'y', 'z', 'zz', 'Aa', 'BB', 'AaAa', 'BBBB', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'].map((k) => `${k}=1`).join('\n');
cases.push(['properties-load', 'Properties.load(InputStream, ISO-8859-1 bytes) and load(Reader): escapes, continuation, comments, separators, key order (Hashtable)', [
  ...[...props, props50, propsVar].flatMap((text) => [o({ fn: 'properties', text, charset: 'ISO-8859-1' }), o({ fn: 'properties', text, charset: 'ISO-8859-1', reader: true })]),
  ...['k=äö€😀', 'ä=ö', 'k=\\u00e4'].map((text) => o({ fn: 'properties', text, charset: 'UTF-8' })),
  o({ fn: 'properties', text: 'a=1\nb=2\nc=3', charset: 'ISO-8859-1', get: ['a', 'b', 'zz', ''] }),
  ...[3, 7, 8, 10, 11, 12, 13, 22, 23, 24, 25, 40, 100].map((n) => o({ fn: 'properties', text: range(0, n).map((i) => `key${i}=v`).join('\n'), charset: 'ISO-8859-1' })),
  ...[5, 11, 12, 20].map((n) => o({ fn: 'properties', text: range(0, n).map((i) => `${i}=v`).join('\n'), charset: 'ISO-8859-1' })),
  o({ fn: 'properties', text: null, charset: 'ISO-8859-1' }),
]]);
const strs = ['banana', 'Apple', 'apple', 'cherry', 'Äpfel', 'apfel', 'zebra', 'Zebra', 'ant', '10', '9', '2', '1', '', ' ', 'a b', 'ab', 'a_b', 'a-b', 'ß', 'ss', 'SS', 'é', 'e', 'f', '😀', '￿', '～', 'z', 'Z', 'a', 'A', 'b', 'B', 'ñ', 'n', 'ö', 'o', 'oe', 'x1', 'x10', 'x2'];
const ties = ['b:1', 'a:1', 'b:2', 'a:2', 'c:1', 'a:3', 'b:3', 'c:2', 'a:4', 'b:4', 'c:3', 'a:5', 'a:6', 'b:5'];
cases.push(['sort', 'Collections.sort / List.sort / Arrays.sort / stream sorted: String code-unit order, case-insensitive, stable ties, reverse, nulls, doubles incl. NaN/-0.0', [
  ...['list', 'array', 'stream'].flatMap((how) => [null, 'ci', 'reverse', 'len'].map((cmp) => o({ fn: 'sort', type: 'string', how, cmp, values: strs }))),
  ...['list', 'array', 'stream'].flatMap((how) => ['keyPrefix', 'len'].map((cmp) => o({ fn: 'sort', type: 'string', how, cmp, values: ties }))),
  o({ fn: 'sort', type: 'string', how: 'list', values: ['a', null, 'b'] }), o({ fn: 'sort', type: 'string', how: 'list', cmp: 'nullsFirst', values: ['b', null, 'a', null] }),
  ...['list', 'array', 'max'].flatMap((how) => [null, 'ci', 'reverse'].map((cmp) => o({ fn: 'sort', type: 'string', how, cmp, values: ['b', 'B', 'a', 'A'] }))),
  o({ fn: 'sort', type: 'string', how: 'max', values: [] }),
  ...['list', 'array', 'stream'].map((how) => o({ fn: 'sort', type: 'int', how, values: ['5', '-1', '2147483647', '-2147483648', '0', '10', '9', '100', '-100'] })),
  ...['list', 'array', 'stream', 'max'].map((how) => o({ fn: 'sort', type: 'double', how, values: ['1.5', 'NaN', '-0.0', '0.0', '-Infinity', 'Infinity', '-1.5', '0.0', '-0.0', 'NaN', '4.9e-324'] })),
  o({ fn: 'sort', type: 'doublePrim', values: ['1.5', 'NaN', '-0.0', '0.0', '-Infinity', 'Infinity', '-1.5', '0.0', '-0.0', 'NaN', '4.9e-324'] }),
  o({ fn: 'sort', type: 'long', how: 'list', values: ['9223372036854775807', '-9223372036854775808', '0', '4294967296', '-1'] }),
  o({ fn: 'sort', type: 'char', how: 'list', values: ['b', 'a', 'B', 'ä', 'z', '0'] }), o({ fn: 'sort', type: 'bool', how: 'list', values: ['true', 'false', 'true'] }),
  o({ fn: 'sort', type: 'string', how: 'nope', values: ['a'] }),
]]);
const seeds = ['0', '1', '2', '41', '42', '12345', '-1', '-2', '987654321', '4294967296', '281474976710656', '9223372036854775807', '-9223372036854775808', '1709164800000', '25214903917'];
const seqA = ['nextInt', 'nextInt', 'nextInt', 'nextInt', 'nextInt', 'nextInt:10', 'nextInt:10', 'nextInt:10', 'nextInt:16', 'nextInt:16', 'nextInt:100', 'nextInt:1', 'nextInt:2', 'nextInt:3', 'nextInt:2147483647', 'nextInt:1073741825', 'nextInt:1610612736', 'nextLong', 'nextLong', 'nextDouble', 'nextDouble', 'nextDouble', 'nextFloat', 'nextFloat', 'nextBoolean', 'nextBoolean', 'nextBoolean', 'nextBoolean', 'nextBytes:7', 'nextBytes:0', 'nextBytes:4', 'nextInt:5:15', 'nextInt:-5:5', 'nextInt:0:2147483647', 'nextLong:100', 'nextLong:5:50', 'ints:5:0:10', 'doubles:3', 'nextInt:0', 'nextInt:-1', 'nextInt:5:5', 'nextInt:6:5', 'nextGaussian'];
const seqG = ['nextGaussian', 'nextGaussian', 'nextGaussian', 'nextGaussian', 'nextGaussian', 'nextGaussian', 'nextInt', 'nextGaussian', 'nextDouble', 'nextGaussian', 'nextGaussian', 'setSeed:41', 'nextGaussian', 'nextGaussian', 'nextGaussian', 'setSeed:0', 'nextGaussian', 'nextInt:10', 'nextGaussian', 'nextGaussian', 'nextGaussian', 'nextGaussian'];
cases.push(['random-sequences', 'java.util.Random LCG sequences per seed (nextInt, bound rejection loop, nextLong/Double/Float/Boolean/Bytes, ranges)', seeds.map((seed) => o({ fn: 'random', seed, calls: seqA }))]);
cases.push(['random-gaussian', 'Random.nextGaussian (StrictMath polar method) incl. seed 41, cached second value, setSeed reset', [
  ...seeds.map((seed) => o({ fn: 'random', seed, calls: seqG })),
  o({ fn: 'random', seed: '41', calls: Array.from({ length: 40 }, () => 'nextGaussian') }), o({ fn: 'random', seed: '42', calls: Array.from({ length: 40 }, () => 'nextGaussian') }), o({ fn: 'random', seed: '0', calls: Array.from({ length: 40 }, () => 'nextGaussian') }), o({ fn: 'random', seed: '1', calls: Array.from({ length: 200 }, () => 'nextGaussian') }),
]]);
cases.push(['random-long-runs', 'long Random sequences (state beyond 2^53)', seeds.slice(0, 8).flatMap((seed) => [o({ fn: 'random', seed, calls: Array.from({ length: 100 }, () => 'nextInt') }), o({ fn: 'random', seed, calls: Array.from({ length: 50 }, (_, i) => `nextInt:${i + 2}`) }), o({ fn: 'random', seed, calls: Array.from({ length: 30 }, () => 'nextLong') }), o({ fn: 'random', seed, calls: Array.from({ length: 30 }, () => 'nextDouble') })])]);
const sl = (n) => range(0, n).map((i) => 'e' + i);
cases.push(['shuffle', 'Collections.shuffle(list, new Random(seed))', seeds.flatMap((seed) => [0, 1, 2, 3, 5, 10, 33, 100].map((n) => o({ fn: 'shuffle', seed, list: sl(n) }))).concat([o({ fn: 'shuffle', seed: '41', list: ['a', null, 'b'] })])]);

const sc = ['a\nb', 'a\r\nb', 'a\rb', 'a b', 'a b', 'a\u0085b', 'a\u000bb', 'a\u000cb', 'a\u001cb', 'a\n', 'a\r\n', 'a\r', 'a ', 'a\u0085', '\n', '\r\n', '\r', ' ', '\u0085', '\n\n', '\r\n\r\n', '\n\r', '\r\r', '\r\n\n', '  ', '', 'a', 'a\n\nb', 'a\n\n', 'a\r\n\r\nb\r', 'one\ntwo\r\nthree\rfour five six\u0085seven', '﻿a\nb', 'a\u0000b\nc', 'ä\nö\r\nü', '😀\n😀', 'a b\nc d\n', ' \n \n', 'a\u000b\u000cb', '# c\nk=v\n  \n\tx\ty', 'a\\\nb'];
cases.push(['scanner-lines', 'Scanner.nextLine vs BufferedReader.readLine vs String.lines: line terminators incl. U+2028/2029/0085, trailing/empty lines', sc.map((text) => o({ fn: 'scanner', text, mode: 'lines' }))]);
cases.push(['scanner-tokens', 'Scanner.next() whitespace delimiter (\\p{javaWhitespace}+) and nextInt/nextLine interplay', [
  ...['a b\tc\nd', 'a b', 'a b c\u0085d', 'a​b', 'a b', 'a\u001fb', 'a\u001cb', 'a　b', '  a  b  ', '', ' ', '\n', 'ä ö ü', 'a\u000bb\u000cc', 'a﻿b', 'a b', 'a᠎b'].map((text) => o({ fn: 'scanner', text, mode: 'tokens' })),
  ...['12 rest\nnext', '12\nnext', '12', '12\n', '12 \nx', '+12', '-12\r\nq', '１２ x', '٣ x', '1,234 x', '1_000', '2147483648', 'x', '', '12.5', ' 7 y'].map((text) => o({ fn: 'scanner', text, mode: 'intThenLine' })),
  o({ fn: 'scanner', text: 'a', mode: 'nope' }),
]]);
cases.push(['priorityqueue', 'PriorityQueue heap/iteration order, poll order, remove(Object), comparators', [
  ...[['5', '3', '8', '1', '9', '2', '7'], ['1', '2', '3', '4', '5', '6', '7', '8'], ['8', '7', '6', '5', '4', '3', '2', '1'], ['3', '3', '1', '1', '2', '2'], ['5'], [], ['10', '-5', '0', '2147483647', '-2147483648', '7', '7']]
    .map((vals) => o({ fn: 'pq', type: 'int', ops: [...vals.map((v) => ['offer', v]), ['peek'], ...vals.map(() => ['poll']), ['poll'], ['peek']] })),
  ...[null, 'reverse'].map((cmp) => o({ fn: 'pq', type: 'int', cmp, ops: [...['5', '3', '8', '1', '9', '2', '7', '4', '6'].map((v) => ['offer', v]), ['remove', '8'], ['remove', '1'], ['remove', '99'], ['poll'], ['poll'], ['remove', '5'], ['poll']] })),
  ...[null, 'reverse', 'ci', 'len'].map((cmp) => o({ fn: 'pq', type: 'string', cmp, ops: [...['pear', 'Apple', 'fig', 'apple', 'Äpfel', 'kiwi', 'FIG', 'date', 'x', 'yy'].map((v) => ['offer', v]), ...Array.from({ length: 11 }, () => ['poll'])] })),
  o({ fn: 'pq', type: 'string', ops: [['offer', null]] }), o({ fn: 'pq', type: 'int', ops: [['nope']] }),
]]);
const li = ['a', 'b', 'c'];
cases.push(['list-ops', 'ArrayList/LinkedList/Arrays.asList/List.of/unmodifiable: index errors, mutation errors, CME, toString/hashCode', [
  ...['ArrayList', 'LinkedList', 'Arrays.asList', 'List.of', 'unmodifiable', 'emptyList', 'singletonList'].map((kind) => o({ fn: 'list', kind, init: kind === 'emptyList' ? [] : li, ops: [['get', 0], ['get', 3], ['get', -1], ['get', 100], ['add', 'd'], ['addAt', 1, 'x'], ['addAt', 9, 'x'], ['set', 0, 'z'], ['set', 9, 'z'], ['removeAt', 0], ['removeAt', 9], ['removeAt', -1], ['removeObj', 'b'], ['removeObj', 'nope'], ['indexOf', 'c'], ['indexOf', null], ['contains', 'a'], ['contains', null], ['subList', 0, 2], ['subList', 2, 1], ['subList', 0, 9], ['subList', -1, 1], ['clear'], ['sortNatural'], ['addAll', ['q', 'r']], ['removeIf', 'a'], ['toArray']] })),
  ...['ArrayList', 'LinkedList', 'Arrays.asList'].map((kind) => o({ fn: 'list', kind, init: ['b', null, 'a'], ops: [['sortNatural'], ['contains', null], ['indexOf', null], ['add', null], ['removeObj', null]] })),
  o({ fn: 'list', kind: 'List.of', init: ['a', null], ops: [['get', 0]] }),
  ...['ArrayList', 'LinkedList'].map((kind) => o({ fn: 'list', kind, init: ['a', 'b', 'c', 'd'], ops: [['iterRemove', 'a'], ['iterRemove', 'b'], ['iterRemove', 'c'], ['iterRemove', 'd'], ['iterRemove', 'zz']] })),
  o({ fn: 'list', kind: 'ArrayList', init: ['x', 'y'], ops: [['nope']] }), o({ fn: 'list', kind: 'Nope', init: [], ops: [] }),
]]);
writeCases('X-PROBE-COLLECTIONS', cases);
console.log(`X-PROBE-COLLECTIONS: ${cases.length} case files`);
