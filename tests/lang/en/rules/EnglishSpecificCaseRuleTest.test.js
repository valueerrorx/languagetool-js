// Ported from EnglishSpecificCaseRuleTest (en module); no-op disambiguator/chunker (F32/F44 pending)
import { describe, it, expect } from 'vitest';
import { Languages } from '../../../../src/core/Languages.js';
import { EnglishSpecificCaseRule } from '../../../../src/lang/en/rules/EnglishSpecificCaseRule.js';
import { newLt, englishMessages, useNoopAnalysis } from '../../../support/ruleTestSupport.js';

describe('EnglishSpecificCaseRuleTest', () => {
  const language = Languages.getLanguageForShortCode('en');
  useNoopAnalysis(language);
  const lt = newLt(language);
  const rule = new EnglishSpecificCaseRule(englishMessages());

  // Java: EnglishSpecificCaseRuleTest#assertGood(String)
  const assertGood = (input) => expect(rule.match(lt.getAnalyzedSentence(input)).length).toBe(0);
  // Java: EnglishSpecificCaseRuleTest#assertBad(String)
  const assertBad = (input) => {
    const matches = rule.match(lt.getAnalyzedSentence(input));
    expect(matches.length).toBe(1);
    return matches;
  };

  // Java: EnglishSpecificCaseRuleTest#testRule
  it('testRule', () => {
    assertGood('Harry Potter');
    assertGood('I like Harry Potter.');
    assertGood('I like HARRY POTTER.');
    assertBad('harry potter');
    assertBad('harry Potter');
    assertBad('Harry potter');

    const matches1 = assertBad('I like Harry potter.');
    expect(matches1[0].getFromPos()).toBe(7);
    expect(matches1[0].getToPos()).toBe(19);
    expect(`[${matches1[0].getSuggestedReplacements().join(', ')}]`).toBe('[Harry Potter]');
    expect(matches1[0].getMessage()).toBe('If the term is a proper noun, use initial capitals.');

    const matches2 = assertBad('Alexander The Great');
    expect(matches2[0].getMessage()).toBe('If the term is a proper noun, use the suggested capitalization.');

    const matches3 = assertBad('I like Harry  potter.'); // note the two spaces
    expect(matches3[0].getFromPos()).toBe(7);
    expect(matches3[0].getToPos()).toBe(20);
  });
});
