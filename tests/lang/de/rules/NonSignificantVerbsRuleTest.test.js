// Ported from NonSignificantVerbsRuleTest (de module)
import { describe, it, expect } from 'vitest';
import { NonSignificantVerbsRule } from '../../../../src/lang/de/rules/NonSignificantVerbsRule.js';
import { UserConfig } from '../../../../src/core/rules/model/UserConfig.js';
import { messagesFor } from '../../../support/ruleTestSupport.js';
import { german, ltWithRule } from './_styleTestSupport.js';

describe('NonSignificantVerbsRuleTest', () => {
  const lang = german();

  // Java: NonSignificantVerbsRuleTest#testRule
  it('testRule', () => {
    const lt = ltWithRule(lang, new NonSignificantVerbsRule(messagesFor(lang), lang, new UserConfig()));

    expect(lt.check('Wenn man das machen kann, sollte man das tun. Das ist so.').length).toBe(3);
    expect(lt.check('Der Vorgang war abgeschlossen. Das hatte er nicht bedacht.').length).toBe(0);
  });
});
