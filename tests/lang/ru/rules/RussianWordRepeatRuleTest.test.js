// Ported from RussianWordRepeatRuleTest (ru module)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { JLanguageTool } from '../../../../src/core/JLanguageTool.js';
import { Languages } from '../../../../src/core/Languages.js';
import { Russian } from '../../../../src/lang/ru/language/Russian.js';
import { englishMessages, messagesFor } from '../../../support/ruleTestSupport.js';
import { simulateNoEnglishModule } from '../../../support/NoEnglishModule.js';

simulateNoEnglishModule();

import { RussianWordRepeatRule } from '../../../../src/lang/ru/rules/RussianWordRepeatRule.js';

describe('RussianWordRepeatRuleTest', () => {
  // Java: RussianWordRepeatRuleTest#testRule
  it('testRule', () => {
    const rule = new RussianWordRepeatRule(englishMessages());
    const lt = new JLanguageTool(Russian.getInstance());
    expect(rule.match(lt.getAnalyzedSentence('Повтор слов в предложении.')).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence('Повтор слов в повтор предложении.')).length).toBe(1);
  });
});
