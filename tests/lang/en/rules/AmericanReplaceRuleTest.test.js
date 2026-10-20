// Ported from AmericanReplaceRuleTest (en module); no-op disambiguator/chunker (F32/F44 pending)
import { describe, it, expect } from 'vitest';
import { Languages } from '../../../../src/core/Languages.js';
import { AmericanReplaceRule } from '../../../../src/lang/en/rules/AmericanReplaceRule.js';
import { newLt, messagesFor, useNoopAnalysis } from '../../../support/ruleTestSupport.js';

describe('AmericanReplaceRuleTest', () => {
  const language = Languages.getLanguageForShortCode('en-US');
  useNoopAnalysis(language);
  const rule = new AmericanReplaceRule(messagesFor(Languages.getLanguageForShortCode('en')), '/en/en-US/replace.txt');
  const lt = newLt(language);

  // Java: AmericanReplaceRuleTest#checkSimpleReplaceRule(String,String)
  const checkSimpleReplaceRule = (sentence, word) => {
    const matches = rule.match(lt.getAnalyzedSentence(sentence));
    expect(matches.length, 'Invalid matches.length while checking sentence: ' + sentence).toBe(1);
    expect(matches[0].getSuggestedReplacements().length, 'Invalid replacement count wile checking sentence: ' + sentence).toBe(1);
    expect(matches[0].getSuggestedReplacements()[0], 'Invalid suggested replacement while checking sentence: ' + sentence).toBe(word);
  };

  // Java: AmericanReplaceRuleTest#testRule
  it('testRule', () => {
    // correct sentences:
    expect(rule.match(lt.getAnalyzedSentence('Buy some gasoline.')).length).toBe(0);

    // incorrect sentences:
    // expression
    checkSimpleReplaceRule("I love fish fingers.", "fish sticks");
  });
});
