// Ported from SpanishWordRepeatRuleTest and SpanishWrongWordInContextRuleTest (es module)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { JLanguageTool } from '../../../../src/core/JLanguageTool.js';
import { Spanish } from '../../../../src/lang/es/language/Spanish.js';
import { messagesFor, englishMessages } from '../../../support/ruleTestSupport.js';
import { simulateNoEnglishModule } from '../../../support/NoEnglishModule.js';

simulateNoEnglishModule();

import { SpanishWordRepeatRule } from '../../../../src/lang/es/rules/SpanishWordRepeatRule.js';
import { SpanishWrongWordInContextRule } from '../../../../src/lang/es/rules/SpanishWrongWordInContextRule.js';

describe('SpanishWordRepeatRuleTest', () => {
  // Java: SpanishWordRepeatRuleTest#testRule
  it('testRule', () => {
    const rule = new SpanishWordRepeatRule(messagesFor(Spanish.getInstance()), Spanish.getInstance());
    const lt = new JLanguageTool(Spanish.getInstance());
    expect(rule.match(lt.getAnalyzedSentence('Bienvenido/a a LanguageTool.')).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence('HUCHA-GANGA.ES es la web de referencia.')).length).toBe(0);
  });

  // Java: SpanishWrongWordInContextRuleTest#testRule
  it('testWrongWordInContext', () => {
    const spanish = Spanish.getInstance();
    const rule = new SpanishWrongWordInContextRule(null, spanish);
    const lt = new JLanguageTool(spanish);
    let matches = rule.match(lt.getAnalyzedSentence('Le infringió un duro castigo'));
    expect(matches.length).toBe(1);
    expect(matches[0].getSuggestedReplacements()[0]).toBe('infligió');
    matches = rule.match(lt.getAnalyzedSentence('Infligía todas las normas.'));
    expect(matches.length).toBe(1);
    expect(matches[0].getSuggestedReplacements()[0]).toBe('Infringía');
    matches = rule.match(lt.getAnalyzedSentence('La baca da leche.'));
    expect(matches.length).toBe(2);
    expect(matches[0].getSuggestedReplacements()[0]).toBe('vaca');
    matches = rule.match(lt.getAnalyzedSentence('Pon la maleta en la vaca.'));
    expect(matches.length).toBe(1);
    expect(matches[0].getSuggestedReplacements()[0]).toBe('baca');
  });
});
