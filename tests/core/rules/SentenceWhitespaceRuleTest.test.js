// Ported from SentenceWhitespaceRuleTest (languagetool-core); FakeLanguage replaced by en-US
import { describe, it, expect } from 'vitest';
import { SentenceWhitespaceRule } from '../../../src/core/rules/SentenceWhitespaceRule.js';
import { EN, englishMessages, newLt, useNoopAnalysis } from '../../support/ruleTestSupport.js';

describe('SentenceWhitespaceRuleTest', () => {
  useNoopAnalysis(EN);
  const assertGood = (text, rule, languageTool) => expect(languageTool.check(text).length).toBe(0);
  const assertBad = (text, rule, languageTool) => expect(languageTool.check(text).length).toBe(1);

  // Java: SentenceWhitespaceRuleTest#testMatch
  it('testMatch', () => {
    const rule = new SentenceWhitespaceRule(englishMessages());
    const lt = newLt(EN);
    lt.addRule(rule);
    assertGood("This is a text. And there's the next sentence.", rule, lt);
    assertGood("This is a text! And there's the next sentence.", rule, lt);
    assertGood("This is a text\nAnd there's the next sentence.", rule, lt);
    assertGood("This is a text\n\nAnd there's the next sentence.", rule, lt);
    assertBad("This is a text.And there's the next sentence.", rule, lt);
    assertBad("This is a text!And there's the next sentence.", rule, lt);
    assertBad("This is a text?And there's the next sentence.", rule, lt);
    assertBad("This is a text.  And there's the next sentence.", rule, lt);
    assertBad("This is a text!   And there's the next sentence.", rule, lt);
    assertGood("This is a text.\n And there's the next sentence.", rule, lt);
    assertGood("This is a text.\n\n And there's the next sentence.", rule, lt);
    assertGood("This is a text.  \n\n And there's the next sentence.", rule, lt);
    assertGood("This is a text.  \n And there's the next sentence.", rule, lt);
    assertGood("This is a text. \n\n  And there's the next sentence.", rule, lt);
    assertGood("This is a text.\rAnd there's the next sentence.", rule, lt);
    assertGood("This is a text.\r And there's the next sentence.", rule, lt);
    assertGood("This is a text.  \r And there's the next sentence.", rule, lt);
    assertGood("This is a text.\r\nAnd there's the next sentence.", rule, lt);
    assertGood("This is a text.\r\n And there's the next sentence.", rule, lt);
    assertGood("This is a text.  \r\n And there's the next sentence.", rule, lt);
    assertGood("This is a text. \r\n  And there's the next sentence.", rule, lt);
    assertGood("This is a text.\u2028And there's the next sentence.", rule, lt);
    assertGood("This is a text.  \u2028 And there's the next sentence.", rule, lt);
    assertGood("This is a text.\u2029And there's the next sentence.", rule, lt);
    assertGood("This is a text.  \u2029 And there's the next sentence.", rule, lt);
    assertGood("This is a text.\u0085And there's the next sentence.", rule, lt);
    assertGood("This is a text.  \u0085 And there's the next sentence.", rule, lt);
    assertGood("This is a text.\fAnd there's the next sentence.", rule, lt);
    assertGood("This is a text.  \f And there's the next sentence.", rule, lt);
    assertGood("This is a text.\u000BAnd there's the next sentence.", rule, lt);
    assertGood("This is a text.  \u000B And there's the next sentence.", rule, lt);
    const matches = lt.check("This is a text.  And there's the next sentence.");
    expect(matches[0].getFromPos()).toBe(15);
    expect(matches[0].getToPos()).toBe(17);
    expect(matches[0].getSuggestedReplacements()[0]).toBe(" ");
    const twoSpacesAllowedRule = new SentenceWhitespaceRule(englishMessages(), 2);
    const ltWithTwoSpacesAllowed = newLt(EN);
    ltWithTwoSpacesAllowed.addRule(twoSpacesAllowedRule);
    assertGood("This is a text.  And there's the next sentence.", twoSpacesAllowedRule, ltWithTwoSpacesAllowed);
    assertBad("This is a text.   And there's the next sentence.", twoSpacesAllowedRule, ltWithTwoSpacesAllowed);
  });
});
