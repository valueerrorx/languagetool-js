// Ported from SameTranslationRuleTest (languagetool-core).
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { JLanguageTool } from '../../../../src/core/JLanguageTool.js';
import { SameTranslationRule } from '../../../../src/core/bitext/SameTranslationRule.js';
import { DemoLanguage, useXxTestResources } from '../../../support/DemoLanguage.js';
import { FakeLanguage } from '../../../support/FakeLanguage.js';

describe('SameTranslationRuleTest', () => {
  useXxTestResources();

  // Java: SameTranslationRuleTest#testRule
  it('testRule', () => {
    const rule = new SameTranslationRule();
    const demo = new DemoLanguage();
    const srcLangTool = new JLanguageTool(demo);
    const trgLangTool = new JLanguageTool(new FakeLanguage());
    rule.setSourceLanguage(demo);
    // correct sentences:
    let matches = rule.match(srcLangTool.getAnalyzedSentence('This is a test sentence.'), trgLangTool.getAnalyzedSentence("C'est la vie !"));
    expect(matches.length).toBe(0);

    // tricky: proper names should be left as is!
    matches = rule.match(srcLangTool.getAnalyzedSentence('Elvis Presley'), trgLangTool.getAnalyzedSentence('Elvis Presley'));
    expect(matches.length).toBe(0);

    // incorrect sentences:
    matches = rule.match(srcLangTool.getAnalyzedSentence('This this is a test sentence.'), trgLangTool.getAnalyzedSentence('This this is a test sentence.'));
    expect(matches.length).toBe(1);
  });
});
