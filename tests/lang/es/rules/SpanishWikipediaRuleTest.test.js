// Ported from SpanishWikipediaRuleTest (es module)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { JLanguageTool } from '../../../../src/core/JLanguageTool.js';
import { Spanish } from '../../../../src/lang/es/language/Spanish.js';
import { messagesFor, englishMessages } from '../../../support/ruleTestSupport.js';
import { simulateNoEnglishModule } from '../../../support/NoEnglishModule.js';

simulateNoEnglishModule();

import { SpanishWikipediaRule } from '../../../../src/lang/es/rules/SpanishWikipediaRule.js';

describe('SpanishWikipediaRuleTest', () => {
  const rule = new SpanishWikipediaRule(messagesFor(Spanish.getInstance()));
  const lt = new JLanguageTool(Spanish.getInstance());

  // Java: SpanishWikipediaRuleTest#checkSimpleReplaceRule(String,String)
  const checkSimpleReplaceRule = (sentence, word) => {
    const matches = rule.match(lt.getAnalyzedSentence(sentence));
    expect(matches.length, `Invalid matches.length while checking sentence: ${sentence}`).toBe(1);
    expect(matches[0].getSuggestedReplacements().length).toBe(1);
    expect(matches[0].getSuggestedReplacements()[0]).toBe(word);
  };

  // Java: SpanishWikipediaRuleTest#testRule
  it('testRule', () => {
    expect(rule.match(lt.getAnalyzedSentence('Estas frases no tienen errores frecuentes en la Wikipedia.')).length).toBe(0);
    checkSimpleReplaceRule('Sucedió ayer. Murio sin que nadie lo esperase.', 'Murió');
    checkSimpleReplaceRule('Murio sin que nadie lo esperase.', 'Murió');
    checkSimpleReplaceRule('Ayer murio sin que nadie lo esperase.', 'murió');
  });
});
