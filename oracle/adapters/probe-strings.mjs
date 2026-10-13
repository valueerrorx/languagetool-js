// JS twin of harness op "probe-strings" (ProbeStrings.java + Probe.java): dispatches to src/lib/java string helpers.
import {
  javaTrim, javaStrip, stripLeading, stripTrailing, javaIsBlank, isEmpty, javaReplace, replaceChar, javaCompare,
  compareToIgnoreCase, equalsIgnoreCase, regionMatches, contentEquals, charAt, substring, subSequence, codePointAt,
  codePointBefore, codePointCount, offsetByCodePoints, codePoints, chars, indexOf, lastIndexOf, indexOfChar, contains,
  startsWith, endsWith, concat, toUpperCase, toLowerCase, repeat, join, lines, StringBuilder, CASE_INSENSITIVE_ORDER, stringHashCode,
} from '../../src/lib/java/strings.js';
import * as C from '../../src/lib/java/Character.js';
import { normalize, Form } from '../../src/lib/java/Normalizer.js';
import { StringTokenizer } from '../../src/lib/java/StringTokenizer.js';
import { objectsHash, arraysHashCode, listHashCode, setHashCode, mapHashCode } from '../../src/lib/java/hash.js';
import { Objects } from '../../src/lib/java/Objects.js';
import { Integer } from '../../src/lib/java/int.js';
import { Long } from '../../src/lib/java/long.js';
import { Float } from '../../src/lib/java/float.js';
import { Double, Short, Byte } from '../../src/lib/java/numbers.js';
import { i2c } from '../../src/lib/java/casts.js';
import { IllegalArgumentException, NullPointerException, isThrowable } from '../../src/lib/java/errors.js';

// marker error: op/fn owned by a later step (parity runner contract has no per-request notPorted)
class NotPorted extends Error {
  constructor(what) {
    super(`NOT PORTED: ${what}`);
    this.notPorted = true;
    this.javaClass = 'NOT PORTED';
  }
}

// Java: JsonNode#asText() of a scalar JSON value
function asText(n) {
  if (n === null || n === undefined) return 'null';
  if (typeof n === 'string') return n;
  return String(n);
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

// Java: JsonNode#asInt() of a number node
const asInt = (n) => (n === undefined || n === null ? 0 : Number(n));

// Java: Probe#num(String,Object) for int/char
const num = (t, x) => ({ t, v: Object.is(x, -0) ? '-0' : String(x) });
const I = (x) => num('int', x);

// Java: Probe#units(String)
const units = (s) => Array.from({ length: s.length }, (_, i) => s.charCodeAt(i));

// Java: ProbeStrings#str(String)
function strOut(s) {
  if (s === null) return null;
  return { s, units: units(s) };
}

// Java: Probe#typed(JsonNode) -> value carrying its Java hashCode
function typedHash(n) {
  if (n === undefined || n === null) return null;
  if (typeof n === 'string' || typeof n === 'boolean') return n;
  const t = n.t;
  const v = n.v === undefined || n.v === null ? null : asText(n.v);
  if (t === 'null') return null;
  if (n.bits !== undefined) {
    const b = Long.parseUnsignedLong(String(n.bits).substring(2), 16);
    return t === 'float'
      ? { hashCode: () => Float.hashCode(Float.intBitsToFloat(Number(BigInt.asIntN(32, b)))) }
      : { hashCode: () => Double.hashCode(Double.longBitsToDouble(b)) };
  }
  switch (t) {
    case 'int': return Integer.valueOf(v);
    case 'long': { const x = Long.valueOf(v); return { hashCode: () => Long.hashCode(x) }; }
    case 'short': return Short.valueOf(v);
    case 'byte': return Byte.valueOf(v);
    case 'char': { const c = v.startsWith('#') ? i2c(Integer.parseInt(v.substring(1))) : v.charCodeAt(0); return { hashCode: () => c }; }
    case 'double': { const x = Double.valueOf(v); return { hashCode: () => Double.hashCode(x) }; }
    case 'float': { const x = Float.valueOf(v); return { hashCode: () => Float.hashCode(x) }; }
    case 'string': return v;
    case 'bool': return v === 'true';
    default: throw new IllegalArgumentException(`unknown type: ${t}`);
  }
}

// Java: Probe#typedArray(JsonNode)
const typedArray = (arr) => (arr ? arr.map(typedHash) : []);

// Java: Probe#strings(JsonNode)
const strings = (arr) => arr.map((e) => (e === null ? null : asText(e)));

// Java: JsonNode#toString() (Jackson compact form)
function jsonCompact(n) {
  if (n === null) return 'null';
  if (typeof n === 'string') {
    let o = '"';
    for (let i = 0; i < n.length; i++) {
      const c = n.charCodeAt(i);
      const ch = n[i];
      if (ch === '"') o += '\\"';
      else if (ch === '\\') o += '\\\\';
      else if (c === 8) o += '\\b';
      else if (c === 12) o += '\\f';
      else if (c === 10) o += '\\n';
      else if (c === 13) o += '\\r';
      else if (c === 9) o += '\\t';
      else if (c < 0x20) o += `\\u${c.toString(16).toUpperCase().padStart(4, '0')}`;
      else o += ch;
    }
    return `${o}"`;
  }
  if (Array.isArray(n)) return `[${n.map(jsonCompact).join(',')}]`;
  return String(n);
}

// Java: ProbeStrings#run(JsonNode)
export function run(a) {
  const fn = need(a, 'fn');
  const s = str(a, 's');
  const t = str(a, 't');
  switch (fn) {
    case 'trim': return strOut(javaTrim(s));
    case 'strip': return strOut(javaStrip(s));
    case 'stripLeading': return strOut(stripLeading(s));
    case 'stripTrailing': return strOut(stripTrailing(s));
    case 'isBlank': return javaIsBlank(s);
    case 'isEmpty': return isEmpty(s);
    case 'replace': return strOut(javaReplace(s, t, str(a, 'u')));
    case 'replaceChar': return strOut(replaceChar(s, charAt(t, 0), charAt(str(a, 'u'), 0)));
    case 'replaceAll': case 'replaceFirst': case 'matches': case 'quote': case 'quoteReplacement': case 'split':
      throw new NotPorted(`regex ${fn} (S15-S18)`);
    case 'compareTo': return I(javaCompare(s, t));
    case 'compareToIgnoreCase': return I(compareToIgnoreCase(s, t));
    case 'equalsIgnoreCase': return s === null ? 'n/a' : equalsIgnoreCase(s, t);
    case 'equals': return s === t;
    case 'contentEquals': return contentEquals(s, new StringBuilder(t));
    case 'regionMatches': return regionMatches(s, a.ic === true, asInt(a.off), t, asInt(a.ooff), asInt(a.len));
    case 'hashCode': return I(stringHashCode(s));
    case 'hashCodes': return a.list.map((n) => I(stringHashCode(asText(n))));
    case 'objectsHash': return I(objectsHash(...typedArray(a.args)));
    case 'arraysHashCode': return I(arraysHashCode(typedArray(a.args)));
    case 'listHashCode': return I(listHashCode(typedArray(a.args)));
    case 'setHashCode': return I(setHashCode(new Set(typedArray(a.args))));
    case 'mapHashCode': {
      const m = new Map();
      const e = a.pairs;
      for (let i = 0; i + 1 < e.length; i += 2) m.set(asText(e[i]), e[i + 1] === null ? null : asText(e[i + 1]));
      return I(mapHashCode(m));
    }
    case 'boxedHash': {
      const v = typedHash(a.v);
      if (v === null) throw new NullPointerException();
      return I(Objects.hashCode(v));
    }
    case 'toUpperCase': return strOut('locale' in a ? toUpperCase(s, locale(str(a, 'locale'))) : toUpperCase(s));
    case 'toLowerCase': return strOut('locale' in a ? toLowerCase(s, locale(str(a, 'locale'))) : toLowerCase(s));
    case 'charCase': return charCase(asInt(a.cp));
    case 'charInfo': return charInfo(asInt(a.cp));
    case 'charAt': return num('char', charAt(s, asInt(a.i)));
    case 'substring': return strOut('e' in a ? substring(s, asInt(a.b), asInt(a.e)) : substring(s, asInt(a.b)));
    case 'subSequence': return strOut(subSequence(s, asInt(a.b), asInt(a.e)));
    case 'length': return { length: s.length, codePointCount: codePointCount(s, 0, s.length), units: units(s) };
    case 'codePointAt': return I(codePointAt(s, asInt(a.i)));
    case 'codePointBefore': return I(codePointBefore(s, asInt(a.i)));
    case 'offsetByCodePoints': return I(offsetByCodePoints(s, asInt(a.i), asInt(a.n)));
    case 'codePoints': return codePoints(s);
    case 'chars': return chars(s);
    case 'indexOf': return I('from' in a ? indexOf(s, t, asInt(a.from)) : indexOf(s, t));
    case 'lastIndexOf': return I('from' in a ? lastIndexOf(s, t, asInt(a.from)) : lastIndexOf(s, t));
    case 'indexOfChar': return I(indexOfChar(s, asInt(a.ch)));
    case 'contains': return contains(s, t);
    case 'startsWith': return 'off' in a ? startsWith(s, t, asInt(a.off)) : startsWith(s, t);
    case 'endsWith': return endsWith(s, t);
    case 'concat': return strOut(concat(s, t));
    case 'repeat': return strOut(repeat(s, asInt(a.n)));
    case 'join': return strOut(join(s, strings(a.list)));
    case 'lines': return lines(s);
    case 'valueOfNull': return `${Objects.toString(null)}:${`x${null}`}:${Objects.toString(null)}:${Objects.toString(null, 'd')}`;
    case 'sb': return sb(a);
    case 'tokenizer': return tokenizer(a, s, t);
    case 'normalize': return strOut(normalize(s, Form.valueOf(t)));
    case 'bytes': case 'fromBytes': throw new NotPorted('charsets (S24)');
    case 'caseInsensitiveOrder': return I(CASE_INSENSITIVE_ORDER(s, t));
    default: throw new IllegalArgumentException(`unknown fn: ${fn}`);
  }
}

// Java: Probe#locale(String); language tag, ROOT and default (en_US) only
function locale(tag) {
  if (tag === null || tag === 'default') return 'en';
  if (tag === 'ROOT') return '';
  return tag;
}

// Java: ProbeStrings#charCase(int)
function charCase(cp) {
  const m = {};
  m.toUpperCase = C.toUpperCase(cp);
  m.toLowerCase = C.toLowerCase(cp);
  m.toTitleCase = C.toTitleCase(cp);
  if (cp < 0x10000) {
    m.charToUpperCase = C.toUpperCase(cp);
    m.charToLowerCase = C.toLowerCase(cp);
  }
  const s = C.toChars(cp);
  m.strUpper = units(toUpperCase(s, ''));
  m.strLower = units(toLowerCase(s, ''));
  m.strUpperTr = units(toUpperCase(s, 'tr'));
  m.strLowerTr = units(toLowerCase(s, 'tr'));
  m.strUpperDefault = units(toUpperCase(s));
  m.strLowerDefault = units(toLowerCase(s));
  return m;
}

// Java: ProbeStrings#charInfo(int)
function charInfo(cp) {
  const m = {};
  for (const k of ['isWhitespace', 'isSpaceChar', 'isLetter', 'isDigit', 'isLetterOrDigit', 'isAlphabetic', 'isUpperCase', 'isLowerCase',
    'isTitleCase', 'isISOControl', 'isIdeographic', 'isJavaIdentifierStart']) m[k] = C[k](cp);
  m.isSurrogate = cp < 0x10000 && C.isSurrogate(cp);
  m.type = C.getType(cp);
  m.digit10 = C.digit(cp, 10);
  m.digit16 = C.digit(cp, 16);
  m.numericValue = C.getNumericValue(cp);
  m.script = C.UnicodeScript.of(cp).name();
  m.charCount = C.charCount(cp);
  m.isValidCodePoint = C.isValidCodePoint(cp);
  return m;
}

// Java: ProbeStrings#sb(JsonNode)
function sb(a) {
  const b = new StringBuilder(str(a, 's'));
  const trace = [];
  for (const op of a.ops) {
    const name = asText(op[0]);
    const step = { op: jsonCompact(op) };
    try {
      switch (name) {
        case 'append': b.append(asText(op[1])); break;
        case 'appendNull': b.append(null); break;
        case 'appendChar': b.appendChar(i2c(asInt(op[1]))); break;
        case 'appendInt': b.append(asInt(op[1])); break;
        case 'appendDouble': b.appendDouble(Double.parseDouble(asText(op[1]))); break;
        case 'appendFloat': b.appendFloat(Float.parseFloat(asText(op[1]))); break;
        case 'appendCodePoint': b.appendCodePoint(asInt(op[1])); break;
        case 'insert': b.insert(asInt(op[1]), asText(op[2])); break;
        case 'delete': b.delete(asInt(op[1]), asInt(op[2])); break;
        case 'deleteCharAt': b.deleteCharAt(asInt(op[1])); break;
        case 'replace': b.replace(asInt(op[1]), asInt(op[2]), asText(op[3])); break;
        case 'reverse': b.reverse(); break;
        case 'setLength': b.setLength(asInt(op[1])); break;
        case 'setCharAt': b.setCharAt(asInt(op[1]), i2c(asInt(op[2]))); break;
        case 'charAt': step.value = num('char', b.charAt(asInt(op[1]))); break;
        case 'substring': step.value = strOut(op.length > 2 ? b.substring(asInt(op[1]), asInt(op[2])) : b.substring(asInt(op[1]))); break;
        case 'indexOf': step.value = b.indexOf(asText(op[1])); break;
        case 'length': step.value = b.length(); break;
        default: throw new IllegalArgumentException(`unknown sb op: ${name}`);
      }
      step.state = strOut(b.toString());
    } catch (e) {
      step.error = { class: isThrowable(e) ? e.javaClass : e.constructor.name, message: e.message ?? null };
    }
    trace.push(step);
  }
  return trace;
}

// Java: ProbeStrings#tokenizer(JsonNode,String,String)
function tokenizer(a, s, delims) {
  const ret = 'returnDelims' in a && a.returnDelims === true;
  const st = new StringTokenizer(s, delims, ret);
  const l = [];
  while (st.hasMoreTokens()) l.push(st.nextToken());
  return l;
}
