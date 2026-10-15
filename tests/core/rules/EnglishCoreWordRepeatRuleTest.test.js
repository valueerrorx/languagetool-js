// Ported from WordRepeatRuleTest (en module)
import { describe, it, expect } from 'vitest';
import { WordRepeatRule } from '../../../src/core/rules/WordRepeatRule.js';
import { Languages } from '../../../src/core/Languages.js';
import { EN, englishMessages, newLt, useNoopAnalysis } from '../../support/ruleTestSupport.js';

describe('EnglishCoreWordRepeatRuleTest', () => {
  const english = Languages.getLanguageForShortCode('en');
  useNoopAnalysis(english);
  const rule = new WordRepeatRule(englishMessages(), english);
  const lt = newLt(english);
  const assertMatches = (input, expectedMatches) => expect(rule.match(lt.getAnalyzedSentence(input)).length).toBe(expectedMatches);

  // Java: WordRepeatRuleTest#testRule
  it('testRule', () => {
    assertMatches("This is a test sentence.", 0);
    assertMatches("This is a test sentence...", 0);
    // make sure we ignore immunized tokens
    assertMatches("And side to side and top to bottom...", 0);
    assertMatches("This this is a test sentence.", 1);
    assertMatches("This is a test sentence sentence.", 1);
    assertMatches("This is is a a test sentence sentence.", 3);
  });
});
