// Ported from JLanguageToolTest (es module)
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { JLanguageTool } from '../../../src/core/JLanguageTool.js';
import { RuleMatch } from '../../../src/core/rules/model/RuleMatch.js';
import { FakeRule } from '../../../src/core/rules/FakeRule.js';
import { Spanish } from '../../../src/lang/es/language/Spanish.js';
import { simulateNoEnglishModule } from '../../support/NoEnglishModule.js';

simulateNoEnglishModule(); // the Java es module tests run without the en module on the classpath

const LONG = 3600000;

describe('JLanguageToolTest (es)', () => {
  // Java: JLanguageToolTest#testXMLRules (ES-0112)
  it('testXMLRules', () => {
    const tool = new JLanguageTool(Spanish.getInstance());
    const matches = tool.check('Al cabo de 28 años, el vicealcalde de Busan, Baek Seung Taek, realiza una visita a Badajoz.');
    expect(matches.length).toBe(4);
  }, LONG);

  // Java: JLanguageToolTest#testMultitokenSpeller
  it('testMultitokenSpeller', () => {
    const lang = Spanish.getInstance();
    const ms = lang.getMultitokenSpeller();
    expect(`[${ms.getSuggestions('Helmut Khol').join(', ')}]`).toBe('[Helmut Kohl]');
    expect(`[${ms.getSuggestions('Fredrik Willem de Klerk').join(', ')}]`).toBe('[Frederik Willem de Klerk]');
    expect(`[${ms.getSuggestions('Maukalay Culkin').join(', ')}]`).toBe('[Macaulay Culkin]');
    expect(`[${ms.getSuggestions('Dimitri Mendeléief').join(', ')}]`).toBe('[Dmitri Mendeléyev]');
    expect(`[${ms.getSuggestions('Nikoláy Rimski-Kórsakov').join(', ')}]`).toBe('[Nikolái Rimski-Kórsakov]');
    expect(`[${ms.getSuggestions('Luis Leante').join(', ')}]`).toBe('[]');
    expect(`[${ms.getSuggestions('in vinos verita').join(', ')}]`).toBe('[in vino veritas]');
    expect(`[${ms.getSuggestions('Marina Buisan').join(', ')}]`).toBe('[]');
    expect(`[${ms.getSuggestions('Homos Sapiens').join(', ')}]`).toBe('[Homo sapiens]');
    expect(`[${ms.getSuggestions('Garcia Horta').join(', ')}]`).toBe('[]');
    expect(`[${ms.getSuggestions('Jon Benn').join(', ')}]`).toBe('[John Venn]');
    expect(`[${ms.getSuggestions('josue garcia').join(', ')}]`).toBe('[]');
    expect(`[${ms.getSuggestions('Franco more').join(', ')}]`).toBe('[]');
    expect(`[${ms.getSuggestions('maria Lopez').join(', ')}]`).toBe('[]');
    expect(`[${ms.getSuggestions('carlos fesi').join(', ')}]`).toBe('[]');
    expect(`[${ms.getSuggestions('Johan Sebastián Bach').join(', ')}]`).toBe('[Johann Sebastian Bach]');
    expect(`[${ms.getSuggestions('Johan Sebastián Bach').join(', ')}]`).toBe('[Johann Sebastian Bach]');
    expect(`[${ms.getSuggestions('Johann Sebastián Bach').join(', ')}]`).toBe('[Johann Sebastian Bach]');
    expect(`[${ms.getSuggestions('Plantation Boy').join(', ')}]`).toBe('[]');
    expect(`[${ms.getSuggestions('Woodie Alen').join(', ')}]`).toBe('[Woody Allen]');
    expect(`[${ms.getSuggestions('Eugenio Granjo').join(', ')}]`).toBe('[]');
    expect(`[${ms.getSuggestions('Julia García').join(', ')}]`).toBe('[]');
    expect(`[${ms.getSuggestions('Deustche Bank').join(', ')}]`).toBe('[Deutsche Bank]');
    expect(`[${ms.getSuggestions('Caralp Mariné').join(', ')}]`).toBe('[]');
    expect(`[${ms.getSuggestions('Andrew Cyrille').join(', ')}]`).toBe('[]');
    expect(`[${ms.getSuggestions('Alejandro Varón').join(', ')}]`).toBe('[]');
    expect(`[${ms.getSuggestions('Alejandro Mellado').join(', ')}]`).toBe('[]');
    expect(`[${ms.getSuggestions('Alejandro Erazo').join(', ')}]`).toBe('[]');
    expect(`[${ms.getSuggestions('Alberto Saoner').join(', ')}]`).toBe('[]');
    expect(`[${ms.getSuggestions('è più').join(', ')}]`).toBe('[]');
    expect(`[${ms.getSuggestions('Josep Maria Jové').join(', ')}]`).toBe('[]');
    expect(`[${ms.getSuggestions('Josep Maria Canudas').join(', ')}]`).toBe('[]');
    expect(`[${ms.getSuggestions('Francisco Javier Dra.').join(', ')}]`).toBe('[]');
    expect(`[${ms.getSuggestions('the usage of our').join(', ')}]`).toBe('[]');
    expect(`[${ms.getSuggestions('A sin').join(', ')}]`).toBe('[]');
    expect(`[${ms.getSuggestions('A xente').join(', ')}]`).toBe('[]');
    expect(`[${ms.getSuggestions('A lus').join(', ')}]`).toBe('[]');
    expect(`[${ms.getSuggestions('A Month').join(', ')}]`).toBe('[]');
    expect(`[${ms.getSuggestions('Jean-François Davy').join(', ')}]`).toBe('[]');
    expect(`[${ms.getSuggestions('finç abui').join(', ')}]`).toBe('[]');
    expect(`[${ms.getSuggestions('Led Zepelin').join(', ')}]`).toBe('[Led Zeppelin]');
    expect(`[${ms.getSuggestions('Led Sepelin').join(', ')}]`).toBe('[Led Zeppelin]');
    expect(`[${ms.getSuggestions('Marie Cuirie').join(', ')}]`).toBe('[Marie Curie]');
    expect(`[${ms.getSuggestions('William Bird').join(', ')}]`).toBe('[William Byrd]');
    expect(`[${ms.getSuggestions('Lluis Llach').join(', ')}]`).toBe('[Lluís Llach]');
    expect(`[${ms.getSuggestions('Universiti of Tejas').join(', ')}]`).toBe('[University of Texas]');
    expect(`[${ms.getSuggestions('Cindy Lauper').join(', ')}]`).toBe('[Cyndi Lauper]');
    expect(`[${ms.getSuggestions('Garcìa Mraquez').join(', ')}]`).toBe('[García Márquez]');
    expect(`[${ms.getSuggestions('yuval Noha Harari').join(', ')}]`).toBe('[Yuval Noah Harari]');
    expect(`[${ms.getSuggestions('Frederic Udina').join(', ')}]`).toBe('[]');
    expect(`[${ms.getSuggestions('Josep Maria Piñol').join(', ')}]`).toBe('[]');
    expect(`[${ms.getSuggestions('Jose Maria Asnar').join(', ')}]`).toBe('[José María Aznar]');
    expect(`[${ms.getSuggestions('José María Asnar').join(', ')}]`).toBe('[José María Aznar]');
  }, LONG);

  // Java: JLanguageToolTest#testFilterRuleMatches
  it('testFilterRuleMatches', () => {
    const lang = Spanish.getInstance();
    const lt = new JLanguageTool(lang);
    const rule = new FakeRule('AI_ES_GGEC_MISSING_PUNCTUATION');
    for (const text of ['Frase sin puntuación al final', 'Frase sin puntuación al final   ']) {
      const analyzedSentence = lt.getAnalyzedSentence(text);
      const match = new RuleMatch(rule, analyzedSentence, 24, 29, 'Falta puntuación.');
      match.addSuggestedReplacement('final.');
      expect(lang.filterRuleMatches([match], null, null).length).toBe(0);
    }
  }, LONG);
});
