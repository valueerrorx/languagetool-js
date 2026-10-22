// Ported from MultipleWhitespaceRuleTest (pl module)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { JLanguageTool } from '../../../../src/core/JLanguageTool.js';
import { MultipleWhitespaceRule } from '../../../../src/core/rules/MultipleWhitespaceRule.js';
import { Polish } from '../../../../src/lang/pl/language/Polish.js';
import { englishMessages } from '../../../support/ruleTestSupport.js';
import { simulateNoEnglishModule } from '../../../support/NoEnglishModule.js';

simulateNoEnglishModule();

describe('MultipleWhitespaceRuleTest (pl)', () => {
  // Java: MultipleWhitespaceRuleTest#testRule
  it('testRule', () => {
    const rule = new MultipleWhitespaceRule(englishMessages(), new Polish());
    const lt = new JLanguageTool(new Polish());
    const n = (s) => rule.match([lt.getAnalyzedSentence(s)]).length;
    expect(n('To jest test.')).toBe(0);
    expect(n('To jest   test.')).toBe(1);
  });
});
