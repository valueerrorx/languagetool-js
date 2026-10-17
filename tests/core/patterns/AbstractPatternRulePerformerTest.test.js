// Ported from AbstractPatternRulePerformerTest (languagetool-core); Demo language -> tests/support/DemoLanguage.js
import { describe, it, expect } from 'vitest';
import { AnalyzedToken } from '../../../src/core/AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../../../src/core/AnalyzedTokenReadings.js';
import { ChunkTag } from '../../../src/core/chunking/ChunkTag.js';
import { PatternToken } from '../../../src/core/patterns/PatternToken.js';
import { PatternRule } from '../../../src/core/patterns/PatternRule.js';
import { PatternTokenMatcher } from '../../../src/core/patterns/PatternTokenMatcher.js';
import { AbstractPatternRulePerformer } from '../../../src/core/patterns/AbstractPatternRulePerformer.js';
import { Unifier } from '../../../src/core/patterns/Unifier.js';
import { getDemoLanguage } from '../../support/DemoLanguage.js';

// Java: AbstractPatternRulePerformerTest#tokenReadings(String,String)
function tokenReadings(token, chunkTag) {
  const tokenReadings1 = new AnalyzedTokenReadings(new AnalyzedToken(token, 'pos', 'lemma'), 0);
  if (chunkTag !== null) {
    tokenReadings1.setChunkTags([new ChunkTag(chunkTag)]);
  }
  return [tokenReadings1];
}

describe('AbstractPatternRulePerformerTest', () => {
  // Java: AbstractPatternRulePerformerTest#testTestAllReadings
  it('testTestAllReadings', () => {
    const patternToken1 = new PatternToken('foo', false, false, false);
    const simpleRule = new PatternRule('FAKE', getDemoLanguage(), [patternToken1], 'descr', 'message', 'short');
    const elemMatcher = new PatternTokenMatcher(patternToken1);
    const p = new AbstractPatternRulePerformer(simpleRule, new Unifier(null, null));
    expect(p.testAllReadings(tokenReadings('foo', null), elemMatcher, null, 0, 0, 0)).toBe(true);
    expect(p.testAllReadings(tokenReadings('bar', null), elemMatcher, null, 0, 0, 0)).toBe(false);
    expect(p.testAllReadings(tokenReadings('foo', 'myChunk'), elemMatcher, null, 0, 0, 0)).toBe(true);
    expect(p.testAllReadings(tokenReadings('foo', 'otherChunk'), elemMatcher, null, 0, 0, 0)).toBe(true);
  });

  // Java: AbstractPatternRulePerformerTest#testTestAllReadingsWithChunks
  it('testTestAllReadingsWithChunks', () => {
    const chunkPatternToken = new PatternToken(null, false, false, false);
    chunkPatternToken.setChunkTag(new ChunkTag('myChunk'));
    const simpleRule = new PatternRule('FAKE', getDemoLanguage(), [chunkPatternToken], 'descr', 'message', 'short');
    const elemMatcher = new PatternTokenMatcher(chunkPatternToken);
    const p = new AbstractPatternRulePerformer(simpleRule, new Unifier(null, null));
    expect(p.testAllReadings(tokenReadings('bar', null), elemMatcher, null, 0, 0, 0)).toBe(false);
    expect(p.testAllReadings(tokenReadings('bar', 'myChunk'), elemMatcher, null, 0, 0, 0)).toBe(true);
    expect(p.testAllReadings(tokenReadings('bar', 'otherChunk'), elemMatcher, null, 0, 0, 0)).toBe(false);
  });
});
