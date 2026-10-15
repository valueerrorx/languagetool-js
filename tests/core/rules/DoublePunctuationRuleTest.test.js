// Ported from DoublePunctuationRuleTest (languagetool-core); Demo language replaced by en-US
import { describe, it, expect } from 'vitest';
import { DoublePunctuationRule } from '../../../src/core/rules/DoublePunctuationRule.js';
import { EN, englishMessages, newLt, useNoopAnalysis } from '../../support/ruleTestSupport.js';

describe('DoublePunctuationRuleTest', () => {
  useNoopAnalysis(EN);

  // Java: DoublePunctuationRuleTest#testRule
  it('testRule', () => {
    const rule = new DoublePunctuationRule(englishMessages());
    const lt = newLt(EN);
    const n = (s) => rule.match(lt.getAnalyzedSentence(s)).length;

    // correct sentences:
    expect(n('This is a test sentence...')).toBe(0);
    expect(n('Это тестовое предложение?..')).toBe(0);
    expect(n('Это тестовое предложение!.. ')).toBe(0);
    expect(n('This is a test sentence... More stuff....')).toBe(0);
    expect(n('This is a test sentence..... More stuff....')).toBe(0);
    expect(n('This, is, a test sentence.')).toBe(0);
    expect(n('The path is ../data/vtest.avi')).toBe(0);
    expect(n('The path is ..\\data\\vtest.avi')).toBe(0);
    expect(n('Something … … ..')).toBe(0);
    expect(n('Something … … ... …')).toBe(0);
    expect(n('Something … … .... …')).toBe(0);
    expect(n('Something … … .. …')).toBe(0);
    expect(n('Something ……..')).toBe(0);

    // errors:
    const matches1 = rule.match(lt.getAnalyzedSentence('This,, is a test sentence.'));
    expect(matches1.length).toBe(1);
    expect(matches1[0].getFromPos()).toBe(4);
    expect(matches1[0].getToPos()).toBe(6);
    const matches2 = rule.match(lt.getAnalyzedSentence('This is a test sentence.. Another sentence'));
    expect(matches2.length).toBe(1);
    expect(matches2[0].getFromPos()).toBe(23);
    expect(matches2[0].getToPos()).toBe(25);
  });
});
