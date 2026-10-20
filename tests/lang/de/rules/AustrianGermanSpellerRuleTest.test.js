// Ported from AustrianGermanSpellerRuleTest (languagetool-language-modules/de)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { Languages } from '../../../../src/core/Languages.js';
import { AustrianGermanSpellerRule } from '../../../../src/lang/de/rules/AustrianGermanSpellerRule.js';
import { messagesFor, newLt } from '../../../support/ruleTestSupport.js';
import { simulateNoEnglishModule } from '../../../support/NoEnglishModule.js';

simulateNoEnglishModule(); // the Java de module tests run without the en module on the classpath

describe('AustrianGermanSpellerRuleTest', () => {
  const DE_AT = Languages.getLanguageForShortCode('de-AT');

  // Java: AustrianGermanSpellerRuleTest#testGetSuggestionsFromSpellingTxt
  it('testGetSuggestionsFromSpellingTxt', () => {
    const rule = new AustrianGermanSpellerRule(messagesFor(Languages.getLanguageForShortCode('en')), DE_AT, null, null); // Java: TestTools.getEnglishMessages()
    const lt = newLt(DE_AT);
    expect(rule.match(lt.getAnalyzedSentence('Shopbewertung')).length).toEqual(0); // from spelling.txt
    expect(rule.match(lt.getAnalyzedSentence('Wahlzuckerl')).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence('Wahlzuckerls')).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence('aifhdlidflifs')).length).toEqual(1);
  });
});
