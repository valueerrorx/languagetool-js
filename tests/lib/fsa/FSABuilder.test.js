// Extra tests (F41): FSABuilder + CFSA2Serializer round trip through the CFSA2 reader, helpers added for the speller.
import { describe, it, expect } from 'vitest';
import { CFSA2Serializer } from '../../../src/lib/fsa/CFSA2Serializer.js';
import { FSABuilder, LEXICAL_ORDERING } from '../../../src/lib/fsa/FSABuilder.js';
import { ByteSequenceIterator, readFSA } from '../../../src/lib/fsa/FSA.js';
import { getBytesUtf8 } from '../../../src/lib/java/charset.js';
import { BufferedReader } from '../../../src/lib/java/io.js';
import { System } from '../../../src/lib/java/System.js';

// all byte sequences of an FSA as strings of the bytes' chars
function words(fsa) {
  const it = new ByteSequenceIterator(fsa, fsa.getRootNode());
  const out = [];
  while (it.hasNext()) {
    const n = it.next();
    out.push(Buffer.from(it.buffer.slice(0, n)).toString('utf8'));
  }
  return out;
}

describe('FSABuilder/CFSA2Serializer', () => {
  // round trip: sorted unique words come back in byte order
  it('roundTrip', () => {
    const input = ['zebra', 'apple', 'Äpfel', 'apple', 'ap', 'banana', 'band', 'bandana', 'ü', 'a'];
    const lines = input.map(getBytesUtf8).sort(LEXICAL_ORDERING);
    const built = FSABuilder.build(lines);
    const image = new CFSA2Serializer().serialize(built);
    const fsa = readFSA(Buffer.from(image));
    const expected = [...new Set(input)].sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)));
    expect(words(fsa)).toEqual(expected);
  });

  // many shared suffixes exercise the state registry and the first-states linearization
  it('sharedSuffixes', () => {
    const input = [];
    for (let i = 0; i < 3000; i++) input.push(`w${(i * 7919) % 10007}ing`, `w${(i * 31) % 997}ed`);
    const lines = input.map(getBytesUtf8).sort(LEXICAL_ORDERING);
    const fsa = readFSA(Buffer.from(new CFSA2Serializer().serialize(FSABuilder.build(lines))));
    const expected = [...new Set(input)].sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)));
    expect(words(fsa)).toEqual(expected);
  });
});

describe('F41 java helpers', () => {
  // Java: String#getBytes(UTF_8)
  it('getBytesUtf8', () => {
    expect([...getBytesUtf8('aä€\u{1F600}')]).toEqual([0x61, 0xc3, 0xa4, 0xe2, 0x82, 0xac, 0xf0, 0x9f, 0x98, 0x80]);
    expect([...getBytesUtf8('a\ud83d')]).toEqual([0x61, 0x3f]);
    expect([...getBytesUtf8('\ude00b')]).toEqual([0x3f, 0x62]);
  });

  // Java: BufferedReader#readLine
  it('BufferedReader', () => {
    const r = new BufferedReader('a\r\nb\n\nc');
    expect([r.readLine(), r.readLine(), r.readLine(), r.readLine(), r.readLine(), r.readLine()]).toEqual(['a', 'b', '', 'c', null, null]);
  });

  // Java: System#getProperty(String,String) / clearProperty
  it('SystemProperties', () => {
    System.clearProperty('ltjs.test.prop');
    expect(System.getProperty('ltjs.test.prop', 'dflt')).toBe('dflt');
    System.setProperty('ltjs.test.prop', 'x');
    expect(System.getProperty('ltjs.test.prop', 'dflt')).toBe('x');
    expect(System.clearProperty('ltjs.test.prop')).toBe('x');
    expect(System.getProperty('ltjs.test.prop')).toBe(null);
  });
});
