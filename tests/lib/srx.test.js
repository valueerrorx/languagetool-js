// Tests of the SRX engine pieces (net.loomchild.segment Util#finitize/removeBlockQuotes, SrxDocument cascade) with values taken from the Java behaviour.
import { describe, it, expect } from 'vitest';
import { finitize, removeBlockQuotes } from '../../src/lib/srx/Util.js';
import { createSrxDocument, tokenize } from '../../src/core/text/tokenizers/SrxTools.js';

describe('srx Util', () => {
  it('finitize bounds the open quantifiers', () => {
    expect(finitize('a*b+c{2,}d\\*e\\+', 100)).toBe('a{0,100}b{1,100}c{2,100}d\\*e\\+');
  });
  it('removeBlockQuotes escapes quoted characters', () => {
    expect(removeBlockQuotes('x\\Qa.b\\Ey')).toBe('x\\a\\.\\by');
  });
});

describe('srx documents', () => {
  it('parses segment.srx with cascade and tokenizes by language code', () => {
    const d = createSrxDocument('/segment.srx');
    expect(d.getCascade()).toBe(true);
    expect(tokenize('Mr. Smith came. He left.', d, 'en_two')).toEqual(['Mr. Smith came. ', 'He left.']);
    expect(tokenize('', d, 'en_two')).toEqual([]);
  });
});
