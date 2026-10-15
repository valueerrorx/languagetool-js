import { describe, expect, it } from 'vitest';
import { EncoderType } from '../../../src/lib/fsa/encoders.js';
import { ByteBuf } from '../../../src/lib/fsa/buffers.js';
import { forName } from '../../../src/lib/fsa/charsets.js';
import { DictionaryMetadata } from '../../../src/lib/fsa/metadata.js';

const buf = (s) => {
  const a = new Uint8Array(s.length * 3);
  const n = forName('UTF-8').encodeInto(s, a);
  return new ByteBuf(a, 0, n);
};
const str = (b) => forName('UTF-8').decode(b.a, b.pos, b.lim - b.pos);
const dec = (type, word, code) => str(EncoderType[type].decode(ByteBuf.allocate(0), buf(word), buf(code)));

describe('sequence encoders (decode)', () => {
  it('SUFFIX: trim code 65+n removes n bytes', () => {
    expect(dec('SUFFIX', 'ging', 'Dehen')).toBe('gehen');
    expect(dec('SUFFIX', 'Dreams', 'B')).toBe('Dream');
  });
  it('SUFFIX: trim code 64 (255 after -65) removes everything', () => {
    const encoded = new ByteBuf(Uint8Array.from([64, 0x61, 0x62]), 0, 3);
    expect(str(EncoderType.SUFFIX.decode(ByteBuf.allocate(0), buf('ging'), encoded))).toBe('ab');
  });
  it('PREFIX: cuts prefix and suffix then appends', () => {
    expect(dec('PREFIX', 'ungelesen', 'CCx')).toBe('gelesx');
  });
  it('INFIX: removes infix and suffix', () => {
    expect(dec('INFIX', 'abcdef', 'BCBZ')).toBe('adeZ');
  });
  it('NONE: copies the encoded bytes', () => {
    expect(dec('NONE', 'abc', 'xyz')).toBe('xyz');
  });
  it('prefixBytes', () => {
    expect(EncoderType.values().map((e) => e.prefixBytes())).toEqual([1, 2, 3, 0]);
  });
  it('a trim code longer than the word fails like the JDK buffer', () => {
    expect(() => dec('SUFFIX', 'ab', 'Zx')).toThrow('Range [0, 0 + -23) out of bounds for length 6');
  });
});

describe('.info metadata', () => {
  const read = (t) => DictionaryMetadata.read(Buffer.from(t, 'utf8'));
  it('parses separator, encoder and defaults', () => {
    const m = read('fsa.dict.separator=_\nfsa.dict.encoding=utf-8\nfsa.dict.encoder=prefix\n');
    expect(m.getSeparator()).toBe(95);
    expect(m.getSequenceEncoderType().name).toBe('PREFIX');
    expect(m.isFrequencyIncluded()).toBe(false);
    expect(m.isConvertingCase()).toBe(true);
  });
  it('reports a missing encoder key', () => {
    expect(() => read('fsa.dict.separator=_\nfsa.dict.encoding=utf-8\n')).toThrow('Use an explicit fsa.dict.encoder=SUFFIX metadata key: ');
  });
});
