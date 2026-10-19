// Ported from MorfologikAmericanSpellerRuleTest (en module); no-op disambiguator/chunker (F32/F44 pending, F45 disambiguation.xml)
import { describe, it, expect, beforeAll } from 'vitest';
import '../../../../src/lang/register.js';
import { UserConfig } from '../../../../src/core/rules/model/UserConfig.js';
import { Languages } from '../../../../src/core/Languages.js';
import { MorfologikAmericanSpellerRule } from '../../../../src/lang/en/rules/MorfologikAmericanSpellerRule.js';
import { MorfologikCanadianSpellerRule } from '../../../../src/lang/en/rules/MorfologikCanadianSpellerRule.js';
import { AbstractEnglishSpellerRuleTest } from '../../../support/AbstractEnglishSpellerRuleTest.js';
import { englishMessages as enMessages, newLt, useNoopAnalysis } from '../../../support/ruleTestSupport.js';

describe('MorfologikAmericanSpellerRuleTest', () => {
  const language = Languages.getLanguageForShortCode('en-US');
  useNoopAnalysis(language, Languages.getLanguageForShortCode('en-CA'));
  const base = new AbstractEnglishSpellerRuleTest();
  let rule;
  let lt;
  let caRule;
  let caLangTool;

  // Java: MorfologikAmericanSpellerRuleTest#setup (@BeforeClass)
  beforeAll(() => {
    rule = new MorfologikAmericanSpellerRule(enMessages(), language);
    lt = newLt(language);
    const canadianEnglish = Languages.getLanguageForShortCode('en-CA');
    caRule = new MorfologikCanadianSpellerRule(enMessages(), canadianEnglish, null, []);
    caLangTool = newLt(canadianEnglish);
  });

  // Java: MorfologikAmericanSpellerRuleTest#testSuggestionForMisspelledHyphenatedWords
  it('testSuggestionForMisspelledHyphenatedWords', () => {
    // one word in compound misspelled:
    assertSuggestion("one-diminensional", "one-dimensional");
    //assertSuggestion("web-bassed", "web-based");
    assertSuggestion("parple-people-eater", "purple-people-eater");
  });

  // Java: MorfologikAmericanSpellerRuleTest#testNamedEntityIgnore
  it('testNamedEntityIgnore', () => {
    const language = Languages.getLanguageForShortCode("en-US");
    const map = new Map();
    map.set("Peter", 100);
    map.set("Petr", 10);
    const lm = { counts: map }; // Java: FakeLanguageModel(map) (core test class, not ported); the rule only checks "instanceof BaseLanguageModel"
    const rule = new MorfologikAmericanSpellerRule(enMessages(), language, null, null, null, lm, null);
    //String s = "He was the son of Mehmed II (1432–81) and Valide Sultan Gülbahar Hatun, who died in 1492.";
    //String s = "This is a test with Elmar Reimann.";
    const s = "This is a test with Petr Smith.";
    const matches = rule.match(lt.getAnalyzedSentence(s));
    //System.out.println(Arrays.toString(matches));
  });

  // Java: MorfologikAmericanSpellerRuleTest#testSuggestions
  it('testSuggestions', () => {
    const language = Languages.getLanguageForShortCode("en-US");
    const rule = new MorfologikAmericanSpellerRule(enMessages(), language);
    base.testNonVariantSpecificSuggestions(rule, language);
  });

  // Java: MorfologikAmericanSpellerRuleTest#testVariantMessages
  it('testVariantMessages', () => {
    const language = Languages.getLanguageForShortCode("en-US");
    const rule = new MorfologikAmericanSpellerRule(enMessages(), language);
    const matches = rule.match(lt.getAnalyzedSentence("This is a nice colour."));
    expect(matches.length).toBe(1);
    expect(matches[0].getMessage().includes("is British English")).toBe(true);
    const matches2 = rule.match(lt.getAnalyzedSentence("Colour is the British words."));
    expect(matches2.length).toBe(1);
    expect(matches2[0].getMessage().includes("is British English")).toBe(true);
  });

  // Java: MorfologikAmericanSpellerRuleTest#testUserDict
  it('testUserDict', () => {
    const language = Languages.getLanguageForShortCode("en-US");
    const userConfig = new UserConfig(["mytestword", "mytesttwo"]);
    const rule = new MorfologikAmericanSpellerRule(enMessages(), language, userConfig, []);
    expect(rule.match(lt.getAnalyzedSentence("mytestword")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("mytesttwo")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("mytestthree")).length).toBe(1);
  });

  // Java: MorfologikAmericanSpellerRuleTest#testMorfologikSpeller
  it('testMorfologikSpeller', () => {

    expect(rule.match(lt.getAnalyzedSentence("mansplaining")).length).toBe(0); // test merge of spelling.txt
    // test suggesting words with diacritics
    expect(rule.match(lt.getAnalyzedSentence("fianc"))[0].getSuggestedReplacements().includes("fiancé")).toBe(true);


    // correct sentences:
    expect(rule.match(lt.getAnalyzedSentence("This is an example: we get behavior as a dictionary word.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("Why don't we speak today.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("An URL like http://sdaasdwe.com is no error.")).length).toBe(0);
    //with doesn't
    expect(rule.match(lt.getAnalyzedSentence("He doesn't know what to do.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence(",")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("123454")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("I like my emoji 😾")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("μ")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("I like my emoji ❤️")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("This is English text 🗺.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("Yes ma'am.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("Yes ma’am.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("'twas but a dream of thee")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("fo'c'sle")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("O'Connell, O’Connell, O'Connor, O’Neill")).length).toBe(0);
    // non-ASCII characters
    expect(rule.match(lt.getAnalyzedSentence("5¼\" floppy disk drive")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("a visual magnitude of -2½")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("Water freezes at 0º C. 175ºC")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("33°5′40″N and 32°59′0″E.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("It's up to 5·10-³ meters.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("141°00′7.128″W")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("1031－1095")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("It is thus written 1″.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("a 30½-inch scale length.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("symbolically stated as A ∈ ℝ3.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("Thus ℵ0 is a regular cardinal.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("the classical space B(ℓ2)")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("🏽")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("🧡🚴🏽♂️ , 🎉💛✈️")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("компьютерная")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("中文維基百科 中文维基百科")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("The statements¹ of⁷ the⁵⁰ government⁹‽")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("At 3 o'clock.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("At 3 o’clock.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("fast⇿superfast")).length).toBe(0);

    // multiwords.txt

    assertSuggestion("Abu-Bakr", "Abu Bakr");
    assertSuggestion("Abudhabi", "Abu Dhabi");
    //assertSuggestion("Burkina-Faso", "Burkina Faso");
    //assertSuggestion("Deutschmark", "Deutsche Mark");
    assertSuggestion("Casagrande", "Casa Grande");
    assertSuggestion("ELPASO", "El Paso");
    assertSuggestion("Eldorado", "El Dorado");
    assertSuggestion("nom-de-plume", "nom de plume");
    assertSuggestion("sui-generis", "sui generis");
    assertSuggestion("Wiener-Neustadt", "Wiener Neustadt");
    assertSuggestion("Zyklon-B", "Zyklon B");
    
    // test words in language-specific spelling_en-US.txt
    //assertEquals(0, rule.match(lt.getAnalyzedSentence("USTestWordToBeIgnored")).length);
    //assertEquals(1, rule.match(lt.getAnalyzedSentence("NZTestWordToBeIgnored")).length);

    //incorrect sentences:

    const matches1 = rule.match(lt.getAnalyzedSentence("behaviour"));
    // check match positions:
    expect(matches1.length).toBe(1);
    expect(matches1[0].getFromPos()).toBe(0);
    expect(matches1[0].getToPos()).toBe(9);
    expect(matches1[0].getSuggestedReplacements()[0]).toBe("behavior");

    expect(rule.match(lt.getAnalyzedSentence("aõh")).length).toBe(1);
    expect(rule.match(lt.getAnalyzedSentence("a")).length).toBe(0);
    
    //based on replacement pairs:

    const matches2 = rule.match(lt.getAnalyzedSentence("He teached us."));
    // check match positions:
    expect(matches2.length).toBe(1);
    expect(matches2[0].getFromPos()).toBe(3);
    expect(matches2[0].getToPos()).toBe(10);
    expect(matches2[0].getSuggestedReplacements()[0]).toBe("taught");
    
    // hyphens - accept words if all their parts are okay:
    expect(rule.match(lt.getAnalyzedSentence("A web-based software.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("A wxeb-based software.")).length).toBe(1);
    expect(rule.match(lt.getAnalyzedSentence("A web-baxsed software.")).length).toBe(1);
    // yes, we also accept fantasy words:
    expect(rule.match(lt.getAnalyzedSentence("A web-feature-driven-car software.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("A web-feature-drivenx-car software.")).length).toBe(1);

    base.assertAllMatches(lt, rule, "robinson", "Robinson", "robin son", "robins on", "Robson", "Robeson", "robins", "Roberson", "Robins");
  });

  // Java: MorfologikAmericanSpellerRuleTest#testMorfologikSpeller (assertions that need multiwords.txt accepted through the EnglishHybridDisambiguator, F45)
  it.skip('testMorfologikSpeller (multiwords)', () => {
    expect(rule.match(lt.getAnalyzedSentence("Qur'an")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("viva voce, a fortiori, in vitro")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("C'est la vie.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("c’est la guerre!")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("Andorra la Vella is the capital and largest city of Andorra.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("bona fides.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("doctor honoris causa")).length).toBe(0);

    // contractions with apostrophe
    expect(rule.match(lt.getAnalyzedSentence("You're only foolin' round.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("You’re only foolin’ round.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("This is freakin' hilarious.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("It's the meal that keeps on givin'.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("Don't Stop Believin'.")).length).toBe(0);
    
    expect(rule.match(lt.getAnalyzedSentence("wrongwordin'")).length).toBe(1);
    expect(rule.match(lt.getAnalyzedSentence("wrongwordin’")).length).toBe(1);
  });

  // Java: MorfologikAmericanSpellerRuleTest#testIgnoredChars
  it('testIgnoredChars', () => {
    expect(rule.match(lt.getAnalyzedSentence("software")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("soft\u00ADware")).length).toBe(0);

    expect(rule.match(lt.getAnalyzedSentence("A software")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("A soft\u00ADware")).length).toBe(0);
  });

  // Java: MorfologikAmericanSpellerRuleTest#testIgnoredChars (lt.check part); needs Language#getRelevantRules of en (F50) and the English analysis chain (F44/F45)
  it.skip('testIgnoredChars (lt.check)', () => {
    const ruleMatchesWithoutMerge = lt.check("sux\u00AD tainability");
    expect(ruleMatchesWithoutMerge.length).toBe(2);
    // make sure we offset correctly for ignored characters
    // changed 0,4 -> 0,3 after \00AD is handled by annotated text
    expect([ruleMatchesWithoutMerge[0].getFromPos(), ruleMatchesWithoutMerge[0].getToPos()]).toEqual([0, 3]);
    expect([ruleMatchesWithoutMerge[1].getFromPos(), ruleMatchesWithoutMerge[1].getToPos()]).toEqual([5, 16]);

    // see issue #1769
    const ruleMatches = lt.check("The sus\u00AD tainability");
    expect(ruleMatches.length).toBe(1);
    // make sure we offset correctly for ignored characters
    expect([ruleMatches[0].getFromPos(), ruleMatches[0].getToPos()]).toEqual([4, 20]);
  });

  // Java: MorfologikAmericanSpellerRuleTest#testRuleWithWrongSplit
  it('testRuleWithWrongSplit', () => {
    const lang = Languages.getLanguageForShortCode("en-US");
    const rule = new MorfologikAmericanSpellerRule(enMessages(), lang);
    const lt = newLt(lang);
    
    const matches1 = rule.match(lt.getAnalyzedSentence("But than kyou for the feedback"));
    expect(matches1.length).toBe(1);
    expect(matches1[0].getSuggestedReplacements()[0]).toBe("thank you");
    expect(matches1[0].getFromPos()).toBe(4);
    expect(matches1[0].getToPos()).toBe(13);
    //assertThat(matches1[1].getSuggestedReplacements().get(0), is("you"));

    const matches2 = rule.match(lt.getAnalyzedSentence("But thanky ou for the feedback"));
    expect(matches2.length).toBe(1);
    expect(matches2[0].getSuggestedReplacements()[0]).toBe("thank you");
    expect(matches2[0].getFromPos()).toBe(4);
    expect(matches2[0].getToPos()).toBe(13);
    //assertThat(matches2[1].getSuggestedReplacements().get(0), is("of"));

    const matches3 = rule.match(lt.getAnalyzedSentence("But thank you for th efeedback"));
    expect(matches3.length).toBe(1);
    expect(matches3[0].getSuggestedReplacements()[0]).toBe("the feedback");
    expect(matches3[0].getFromPos()).toBe(18);
    expect(matches3[0].getToPos()).toBe(30);
    //assertThat(matches3[1].getSuggestedReplacements().get(0), is("feedback"));

    const matches4 = rule.match(lt.getAnalyzedSentence("But thank you for thef eedback"));
    expect(matches4.length).toBe(1);
    expect(matches4[0].getSuggestedReplacements()[0]).toBe("the feedback");
    expect(matches4[0].getFromPos()).toBe(18);
    expect(matches4[0].getToPos()).toBe(30);
    //assertThat(matches4[1].getSuggestedReplacements().get(0), is("feedback"));

    const matches5 = rule.match(lt.getAnalyzedSentence("But thnk you fo rthe feedback"));
    expect(matches5.length).toBe(2);
    expect(matches5[0].getSuggestedReplacements()[0]).toBe("tank"); // not really a good first suggestion...
    expect(matches5[1].getSuggestedReplacements().length).toBe(1);
    expect(matches5[1].getSuggestedReplacements()[0]).toBe("for the");
    expect(matches5[1].getFromPos()).toBe(13);
    expect(matches5[1].getToPos()).toBe(20);
    //assertThat(matches5[2].getSuggestedReplacements().get(0), is("the"));

    const matches6 = rule.match(lt.getAnalyzedSentence("LanguageTol offer sspell checking"));
    expect(matches6.length).toBe(2);
    expect(matches6[0].getSuggestedReplacements()[0]).toBe("LanguageTool");
    //assertThat(matches6[1].getSuggestedReplacements().size(), is(1));
    expect(matches6[1].getSuggestedReplacements()[0]).toBe("offers spell");
    expect(matches6[1].getFromPos()).toBe(12);
    expect(matches6[1].getToPos()).toBe(24);
    //assertThat(matches6[2].getSuggestedReplacements().get(0), is("spell"));
    
    const matches8 = rule.match(lt.getAnalyzedSentence("I'm g oing"));
    expect(matches8.length).toBe(1);
    expect(matches8[0].getSuggestedReplacements()[0]).toBe("going");
    expect(matches8[0].getFromPos()).toBe(4);
    expect(matches8[0].getToPos()).toBe(10);
    
    const matches9 = rule.match(lt.getAnalyzedSentence("I'm go ing"));
    expect(matches9.length).toBe(1);
    expect(matches9[0].getSuggestedReplacements()[0]).toBe("going");
    expect(matches9[0].getFromPos()).toBe(4);
    expect(matches9[0].getToPos()).toBe(10);
    
    const matches10 = rule.match(lt.getAnalyzedSentence("to thow"));
    expect(matches10.length).toBe(1);
    expect(matches10[0].getFromPos()).toBe(3);
    expect(matches10[0].getToPos()).toBe(7);
    expect(matches10[0].getSuggestedReplacements()[0]).toBe("show"); // not really a good first suggestion... "throw" is 5th
    
    const matches11 = rule.match(lt.getAnalyzedSentence("dditionally, this is it."));
    expect(matches11.length).toBe(1);
    expect(matches11[0].getSuggestedReplacements()[0]).toBe("Additionally");
    expect(matches11[0].getFromPos()).toBe(0);
    expect(matches11[0].getToPos()).toBe(11);
  });

  // Java: MorfologikAmericanSpellerRuleTest#testSuggestionForIrregularWords
  it('testSuggestionForIrregularWords', () => {
    // verbs:
    assertSuggestion("He teached us.", "taught");
    assertSuggestion("He buyed the wrong brand", "bought");
    assertSuggestion("I thinked so.", "thought");
    //assertSuggestion("She awaked", "awoke");   // to be added to spelling.txt
    assertSuggestion("She becomed", "became");
    assertSuggestion("It begined", "began");
    assertSuggestion("It bited", "bit");
    assertSuggestion("She dealed", "dealt");
    assertSuggestion("She drived", "drove");
    assertSuggestion("He drawed", "drew");
    assertSuggestion("She finded", "found");
    assertSuggestion("It hurted", "hurt");
    assertSuggestion("It was keeped", "kept");
    assertSuggestion("He maked", "made");
    assertSuggestion("She runed", "ran");
    assertSuggestion("She selled", "sold");
    assertSuggestion("He speaked", "spoke"); //needs dict update to not include 'spake'

    // double consonants not yet supported:
    //assertSuggestion("He cutted", "cut");
    //assertSuggestion("She runned", "ran");

    // nouns:
    assertSuggestion("auditory stimuluses", "stimuli");
    assertSuggestion("analysises", "analyses");
    assertSuggestion("parenthesises", "parentheses");
    assertSuggestion("childs", "children");
    assertSuggestion("womans", "women");
    //accepted by spell checker, e.g. as third-person verb:
    // foots, mouses, man
    
    // adjectives (comparative):
    assertSuggestion("gooder", "better");
    assertSuggestion("bader", "worse");
    assertSuggestion("farer", "further", "farther");
    //accepted by spell checker:
    //badder

    // adjectives (superlative):
    assertSuggestion("goodest", "best");
    assertSuggestion("badest", "worst");
    assertSuggestion("farest", "furthest", "farthest");
    //double consonants not yet supported:
    //assertSuggestion("baddest", "worst");
    // suggestions from language specific spelling_en-XX.txt
    /*assertSuggestion("USTestWordToBeIgnore", "USTestWordToBeIgnored");
    assertSuggestion("CATestWordToBeIgnore", "USTestWordToBeIgnored");
    assertSuggestion("CATestWordToBeIgnore", caRule, caLangTool, "CATestWordToBeIgnored");
    assertSuggestion("CATestWordToBeIgnore", "USTestWordToBeIgnored"); // test again because of caching*/
  });

  // Java: MorfologikAmericanSpellerRuleTest#testIsMisspelled
  it('testIsMisspelled', () => {
    expect(rule.isMisspelled("sdadsadas")).toBe(true);
    expect(rule.isMisspelled("bicylce")).toBe(true);
    expect(rule.isMisspelled("tabble")).toBe(true);
    expect(rule.isMisspelled("tabbles")).toBe(true);

    expect(rule.isMisspelled("bicycle")).toBe(false);
    expect(rule.isMisspelled("table")).toBe(false);
    expect(rule.isMisspelled("tables")).toBe(false);
  });

  // Java: MorfologikAmericanSpellerRuleTest#testGetOnlySuggestions
  it('testGetOnlySuggestions', () => {
    expect(rule.getOnlySuggestions("cemetary").length).toBe(1);
    expect(rule.getOnlySuggestions("cemetary")[0].getReplacement()).toBe("cemetery");
    expect(rule.getOnlySuggestions("Cemetary").length).toBe(1);
    expect(rule.getOnlySuggestions("Cemetary")[0].getReplacement()).toBe("Cemetery");
    const matches = rule.match(lt.getAnalyzedSentence("cemetary"));
    expect(matches.length).toBe(1);
    expect(matches[0].getSuggestedReplacements().length).toBe(1);
    expect(matches[0].getSuggestedReplacements()[0]).toBe("cemetery");
  });

  // Java: MorfologikAmericanSpellerRuleTest#assertSuggestion(String,String...)
  function assertSuggestion(input, ...expectedSuggestions) {
    assertSuggestionWith(input, rule, lt, ...expectedSuggestions);
  }

  // Java: MorfologikAmericanSpellerRuleTest#assertSuggestion(String,Rule,JLanguageTool,String...)
  function assertSuggestionWith(input, rule_, lt_, ...expectedSuggestions) {
    assertSuggestionLists(input, [[...expectedSuggestions]], lt_, rule_);
  }

  // Java: MorfologikAmericanSpellerRuleTest#assertSuggestion(String,List,JLanguageTool,Rule)
  function assertSuggestionLists(input, expectedSuggestionLists, lt_, rule_) {
    const matches = rule_.match(lt_.getAnalyzedSentence(input));
    expect(matches.length, `Expected ${expectedSuggestionLists.length} match, got: [${matches.join(', ')}]`).toBe(expectedSuggestionLists.length);
    let i = 0;
    for (const expectedSuggestions of expectedSuggestionLists) {
      expect(matches[i].getSuggestedReplacements().length >= expectedSuggestions.length,
        `Expected >= ${expectedSuggestions.length}, got: [${matches[0].getSuggestedReplacements().join(', ')}]`).toBe(true);
      for (const expectedSuggestion of expectedSuggestions) {
        expect(matches[i].getSuggestedReplacements().includes(expectedSuggestion),
          `Replacements '[${matches[i].getSuggestedReplacements().join(', ')}]' don't contain expected replacement '${expectedSuggestion}'`).toBe(true);
      }
      i++;
    }
  }
});
