// Ported from FrenchRepeatedWordsRuleTest (fr module)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { Languages } from '../../../../src/core/Languages.js';
import { FrenchRepeatedWordsRule } from '../../../../src/lang/fr/rules/FrenchRepeatedWordsRule.js';
import { messagesFor, newLt } from '../../../support/ruleTestSupport.js';

describe('FrenchRepeatedWordsRuleTest', () => {
  const french = Languages.getLanguageForShortCode('fr');
  const rule = new FrenchRepeatedWordsRule(messagesFor(french));
  const lt = newLt(french);

  // Java: FrenchRepeatedWordsRuleTest#getRuleMatches(String)
  const getRuleMatches = (sentences) => rule.match(lt.analyzeText(sentences));
  // Java: FrenchRepeatedWordsRuleTest#assertCorrectText(String)
  const assertCorrectText = (sentences) => expect(getRuleMatches(sentences).length).toBe(0);

  // Java: FrenchRepeatedWordsRuleTest#testRule
  it('testRule', () => {
    assertCorrectText('Elle est notamment phénoménale. Les choses sont notamment compliquées');

    let matches = getRuleMatches('Elle est notamment phénoménale. Les choses sont notamment compliquées.');
    expect(matches.length).toBe(1);
    expect(`[${matches[0].getSuggestedReplacements().join(', ')}]`).toBe('[particulièrement, spécialement, singulièrement, surtout, spécifiquement]');

    matches = getRuleMatches('Elle est maintenant phénoménale. Les choses sont maintenant compliquées.');
    expect(matches.length).toBe(1);
    expect(`[${matches[0].getSuggestedReplacements().join(', ')}]`).toBe('[présentement, ce jour-ci, désormais, à présent]');
  });
});
