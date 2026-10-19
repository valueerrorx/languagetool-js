// Ported from SpellingCheckRuleTest (en module)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { Languages } from '../../../../src/core/Languages.js';
import { SpellingCheckRule } from '../../../../src/core/rules/spelling/SpellingCheckRule.js';
import { RuntimeException } from '../../../../src/lib/java/errors.js';
import { MorfologikAmericanSpellerRule } from '../../../../src/lang/en/rules/MorfologikAmericanSpellerRule.js';
import { englishMessages, newLt, useNoopAnalysis } from '../../../support/ruleTestSupport.js';

describe('SpellingCheckRuleTest', () => {
  const language = Languages.getLanguageForShortCode('en-US');
  useNoopAnalysis(language);
  const lt = newLt(language, new MorfologikAmericanSpellerRule(englishMessages(), language, null, []));

  // Java: SpellingCheckRuleTest#testIgnoreSuggestionsWithMorfologik; adapted: the tool holds only the en-US speller rule (Language#getRelevantRules, F50, is not ported) and the analysis is a no-op (F44/F45)
  it('testIgnoreSuggestionsWithMorfologik', () => {
    expect(lt.check('This is anArtificialTestWordForLanguageTool.').length).toBe(0); // no error, as this word is in ignore.txt
    expect(lt.check('Test adjoint').length).toBe(0); // in spelling.txt
    expect(lt.check('Test Adjoint').length).toBe(0); // in spelling.txt (lowercase)

    const matches2 = lt.check('This is a real typoh.');
    expect(matches2.length).toBe(1);
    expect(matches2[0].getRule().getId()).toBe('MORFOLOGIK_RULE_EN_US');

    expect(String(lt.check('This is Julias new song.')[0].getSuggestedReplacements())).toBe("Julia's,Julia,Julian,Julius,Julies,Julián,Júlia");
    expect(String(lt.check('This is Microsofts new product.')[0].getSuggestedReplacements())).toBe("Microsoft's,Microsoft");
  });

  // Java: SpellingCheckRuleTest#testIgnoreSuggestionsWithMorfologik (the multi-word entry "Al Jazeera" of spelling.txt is accepted through the EnglishHybridDisambiguator, F45)
  it.skip('testIgnoreSuggestionsWithMorfologik (Al Jazeera)', () => {
    expect(lt.check('It was shown on Al Jazeera.').length).toBe(0);
  });

  // Java: SpellingCheckRuleTest#testIgnorePhrases; adapted like the test above (the tool holds only the speller rule, so no other rule has to be disabled)
  it('testIgnorePhrases', () => {
    expect(lt.check('A test with myfoo mybar').length).toBe(2);
    for (const rule of lt.getAllActiveRules()) {
      if (rule instanceof SpellingCheckRule) {
        rule.acceptPhrases(['myfoo mybar', 'Myy othertest']);
      } else {
        lt.disableRule(rule.getId());
      }
    }
    expect(lt.check('A test with myfoo mybar').length).toBe(0);
    expect(lt.check('A test with myfoo and mybar').length).toBe(2); // the words on their own are not ignored
    expect(lt.check('myfoo mybar here').length).toBe(0);
    expect(lt.check('Myfoo mybar here').length).toBe(0);
    expect(lt.check('MYfoo mybar here').length).toBe(2);

    expect(lt.check('Myy othertest is okay').length).toBe(0);
    expect(lt.check('And Myy othertest is okay').length).toBe(0);
    expect(lt.check('But Myy Othertest is not okay').length).toBe(2);
    expect(lt.check('But myy othertest is not okay').length).toBe(2);
  });

  // Java: SpellingCheckRuleTest#testIsUrl
  it('testIsUrl', () => {
    new MySpellCheckingRule().test();
  });
});

// Java: SpellingCheckRuleTest.MySpellCheckingRule
class MySpellCheckingRule extends SpellingCheckRule {
  // Java: MySpellCheckingRule()
  constructor() {
    super(englishMessages(), Languages.getLanguageForShortCode('en-US'), null);
  }

  getId() { return null; }

  getDescription() { return null; }

  match() { return null; }

  isMisspelled() {
    throw new RuntimeException('not implemented');
  }

  // Java: MySpellCheckingRule#test()
  test() {
    expect(this.isUrl('http://www.test.de')).toBe(true);
    expect(this.isUrl('http://www.test-dash.com')).toBe(true);
    expect(this.isUrl('https://www.test-dash.com')).toBe(true);
    expect(this.isUrl('ftp://www.test-dash.com')).toBe(true);
    expect(this.isUrl('http://www.test-dash.com/foo/path-dash')).toBe(true);
    expect(this.isUrl('http://www.test-dash.com/foo/öäü-dash')).toBe(true);
    expect(this.isUrl('http://www.test-dash.com/foo/%C3%B-dash')).toBe(true);
    expect(this.isUrl('www.languagetool.org')).toBe(true);
    expect(this.isUrl('languagetool.org')).toBe(false); // currently not detected
    expect(this.isEMail('martin.mustermann@test.de')).toBe(true);
    expect(this.isEMail('martin.mustermann@test.languagetool.de')).toBe(true);
    expect(this.isEMail('martin-mustermann@test.com')).toBe(true);
    expect(this.isEMail('@test.de')).toBe(false);
    expect(this.isEMail('f.test@test')).toBe(false);
    expect(this.isEMail('f@t.t')).toBe(false);
  }
}
