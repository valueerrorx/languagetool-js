// Ported from SpanishUnpairedBracketsRuleTest (es module)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { JLanguageTool } from '../../../../src/core/JLanguageTool.js';
import { Spanish } from '../../../../src/lang/es/language/Spanish.js';
import { messagesFor, englishMessages } from '../../../support/ruleTestSupport.js';
import { simulateNoEnglishModule } from '../../../support/NoEnglishModule.js';

simulateNoEnglishModule();

import { SpanishUnpairedBracketsRule } from '../../../../src/lang/es/rules/SpanishUnpairedBracketsRule.js';
import { AnnotatedTextBuilder } from '../../../../src/core/text/AnnotatedTextBuilder.js';

describe('SpanishUnpairedBracketsRuleTest', () => {
  // Java: SpanishUnpairedBracketsRuleTest#testSpanishRule
  it('testSpanishRule', () => {
    const lt = new JLanguageTool(Spanish.getInstance());
    const rule = new SpanishUnpairedBracketsRule(englishMessages());
    const assertMatches = (input, expected) => expect(rule.match([lt.getAnalyzedSentence(input)]).length, input).toBe(expected);
    const assertCorrectText = (sentences) => {
      const aText = new AnnotatedTextBuilder().addText(sentences).build();
      expect(rule.match(lt.analyzeText(sentences), aText).length).toBe(0);
    };
    assertMatches('Soy un hombre (muy honrado).', 0);
    assertMatches("D'Hondt.", 0);
    assertMatches('Guns N’ Roses', 0);
    assertMatches("Guns N' Roses", 0);
    assertMatches('D’Hondt.', 0);
    assertMatches('L’Équipe', 0);
    assertMatches('rock ’n’ roll', 0);
    assertMatches("Harper's Dictionary of Classical Antiquities", 0);
    assertMatches('Harper’s Dictionary of Classical Antiquities', 0);
    assertMatches('Soy un hombre muy honrado).', 1);
    assertMatches('Soy un hombre (muy honrado.', 1);
    assertMatches('Eso es “importante y qué pasa. ', 1);
    assertMatches('Eso es "importante y qué. ', 1);
    assertMatches('Eso es (imposible. ', 1);
    assertMatches('Eso es (imposible.\n\n', 1);
    assertMatches('Eso es) imposible. ', 1);
    assertMatches('Eso es imposible).\t\n ', 1);
    assertMatches('Eso es «importante, ¿ah que sí?', 1);

    assertCorrectText('\n\n' + 'a) New York\n' + 'b) Boston\n');
    assertCorrectText('\n\n' + '1.) New York\n' + '2.) Boston\n');
    assertCorrectText('\n\n' + 'XII.) New York\n' + 'XIII.) Boston\n');
    assertCorrectText('\n\n' + 'A) New York\n' + 'B) Boston\n' + 'C) Foo\n');
  });
});
