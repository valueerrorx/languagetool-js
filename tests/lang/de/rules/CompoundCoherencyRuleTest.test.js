// Ported from CompoundCoherencyRuleTest (de)
import { describe, it, expect } from 'vitest';
import { Languages } from '../../../../src/core/Languages.js';
import { CompoundCoherencyRule } from '../../../../src/lang/de/rules/CompoundCoherencyRule.js';
import { englishMessages, newLt } from '../../../support/ruleTestSupport.js';

describe('CompoundCoherencyRuleTest', () => {
  const rule = new CompoundCoherencyRule(englishMessages());
  const lt = newLt(Languages.getLanguageForShortCode('de')); // Java: new JLanguageTool(de), only used for getAnalyzedSentence

  // Java: CompoundCoherencyRuleTest#getMatches(String,String)
  function getMatches(s1, s2) {
    const sent1 = lt.getAnalyzedSentence(s1);
    const sent2 = lt.getAnalyzedSentence(s2);
    return rule.match([sent1, sent2]);
  }

  // Java: CompoundCoherencyRuleTest#assertOkay(String,String)
  function assertOkay(s1, s2) {
    const matches = getMatches(s1, s2);
    expect(matches.length, `Got ${matches.join(', ')}`).toBe(0);
  }

  // Java: CompoundCoherencyRuleTest#assertError(String,String,int,int,String)
  function assertError(s1, s2, fromPos, toPos, suggestion) {
    const matches = getMatches(s1, s2);
    expect(matches.length, `Got ${matches.join(', ')}`).toBe(1);
    expect(matches[0].getFromPos()).toBe(fromPos);
    expect(matches[0].getToPos()).toBe(toPos);
    if (suggestion === null) {
      expect(matches[0].getSuggestedReplacements().length, `Did not expect suggestion, but got: [${matches[0].getSuggestedReplacements().join(', ')}]`).toBe(0);
    } else {
      expect(matches[0].getSuggestedReplacements(), `Expected suggestion: ${suggestion}, got: [${matches[0].getSuggestedReplacements().join(', ')}]`).toEqual([suggestion]);
    }
  }

  // Java: CompoundCoherencyRuleTest#testRule
  it('testRule', () => {
    assertOkay("Ein Jugendfoto.", "Und ein Jugendfoto.");
    assertOkay("Ein Jugendfoto.", "Der Rahmen eines Jugendfotos.");
    assertOkay("Der Rahmen eines Jugendfotos.", "Ein Jugendfoto.");
    assertOkay("Der Zahn-Ärzte-Verband.", "Der Zahn-Ärzte-Verband.");
    assertOkay("Der Zahn-Ärzte-Verband.", "Des Zahn-Ärzte-Verbands.");
    assertOkay("Der Zahn-Ärzte-Verband.", "Des Zahn-Ärzte-Verbandes.");
    assertOkay("Es gibt E-Mail.", "Und es gibt E-Mails.");
    assertOkay("Es gibt E-Mails.", "Und es gibt E-Mail.");
    assertOkay("Ein Jugend-Foto.", "Der Rahmen eines Jugend-Fotos.");

    assertError("Ein Jugendfoto.", "Und ein Jugend-Foto.", 23, 34, "Jugendfoto");
    assertError("Ein Jugend-Foto.", "Und ein Jugendfoto.", 24, 34, "Jugend-Foto");

    assertError("Viele Zahn-Ärzte.", "Oder Zahnärzte.", 22, 31, null);
    assertError("Viele Zahn-Ärzte.", "Oder Zahnärzte.", 22, 31, null);
    assertError("Viele Zahn-Ärzte.", "Oder Zahnärzten.", 22, 32, null);

    assertError("Der Zahn-Ärzte-Verband.", "Der Zahn-Ärzteverband.", 27, 44, "Zahn-Ärzte-Verband");
    assertError("Der Zahn-Ärzte-Verband.", "Der Zahnärzte-Verband.", 27, 44, "Zahn-Ärzte-Verband");
    assertError("Der Zahn-Ärzte-Verband.", "Der Zahnärzteverband.", 27, 43, "Zahn-Ärzte-Verband");
    assertError("Der Zahn-Ärzteverband.", "Der Zahn-Ärzte-Verband.", 26, 44, "Zahn-Ärzteverband");
    assertError("Der Zahnärzte-Verband.", "Der Zahn-Ärzte-Verband.", 26, 44, "Zahnärzte-Verband");
    assertError("Der Zahnärzteverband.", "Der Zahn-Ärzte-Verband.", 25, 43, "Zahnärzteverband");

    assertError("Der Zahn-Ärzte-Verband.", "Des Zahn-Ärzteverbandes.", 27, 46, null);
    assertError("Der Zahn-Ärzte-Verband.", "Des Zahnärzte-Verbandes.", 27, 46, null);
    assertError("Der Zahn-Ärzte-Verband.", "Des Zahnärzteverbandes.", 27, 45, null);
  });
});
