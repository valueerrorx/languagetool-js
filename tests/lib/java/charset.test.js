// Java UTF-8 REPLACE decoding granularity (sun.nio.cs.UTF_8).
import { describe, it, expect } from 'vitest';
import { decodeUtf8Java } from '../../../src/lib/java/charset.js';

const dec = (...b) => decodeUtf8Java(Uint8Array.from(b));

describe('decodeUtf8Java', () => {
  it('valid sequences', () => {
    expect(dec(0x41, 0xc3, 0xa9, 0xe2, 0x82, 0xac, 0xf0, 0x9f, 0x98, 0x80)).toBe('Aé€😀');
  });
  it('invalid lead and stray continuation bytes: one U+FFFD each', () => {
    expect(dec(0xff, 0xfe, 0x80, 0xc0, 0xc1)).toBe('\ufffd'.repeat(5));
  });
  it('truncated sequence at the end is one U+FFFD', () => {
    expect(dec(0xe2, 0x82)).toBe('\ufffd');
    expect(dec(0xf0, 0x9f, 0x98)).toBe('\ufffd');
    expect(dec(0xc3)).toBe('\ufffd');
  });
  it('malformed continuation resumes at the offending byte', () => {
    expect(dec(0xc3, 0x41)).toBe('\ufffdA');
    expect(dec(0xe2, 0x82, 0x41)).toBe('\ufffdA');
    expect(dec(0xe2, 0x41, 0x42)).toBe('\ufffdAB');
  });
  it('encoded surrogates and overlong forms', () => {
    expect(dec(0xed, 0xa0, 0x80)).toBe('\ufffd'); // JDK: one replacement for the whole 3-byte surrogate
    expect(dec(0xe0, 0x80, 0x80)).toBe('\ufffd\ufffd\ufffd');
    expect(dec(0xf5, 0x80, 0x80, 0x80)).toBe('\ufffd\ufffd\ufffd\ufffd');
  });
});
