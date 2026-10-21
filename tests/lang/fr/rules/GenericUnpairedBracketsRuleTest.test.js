// Ported from GenericUnpairedBracketsRuleTest (rules.fr package, fr module)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { GenericUnpairedBracketsRule } from '../../../../src/core/rules/GenericUnpairedBracketsRule.js';
import { JLanguageTool } from '../../../../src/core/JLanguageTool.js';
import { French } from '../../../../src/lang/fr/language/French.js';
import { RuntimeException } from '../../../../src/lib/java/errors.js';

// Java: org.languagetool.rules.GenericUnpairedBracketsRuleTest#getBracketsRule(JLanguageTool)
function getBracketsRule(lt) {
  for (const rule of lt.getAllActiveRules()) {
    if (rule instanceof GenericUnpairedBracketsRule) return rule;
  }
  throw new RuntimeException(`Rule not found: ${GenericUnpairedBracketsRule.name}`);
}

describe('GenericUnpairedBracketsRuleTest (fr)', () => {
  // Java: GenericUnpairedBracketsRuleTest#testFrenchRule
  it('testFrenchRule', () => {
    const lt = new JLanguageTool(French.getInstance());
    const rule = getBracketsRule(lt);
    const assertMatches = (input, expectedMatches) => expect(rule.match([lt.getAnalyzedSentence(input)]).length).toBe(expectedMatches);
    // correct sentences:
    assertMatches("(Qu'est ce que c'est ?)", 0);
    // Saxon genitive
    assertMatches("Harper's Dictionary of Classical Antiquities", 0);
    assertMatches('Harper’s Dictionary of Classical Antiquities', 0);
    // incorrect sentences:
    assertMatches("(Qu'est ce que c'est ?", 1);
  });
});
