// Ported from WhitespaceBeforePunctuationRuleTest (languagetool-core)
import { describe, it, expect } from 'vitest';
import { WhitespaceBeforePunctuationRule } from '../../../src/core/rules/WhitespaceBeforePunctuationRule.js';
import { AnalyzedSentence } from '../../../src/core/AnalyzedSentence.js';
import { AnalyzedToken } from '../../../src/core/AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../../../src/core/AnalyzedTokenReadings.js';
import { englishMessages } from '../../support/ruleTestSupport.js';

describe('WhitespaceBeforePunctuationRuleTest', () => {
  // Java: WhitespaceBeforePunctuationRuleTest#testOkay
  it('testOkay', () => {
    const rule = new WhitespaceBeforePunctuationRule(englishMessages());
    const sentence = new AnalyzedSentence([
      new AnalyzedTokenReadings(new AnalyzedToken(' ', null, null), 0),
      new AnalyzedTokenReadings(new AnalyzedToken('%', 'SYM', null), 1),
    ]);
    expect(rule.match(sentence).length).toBe(0);
  });

  // Java: WhitespaceBeforePunctuationRuleTest#testError
  it('testError', () => {
    const rule = new WhitespaceBeforePunctuationRule(englishMessages());
    const sentence = new AnalyzedSentence([
      new AnalyzedTokenReadings(new AnalyzedToken('2', null, null), 0),
      new AnalyzedTokenReadings(new AnalyzedToken(' ', null, null), 1),
      new AnalyzedTokenReadings(new AnalyzedToken('%', 'SYM', null), 2),
    ]);
    expect(rule.match(sentence).length).toBe(1);
  });
});
