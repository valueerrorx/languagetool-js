// Ported from MorfologikBritishSpellerRuleTest (en module); no-op disambiguator/chunker (F32/F44 pending, F45 disambiguation.xml)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { Languages } from '../../../../src/core/Languages.js';
import { MorfologikBritishSpellerRule } from '../../../../src/lang/en/rules/MorfologikBritishSpellerRule.js';
import { AbstractEnglishSpellerRuleTest } from '../../../support/AbstractEnglishSpellerRuleTest.js';
import { englishMessages as enMessages, newLt, useNoopAnalysis } from '../../../support/ruleTestSupport.js';

describe('MorfologikBritishSpellerRuleTest', () => {
  useNoopAnalysis(Languages.getLanguageForShortCode('en-GB'));
  const base = new AbstractEnglishSpellerRuleTest();


  // Java: MorfologikBritishSpellerRuleTest#testSuggestions
  it('testSuggestions', () => {
    const language = Languages.getLanguageForShortCode("en-GB");
    const rule = new MorfologikBritishSpellerRule(enMessages(), language, null, []);
    base.testNonVariantSpecificSuggestions(rule, language);

    const lt = newLt(language);
    // suggestions from language specific spelling_en-XX.txt
    //assertSuggestion(rule, lt, "GBTestWordToBeIgnore", "GBTestWordToBeIgnored");
  });

  // Java: MorfologikBritishSpellerRuleTest#testVariantMessages
  it('testVariantMessages', () => {
    const language = Languages.getLanguageForShortCode("en-GB");
    const lt = newLt(language);
    const rule = new MorfologikBritishSpellerRule(enMessages(), language, null, []);
    const matches = rule.match(lt.getAnalyzedSentence("This is a nice color."));
    expect(matches.length).toBe(1);
    expect(matches[0].getMessage().includes("is American English")).toBe(true);
    const matches2 = rule.match(lt.getAnalyzedSentence("Color is the American English word."));
    expect(matches2.length).toBe(1);
    expect(matches2[0].getMessage().includes("is American English")).toBe(true);
  });

  // Java: MorfologikBritishSpellerRuleTest#testMorfologikSpeller (the multiword assertions are in the skipped test below)
  it('testMorfologikSpeller', () => {
    const language = Languages.getLanguageForShortCode("en-GB");
    const rule =
            new MorfologikBritishSpellerRule(enMessages(), language, null, []);

    const lt = newLt(language);

    // correct sentences:
    expect(rule.match(lt.getAnalyzedSentence("This is an example: we get behaviour as a dictionary word.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("Why don't we speak today.")).length).toBe(0);
    //with doesn't
    expect(rule.match(lt.getAnalyzedSentence("He doesn't know what to do.")).length).toBe(0);
    //with diacritics 
    expect(rule.match(lt.getAnalyzedSentence("The entrée at the café.")).length).toBe(0);
    //with an abbreviation:
    expect(rule.match(lt.getAnalyzedSentence("This is my Ph.D. thesis.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence(",")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("123454")).length).toBe(0);
    // Greek letters
    expect(rule.match(lt.getAnalyzedSentence("μ")).length).toBe(0);
    // apostrophes
    expect(rule.match(lt.getAnalyzedSentence("Ma'am, O'Connell, O’Connell, O'Connor, O’Neill")).length).toBe(0);

    //incorrect sentences:

    const matches1 = rule.match(lt.getAnalyzedSentence("Behavior"));
    // check match positions:
    expect(matches1.length).toBe(1);
    expect(matches1[0].getFromPos()).toBe(0);
    expect(matches1[0].getToPos()).toBe(8);
    expect(matches1[0].getSuggestedReplacements()[0]).toBe("Behaviour");

    expect(rule.match(lt.getAnalyzedSentence("aõh")).length).toBe(1);
    expect(rule.match(lt.getAnalyzedSentence("a")).length).toBe(0);
    
    //based on replacement pairs:

    const matches2 = rule.match(lt.getAnalyzedSentence("He teached us."));
    // check match positions:
    expect(matches2.length).toBe(1);
    expect(matches2[0].getFromPos()).toBe(3);
    expect(matches2[0].getToPos()).toBe(10);
    expect(matches2[0].getSuggestedReplacements()[0]).toBe("taught");
    
    const matches3 = rule.match(lt.getAnalyzedSentence("I'm g oing"));
    expect(matches3.length).toBe(1);
    expect(matches3[0].getSuggestedReplacements()[0]).toBe("going");
    expect(matches3[0].getSuggestedReplacements()[1]).toBe("g going");
    expect(matches3[0].getFromPos()).toBe(4);
    expect(matches3[0].getToPos()).toBe(10);
    
    // custom URLs
    const matches4 = rule.match(lt.getAnalyzedSentence("archeological"));
    expect(String(matches4[0].getUrl())).toBe("https://languagetool.org/insights/post/our-or/#likeable-vs-likable-judgement-vs-judgment-oestrogen-vs-estrogen");
    
    
  });

  // Java: MorfologikBritishSpellerRuleTest#testMorfologikSpeller (multiwords part); multiwords.txt entries are accepted through the EnglishHybridDisambiguator (F45), not ported yet
  it.skip('testMorfologikSpeller (multiwords)', () => {
    const language = Languages.getLanguageForShortCode("en-GB");
    const rule = new MorfologikBritishSpellerRule(enMessages(), language, null, []);
    const lt = newLt(language);
    // With multiwords
    expect(rule.match(lt.getAnalyzedSentence("Ménage à trois")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("ménage à trois")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("The quid pro quo")).length).toBe(0);
  });
});
