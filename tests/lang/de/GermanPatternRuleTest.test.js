// Ported from GermanPatternRuleTest (de module); testRules runs the German variants only (Java also runs the core test language xx, covered by DemoPatternRuleTest)
import { describe, it } from 'vitest';
import '../../../src/lang/register.js';
import { Languages } from '../../../src/core/Languages.js';
import { PatternRuleTest } from '../../support/PatternRuleTest.js';
import { simulateNoEnglishModule } from '../../support/NoEnglishModule.js';

simulateNoEnglishModule(); // the Java de module tests run without the en module on the classpath

const LONG = 3600000;

describe('GermanPatternRuleTest', () => {
  // Java: GermanPatternRuleTest#testRules (PatternRuleTest#runGrammarRulesFromXmlTest restricted to the German languages; runGrammarRuleForLanguage split into its steps)
  it('testRules', async () => {
    const t = new PatternRuleTest();
    const yieldLoop = () => new Promise((resolve) => setImmediate(resolve)); // lets the vitest worker answer its RPC calls between the long synchronous runs
    for (const lang of Languages.get()) {
      if (lang.getShortCode() !== 'de') continue;
      const code = lang.getShortCodeWithCountryAndVariant();
      if (code === 'de-DE') {
        await t.runTestForLanguage(lang); // tests de-DE-AT/grammar.xml
        await yieldLoop();
        await t.runTestForLanguage(Languages.getLanguageForShortCode('de')); // tests de/grammar.xml
      } else if (code === 'de-CH') {
        await t.runTestForLanguage(lang);
      } else {
        console.log(`Skipping ${lang} because only de-DE and de-CH gets tested for German (assuming there are no de-AT specific rules)`);
      }
      await yieldLoop();
    }
    t.ruleErrors.verify();
  }, LONG);
});
