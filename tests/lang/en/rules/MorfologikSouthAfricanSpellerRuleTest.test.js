// Ported from MorfologikSouthAfricanSpellerRuleTest (en module); no-op disambiguator/chunker (F32/F44 pending, F45 disambiguation.xml)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { Languages } from '../../../../src/core/Languages.js';
import { MorfologikSouthAfricanSpellerRule } from '../../../../src/lang/en/rules/MorfologikSouthAfricanSpellerRule.js';
import { AbstractEnglishSpellerRuleTest } from '../../../support/AbstractEnglishSpellerRuleTest.js';
import { englishMessages as enMessages, newLt, useNoopAnalysis } from '../../../support/ruleTestSupport.js';

describe('MorfologikSouthAfricanSpellerRuleTest', () => {
  useNoopAnalysis(Languages.getLanguageForShortCode('en-ZA'));
  const base = new AbstractEnglishSpellerRuleTest();


  // Java: MorfologikSouthAfricanSpellerRuleTest#testSuggestions
  it('testSuggestions', () => {
    const language = Languages.getLanguageForShortCode("en-ZA");
    const rule = new MorfologikSouthAfricanSpellerRule(enMessages(), language, null, []);
    base.testNonVariantSpecificSuggestions(rule, language);

    const lt = newLt(language);
    // suggestions from language specific spelling_en-XX.txt
    //assertSuggestion(rule, lt, "ZATestWordToBeIgnore", "ZATestWordToBeIgnored");
  });

  // Java: MorfologikSouthAfricanSpellerRuleTest#testMorfologikSpeller
  it('testMorfologikSpeller', () => {
    const language = Languages.getLanguageForShortCode("en-ZA");
    const rule =
            new MorfologikSouthAfricanSpellerRule (enMessages(), language, null, []);

    const lt = newLt(language);

    // correct sentences:
    expect(rule.match(lt.getAnalyzedSentence("This is an example: we get behaviour as a dictionary word.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("Why don't we speak today.")).length).toBe(0);
    //with doesn't
    expect(rule.match(lt.getAnalyzedSentence("He doesn't know what to do.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence(",")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("123454")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("μ")).length).toBe(0);

    //South African dict:
    expect(rule.match(lt.getAnalyzedSentence("Amanzimnyama")).length).toBe(0);

    //incorrect sentences:

    const matches1 = rule.match(lt.getAnalyzedSentence("behavior"));
    // check match positions:
    expect(matches1.length).toBe(1);
    expect(matches1[0].getFromPos()).toBe(0);
    expect(matches1[0].getToPos()).toBe(8);
    expect(matches1[0].getSuggestedReplacements()[0]).toBe("behaviour");

    expect(rule.match(lt.getAnalyzedSentence("aõh")).length).toBe(1);
    expect(rule.match(lt.getAnalyzedSentence("a")).length).toBe(0);
    
    //based on replacement pairs:

    const matches2 = rule.match(lt.getAnalyzedSentence("He teached us."));
    // check match positions:
    expect(matches2.length).toBe(1);
    expect(matches2[0].getFromPos()).toBe(3);
    expect(matches2[0].getToPos()).toBe(10);
    expect(matches2[0].getSuggestedReplacements()[0]).toBe("taught");
  });
});
