// Ported from RussianDashRuleTest (ru module)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { JLanguageTool } from '../../../../src/core/JLanguageTool.js';
import { Languages } from '../../../../src/core/Languages.js';
import { Russian } from '../../../../src/lang/ru/language/Russian.js';
import { englishMessages, messagesFor } from '../../../support/ruleTestSupport.js';
import { simulateNoEnglishModule } from '../../../support/NoEnglishModule.js';

simulateNoEnglishModule();

import { RussianDashRule } from '../../../../src/lang/ru/rules/RussianDashRule.js';

describe('RussianDashRuleTest', () => {
  const lang = Languages.getLanguageForShortCode('ru');
  const lt = new JLanguageTool(lang);
  const rule = new RussianDashRule(JLanguageTool.getMessageBundle(lang));

  // Java: RussianDashRuleTest#check(int,String,String[])
  const check = (expectedErrors, text, expSuggestions = null) => {
    const ruleMatches = rule.match(lt.getAnalyzedSentence(text));
    expect(ruleMatches.length).toBe(expectedErrors);
    if (expSuggestions !== null && expectedErrors !== 1) {
      throw new Error("Sorry, test case can only check suggestion if there's one rule match");
    }
    if (expSuggestions !== null) {
      expect(ruleMatches[0].getSuggestedReplacements()).toEqual(expSuggestions);
    }
  };

  // Java: RussianDashRuleTest#testRule
  it('testRule', () => {
    check(0, 'Он вышел из-за забора.');
    check(0, 'Ростов-на-Дону.');
    check(0, 'ведром — работай');
    check(1, 'из—за', ['из-за']);
    check(1, 'Ростов — на — Дону', ['Ростов-на-Дону']);
  });
});
