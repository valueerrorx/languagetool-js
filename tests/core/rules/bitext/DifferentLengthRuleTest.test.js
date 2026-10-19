// Ported from DifferentLengthRuleTest (languagetool-core).
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { JLanguageTool } from '../../../../src/core/JLanguageTool.js';
import { DifferentLengthRule } from '../../../../src/core/bitext/DifferentLengthRule.js';
import { DemoLanguage, useXxTestResources } from '../../../support/DemoLanguage.js';
import { FakeLanguage } from '../../../support/FakeLanguage.js';

describe('DifferentLengthRuleTest', () => {
  useXxTestResources();

  // Java: DifferentLengthRuleTest#testRule
  it('testRule', () => {
    const rule = new DifferentLengthRule();
    const demo = new DemoLanguage();
    const trgLangTool = new JLanguageTool(demo);
    const srcLangTool = new JLanguageTool(new FakeLanguage());
    rule.setSourceLanguage(demo);
    // correct sentences:
    let matches = rule.match(srcLangTool.getAnalyzedSentence('This is a test sentence.'), trgLangTool.getAnalyzedSentence('To zdanie testowe.'));
    expect(matches.length).toBe(0);

    matches = rule.match(srcLangTool.getAnalyzedSentence('Click this button.'), trgLangTool.getAnalyzedSentence('Kliknij ten przycisk.'));
    expect(matches.length).toBe(0);

    // incorrect sentences:
    matches = rule.match(srcLangTool.getAnalyzedSentence('Open a file, and check if it is corrupt.'), trgLangTool.getAnalyzedSentence('Otwórz plik.'));
    expect(matches.length).toBe(1);
  });
});
