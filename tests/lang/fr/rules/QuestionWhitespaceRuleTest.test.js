// Ported from QuestionWhitespaceRuleTest (fr module); lt.check runs with only FRENCH_WHITESPACE (disableAllRulesExcept)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { Languages } from '../../../../src/core/Languages.js';
import { QuestionWhitespaceRule } from '../../../../src/lang/fr/rules/QuestionWhitespaceRule.js';
import { JLanguageTool } from '../../../../src/core/JLanguageTool.js';
import { englishMessages } from '../../../support/ruleTestSupport.js';
import { disableAllRulesExcept } from '../../../support/TestTools.js';

describe('QuestionWhitespaceRuleTest', () => {
  // Java: QuestionWhitespaceRuleTest#testRule
  it('testRule', () => {
    const french = Languages.getLanguageForShortCode('fr');
    const rule = new QuestionWhitespaceRule(englishMessages(), french);
    const lt = new JLanguageTool(french);
    const m = (s) => rule.match(lt.getAnalyzedSentence(s));

    // correct sentences:
    expect(m("C'est vrai\u00a0!").length).toBe(0);
    expect(m("Qu'est ce que c'est\u00a0?").length).toBe(0);
    expect(m("L'enjeu de ce livre est donc triple\u00a0: philosophique").length).toBe(0);
    expect(m('Bonjour :)').length).toBe(0);
    expect(m('5/08/2019 23:30').length).toBe(0);
    expect(m("C'est vrai\u00a0!!").length).toBe(0);
    expect(m("C'est vrai\u00a0??").length).toBe(0);
    expect(m('☀️9:00').length).toBe(0);
    expect(m('00:80:41:ae:fd:7e').length).toBe(0);

    disableAllRulesExcept(lt, 'FRENCH_WHITESPACE');
    const lt2 = lt;
    expect(lt2.check('« Je suis Chris… »').length).toBe(0);
    expect(lt2.check('« Je suis Chris ! »').length).toBe(0);
    expect(lt2.check('Je suis.[!]').length).toBe(0);
    expect(lt2.check('Je suis[?]').length).toBe(0);
    expect(lt2.check('Je suis(?)').length).toBe(0);

    expect(lt2.check('1;2;3').length).toBe(0);
    expect(lt2.check('asd@dsa.fr;test@foo.com;').length).toBe(0);

    // errors:
    expect(m("C'est vrai!").length).toBe(1);
    expect(m("Qu'est ce que c'est?").length).toBe(1);
    expect(m("L'enjeu de ce livre est donc triple: philosophique;").length).toBe(2);

    const matches1 = m("L'enjeu de ce livre est donc triple: philosophique ;");
    expect(matches1.length).toBe(1);
    expect(matches1[0].getFromPos()).toBe(29);
    expect(matches1[0].getToPos()).toBe(36);
    expect(`[${matches1[0].getSuggestedReplacements().join(', ')}]`).toBe('[triple :]');

    // guillemets:
    const matches2 = m('LanguageTool offre une «vérification» orthographique.');
    expect(matches2.length).toBe(1);
    expect(matches2[0].getFromPos()).toBe(23);
    expect(matches2[0].getToPos()).toBe(37);
    expect(`[${matches2[0].getSuggestedReplacements().join(', ')}]`).toBe('[« vérification »]');

    const matches3 = m("Le guillemet ouvrant est suivi d'un espace insécable\u00a0: «mais le lieu [...] et le guillemet fermant est précédé d'un espace insécable\u00a0: [...] littérature».");
    expect(matches3.length).toBe(2);
    expect(`[${matches3[0].getSuggestedReplacements().join(', ')}]`).toBe('[« mais]');
    expect(matches3[0].getFromPos()).toBe(55);
    expect(matches3[0].getToPos()).toBe(60);
    expect(`[${matches3[1].getSuggestedReplacements().join(', ')}]`).toBe('[littérature »]');
    expect(matches3[1].getFromPos()).toBe(141);
    expect(matches3[1].getToPos()).toBe(153);
  });
});
