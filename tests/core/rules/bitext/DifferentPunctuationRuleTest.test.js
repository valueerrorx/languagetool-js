// Ported from DifferentPunctuationRuleTest (languagetool-core).
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { JLanguageTool } from '../../../../src/core/JLanguageTool.js';
import { DifferentPunctuationRule } from '../../../../src/core/bitext/DifferentPunctuationRule.js';
import { DemoLanguage, useXxTestResources } from '../../../support/DemoLanguage.js';
import { FakeLanguage } from '../../../support/FakeLanguage.js';

describe('DifferentPunctuationRuleTest', () => {
  useXxTestResources();

  // Java: DifferentPunctuationRuleTest#testRule
  it('testRule', () => {
    const rule = new DifferentPunctuationRule();
    const demo = new DemoLanguage();
    const srcLangTool = new JLanguageTool(demo);
    const trgLangTool = new JLanguageTool(new FakeLanguage());
    rule.setSourceLanguage(demo);
    // correct sentences:
    let matches = rule.match(srcLangTool.getAnalyzedSentence('This is a test sentence!'), trgLangTool.getAnalyzedSentence("C'est la vie!"));
    expect(matches.length).toBe(0);

    matches = rule.match(srcLangTool.getAnalyzedSentence('one sentence'), trgLangTool.getAnalyzedSentence('jedno zdanie'));
    expect(matches.length).toBe(0);

    // incorrect sentences:
    matches = rule.match(srcLangTool.getAnalyzedSentence('This this is a test sentence.'), trgLangTool.getAnalyzedSentence('This this is a test sentence!'));
    expect(matches.length).toBe(1);
  });
});
