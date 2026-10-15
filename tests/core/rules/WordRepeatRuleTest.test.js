// Ported from WordRepeatRuleTest (languagetool-core); Demo language replaced by en-US
import { describe, it, expect } from 'vitest';
import { WordRepeatRule } from '../../../src/core/rules/WordRepeatRule.js';
import { EN, englishMessages, newLt, useNoopAnalysis } from '../../support/ruleTestSupport.js';

describe('WordRepeatRuleTest', () => {
  useNoopAnalysis(EN);
  const lt = newLt(EN);
  const rule = new WordRepeatRule(englishMessages(), EN);
  const assertGood = (s) => expect(rule.match(lt.getAnalyzedSentence(s)).length).toBe(0);
  const assertBad = (s) => expect(rule.match(lt.getAnalyzedSentence(s)).length).toBe(1);

  // Java: WordRepeatRuleTest#test
  it('test', () => {
    assertGood("A test");
    assertGood("A test.");
    assertGood("A test...");
    assertGood("1 000 000 years");
    assertGood("010 020 030");
    //👍💚🌲🌲
    assertGood("\uD83D\uDC4D\uD83D\uDC9A\uD83C\uDF32\uD83C\uDF32");
    assertBad("A A test");
    assertBad("A a test");
    assertBad("This is is a test");
  });
});
