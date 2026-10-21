// Ported from GermanParagraphRepeatBeginningRuleTest (de module)
import { describe, it, expect } from 'vitest';
import { GermanParagraphRepeatBeginningRule } from '../../../../src/lang/de/rules/GermanParagraphRepeatBeginningRule.js';
import { messagesFor } from '../../../support/ruleTestSupport.js';
import { german, ltWithRule } from './_styleTestSupport.js';

describe('GermanParagraphRepeatBeginningRuleTest', () => {
  const lang = german();

  // Java: GermanParagraphRepeatBeginningRuleTest#testRule
  it('testRule', () => {
    const lt = ltWithRule(lang, new GermanParagraphRepeatBeginningRule(messagesFor(lang), lang));

    expect(lt.check('Der Hund spazierte über die Straße.\n\nDer Hund ignorierte den Verkehr.').length).toBe(2);
    expect(lt.check('Der Hund spazierte über die Straße.\n\nDas Tier ignorierte den Verkehr.').length).toBe(0);
    expect(lt.check('Peter spazierte über die Straße.\n\nPeter ignorierte den Verkehr.').length).toBe(2);
    expect(lt.check('Peter spazierte über die Straße.\n\nDer Junge ignorierte den Verkehr.').length).toBe(0);
    expect(lt.check('»Peter spazierte über die Straße.«\n\n»Peter ignorierte den Verkehr.«').length).toBe(2);
  });
});
