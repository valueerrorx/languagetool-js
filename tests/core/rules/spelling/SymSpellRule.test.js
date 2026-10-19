// Extra test (Java SymSpellRuleTest is an empty class): SymSpellRule with a user dictionary, no-op analysis
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { Languages } from '../../../../src/core/Languages.js';
import { UserConfig } from '../../../../src/core/rules/model/UserConfig.js';
import { SymSpellRule } from '../../../../src/core/rules/spelling/SymSpellRule.js';
import { englishMessages, newLt, useNoopAnalysis } from '../../../support/ruleTestSupport.js';

describe('SymSpellRule', () => {
  const language = Languages.getLanguageForShortCode('en-US');
  useNoopAnalysis(language);

  it('matches words unknown to the user dictionary and suggests user words', () => {
    const rule = new SymSpellRule(englishMessages(), language, new UserConfig(['foo', 'bar']));
    expect(rule.getId()).toBe('SYMSPELL_RULE');
    const lt = newLt(language, rule);
    const matches = rule.match(lt.getAnalyzedSentence('fooo foo'));
    expect(matches.length).toBe(1);
    expect(matches[0].getMessage()).toBe('Misspelling!');
    expect([matches[0].getFromPos(), matches[0].getToPos()]).toEqual([0, 4]);
    expect(matches[0].getSuggestedReplacements()[0]).toBe('foo'); // user dictionary candidates come first
  });

  it('isMisspelled is not implemented', () => {
    const rule = new SymSpellRule(englishMessages(), language, new UserConfig(['foo']));
    expect(() => rule.isMisspelled('x')).toThrow('not implemented');
  });
});
