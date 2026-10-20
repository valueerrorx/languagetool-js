// Ported from TokenPredicateTest (languagetool-language-modules/de)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { AnalyzedToken } from '../../../../src/core/AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../../../../src/core/AnalyzedTokenReadings.js';
import { ChunkTag } from '../../../../src/core/chunking/ChunkTag.js';
import { ChunkTaggedToken } from '../../../../src/core/chunking/ChunkTaggedToken.js';
import { TokenPredicate } from '../../../../src/core/chunking/TokenPredicate.js';

// Java: TokenPredicateTest#assertMatch(String,ChunkTaggedToken)
function assertMatch(expr, chunkTaggedToken) {
  const predicate = new TokenPredicate(expr, false);
  expect(predicate.apply(chunkTaggedToken)).toBe(true);
}

// Java: TokenPredicateTest#assertNoMatch(String,ChunkTaggedToken)
function assertNoMatch(expr, chunkTaggedToken) {
  const predicate = new TokenPredicate(expr, false);
  expect(predicate.apply(chunkTaggedToken)).toBe(false);
}

describe('TokenPredicateTest', () => {
  // Java: TokenPredicateTest#test()
  it('test', () => {
    const chunkTags = [new ChunkTag('CHUNK1'), new ChunkTag('CHUNK2')];
    const readings = new AnalyzedTokenReadings(new AnalyzedToken('mytoken', 'MYPOS', 'mylemma'), 0);
    const chunkTaggedToken = new ChunkTaggedToken('mytoken', chunkTags, readings);

    assertMatch('mytoken', chunkTaggedToken);
    assertNoMatch('mytoken2', chunkTaggedToken);
    assertMatch('string=mytoken', chunkTaggedToken);
    assertNoMatch('string=mytoken2', chunkTaggedToken);
    assertMatch('regex=my[abct]oken', chunkTaggedToken);
    assertNoMatch('regex=my[abc]oken', chunkTaggedToken);
    assertMatch('chunk=CHUNK1', chunkTaggedToken);
    assertMatch('chunk=CHUNK2', chunkTaggedToken);
    assertNoMatch('chunk=OTHERCHUNK', chunkTaggedToken);
    assertMatch('pos=MYPOS', chunkTaggedToken);
    assertNoMatch('pos=OTHER', chunkTaggedToken);
    assertMatch('posre=M.POS', chunkTaggedToken);
    assertNoMatch('posre=O.HER', chunkTaggedToken);

    expect(() => assertNoMatch('invalid=token', chunkTaggedToken)).toThrow(); // RuntimeException
  });
});
