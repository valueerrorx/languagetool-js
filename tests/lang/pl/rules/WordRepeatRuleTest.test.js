// Ported from WordRepeatRuleTest (pl module)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { JLanguageTool } from '../../../../src/core/JLanguageTool.js';
import { WordRepeatRule } from '../../../../src/core/rules/WordRepeatRule.js';
import { Polish } from '../../../../src/lang/pl/language/Polish.js';
import { englishMessages } from '../../../support/ruleTestSupport.js';
import { simulateNoEnglishModule } from '../../../support/NoEnglishModule.js';

simulateNoEnglishModule();

describe('WordRepeatRuleTest (pl)', () => {
  // Java: WordRepeatRuleTest#testRulePolish
  it('testRulePolish', () => {
    const polish = new Polish();
    const rule = new WordRepeatRule(englishMessages(), polish);
    const lt = new JLanguageTool(polish);
    const n = (s) => rule.match(lt.getAnalyzedSentence(s)).length;
    expect(n('To jest zdanie.')).toBe(0);
    expect(n('W w. XVI język jest jak kipiący kocioł.')).toBe(0);
    expect(n('Co jeszcze było smutniejsze, to to, że im się jeść chciało potężnie.')).toBe(0);
    expect(n('Tra ta ta!')).toBe(0);
    expect(n('To jest jest zdanie.')).toBe(1);
  });
});
