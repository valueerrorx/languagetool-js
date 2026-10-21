// Ported from GermanRepeatedWordsRuleTest (de module)
import { describe, it, expect } from 'vitest';
import { Languages } from '../../../../src/core/Languages.js';
import { GermanRepeatedWordsRule } from '../../../../src/lang/de/rules/GermanRepeatedWordsRule.js';
import { messagesFor, newLt } from '../../../support/ruleTestSupport.js';

describe('GermanRepeatedWordsRuleTest', () => {
  const rule = new GermanRepeatedWordsRule(messagesFor(Languages.getLanguageForShortCode('de')));
  const lt = newLt(Languages.getLanguageForShortCode('de'));

  // Java: GermanRepeatedWordsRuleTest#getRuleMatches(String)
  const getRuleMatches = (sentences) => rule.match(lt.analyzeText(sentences));
  // Java: GermanRepeatedWordsRuleTest#assertCorrectText(String)
  const assertCorrectText = (sentences) => expect(getRuleMatches(sentences).length).toBe(0);

  // Java: GermanRepeatedWordsRuleTest#testRule
  it('testRule', () => {
    assertCorrectText('Lauf so schnell wie möglich. Das ist MÖGLICH!');

    const matches = getRuleMatches('Das ist hervorragende Arbeit. Die Ergebnisse sind hervorragend.');
    expect(matches.length).toBe(1);
    expect(`[${matches[0].getSuggestedReplacements().join(', ')}]`).toBe('[brillant, exzellent, perfekt, fantastisch, traumhaft]');
  });
});
