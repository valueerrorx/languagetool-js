// JS twin of harness op "probe-numbers" (ProbeNumbers.java + Probe.java): dispatches to src/lib/java number helpers.
import { Integer, IntMath, iadd, isub, imul, idiv, irem, ineg, ishl, ishr, iushr } from '../../src/lib/java/int.js';
import { Long, LongMath, wrap, ladd, lsub, lmul, ldiv, lrem, lneg, lshl, lshr, lushr } from '../../src/lib/java/long.js';
import { Float, FloatMath, fadd, fsub, fmul, fdiv, frem } from '../../src/lib/java/float.js';
import { Double, Short, Byte, Char, JBoolean, JMath, drem } from '../../src/lib/java/numbers.js';
import { d2i, d2l, d2s, d2b, d2c, i2s, i2b, i2c, l2i, l2s, l2b, l2c, l2d, l2f } from '../../src/lib/java/casts.js';
import { digit, forDigit, getNumericValue } from '../../src/lib/java/charDigit.js';
import { doubleToString, floatToString } from '../../src/lib/java/toString.js';
import { stringHashCode } from '../../src/lib/java/Objects.js';
import { StrictMath } from '../../src/lib/java/StrictMath.js';
import { IllegalArgumentException, NullPointerException, ClassCastException } from '../../src/lib/java/errors.js';

const f32 = Math.fround;
const dv = new DataView(new ArrayBuffer(8));
const hex = (v, w) => v.toString(16).padStart(w, '0');

// Java: JsonNode#asText() of a scalar JSON value
function asText(n) {
  if (n === null) return 'null';
  if (typeof n === 'string') return n;
  if (typeof n === 'number') return Number.isInteger(n) ? String(n) : doubleToString(n);
  if (typeof n === 'boolean') return String(n);
  return '';
}

// Java: a.get(key).asText() with the NPE of a missing node
function need(a, k) {
  if (a[k] === undefined) {
    throw new NullPointerException('Cannot invoke "com.fasterxml.jackson.databind.JsonNode.asText()" because the return value of "com.fasterxml.jackson.databind.JsonNode.get(String)" is null');
  }
  return asText(a[k]);
}

// Java: Probe#str(JsonNode,String)
function str(a, k) {
  const n = a[k];
  if (n === undefined || n === null) return null;
  return asText(n);
}

// tagged value {t, x}: int/short/byte/char as number, long as BigInt, double/float as number
const tag = (t, x) => ({ t, x });

// Java: Probe#typed(JsonNode)
function typed(n) {
  if (n === undefined || n === null) return null;
  if (typeof n === 'string') return tag('string', n);
  if (typeof n === 'boolean') return tag('bool', n);
  const t = n.t;
  const v = n.v === undefined || n.v === null ? null : asText(n.v);
  if (t === 'null') return null;
  if (n.bits !== undefined) {
    const b = Long.parseUnsignedLong(String(n.bits).substring(2), 16);
    return t === 'float' ? tag('float', Float.intBitsToFloat(l2i(b))) : tag('double', Double.longBitsToDouble(b));
  }
  switch (t) {
    case 'int': return tag('int', Integer.valueOf(v));
    case 'long': return tag('long', Long.valueOf(v));
    case 'short': return tag('short', Short.valueOf(v));
    case 'byte': return tag('byte', Byte.valueOf(v));
    case 'char': return tag('char', v.startsWith('#') ? i2c(Integer.parseInt(v.substring(1))) : v.charCodeAt(0));
    case 'double': return tag('double', Double.valueOf(v));
    case 'float': return tag('float', Float.valueOf(v));
    case 'string': return tag('string', v);
    case 'bool': return tag('bool', JBoolean.valueOf(v));
    default: throw new IllegalArgumentException(`unknown type: ${t}`);
  }
}

// Java: Probe#num(String,Object)
function num(t, x) {
  if (t === 'double') {
    dv.setFloat64(0, x);
    return { t, v: doubleToString(x), bits: `0x${hex(dv.getBigUint64(0), 16)}` };
  }
  if (t === 'float') {
    dv.setFloat32(0, x);
    return { t, v: floatToString(x), bits: `0x${hex(dv.getUint32(0), 8)}` };
  }
  return { t, v: Object.is(x, -0) ? '-0' : String(x) }; // -0 must stay visible for integral types
}

const CLS = { int: 'Integer', long: 'Long', short: 'Short', byte: 'Byte', char: 'Character', double: 'Double', float: 'Float', bool: 'Boolean', string: 'String' };

// Java: (Integer) x style cast of a boxed Object; unboxing of null throws NullPointerException
function unbox(tv, t) {
  if (tv === null) throw new NullPointerException();
  if (tv.t !== t) {
    const from = `java.lang.${CLS[tv.t]}`;
    const to = `java.lang.${CLS[t]}`;
    throw new ClassCastException(`class ${from} cannot be cast to class ${to} (${from} and ${to} are in module java.base of loader 'bootstrap')`);
  }
  return tv.x;
}

// Java: ProbeNumbers#run(JsonNode)
export function run(a) {
  const fn = need(a, 'fn');
  switch (fn) {
    case 'parse': return parse(a);
    case 'arith': return arith(a);
    case 'cast': return cast(a);
    case 'math': return math(a);
    case 'tostr': return tostr(a);
    case 'mixed': return mixed(a);
    case 'hash': return hash(a);
    case 'compare': return compare(a);
    default: throw new IllegalArgumentException(`unknown fn: ${fn}`);
  }
}

// Java: ProbeNumbers#parse(JsonNode)
function parse(a) {
  const t = need(a, 't');
  const s = str(a, 's');
  const radix = () => Integer.parseInt(need(a, 'radix'));
  switch (t) {
    case 'int': return num('int', Integer.parseInt(s));
    case 'intRadix': return num('int', Integer.parseInt(s, radix()));
    case 'long': return num('long', Long.parseLong(s));
    case 'longRadix': return num('long', Long.parseLong(s, radix()));
    case 'short': return num('short', Short.parseShort(s));
    case 'byte': return num('byte', Byte.parseByte(s));
    case 'double': return num('double', Double.parseDouble(s));
    case 'float': return num('float', Float.parseFloat(s));
    case 'valueOfInt': return num('int', Integer.valueOf(s));
    case 'valueOfLong': return num('long', Long.valueOf(s));
    case 'valueOfDouble': return num('double', Double.valueOf(s));
    case 'decode': return num('int', Integer.decode(s));
    case 'decodeLong': return num('long', Long.decode(s));
    case 'parseUnsignedInt': return num('int', Integer.parseUnsignedInt(s));
    case 'parseUnsignedLong': return num('long', Long.parseUnsignedLong(s));
    case 'boolean': return JBoolean.parseBoolean(s);
    case 'booleanValueOf': return JBoolean.valueOf(s);
    default: throw new IllegalArgumentException(`unknown parse type: ${t}`);
  }
}

// Java: ProbeNumbers#arith(JsonNode)
function arith(a) {
  const t = need(a, 't');
  const op = need(a, 'op');
  const x = typed(a.a);
  const y = a.b !== undefined ? typed(a.b) : null;
  switch (t) {
    case 'int': return intOp(op, unbox(x, 'int'), y === null ? 0 : unbox(y, 'int'));
    case 'long': return longOp(op, unbox(x, 'long'), y === null ? 0n : unbox(y, 'long'));
    case 'double': return doubleOp(op, unbox(x, 'double'), y === null ? 0.0 : unbox(y, 'double'));
    case 'float': return floatOp(op, unbox(x, 'float'), y === null ? 0 : unbox(y, 'float'));
    default: throw new IllegalArgumentException(`unknown type: ${t}`);
  }
}

const I = (v) => num('int', v);
const L = (v) => num('long', v);
const D = (v) => num('double', v);
const F = (v) => num('float', v);

// Java: ProbeNumbers#intOp(String,int,int)
function intOp(op, x, y) {
  switch (op) {
    case 'add': return I(iadd(x, y));
    case 'sub': return I(isub(x, y));
    case 'mul': return I(imul(x, y));
    case 'div': return I(idiv(x, y));
    case 'rem': return I(irem(x, y));
    case 'neg': return I(ineg(x));
    case 'abs': return I(IntMath.abs(x));
    case 'and': return I(x & y);
    case 'or': return I(x | y);
    case 'xor': return I(x ^ y);
    case 'not': return I(~x);
    case 'shl': return I(ishl(x, y));
    case 'shr': return I(ishr(x, y));
    case 'ushr': return I(iushr(x, y));
    case 'min': return I(IntMath.min(x, y));
    case 'max': return I(IntMath.max(x, y));
    case 'floorDiv': return I(IntMath.floorDiv(x, y));
    case 'floorMod': return I(IntMath.floorMod(x, y));
    case 'addExact': return I(IntMath.addExact(x, y));
    case 'subtractExact': return I(IntMath.subtractExact(x, y));
    case 'multiplyExact': return I(IntMath.multiplyExact(x, y));
    case 'negateExact': return I(IntMath.negateExact(x));
    case 'incrementExact': return I(IntMath.incrementExact(x));
    case 'absExact': return I(IntMath.absExact(x));
    case 'compare': return I(Integer.compare(x, y));
    case 'signum': return I(Integer.signum(x));
    case 'bitCount': return I(Integer.bitCount(x));
    case 'reverse': return I(Integer.reverse(x));
    case 'highestOneBit': return I(Integer.highestOneBit(x));
    case 'numberOfLeadingZeros': return I(Integer.numberOfLeadingZeros(x));
    case 'numberOfTrailingZeros': return I(Integer.numberOfTrailingZeros(x));
    case 'toUnsignedLong': return L(Integer.toUnsignedLong(x));
    case 'divideUnsigned': return I(Integer.divideUnsigned(x, y));
    case 'remainderUnsigned': return I(Integer.remainderUnsigned(x, y));
    case 'compareUnsigned': return I(Integer.compareUnsigned(x, y));
    case 'sum': return I(Integer.sum(x, y));
    case 'mulHi': return L(LongMath.multiplyHigh(BigInt(x), BigInt(y)));
    default: throw new IllegalArgumentException(`unknown int op: ${op}`);
  }
}

// Java: ProbeNumbers#longOp(String,long,long,Object)
function longOp(op, x, y) {
  switch (op) {
    case 'add': return L(ladd(x, y));
    case 'sub': return L(lsub(x, y));
    case 'mul': return L(lmul(x, y));
    case 'div': return L(ldiv(x, y));
    case 'rem': return L(lrem(x, y));
    case 'neg': return L(lneg(x));
    case 'abs': return L(LongMath.abs(x));
    case 'and': return L(x & y);
    case 'or': return L(x | y);
    case 'xor': return L(x ^ y);
    case 'not': return L(~x);
    case 'shl': return L(lshl(x, y));
    case 'shr': return L(lshr(x, y));
    case 'ushr': return L(lushr(x, y));
    case 'min': return L(LongMath.min(x, y));
    case 'max': return L(LongMath.max(x, y));
    case 'floorDiv': return L(LongMath.floorDiv(x, y));
    case 'floorMod': return L(LongMath.floorMod(x, y));
    case 'addExact': return L(LongMath.addExact(x, y));
    case 'subtractExact': return L(LongMath.subtractExact(x, y));
    case 'multiplyExact': return L(LongMath.multiplyExact(x, y));
    case 'negateExact': return L(LongMath.negateExact(x));
    case 'toIntExact': return I(LongMath.toIntExact(x));
    case 'compare': return I(Long.compare(x, y));
    case 'signum': return I(Long.signum(x));
    case 'bitCount': return I(Long.bitCount(x));
    case 'numberOfLeadingZeros': return I(Long.numberOfLeadingZeros(x));
    case 'numberOfTrailingZeros': return I(Long.numberOfTrailingZeros(x));
    case 'divideUnsigned': return L(Long.divideUnsigned(x, y));
    case 'remainderUnsigned': return L(Long.remainderUnsigned(x, y));
    case 'compareUnsigned': return I(Long.compareUnsigned(x, y));
    case 'toUnsignedString': return Long.toUnsignedString(x);
    case 'mulHi': return L(LongMath.multiplyHigh(x, y));
    case 'rotateLeft': return L(Long.rotateLeft(x, l2i(y)));
    default: throw new IllegalArgumentException(`unknown long op: ${op}`);
  }
}

// Java: ProbeNumbers#doubleOp(String,double,double)
function doubleOp(op, x, y) {
  switch (op) {
    case 'add': return D(x + y);
    case 'sub': return D(x - y);
    case 'mul': return D(x * y);
    case 'div': return D(x / y);
    case 'rem': return D(drem(x, y));
    case 'neg': return D(-x);
    case 'abs': return D(JMath.abs(x));
    case 'min': return D(JMath.min(x, y));
    case 'max': return D(JMath.max(x, y));
    case 'compare': return I(Double.compare(x, y));
    case 'eq': return x === y;
    case 'lt': return x < y;
    case 'isNaN': return Double.isNaN(x);
    case 'isInfinite': return Double.isInfinite(x);
    case 'isFinite': return Double.isFinite(x);
    case 'signum': return D(JMath.signum(x));
    case 'IEEEremainder': return D(JMath.IEEEremainder(x, y));
    case 'ulp': return D(JMath.ulp(x));
    case 'nextUp': return D(JMath.nextUp(x));
    case 'copySign': return D(JMath.copySign(x, y));
    case 'fma': return D(JMath.fma(x, y, 1.0));
    default: throw new IllegalArgumentException(`unknown double op: ${op}`);
  }
}

// Java: ProbeNumbers#floatOp(String,float,float)
function floatOp(op, x, y) {
  switch (op) {
    case 'add': return F(fadd(x, y));
    case 'sub': return F(fsub(x, y));
    case 'mul': return F(fmul(x, y));
    case 'div': return F(fdiv(x, y));
    case 'rem': return F(frem(x, y));
    case 'neg': return F(-x);
    case 'abs': return F(FloatMath.abs(x));
    case 'min': return F(FloatMath.min(x, y));
    case 'max': return F(FloatMath.max(x, y));
    case 'compare': return I(Float.compare(x, y));
    case 'isNaN': return Float.isNaN(x);
    case 'toDouble': return D(x);
    case 'ulp': return F(FloatMath.ulp(x));
    default: throw new IllegalArgumentException(`unknown float op: ${op}`);
  }
}

// Java: ProbeNumbers#cast(JsonNode)
function cast(a) {
  const from = need(a, 'from');
  const to = need(a, 'to');
  const v = typed(a.a);
  switch (from) {
    case 'double': return castD(to, unbox(v, 'double'));
    case 'float': return castD2(to, unbox(v, 'float'));
    case 'long': return castL(to, unbox(v, 'long'));
    case 'int': return castL(to, BigInt(unbox(v, 'int')));
    case 'short': return castL(to, BigInt(unbox(v, 'short')));
    case 'char': return castL(to, BigInt(unbox(v, 'char')));
    case 'byte': return castL(to, BigInt(unbox(v, 'byte')));
    default: throw new IllegalArgumentException(`unknown from: ${from}`);
  }
}

// Java: ProbeNumbers#castD(String,double)
function castD(to, d) {
  switch (to) {
    case 'int': return num('int', d2i(d));
    case 'long': return num('long', d2l(d));
    case 'short': return num('short', d2s(d));
    case 'byte': return num('byte', d2b(d));
    case 'char': return num('char', d2c(d));
    case 'float': return num('float', f32(d));
    default: throw new IllegalArgumentException(`unknown to: ${to}`);
  }
}

// Java: ProbeNumbers#castD2(String,float)
function castD2(to, f) {
  switch (to) {
    case 'int': return num('int', d2i(f));
    case 'long': return num('long', d2l(f));
    case 'short': return num('short', d2s(f));
    case 'byte': return num('byte', d2b(f));
    case 'char': return num('char', d2c(f));
    case 'double': return num('double', f);
    default: throw new IllegalArgumentException(`unknown to: ${to}`);
  }
}

// Java: ProbeNumbers#castL(String,long)
function castL(to, l) {
  switch (to) {
    case 'int': return num('int', l2i(l));
    case 'long': return num('long', l);
    case 'short': return num('short', l2s(l));
    case 'byte': return num('byte', l2b(l));
    case 'char': return num('char', l2c(l));
    case 'float': return num('float', l2f(l));
    case 'double': return num('double', l2d(l));
    default: throw new IllegalArgumentException(`unknown to: ${to}`);
  }
}

// Java: ProbeNumbers#math(JsonNode)
function math(a) {
  const op = need(a, 'op');
  const x = typed(a.a);
  const y = a.b !== undefined ? typed(a.b) : null;
  if (x !== null && x.t === 'float') {
    const f = x.x;
    switch (op) {
      case 'round': return num('int', FloatMath.round(f));
      case 'abs': return num('float', FloatMath.abs(f));
      default: throw new IllegalArgumentException(`unknown float math op: ${op}`);
    }
  }
  const d = unbox(x, 'double');
  const e = y === null ? 0 : unbox(y, 'double');
  const R = (v) => num('double', v);
  switch (op) {
    case 'round': return num('long', JMath.round(d));
    case 'rint': return R(JMath.rint(d));
    case 'floor': return R(JMath.floor(d));
    case 'ceil': return R(JMath.ceil(d));
    case 'sqrt': return R(JMath.sqrt(d));
    case 'cbrt': return R(JMath.cbrt(d));
    case 'pow': return R(JMath.pow(d, e));
    case 'exp': return R(JMath.exp(d));
    case 'log': return R(JMath.log(d));
    case 'log10': return R(JMath.log10(d));
    case 'sin': return R(JMath.sin(d));
    case 'cos': return R(JMath.cos(d));
    case 'tan': return R(JMath.tan(d));
    case 'atan': return R(JMath.atan(d));
    case 'atan2': return R(JMath.atan2(d, e));
    case 'hypot': return R(JMath.hypot(d, e));
    case 'sinh': return R(JMath.sinh(d));
    case 'strictExp': return R(StrictMath.exp(d));
    case 'strictLog': return R(StrictMath.log(d));
    case 'strictPow': return R(StrictMath.pow(d, e));
    case 'strictLog10': return R(StrictMath.log10(d));
    case 'strictSin': return R(StrictMath.sin(d));
    case 'strictCos': return R(StrictMath.cos(d));
    case 'strictSqrt': return R(StrictMath.sqrt(d));
    case 'abs': return R(JMath.abs(d));
    default: throw new IllegalArgumentException(`unknown math op: ${op}`);
  }
}

// Java: String concatenation "" + boxed value
function concat(x) {
  if (x === null) return 'null';
  switch (x.t) {
    case 'char': return String.fromCharCode(x.x);
    case 'double': return doubleToString(x.x);
    case 'float': return floatToString(x.x);
    default: return String(x.x);
  }
}

// Java: ProbeNumbers#tostr(JsonNode)
function tostr(a) {
  const op = need(a, 'op');
  const x = typed(a.a);
  const radix = a.radix !== undefined ? Integer.parseInt(asText(a.radix)) : 10;
  switch (op) {
    case 'intToString': return Integer.toString(unbox(x, 'int'));
    case 'intToStringRadix': return Integer.toString(unbox(x, 'int'), radix);
    case 'longToStringRadix': return Long.toString(unbox(x, 'long'), radix);
    case 'intHex': return Integer.toHexString(unbox(x, 'int'));
    case 'intOctal': return Integer.toOctalString(unbox(x, 'int'));
    case 'intBinary': return Integer.toBinaryString(unbox(x, 'int'));
    case 'longHex': return Long.toHexString(unbox(x, 'long'));
    case 'longBinary': return Long.toBinaryString(unbox(x, 'long'));
    case 'unsignedInt': return Integer.toUnsignedString(unbox(x, 'int'));
    case 'unsignedLong': return Long.toUnsignedString(unbox(x, 'long'));
    case 'doubleToString': return doubleToString(unbox(x, 'double'));
    case 'floatToString': return floatToString(unbox(x, 'float'));
    case 'doubleHex': return Double.toHexString(unbox(x, 'double'));
    case 'concat': return concat(x);
    case 'valueOf': return concat(x);
    case 'charDigit': return num('int', digit(unbox(x, 'char'), radix));
    case 'forDigit': return num('char', forDigit(unbox(x, 'int'), radix));
    case 'charNumeric': return num('int', getNumericValue(unbox(x, 'char')));
    default: throw new IllegalArgumentException(`unknown tostr op: ${op}`);
  }
}

// Java: ProbeNumbers#mixed(JsonNode) (mixed-type compound expressions, SEMANTICS P4)
function mixed(a) {
  const kind = need(a, 'kind');
  const x = typed(a.a);
  const y = a.b !== undefined ? typed(a.b) : null;
  switch (kind) {
    case 'intPlusEqFloat': { const i = unbox(x, 'int'); return I(d2i(f32(f32(i) + unbox(y, 'float')))); }
    case 'intMulEqFloat': { const i = unbox(x, 'int'); return I(d2i(f32(f32(i) * unbox(y, 'float')))); }
    case 'intMulEqDouble': { const i = unbox(x, 'int'); return I(d2i(i * unbox(y, 'double'))); }
    case 'longDivFloat': return F(f32(l2f(unbox(x, 'long')) / unbox(y, 'float')));
    case 'longDivDouble': return D(l2d(unbox(x, 'long')) / unbox(y, 'double'));
    case 'msToSecFloat': return F(f32(l2f(unbox(x, 'long')) / 1000.0));
    case 'msToSecDouble': return D(l2d(unbox(x, 'long')) / 1000.0);
    case 'intDivInt': return I(idiv(unbox(x, 'int'), unbox(y, 'int')));
    case 'intDivIntToDouble': return D(idiv(unbox(x, 'int'), unbox(y, 'int')));
    case 'intDivIntAsDouble': return D(unbox(x, 'int') / unbox(y, 'int'));
    case 'intPlusHalfTrunc': return I(d2i(unbox(x, 'double') + 0.5));
    case 'intTimes10': return I(imul(unbox(x, 'int'), 10));
    case 'minValuePlus': return I(iadd(Integer.MIN_VALUE, unbox(x, 'int')));
    case 'charPlusInt': return I(iadd(0x61, unbox(x, 'int')));
    case 'charCastPlusInt': return num('char', i2c(iadd(0x61, unbox(x, 'int'))));
    case 'charConcat': return `a${unbox(x, 'int')}b`;
    case 'charPlusChar': return I(unbox(x, 'char') + unbox(y, 'char'));
    case 'charPlusPlus': { const c = unbox(x, 'char'); return num('char', i2c(c + 1)); }
    case 'bytePlusEq': { const b = unbox(x, 'byte'); return num('byte', i2b(b + unbox(y, 'int'))); }
    case 'shortMul': { const s = unbox(x, 'short'); return num('short', i2s(imul(s, unbox(y, 'short')))); }
    case 'floatFromInt': return F(f32(unbox(x, 'int')));
    case 'floatPlusDouble': return D(unbox(x, 'float') + unbox(y, 'double'));
    case 'floatSumTen': { let f = 0; for (let i = 0; i < 10; i++) f = f32(f + unbox(x, 'float')); return F(f); }
    case 'doubleSumTen': { let d = 0; for (let i = 0; i < 10; i++) d += unbox(x, 'double'); return D(d); }
    case 'ternaryBoxing': return '1';
    case 'ternaryNumeric': return doubleToString(unbox(x, 'int') > 0 ? 1.0 : 2.0);
    case 'doubleEqualsBoxed': return Object.is(unbox(x, 'double'), unbox(y, 'double'));
    case 'longEqualsInt': return unbox(x, 'long') === BigInt(unbox(y, 'int'));
    case 'longEqualsIntObj': return y !== null && y.t === 'long' && unbox(x, 'long') === y.x;
    default: throw new IllegalArgumentException(`unknown mixed kind: ${kind}`);
  }
}

// Java: Object#hashCode() of a boxed value
function hashCodeOf(x) {
  switch (x.t) {
    case 'int': return Integer.hashCode(x.x);
    case 'long': return Long.hashCode(x.x);
    case 'short': return Short.hashCode(x.x);
    case 'byte': return Byte.hashCode(x.x);
    case 'char': return Char.hashCode(x.x);
    case 'double': return Double.hashCode(x.x);
    case 'float': return Float.hashCode(x.x);
    case 'bool': return JBoolean.hashCode(x.x);
    default: return stringHashCode(x.x);
  }
}

// Java: ProbeNumbers#hash(JsonNode)
function hash(a) {
  const x = typed(a.a);
  return num('int', x === null ? 0 : hashCodeOf(x));
}

// Java: Comparable#compareTo(Object) of two boxed values
function compareTo(x, y) {
  const param = { int: 'anotherInteger', long: 'anotherLong', short: 'anotherShort', byte: 'anotherByte', char: 'anotherCharacter', double: 'anotherDouble', float: 'anotherFloat', bool: 'b' }[x.t];
  if (y === null) throw new NullPointerException(`Cannot read field "value" because "${param}" is null`);
  const v = unbox(y, x.t);
  switch (x.t) {
    case 'int': return Integer.compare(x.x, v);
    case 'long': return Long.compare(x.x, v);
    case 'short': return Short.compare(x.x, v);
    case 'byte': return Byte.compare(x.x, v);
    case 'char': return Char.compare(x.x, v);
    case 'double': return Double.compare(x.x, v);
    case 'float': return Float.compare(x.x, v);
    case 'bool': return JBoolean.compare(x.x, v);
    default: return x.x < v ? -1 : x.x > v ? 1 : 0;
  }
}

// Java: Object#equals(Object) of two boxed values
function equalsOf(x, y) {
  if (y === null || x.t !== y.t) return false;
  if (x.t === 'double' || x.t === 'float') return Double.doubleToLongBits(x.x) === Double.doubleToLongBits(y.x);
  return x.x === y.x;
}

// Java: ProbeNumbers#compare(JsonNode)
function compare(a) {
  const x = typed(a.a);
  const y = typed(a.b);
  if (x === null) throw new NullPointerException();
  const c = compareTo(x, y);
  return { compareTo: num('int', c), equals: equalsOf(x, y) };
}
