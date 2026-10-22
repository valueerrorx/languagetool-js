// java.io helpers: BufferedReader#readLine line splitting on decoded text.
import { NullPointerException, UnsupportedEncodingException } from './errors.js';

// Java: BufferedReader#readLine() loop -> lines without terminators (\n, \r, \r\n; no trailing empty line)
export function readerLines(text) {
  const lines = [];
  let start = 0;
  const n = text.length;
  let i = 0;
  while (i < n) {
    const c = text[i];
    if (c === '\n' || c === '\r') {
      lines.push(text.slice(start, i));
      if (c === '\r' && text[i + 1] === '\n') i++;
      start = i + 1;
    }
    i++;
  }
  if (start < n) lines.push(text.slice(start));
  return lines;
}

// Java: Scanner#nextLine() loop -> lines without terminators (\r\n, \n, \r, U+2028, U+2029, U+0085; no trailing empty line)
export function scannerLines(text) {
  const lines = [];
  let start = 0;
  const n = text.length;
  let i = 0;
  while (i < n) {
    const c = text[i];
    if (c === '\n' || c === '\r' || c === '\u2028' || c === '\u2029' || c === '\u0085') {
      lines.push(text.slice(start, i));
      if (c === '\r' && text[i + 1] === '\n') i++;
      start = i + 1;
    }
    i++;
  }
  if (start < n) lines.push(text.slice(start));
  return lines;
}

// Java: new InputStreamReader(in, UTF_8) decoding (malformed input -> U+FFFD, BOM kept)
export function decodeUtf8(buf) {
  return new TextDecoder('utf-8', { fatal: false, ignoreBOM: true }).decode(buf);
}

// Java: java.io.StringReader (read(char[],int,int) as read(cbuf, off, len) -> count or -1)
export class StringReader {
  // Java: StringReader#StringReader(String)
  constructor(s) {
    if (s === null || s === undefined) throw new NullPointerException();
    this.str = s;
    this.next = 0;
  }

  // Java: StringReader#read(char[],int,int)
  read(cbuf, off, len) {
    if (len === 0) return 0;
    if (this.next >= this.str.length) return -1;
    const n = Math.min(this.str.length - this.next, len);
    for (let i = 0; i < n; i++) cbuf[off + i] = this.str.charCodeAt(this.next + i);
    this.next += n;
    return n;
  }

  // Java: StringReader#close()
  close() {}
}

// Java: java.io.BufferedReader over already decoded text (readLine() line rules of readerLines; null at the end; stateful)
export class BufferedReader {
  // Java: BufferedReader#BufferedReader(Reader)
  constructor(text) {
    if (text === null || text === undefined) throw new NullPointerException();
    this.text_ = text; // JS: decoded text (or a thunk producing it); split into lines on the first readLine
    this.lines_ = null;
    this.next = 0;
  }

  // JS: lazily split lines (most readers of cached dictionaries are never read)
  get lines() {
    if (this.lines_ === null) {
      this.lines_ = readerLines(typeof this.text_ === 'function' ? this.text_() : this.text_);
      this.text_ = null;
    }
    return this.lines_;
  }

  // Java: BufferedReader#readLine()
  readLine() {
    const lines = this.lines;
    return this.next < lines.length ? lines[this.next++] : null;
  }
}

// Java: sun.nio.cs.UTF_32 decoding (REPLACE): out-of-range or surrogate code points and a trailing partial unit -> U+FFFD, BOM kept
function decodeUtf32(bytes, start, le) {
  let out = '';
  let i = start;
  for (; i + 4 <= bytes.length; i += 4) {
    const cp = le ? (bytes[i] | (bytes[i + 1] << 8) | (bytes[i + 2] << 16) | (bytes[i + 3] << 24)) >>> 0
      : ((bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3]) >>> 0;
    out += cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff) ? '�' : String.fromCodePoint(cp);
  }
  if (i < bytes.length) out += '�';
  return out;
}

// Java: sun.nio.cs.MS1252 decoding: 0x80-0x9F table, undefined bytes 0x81,0x8D,0x8F,0x90,0x9D -> U+FFFD
const CP1252_80 = [0x20ac, 0xfffd, 0x201a, 0x192, 0x201e, 0x2026, 0x2020, 0x2021, 0x2c6, 0x2030, 0x160, 0x2039, 0x152, 0xfffd, 0x17d, 0xfffd,
  0xfffd, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x2dc, 0x2122, 0x161, 0x203a, 0x153, 0xfffd, 0x17e, 0x178];

// Java: sun.nio.cs.ISO_8859_15 decoding: latin1 except 8 positions
const LATIN9 = new Map([[0xa4, 0x20ac], [0xa6, 0x160], [0xa8, 0x161], [0xb4, 0x17d], [0xb8, 0x17e], [0xbc, 0x152], [0xbd, 0x153], [0xbe, 0x178]]);

// Java: new InputStreamReader(in, charsetName) over a byte array; unknown name -> UnsupportedEncodingException
export function inputStreamReader(buf, charsetName) {
  if (buf === null || buf === undefined) throw new NullPointerException();
  if (charsetName === null || charsetName === undefined) throw new NullPointerException('charsetName');
  const cs = charsetName.toLowerCase().replace(/_/g, '-');
  const bytes = Buffer.from(buf);
  let text;
  switch (cs) {
    case 'utf-8': case 'utf8': case 'unicode-1-1-utf-8':
      text = decodeUtf8(bytes);
      break;
    case 'iso-8859-1': case 'iso8859-1': case 'latin1': case 'l1': case 'iso-ir-100': case 'cp819': case 'ibm819': case 'iso88591':
      text = bytes.toString('latin1');
      break;
    case 'windows-1252': case 'cp1252': case 'ibm-1252': case 'ibm1252': case 'cp5348':
      text = Array.from(bytes, (b) => String.fromCharCode(b >= 0x80 && b < 0xa0 ? CP1252_80[b - 0x80] : b)).join('');
      break;
    case 'iso-8859-15': case 'iso8859-15': case 'latin9': case 'latin-9': case 'latin0': case 'l9': case '8859-15': case 'cp923': case 'ibm923':
    case 'ibm-923': case '923': case 'csiso885915': case 'csisolatin9': case 'csisolatin0': case 'iso8859-15-fdis':
      text = Array.from(bytes, (b) => String.fromCharCode(LATIN9.get(b) ?? b)).join('');
      break;
    case 'us-ascii': case 'ascii': case 'iso646-us': case 'cp367': case 'ibm367':
      text = Array.from(bytes, (b) => (b < 0x80 ? String.fromCharCode(b) : '�')).join('');
      break;
    case 'utf-16': case 'utf16': case 'unicode': case 'utf-16be': case 'utf-16le': case 'utf-16-be': case 'utf-16-le': {
      let le = cs === 'utf-16le' || cs === 'utf-16-le';
      let start = 0;
      if (cs === 'utf-16' || cs === 'utf16' || cs === 'unicode') {
        if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) start = 2;
        else if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) { le = true; start = 2; }
      }
      text = new TextDecoder(le ? 'utf-16le' : 'utf-16be', { ignoreBOM: true }).decode(bytes.subarray(start));
      break;
    }
    case 'utf-32': case 'utf32': case 'utf-32be': case 'utf-32le': case 'utf-32-be': case 'utf-32-le': {
      let le = cs === 'utf-32le' || cs === 'utf-32-le';
      let start = 0;
      if (cs === 'utf-32' || cs === 'utf32') {
        if (bytes.length >= 4 && bytes[0] === 0 && bytes[1] === 0 && bytes[2] === 0xfe && bytes[3] === 0xff) start = 4;
        else if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xfe && bytes[2] === 0 && bytes[3] === 0) { le = true; start = 4; }
      }
      // JDK: the endian-specific UTF-32LE/BE decoders skip a matching BOM as well (oracle input-file-utf32le-bom)
      if (start === 0 && bytes.length >= 4) {
        if (le && bytes[0] === 0xff && bytes[1] === 0xfe && bytes[2] === 0 && bytes[3] === 0) start = 4;
        else if (!le && bytes[0] === 0 && bytes[1] === 0 && bytes[2] === 0xfe && bytes[3] === 0xff) start = 4;
      }
      text = decodeUtf32(bytes, start, le);
      break;
    }
    default:
      throw new UnsupportedEncodingException(charsetName);
  }
  return new StringReader(text);
}
