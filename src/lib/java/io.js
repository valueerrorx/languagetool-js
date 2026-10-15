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
    default:
      throw new UnsupportedEncodingException(charsetName);
  }
  return new StringReader(text);
}
