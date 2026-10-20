// Ported from EnglishUnpairedBracketsRuleTest (en module)
import { describe, it, expect } from 'vitest';
import { EnglishUnpairedBracketsRule } from '../../../src/lang/en/rules/EnglishUnpairedBracketsRule.js';
import { Languages } from '../../../src/core/Languages.js';
import { EN, englishMessages, newLt } from '../../support/ruleTestSupport.js';

describe('EnglishUnpairedBracketsRuleTest', () => {
  const english = Languages.getLanguageForShortCode('en');
  const rule = new EnglishUnpairedBracketsRule(englishMessages(), english);
  const lt = newLt(english);
  const assertCorrect = (sentence) => expect(rule.match([lt.getAnalyzedSentence(sentence)]).length).toBe(0);
  const assertIncorrect = (sentence) => expect(rule.match([lt.getAnalyzedSentence(sentence)]).length).toBe(1);
  const getMatches = (input, tool) => tool.check(input).length;
  const assertEquals = (e, a) => expect(a).toBe(e);
  const singletonList = (x) => [x];
  const assertCorrectText = (sentences) => expect(rule.match(lt.analyzeText(sentences)).length).toBe(0);

  // Java: EnglishUnpairedBracketsRuleTest#testRule
  it('testRule', () => {
    // correct sentences:
    assertCorrect("(This is a test sentence).");
    assertCorrect("This is a word 'test'.");
    assertCorrect("This is no smiley: (some more text)");
    assertCorrect("This is a sentence with a smiley :)");
    assertCorrect("This is a sentence with a smiley :(");
    assertCorrect("This is a sentence with a smiley :-)");
    assertCorrect("This is a sentence with a smiley ;-) and so on...");
    assertCorrect("This is a [test] sentence...");
    assertCorrect("The plight of Tamil refugees caused a surge of support from most of the Tamil political parties.[90]");
    assertCorrect("(([20] [20] [20]))");
    // test for a case that created a false alarm after disambiguation
    assertCorrect("This is a \"special test\", right?");
    // numerical bullets
    assertCorrect("We discussed this in Chapter 1).");
    assertCorrect("The jury recommended that: (1) Four additional deputies be employed.");
    assertCorrect("We discussed this in section 1a).");
    assertCorrect("We discussed this in section iv).");
    //some more cases
    assertCorrect("(Ketab fi Isti'mal al-'Adad al-Hindi)");
    assertCorrect("(al-'Adad al-Hindi)");
    assertCorrect("will-o'-the-wisp");
    assertCorrect("cat-o’-nine-tails");
    //TODO: ambiguous
    assertCorrect("a) item one\nb) item two\nc) item three");
    assertCorrectText("\n\n" +
                      "a) New York\n" +
                      "b) Boston\n");
    assertCorrectText("\n\n" +
        "1.) New York\n" +
        "2.) Boston\n");
    assertCorrectText("\n\n" +
        "XII.) New York\n" +
        "XIII.) Boston\n");
    assertCorrectText("\n\n" +
                      "A) New York\n" +
                      "B) Boston\n" +
                      "C) Foo\n");
    // incorrect sentences:
    assertIncorrect("(This is a test sentence.");
    assertCorrect("This is not so (neither a nor b");
    assertIncorrect("This is not so (neither a nor b.");
    assertIncorrect("This is not so neither a nor b)");
    assertIncorrect("This is not so neither foo nor bar)");
    // this is currently considered incorrect... although people often use smileys this way:
    assertCorrect("Some text (and some funny remark :-) with more text to follow");  //TODO: Why is this correct and the next one incorrect?
    assertIncorrect("Some text (and some funny remark :-) with more text to follow!");
    let matches;
    matches = rule.match(singletonList(lt.getAnalyzedSentence("(This is a test] sentence.")));
    expect(matches.length).toBe(2);
    matches = rule.match(singletonList(lt.getAnalyzedSentence("This [is (a test} sentence.")));
    expect(matches.length).toBe(3);
  });

  // Java: EnglishUnpairedBracketsRuleTest#testMultipleSentences
  it('testMultipleSentences', () => {
    const lt = newLt(english, rule);
    assertEquals(0, getMatches("This is multiple sentence text that contains a bracket: "
                             + "[This is a bracket. With some text.] and this continues.\n", lt));
    assertEquals(0, getMatches("This is multiple sentence text that contains a bracket. "
                             + "(This is a bracket. \n\n With some text.) and this continues.", lt));
    assertEquals(1, getMatches("This is multiple sentence text that contains a bracket: "
                             + "[This is a bracket. With some text. And this continues.\n\n", lt));
  });
});
