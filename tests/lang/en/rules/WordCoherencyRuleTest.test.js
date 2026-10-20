// Ported from WordCoherencyRuleTest (en module); no-op disambiguator/chunker (F32/F44 pending)
import { describe, it, expect } from 'vitest';
import { Languages } from '../../../../src/core/Languages.js';
import { WordCoherencyRule } from '../../../../src/lang/en/rules/WordCoherencyRule.js';
import { newLt, englishMessages, useNoopAnalysis } from '../../../support/ruleTestSupport.js';

describe('WordCoherencyRuleTest', () => {
  const language = Languages.getLanguageForShortCode('en-US');
  useNoopAnalysis(language);
  // Java: WordCoherencyRuleTest#before (disableAllRulesExcept EN_WORD_COHERENCY)
  const lt = newLt(language, new WordCoherencyRule(englishMessages()));
  const list = (m) => `[${m.getSuggestedReplacements().join(', ')}]`;

  // Java: WordCoherencyRuleTest#assertGood(String)
  const assertGood = (s) => {
    const rule = new WordCoherencyRule(englishMessages());
    expect(rule.match(lt.analyzeText(s)).length).toBe(0);
  };
  // Java: WordCoherencyRuleTest#assertError(String)
  const assertError = (s) => {
    const rule = new WordCoherencyRule(englishMessages());
    expect(rule.match(lt.analyzeText(s)).length).toBe(1);
  };

  // Java: WordCoherencyRuleTest#testRule
  it('testRule', () => {
    // correct sentences:
    assertGood('He likes archeology. She likes archeology, too.');
    assertGood('He likes archaeology. She likes archaeology, too.');
    // errors:
    assertError('He likes archaeology. She likes archeology, too.');

    const matches1 = lt.check('He is reelected, or he will be re-elected.');
    expect(matches1.length).toBe(1);
    expect(matches1[0].getFromPos()).toBe(31);
    expect(matches1[0].getToPos()).toBe(41);
    expect(list(matches1[0])).toBe('[reelected]');

    const matches2 = lt.check('He was reelected, and I will re-elect him again in 2002.');
    expect(matches2.length).toBe(1);
    expect(matches2[0].getFromPos()).toBe(29);
    expect(matches2[0].getToPos()).toBe(37);
    expect(list(matches2[0])).toBe('[reelect]');

    const matches3 = lt.check('He oxidises o, or he oxidizes');
    expect(matches3.length).toBe(1);
    expect(matches3[0].getFromPos()).toBe(21);
    expect(matches3[0].getToPos()).toBe(29);
    expect(list(matches3[0])).toBe('[oxidises]');
  });

  // Java: WordCoherencyRuleTest#testCallIndependence
  it('testCallIndependence', () => {
    assertGood('He likes archaeology.');
    assertGood('She likes archeology, too.'); // this won't be noticed, the calls are independent of each other
  });

  // Java: WordCoherencyRuleTest#testMatchPosition
  it('testMatchPosition', () => {
    const ruleMatches = lt.check('He likes archaeology. She likes archeology, too.');
    expect(ruleMatches.length).toBe(1);
    expect(ruleMatches[0].getFromPos()).toBe(32);
    expect(ruleMatches[0].getToPos()).toBe(42);
  });

  // Java: WordCoherencyRuleTest#testRuleCompleteTexts
  it('testRuleCompleteTexts', () => {
    expect(lt.check('He likes archaeology. Really? She likes archaeology, too.').length).toBe(0);
    expect(lt.check('He likes archaeology. Really? She likes archeology, too.').length).toBe(1);
    expect(lt.check('He likes archeology. Really? She likes archaeology, too.').length).toBe(1);
    expect(lt.check('Mix of upper case and lower case: Westernize and westernise.').length).toBe(1);
  });
});
