// Ported from CompoundRuleTest (sk module)
import { describe, it, beforeAll } from 'vitest';
import '../../../../src/lang/register.js';
import { Languages } from '../../../../src/core/Languages.js';
import { CompoundRule } from '../../../../src/lang/sk/rules/CompoundRule.js';
import { AbstractCompoundRuleTest } from '../../../support/AbstractCompoundRuleTest.js';
import { JLanguageTool } from '../../../../src/core/JLanguageTool.js';
import { messagesFor } from '../../../support/ruleTestSupport.js';

describe('CompoundRuleTest (sk)', () => {
  const t = new AbstractCompoundRuleTest();

  // Java: CompoundRuleTest#setUp
  beforeAll(() => {
    const lang = Languages.getLanguageForShortCode('sk');
    t.lt = new JLanguageTool(lang);
    t.rule = new CompoundRule(messagesFor(lang), lang, null);
    t.testAllCompounds();
  });

  // Java: CompoundRuleTest#testRule
  it('testRule', () => {
    // correct:
    t.check(0, 'česko-slovenský');
    t.check(0, 'rakúsko-uhorský');
    // incorrect:
    t.check(1, 'bim bam', 'bim-bam');
  });
});
