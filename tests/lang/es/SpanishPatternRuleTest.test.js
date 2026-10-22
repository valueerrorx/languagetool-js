// Ported from SpanishPatternRuleTest (es module)
import { describe, it } from 'vitest';
import '../../../src/lang/register.js';
import { Languages } from '../../../src/core/Languages.js';
import { PatternRuleTest } from '../../support/PatternRuleTest.js';
import { simulateNoEnglishModule } from '../../support/NoEnglishModule.js';

simulateNoEnglishModule(); // the Java es module tests run without the en module on the classpath

const LONG = 3600000;

describe('SpanishPatternRuleTest', () => {
  // Java: SpanishPatternRuleTest#testRules
  it('testRules', async () => {
    const t = new PatternRuleTest();
    await t.runTestForLanguage(Languages.getLanguageForShortCode('es'));
    t.ruleErrors.verify();
  }, LONG);
});
