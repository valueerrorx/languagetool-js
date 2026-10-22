// Ported from RussianCompoundRuleTest (ru module)
import { describe, it, beforeEach } from 'vitest';
import '../../../../src/lang/register.js';
import { JLanguageTool } from '../../../../src/core/JLanguageTool.js';
import { Russian } from '../../../../src/lang/ru/language/Russian.js';
import { RussianCompoundRule } from '../../../../src/lang/ru/rules/RussianCompoundRule.js';
import { AbstractCompoundRuleTest } from '../../../support/AbstractCompoundRuleTest.js';
import { englishMessages } from '../../../support/ruleTestSupport.js';
import { simulateNoEnglishModule } from '../../../support/NoEnglishModule.js';

simulateNoEnglishModule();

describe('RussianCompoundRuleTest', () => {
  const t = new AbstractCompoundRuleTest();

  // Java: RussianCompoundRuleTest#setUp
  beforeEach(() => {
    t.lt = new JLanguageTool(Russian.getInstance());
    t.rule = new RussianCompoundRule(englishMessages(), Russian.getInstance(), null);
  });

  // Java: RussianCompoundRuleTest#testRule
  it('testRule', () => {
    t.check(0, 'Он вышел из-за дома.');
    t.check(0, 'Разработка ПО за идею.');
    t.check(0, 'естественно-научный');
    t.check(1, 'из за', 'из-за');
    t.check(1, 'по за', 'по-за');
    t.check(1, 'нет нет из за да да');
    t.check(1, 'Ростов на Дону', 'Ростов-на-Дону');
    t.check(1, 'Ростов на Дону — крупнейший город на юге Российской Федерации, административный центр Южного федерального округа и Ростовской области.');
    t.check(1, 'кругло суточный', 'круглосуточный');
    t.check(0, 'Ростов на дону');
    t.check(0, 'Ведь сейчас в лос Анджелесе');
    t.check(1, 'Ростов-на Дону', 'Ростов-на-Дону');
    t.check(0, 'во-первых');
    t.check(1, 'во первых', 'во-первых');
    t.check(1, 'Лос Анджелес', 'Лос-Анджелес');
    t.check(1, 'Ведь сейчас в Лос Анджелесе');
    t.check(1, 'Ведь сейчас в Лос Анджелесе хорошая погода.');
    t.check(1, 'Во первых, мы были довольно высоко над уровнем моря.');
    t.check(1, 'Мы, во первых, были довольно высоко над уровнем моря.');
  });
});
