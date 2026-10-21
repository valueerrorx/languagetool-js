// Ported from SwissCompoundRuleTest (de)
import { describe, it } from 'vitest';
import { Languages } from '../../../../src/core/Languages.js';
import { SwissCompoundRule } from '../../../../src/lang/de/rules/SwissCompoundRule.js';
import { AbstractCompoundRuleTest } from '../../../support/AbstractCompoundRuleTest.js';
import { messagesFor, newLt } from '../../../support/ruleTestSupport.js';

describe('SwissCompoundRuleTest', () => {
  const t = new AbstractCompoundRuleTest();

  // Java: SwissCompoundRuleTest#testRule
  it('testRule', () => {
    t.lt = newLt(Languages.getLanguageForShortCode('de-DE')); // Java: new JLanguageTool(de-DE), only used for getAnalyzedSentence
    t.rule = new SwissCompoundRule(messagesFor(Languages.getLanguageForShortCode('de')), Languages.getLanguageForShortCode('de-DE'), null);
    // check(1, "Ente süss-sauer");
    t.check(1, "Ente süß-sauer");
    // check(1, "Ente süss sauer");
    t.check(1, "Ente süß sauer");
  });
});
