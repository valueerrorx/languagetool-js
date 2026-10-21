// Ported from MorfologikItalianSpellerRuleTest (it module)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { Languages } from '../../../../src/core/Languages.js';
import { MorfologikItalianSpellerRule } from '../../../../src/lang/it/rules/MorfologikItalianSpellerRule.js';
import { newLt, messagesFor } from '../../../support/ruleTestSupport.js';

describe('MorfologikItalianSpellerRuleTest', () => {
  // Java: MorfologikItalianSpellerRuleTest#testMorfologikSpeller()
  it('testMorfologikSpeller', () => {
    const lang = Languages.getLanguageForShortCode('it');
    const rule = new MorfologikItalianSpellerRule(messagesFor(lang), lang, null, []);
    const lt = newLt(lang);
    const matches = rule.match(lt.getAnalyzedSentence('esmpio'));
    expect(matches.length).toBe(1);
    expect(`[${matches[0].getSuggestedReplacements().join(', ')}]`).toBe('[empio, esempio, espio, espiò]');
  });
});
