// JS twin of harness op "num-tostring" (Harness.java#numToString).
import { doubleToString, floatToString } from '../../src/lib/java/toString.js';
import { NumberFormatException, NullPointerException, StringIndexOutOfBoundsException } from '../../src/lib/java/errors.js';

const LONG_MAX = (1n << 63n) - 1n;

// Java: Character.digit(char,16) for one UTF-16 code unit
function digit16(ch) {
  const c = ch.charCodeAt(0);
  if (c >= 0x30 && c <= 0x39) return c - 0x30;
  if (c >= 0x61 && c <= 0x66) return c - 0x61 + 10;
  if (c >= 0x41 && c <= 0x46) return c - 0x41 + 10;
  if (c >= 0xff21 && c <= 0xff26) return c - 0xff21 + 10;
  if (c >= 0xff41 && c <= 0xff46) return c - 0xff41 + 10;
  if (c >= 0xd800 && c <= 0xdfff) return -1;
  if (!/^\p{Nd}$/u.test(ch)) return -1;
  let start = c;
  while (start > 0 && /^\p{Nd}$/u.test(String.fromCharCode(start - 1))) start--;
  return (c - start) % 10;
}

// Java: NumberFormatException#forInputString(String,int)
function forInputString(s, radix) {
  return new NumberFormatException(`For input string: "${s}"${radix === 10 ? '' : ` under radix ${radix}`}`);
}

// Java: Long#parseLong(String,int) for radix 16 (accumulates a non-negative value)
function parseLong16(s) {
  const len = s.length;
  let i = 0;
  if (len > 0) {
    if (s.charCodeAt(0) < 0x30) {
      if (s[0] !== '+') throw forInputString(s, 16);
      if (len === 1) throw forInputString(s, 16);
      i++;
    }
    let result = 0n;
    for (; i < len; i++) {
      const d = digit16(s[i]);
      if (d < 0) throw forInputString(s, 16);
      result = result * 16n + BigInt(d);
    }
    return result;
  }
  throw forInputString(s, 16);
}

// Java: Long#parseLong(CharSequence,int,int,int) for radix 16, begin 0 (non-negative accumulation)
function parseLongRange16(s, endIndex) {
  const err = (i) => new NumberFormatException(`Error at index ${i} in: "${s.substring(0, endIndex)}"`);
  let i = 0;
  if (i < endIndex) {
    if (s.charCodeAt(i) < 0x30) {
      if (s[i] !== '+') throw err(i);
      i++;
      if (i === endIndex) throw err(i);
    }
    let result = 0n;
    for (; i < endIndex; i++) {
      const d = digit16(s[i]);
      if (d < 0) throw err(i);
      result = result * 16n + BigInt(d);
      if (result > LONG_MAX) throw err(i);
    }
    return result;
  }
  throw forInputString(s.substring(0, endIndex), 16);
}

// Java: Long.parseUnsignedLong(String,16)
function parseUnsignedLong16(s) {
  const len = s.length;
  if (len > 0) {
    if (s[0] === '-') throw new NumberFormatException(`Illegal leading minus sign on unsigned string ${s}.`);
    if (len <= 12) return parseLong16(s);
    const first = parseLongRange16(s, len - 1);
    const second = digit16(s[len - 1]);
    if (second < 0) throw new NumberFormatException(`Bad digit at end of ${s}`);
    const result = BigInt.asIntN(64, first * 16n + BigInt(second));
    const guard = 16n * (first >> 57n);
    if (guard >= 128n || (result >= 0n && guard >= 92n)) throw new NumberFormatException(`String value ${s} exceeds range of unsigned long.`);
    return BigInt.asUintN(64, result);
  }
  throw forInputString(s, 16);
}

// Java: JsonNode#asText() for a parsed JSON value (container nodes give "")
function asText(n) {
  if (n === null) return 'null';
  if (typeof n === 'string') return n;
  if (typeof n === 'number') return Number.isInteger(n) ? String(n) : doubleToString(n);
  if (typeof n === 'boolean') return String(n);
  return '';
}

// Java: JsonNode#iterator() (arrays: elements, objects: values, scalars: empty)
function nodeElements(n) {
  if (Array.isArray(n)) return n;
  if (n !== null && typeof n === 'object') return Object.values(n);
  return [];
}

// Java: String#substring(int) for beginIndex 2 (JDK 17 checkBoundsBeginEnd message)
function substring2(s) {
  if (s.length < 2) throw new StringIndexOutOfBoundsException(`begin 2, end ${s.length}, length ${s.length}`);
  return s.substring(2);
}

const hex = (v, w) => `0x${v.toString(16).padStart(w, '0')}`;

// Java: Harness#numToString(JsonNode)
export function run(a) {
  if (a.kind === undefined) {
    throw new NullPointerException('Cannot invoke "com.fasterxml.jackson.databind.JsonNode.asText()" because the return value of "com.fasterxml.jackson.databind.JsonNode.get(String)" is null');
  }
  const isFloat = asText(a.kind) === 'float';
  if (a.bits === undefined) {
    throw new NullPointerException('Cannot invoke "com.fasterxml.jackson.databind.JsonNode.iterator()" because the return value of "com.fasterxml.jackson.databind.JsonNode.get(String)" is null');
  }
  const dv = new DataView(new ArrayBuffer(8));
  const res = [];
  for (const b of nodeElements(a.bits)) {
    const v = parseUnsignedLong16(substring2(asText(b)));
    if (isFloat) {
      dv.setUint32(0, Number(BigInt.asUintN(32, v)));
      const f = dv.getFloat32(0);
      res.push({ bits: hex(dv.getUint32(0), 8), text: floatToString(f) });
    } else {
      dv.setBigUint64(0, v);
      const d = dv.getFloat64(0);
      res.push({ bits: hex(dv.getBigUint64(0), 16), text: doubleToString(d) });
    }
  }
  return res;
}
