// java.net.URLDecoder (UTF-8) and the java.net.URI subset the HTTP server needs (parse/validate, getPath, getRawPath/Query, relativize).
import { Exception, IllegalArgumentException, NullPointerException, NumberFormatException, IndexOutOfBoundsException, UnsupportedEncodingException } from './errors.js';
import { digit } from './charDigit.js';
import { decodeUtf8Java } from './charset.js';

// Java: java.net.URISyntaxException
export class URISyntaxException extends Exception {
  static FQCN = 'java.net.URISyntaxException';

  // Java: URISyntaxException#URISyntaxException(String,String,int)
  constructor(input, reason, index = -1) {
    super(reason);
    if (input === null || input === undefined || reason === null || reason === undefined) throw new NullPointerException();
    this.input = input;
    this.reason = reason;
    this.index = index;
    this.message = this.getMessage(); // JS-side view of the overridden getMessage()
  }

  // Java: URISyntaxException#getMessage()
  getMessage() {
    return `${this.reason}${this.index > -1 ? ` at index ${this.index}` : ''}: ${this.input}`;
  }
}

// Java: NumberFormatException#forCharSequence(CharSequence,int,int,int)
function forCharSequence(s, begin, end, errorIndex) {
  return new NumberFormatException(`Error at index ${errorIndex - begin} in: "${s.substring(begin, end)}"`);
}

// Java: Integer#parseInt(CharSequence,int,int,int) (JDK 17)
function parseIntRange(s, beginIndex, endIndex, radix) {
  if (beginIndex < 0 || beginIndex > endIndex || endIndex > s.length) throw new IndexOutOfBoundsException();
  let negative = false;
  let i = beginIndex;
  let limit = -2147483647;
  if (i < endIndex) {
    const firstChar = s.charCodeAt(i);
    if (firstChar < 0x30) { // Possible leading "+" or "-"
      if (firstChar === 0x2d) {
        negative = true;
        limit = -2147483648;
      } else if (firstChar !== 0x2b) {
        throw forCharSequence(s, beginIndex, endIndex, i);
      }
      i++;
      if (i === endIndex) throw forCharSequence(s, beginIndex, endIndex, i); // Cannot have lone "+" or "-"
    }
    const multmin = Math.trunc(limit / radix);
    let result = 0;
    while (i < endIndex) {
      const d = digit(s.charCodeAt(i), radix);
      if (d < 0 || result < multmin) throw forCharSequence(s, beginIndex, endIndex, i);
      result *= radix;
      if (result < limit + d) throw forCharSequence(s, beginIndex, endIndex, i);
      i++;
      result -= d;
    }
    return negative ? result : -result;
  }
  throw new NumberFormatException('');
}

// Java: URLDecoder#decode(String,String); only UTF-8 is used by the server
export function decodeUrl(s, enc = 'UTF-8') {
  if (enc.toUpperCase() !== 'UTF-8' && enc.toUpperCase() !== 'UTF8') throw new UnsupportedEncodingException(enc);
  let needToChange = false;
  const numChars = s.length;
  let sb = '';
  let i = 0;
  while (i < numChars) {
    let c = s[i];
    switch (c) {
      case '+':
        sb += ' ';
        i++;
        needToChange = true;
        break;
      case '%': {
        const bytes = [];
        try {
          // process a sequence of consecutive escapes into bytes
          while (i + 2 < numChars && c === '%') {
            const v = parseIntRange(s, i + 1, i + 3, 16);
            if (v < 0) throw new IllegalArgumentException('URLDecoder: Illegal hex characters in escape (%) pattern - negative value');
            bytes.push(v & 0xff);
            i += 3;
            if (i < numChars) c = s[i];
          }
          // A trailing, incomplete byte encoding such as "%x" will cause an exception to be thrown
          if (i < numChars && c === '%') throw new IllegalArgumentException('URLDecoder: Incomplete trailing escape (%) pattern');
          sb += decodeUtf8Java(Uint8Array.from(bytes));
        } catch (e) {
          if (e instanceof NumberFormatException) {
            throw new IllegalArgumentException(`URLDecoder: Illegal hex characters in escape (%) pattern - ${e.getMessage()}`);
          }
          throw e;
        }
        needToChange = true;
        break;
      }
      default:
        sb += c;
        i++;
        break;
    }
  }
  return needToChange ? sb : s;
}

// Java: URLDecoder (static decode)
export const URLDecoder = { decode: decodeUrl };

// Java: URLEncoder#encode(String,String) for UTF-8: [a-zA-Z0-9.-*_] kept, space -> '+', other chars %XX of the UTF-8 bytes; unpaired surrogates become '?'
export function encodeUrl(s, enc = 'UTF-8') {
  if (enc.toUpperCase() !== 'UTF-8' && enc.toUpperCase() !== 'UTF8') throw new UnsupportedEncodingException(enc);
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (ALPHA(c) || DIGIT(c) || c === 0x2e || c === 0x2d || c === 0x2a || c === 0x5f) {
      out += s[i];
    } else if (c === 0x20) {
      out += '+';
    } else {
      let bytes;
      if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length && s.charCodeAt(i + 1) >= 0xdc00 && s.charCodeAt(i + 1) <= 0xdfff) {
        bytes = Buffer.from(s.substring(i, i + 2), 'utf8');
        i++;
      } else if (c >= 0xd800 && c <= 0xdfff) {
        bytes = Buffer.from('?', 'utf8');
      } else {
        bytes = Buffer.from(s[i], 'utf8');
      }
      for (const b of bytes) out += `%${b.toString(16).toUpperCase().padStart(2, '0')}`;
    }
  }
  return out;
}

// Java: URLEncoder (static encode)
export const URLEncoder = { encode: encodeUrl };

const ALPHA = (c) => (c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a);
const DIGIT = (c) => c >= 0x30 && c <= 0x39;
const HEX = (c) => DIGIT(c) || (c >= 0x41 && c <= 0x46) || (c >= 0x61 && c <= 0x66);
const UNRESERVED = (c) => ALPHA(c) || DIGIT(c) || '-_.!~*\'()'.includes(String.fromCharCode(c));
const set = (extra) => (c) => UNRESERVED(c) || extra.includes(String.fromCharCode(c));
const L_SCHEME = (c) => ALPHA(c) || DIGIT(c) || '+-.'.includes(String.fromCharCode(c));
const L_PATH = set(':@&=+$,;/');
const L_URIC = set(';/?:@&=+$,[]');
const L_AUTH = set('$,;:@&=+-.[]');

// Java: Character.isSpaceChar / isISOControl for the "visible non-US-ASCII" escape rule of URI
const isSpaceChar = (c) => /^[\p{Zs}\p{Zl}\p{Zp}]$/u.test(String.fromCharCode(c));
const isISOControl = (c) => c <= 0x1f || (c >= 0x7f && c <= 0x9f);

// Java: URI.Parser (RFC 2396 with Java's deviations); input -> {scheme, authority, path, query, fragment, opaque}
function parseUri(input) {
  const n = input.length;
  const fail = (reason, p) => new URISyntaxException(input, reason, p);
  // Java: URI.Parser#scan(int,int,long,long) with escape handling (index of first char not in the class)
  const scanClass = (start, end, ok) => {
    let p = start;
    while (p < end) {
      const c = input.charCodeAt(p);
      if (ok(c)) {
        p++;
        continue;
      }
      if (c === 0x25) {
        if (p + 3 <= end && HEX(input.charCodeAt(p + 1)) && HEX(input.charCodeAt(p + 2))) {
          p += 3;
          continue;
        }
        throw fail('Malformed escape pair', p);
      } else if (c > 128 && !isSpaceChar(c) && !isISOControl(c)) {
        p++;
        continue;
      }
      break;
    }
    return p;
  };
  const checkChars = (start, end, ok, what) => {
    const p = scanClass(start, end, ok);
    if (p < end) throw fail(`Illegal character in ${what}`, p);
  };
  const scanStop = (start, end, stop) => {
    let p = start;
    while (p < end && !stop.includes(input[p])) p++;
    return p;
  };
  const r = { scheme: null, authority: null, path: null, query: null, fragment: null, opaque: false };
  const parseHierarchical = (start) => {
    let p = start;
    if (input[p] === '/' && input[p + 1] === '/') {
      p += 2;
      const q = scanStop(p, n, '/?#');
      if (q > p) {
        checkChars(p, q, L_AUTH, 'authority');
        // Java: Parser#parseServer: literal IPv6 host needs a closing bracket (a failed server parse of an authority with brackets is rethrown)
        const hostStart = input.lastIndexOf('@', q - 1) >= p ? input.lastIndexOf('@', q - 1) + 1 : p;
        if (input[hostStart] === '[') {
          const close = input.indexOf(']', hostStart + 1);
          const cq = close >= 0 && close < q ? close : q;
          if (!(cq > hostStart + 1 && cq < q)) throw fail('Expected closing bracket for IPv6 address', cq);
        }
        r.authority = input.substring(p, q);
        p = q;
      } else if (q >= n) {
        throw fail('Expected authority', p);
      }
    }
    let q = scanStop(p, n, '?#');
    checkChars(p, q, L_PATH, 'path');
    r.path = input.substring(p, q);
    p = q;
    if (input[p] === '?') {
      p++;
      q = scanStop(p, n, '#');
      checkChars(p, q, L_URIC, 'query');
      r.query = input.substring(p, q);
      p = q;
    }
    return p;
  };
  let p = 0;
  // scan(0, n, "/?#", ":"): -1 when '/', '?' or '#' comes before ':'
  let colon = -1;
  for (let i = 0; i < n; i++) {
    const ch = input[i];
    if ('/?#'.includes(ch)) break;
    if (ch === ':') {
      colon = i;
      break;
    }
  }
  if (colon >= 0) {
    if (colon === 0) throw fail('Expected scheme name', 0);
    if (!ALPHA(input.charCodeAt(0))) throw fail('Illegal character in scheme name', 0);
    for (let i = 1; i < colon; i++) if (!L_SCHEME(input.charCodeAt(i))) throw fail('Illegal character in scheme name', i);
    r.scheme = input.substring(0, colon);
    p = colon + 1;
    if (input[p] === '/') {
      p = parseHierarchical(p);
    } else {
      const q = scanStop(p, n, '#');
      if (q <= p) throw fail('Expected scheme-specific part', p);
      checkChars(p, q, L_URIC, 'opaque part');
      r.opaque = true;
      p = q;
    }
  } else {
    p = parseHierarchical(0);
  }
  if (input[p] === '#') {
    checkChars(p + 1, n, L_URIC, 'fragment');
    r.fragment = input.substring(p + 1, n);
    p = n;
  }
  if (p < n) throw fail('Expected end of URI', p);
  return r;
}

// Java: URI.decode(String) (percent escapes as UTF-8, malformed -> U+FFFD)
function uriDecode(s) {
  if (s === null) return null;
  if (!s.includes('%')) return s;
  let out = '';
  let i = 0;
  while (i < s.length) {
    if (s[i] !== '%') {
      out += s[i++];
      continue;
    }
    const bytes = [];
    while (i < s.length && s[i] === '%') {
      bytes.push(parseInt(s.substr(i + 1, 2), 16));
      i += 3;
    }
    out += decodeUtf8Java(Uint8Array.from(bytes));
  }
  return out;
}

// Java: URI.normalize(String) for hierarchical paths (dot segments, redundant slashes)
function normalizePath(ps) {
  if (!/(^|\/)\.\.?(\/|$)|\/\//.test(ps)) return ps;
  const absolute = ps.startsWith('/');
  const parts = ps.split('/').filter((x) => x !== '');
  const last = parts.length > 0 ? parts[parts.length - 1] : '';
  const stack = [];
  for (const seg of parts) {
    if (seg === '.') continue;
    if (seg === '..') {
      if (stack.length > 0 && stack[stack.length - 1] !== '..') stack.pop();
      else stack.push(seg);
      continue;
    }
    stack.push(seg);
  }
  let res = stack.join('/');
  if (absolute) res = `/${res}`;
  if ((ps.endsWith('/') || last === '.' || last === '..') && stack.length > 0 && !res.endsWith('/')) res += '/';
  return res;
}

// Java: java.net.URI (hierarchical subset)
export class URI {
  static FQCN = 'java.net.URI';

  // Java: URI#URI(String)
  constructor(str) {
    if (str === null || str === undefined) throw new NullPointerException();
    this.string = str;
    Object.assign(this, parseUri(str));
  }

  // Java: URI#getRawPath()
  getRawPath() {
    return this.opaque ? null : this.path;
  }

  // Java: URI#getPath()
  getPath() {
    return this.opaque ? null : uriDecode(this.path);
  }

  // Java: URI#getRawQuery()
  getRawQuery() {
    return this.query;
  }

  // Java: URI#relativize(URI)
  relativize(child) {
    if (child.opaque || this.opaque) return child;
    if ((this.scheme ?? '').toLowerCase() !== (child.scheme ?? '').toLowerCase() || this.scheme === null !== (child.scheme === null)) return child;
    if (this.authority !== child.authority) return child;
    let bp = normalizePath(this.path);
    const cp = normalizePath(child.path);
    if (bp !== cp) {
      if (!bp.endsWith('/')) bp += '/';
      if (!cp.startsWith(bp)) return child;
    }
    const v = Object.create(URI.prototype);
    Object.assign(v, { string: null, scheme: null, authority: null, opaque: false, path: cp.substring(bp.length), query: child.query, fragment: child.fragment });
    return v;
  }

  // Java: URI#toString() (reassembled from the components)
  toString() {
    return this.string ?? `${this.path}${this.query !== null ? `?${this.query}` : ''}${this.fragment !== null ? `#${this.fragment}` : ''}`;
  }
}
