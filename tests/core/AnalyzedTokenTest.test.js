// Ported from AnalyzedTokenTest (languagetool-core).
import { describe, it, expect } from 'vitest';
import { AnalyzedToken } from '../../src/core/AnalyzedToken.js';

describe('AnalyzedTokenTest', () => {
  // Java: AnalyzedTokenTest#testToString
  it('testToString', () => {
    const testToken = new AnalyzedToken('word', 'POS', 'lemma');
    expect(testToken.toString()).toBe('lemma/POS');
    expect(testToken.getLemma()).toBe('lemma');
    const testToken2 = new AnalyzedToken('word', 'POS', null);
    expect(testToken2.toString()).toBe('word/POS');
    expect(testToken2.getLemma()).toBe(null);
    expect(testToken2.getToken()).toBe('word');
  });

  // Java: AnalyzedTokenTest#testMatches
  it('testMatches', () => {
    const testToken1 = new AnalyzedToken('word', 'POS', 'lemma');
    expect(testToken1.matches(new AnalyzedToken('', null, null))).toBe(false);
    expect(testToken1.matches(new AnalyzedToken('word', null, null))).toBe(true);
    expect(testToken1.matches(new AnalyzedToken('word', 'POS', null))).toBe(true);
    expect(testToken1.matches(new AnalyzedToken('word', 'POS', 'lemma'))).toBe(true);
    expect(testToken1.matches(new AnalyzedToken('word', 'POS1', 'lemma'))).toBe(false);
    expect(testToken1.matches(new AnalyzedToken('word1', 'POS', 'lemma'))).toBe(false);
    expect(testToken1.matches(new AnalyzedToken('word', 'POS', 'lemma1'))).toBe(false);
    expect(testToken1.matches(new AnalyzedToken('', 'POS', 'lemma'))).toBe(true);
    expect(testToken1.matches(new AnalyzedToken('', null, 'lemma'))).toBe(true);
  });
});
