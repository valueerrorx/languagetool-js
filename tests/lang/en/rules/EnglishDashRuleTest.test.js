// Ported from EnglishDashRuleTest (en module)
import { describe, it, expect } from 'vitest';
import { Languages } from '../../../../src/core/Languages.js';
import { EnglishDashRule } from '../../../../src/lang/en/rules/EnglishDashRule.js';
import { messagesFor, newLt } from '../../../support/ruleTestSupport.js';

describe('EnglishDashRuleTest', () => {
  const lang = Languages.getLanguageForShortCode('en-US');
  const lt = newLt(lang);
  const rule = new EnglishDashRule(messagesFor(lang));

  // Java: EnglishDashRuleTest#check(int,String,String)
  const check = (expectedErrors, text, expectedSuggestion = null) => {
    const ruleMatches = rule.match(lt.getAnalyzedSentence(text));
    expect(ruleMatches.length, `Expected ${expectedErrors} errors, but got: [${ruleMatches.join(', ')}]`).toBe(expectedErrors);
    if (expectedSuggestion !== null) {
      const ruleMatch = ruleMatches[0];
      expect(ruleMatch.getSuggestedReplacements().length).toBe(1);
      expect(ruleMatch.getSuggestedReplacements()[0]).toBe(expectedSuggestion);
    }
  };

  // Java: EnglishDashRuleTest#testRule
  it('testRule', () => {
    // correct sentences:
    check(0, 'This is my T-shirt.');
    check(0, 'This is water-proof.');
    check(0, 'This works semi-automatically.');
    check(0, 'She\'s a newcomer.'); // compounds.txt: "new-comer+"
    check(0, 'I sent you and e-mail.'); // compounds.txt: "e-mail"
    // incorrect sentences:
    check(1, 'T – shirt', 'T-shirt');
    check(1, 'three–way street', 'three-way');
    check(1, 'surface — to — surface', 'surface-to-surface');
    check(1, 'This works semi–automatically.', 'semi-automatically'); // compounds.txt: "semi-automatic$" and "semi-automatically$"
    check(1, 'This works semi – automatically.', 'semi-automatically');
    check(1, 'I sent you and e–mail.', 'e-mail'); // compounds.txt: "e-mail"
  });
});
