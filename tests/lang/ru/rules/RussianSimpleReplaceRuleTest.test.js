// Ported from RussianSimpleReplaceRuleTest (ru module)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { JLanguageTool } from '../../../../src/core/JLanguageTool.js';
import { Languages } from '../../../../src/core/Languages.js';
import { Russian } from '../../../../src/lang/ru/language/Russian.js';
import { englishMessages, messagesFor } from '../../../support/ruleTestSupport.js';
import { simulateNoEnglishModule } from '../../../support/NoEnglishModule.js';

simulateNoEnglishModule();

import { RussianSimpleReplaceRule } from '../../../../src/lang/ru/rules/RussianSimpleReplaceRule.js';

describe('RussianSimpleReplaceRuleTest', () => {
  // Java: RussianSimpleReplaceRuleTest#testRule
  it('testRule', () => {
    const rule = new RussianSimpleReplaceRule(messagesFor(Russian.getInstance()));
    const lt = new JLanguageTool(Russian.getInstance());
    expect(rule.match(lt.getAnalyzedSentence('Рост кораллов тут самый быстрый,')).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence('Книга была порвана.')).length).toBe(0);
    const matches = rule.match(lt.getAnalyzedSentence('Книга была порвата.'));
    expect(matches.length).toBe(1);
    expect(matches[0].getSuggestedReplacements().length).toBe(1);
    expect(matches[0].getSuggestedReplacements()[0]).toBe('порвана');
  });
});
