// Authors oracle/cases/X-PROBE-NUMBERS/*.json (inputs only; expected values come from Java via `npm run oracle`).
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const T = (t, v) => ({ t, v: String(v) });
export const bits = (t, b) => ({ t, bits: b });
export function writeCases(id, cases) {
  const dir = path.join(ROOT, 'oracle/cases', id);
  mkdirSync(dir, { recursive: true });
  for (const [name, description, ops] of cases) {
    const cs = { kind: 'harness', clock: 'fixed', description, normalize: [], compare: 'jsonl', ops };
    writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(cs, null, 1) + '\n');
  }
}
const OP = 'probe-numbers';
const o = (args) => ({ op: OP, args });

const intStr = ['0', '-0', '+5', '-5', '+0', '2147483647', '2147483648', '-2147483648', '-2147483649', ' 5', '5 ', '5\n', '', '+', '-', '1_000', '0x10', '1e3', '1.0', '1,000',
  '٣٤', '５', '-٣', '०१', '²', null, 'a', '  ', '00012', '+-1', '99999999999999999999', '\u0000', '١٢٣', '0b1', '1L', '٣.٥', '𝟙', '９９'];
const longStr = ['0', '9223372036854775807', '9223372036854775808', '-9223372036854775808', '-9223372036854775809', '2147483648', '4294967296', '9007199254740993', '12345678901234567890', '1L', ' 1', '+9223372036854775807', '', null, 'x', '1e3', '٩٢٢٣'];
const dblStr = ['0', '-0', '1.5', ' 1.5 ', '1.5f', '1.5F', '1.5d', '1.5D', '1e3', '1E3', '.5', '5.', '.', 'NaN', '-NaN', '+NaN', 'nan', 'Infinity', '-Infinity', '+Infinity', 'infinity', 'Inf', 'INF', '0x1p3', '0x1.8p1', '0x.8p0', '0X1P-2', '0x10', '1,5', '', '  ', '1e', 'e1', '1_0', ' 5', '\u00015', '5\u0001', ' 5',
  '1e400', '-1e400', '4.9e-324', '2e-324', '2.4703282292062327e-324', '2.4703282292062328e-324', '1.7976931348623157e308', '1.7976931348623159e308', '1.7976931348623158e308', '0.1', '1e23', '9007199254740993', '123456789012345678', '00.5', '1e+3', '1e-3', '+.5e1', '-.5E-1', '١٫٥', '１', 'NaNf', 'Infinityf', '1ee3', '1.5ff', '0x1.fffffffffffffp1023', '0x1p-1074', '0x1p-1075', '1.0e0d', '8.41e21', '2.2250738585072012e-308', '4.35', '0.30000000000000004', '100000000000000000000000', '1e22', '5e-324', null];
const fltStr = ['0', '1.5', '3.4028235e38', '3.4028236e38', '3.4028235677973366e38', '3.4028235677973367e38', '1e-45', '7e-46', '7.006492321624086e-46', '7.006492321624087e-46', '1.00000017881393432617187499', '1.00000017881393432617187500', '16777217', '0.1', '1.1', 'NaN', 'Infinity', '-Infinity', ' 2.5f ', '1e39', '0x1p-149', '', 'x', null, '9.999999e-5', '1.17549435E-38', '8388608.5'];
const boolStr = ['true', 'TRUE', 'True', 'tRuE', ' true', 'true ', 'yes', '1', '', 'false', 'on', 't', null];

const cases = [];
cases.push(['parse-int', 'Integer.parseInt/valueOf/decode incl. Unicode digits, null, signs, overflow', [
  ...intStr.map((s) => o({ fn: 'parse', t: 'int', s })),
  ...intStr.map((s) => o({ fn: 'parse', t: 'valueOfInt', s })),
  ...['0x10', '-0x10', '#FF', '010', '-010', '0', '0x', '08', '2147483648', '-0x80000000', '+5', '+-5', '', null, '0X1f', '#', '-#1'].map((s) => o({ fn: 'parse', t: 'decode', s })),
  ...['ff', 'FF', '-80000000', '7fffffff', '80000000', 'zz', '+a', '', '-', 'ٔ1'].map((s) => o({ fn: 'parse', t: 'intRadix', s, radix: 16 })),
  ...['101', '102', '-1', '2'].map((s) => o({ fn: 'parse', t: 'intRadix', s, radix: 2 })),
  ...['zz', 'ZZ', 'Zz', '1y2p0ij32e8e7', '1y2p0ij32e8e8'].map((s) => o({ fn: 'parse', t: 'intRadix', s, radix: 36 })),
  o({ fn: 'parse', t: 'intRadix', s: '10', radix: 37 }), o({ fn: 'parse', t: 'intRadix', s: '10', radix: 1 }), o({ fn: 'parse', t: 'intRadix', s: '10', radix: 0 }), o({ fn: 'parse', t: 'intRadix', s: '10', radix: -2 }), o({ fn: 'parse', t: 'intRadix', s: null, radix: 10 }),
  ...['0', '4294967295', '4294967296', '-1', '+1', '', null, '2147483648'].map((s) => o({ fn: 'parse', t: 'parseUnsignedInt', s })),
]]);
cases.push(['parse-long-short-byte', 'Long/Short/Byte parse, radix, decode, unsigned', [
  ...longStr.map((s) => o({ fn: 'parse', t: 'long', s })),
  ...longStr.map((s) => o({ fn: 'parse', t: 'valueOfLong', s })),
  ...['ff', '-8000000000000000', '7fffffffffffffff', '8000000000000000', 'g'].map((s) => o({ fn: 'parse', t: 'longRadix', s, radix: 16 })),
  ...['0x7fffffffffffffff', '0x8000000000000000', '-0x8000000000000000', '#1', '0777', '99999999999999999999', null].map((s) => o({ fn: 'parse', t: 'decodeLong', s })),
  ...['0', '18446744073709551615', '18446744073709551616', '-1', ''].map((s) => o({ fn: 'parse', t: 'parseUnsignedLong', s })),
  ...['0', '32767', '32768', '-32768', '-32769', '+1', '', 'a', null].map((s) => o({ fn: 'parse', t: 'short', s })),
  ...['0', '127', '128', '-128', '-129', '+1', '', 'a', null].map((s) => o({ fn: 'parse', t: 'byte', s })),
]]);
cases.push(['parse-double', 'Double.parseDouble/valueOf: whitespace, suffixes, hex floats, NaN, Infinity, range', [
  ...dblStr.map((s) => o({ fn: 'parse', t: 'double', s })),
  ...dblStr.map((s) => o({ fn: 'parse', t: 'valueOfDouble', s })),
]]);
cases.push(['parse-float', 'Float.parseFloat incl. round-to-nearest-even boundaries', fltStr.map((s) => o({ fn: 'parse', t: 'float', s }))]);
cases.push(['parse-boolean', 'Boolean.parseBoolean/valueOf', [
  ...boolStr.map((s) => o({ fn: 'parse', t: 'boolean', s })), ...boolStr.map((s) => o({ fn: 'parse', t: 'booleanValueOf', s }))]]);
cases.push(['parse-unknown-fn', 'harness error paths: unknown fn/type/op, missing args', [
  o({ fn: 'nope' }), o({ fn: 'parse', t: 'nope', s: '1' }), o({ fn: 'arith', t: 'int', op: 'nope', a: T('int', 1), b: T('int', 1) }), o({ fn: 'arith', t: 'int', op: 'add', a: T('int', 'x'), b: T('int', 1) }),
]]);

const IMAX = '2147483647', IMIN = '-2147483648', LMAX = '9223372036854775807', LMIN = '-9223372036854775808';
const intVals = ['0', '1', '-1', '2', '-2', '3', '-3', '7', '10', '16', '31', '32', '33', '63', '64', '65535', '65536', '46340', '46341', '1073741824', '-1073741824', '1073741823', IMAX, IMIN, '2147483646', '-2147483647', '100000', '1000000', '123456789'];
const intOpsBin = ['add', 'sub', 'mul', 'div', 'rem', 'and', 'or', 'xor', 'shl', 'shr', 'ushr', 'min', 'max', 'floorDiv', 'floorMod', 'addExact', 'subtractExact', 'multiplyExact', 'compare', 'divideUnsigned', 'remainderUnsigned', 'compareUnsigned', 'mulHi'];
const intOpsUn = ['neg', 'abs', 'not', 'negateExact', 'incrementExact', 'absExact', 'signum', 'bitCount', 'reverse', 'highestOneBit', 'numberOfLeadingZeros', 'numberOfTrailingZeros', 'toUnsignedLong'];
const pairsI = [];
for (const a of ['0', '1', '-1', '7', '-7', IMAX, IMIN, '65536', '46341', '100000', '-3']) for (const b of ['0', '1', '-1', '2', '3', '-3', '7', '-7', '31', '32', '33', '-1', IMAX, IMIN, '65536', '100000']) pairsI.push([a, b]);
for (const [i, chunk] of [intOpsBin.slice(0, 6), intOpsBin.slice(6, 12), intOpsBin.slice(12, 19), intOpsBin.slice(19)].entries()) {
  cases.push([`int-binary-${i + 1}`, `int ops ${chunk.join(',')}: overflow, /0, shifts >= 32, MIN/-1`,
    chunk.flatMap((op) => pairsI.map(([a, b]) => o({ fn: 'arith', t: 'int', op, a: T('int', a), b: T('int', b) })))]);
}
cases.push(['int-unary', 'int unary ops incl. abs(MIN_VALUE), exact overflow', intOpsUn.flatMap((op) => intVals.map((a) => o({ fn: 'arith', t: 'int', op, a: T('int', a) })))]);

const lvals = ['0', '1', '-1', '2', '-7', '7', IMAX, IMIN, '2147483648', '-2147483649', '4294967296', '9007199254740991', '9007199254740992', '9007199254740993', '-9007199254740993', LMAX, LMIN, '3037000499', '3037000500', '1000000007', '6364136223846793005', '-6364136223846793005', '1442695040888963407'];
const longBin = ['add', 'sub', 'mul', 'div', 'rem', 'and', 'or', 'xor', 'shl', 'shr', 'ushr', 'min', 'max', 'floorDiv', 'floorMod', 'addExact', 'subtractExact', 'multiplyExact', 'compare', 'divideUnsigned', 'remainderUnsigned', 'compareUnsigned', 'mulHi', 'rotateLeft'];
const pairsL = [];
for (const a of lvals) for (const b of ['0', '1', '-1', '2', '-3', '7', '31', '32', '63', '64', '65', '-1', IMAX, '4294967296', LMAX, LMIN, '1000003']) pairsL.push([a, b]);
for (const [i, chunk] of [longBin.slice(0, 6), longBin.slice(6, 12), longBin.slice(12, 18), longBin.slice(18)].entries()) {
  cases.push([`long-binary-${i + 1}`, `long ops ${chunk.join(',')}: wrap beyond 2^53, MIN/-1, shift counts`,
    chunk.flatMap((op) => pairsL.map(([a, b]) => o({ fn: 'arith', t: 'long', op, a: T('long', a), b: T('long', b) })))]);
}
cases.push(['long-unary', 'long unary ops', ['neg', 'abs', 'not', 'negateExact', 'toIntExact', 'signum', 'bitCount', 'numberOfLeadingZeros', 'numberOfTrailingZeros', 'toUnsignedString'].flatMap((op) => lvals.map((a) => o({ fn: 'arith', t: 'long', op, a: T('long', a) })))]);

const dv = ['0.0', '-0.0', '1.0', '-1.0', '0.5', '-0.5', '1.5', '2.5', '3.0', '-3.0', '7.5', '1e-300', '1e300', '4.9e-324', '1.7976931348623157e308', 'NaN', 'Infinity', '-Infinity', '0.1', '0.2', '0.30000000000000004', '9007199254740993', '1e16', '123456.789'];
cases.push(['double-binary', 'double arithmetic: signed zero, NaN, Infinity, %, min/max/compare', ['add', 'sub', 'mul', 'div', 'rem', 'min', 'max', 'compare', 'eq', 'lt', 'IEEEremainder', 'copySign', 'fma'].flatMap((op) => dv.flatMap((a) => ['0.0', '-0.0', '1.0', '-3.0', '0.1', 'NaN', 'Infinity', '-Infinity', '2.5'].map((b) => o({ fn: 'arith', t: 'double', op, a: T('double', a), b: T('double', b) }))))]);
cases.push(['double-unary', 'double unary ops', ['neg', 'abs', 'isNaN', 'isInfinite', 'isFinite', 'signum', 'ulp', 'nextUp'].flatMap((op) => dv.map((a) => o({ fn: 'arith', t: 'double', op, a: T('double', a) })))]);
const fv = ['0.0', '-0.0', '1.0', '0.1', '0.5', '2.5', '-2.5', '16777216', '16777217', '3.4028235e38', '1.4e-45', 'NaN', 'Infinity', '-Infinity', '1.1', '0.7', '123456.789'];
cases.push(['float-ops', 'float arithmetic (32-bit rounding), toDouble widening', ['add', 'sub', 'mul', 'div', 'rem', 'min', 'max', 'compare'].flatMap((op) => fv.flatMap((a) => ['0.0', '-0.0', '0.1', '3.0', 'NaN', '1.1', '1000.0'].map((b) => o({ fn: 'arith', t: 'float', op, a: T('float', a), b: T('float', b) }))))
  .concat(['neg', 'abs', 'isNaN', 'toDouble', 'ulp'].flatMap((op) => fv.map((a) => o({ fn: 'arith', t: 'float', op, a: T('float', a) }))))]);

const castD = ['0.0', '-0.0', '0.5', '-0.5', '0.9999999', '1.9', '-1.9', '2147483646.5', '2147483647.0', '2147483647.9', '2147483648.0', '-2147483648.0', '-2147483649.0', '-2147483648.9', '4294967296.0', '1e10', '-1e10', '1e19', '-1e19', '9223372036854775807.0', '9.223372036854775807E18', '-9.223372036854775808E18', '65535.9', '65536.0', '32768.0', '-32769.0', '255.0', '256.0', '128.0', '-129.0', '-1.0', '70000.0', 'NaN', 'Infinity', '-Infinity', '3.4028235e38', '3.5e38', '1e-50', '1e-46', '16777217.0', '9007199254740993.0'];
cases.push(['cast-double', '(int)(long)(short)(byte)(char)(float) of double: saturation, NaN, truncation', ['int', 'long', 'short', 'byte', 'char', 'float'].flatMap((to) => castD.map((a) => o({ fn: 'cast', from: 'double', to, a: T('double', a) })))]);
cases.push(['cast-float', 'casts from float', ['int', 'long', 'short', 'byte', 'char', 'double'].flatMap((to) => ['0.0', '-0.0', '0.5', '-1.5', '2.14748365e9', '2.14748365E9', '-2.14748365e9', '1e10', '1e20', '65536.0', '16777217', '0.1', 'NaN', 'Infinity', '-Infinity', '3.4028235e38'].map((a) => o({ fn: 'cast', from: 'float', to, a: T('float', a) })))]);
cases.push(['cast-integral', 'casts from long/int/short/char/byte: narrowing wrap, int->float/double precision', [
  ...['int', 'short', 'byte', 'char', 'float', 'double'].flatMap((to) => ['0', '-1', '1', '255', '256', '32767', '32768', '65535', '65536', '2147483647', '2147483648', '4294967295', '4294967296', '-2147483648', '-2147483649', '9007199254740993', LMAX, LMIN, '16777217', '4294967297'].map((a) => o({ fn: 'cast', from: 'long', to, a: T('long', a) }))),
  ...['long', 'short', 'byte', 'char', 'float', 'double'].flatMap((to) => ['0', '-1', '127', '128', '255', '65535', '65536', '-32769', '32768', IMAX, IMIN, '16777217', '16777216', '1234567890'].map((a) => o({ fn: 'cast', from: 'int', to, a: T('int', a) }))),
  ...['int', 'long', 'byte', 'char', 'float', 'double'].flatMap((to) => ['0', '-1', '127', '128', '32767', '-32768'].map((a) => o({ fn: 'cast', from: 'short', to, a: T('short', a) }))),
  ...['int', 'long', 'byte', 'short', 'float', 'double'].flatMap((to) => ['#0', '#65', '#127', '#128', '#255', '#32768', '#65535', '#55357', '#56832'].map((a) => o({ fn: 'cast', from: 'char', to, a: T('char', a) }))),
  ...['int', 'long', 'short', 'char', 'float', 'double'].flatMap((to) => ['0', '-1', '127', '-128'].map((a) => o({ fn: 'cast', from: 'byte', to, a: T('byte', a) }))),
]]);
const rd = ['0.5', '1.5', '2.5', '3.5', '-0.5', '-1.5', '-2.5', '-3.5', '0.49999999999999994', '-0.49999999999999994', '4503599627370497.0', '4503599627370496.5', '0.0', '-0.0', '1e15', '2.4999999999999996', '9007199254740991.0', '9223372036854775807.0', '9.3e18', '-9.3e18', '1e19', 'NaN', 'Infinity', '-Infinity', '4.9e-324', '123456.4999', '0.4999999999999999', '1.4999999999999998'];
cases.push(['math-round', 'Math.round/rint/floor/ceil on doubles and floats', [
  ...['round', 'rint', 'floor', 'ceil'].flatMap((op) => rd.map((a) => o({ fn: 'math', op, a: T('double', a) }))),
  ...['0.5', '1.5', '2.5', '-0.5', '-1.5', '-2.5', '1.4999999', '0.49999997', '16777215.5', '8388609.5', '3e9', '3e10', '-3e10', 'NaN', 'Infinity', '-Infinity', '0.0', '-0.0'].map((a) => o({ fn: 'math', op: 'round', a: T('float', a) })),
]]);
const mv = ['0.0', '-0.0', '1.0', '-1.0', '2.0', '0.5', '10.0', '-8.0', '1000.0', '1e-5', '1e22', '1e23', '1e308', '710.0', '-745.0', '709.78', '3.141592653589793', '1.5707963267948966', '6.283185307179586', '1e22', '1e300', '0.1', '100.0', '12345.6789', 'NaN', 'Infinity', '-Infinity', '4.9e-324'];
cases.push(['math-functions', 'Math.* and StrictMath.* functions on edge arguments', [
  ...['sqrt', 'cbrt', 'exp', 'log', 'log10', 'sin', 'cos', 'tan', 'atan', 'sinh', 'abs', 'strictExp', 'strictLog', 'strictLog10', 'strictSin', 'strictCos', 'strictSqrt'].flatMap((op) => mv.map((a) => o({ fn: 'math', op, a: T('double', a) }))),
  ...['pow', 'strictPow', 'atan2', 'hypot'].flatMap((op) => ['0.0', '-0.0', '1.0', '-1.0', '2.0', '0.5', '10.0', '-8.0', '-2.0', '1e22', 'NaN', 'Infinity', '-Infinity', '3.0'].flatMap((a) => ['0.0', '-0.0', '1.0', '-1.0', '2.0', '0.5', '0.3333333333333333', '-2.0', '22.0', '23.0', '-22.0', 'NaN', 'Infinity', '-Infinity', '1024.0', '0.1'].map((b) => o({ fn: 'math', op, a: T('double', a), b: T('double', b) })))),
  ...Array.from({ length: 40 }, (_, i) => o({ fn: 'math', op: 'pow', a: T('double', '10.0'), b: T('double', String(i - 10 + '.0')) })),
  ...Array.from({ length: 40 }, (_, i) => o({ fn: 'math', op: 'strictExp', a: T('double', (i * 0.75 - 10).toFixed(2)) })),
  ...Array.from({ length: 40 }, (_, i) => o({ fn: 'math', op: 'strictLog', a: T('double', String(Math.pow(1.7, i - 10))) })),
]]);
cases.push(['tostr', 'Integer/Long toString radix, hex, binary, unsigned, string concat, Character.digit', [
  ...['0', '1', '-1', '255', '-255', IMAX, IMIN, '65536', '123456789'].flatMap((a) => ['intToString', 'intHex', 'intOctal', 'intBinary', 'unsignedInt'].map((op) => o({ fn: 'tostr', op, a: T('int', a) }))),
  ...['2', '8', '10', '16', '36', '37', '1'].flatMap((radix) => ['0', '-255', IMAX, IMIN, '35', '36'].map((a) => o({ fn: 'tostr', op: 'intToStringRadix', a: T('int', a), radix }))),
  ...['2', '16', '36'].flatMap((radix) => ['0', '-1', LMAX, LMIN].map((a) => o({ fn: 'tostr', op: 'longToStringRadix', a: T('long', a), radix }))),
  ...['0', '-1', LMAX, LMIN, '255'].flatMap((a) => ['longHex', 'longBinary', 'unsignedLong'].map((op) => o({ fn: 'tostr', op, a: T('long', a) }))),
  ...['1.0', '100.0', '1e7', '9999999.0', '1.0E-3', '0.001', '0.0001', '123456789.0', '-0.0', 'NaN', 'Infinity', '1e23', '0.1', '2.0E-3', '4.9e-324', '1.7976931348623157e308'].flatMap((a) => ['doubleToString', 'doubleHex', 'concat', 'valueOf'].map((op) => o({ fn: 'tostr', op, a: T('double', a) }))),
  ...['1.0', '0.1', '1e7', '1e-3', '16777216', '3.4028235e38', '1.4e-45', '-0.0', 'NaN', '0.3', '33.333332'].flatMap((a) => ['floatToString', 'concat'].map((op) => o({ fn: 'tostr', op, a: T('float', a) }))),
  ...['#97', '#65', '#48', '#57', '#1633', '#65301', '#945', '#8232', '#0'].flatMap((a) => [10, 16, 2, 36].map((radix) => o({ fn: 'tostr', op: 'charDigit', a: T('char', a), radix }))),
  ...['#97', '#65', '#48', '#189', '#8544', '#1633'].map((a) => o({ fn: 'tostr', op: 'charNumeric', a: T('char', a) })),
  ...['0', '9', '10', '15', '35', '36', '-1'].map((a) => o({ fn: 'tostr', op: 'forDigit', a: T('int', a), radix: 36 })),
  o({ fn: 'tostr', op: 'concat', a: T('char', '#97') }), o({ fn: 'tostr', op: 'concat', a: T('long', LMIN) }), o({ fn: 'tostr', op: 'concat', a: T('bool', 'true') }), o({ fn: 'tostr', op: 'concat', a: T('null', null) }),
]]);
cases.push(['mixed-expressions', 'mixed int/long/float/double/char expressions from SEMANTICS P4', [
  ...['0.1', '0.5', '1.1', '2.9', '-0.1', '0.7', '1.0E10', 'NaN'].flatMap((f) => ['0', '1', '3', '10', '100', '7', '-5', IMAX].map((i) => o({ fn: 'mixed', kind: 'intPlusEqFloat', a: T('int', i), b: T('float', f) }))),
  ...['0.1', '0.5', '10.0', '2.5', '1.5', '0.7'].flatMap((f) => ['0', '1', '3', '10', '100', '7', '-5', IMAX, '123456789'].map((i) => o({ fn: 'mixed', kind: 'intMulEqFloat', a: T('int', i), b: T('float', f) }))),
  ...['0.1', '0.5', '10.0', '2.5', '1.5', '0.7', '1e20'].flatMap((f) => ['3', '10', '-5', IMAX].map((i) => o({ fn: 'mixed', kind: 'intMulEqDouble', a: T('int', i), b: T('double', f) }))),
  ...['0', '1', '10', '1000', '1500', '2500', '29999', '12345678901', LMAX, LMIN].flatMap((l) => ['0.1', '3.0', '1000.0', '7.0'].flatMap((f) => [o({ fn: 'mixed', kind: 'longDivFloat', a: T('long', l), b: T('float', f) }), o({ fn: 'mixed', kind: 'longDivDouble', a: T('long', l), b: T('double', f) })])),
  ...['0', '1', '10', '999', '1000', '1500', '2500', '29999', '30000', '123456', '-1', '12345678901'].flatMap((l) => ['msToSecFloat', 'msToSecDouble'].map((kind) => o({ fn: 'mixed', kind, a: T('long', l) }))),
  ...[['7', '2'], ['-7', '2'], ['7', '-2'], ['1', '3'], ['5', '0'], [IMIN, '-1'], ['0', '0']].flatMap(([a, b]) => ['intDivInt', 'intDivIntToDouble', 'intDivIntAsDouble'].map((kind) => o({ fn: 'mixed', kind, a: T('int', a), b: T('int', b) }))),
  ...['0.4', '0.5', '1.5', '2.49999', '-0.7', '-1.2', '2147483647.0', '1e10', 'NaN'].map((d) => o({ fn: 'mixed', kind: 'intPlusHalfTrunc', a: T('double', d) })),
  ...['0', '1', '214748364', '214748365', '300000000', '-300000000', IMAX, IMIN].map((i) => o({ fn: 'mixed', kind: 'intTimes10', a: T('int', i) })),
  ...['0', '1', '-1', '10000', '-10000', IMAX, IMIN].map((i) => o({ fn: 'mixed', kind: 'minValuePlus', a: T('int', i) })),
  ...['0', '1', '25', '-1', '65438'].flatMap((i) => ['charPlusInt', 'charCastPlusInt', 'charConcat'].map((kind) => o({ fn: 'mixed', kind, a: T('int', i) }))),
  o({ fn: 'mixed', kind: 'charPlusChar', a: T('char', 'a'), b: T('char', 'b') }), o({ fn: 'mixed', kind: 'charPlusPlus', a: T('char', 'z') }), o({ fn: 'mixed', kind: 'charPlusPlus', a: T('char', '#65535') }),
  o({ fn: 'mixed', kind: 'bytePlusEq', a: T('byte', '127'), b: T('int', '1') }), o({ fn: 'mixed', kind: 'bytePlusEq', a: T('byte', '-128'), b: T('int', '-1') }), o({ fn: 'mixed', kind: 'shortMul', a: T('short', '300'), b: T('short', '300') }),
  o({ fn: 'mixed', kind: 'floatFromInt', a: T('int', '16777217') }), o({ fn: 'mixed', kind: 'floatFromInt', a: T('int', IMAX) }),
  o({ fn: 'mixed', kind: 'floatPlusDouble', a: T('float', '0.1'), b: T('double', '0.1') }), o({ fn: 'mixed', kind: 'floatPlusDouble', a: T('float', '16777217'), b: T('double', '1') }),
  ...['0.1', '0.3', '1.1', '0.7'].flatMap((f) => [o({ fn: 'mixed', kind: 'floatSumTen', a: T('float', f) }), o({ fn: 'mixed', kind: 'doubleSumTen', a: T('double', f) })]),
  o({ fn: 'mixed', kind: 'ternaryBoxing' }), o({ fn: 'mixed', kind: 'ternaryNumeric', a: T('int', '1') }), o({ fn: 'mixed', kind: 'ternaryNumeric', a: T('int', '-1') }),
  o({ fn: 'mixed', kind: 'doubleEqualsBoxed', a: T('double', 'NaN'), b: T('double', 'NaN') }), o({ fn: 'mixed', kind: 'doubleEqualsBoxed', a: T('double', '0.0'), b: T('double', '-0.0') }),
  o({ fn: 'mixed', kind: 'longEqualsInt', a: T('long', '5'), b: T('int', '5') }), o({ fn: 'mixed', kind: 'longEqualsIntObj', a: T('long', '5'), b: T('int', '5') }),
]]);
cases.push(['boxed-hash-compare', 'hashCode of boxed types, compareTo/equals incl. NaN and -0.0', [
  ...[['double', ['0.0', '-0.0', '1.0', '1.5', 'NaN', 'Infinity', '-Infinity', '0.1', '4.9e-324', '1.7976931348623157e308', '1e23']], ['float', ['0.0', '-0.0', '1.0', '1.5', 'NaN', 'Infinity', '0.1']], ['long', ['0', '1', '-1', LMAX, LMIN, '4294967296', '4294967295', '9007199254740993']], ['int', ['0', '1', '-1', IMAX, IMIN]], ['short', ['0', '-1', '32767']], ['byte', ['0', '-1', '127']], ['char', ['a', '#0', '#65535', 'ß']], ['bool', ['true', 'false']]]
    .flatMap(([t, vs]) => vs.map((v) => o({ fn: 'hash', a: T(t, v) }))),
  o({ fn: 'hash', a: T('null', null) }),
  ...[['double', 'NaN', 'NaN'], ['double', 'NaN', '1.0'], ['double', '1.0', 'NaN'], ['double', '0.0', '-0.0'], ['double', '-0.0', '0.0'], ['double', 'Infinity', 'NaN'], ['double', '1.0', '1.0'], ['float', 'NaN', 'NaN'], ['float', '0.0', '-0.0'], ['long', LMIN, LMAX], ['int', IMIN, IMAX], ['char', 'a', 'B'], ['bool', 'true', 'false'], ['byte', '-1', '1']]
    .map(([t, a, b]) => o({ fn: 'compare', a: T(t, a), b: T(t, b) })),
  o({ fn: 'compare', a: T('int', '1'), b: T('long', '1') }), o({ fn: 'compare', a: T('bool', 'true'), b: T('null', null) }),
]]);
writeCases('X-PROBE-NUMBERS', cases);
console.log(`X-PROBE-NUMBERS: ${cases.length} case files`);
