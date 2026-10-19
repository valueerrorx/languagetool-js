// Ported from MorfologikCanadianSpellerRuleTest (en module); no-op disambiguator/chunker (F32/F44 pending, F45 disambiguation.xml)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { Languages } from '../../../../src/core/Languages.js';
import { MorfologikBritishSpellerRule } from '../../../../src/lang/en/rules/MorfologikBritishSpellerRule.js'; // Java: the Canadian test instantiates the British rule
import { MorfologikCanadianSpellerRule } from '../../../../src/lang/en/rules/MorfologikCanadianSpellerRule.js';
import { AbstractEnglishSpellerRuleTest } from '../../../support/AbstractEnglishSpellerRuleTest.js';
import { englishMessages as enMessages, newLt, useNoopAnalysis } from '../../../support/ruleTestSupport.js';

describe('MorfologikCanadianSpellerRuleTest', () => {
  useNoopAnalysis(Languages.getLanguageForShortCode('en-CA'));
  const base = new AbstractEnglishSpellerRuleTest();


  // Java: MorfologikCanadianSpellerRuleTest#testSuggestions
  it('testSuggestions', () => {
    const language = Languages.getLanguageForShortCode("en-CA");
    const rule = new MorfologikCanadianSpellerRule(enMessages(), language, null, []);
    base.testNonVariantSpecificSuggestions(rule, language);

    const lt = newLt(language);
    // suggestions from language specific spelling_en-XX.txt
    //assertSuggestion(rule, lt, "CATestWordToBeIgnore", "CATestWordToBeIgnored");
  });

  // Java: MorfologikCanadianSpellerRuleTest#testMorfologikSpeller
  it('testMorfologikSpeller', () => {
    const language = Languages.getLanguageForShortCode("en-CA");
    const rule =
            new MorfologikBritishSpellerRule(enMessages(), language, null, []);

    const lt = newLt(language);

    // correct sentences:
    expect(rule.match(lt.getAnalyzedSentence("This is an example: we get behaviour as a dictionary word.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("Why don't we speak today.")).length).toBe(0);
    //with doesn't
    expect(rule.match(lt.getAnalyzedSentence("He doesn't know what to do.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence(",")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("123454")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("I like my emoji (😥)...")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("μ")).length).toBe(0);

    //incorrect sentences:

    const matches = rule.match(lt.getAnalyzedSentence("arbor"));
    // check match positions:
    expect(matches.length).toBe(1);
    expect(matches[0].getFromPos()).toBe(0);
    expect(matches[0].getToPos()).toBe(5);
    expect(matches[0].getSuggestedReplacements().includes("arbour")).toBe(true);

    expect(rule.match(lt.getAnalyzedSentence("aõh")).length).toBe(1);
    expect(rule.match(lt.getAnalyzedSentence("a")).length).toBe(0);
  });
});
