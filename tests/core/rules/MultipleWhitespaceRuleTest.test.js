// Ported from MultipleWhitespaceRuleTest (languagetool-core); Demo language replaced by en-US
import { describe, it, expect } from 'vitest';
import { MultipleWhitespaceRule } from '../../../src/core/rules/MultipleWhitespaceRule.js';
import { EN, englishMessages, newLt, useNoopAnalysis } from '../../support/ruleTestSupport.js';

describe('MultipleWhitespaceRuleTest', () => {
  useNoopAnalysis(EN);
  const setUpRule = () => newLt(EN, new MultipleWhitespaceRule(englishMessages(), EN));
  const assertGood = (input, lt) => expect(lt.check(input).length).toBe(0);

  // Java: MultipleWhitespaceRuleTest#testRule
  it('testRule', () => {
    let matches;
    const lt = setUpRule();
    // correct sentences:
    assertGood("This is a test sentence.", lt);
    assertGood("This\uFEFF is a test sentence.", lt);
    assertGood("This\uFEFF\uFEFF is a test sentence.", lt);
    assertGood("This \uFEFFis a test sentence.", lt);
    assertGood("This\uFEFF\u2060 is a test sentence.", lt);
    assertGood("This\uFEFF\u2060 is a test sentence.", lt);
    assertGood("\uFEFF\uFEFFThis is a\n\u2060\ntest sentence...", lt);
    assertGood("This is a test sentence...", lt);
    assertGood("\n\tThis is a test sentence...", lt);
    assertGood("Multiple tabs\t\tare okay", lt);
    assertGood("\n This is a test sentence...", lt);
    assertGood("\n    This is a test sentence...", lt);
    // Needs isParagraphStart creation. Excluding i = 1 will make the rule ignore multiple white spaces in middle sentences.
    // matches = rule.match(langTool.getAnalyzedSentence("    This is a test sentence..."));
    // assertEquals(0, matches.length);
    // incorrect sentences:
    matches = lt.check("This  is a test sentence.");
    expect(matches.length).toBe(1);
    expect(matches[0].getFromPos()).toBe(4);
    expect(matches[0].getToPos()).toBe(6);
    matches = lt.check("\n   This  is a test sentence.");
    expect(matches.length).toBe(1);
    expect(matches[0].getFromPos()).toBe(8);
    expect(matches[0].getToPos()).toBe(10);
    matches = lt.check("This is a test   sentence.");
    expect(matches.length).toBe(1);
    expect(matches[0].getFromPos()).toBe(14);
    expect(matches[0].getToPos()).toBe(17);
    matches = lt.check("This is   a  test   sentence.");
    expect(matches.length).toBe(3);
    expect(matches[0].getFromPos()).toBe(7);
    expect(matches[0].getToPos()).toBe(10);
    expect(matches[1].getFromPos()).toBe(11);
    expect(matches[1].getToPos()).toBe(13);
    expect(matches[2].getFromPos()).toBe(17);
    expect(matches[2].getToPos()).toBe(20);
    matches = lt.check("\t\t\t    \t\t\t\t  ");
    expect(matches.length).toBe(2);
    //with non-breakable spaces
    matches = lt.check("This \u00A0is a test sentence.");
    expect(matches.length).toBe(1);
    expect(matches[0].getFromPos()).toBe(4);
    expect(matches[0].getToPos()).toBe(6);
  });
});
