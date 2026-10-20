// Ported from SpellIgnoreTest (en module)
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { JLanguageTool } from '../../../src/core/JLanguageTool.js';
import { AmericanEnglish } from '../../../src/lang/en/language/AmericanEnglish.js';
import { SpellingCheckRule } from '../../../src/core/rules/spelling/SpellingCheckRule.js';

describe('SpellIgnoreTest', () => {
  // Java: SpellIgnoreTest#testIgnore; code also used in https://dev.languagetool.org/java-api
  it('testIgnore', () => {
    const text = 'This is a text with specialword and myotherword';
    const lt = new JLanguageTool(AmericanEnglish.getInstance());
    expect(lt.check(text).length).toBe(2);
    for (const rule of lt.getAllActiveRules()) {
      if (rule instanceof SpellingCheckRule) {
        const wordsToIgnore = ['specialword', 'myotherword'];
        rule.addIgnoreTokens(wordsToIgnore);
      }
    }
    expect(lt.check(text).length).toBe(0);
  });
});
