// Ported from SentenceWhitespaceRuleTest (de)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { Languages } from '../../../../src/core/Languages.js';
import { JLanguageTool } from '../../../../src/core/JLanguageTool.js';
import { disableAllRulesExcept } from '../../../support/TestTools.js';

describe('SentenceWhitespaceRuleTest', () => {
  // Java: SentenceWhitespaceRuleTest#assertGood(String,JLanguageTool)
  function assertGood(text, lt) {
    expect(lt.check(text).length).toBe(0);
  }

  // Java: SentenceWhitespaceRuleTest#assertBad(String,JLanguageTool)
  function assertBad(text, lt) {
    expect(lt.check(text).length).toBe(1);
  }

  // Java: SentenceWhitespaceRuleTest#testMatch
  it('testMatch', () => {
    const de = Languages.getLanguageForShortCode('de-DE');
    const lt = new JLanguageTool(de);
    disableAllRulesExcept(lt, 'DE_SENTENCE_WHITESPACE');
    assertGood("Das ist ein Satz. Und hier der nächste.", lt);
    assertGood("Das ist ein Satz! Und hier der nächste.", lt);
    assertGood("Ist das ein Satz? Hier der nächste.", lt);
    assertBad("Das ist ein Satz.Und hier der nächste.", lt);
    assertBad("Das ist ein Satz!Und hier der nächste.", lt);
    assertBad("Ist das ein Satz?Hier der nächste.", lt);
    assertGood("Am 28. September.", lt);
    assertBad("Am 28.September.", lt);
    assertGood("Das 1. Internationale Filmfestival findet nächste Woche statt.", lt);
    assertBad("Das 1.Internationale Filmfestival findet nächste Woche statt.", lt);
    expect(lt.check("Am 7.September 2014.")[0].getMessage().includes("nach Ordnungszahlen")).toBe(true);
    expect(lt.check("Im September.Dann der nächste Satz.")[0].getMessage().includes("zwischen Sätzen")).toBe(true);
  });
});
