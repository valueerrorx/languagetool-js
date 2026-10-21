// Ported from FrenchPatternRuleTest (fr module); testRules runs the French variants only (Java also runs the core test language xx, covered by DemoPatternRuleTest)
import { describe, it } from 'vitest';
import '../../../src/lang/register.js';
import { Languages } from '../../../src/core/Languages.js';
import { PatternRuleTest } from '../../support/PatternRuleTest.js';
import { simulateNoEnglishModule } from '../../support/NoEnglishModule.js';

simulateNoEnglishModule(); // the Java fr module tests run without the en module on the classpath

const LONG = 3600000;

describe('FrenchPatternRuleTest', () => {
  // Java: FrenchPatternRuleTest#testRules (PatternRuleTest#runGrammarRulesFromXmlTest restricted to the French languages; runGrammarRuleForLanguage per language)
  it('testRules', async () => {
    const t = new PatternRuleTest();
    const yieldLoop = () => new Promise((resolve) => setImmediate(resolve)); // lets the vitest worker answer its RPC calls between the long synchronous runs
    for (const lang of Languages.get()) {
      if (lang.getShortCode() !== 'fr') continue;
      await t.runGrammarRuleForLanguage(lang);
      await yieldLoop();
    }
    t.ruleErrors.verify();
  }, LONG);
});
