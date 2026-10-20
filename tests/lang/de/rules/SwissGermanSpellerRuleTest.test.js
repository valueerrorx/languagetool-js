// Ported from SwissGermanSpellerRuleTest (languagetool-language-modules/de)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { Languages } from '../../../../src/core/Languages.js';
import { SwissGermanSpellerRule } from '../../../../src/lang/de/rules/SwissGermanSpellerRule.js';
import { messagesFor, newLt } from '../../../support/ruleTestSupport.js';
import { simulateNoEnglishModule } from '../../../support/NoEnglishModule.js';

simulateNoEnglishModule(); // the Java de module tests run without the en module on the classpath

describe('SwissGermanSpellerRuleTest', () => {
  const DE_CH = Languages.getLanguageForShortCode('de-CH');

  // Java: SwissGermanSpellerRuleTest#testGetSuggestionsFromSpellingTxt
  it('testGetSuggestionsFromSpellingTxt', () => {
    const rule = new SwissGermanSpellerRule(messagesFor(Languages.getLanguageForShortCode('en')), DE_CH); // Java: TestTools.getEnglishMessages()
    const lt = newLt(DE_CH);
    expect(rule.match(lt.getAnalyzedSentence('Shopbewertung')).length).toEqual(0); // from spelling.txt
    expect(rule.match(lt.getAnalyzedSentence('Abwart')).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence('Abwarts')).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence('aifhdlidflifs')).length).toEqual(1);

    const matches = rule.match(lt.getAnalyzedSentence('Trottinettens')); // from spelling-de-CH.txt
    expect(matches[0].getSuggestedReplacements()[0], `Matches: ${matches.length}, Suggestions of first match: [${matches[0].getSuggestedReplacements().join(', ')}]`).toEqual('Trottinetten');
  });
});
