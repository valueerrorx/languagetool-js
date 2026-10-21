// Ported from GermanWordRepeatBeginningRuleTest (de module); lt holds the rule alone (German#getRelevantRules is F59)
import { describe, it, expect } from 'vitest';
import { GermanWordRepeatBeginningRule } from '../../../../src/lang/de/rules/GermanWordRepeatBeginningRule.js';
import { messagesFor, newLt } from '../../../support/ruleTestSupport.js';
import { german } from './_styleTestSupport.js';

describe('GermanWordRepeatBeginningRuleTest', () => {
  // Java: GermanWordRepeatBeginningRuleTest#testRule
  it('testRule', () => {
    const lang = german();
    const lt = newLt(lang, new GermanWordRepeatBeginningRule(messagesFor(lang), lang));
    lt.disableRule('DE_REPEATEDWORDS');
    // correct sentences:
    expect(lt.check('Er ist nett. Er heißt Max.').length).toBe(0);
    expect(lt.check('Außerdem kommt er. Ferner kommt sie. Außerdem kommt es.').length).toBe(0);
    expect(lt.check('2011: Dieses passiert. 2011: Jenes passiert. 2011: Nicht passiert').length).toBe(0);
    // errors:
    expect(lt.check('Er ist nett. Er heißt Max. Er ist 11.').length).toBe(1);
    expect(lt.check('Außerdem kommt er. Außerdem kommt sie.').length).toBe(1);
    // this used to cause false alarms because reset() was not implemented
    expect(lt.check('Außerdem ist das ein neuer Text.').length).toBe(0);
    // only consider 'real' sentences that end in [.!?]:
    expect(lt.check('Außerdem ist das ein neuer Text\n\nAußerdem noch mehr ohne Punkt\n\nAußerdem schon wieder').length).toBe(0);
  });
});
