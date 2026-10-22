// Ported from SimpleReplaceRuleTest and SimpleReplaceVerbsRuleTest (es module)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { JLanguageTool } from '../../../../src/core/JLanguageTool.js';
import { Spanish } from '../../../../src/lang/es/language/Spanish.js';
import { messagesFor, englishMessages } from '../../../support/ruleTestSupport.js';
import { simulateNoEnglishModule } from '../../../support/NoEnglishModule.js';

simulateNoEnglishModule();

import { SimpleReplaceRule } from '../../../../src/lang/es/rules/SimpleReplaceRule.js';
import { SimpleReplaceVerbsRule } from '../../../../src/lang/es/rules/SimpleReplaceVerbsRule.js';

describe('SimpleReplaceRuleTest (es)', () => {
  // Java: SimpleReplaceRuleTest#testRule
  it('testRule', () => {
    const lt = new JLanguageTool(Spanish.getInstance());
    const rule = new SimpleReplaceRule(messagesFor(lt.getLanguage()), lt.getLanguage());
    // incorrect sentences:
    const matches = rule.match(lt.getAnalyzedSentence('sanitización'));
    expect(matches.length).toBe(1);
    expect(matches[0].getSuggestedReplacements()[0]).toBe('desinfección');
    // correct sentences:
    const matches2 = rule.match(lt.getAnalyzedSentence('Esta frase no tiene errores.'));
    expect(matches2.length).toBe(0);
  });

  // Java: SimpleReplaceVerbsRuleTest#testRule
  it('testVerbsRule', () => {
    const rule = new SimpleReplaceVerbsRule(messagesFor(Spanish.getInstance()), Spanish.getInstance());
    const lt = new JLanguageTool(Spanish.getInstance());
    const matches = rule.match(lt.getAnalyzedSentence('clickeaban'));
    expect(matches.length).toBe(1);
    expect(`[${matches[0].getSuggestedReplacements().join(', ')}]`).toBe('[clicaban, cliqueaban, hacían clic]');
  });
});
