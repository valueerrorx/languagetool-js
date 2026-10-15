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
    assertThrowsJava(() => inputStreamReader(Buffer.from([]), 'nosuch'), 'java.io.UnsupportedEncodingException', 'nosuch');
    assertThrowsJava(() => inputStreamReader(Buffer.from([]), null), 'java.lang.NullPointerException', 'charsetName');
  });
});
