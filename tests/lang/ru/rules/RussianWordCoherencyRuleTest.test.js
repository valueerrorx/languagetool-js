// Ported from RussianWordCoherencyRuleTest (ru module)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { JLanguageTool } from '../../../../src/core/JLanguageTool.js';
import { Languages } from '../../../../src/core/Languages.js';
import { Russian } from '../../../../src/lang/ru/language/Russian.js';
import { englishMessages, messagesFor } from '../../../support/ruleTestSupport.js';
import { simulateNoEnglishModule } from '../../../support/NoEnglishModule.js';

simulateNoEnglishModule();

import { RussianWordCoherencyRule } from '../../../../src/lang/ru/rules/RussianWordCoherencyRule.js';

describe('RussianWordCoherencyRuleTest', () => {
  const lt = new JLanguageTool(Russian.getInstance());
  const count = (s) => new RussianWordCoherencyRule(englishMessages()).match([lt.getAnalyzedSentence(s)]).length;
  const assertGood = (s) => expect(count(s)).toBe(0);
  const assertError = (s) => expect(count(s)).toBe(1);

  // Java: RussianWordCoherencyRuleTest#testRule
  it('testRule', () => {
    assertGood('По шкале Цельсия абсолютному нулю соответствует температура −273,15 °C.');
    assertGood('По шкале Цельсия абсолютному нулю соответствует температура −273,15 °C.');
    assertError('По шкале Цельсия абсолютному нулю соответствует температура −273,15 °C или ноль по шкале Кельвина.');
  });

  // Java: RussianWordCoherencyRuleTest#testCallIndependence
  it('testCallIndependence', () => {
    assertGood('Абсолютный нуль.');
    assertGood('Ноль по шкале Кельвина.'); // this won't be noticed, the calls are independent of each other
  });

  // Java: RussianWordCoherencyRuleTest#testRuleCompleteTexts
  it('testRuleCompleteTexts', () => {
    expect(lt.check('По шкале Цельсия абсолютному нулю соответствует температура −273,15 °C или нуль по шкале Кельвина.').length).toBe(0);
    expect(lt.check('По шкале Цельсия абсолютному нулю соответствует температура −273,15 °C или ноль по шкале Кельвина.').length).toBe(1);
    // cross-paragraph checks:
    expect(lt.check('Абсолютный нуль.\n\nСовсем недостижим. И ноль по шкале Кельвина.').length).toBe(1);
  });
});
