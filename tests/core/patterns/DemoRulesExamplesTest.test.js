// Extra: PatternRuleTest example checks on the xx rules that are runnable before F32/F34 (rules reaching an unported component are counted as skipped)
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { DemoLanguage, useXxTestResources } from '../../support/DemoLanguage.js';
import { PatternRuleTest } from '../../support/PatternRuleTest.js';
import { JavaHashMap } from '../../../src/lib/java/collections/JavaHashMap.js';
import { MultiThreadedJLanguageTool } from '../../../src/core/MultiThreadedJLanguageTool.js';

describe('DemoRulesExamplesTest', () => {
  useXxTestResources();

  it('checks the examples of every xx rule that does not need F32/F34 components', () => {
    const test = new PatternRuleTest();
    const lang = new DemoLanguage();
    const lt = PatternRuleTest.createToolForTesting(lang);
    const allRulesLt = new MultiThreadedJLanguageTool(lang);
    const rules = test.getAllPatternRules(lang, lt);
    test.validateRuleIds(lang, allRulesLt);
    test.validateSentenceStartNotInMarker(allRulesLt);
    test.validateUnifyIgnoreAtTheStartOfUnify(allRulesLt);
    test.validateParenthesisInSynthesisMatches(allRulesLt);
    test.testRegexSyntax(lang, rules);
    test.testMessages(lang, rules);
    let skipped = 0;
    let tested = 0;
    for (const rule of rules) {
      const before = test.ruleErrors.errors.length;
      try {
        test.testCorrectSentences(lt, allRulesLt, rule);
        test.testBadSentences(lt, allRulesLt, lang, new JavaHashMap(), rule);
        test.testErrorTriggeringSentences(lt, rule);
        tested++;
      } catch (e) {
        if (e.notPorted !== true) throw e;
        test.ruleErrors.errors.length = before;
        skipped++;
      }
    }
    expect(tested).toBeGreaterThan(50);
    expect(skipped).toBeLessThan(10);
    const msgs = test.ruleErrors.errors.map((e) => e.getMessage());
    expect(msgs).toEqual([]);
  }, 60000);
});
