// Ported from ConsistentApostrophesRuleTest (en module)
import { describe, it, expect } from 'vitest';
import { Languages } from '../../../../src/core/Languages.js';
import { ConsistentApostrophesRule } from '../../../../src/lang/en/rules/ConsistentApostrophesRule.js';
import { englishMessages, newLt } from '../../../support/ruleTestSupport.js';

describe('ConsistentApostrophesRuleTest', () => {
  // Java: ConsistentApostrophesRuleTest#testRule
  it('testRule', () => {
    const rule = new ConsistentApostrophesRule(englishMessages());
    const lt = newLt(Languages.getLanguageForShortCode('en'));
    const matches = rule.match(lt.analyzeText('It\'s a nice idea. But it doesn’t work.'));
    expect(matches.length).toBe(2);
    expect(matches[0].getFromPos()).toBe(2);
    expect(matches[0].getToPos()).toBe(4);
    expect(`[${matches[0].getSuggestedReplacements().join(', ')}]`).toBe('[’s]');
    expect(matches[1].getFromPos()).toBe(29);
    expect(matches[1].getToPos()).toBe(32);
    expect(`[${matches[1].getSuggestedReplacements().join(', ')}]`).toBe('[n\'t]');

    expect(rule.match(lt.analyzeText('It’s a nice idea. But it doesn\'t work.')).length).toBe(2);
    expect(rule.match(lt.analyzeText('It\'s a nice idea. But it doesn\'t work.')).length).toBe(0);
    expect(rule.match(lt.analyzeText('It’s a nice idea. But it doesn’t work.')).length).toBe(0);
  });
});
