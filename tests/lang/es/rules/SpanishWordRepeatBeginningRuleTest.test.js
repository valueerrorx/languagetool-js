// Ported from SpanishWordRepeatBeginningRuleTest (es module)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { JLanguageTool } from '../../../../src/core/JLanguageTool.js';
import { Spanish } from '../../../../src/lang/es/language/Spanish.js';
import { messagesFor, englishMessages } from '../../../support/ruleTestSupport.js';
import { simulateNoEnglishModule } from '../../../support/NoEnglishModule.js';

simulateNoEnglishModule();

import { Languages } from '../../../../src/core/Languages.js';
import { Level, Mode, ParagraphHandling } from '../../../../src/core/JLanguageTool.js';
import { AnnotatedTextBuilder } from '../../../../src/core/text/AnnotatedTextBuilder.js';

describe('SpanishWordRepeatBeginningRuleTest', () => {
  // Java: SpanishWordRepeatBeginningRuleTest#getRuleMatches(JLanguageTool,String)
  const getRuleMatches = (lt, text) => lt.check(new AnnotatedTextBuilder().addText(text).build(), true,
    ParagraphHandling.NORMAL, null, Mode.ALL, Level.PICKY);

  // Java: SpanishWordRepeatBeginningRuleTest#testRule
  it('testRule', () => {
    const lt = new JLanguageTool(Languages.getLanguageForShortCode('es'));
    lt.enableRule('SPANISH_WORD_REPEAT_BEGINNING_RULE'); // even if it is temp_off
    lt.disableRule('ES_REPEATEDWORDS');

    expect(getRuleMatches(lt, 'Esto está bien. Esto es mejor, también.').length).toBe(0);
    expect(getRuleMatches(lt, 'El coche. El profesor. El tercer elemento.').length).toBe(0);
    expect(getRuleMatches(lt, 'Por un lado, confirmó que la palabra solo no debe llevar tilde, '
      + 'según las reglas generales de acentuación, ni cuando es adverbio, ni cuando es adjetivo. Por otro lado, y este '
      + 'es el tema que hoy nos interesa, confirmó que los demostrativos este, ese o aquel, y sus formas femeninas y '
      + 'plurales, no llevarán tampoco tilde funcionando tanto como pronombres como determinantes.').length).toBe(0);

    expect(getRuleMatches(lt, 'Mañana me voy. Mañana vuelvo. Mañana se acabó todo.').length).toBe(2);

    const matches1 = getRuleMatches(lt, 'Yo creo. Yo he visto esto antes. Yo no lo creo.');
    expect(matches1.length).toBe(1);
    expect(matches1[0].getSuggestedReplacements()[0]).toBe('Además, yo');
    expect(matches1[0].getSuggestedReplacements()[1]).toBe('Igualmente, yo');
    expect(matches1[0].getSuggestedReplacements()[2]).toBe('No solo eso, sino que yo');
    const matches2 = getRuleMatches(lt, 'También, juego a fútbol. También, juego a baloncesto.');
    expect(matches2.length).toBe(1);
    expect(`[${matches2[0].getSuggestedReplacements().join(', ')}]`).toBe('[Adicionalmente, Asimismo, Además, Igualmente, Así mismo]');

    const matches3 = getRuleMatches(lt, 'Sin embargo, me gusta. Sin embargo, otros me gustan más.');
    expect(matches3.length).toBe(1);
    expect(`[${matches3[0].getSuggestedReplacements().join(', ')}]`).toBe('[]');

    const matches4 = getRuleMatches(lt, 'Pero me gusta. Pero otros me gustan más.');
    expect(matches4.length).toBe(1);
    expect(`[${matches4[0].getSuggestedReplacements().join(', ')}]`).toBe('[Aun así, Por otra parte, Sin embargo]');
  });
});
