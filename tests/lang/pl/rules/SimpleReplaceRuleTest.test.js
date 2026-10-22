// Ported from SimpleReplaceRuleTest (pl module)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { JLanguageTool } from '../../../../src/core/JLanguageTool.js';
import { Polish } from '../../../../src/lang/pl/language/Polish.js';
import { SimpleReplaceRule } from '../../../../src/lang/pl/rules/SimpleReplaceRule.js';
import { messagesFor } from '../../../support/ruleTestSupport.js';
import { simulateNoEnglishModule } from '../../../support/NoEnglishModule.js';

simulateNoEnglishModule();

describe('SimpleReplaceRuleTest (pl)', () => {
  const lt = new JLanguageTool(new Polish());
  const rule = new SimpleReplaceRule(messagesFor(lt.getLanguage()), lt.getLanguage());

  // Java: SimpleReplaceRuleTest#checkSimpleReplaceRule
  const check = (sentence, word) => {
    const matches = rule.match(lt.getAnalyzedSentence(sentence));
    expect(matches.length, sentence).toBe(1);
    expect(matches[0].getSuggestedReplacements().length, sentence).toBe(1);
    expect(matches[0].getSuggestedReplacements()[0], sentence).toBe(word);
  };

  // Java: SimpleReplaceRuleTest#testRule
  it('testRule', () => {
    expect(rule.match(lt.getAnalyzedSentence('Wszystko w porządku.')).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence('Pola lodowe')).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence('Witamy prez. Komorowskiego!')).length).toBe(0);
    check('Piaty przypadek.', 'Piąty');
    check('To piaty przypadek.', 'piąty');
  });
});
