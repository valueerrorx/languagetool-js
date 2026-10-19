// Ported from UnitConversionRuleTestHelper (languagetool-core test)
import { expect } from 'vitest';

// Java: UnitConversionRuleTestHelper
export class UnitConversionRuleTestHelper {
  // Java: UnitConversionRuleTestHelper#assertMatches(String,int,String,AbstractUnitConversionRule,JLanguageTool)
  assertMatches(input, expectedMatches, converted, rule, lt) {
    const matches = rule.match(lt.getAnalyzedSentence(input));
    expect(matches.length, `Got matches: [${matches.map((m) => m.toString()).join(', ')}]`).toBe(expectedMatches);
    if (expectedMatches > 0 && converted !== null) {
      const match = matches[0];
      let suggestionCorrect = false;
      let suggestion = null;
      for (const s of match.getSuggestedReplacements()) {
        if (s.includes(converted)) {
          suggestionCorrect = true;
          suggestion = s;
          break;
        }
      }
      expect(suggestionCorrect, `Suggestion is correct: ${suggestion} / expected: ${converted}`).toBe(true);
    }
  }
}
