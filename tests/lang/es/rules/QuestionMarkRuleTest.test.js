// Ported from QuestionMarkRuleTest (es module)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { JLanguageTool } from '../../../../src/core/JLanguageTool.js';
import { Spanish } from '../../../../src/lang/es/language/Spanish.js';
import { QuestionMarkRule } from '../../../../src/lang/es/rules/QuestionMarkRule.js';
import { englishMessages } from '../../../support/ruleTestSupport.js';
import { simulateNoEnglishModule } from '../../../support/NoEnglishModule.js';

simulateNoEnglishModule();

describe('QuestionMarkRuleTest', () => {
  const rule = new QuestionMarkRule(englishMessages());
  const lt = new JLanguageTool(Spanish.getInstance());
  for (const r of lt.getAllActiveRules()) {
    if (r.getId() !== rule.getId()) {
      lt.disableRule(r.getId());
    }
  }
  // Java: QuestionMarkRuleTest#check(String)
  const check = (s) => rule.match(lt.analyzeText(s));
  const sug = (m) => `[${m.getSuggestedReplacements().join(', ')}]`;

  // Java: QuestionMarkRuleTest#test
  it('test', () => {
    const matches = check('Hola, ¿cómo estás?');
    expect(matches.length).toBe(0);
    const matches2 = check('Hola, cómo estás?');
    expect(matches2.length).toBe(1);
    expect(sug(matches2[0])).toBe('[¿cómo]');
    const matches3 = check('¿Que pasa?');
    expect(matches3.length).toBe(0);
    const matches4 = check('Que pasa?');
    expect(matches4.length).toBe(1);
    expect(sug(matches4[0])).toBe('[¿Que]');
    const matches5 = check('Que pasa?\n');
    expect(matches5.length).toBe(1);
    expect(sug(matches5[0])).toBe('[¿Que]');
    const matches6 = lt.check('Que pasa?');
    expect(matches6.length).toBe(1);
    expect(sug(matches6[0])).toBe('[¿Que]');
    const matches7 = lt.check('Que pasa?\n');
    expect(matches7.length).toBe(1);
    expect(sug(matches7[0])).toBe('[¿Que]');
    const matches8 = lt.check('Que pasa?\n\n');
    expect(matches8.length).toBe(1);
    expect(sug(matches8[0])).toBe('[¿Que]');
    const matches9 = lt.check('¿Que pasa?\n\n');
    expect(matches9.length).toBe(0);
    const matches10 = lt.check('¡¿Nunca tienes clases o qué?!');
    expect(matches10.length).toBe(0);
    const matches11 = lt.check('¡Usted tiene un gusto caro! -exclamó la dependienta- ¿Está seguro?');
    expect(matches11.length).toBe(0);
    const matches12 = lt.check('¿Quién sabe hablar francés mejor: Tom o Mary?');
    expect(matches12.length).toBe(0);
    const matches13 = lt.check('Esto es una prueba. Que pasa?\n\n');
    expect(matches13.length).toBe(1);
    expect(sug(matches13[0])).toBe('[¿Que]');
    expect(matches13[0].getFromPos()).toBe(20);
    const matches14 = check('Hola, de qué me hablas?');
    expect(matches14.length).toBe(1);
    expect(sug(matches14[0])).toBe('[¿de]');
    const matches15 = check('Después de todo lo que pasó, qué quieres que te diga?');
    expect(matches15.length).toBe(1);
    expect(sug(matches15[0])).toBe('[¿qué]');
    const matches16 = check('Pero cómo quieres que te lo diga?');
    expect(sug(matches16[0])).toBe('[¿Pero]');
    const matches17 = check('Pero, cómo quieres que te lo diga?');
    expect(sug(matches17[0])).toBe('[¿cómo]');
    const matches18 = check('Puedes imaginarte por qué no vino con nosotros?');
    expect(sug(matches18[0])).toBe('[¿Puedes]');
    const matches19 = check('Hola, Marco: Puedes darme tu dirección de correo?');
    expect(sug(matches19[0])).toBe('[¿Puedes]');
    const matches33 = check('Están aquí: https://gtlb.com/smll-cued-datasets/hu[…]nitized/-/tree/main/beling?ref_type=heads');
    expect(matches33.length).toBe(0);
    // Exclamation marks:
    const matches20 = lt.check('Qué irritante!');
    expect(matches20.length).toBe(1);
    expect(sug(matches20[0])).toBe('[¡Qué]');
    const matches21 = lt.check('¡Qué irritante!');
    expect(matches21.length).toBe(0);
    const matches22 = lt.check('—Hola!');
    expect(matches22.length).toBe(1);
    expect(sug(matches22[0])).toBe('[¡Hola]');
    const matches23 = lt.check('Muchas gracias! ✌\uFE0F');
    expect(matches23.length).toBe(1);
    expect(sug(matches23[0])).toBe('[¡Muchas]');
    const matches24 = lt.check('Muchas gracias! ✌\uFE0F✌\uFE0F');
    expect(matches24.length).toBe(1);
    expect(sug(matches24[0])).toBe('[¡Muchas]');
    const matches25 = lt.check('Muchas gracias! ✌\uFE0F ✌\uFE0F');
    expect(matches25.length).toBe(1);
    expect(sug(matches25[0])).toBe('[¡Muchas]');
    const matches26 = lt.check('Muchas gracias!, le dijo entonces.');
    expect(matches26.length).toBe(1);
    expect(sug(matches26[0])).toBe('[¡Muchas]');
    const matches27 = lt.check('"Muchas gracias!".');
    expect(matches27.length).toBe(1);
    expect(sug(matches27[0])).toBe('[¡Muchas]');
    const matches28 = lt.check('Seguro que estás más habituado a algunas de estas formas verbales, pero cuál es la correcta?');
    expect(matches28.length).toBe(1);
    expect(sug(matches28[0])).toBe('[¿pero]');
    const matches29 = lt.check('Tengo razón, o no?');
    expect(matches29.length).toBe(1);
    expect(sug(matches29[0])).toBe('[¿o]');
    const matches30 = lt.check('Tengo razón, no?');
    expect(matches30.length).toBe(1);
    expect(sug(matches30[0])).toBe('[¿no]');
    const matches31 = lt.check('Tengo razón, eh?');
    expect(matches31.length).toBe(1);
    expect(sug(matches31[0])).toBe('[¿eh]');
    const matches32 = lt.check('qué me recomendarías???….');
    expect(matches32.length).toBe(1);
    expect(sug(matches32[0])).toBe('[¿qué]');
  });
});
