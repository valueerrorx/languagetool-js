// Ported from EnglishRepeatedWordsRuleTest (en module)
import { describe, it, expect } from 'vitest';
import { Languages } from '../../../../src/core/Languages.js';
import { EnglishRepeatedWordsRule } from '../../../../src/lang/en/rules/EnglishRepeatedWordsRule.js';
import { englishMessages, newLt } from '../../../support/ruleTestSupport.js';

describe('EnglishRepeatedWordsRuleTest', () => {
  const rule = new EnglishRepeatedWordsRule(englishMessages());
  const lt = newLt(Languages.getLanguageForShortCode('en'));

  // Java: EnglishRepeatedWordsRuleTest#getRuleMatches(String)
  const getRuleMatches = (sentences) => rule.match(lt.analyzeText(sentences));
  // Java: EnglishRepeatedWordsRuleTest#assertCorrectText(String)
  const assertCorrectText = (sentences) => expect(getRuleMatches(sentences).length).toBe(0);

  // Java: EnglishRepeatedWordsRuleTest#testRule
  it('testRule', () => {
    // form
    assertCorrectText('They went on to form a new group. The bacteria causes a blood clot to form in the jugular vein.');

    // global
    assertCorrectText('Asia Global Crossing Ltd. Global Crossing and Asia Global Crossing.');
    assertCorrectText('It was a global effort. Announcing the participation of Enron Global Markets.');

    // great
    assertCorrectText('Matthew S. Anderson, Peter the Great. The Tomahawks were shipped from Great Britain.');
    assertCorrectText('It was great. The Tomahawks were shipped from Great Britain.');

    // interesting
    assertCorrectText('I found it very interesting. An interesting fact about me is that I have a twin.');

    // maybe
    assertCorrectText('Maybe it\'s because I used to be a FLAMING LIBERAL? Or maybe it\'s because with age, I developed EYES THAT SEE!');

    // need
    assertCorrectText('It needs to be done. That needs to be done.');
    assertCorrectText('This was needed. There is a need to do it.');
    assertCorrectText('It needs to be done. That also needed to be done.');
    assertCorrectText('I still need to sign in somewhere. You need to sign in too.');

    // new
    assertCorrectText('This is a new experience. Happy New Year!');

    // often
    assertCorrectText('It\'s often gloomy outside. More often than not, it\'s raining.');
    assertCorrectText('We have bad weather here often. Often times, it\'s raining.');

    // problem
    assertCorrectText('The students were given some problems. They needed help to solve the problems.');
    assertCorrectText('Then, there were numerous problems after that. His initial interest lay in an attempt to solve Hilbert\'s fifth problem.');
    assertCorrectText('There were some problems with the tests. No problem, I\'m not in a rush.');
    assertCorrectText('The students were given some problems. They were math problems.');

    // several
    assertCorrectText('We noticed them several times. Several thousand people stormed the gate.');

    // suggest
    assertCorrectText('I suggested that, but he also suggests that.');
    assertCorrectText('He suggested that we review them again. What do these suggest about the transaction history?');
    assertCorrectText('I suggested he look it over again. This strongly suggests that Mr. Batt is guilty.');

    // whole
    assertCorrectText('In this example, persons is used instead of people because the law applies to the individuals and never to the group as a whole.');

    // ignore sentences without period at the end
    assertCorrectText('I suggested this. She suggests that');

    let matches = getRuleMatches('I suggested this. She suggests that.');
    expect(matches.length).toBe(1);
    expect(matches[0].getFromPos()).toBe(22);
    expect(matches[0].getToPos()).toBe(30);
    expect(matches[0].getSuggestedReplacements()[0]).toBe('proposes');
    expect(matches[0].getSuggestedReplacements()[1]).toBe('recommends');
    expect(matches[0].getSuggestedReplacements()[2]).toBe('submits');

    matches = getRuleMatches('I suggested this. She suggests that. And they suggested that.');
    expect(matches.length).toBe(2);
    expect(matches[0].getFromPos()).toBe(22);
    expect(matches[1].getFromPos()).toBe(46);
    expect(matches[0].getSuggestedReplacements()[0]).toBe('proposes');
    expect(matches[1].getSuggestedReplacements()[0]).toBe('proposed');

    matches = getRuleMatches('The problem was weird. And the solutions needed to be weird.');
    expect(matches.length).toBe(1);
    expect(matches[0].getSuggestedReplacements()[0]).toBe('odd');
  });
});
