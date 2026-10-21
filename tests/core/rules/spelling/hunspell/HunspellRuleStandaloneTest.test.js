// Ported from HunspellRuleTest (languagetool-standalone, package org.languagetool.spelling)
import { describe, it, expect } from 'vitest';
import '../../../../../src/lang/register.js';
import { Languages } from '../../../../../src/core/Languages.js';
import { JLanguageTool } from '../../../../../src/core/JLanguageTool.js';

describe('HunspellRuleTest (standalone)', () => {
  // Java: HunspellRuleTest#testRuleWithGermanAndAltLang
  it('testRuleWithGermanAndAltLang', () => {
    const altLangs = [Languages.getLanguageForShortCode('en-US')];
    const lt = new JLanguageTool(Languages.getLanguageForShortCode('de-DE'), altLangs, null, null, null, null);
    const matches = lt.check('Der ROI ist schoon.');
    expect(matches.length).toEqual(1);
    expect(matches[0].getMessage().includes('Tippfehler')).toBe(true);
  }, 120000);
});
