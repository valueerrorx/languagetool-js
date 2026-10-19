// Ported from MorfologikNewZealandSpellerRuleTest (en module); no-op disambiguator/chunker (F32/F44 pending, F45 disambiguation.xml)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { Languages } from '../../../../src/core/Languages.js';
import { MorfologikNewZealandSpellerRule } from '../../../../src/lang/en/rules/MorfologikNewZealandSpellerRule.js';
import { AbstractEnglishSpellerRuleTest } from '../../../support/AbstractEnglishSpellerRuleTest.js';
import { englishMessages as enMessages, newLt, useNoopAnalysis } from '../../../support/ruleTestSupport.js';

describe('MorfologikNewZealandSpellerRuleTest', () => {
  useNoopAnalysis(Languages.getLanguageForShortCode('en-NZ'));
  const base = new AbstractEnglishSpellerRuleTest();


  // Java: MorfologikNewZealandSpellerRuleTest#testSuggestions
  it('testSuggestions', () => {
    const language = Languages.getLanguageForShortCode("en-NZ");
    const rule = new MorfologikNewZealandSpellerRule(enMessages(), language, null, []);
    base.testNonVariantSpecificSuggestions(rule, language);
  });

  // Java: MorfologikNewZealandSpellerRuleTest#testMorfologikSpeller
  it('testMorfologikSpeller', () => {
    const language = Languages.getLanguageForShortCode("en-NZ");
    const rule =
            new MorfologikNewZealandSpellerRule(enMessages(), language, null, []);

    const lt = newLt(language);

    // correct sentences:
    expect(rule.match(lt.getAnalyzedSentence("This is an example: we get behaviour as a dictionary word.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("Why don't we speak today.")).length).toBe(0);
    //with doesn't
    expect(rule.match(lt.getAnalyzedSentence("He doesn't know what to do.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence(",")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("123454")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("μ")).length).toBe(0);

    //special New Zealand content:
    expect(rule.match(lt.getAnalyzedSentence("Abercrombie")).length).toBe(0);

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

    // test words with diacritics in the spelling dictionary
    expect(rule.match(lt.getAnalyzedSentence("émigré or émigrés")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("tête-à-tête")).length).toBe(0);

  });


});
