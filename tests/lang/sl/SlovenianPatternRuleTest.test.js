// Ported from SlovenianPatternRuleTest (sl module); testRules runs the Slovenian language only (core test language xx is covered by DemoPatternRuleTest)
import { describe, it } from 'vitest';
import '../../../src/lang/register.js';
import { Languages } from '../../../src/core/Languages.js';
import { PatternRuleTest } from '../../support/PatternRuleTest.js';
import { simulateNoEnglishModule } from '../../support/NoEnglishModule.js';

simulateNoEnglishModule(); // the Java sl module tests run without the en module on the classpath

const LONG = 3600000;

describe('SlovenianPatternRuleTest', () => {
  // Java: SlovenianPatternRuleTest#testRules
  it('testRules', async () => {
    const t = new PatternRuleTest();
    // Slovenian is the first language of the Java sl module classpath (skipCountryVariant false), so it is run directly
    await t.runTestForLanguage(Languages.getLanguageForShortCode('sl'));
    t.ruleErrors.verify();
  }, LONG);
});
