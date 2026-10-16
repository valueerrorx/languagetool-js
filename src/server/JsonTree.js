// Jackson ObjectMapper#readTree subset for the 'data' parameter: first value is parsed, trailing content ignored (SEMANTICS S6).
import { Exception } from '../lib/java/errors.js';
import { doubleToString } from '../lib/java/toString.js';

// Java: com.fasterxml.jackson.core.JsonProcessingException
export class JsonProcessingException extends Exception {
  static FQCN = 'com.fasterxml.jackson.core.JsonProcessingException';
}

const MAX_DEPTH = 1000; // Jackson StreamReadConstraints default maxNestingDepth

// Java: JsonNode kinds (OBJECT, ARRAY, STRING, INT/DOUBLE number, BOOLEAN, NULL, MISSING)
export class JsonNode {
  // kind: 'object' | 'array' | 'string' | 'int' | 'double' | 'boolean' | 'null' | 'missing'; value: Map | Array | string | boolean
  constructor(kind, value) {
    this.kind = kind;
    this.value = value;
  }

  // Java: JsonNode#get(String) (null unless an object has the field)
  get(name) {
    return this.kind === 'object' && this.value.has(name) ? this.value.get(name) : null;
  }

  // Java: JsonNode#has(String)
  has(name) {
    return this.get(name) !== null;
  }

  // Java: JsonNode#fieldNames()
  fieldNames() {
    return this.kind === 'object' ? [...this.value.keys()] : [];
  }

  // Java: JsonNode#iterator() (object values, array elements, nothing for scalars)
  elements() {
    if (this.kind === 'object') return [...this.value.values()];
    if (this.kind === 'array') return this.value;
    return [];
  }

  // Java: JsonNode#asText()
  asText() {
    switch (this.kind) {
      case 'string': return this.value;
      case 'int': return this.value;
      case 'double': return doubleToString(this.value);
      case 'boolean': return this.value ? 'true' : 'false';
      case 'null': return 'null';
      default: return '';
    }
  }

  // Java: JsonNode#toString() (compact JSON)
  toString() {
    switch (this.kind) {
      case 'object': return `{${[...this.value].map(([k, v]) => `${quote(k)}:${v.toString()}`).join(',')}}`;
      case 'array': return `[${this.value.map((v) => v.toString()).join(',')}]`;
      case 'string': return quote(this.value);
      case 'missing': return '';
      default: return this.asText();
    }
  }
}

// Java: Jackson JsonStringEncoder#quoteAsString (escapes ", \ and control characters)
function quote(s) {
  let out = '"';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 0x22) out += '\\"';
    else if (c === 0x5c) out += '\\\\';
    else if (c < 0x20) {
      const short = { 8: '\\b', 9: '\\t', 10: '\\n', 12: '\\f', 13: '\\r' }[c];
      out += short ?? `\\u${c.toString(16).toUpperCase().padStart(4, '0')}`;
    } else out += s[i];
  }
  return `${out}"`;
}

const WS = ' \t\n\r';

// Java: ObjectMapper#readTree(String); throws JsonProcessingException for invalid JSON in the first value
export function readTree(text) {
  let p = 0;
  const n = text.length;
  const err = (msg) => new JsonProcessingException(`${msg} at offset ${p}`);
  const skipWs = () => {
    while (p < n && WS.includes(text[p])) p++;
  };
  const parseString = () => {
    p++; // opening quote
    let out = '';
    for (;;) {
      if (p >= n) throw err('Unexpected end-of-input in a String value');
      const ch = text[p];
      const c = text.charCodeAt(p);
      if (ch === '"') {
        p++;
        return out;
      }
      if (c < 0x20) throw err('Illegal unquoted character in String value');
      if (ch !== '\\') {
        out += ch;
        p++;
        continue;
      }
      p++;
      if (p >= n) throw err('Unexpected end-of-input in character escape sequence');
      const e = text[p++];
      const simple = { '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' }[e];
      if (simple !== undefined) {
        out += simple;
      } else if (e === 'u') {
        const hex = text.substr(p, 4);
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) throw err('Unexpected character in \\u escape');
        out += String.fromCharCode(parseInt(hex, 16));
        p += 4;
      } else {
        throw err('Unrecognized character escape');
      }
    }
  };
  const parseNumber = () => {
    const m = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(text.slice(p, p + 2000));
    if (m === null) throw err('Unexpected character in number');
    p += m[0].length;
    if (p < n && !WS.includes(text[p]) && !',]}'.includes(text[p])) throw err('Unexpected character after number');
    if (m[2] === undefined && m[3] === undefined) {
      const v = BigInt(m[0]);
      return new JsonNode('int', v.toString());
    }
    return new JsonNode('double', Number(m[0]));
  };
  const literal = (word, node) => {
    if (!text.startsWith(word, p)) throw err(`Unrecognized token '${/[A-Za-z]+/.exec(text.slice(p))?.[0] ?? text[p]}'`);
    p += word.length;
    if (p < n && /[A-Za-z0-9_$]/.test(text[p])) throw err('Unrecognized token');
    return node;
  };
  const parseValue = (depth) => {
    skipWs();
    if (p >= n) throw err('Unexpected end-of-input');
    const ch = text[p];
    if (ch === '{') {
      if (depth + 1 > MAX_DEPTH) throw err('Document nesting depth exceeds the maximum allowed');
      p++;
      const map = new Map();
      skipWs();
      if (text[p] === '}') {
        p++;
        return new JsonNode('object', map);
      }
      for (;;) {
        skipWs();
        if (text[p] !== '"') throw err('Unexpected character (expecting double-quote to start field name)');
        const key = parseString();
        skipWs();
        if (text[p] !== ':') throw err("Unexpected character (expected a colon after a field name)");
        p++;
        map.set(key, parseValue(depth + 1)); // last duplicate wins, first position kept
        skipWs();
        if (text[p] === ',') {
          p++;
          continue;
        }
        if (text[p] === '}') {
          p++;
          return new JsonNode('object', map);
        }
        throw err("Unexpected character (expected a comma or '}')");
      }
    }
    if (ch === '[') {
      if (depth + 1 > MAX_DEPTH) throw err('Document nesting depth exceeds the maximum allowed');
      p++;
      const items = [];
      skipWs();
      if (text[p] === ']') {
        p++;
        return new JsonNode('array', items);
      }
      for (;;) {
        items.push(parseValue(depth + 1));
        skipWs();
        if (text[p] === ',') {
          p++;
          continue;
        }
        if (text[p] === ']') {
          p++;
          return new JsonNode('array', items);
        }
        throw err("Unexpected character (expected a comma or ']')");
      }
    }
    if (ch === '"') return new JsonNode('string', parseString());
    if (ch === 't') return literal('true', new JsonNode('boolean', true));
    if (ch === 'f') return literal('false', new JsonNode('boolean', false));
    if (ch === 'n') return literal('null', new JsonNode('null', null));
    if (ch === '-' || (ch >= '0' && ch <= '9')) return parseNumber();
    throw err(`Unexpected character ('${ch}')`);
  };
  skipWs();
  if (p >= n) return new JsonNode('missing', null);
  return parseValue(0);
}
