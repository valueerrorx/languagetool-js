// Extra test for RuleWithLanguage (no Java test class)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { Languages } from '../../../../src/core/Languages.js';
import { RuleWithLanguage } from '../../../../src/core/rules/spelling/RuleWithLanguage.js';
import { DoublePunctuationRule } from '../../../../src/core/rules/DoublePunctuationRule.js';
import { englishMessages } from '../../../support/ruleTestSupport.js';

describe('RuleWithLanguage', () => {
  it('holds rule and language, equals by both', () => {
    const l = Languages.getLanguageForShortCode('en-US');
    const r = new DoublePunctuationRule(englishMessages(), l);
    const a = new RuleWithLanguage(r, l);
    expect(a.getRule()).toBe(r);
    expect(a.getLanguage()).toBe(l);
    expect(a.equals(new RuleWithLanguage(r, l))).toBe(true);
    expect(a.equals(new RuleWithLanguage(r, Languages.getLanguageForShortCode('en-GB')))).toBe(false);
    expect(() => new RuleWithLanguage(null, l)).toThrow();
  });
});
