// morfologik-stemming sequence encoders: only decode (used by DictionaryLookup/DictionaryIterator), EncoderType.
import { clearAndEnsureCapacity } from './buffers.js';

// Java: TrimSuffixEncoder#decode(ByteBuffer,ByteBuffer,ByteBuffer)
const suffix = {
  name: 'SUFFIX',
  prefixBytes: () => 1,
  decode(reuse, source, encoded) {
    const code = encoded.a[encoded.pos];
    let suffixTrimCode = (code - 65) & 255;
    if (suffixTrimCode === 255) suffixTrimCode = source.remaining();
    const truncatedSuffixLength = source.remaining() - suffixTrimCode;
    const len2 = encoded.remaining() - 1;
    reuse = clearAndEnsureCapacity(reuse, truncatedSuffixLength + len2);
    reuse.put(source.a, 0, truncatedSuffixLength);
    reuse.put(encoded.a, 1, len2);
    return reuse.flip();
  },
};

// Java: TrimPrefixAndSuffixEncoder#decode(ByteBuffer,ByteBuffer,ByteBuffer)
const prefix = {
  name: 'PREFIX',
  prefixBytes: () => 2,
  decode(reuse, source, encoded) {
    const p = encoded.pos;
    let prefixTrimCode = (encoded.a[p] - 65) & 255;
    let suffixTrimCode = (encoded.a[p + 1] - 65) & 255;
    if (prefixTrimCode === 255 || suffixTrimCode === 255) {
      prefixTrimCode = source.remaining();
      suffixTrimCode = 0;
    }
    const len1 = source.remaining() - (suffixTrimCode + prefixTrimCode);
    const len2 = encoded.remaining() - 2;
    reuse = clearAndEnsureCapacity(reuse, len1 + len2);
    reuse.put(source.a, prefixTrimCode, len1);
    reuse.put(encoded.a, 2, len2);
    return reuse.flip();
  },
};

// Java: TrimInfixAndSuffixEncoder#decode(ByteBuffer,ByteBuffer,ByteBuffer)
const infix = {
  name: 'INFIX',
  prefixBytes: () => 3,
  decode(reuse, source, encoded) {
    const p = encoded.pos;
    let infixIndex = (encoded.a[p] - 65) & 255;
    let infixLength = (encoded.a[p + 1] - 65) & 255;
    let suffixTrimCode = (encoded.a[p + 2] - 65) & 255;
    if (infixLength === 255 || suffixTrimCode === 255) {
      infixIndex = 0;
      infixLength = source.remaining();
      suffixTrimCode = 0;
    }
    const len1 = source.remaining() - (infixIndex + infixLength + suffixTrimCode);
    const len2 = encoded.remaining() - 3;
    reuse = clearAndEnsureCapacity(reuse, infixIndex + len1 + len2);
    reuse.put(source.a, 0, infixIndex);
    reuse.put(source.a, infixIndex + infixLength, len1);
    reuse.put(encoded.a, 3, len2);
    return reuse.flip();
  },
};

// Java: NoEncoder#decode(ByteBuffer,ByteBuffer,ByteBuffer)
const none = {
  name: 'NONE',
  prefixBytes: () => 0,
  decode(reuse, source, encoded) {
    reuse = clearAndEnsureCapacity(reuse, encoded.remaining());
    const mark = encoded.pos;
    reuse.putBuf(encoded);
    reuse.flip();
    encoded.pos = mark;
    return reuse;
  },
};

// Java: morfologik.stemming.EncoderType (name -> encoder, enum order SUFFIX, PREFIX, INFIX, NONE)
export const EncoderType = Object.freeze({
  SUFFIX: suffix,
  PREFIX: prefix,
  INFIX: infix,
  NONE: none,
  values: () => [suffix, prefix, infix, none],
});
