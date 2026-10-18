// Ported from EnglishPatternRuleTest (en module); skipped until the en rule list exists (F50)
import { describe, it } from 'vitest';

describe('EnglishPatternRuleTest', () => {
  // Java: EnglishPatternRuleTest#testRules
  it.skip('testRules', () => { /* runGrammarRulesFromXmlTest(): needs Language#getRelevantRules + XML rules of en (F50), un-skip EnglishPatternRuleTest */ });

  // Java: EnglishPatternRuleTest#testL2Languages
  it.skip('testL2Languages', () => { /* validatePatternFile + runTestForLanguage(L2GermanRulesOnlyEnglish/L2FrenchRulesOnlyEnglish): needs en AmericanEnglish(true) and grammar-l2-*.xml (F50) */ });

  // Java: EnglishPatternRuleTest#testBug
  it.skip('testBug', () => { /* new JLanguageTool(en).check(...): needs the en rule list (F50) */ });
});
