// Ported from LongSentenceRuleTest (languagetool-core)
import { describe, it, expect } from 'vitest';
import { LongSentenceRule } from '../../../src/core/rules/LongSentenceRule.js';
import { UserConfig } from '../../../src/core/rules/model/UserConfig.js';
import { englishMessages, newLt } from '../../support/ruleTestSupport.js';
import { getDemoLanguage, useXxTestResources } from '../../support/DemoLanguage.js';

describe('LongSentenceRuleTest', () => {
  useXxTestResources();
  const EN = getDemoLanguage();
  const lt = newLt(EN);
  const assertNoMatch = (input, rule) => expect(rule.match(lt.analyzeText(input)).length).toBe(0);
  const assertMatch = (input, from, to, rule) => {
    const matches = rule.match(lt.analyzeText(input));
    expect(matches.length).toBe(1);
    expect(matches[0].getFromPos()).toBe(from);
    expect(matches[0].getToPos()).toBe(to);
  };

  // Java: LongSentenceRuleTest#testMatch
  it('testMatch', () => {
    const rule = new LongSentenceRule(englishMessages(), new UserConfig(), 40);
    assertNoMatch(' is a rather short text.', rule);
    assertMatch('Now this is not '
      + 'a a a a a a a a a a a '
      + 'a a a a a a a a a a a '
      + 'a a a a a a a a a a a '
      + 'a a a a a a a a a a a '
      + 'rather that short text.', 0, 127, rule);

    assertMatch('Now this is not '
      + 'a a a a a a a a a a a '
      + 'a a a a a a a a a a a '
      + 'a a a a a a a a a a a '
      + 'a a a a a a a a a a a '
      + 'rather that short text', 0, 126, rule);

    assertMatch('The sun slowly set behind the majestic mountains, '
      + 'casting a warm golden glow over the tranquil valley below, where a '
      + 'gentle breeze rustled the leaves of the trees, and the sound of a '
      + 'distant stream provided a soothing backdrop to the peaceful scene.', 0, 249, rule);
    // test quotes
    const body = ' dark and nights grow dreary, we can be thankful that our God combines in '
      + 'his nature a creative synthesis of love and justice which will lead us through life’s dark valleys and into '
      + 'sunlit pathways of hope and fulfillment';
    const tail = ' (p. 9) refers to God’s nature as a combination of love and justice.';
    assertNoMatch('The quote “When days grow' + body + '”' + tail, rule);
    assertNoMatch('The quote "When days grow' + body + '"' + tail, rule);
    assertNoMatch('The quote «When days grow' + body + '»' + tail, rule);
    assertNoMatch('The quote „When days grow' + body + '“' + tail, rule);
    assertMatch('The quote "When days" grow dark and nights grow dreary, we can be thankful that our God combines in '
      + 'his nature a creative synthesis of love and justice which will lead us through life’s dark valleys and into '
      + 'sunlit pathways of hope "and fulfillment" (p. 9) refers to God’s nature as a combination of love and justice.',
    0, 253, rule);
    // no quotes
    assertMatch('The quote When days grow' + body + tail, 0, 249, rule);
    // wrong or mismatched quotes: opening quote, with no closing quote
    assertNoMatch('The quote “When days grow' + body + '»' + tail, rule);

    const shortRule = new LongSentenceRule(englishMessages(), new UserConfig(), 6);
    assertNoMatch('This is a rather short text.', shortRule);
    assertMatch('This is also a rather short text.', 0, 33, shortRule);
    assertNoMatch("These ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ don't count.", shortRule);
    assertNoMatch('one two three four five six.', shortRule);
    assertNoMatch('one two three (four) five six.', shortRule);
    assertMatch('one two three four five six seven.', 0, 34, shortRule);
    assertNoMatch('Eins zwei drei vier fünf sechs.', shortRule);
    assertMatch('\n\n\nEins zwei drei vier fünf sechs seven', 3, 39, shortRule);
    assertMatch('Eins zwei drei vier fünf sechs seven\n\n\n', 0, 36, shortRule);
    assertMatch('\n\n\nEins zwei drei vier fünf sechs seven\n\n\n', 3, 39, shortRule);
    assertMatch('\n\n\nEins zwei drei vier fünf sechs seven.', 3, 40, shortRule);
    assertMatch('Eins zwei drei vier fünf sechs seven.\n\n\n', 0, 37, shortRule);
    assertMatch('\n\n\nEins zwei drei vier fünf sechs seven.\n\n\n', 3, 40, shortRule);
  });
});
