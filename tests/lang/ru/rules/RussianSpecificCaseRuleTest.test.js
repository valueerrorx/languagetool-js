// Ported from RussianSpecificCaseRuleTest (ru module)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { JLanguageTool } from '../../../../src/core/JLanguageTool.js';
import { Languages } from '../../../../src/core/Languages.js';
import { Russian } from '../../../../src/lang/ru/language/Russian.js';
import { englishMessages, messagesFor } from '../../../support/ruleTestSupport.js';
import { simulateNoEnglishModule } from '../../../support/NoEnglishModule.js';

simulateNoEnglishModule();

import { RussianSpecificCaseRule } from '../../../../src/lang/ru/rules/RussianSpecificCaseRule.js';

describe('RussianSpecificCaseRuleTest', () => {
  const lt = new JLanguageTool(Languages.getLanguageForShortCode('ru'));
  const rule = new RussianSpecificCaseRule(englishMessages());
  const assertGood = (input) => expect(rule.match(lt.getAnalyzedSentence(input)).length).toBe(0);
  const assertBad = (input) => {
    const matches = rule.match(lt.getAnalyzedSentence(input));
    expect(matches.length).toBe(1);
    return matches;
  };

  // Java: RussianSpecificCaseRuleTest#testRule
  it('testRule', () => {
    assertGood('Рытый Банк');
    assertGood('Центральный банк РФ');
    assertBad('Рытый банк');
    assertBad('центральный банк РФ');
    const matches1 = assertBad('I like air France.');
    expect(matches1[0].getFromPos()).toBe(7);
    expect(matches1[0].getToPos()).toBe(17);
    expect(`[${matches1[0].getSuggestedReplacements().join(', ')}]`).toBe('[Air France]');
    expect(matches1[0].getMessage()).toBe('Для специальных наименований используйте начальную заглавную букву.');
  });
});
