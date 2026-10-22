// Ported from RussianVerbConjugationRuleTest (ru module)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { JLanguageTool } from '../../../../src/core/JLanguageTool.js';
import { Languages } from '../../../../src/core/Languages.js';
import { Russian } from '../../../../src/lang/ru/language/Russian.js';
import { englishMessages, messagesFor } from '../../../support/ruleTestSupport.js';
import { simulateNoEnglishModule } from '../../../support/NoEnglishModule.js';

simulateNoEnglishModule();

import { RussianVerbConjugationRule } from '../../../../src/lang/ru/rules/RussianVerbConjugationRule.js';

const rightSentences = ['Я иду', 'Она сидит', 'Оно думает',
  'Они пишут', 'Мы думаем', 'Ты читаешь', 'Он творит', 'Вы идёте',
  'Я ходил', 'Они ходили', 'Мы ходили', 'Она ходила', 'Оно ходило', 'Я ходила',
  'Я пойду', 'Она пойдёт', 'Оно пойдёт', 'Мы пойдём', 'Ты пойдёшь', 'Я согласился на предложение.', 'Джек и я согласились', 'Ты может быть не помнишь.'];

const wrongSentences = ['Я идёт', 'Она сидят',
  'Оно думаешь', 'Они идёте', 'Мы думаю', 'Ты читает', 'Он творю',
  'Я ходили', 'Они ходил', 'Мы ходила', 'Она ходил', 'Оно ходила', 'Я ходило',
  'Я пойдёт', 'Она пойдут', 'Оно пойдёте', 'Мы пойдёшь', 'Ты пойду', 'Мы может поговорить здесь.'];

describe('RussianVerbConjugationRuleTest', () => {
  // Java: RussianVerbConjugationRuleTest#testRussianVerbConjugationRule
  it('testRussianVerbConjugationRule', () => {
    const rule = new RussianVerbConjugationRule(englishMessages());
    const lt = new JLanguageTool(Russian.getInstance());
    for (const sentence of wrongSentences) {
      expect(rule.match(lt.getAnalyzedSentence(sentence)).length, 'Expected error in sentence: ' + sentence).toBe(1);
    }
    for (const sentence of rightSentences) {
      expect(rule.match(lt.getAnalyzedSentence(sentence)).length, 'Did not expect error in sentence: ' + sentence).toBe(0);
    }
  });
});
