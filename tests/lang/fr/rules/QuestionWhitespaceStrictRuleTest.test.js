// Ported from QuestionWhitespaceStrictRuleTest (fr module)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { Languages } from '../../../../src/core/Languages.js';
import { QuestionWhitespaceStrictRule } from '../../../../src/lang/fr/rules/QuestionWhitespaceStrictRule.js';
import { englishMessages, newLt } from '../../../support/ruleTestSupport.js';

describe('QuestionWhitespaceStrictRuleTest', () => {
  // Java: QuestionWhitespaceStrictRuleTest#testRule
  it('testRule', () => {
    const french = Languages.getLanguageForShortCode('fr');
    const rule = new QuestionWhitespaceStrictRule(englishMessages(), french);
    const lt = newLt(french);
    const m = (s) => rule.match(lt.getAnalyzedSentence(s));

    // correct sentences:
    expect(m("C'est vrai\u00a0!").length).toBe(0);
    expect(m("Qu'est ce que c'est\u00a0?").length).toBe(0);
    expect(m("L'enjeu de ce livre est donc triple\u00a0: philosophique").length).toBe(0);
    expect(m('Bonjour :)').length).toBe(0);

    // covered by rule FRENCH_WHITESPACE
    expect(m("C'est vrai!").length).toBe(0);
    expect(m("Qu'est ce que c'est?").length).toBe(0);
    expect(m("L'enjeu de ce livre est donc triple: philosophique;").length).toBe(0);
    expect(m("Le guillemet ouvrant est suivi d'un espace insécable\u00a0: «mais le lieu [...] et le guillemet fermant est précédé d'un espace insécable\u00a0: [...] littérature».").length).toBe(0);

    // covered partially by rule FRENCH_WHITESPACE
    let matches = m("L'enjeu de ce livre est donc triple: philosophique ;");
    expect(matches.length).toBe(1);
    expect(matches[0].getFromPos()).toBe(50);
    expect(matches[0].getToPos()).toBe(52);
    expect(`[${matches[0].getSuggestedReplacements().join(', ')}]`).toBe('[ ;]');

    // errors:
    matches = m("C'est vrai !");
    expect(matches.length).toBe(1);
    matches = m("Qu'est ce que c'est ?");
    expect(matches.length).toBe(1);
    expect(m('Bonjour : )').length).toBe(1);

    // guillemets
    matches = m("Le guillemet ouvrant est suivi d'un espace insécable\u00a0: « mais le lieu [...] et le guillemet fermant est précédé d'un espace insécable\u00a0: [...] littérature ».");
    expect(matches.length).toBe(2);
  });
});
