// Ported from HunspellRuleTest (languagetool-standalone, package org.languagetool.spelling)
import { describe, it, expect } from 'vitest';
import '../../../../../src/lang/register.js';
import { Languages } from '../../../../../src/core/Languages.js';
import { GermanSpellerRule } from '../../../../../src/lang/de/rules/GermanSpellerRule.js';
import { UserConfig } from '../../../../../src/core/rules/model/UserConfig.js';
import { messagesFor, newLt } from '../../../../support/ruleTestSupport.js';

describe('HunspellRuleTest (standalone)', () => {
  // Java: HunspellRuleTest#testRuleWithGermanAndAltLang (lt.check with the full German rule set needs German#getRelevantRules, F17)
  it.skip('testRuleWithGermanAndAltLang', () => {});

  // Java: HunspellRuleTest#testRuleWithGermanAndAltLang, with a tool that holds only the speller rule (what the full rule set contributes for these words)
  it('testRuleWithGermanAndAltLang (speller only)', () => {
    const de = Languages.getLanguageForShortCode('de-DE');
    const rule = new GermanSpellerRule(messagesFor(Languages.getLanguageForShortCode('de')), de, new UserConfig(), null, [], null);
    const lt = newLt(de, rule);
    const matches = lt.check('Der ROI ist schoon.');
    expect(matches.length).toEqual(1);
    expect(matches[0].getMessage().includes('Tippfehler')).toBe(true);
  });
});
