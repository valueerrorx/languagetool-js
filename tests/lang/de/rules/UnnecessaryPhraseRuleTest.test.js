// Ported from UnnecessaryPhraseRuleTest (de module)
import { describe, it, expect } from 'vitest';
import { UnnecessaryPhraseRule } from '../../../../src/lang/de/rules/UnnecessaryPhraseRule.js';
import { UserConfig } from '../../../../src/core/rules/model/UserConfig.js';
import { messagesFor } from '../../../support/ruleTestSupport.js';
import { german, ltWithRule } from './_styleTestSupport.js';

describe('UnnecessaryPhraseRuleTest', () => {
  const lang = german();

  // Java: UnnecessaryPhraseRuleTest#testRule
  it('testRule', () => {
    const lt = ltWithRule(lang, new UnnecessaryPhraseRule(messagesFor(lang), lang, new UserConfig()));

    expect(lt.check('In diesem Zusammenhang ist es im Allgemeinen voll und ganz zumindest mehr oder weniger sinnvoll.').length).toBe(4);
    // exclude direct speach:
    expect(lt.check('„In diesem Zusammenhang ist es im Allgemeinen voll und ganz zumindest mehr oder weniger sinnvoll.“').length).toBe(0);
    expect(lt.check('Es ist weniger sinnvoll.').length).toBe(0);
  });
});
