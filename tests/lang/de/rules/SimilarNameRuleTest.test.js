// Ported from SimilarNameRuleTest (de module)
import { describe, it, expect } from 'vitest';
import { SimilarNameRule } from '../../../../src/lang/de/rules/SimilarNameRule.js';
import { englishMessages, newLt } from '../../../support/ruleTestSupport.js';
import { german } from './_styleTestSupport.js';

describe('SimilarNameRuleTest', () => {
  // Java: SimilarNameRuleTest#assertErrors(String,int,SimilarNameRule,JLanguageTool)
  function assertErrors(input, expectedMatches, rule, lt) {
    const sentence = lt.getAnalyzedSentence(input);
    const matches = rule.match([sentence]);
    expect(matches.length).toBe(expectedMatches);
    if (expectedMatches === 1) {
      expect(matches[0].getRule().getId()).toBe('DE_SIMILAR_NAMES');
    }
  }

  // Java: SimilarNameRuleTest#testRule
  it('testRule', () => {
    const rule = new SimilarNameRule(englishMessages());
    const lt = newLt(german());
    assertErrors('Hier steht Angela Müller. Im nächsten Satz dann Miller.', 1, rule, lt);
    assertErrors('Hier steht Angela Müller. Im nächsten Satz dann Müllers Ehemann.', 0, rule, lt);
    assertErrors('Hier steht Angela Müller. Dann Mulla, nicht ähnlich genug.', 0, rule, lt);
    assertErrors('Ein Mikrocontroller, bei Mikrocontrollern', 0, rule, lt);
    assertErrors('Hier steht das Rad Deiner Freundin. Und Deinem Hund geht es gut?', 0, rule, lt);
  });
});
