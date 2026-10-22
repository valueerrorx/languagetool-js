// Ported from SpanishRepeatedWordsRuleTest (es module)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { JLanguageTool } from '../../../../src/core/JLanguageTool.js';
import { Spanish } from '../../../../src/lang/es/language/Spanish.js';
import { messagesFor, englishMessages } from '../../../support/ruleTestSupport.js';
import { simulateNoEnglishModule } from '../../../support/NoEnglishModule.js';

simulateNoEnglishModule();

import { Languages } from '../../../../src/core/Languages.js';
import { AnnotatedTextBuilder } from '../../../../src/core/text/AnnotatedTextBuilder.js';
import { SpanishRepeatedWordsRule } from '../../../../src/lang/es/rules/SpanishRepeatedWordsRule.js';

describe('SpanishRepeatedWordsRuleTest', () => {
  const rule = new SpanishRepeatedWordsRule(messagesFor(Spanish.getInstance()));
  const lt = new JLanguageTool(Languages.getLanguageForShortCode('es'));

  // Java: SpanishRepeatedWordsRuleTest#getRuleMatches(String)
  const getRuleMatches = (sentences) => {
    const aText = new AnnotatedTextBuilder().addText(sentences).build();
    return rule.match(lt.analyzeText(sentences), aText);
  };
  // Java: SpanishRepeatedWordsRuleTest#assertCorrectText(String)
  const assertCorrectText = (sentences) => expect(getRuleMatches(sentences).length).toBe(0);

  // Java: SpanishRepeatedWordsRuleTest#testRule
  it('testRule', () => {
    assertCorrectText('Emplearon la fuerza. Pero los empleados se resistieron.');
    assertCorrectText('Antes dije esto. Antes de venir.');
    assertCorrectText('Propuse aquello. Pero la propuesta no fue acceptada.');
    assertCorrectText('Creó cosas interesantes. Pero creo que no eran útiles.');
    assertCorrectText(
      'Fue excelente. El arquitecto de la catedral parece ser que fue el maestro Enrique, seguramente natural de Francia, que ya había trabajado anteriormente en la catedral de Burgos. Es evidente que conocía la forma arquitectónica gótica de la isla de Francia. Falleció en el año 1277 y fue sustituido por el español Juan Pérez. En el año 1289 fallecía también el obispo Martín Fernández, cuando la cabecera del templo ya estaba abierta al culto. La estructura fundamental de la catedral se finaliza pronto, en el año 1302, abriendo el obispo Gonzalo Osorio la totalidad de la iglesia a los fieles, aunque en el siglo xiv aún se terminarían el claustro y la torre norte; la torre sur no se finalizó hasta la segunda mitad del siglo xv. Esta prontitud en el acabamiento de las obras le da una gran unidad de estilo arquitectónico. La catedral de León se inspira en la planta de la catedral de Reims (aunque esta es de menor superficie), que bien pudo conocer el maestro Enrique. Al igual que la mayoría de catedrales francesas, la de León está construida con un módulo geométrico basado en el triángulo (ad triangulum), cuyos miembros se relacionan con la raíz cuadrada de 3, al que responden la totalidad de sus partes y del todo. Este aspecto, como la planta, los alzados, y los repertorios decorativos y simbólicos convierten esta catedral en un auténtico edificio transpirenaico, alejado de la corriente hispánica, que le ha merecido los calificativos de «la más francesa de las catedrales españolas» o el de Pulchra Leonina. Fue excelente.');

    assertCorrectText('Yo propuse aquello. Pero también propuse esto otro.');
    assertCorrectText('Yo propuse aquello. Pero propuse también esto otro.');

    let matches = getRuleMatches('Yo propuse aquello. Pero la sugerencia propuesta por el presidente no fue acceptada.');
    expect(matches.length).toBe(1);

    matches = getRuleMatches('Propuse aquello. Pero la sugerencia propuesta por el presidente no fue acceptada.');
    expect(matches.length).toBe(1);

    matches = getRuleMatches('Fue excelente. Fue un resultado excelente.');
    expect(matches.length).toBe(1);
    expect(matches[0].getSuggestedReplacements()[0]).toBe('magnífico');
    expect(matches[0].getSuggestedReplacements()[1]).toBe('fantástico');
    expect(matches[0].getSuggestedReplacements()[2]).toBe('maravilloso');

    matches = getRuleMatches('Esto propuse. ¿Propones tu algo diferente?');
    expect(matches.length).toBe(1);
    expect(matches[0].getSuggestedReplacements()[0]).toBe('Sugieres');
    expect(matches[0].getSuggestedReplacements()[1]).toBe('Recomiendas');

    matches = getRuleMatches('Inicia el debate. Inicia la conversación.');
    expect(matches.length).toBe(1);
    expect(matches[0].getSuggestedReplacements()[0]).toBe('Comienza');
    expect(matches[0].getSuggestedReplacements()[1]).toBe('Empieza');
    expect(matches[0].getSuggestedReplacements()[2]).toBe('Pone en marcha');
  });
});
