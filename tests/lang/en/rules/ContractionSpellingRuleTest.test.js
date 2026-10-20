// Ported from ContractionSpellingRuleTest (en module)
import { describe, it, expect } from 'vitest';
import { Languages } from '../../../../src/core/Languages.js';
import { ContractionSpellingRule } from '../../../../src/lang/en/rules/ContractionSpellingRule.js';
import { messagesFor, newLt } from '../../../support/ruleTestSupport.js';

describe('ContractionSpellingRuleTest', () => {
  const lt = newLt(Languages.getLanguageForShortCode('en'));
  const rule = new ContractionSpellingRule(messagesFor(lt.getLanguage()), lt.getLanguage());

  // Java: ContractionSpellingRuleTest#checkSimpleReplaceRule(String,String)
  const checkSimpleReplaceRule = (sentence, word) => {
    const matches = rule.match(lt.getAnalyzedSentence(sentence));
    expect(matches.length, `Invalid matches.length while checking sentence: ${sentence}`).toBe(1);
    expect(matches[0].getSuggestedReplacements().length, `Invalid replacement count wile checking sentence: ${sentence}`).toBe(1);
    expect(matches[0].getSuggestedReplacements()[0], `Invalid suggested replacement while checking sentence: ${sentence}`).toBe(word);
  };

  // Java: ContractionSpellingRuleTest#testRule
  it('testRule', () => {
    // correct sentences:
    expect(rule.match(lt.getAnalyzedSentence('It wasn\'t me.')).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence('I\'m ill.')).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence('Staatszerfall im südlichen Afrika.')).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence('by IVE')).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence('Never mind the whys and wherefores.')).length).toBe(0);

    // incorrect sentences:

    // at the beginning of a sentence
    checkSimpleReplaceRule('Wasnt this great', 'Wasn\'t');
    checkSimpleReplaceRule('YOURE WRONG', 'YOU\'RE');
    checkSimpleReplaceRule('Dont do this', 'Don\'t');
    // checkSimpleReplaceRule("Ive been doing", "I've");
    // inside sentence
    checkSimpleReplaceRule('It wasnt me', 'wasn\'t');
    checkSimpleReplaceRule('You neednt do this', 'needn\'t');
    checkSimpleReplaceRule('I know Im wrong', 'I\'m');

    // two suggestions
    const matches = rule.match(lt.getAnalyzedSentence('Whereve you are'));
    expect(matches[0].getSuggestedReplacements().length).toBe(2);
    expect(matches[0].getSuggestedReplacements()[0]).toBe('Where\'ve');
    expect(matches[0].getSuggestedReplacements()[1]).toBe('Wherever');
  });
});
