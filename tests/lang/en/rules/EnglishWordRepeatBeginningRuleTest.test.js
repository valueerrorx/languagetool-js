// Ported from EnglishWordRepeatBeginningRuleTest (en module); lt.check is replaced by the rule alone (Language#getRelevantRules is not ported yet, F17)
import { describe, it, expect } from 'vitest';
import { Languages } from '../../../../src/core/Languages.js';
import { EnglishWordRepeatBeginningRule } from '../../../../src/lang/en/rules/EnglishWordRepeatBeginningRule.js';
import { englishMessages, newLt } from '../../../support/ruleTestSupport.js';

describe('EnglishWordRepeatBeginningRuleTest', () => {
  const language = Languages.getLanguageForShortCode('en-US');
  const lt = newLt(language, new EnglishWordRepeatBeginningRule(englishMessages(), language));

  // Java: EnglishWordRepeatBeginningRuleTest#testRule
  it('testRule', () => {
    // ================== correct sentences ===================
    // two successive sentences that start with the same non-adverb word.
    expect(lt.check('This is good. This is good, too.').length).toBe(0);
    // three successive sentences that start with the same exception word ("the").
    expect(lt.check('The car. The bicycle. The third sentence with \'the\'.').length).toBe(0);

    // =================== errors =============================
    // three successive sentences that start with the same non-exception word (personal pronoun "I")
    const matches1 = lt.check('I think so. I have seen that before. I don\'t like it.');
    expect(matches1.length).toBe(1);
    // check suggestions
    expect(matches1[0].getSuggestedReplacements()[0]).toBe('Furthermore, I');
    expect(matches1[0].getSuggestedReplacements()[1]).toBe('Likewise, I');
    expect(matches1[0].getSuggestedReplacements()[2]).toBe('Not only that, but I');
    // three successive sentences that start with the same non-exception word (personal pronoun "He")
    const matches2 = lt.check('He thinks so. He has seen that before. He doesn\'t like it.');
    expect(matches2.length).toBe(1);
    // check suggestions
    expect(matches2[0].getSuggestedReplacements()[0]).toBe('Furthermore, he');
    expect(matches2[0].getSuggestedReplacements()[1]).toBe('Likewise, he');
    expect(matches2[0].getSuggestedReplacements()[2]).toBe('Not only that, but he');
    // two successive sentences that start with one of the saved adverbs ("Also")
    const matches3 = lt.check('Also, I play football. Also, I play basketball.');
    expect(matches3.length).toBe(1);
    // check suggestions (because the adverbs are contained in a Set it is safer to check if the correct suggestions are contained)
    for (const s of ['Additionally', 'Besides', 'Furthermore', 'Moreover', 'In addition', 'As well as']) {
      expect(matches3[0].getSuggestedReplacements().some((sugg) => sugg === s)).toBe(true);
    }
  });
});
