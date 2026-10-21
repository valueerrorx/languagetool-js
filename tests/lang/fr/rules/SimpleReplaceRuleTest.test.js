// Ported from SimpleReplaceRuleTest (fr module)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { Languages } from '../../../../src/core/Languages.js';
import { SimpleReplaceRule } from '../../../../src/lang/fr/rules/SimpleReplaceRule.js';
import { messagesFor, newLt } from '../../../support/ruleTestSupport.js';

describe('SimpleReplaceRuleTest', () => {
  const french = Languages.getLanguageForShortCode('fr');
  const lt = newLt(french);
  const rule = new SimpleReplaceRule(messagesFor(french), lt.getLanguage());

  // Java: SimpleReplaceRuleTest#testRule
  it('testRule', () => {
    // correct sentences:
    let matches = rule.match(lt.getAnalyzedSentence("J'ai pas de quoi"));
    expect(matches.length).toBe(0);

    // incorrect sentences:
    matches = rule.match(lt.getAnalyzedSentence('jai pas de quoi'));
    expect(matches.length).toBe(1);
    expect(matches[0].getSuggestedReplacements()[0]).toBe("j'ai");

    matches = rule.match(lt.getAnalyzedSentence('Jai pas de quoi'));
    expect(matches.length).toBe(1);
    expect(matches[0].getSuggestedReplacements()[0]).toBe("J'ai");
  });
});
