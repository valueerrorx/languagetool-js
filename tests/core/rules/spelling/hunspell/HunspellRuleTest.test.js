// Ported from HunspellRuleTest (languagetool-language-modules/de, package org.languagetool.rules.spelling.hunspell)
// testMultitokensWithSepllerRule needs the full German rule set (lt.check, German#getRelevantRules F17): skipped; testPerformance, testSeparateCorrectWordPerformance, testCompoundAwareRulePerformance are @Ignore in Java
import { describe, it, expect } from 'vitest';
import '../../../../../src/lang/register.js';
import { Languages } from '../../../../../src/core/Languages.js';
import { SwissGermanSpellerRule } from '../../../../../src/lang/de/rules/SwissGermanSpellerRule.js';
import { HunspellRule } from '../../../../../src/core/rules/spelling/hunspell/HunspellRule.js';
import { SuggestedReplacement } from '../../../../../src/core/rules/model/SuggestedReplacement.js';
import { messagesFor, newLt } from '../../../../support/ruleTestSupport.js';
import { simulateNoEnglishModule } from '../../../../support/NoEnglishModule.js';

const ls = (l) => `[${l.join(', ')}]`; // Java: List#toString()
const deMessages = () => messagesFor(Languages.getLanguageForShortCode('de')); // Java: TestTools.getMessages("de")

// Java: HunspellRuleTest#assertResult(String,String,int,int,HunspellRule,JLanguageTool)
function assertResult(input, expectedResult, fromPos, toPos, rule, lt) {
  const matches = rule.match(lt.getAnalyzedSentence(input));
  expect(matches.length, `Got != 2 match(es): [${matches.join(', ')}]`).toEqual(2);
  expect(matches[0].getSuggestedReplacements().length).toEqual(1);
  expect(matches[0].getSuggestedReplacements()[0]).toEqual(expectedResult);
  expect(matches[0].getFromPos()).toEqual(fromPos);
  expect(matches[0].getToPos()).toEqual(toPos);
}

// Java: HunspellRuleTest#commonGermanAsserts(HunspellRule,JLanguageTool)
function commonGermanAsserts(rule, lt) {
    expect(rule.match(lt.getAnalyzedSentence("Der Waschmaschinentestversuch")).length).toEqual(0);  // compound
    expect(rule.match(lt.getAnalyzedSentence("Der Waschmaschinentest-Versuch")).length).toEqual(0);  // compound
    expect(rule.match(lt.getAnalyzedSentence("Der Arbeitnehmer")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Die Verhaltensänderung")).length).toEqual(0);

    expect(rule.match(lt.getAnalyzedSentence("Der Waschmaschinentest-Dftgedgs")).length).toEqual(1);
    expect(rule.match(lt.getAnalyzedSentence("Der Dftgedgs-Waschmaschinentest")).length).toEqual(1);
    expect(rule.match(lt.getAnalyzedSentence("Der Waschmaschinentestdftgedgs")).length).toEqual(1);
    expect(rule.match(lt.getAnalyzedSentence("Der Waschmaschinentestversuch orkt")).length).toEqual(1);
    expect(rule.match(lt.getAnalyzedSentence("Der Arbeitsnehmer")).length).toEqual(1);  // wrong interfix
    expect(rule.match(lt.getAnalyzedSentence("Die Verhaltenänderung")).length).toEqual(1);  // missing interfix
    expect(rule.match(lt.getAnalyzedSentence("Der asdegfue orkt")).length).toEqual(2);

}

simulateNoEnglishModule(); // the Java de module tests run without the en module on the classpath

describe('HunspellRuleTest', () => {
  // Java: HunspellRuleTest#testHighConfidenceSuggestion
  it('testHighConfidenceSuggestion', () => {
    let rule = new HunspellRule(deMessages(), Languages.getLanguageForShortCode("de-DE"), null);
    expect(rule.isFirstItemHighConfidenceSuggestion("HAus", [new SuggestedReplacement("HAus")])).toBe(true);
    expect(rule.isFirstItemHighConfidenceSuggestion("EI", [new SuggestedReplacement("Eis")])).toBe(false);
    expect(rule.isFirstItemHighConfidenceSuggestion("CMs", [new SuggestedReplacement("CMS")])).toBe(false);
    expect(rule.isFirstItemHighConfidenceSuggestion("DMs", [new SuggestedReplacement("DMS")])).toBe(false);
  });

  // Java: HunspellRuleTest#testRuleWithGerman
  it('testRuleWithGerman', () => {
    let rule = new HunspellRule(deMessages(), Languages.getLanguageForShortCode("de-DE"), null);
    let lt = newLt(Languages.getLanguageForShortCode("de-DE"));
    commonGermanAsserts(rule, lt);
    expect(rule.match(lt.getAnalyzedSentence("Der äußere Übeltäter.")).length).toEqual(0);  // umlauts
    expect(rule.match(lt.getAnalyzedSentence("Der äussere Übeltäter.")).length).toEqual(1);
    // ignore URLs:
    expect(rule.match(lt.getAnalyzedSentence("Unter http://foo.org/bar steht was.")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("dasdassda http://foo.org/bar steht was.")).length).toEqual(1);
    expect(rule.match(lt.getAnalyzedSentence("Unter http://foo.org/bar steht dasdassda.")).length).toEqual(1);

    // check the correct calculation of error position
    // note that emojis have string length 2 or 3
    expect(rule.match(lt.getAnalyzedSentence("Hallo men Schatz!"))[0].getFromPos()).toEqual(6);
    expect(rule.match(lt.getAnalyzedSentence("Hallo men Schatz!"))[0].getToPos()).toEqual(9);
    expect(rule.match(lt.getAnalyzedSentence("Hallo 😂 men Schatz!"))[0].getFromPos()).toEqual(9);
    expect(rule.match(lt.getAnalyzedSentence("Hallo 😂 men Schatz!"))[0].getToPos()).toEqual(12);
    expect(rule.match(lt.getAnalyzedSentence("Hallo 😂😂 men Schatz!"))[0].getFromPos()).toEqual(11);
    expect(rule.match(lt.getAnalyzedSentence("Hallo 😂😂 men Schatz!"))[0].getToPos()).toEqual(14);
    expect(rule.match(lt.getAnalyzedSentence("Mir geht es 😂gut😂.")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Mir geht es 😂gtu😂.")).length).toEqual(1);
    expect(rule.match(lt.getAnalyzedSentence("Hallo 🗺️ men Schatz!"))[0].getFromPos()).toEqual(10);
    expect(rule.match(lt.getAnalyzedSentence("Hallo 🗺️ men Schatz!"))[0].getToPos()).toEqual(13);

    expect(rule.match(lt.getAnalyzedSentence("B(ℓ2)")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("🏽")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("🧡🚴🏽♂️ , 🎉💛✈️")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("компьютерная")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("中文維基百科 中文维基百科")).length).toEqual(0);

    expect(rule.match(lt.getAnalyzedSentence("Blu-ray-Brenner")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Stand-by-Betrieb")).length).toEqual(0);

    let matches = rule.match(lt.getAnalyzedSentence("- Teex"));
    expect(matches.length).toEqual(1);
    expect(matches[0].getSuggestedReplacements()[0]).toEqual("Tee");
    expect(matches[0].getFromPos()).toEqual(2);
    expect(matches[0].getToPos()).toEqual(6);

    matches = rule.match(lt.getAnalyzedSentence("-Teex"));
    expect(matches.length).toEqual(1);
    //assertEquals("[-tee, -telex, -tees, -teen, -teer, -tee-, -text]", matches[0].getSuggestedReplacements().toString()); // Preferably "Tee" !?
    expect(ls(matches[0].getSuggestedReplacements())).toEqual("[Tee, Telex, Tees, Teen, Teer, Tee-, Texte, TeX, Text]"); // Preferably "Tee" !?
    expect(matches[0].getFromPos()).toEqual(1);
    expect(matches[0].getToPos()).toEqual(5);

    matches = rule.match(lt.getAnalyzedSentence("- Kaffeex"));
    expect(matches.length).toEqual(1);
    expect(ls(matches[0].getSuggestedReplacements())).toEqual("[Kaffee, Kaffees, Kaffee-]");
    expect(matches[0].getFromPos()).toEqual(2);
    expect(matches[0].getToPos()).toEqual(9);

    matches = rule.match(lt.getAnalyzedSentence("-Kaffeex"));
    expect(matches.length).toEqual(1);
    //assertEquals("[-kaffee, -kaffees, -kaffee-, -karaffe, Kaffee]", matches[0].getSuggestedReplacements().toString());
    expect(ls(matches[0].getSuggestedReplacements())).toEqual("[Kaffee, Kaffees, Kaffee-]");
    expect(matches[0].getFromPos()).toEqual(1);
    expect(matches[0].getToPos()).toEqual(8);

    matches = rule.match(lt.getAnalyzedSentence("E -Commerce"));
    expect(matches.length).toEqual(2);
    expect(ls(matches[0].getSuggestedReplacements())).toEqual("[E-Commerce]");
    expect(matches[0].getFromPos()).toEqual(0);
    expect(matches[0].getToPos()).toEqual(11);
    //assertEquals("[E-Commerce, C-centromer]", matches[1].getSuggestedReplacements().toString());
    expect(ls(matches[1].getSuggestedReplacements())).toEqual("[E-Commerce, Comer]");
    expect(matches[1].getFromPos()).toEqual(3);
    expect(matches[1].getToPos()).toEqual(11);
  });

  // Java: HunspellRuleTest#testMultitokensWithSepllerRule
  it.skip('testMultitokensWithSepllerRule', () => {});

  // Java: HunspellRuleTest#testRuleWithWrongSplit
  it('testRuleWithWrongSplit', () => {
    let rule = new HunspellRule(deMessages(), Languages.getLanguageForShortCode("de-DE"), null);
    let lt = newLt(Languages.getLanguageForShortCode("de-DE"));
    assertResult("Vielen Dan kfür die Blumen", "Dank für", 7, 15, rule, lt);
    assertResult("Vielen Dankf ür die Blumen", "Dank für", 7, 15, rule, lt);
    assertResult("Viele nDank für die Blumen", "Vielen Dank", 0, 11, rule, lt);
    assertResult("VielenD ank für die Blumen", "Vielen Dank", 0, 11, rule, lt);
    assertResult("Vielen Dank für di eBlumen", "die Blumen", 16, 26, rule, lt);
    assertResult("Vielen Dank für di eBlumen.", "die Blumen", 16, 26, rule, lt);
    assertResult("Vielen Dank für dieB lumen", "die Blumen", 16, 26, rule, lt);
    assertResult("Vielen Dank für dieB lumen.", "die Blumen", 16, 26, rule, lt);
    assertResult("Das ist g anz falsch", "ganz", 8, 13, rule, lt);

    let matches = rule.match(lt.getAnalyzedSentence("Vielen Dak für dieB lumen"));
    expect(matches.length).toEqual(3);
    expect(matches[0].getSuggestedReplacements()[0]).toEqual("DAK");  // not really a good first suggestion...
    expect(matches[1].getSuggestedReplacements().length).toEqual(1);
    expect(matches[1].getSuggestedReplacements()[0]).toEqual("die Blumen");
    expect(matches[1].getFromPos()).toEqual(15);
    expect(matches[1].getToPos()).toEqual(25);
    expect(matches[2].getSuggestedReplacements()[0]).toEqual("Lumen");

    let matches2 = rule.match(lt.getAnalyzedSentence("Und gan viele nDank"));
    expect(matches2.length).toEqual(3);
    expect(matches2[0].getSuggestedReplacements()[0]).toEqual("gab");  // not really a good first suggestion...
    expect(matches2[1].getSuggestedReplacements().length).toEqual(1);
    expect(matches2[1].getSuggestedReplacements()[0]).toEqual("vielen Dank");
    expect(matches2[1].getFromPos()).toEqual(8);
    expect(matches2[1].getToPos()).toEqual(19);
    expect(matches2[2].getSuggestedReplacements()[0]).toEqual("Dank");

    let matches3 = rule.match(lt.getAnalyzedSentence("Vielen Dank für dieB lumen und auuch falsch"));
    expect(matches3.length).toEqual(3);
    expect(matches3[0].getSuggestedReplacements()[0]).toEqual("die Blumen");
    expect(matches3[1].getSuggestedReplacements()[0]).toEqual("Lumen");
    expect(matches3[2].getSuggestedReplacements()[0]).toEqual("auch");
  });

  // Java: HunspellRuleTest#testRuleWithAustrianGerman
  it('testRuleWithAustrianGerman', () => {
    let rule = new HunspellRule(deMessages(), Languages.getLanguageForShortCode("de-AT"), null);
    let lt = newLt(Languages.getLanguageForShortCode("de-DE"));
    commonGermanAsserts(rule, lt);
    expect(rule.match(lt.getAnalyzedSentence("Der äußere Übeltäter.")).length).toEqual(0);  // umlauts
    expect(rule.match(lt.getAnalyzedSentence("Der äussere Übeltäter.")).length).toEqual(1);
  });

  // Java: HunspellRuleTest#testRuleWithSwissGerman
  it('testRuleWithSwissGerman', () => {
    let rule = new HunspellRule(deMessages(), Languages.getLanguageForShortCode("de-CH"), null);
    let lt = newLt(Languages.getLanguageForShortCode("de-CH"));
    commonGermanAsserts(rule, lt);
    expect(rule.match(lt.getAnalyzedSentence("Der äußere Übeltäter.")).length).toEqual(1);  // ß not allowed in Swiss
    expect(rule.match(lt.getAnalyzedSentence("Der äussere Übeltäter.")).length).toEqual(0);  // ss is used instead of ß

    // suggestions with ss, not ß, in Swiss German
    // suggestions with ss, not ß, in Swiss German (lt.check on a tool with only the Swiss speller, as the full German rule set is F17)
    const ltCheck = newLt(Languages.getLanguageForShortCode("de-CH"), new SwissGermanSpellerRule(deMessages(), Languages.getLanguageForShortCode("de-CH")));
    let matches = ltCheck.check("Mit freundlichen Gruessen");
    expect(matches[0].getSuggestedReplacements()[0]).toEqual("Grüssen");
    matches = ltCheck.check("schließen");
    expect(matches[0].getSuggestedReplacements()[0]).toEqual("schliessen");
  });

});
