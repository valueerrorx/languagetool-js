// Ported from RegexPatternRuleTest (languagetool-core); Demo language replaced by tests/support/DemoLanguage.js
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { JLanguageTool } from '../../../src/core/JLanguageTool.js';
import { DemoLanguage, useXxTestResources } from '../../support/DemoLanguage.js';

describe('RegexPatternRuleTest', () => {
  useXxTestResources();

  // Java: RegexPatternRuleTest#testMatch
  it('testMatch', () => {
    const lt = new JLanguageTool(new DemoLanguage());
    const rule = lt.getPatternRulesByIdAndSubId('REGEX_PATTERN_RULE_DEMO_MARK_0', '1')[0];

    expect(rule.match(lt.getAnalyzedSentence('This is a test')).length).toBe(0);

    const matches2 = rule.match(lt.getAnalyzedSentence('This is foo bar'));
    expect(matches2.length).toBe(1);
    expect(matches2[0].getFromPos()).toBe(8);
    expect(matches2[0].getToPos()).toBe(15);

    const matches3 = rule.match(lt.getAnalyzedSentence('This is foo bar and fou bar'));
    expect(matches3.length).toBe(2);
    expect(matches3[0].getFromPos()).toBe(8);
    expect(matches3[0].getToPos()).toBe(15);
    expect(matches3[0].getMessage()).toBe('msg: <suggestion>a suggestion foo</suggestion>');
    expect(`[${matches3[0].getSuggestedReplacements().join(', ')}]`).toBe('[a suggestion foo, another suggestion bar]');
    expect(matches3[1].getFromPos()).toBe(20);
    expect(matches3[1].getToPos()).toBe(27);
    expect(matches3[1].getMessage()).toBe('msg: <suggestion>a suggestion fou</suggestion>');
    expect(`[${matches3[1].getSuggestedReplacements().join(', ')}]`).toBe('[a suggestion fou, another suggestion bar]');
  });

  // Java: RegexPatternRuleTest#testMatchWithMark
  it('testMatchWithMark', () => {
    const lt = new JLanguageTool(new DemoLanguage());
    const rule = lt.getPatternRulesByIdAndSubId('REGEX_PATTERN_RULE_DEMO_MARK_1', '1')[0];
    const matches2 = rule.match(lt.getAnalyzedSentence('This is foo bar'));
    expect(matches2.length).toBe(1);
    expect(matches2[0].getFromPos()).toBe(8);
    expect(matches2[0].getToPos()).toBe(11);
  });
});
