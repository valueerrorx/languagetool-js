// Ported from MorfologikRussianSpellerRuleTest and MorfologikRussianYOSpellerRuleTest (ru module)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { Russian } from '../../../../src/lang/ru/language/Russian.js';
import { MorfologikRussianSpellerRule } from '../../../../src/lang/ru/rules/MorfologikRussianSpellerRule.js';
import { MorfologikRussianYOSpellerRule } from '../../../../src/lang/ru/rules/MorfologikRussianYOSpellerRule.js';
import { messagesFor, newLt } from '../../../support/ruleTestSupport.js';
import { simulateNoEnglishModule } from '../../../support/NoEnglishModule.js';

simulateNoEnglishModule();

describe('MorfologikRussianSpellerRuleTest', () => {
  // Java: MorfologikRussianSpellerRuleTest#testMorfologikSpeller
  it('testMorfologikSpeller', () => {
    const ru = Russian.getInstance();
    const rule = new MorfologikRussianSpellerRule(messagesFor(ru), ru, null, []);
    const lt = newLt(ru);
    const n = (s) => rule.match(lt.getAnalyzedSentence(s)).length;
    expect(n('русский')).toBe(0);
    expect(n('ёжик')).toBe(0);
    expect(n('ежик')).toBe(0);
    expect(n('юго-зпдный')).toBe(1);
    expect(n('северо-восточный')).toBe(0);
    expect(n('Ростов-на-Дону')).toBe(0);
    expect(n('Ростов-на-дону')).toBe(1);
    expect(rule.getId()).toBe('MORFOLOGIK_RULE_RU_RU');
    expect(rule.isDefaultTempOff()).toBe(false);
  }, 3600000);
});

describe('MorfologikRussianYOSpellerRuleTest', () => {
  // Java: MorfologikRussianYOSpellerRuleTest#testMorfologikSpeller
  it('testMorfologikSpeller', () => {
    const ru = Russian.getInstance();
    const rule = new MorfologikRussianYOSpellerRule(messagesFor(ru), ru, null, []);
    const lt = newLt(ru);
    const n = (s) => rule.match(lt.getAnalyzedSentence(s)).length;
    expect(n('русский')).toBe(0);
    expect(n('ёжик')).toBe(0);
    expect(n('ежик')).toBe(1);
    expect(n('юго-зпдный')).toBe(1);
    expect(n('северо-восточный')).toBe(0);
    expect(n('Ростов-на-Дону')).toBe(0);
    expect(rule.getId()).toBe('MORFOLOGIK_RULE_RU_RU_YO');
    expect(rule.isDefaultOff()).toBe(true);
  }, 3600000);
});
