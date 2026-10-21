// Ported from DashRuleTest (de)
import { describe, it, expect } from 'vitest';
import { Languages } from '../../../../src/core/Languages.js';
import { DashRule } from '../../../../src/lang/de/rules/DashRule.js';
import { messagesFor, newLt } from '../../../support/ruleTestSupport.js';

describe('DashRuleTest', () => {
  const rule = new DashRule(messagesFor(Languages.getLanguageForShortCode('de')));

  // Java: DashRuleTest#assertGood(String,JLanguageTool)
  function assertGood(text, lt) {
    expect(rule.match(lt.getAnalyzedSentence(text)).length).toBe(0);
  }

  // Java: DashRuleTest#assertBad(String,JLanguageTool)
  function assertBad(text, lt) {
    expect(rule.match(lt.getAnalyzedSentence(text)).length).toBe(1);
  }

  // Java: DashRuleTest#testRule
  it('testRule', () => {
    const lt = newLt(Languages.getLanguageForShortCode('de-DE')); // Java: new JLanguageTool(de-DE), only used for getAnalyzedSentence

    // correct sentences:
    assertGood("Die große Diäten-Erhöhung kam dann doch.", lt);
    assertGood("Die große Diätenerhöhung kam dann doch.", lt);
    assertGood("Die große Diäten-Erhöhungs-Manie kam dann doch.", lt);
    assertGood("Die große Diäten- und Gehaltserhöhung kam dann doch.", lt);
    assertGood("Die große Diäten- sowie Gehaltserhöhung kam dann doch.", lt);
    assertGood("Die große Diäten- oder Gehaltserhöhung kam dann doch.", lt);
    assertGood("Erst so - Karl-Heinz dann blah.", lt);
    assertGood("Erst so -- Karl-Heinz aber...", lt);
    assertGood("Nord- und Südkorea", lt);
    assertGood("NORD- UND SÜDKOREA", lt);
    assertGood("NORD- BZW. SÜDKOREA", lt);

    // incorrect sentences:
    assertBad("Die große Diäten- Erhöhung kam dann doch.", lt);
    assertBad("Die große Diäten-  Erhöhung kam dann doch.", lt);
    assertBad("Die große Diäten-Erhöhungs- Manie kam dann doch.", lt);
    assertBad("Die große Diäten- Erhöhungs-Manie kam dann doch.", lt);
    assertBad("MAZEDONIEN- SKOPJE Str.", lt);
  });
});
