// Ported from NewZealandReplaceRuleTest (en module); no-op disambiguator/chunker (F32/F44 pending)
import { describe, it, expect } from 'vitest';
import { Languages } from '../../../../src/core/Languages.js';
import { NewZealandReplaceRule } from '../../../../src/lang/en/rules/NewZealandReplaceRule.js';
import { newLt, messagesFor, useNoopAnalysis } from '../../../support/ruleTestSupport.js';

describe('NewZealandReplaceRuleTest', () => {
  const language = Languages.getLanguageForShortCode('en-NZ');
  useNoopAnalysis(language);
  const rule = new NewZealandReplaceRule(messagesFor(Languages.getLanguageForShortCode('en')), '/en/en-NZ/replace.txt');
  const lt = newLt(language);

  // Java: NewZealandReplaceRuleTest#checkSimpleReplaceRule(String,String)
  const checkSimpleReplaceRule = (sentence, word) => {
    const matches = rule.match(lt.getAnalyzedSentence(sentence));
    expect(matches.length, 'Invalid matches.length while checking sentence: ' + sentence).toBe(1);
    expect(matches[0].getSuggestedReplacements().length, 'Invalid replacement count wile checking sentence: ' + sentence).toBe(1);
    expect(matches[0].getSuggestedReplacements()[0], 'Invalid suggested replacement while checking sentence: ' + sentence).toBe(word);
  };

  // Java: NewZealandReplaceRuleTest#testRule
  it('testRule', () => {
    // correct sentences:
    expect(rule.match(lt.getAnalyzedSentence('Walk on the footpath.')).length).toBe(0);

    // incorrect sentences:
    // at the beginning of a sentence (Romanian replace rule is case-sensitive)
    checkSimpleReplaceRule("Sidewalk is not a place to park your car!", "Footpath");
    // inside sentence
    checkSimpleReplaceRule("I walked on the sidewalk", "footpath");
  });
});
