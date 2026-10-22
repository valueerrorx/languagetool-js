// Ported from SpanishTest (es module, rules/es/SpanishTest)
import { describe, it } from 'vitest';
import '../../../src/lang/register.js';
import { Spanish } from '../../../src/lang/es/language/Spanish.js';
import { LanguageSpecificTest } from '../../support/LanguageSpecificTest.js';
import { simulateNoEnglishModule } from '../../support/NoEnglishModule.js';

simulateNoEnglishModule(); // the Java es module tests run without the en module on the classpath

const LONG = 3600000;

describe('SpanishTest', () => {
  const base = new LanguageSpecificTest('es');

  // Java: SpanishTest#testLanguage
  it('testLanguage', async () => {
    const s = 'Escribe o pega tu texto aqui para tenerlo revisado contínuamente. los errores se subrayaran en diferentes colores: marcaremos los errores ortograficos en rojo; los errores de gramática son resaltado en amarillo; los problemas relacionados al estilo serán marcados en azul. Sabías que te proponemos sinónimos al hacer doble clic sobre una palabra? LanguageTool es un herramienta para textos impecables, sean e-mails, artículos, blogs o otros, incluso cuando el texto se complejice.';
    const lang = Spanish.getInstance();
    base.testDemoText(lang, s,
      ['ES_SIMPLE_REPLACE_SIMPLE_AQUI', 'MORFOLOGIK_RULE_ES', 'UPPERCASE_SENTENCE_START', 'SUBJUNTIVO_FUTURO', 'MORFOLOGIK_RULE_ES', 'AGREEMENT_VERB_PARTICIPLE', 'RELACIONADO_A', 'ES_QUESTION_MARK', 'AGREEMENT_DET_NOUN', 'Y_E_O_U', 'COMPLEJIZAR']);
    await base.runTests(lang, null, 'ÍÚÑ');
  }, LONG);
});
