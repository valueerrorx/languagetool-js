// Ported from BritishReplaceRuleTest (en module); no-op disambiguator/chunker (F32/F44 pending)
import { describe, it, expect } from 'vitest';
import { Languages } from '../../../../src/core/Languages.js';
import { BritishReplaceRule } from '../../../../src/lang/en/rules/BritishReplaceRule.js';
import { newLt, messagesFor, useNoopAnalysis } from '../../../support/ruleTestSupport.js';

describe('BritishReplaceRuleTest', () => {
  const language = Languages.getLanguageForShortCode('en-GB');
  useNoopAnalysis(language);
  const rule = new BritishReplaceRule(messagesFor(Languages.getLanguageForShortCode('en')), '/en/en-GB/replace.txt');
  const lt = newLt(language);

  // Java: BritishReplaceRuleTest#checkSimpleReplaceRule(String,String)
  const checkSimpleReplaceRule = (sentence, word) => {
    const matches = rule.match(lt.getAnalyzedSentence(sentence));
    expect(matches.length, 'Invalid matches.length while checking sentence: ' + sentence).toBe(1);
    expect(matches[0].getSuggestedReplacements().length, 'Invalid replacement count wile checking sentence: ' + sentence).toBe(1);
    expect(matches[0].getSuggestedReplacements()[0], 'Invalid suggested replacement while checking sentence: ' + sentence).toBe(word);
  };

  // Java: BritishReplaceRuleTest#testRule
  it('testRule', () => {
    // correct sentences:
    expect(rule.match(lt.getAnalyzedSentence('Buy some petrol.')).length).toBe(0);

    // incorrect sentences:
    // at the beginning of a sentence (Romanian replace rule is case-sensitive)
    checkSimpleReplaceRule("Diapers for sale!", "Nappies");
    // inside sentence
    checkSimpleReplaceRule("We have some diapers for sale.", "nappies");
    // expression
    checkSimpleReplaceRule("Everyone loves cotton candy.", "candy floss");
  });
});
