// java.nio.charset subset used by morfologik (UTF-8, ISO-8859-1, US-ASCII, UTF-16, UTF-16BE/LE, windows-1252), encoders/decoders with REPORT actions.
import {
  IllegalArgumentException, IllegalCharsetNameException, MalformedInputException, UnmappableCharacterException, UnsupportedCharsetException,
} from '../java/errors.js';

const CP1252_HIGH = [
  0x20ac, -1, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160, 0x2039, 0x0152, -1, 0x017d, -1,
  -1, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, -1, 0x017e, 0x0178,
];
const CP1252_REVERSE = new Map();
for (let i = 0; i < 32; i++) if (CP1252_HIGH[i] >= 0) CP1252_REVERSE.set(CP1252_HIGH[i], 0x80 + i);

const UTF8_FATAL = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

// the charset kinds and their names/aliases (java.nio.charset.Charset#aliases, lower-cased)
const CHARSETS = [
  { name: 'UTF-8', kind: 'utf8', maxBytes: 3.0, maxChars: 1.0, aliases: ['utf-8', 'utf8', 'unicode-1-1-utf-8'] },
  { name: 'ISO-8859-1', kind: 'latin1', maxBytes: 1.0, maxChars: 1.0, aliases: ['iso-8859-1', 'iso8859_1', 'iso_8859-1', 'iso_8859-1:1987', 'iso8859-1', 'latin1', 'l1', 'ibm819', 'cp819', 'csisolatin1', '819', 'ibm-819', 'iso-ir-100', '8859_1', 'iso_8859_1'] },
  { name: 'US-ASCII', kind: 'ascii', maxBytes: 1.0, maxChars: 1.0, aliases: ['us-ascii', 'ascii', 'iso646-us', 'us', 'ansi_x3.4-1968', 'cp367', 'csascii', 'ibm367', 'iso_646.irv:1991', 'ascii7', '646', 'iso-ir-6', 'ansi_x3.4-1986', 'default', 'iso_646.irv:1983'] },
  { name: 'UTF-16', kind: 'utf16', maxBytes: 4.0, maxChars: 0.5, aliases: ['utf-16', 'utf16', 'utf_16', 'unicode', 'unicodebig'] },
  { name: 'UTF-16BE', kind: 'utf16be', maxBytes: 2.0, maxChars: 0.5, aliases: ['utf-16be', 'utf_16be', 'iso-10646-ucs-2', 'x-utf-16be', 'unicodebigunmarked'] },
  { name: 'UTF-16LE', kind: 'utf16le', maxBytes: 2.0, maxChars: 0.5, aliases: ['utf-16le', 'utf_16le', 'x-utf-16le', 'unicodelittleunmarked'] },
  { name: 'windows-1252', kind: 'cp1252', maxBytes: 1.0, maxChars: 1.0, aliases: ['windows-1252', 'cp1252', 'cp5348', 'ibm-1252', 'ibm1252'] },
];
const BY_NAME = new Map();
for (const c of CHARSETS) for (const a of c.aliases) BY_NAME.set(a, c);

const isSurrogate = (c) => c >= 0xd800 && c <= 0xdfff;

// Java: java.nio.charset.Charset
export class Charset {
  constructor(def) {
    this.def = def;
    this.kind = def.kind;
    this.maxBytesPerChar = Math.fround(def.maxBytes);
    this.maxCharsPerByte = Math.fround(def.maxChars);
  }

  // Java: Charset#name()
  name() {
    return this.def.name;
  }

  // Java: Charset#toString()
  toString() {
    return this.def.name;
  }

  // Java: CharsetEncoder#encode(CharBuffer,ByteBuffer,boolean)+flush with REPORT actions; writes into out, returns the byte count; throws CharacterCodingException subclasses
  encodeInto(s, out) {
    const n = s.length;
    let o = 0;
    switch (this.kind) {
      case 'utf8': {
        for (let i = 0; i < n; i++) {
          const c = s.charCodeAt(i);
          if (c < 0x80) out[o++] = c;
          else if (c < 0x800) {
            out[o++] = 0xc0 | (c >> 6);
            out[o++] = 0x80 | (c & 0x3f);
          } else if (isSurrogate(c)) {
            if (c >= 0xdc00 || i + 1 >= n) throw new MalformedInputException(`Input length = 1`);
            const d = s.charCodeAt(i + 1);
            if (d < 0xdc00 || d > 0xdfff) throw new MalformedInputException(`Input length = 1`);
            const cp = ((c - 0xd800) << 10) + (d - 0xdc00) + 0x10000;
            out[o++] = 0xf0 | (cp >> 18);
            out[o++] = 0x80 | ((cp >> 12) & 0x3f);
            out[o++] = 0x80 | ((cp >> 6) & 0x3f);
            out[o++] = 0x80 | (cp & 0x3f);
            i++;
          } else {
            out[o++] = 0xe0 | (c >> 12);
            out[o++] = 0x80 | ((c >> 6) & 0x3f);
            out[o++] = 0x80 | (c & 0x3f);
          }
        }
        return o;
      }
      case 'latin1':
      case 'ascii': {
        const lim = this.kind === 'latin1' ? 0xff : 0x7f;
        for (let i = 0; i < n; i++) {
          const c = s.charCodeAt(i);
          if (c > lim) {
            if (isSurrogate(c)) this.#surrogateError(s, i);
            throw new UnmappableCharacterException('Input length = 1');
          }
          out[o++] = c;
        }
        return o;
      }
      case 'cp1252': {
        for (let i = 0; i < n; i++) {
          const c = s.charCodeAt(i);
          if (c < 0x80 || (c >= 0xa0 && c <= 0xff)) out[o++] = c;
          else {
            const b = CP1252_REVERSE.get(c);
            if (b === undefined) {
              if (isSurrogate(c)) this.#surrogateError(s, i);
              throw new UnmappableCharacterException('Input length = 1');
            }
            out[o++] = b;
          }
        }
        return o;
      }
      default: {
        const le = this.kind === 'utf16le';
        if (this.kind === 'utf16' && n > 0) {
          out[o++] = 0xfe;
          out[o++] = 0xff;
        }
        for (let i = 0; i < n; i++) {
          const c = s.charCodeAt(i);
          if (isSurrogate(c)) {
            const lone = c >= 0xdc00 || i + 1 >= n || s.charCodeAt(i + 1) < 0xdc00 || s.charCodeAt(i + 1) > 0xdfff;
            if (lone) throw new MalformedInputException('Input length = 1');
          }
          if (le) {
            out[o++] = c & 0xff;
            out[o++] = c >> 8;
          } else {
            out[o++] = c >> 8;
            out[o++] = c & 0xff;
          }
        }
        return o;
      }
    }
  }

  // single-byte encoders: a lone surrogate is malformed, a valid pair is unmappable
  #surrogateError(s, i) {
    const c = s.charCodeAt(i);
    const d = i + 1 < s.length ? s.charCodeAt(i + 1) : 0;
    if (c < 0xdc00 && d >= 0xdc00 && d <= 0xdfff) throw new UnmappableCharacterException('Input length = 2');
    throw new MalformedInputException('Input length = 1');
  }

  // Java: CharsetDecoder#decode(ByteBuffer,CharBuffer,boolean)+flush with REPORT actions on a[off,off+len)
  decode(a, off, len) {
    const end = off + len;
    switch (this.kind) {
      case 'utf8': {
        let i = off;
        while (i < end && a[i] < 0x80) i++;
        if (i === end) return len === 0 ? '' : asciiString(a, off, end);
        try {
          return UTF8_FATAL.decode(a.subarray(off, end));
        } catch {
          throw new MalformedInputException('Input length = 1');
        }
      }
      case 'latin1':
        return asciiString(a, off, end);
      case 'ascii': {
        for (let i = off; i < end; i++) if (a[i] > 0x7f) throw new MalformedInputException('Input length = 1');
        return asciiString(a, off, end);
      }
      case 'cp1252': {
        let s = '';
        for (let i = off; i < end; i++) {
          const b = a[i];
          if (b >= 0x80 && b < 0xa0) {
            const c = CP1252_HIGH[b - 0x80];
            if (c < 0) throw new UnmappableCharacterException('Input length = 1');
            s += String.fromCharCode(c);
          } else s += String.fromCharCode(b);
        }
        return s;
      }
      default: {
        let i = off;
        let le = this.kind === 'utf16le';
        if (this.kind === 'utf16' && len >= 2) {
          if (a[i] === 0xfe && a[i + 1] === 0xff) i += 2;
          else if (a[i] === 0xff && a[i + 1] === 0xfe) {
            le = true;
            i += 2;
          }
        }
        let s = '';
        let high = false;
        for (; i + 1 < end; i += 2) {
          const c = le ? a[i] | (a[i + 1] << 8) : (a[i] << 8) | a[i + 1];
          if (high) {
            if (c < 0xdc00 || c > 0xdfff) throw new MalformedInputException('Input length = 1');
            high = false;
          } else if (c >= 0xd800 && c <= 0xdbff) high = true;
          else if (c >= 0xdc00 && c <= 0xdfff) throw new MalformedInputException('Input length = 1');
          s += String.fromCharCode(c);
        }
        if (high || i < end) throw new MalformedInputException('Input length = 1');
        return s;
      }
    }
  }
}

// Java: new String(byte[],Charset) (malformed/unmappable input -> U+FFFD)
Charset.prototype.decodeLenient = function decodeLenient(a, off, len) {
  try {
    return this.decode(a, off, len);
  } catch {
    const end = off + len;
    switch (this.kind) {
      case 'utf8':
        return new TextDecoder('utf-8', { fatal: false, ignoreBOM: true }).decode(a.subarray(off, end));
      case 'utf16le':
        return new TextDecoder('utf-16le', { fatal: false, ignoreBOM: true }).decode(a.subarray(off, end));
      case 'utf16':
      case 'utf16be':
        return new TextDecoder('utf-16be', { fatal: false, ignoreBOM: true }).decode(a.subarray(off, end));
      default: {
        let s = '';
        for (let i = off; i < end; i++) {
          const b = a[i];
          if (this.kind === 'ascii' && b > 0x7f) s += '\ufffd';
          else if (this.kind === 'cp1252' && b >= 0x80 && b < 0xa0) s += CP1252_HIGH[b - 0x80] < 0 ? '\ufffd' : String.fromCharCode(CP1252_HIGH[b - 0x80]);
          else s += String.fromCharCode(b);
        }
        return s;
      }
    }
  }
};

// bytes 0..255 -> chars of the same code
function asciiString(a, off, end) {
  let s = '';
  for (let i = off; i < end; i += 4096) s += String.fromCharCode.apply(null, a.subarray(i, Math.min(end, i + 4096)));
  return s;
}

const INSTANCES = new Map();

// Java: java.nio.charset.Charset#checkName(String)
function checkName(s) {
  const n = s.length;
  if (n === 0) throw new IllegalCharsetNameException(s);
  for (let i = 0; i < n; i++) {
    const c = s.charCodeAt(i);
    const alnum = (c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a) || (c >= 0x30 && c <= 0x39);
    if (alnum) continue;
    if (i !== 0 && (c === 0x2d || c === 0x2b || c === 0x2e || c === 0x3a || c === 0x5f)) continue;
    throw new IllegalCharsetNameException(s);
  }
}

// Java: Charset#forName(String)
export function forName(name) {
  if (name === null || name === undefined) throw new IllegalArgumentException('Null charset name');
  checkName(name);
  const def = BY_NAME.get(name.toLowerCase());
  if (def === undefined) throw new UnsupportedCharsetException(name);
  let cs = INSTANCES.get(def);
  if (cs === undefined) INSTANCES.set(def, (cs = new Charset(def)));
  return cs;
}

// Java: Charset#isSupported(String)
export function isSupported(name) {
  checkName(name);
  return BY_NAME.has(name.toLowerCase());
}
