// Ported from CompoundRuleTest (fr module)
import { describe, it, expect, beforeAll } from 'vitest';
import '../../../../src/lang/register.js';
import { Languages } from '../../../../src/core/Languages.js';
import { CompoundRule } from '../../../../src/lang/fr/rules/CompoundRule.js';
import { AbstractCompoundRuleTest } from '../../../support/AbstractCompoundRuleTest.js';
import { JLanguageTool } from '../../../../src/core/JLanguageTool.js';
import { messagesFor } from '../../../support/ruleTestSupport.js';

describe('CompoundRuleTest', () => {
  const t = new AbstractCompoundRuleTest();

  // Java: CompoundRuleTest#setUp
  beforeAll(() => {
    t.lt = new JLanguageTool(Languages.getLanguageForShortCode('fr'));
    t.rule = new CompoundRule(messagesFor(Languages.getLanguageForShortCode('fr')), Languages.getLanguageForShortCode('fr'), null);
    t.testAllCompounds();
  });

  // Java: CompoundRuleTest#testRule
  it('testRule', () => {
    // correct sentences:
    t.check(0, 'Jésus-Christ');
    t.check(0, 'Congo-Brazzaville');
    t.check(0, 'vidéo-clip');
    t.check(0, 'anglo-saxon');

    // incorrect sentences:
    t.check(1, 'Jésus Christ');
    t.check(1, 'Congo Brazzaville');
    t.check(1, 'Congo- Brazzaville');
    t.check(1, 'Congo -Brazzaville');

    const one = (text, expected) => {
      const matches = t.rule.match(t.lt.getAnalyzedSentence(text));
      expect(matches.length).toBe(1);
      expect(matches[0].getSuggestedReplacements().length).toBe(1);
      expect(matches[0].getSuggestedReplacements()[0]).toBe(expected);
    };
    one('rez-de chaussée', 'rez-de-chaussée');
    one('Congo -Brazzaville', 'Congo-Brazzaville');
    one('Congo- Brazzaville', 'Congo-Brazzaville');
    one('Congo - Brazzaville', 'Congo-Brazzaville');
    one('le - quel', 'lequel');
    one('le quel', 'lequel');
    one('le- quel', 'lequel');
    one('anglo saxon', 'anglo-saxon');
    one('anglo- saxon', 'anglo-saxon');
    one('anglo -saxon', 'anglo-saxon');
    one('anglo - saxon', 'anglo-saxon');
  });
});
