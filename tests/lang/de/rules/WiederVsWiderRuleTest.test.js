// Ported from WiederVsWiderRuleTest (de)
import { describe, it, expect } from 'vitest';
import { Languages } from '../../../../src/core/Languages.js';
import { WiederVsWiderRule } from '../../../../src/lang/de/rules/WiederVsWiderRule.js';
import { messagesFor, newLt } from '../../../support/ruleTestSupport.js';

describe('WiederVsWiderRuleTest', () => {
  const rule = new WiederVsWiderRule(messagesFor(Languages.getLanguageForShortCode('de')));

  // Java: WiederVsWiderRuleTest#assertGood(String,JLanguageTool)
  function assertGood(text, lt) {
    expect(rule.match(lt.getAnalyzedSentence(text)).length).toBe(0);
  }

  // Java: WiederVsWiderRuleTest#assertBad(String,JLanguageTool)
  function assertBad(text, lt) {
    expect(rule.match(lt.getAnalyzedSentence(text)).length).toBe(1);
  }

  // Java: WiederVsWiderRuleTest#testRule
  it('testRule', () => {
    const lt = newLt(Languages.getLanguageForShortCode('de-DE')); // Java: new JLanguageTool(de-DE), only used for getAnalyzedSentence

    assertGood("Das spiegelt wider, wie es wieder läuft.", lt);
    assertGood("Das spiegelt die Situation gut wider.", lt);
    assertGood("Das spiegelt die Situation.", lt);
    assertGood("Immer wieder spiegelt das die Situation.", lt);
    assertGood("Immer wieder spiegelt das die Situation wider.", lt);
    assertGood("Das spiegelt wieder wider, wie es läuft.", lt);

    assertBad("Das spiegelt wieder, wie es wieder läuft.", lt);
    assertBad("Sie spiegeln das Wachstum der Stadt wieder.", lt);
    assertBad("Das spiegelt die Situation gut wieder.", lt);
    assertBad("Immer wieder spiegelt das die Situation wieder.", lt);
    assertBad("Immer wieder spiegelte das die Situation wieder.", lt);
  });
});
