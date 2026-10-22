// Ported from RussianUnpairedBracketsRuleTest (ru module)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { JLanguageTool } from '../../../../src/core/JLanguageTool.js';
import { Languages } from '../../../../src/core/Languages.js';
import { Russian } from '../../../../src/lang/ru/language/Russian.js';
import { englishMessages, messagesFor } from '../../../support/ruleTestSupport.js';
import { simulateNoEnglishModule } from '../../../support/NoEnglishModule.js';

simulateNoEnglishModule();

import { RussianUnpairedBracketsRule } from '../../../../src/lang/ru/rules/RussianUnpairedBracketsRule.js';

describe('RussianUnpairedBracketsRuleTest', () => {
  // Java: RussianUnpairedBracketsRuleTest#testRuleRussian
  it('testRuleRussian', () => {
    const rule = new RussianUnpairedBracketsRule(englishMessages(), Russian.getInstance());
    const lt = new JLanguageTool(Russian.getInstance());
    const n = (s) => rule.match([lt.getAnalyzedSentence(s)]).length;
    expect(n('(О жене и детях не беспокойся, я беру их на свои руки).')).toBe(0);
    expect(n('Позже выходит другая «южная поэма» «Бахчисарайский фонтан» (1824).')).toBe(0);
    expect(n('А "б" Д.')).toBe(0);
    expect(n('а), б), Д)..., ДД), аа) и 1а)')).toBe(0);
    expect(n("В таком ключе был начат в мае 1823 в Кишинёве роман в стихах 'Евгений Онегин.")).toBe(1);
  });
});
