// Ported from DuUpperLowerCaseRuleTest (de)
import { describe, it, expect } from 'vitest';
import { Languages } from '../../../../src/core/Languages.js';
import { DuUpperLowerCaseRule } from '../../../../src/lang/de/rules/DuUpperLowerCaseRule.js';
import { englishMessages, newLt } from '../../../support/ruleTestSupport.js';

describe('DuUpperLowerCaseRuleTest', () => {
  const rule = new DuUpperLowerCaseRule(englishMessages());
  const lt = newLt(Languages.getLanguageForShortCode('de-DE')); // Java: new JLanguageTool(de-DE), only used for getAnalyzedSentence

  // Java: DuUpperLowerCaseRuleTest#assertErrors(String,int)
  function assertErrors(input, expectedMatches) {
    const sentence = lt.getAnalyzedSentence(input);
    const matches = rule.match([sentence]);
    expect(matches.length, `Expected ${expectedMatches}, got ${matches.length}: ${sentence.getText()} -> [${matches.join(', ')}]`).toBe(expectedMatches);
  }

  // Java: DuUpperLowerCaseRuleTest#testRule
  it('testRule', () => {
    assertErrors("Du bist noch jung.", 0);
    assertErrors("Du bist noch jung, du bist noch fit.", 0);
    assertErrors("Aber du bist noch jung, du bist noch fit.", 0);
    assertErrors("Aber du bist noch jung, dir ist das egal.", 0);
    assertErrors("Hast Du ihre Brieftasche gesehen?", 0);
    assertErrors("Aber Du bist noch jung, du bist noch fit.", 1);
    assertErrors("Aber Du bist noch jung, dir ist das egal.", 1);
    assertErrors("Aber Du bist noch jung. Und dir ist das egal.", 1);

    assertErrors("Aber du bist noch jung. Und Du bist noch fit.", 1);
    assertErrors("Aber du bist noch jung, Dir ist das egal.", 1);
    assertErrors("Aber du bist noch jung. Und Dir ist das egal.", 1);
    assertErrors("Aber du bist noch jung, sagt euer Vater oft.", 0);
    assertErrors("Aber Du bist noch jung, sagt Euer Vater oft.", 0);
    assertErrors("Aber Du bist noch jung, sagt euer Vater oft.", 1);
    assertErrors("Aber du bist noch jung, sagt Euer Vater oft.", 1);
    assertErrors("Könnt Ihr Euch das vorstellen???", 0);
    assertErrors("Könnt ihr euch das vorstellen???", 0);
    assertErrors("Aber Samstags geht ihr Sohn zum Sport. Stellt Euch das mal vor!", 0);
    // assertErrors("Könnt Ihr euch das vorstellen???", 1);
    assertErrors("Wie geht es euch? Herr Meier, wie war ihr Urlaub?", 0);
    assertErrors("Wie geht es Euch? Herr Meier, wie war Ihr Urlaub?", 0);
    // assertErrors("Wie geht es euch? Herr Meier, wie war Ihr Urlaub?", 1);
    // assertErrors("Wie geht es Euch? Herr Meier, wie war ihr Urlaub?", 1);

    assertErrors("\"Du sagtest, du würdest es schaffen!\"", 0);
    assertErrors("Egal, was du tust: Du musst dein Bestes geben.", 0);
    assertErrors("Was auch immer du tust: ICH UND DU KÖNNEN ES SCHAFFEN.", 0);
    assertErrors("Hast Du die Adresse von ihr?", 0);
  });
});
