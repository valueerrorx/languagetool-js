import { describe, it, expect } from 'vitest';
import { StringReader, inputStreamReader } from '../../../src/lib/java/io.js';
import { assertThrowsJava } from '../../support/javaAssert.js';

describe('io: StringReader / inputStreamReader (F09)', () => {
  it('StringReader.read', () => {
    const r = new StringReader('abc');
    const buf = new Uint16Array(2);
    expect(r.read(buf, 0, 2)).toBe(2);
    expect(r.read(buf, 0, 2)).toBe(1);
    expect(r.read(buf, 0, 2)).toBe(-1);
  });
  it('charsets', () => {
    const text = (b, cs) => { const r = inputStreamReader(Buffer.from(b), cs); const c = new Uint16Array(10); const n = r.read(c, 0, 10); return n < 0 ? '' : String.fromCharCode(...c.subarray(0, n)); };
    expect(text([0xc3, 0xa4], 'UTF-8')).toBe('ä');
    expect(text([0xe4], 'iso-8859-1')).toBe('ä');
    expect(text([0xe4], 'us-ascii')).toBe('�');
    expect(text([0x61, 0x00], 'utf-16')).toBe('愀');
    expect(text([0xff, 0xfe, 0x61, 0x00], 'utf-16')).toBe('a');
    // expected values from JDK 17 (new String(bytes, name))
    expect(text([0x80, 0x81, 0x8d, 0x8f, 0x90, 0x9d, 0x9f, 0xe4, 0x41], 'windows-1252')).toBe('€\ufffd\ufffd\ufffd\ufffd\ufffdŸäA');
    expect(text([0x93, 0x94], 'cp1252')).toBe('\u201c\u201d');
    expect(text([0xa4, 0xa6, 0xa8, 0xb4, 0xb8, 0xbc, 0xbd, 0xbe, 0xe4, 0x80], 'ISO-8859-15')).toBe('€Š š Žž Œœ Ÿä\x80'.replace(/ /g, ''));
    expect(text([0xa4], 'latin9')).toBe('€');
    expect(text([0xa4], 'ISO8859_15')).toBe('€');
    assertThrowsJava(() => inputStreamReader(Buffer.from([]), 'nosuch'), 'java.io.UnsupportedEncodingException', 'nosuch');
    assertThrowsJava(() => inputStreamReader(Buffer.from([]), null), 'java.lang.NullPointerException', 'charsetName');
  });
});
