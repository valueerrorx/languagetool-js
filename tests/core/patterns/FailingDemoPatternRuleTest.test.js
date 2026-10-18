// Ported from FailingDemoPatternRuleTest (languagetool-core): grammar-fail1/2.xml must make PatternRuleTest collect errors
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { DemoWithGrammarFile, useXxTestResources } from '../../support/DemoLanguage.js';
import { PatternRuleErrorCollector, PatternRuleTest } from '../../support/PatternRuleTest.js';

// Java: FailingDemoPatternRuleTest (extends PatternRuleTest with PatternRuleErrorCollector(true))
class FailingPatternRuleTest extends PatternRuleTest {
  // Java: FailingDemoPatternRuleTest#createPatternRuleErrorCollector()
  createPatternRuleErrorCollector() {
    return new PatternRuleErrorCollector(true);
  }
}

describe('FailingDemoPatternRuleTest', () => {
  useXxTestResources();

  // Java: FailingDemoPatternRuleTest#testRulesWithErrors1
  it('testRulesWithErrors1', () => {
    const test = new FailingPatternRuleTest();
    test.runTestForLanguage(new DemoWithGrammarFile('grammar-fail1.xml'));
    test.ruleErrors.check();
    expect(test.ruleErrors.errors.length).toBeGreaterThan(0);
  });

  // Java: FailingDemoPatternRuleTest#testRulesWithErrors2
  it('testRulesWithErrors2', () => {
    const test = new FailingPatternRuleTest();
    test.runTestForLanguage(new DemoWithGrammarFile('grammar-fail2.xml'));
    test.ruleErrors.check();
    expect(test.ruleErrors.errors.length).toBeGreaterThan(0);
  });
});
