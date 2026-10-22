// Ported from CompoundRuleTest (es module)
import { describe, it, beforeEach } from 'vitest';
import '../../../../src/lang/register.js';
import { JLanguageTool } from '../../../../src/core/JLanguageTool.js';
import { Languages } from '../../../../src/core/Languages.js';
import { CompoundRule } from '../../../../src/lang/es/rules/CompoundRule.js';
import { AbstractCompoundRuleTest } from '../../../support/AbstractCompoundRuleTest.js';
import { messagesFor } from '../../../support/ruleTestSupport.js';
import { simulateNoEnglishModule } from '../../../support/NoEnglishModule.js';

simulateNoEnglishModule();

describe('CompoundRuleTest (es)', () => {
  const t = new AbstractCompoundRuleTest();

  // Java: CompoundRuleTest#setUp
  beforeEach(() => {
    t.lt = new JLanguageTool(Languages.getLanguageForShortCode('es'));
    t.rule = new CompoundRule(messagesFor(Languages.getLanguageForShortCode('es')), Languages.getLanguageForShortCode('es'), null);
    t.testAllCompounds();
  });

  // Java: CompoundRuleTest#testRule
  it('testRule', () => {
    // correct sentences:
    t.check(0, 'Guinea-Conakri');
    // incorrect sentences:
    t.check(1, 'Guinea Bisáu', 'Guinea-Bisáu');
  });
});
