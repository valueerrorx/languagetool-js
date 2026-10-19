// Ported from EnglishChunkFilterTest (languagetool-language-modules/en)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { javaSplit } from '../../../../src/lib/java/strings.js';
import { AnalyzedToken } from '../../../../src/core/AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../../../../src/core/AnalyzedTokenReadings.js';
import { ChunkTag } from '../../../../src/core/chunking/ChunkTag.js';
import { ChunkTaggedToken } from '../../../../src/core/chunking/ChunkTaggedToken.js';
import { EnglishChunkFilter } from '../../../../src/lang/en/chunking/EnglishChunkFilter.js';

// Java: EnglishChunkFilterTest#makeTokens(String)
function makeTokens(tokensAsString) {
  const result = [];
  for (const token of javaSplit(tokensAsString, ' ')) {
    const parts = javaSplit(token, '/');
    if (parts.length !== 2) {
      throw new Error(`Invalid token, form 'x/y' required: ${token}`);
    }
    result.push(new ChunkTaggedToken(parts[0], [new ChunkTag(parts[1])], null));
  }
  return result;
}

// Java: EnglishChunkFilterTest#assertChunks(List,String)
function assertChunks(tokens, expected) {
  const result = new EnglishChunkFilter().filter(tokens);
  expect(result.map((t) => t.toString()).join(' ')).toBe(expected);
}

describe('EnglishChunkFilterTest', () => {
  // Java: EnglishChunkFilterTest#testSingular()
  it('testSingular', () => {
    assertChunks(makeTokens('He/B-NP owns/B-VP a/B-NP nice/I-NP house/I-NP in/X Berlin/B-NP ./.'),
      'He/B-NP-singular,E-NP-singular owns/B-VP a/B-NP-singular nice/I-NP-singular house/E-NP-singular in/X Berlin/B-NP-singular,E-NP-singular ./.');
  });

  // Java: EnglishChunkFilterTest#testPluralByAnd() (@Ignore "fails...")
  it.skip('testPluralByAnd', () => {});

  // Java: EnglishChunkFilterTest#testPluralByPluralNoun()
  it('testPluralByPluralNoun', () => {
    const tokens = makeTokens('I/X have/N-VP ten/B-NP books/I-NP ./.');
    tokens.splice(3, 1);
    const readings = new AnalyzedTokenReadings([new AnalyzedToken('books', 'NNS', 'book'), new AnalyzedToken('books', 'VBZ', 'book')], 0);
    tokens.splice(3, 0, new ChunkTaggedToken('books', [new ChunkTag('I-NP')], readings));
    assertChunks(tokens, 'I/X have/N-VP ten/B-NP-plural books/E-NP-plural ./.');
  });
});
