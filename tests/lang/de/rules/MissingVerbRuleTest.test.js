// Ported from MissingVerbRuleTest (de)
import { describe, it, expect } from 'vitest';
import { Languages } from '../../../../src/core/Languages.js';
import { MissingVerbRule } from '../../../../src/lang/de/rules/MissingVerbRule.js';
import { englishMessages, newLt } from '../../../support/ruleTestSupport.js';

describe('MissingVerbRuleTest', () => {
  const rule = new MissingVerbRule(englishMessages(), Languages.getLanguageForShortCode('de-DE'));

  // Java: MissingVerbRuleTest#assertGood(String,JLanguageTool)
  function assertGood(text, lt) {
    expect(rule.match(lt.getAnalyzedSentence(text)).length, `Found unexpected error in: '${text}'`).toBe(0);
  }

  // Java: MissingVerbRuleTest#assertBad(String,JLanguageTool)
  function assertBad(text, lt) {
    expect(rule.match(lt.getAnalyzedSentence(text)).length, `Did not find expected error in: '${text}'`).toBe(1);
  }

  // Java: MissingVerbRuleTest#test
  it('test', () => {
    const lt = newLt(Languages.getLanguageForShortCode('de-DE')); // Java: new JLanguageTool(de-DE), only used for getAnalyzedSentence
    assertGood("Da ist ein Verb, mal so zum testen.", lt);
    assertGood("Überschrift ohne Verb aber doch nicht zu kurz", lt);
    assertGood("Sprechen Sie vielleicht zufällig Türkisch?", lt);
    assertGood("Leg den Tresor in den Koffer im Kofferraum.", lt);
    assertGood("Bring doch einfach deine Kinder mit.", lt);
    assertGood("Gut so.", lt);  // no verb, but very short
    assertGood("Ja!", lt);  // no verb, but very short
    assertGood("Vielen Dank für alles, was Du für mich getan hast.", lt);
    assertGood("Herzlichen Glückwunsch zu Deinem zwanzigsten Geburtstag.", lt);
    assertBad("Dieser Satz kein Verb.", lt);
    assertBad("Aus einer Idee sich erste Wortgruppen, aus Wortgruppen einzelne Sätze, aus Sätzen ganze Texte.", lt);
    assertBad("Ich ein neues Rad.", lt);
    // assertBad("Ich einen neuen Fehler gefunden.", lt);  // see issue #42
  });
});
