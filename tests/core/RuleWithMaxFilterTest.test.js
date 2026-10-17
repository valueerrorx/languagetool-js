// Ported from RuleWithMaxFilterTest (languagetool-core)
import { describe, it, expect } from 'vitest';
import { Rule } from '../../src/core/rules/model/Rule.js';
import { RuleMatch } from '../../src/core/rules/model/RuleMatch.js';
import { RuleWithMaxFilter } from '../../src/core/rules/RuleWithMaxFilter.js';
import { PatternRule } from '../../src/core/patterns/PatternRule.js';
import { getDemoLanguage } from '../support/DemoLanguage.js';

// Java: org.languagetool.rules.FakeRule
class FakeRule extends Rule {
  getId() { return 'FAKE_ID'; }

  getDescription() { return 'Fake Rule'; }

  match() { return []; }
}

const language = getDemoLanguage();
const makeRuleMatch = (fromPos, toPos) => new RuleMatch(new FakeRule(), null, fromPos, toPos, 'FakeMatch1');

describe('RuleWithMaxFilterTest', () => {
  // Java: RuleWithMaxFilterTest#testFilter
  it('testFilter', () => {
    const fakePatternTokens = [];
    const rule1 = new PatternRule('id1', language, fakePatternTokens, 'desc1', 'msg1', 'shortMsg1');
    const rule2 = new PatternRule('id1', language, fakePatternTokens, 'desc2', 'msg2', 'shortMsg2');
    const match1 = new RuleMatch(rule1, null, 10, 20, 'Match1');
    const match2 = new RuleMatch(rule2, null, 15, 25, 'Match2');
    const filter = new RuleWithMaxFilter();
    const filteredMatches1 = filter.filter([match1, match2]);
    expect(filteredMatches1.length).toBe(2);
    const match3 = new RuleMatch(rule2, null, 11, 19, 'Match3');
    const filteredMatches2 = filter.filter([match1, match3]);
    expect(filteredMatches2.length).toBe(1);
  });

  // Java: RuleWithMaxFilterTest#testNoFilteringIfNotOverlapping
  it('testNoFilteringIfNotOverlapping', () => {
    const fakePatternTokens = [];
    const rule1 = new PatternRule('id1', language, fakePatternTokens, 'desc1', 'msg1', 'shortMsg1');
    const rule2 = new PatternRule('id1', language, fakePatternTokens, 'desc2', 'msg2', 'shortMsg2');
    const match1 = new RuleMatch(rule1, null, 10, 20, 'Match1');
    const match2 = new RuleMatch(rule2, null, 21, 25, 'Match2');
    const filter = new RuleWithMaxFilter();
    const filteredMatches = filter.filter([match1, match2]);
    expect(filteredMatches.length).toBe(2);
  });

  // Java: RuleWithMaxFilterTest#testNoFilteringIfDifferentRulegroups
  it('testNoFilteringIfDifferentRulegroups', () => {
    const fakePatternTokens = [];
    const rule1 = new PatternRule('id1', language, fakePatternTokens, 'desc1', 'msg1', 'shortMsg1');
    const rule2 = new PatternRule('id2', language, fakePatternTokens, 'desc2', 'msg2', 'shortMsg2');
    const match1 = new RuleMatch(rule1, null, 10, 20, 'Match1');
    const match2 = new RuleMatch(rule2, null, 15, 25, 'Match2');
    const filter = new RuleWithMaxFilter();
    const filteredMatches1 = filter.filter([match1, match2]);
    expect(filteredMatches1.length).toBe(2);
    const match3 = new RuleMatch(rule2, null, 11, 19, 'Match3');
    const filteredMatches2 = filter.filter([match1, match3]);
    expect(filteredMatches2.length).toBe(2);
  });

  // Java: RuleWithMaxFilterTest#testOverlaps
  it('testOverlaps', () => {
    const filter = new RuleWithMaxFilter();

    expect(filter.includes(makeRuleMatch(10, 20), makeRuleMatch(10, 20))).toBe(true);
    expect(filter.includes(makeRuleMatch(10, 20), makeRuleMatch(5, 11))).toBe(false);
    expect(filter.includes(makeRuleMatch(10, 20), makeRuleMatch(11, 21))).toBe(false);
    expect(filter.includes(makeRuleMatch(10, 20), makeRuleMatch(11, 19))).toBe(true);
    expect(filter.includes(makeRuleMatch(10, 20), makeRuleMatch(1, 10))).toBe(false);
    expect(filter.includes(makeRuleMatch(10, 20), makeRuleMatch(19, 20))).toBe(true);

    expect(filter.includes(makeRuleMatch(10, 20), makeRuleMatch(21, 30))).toBe(false);
    expect(filter.includes(makeRuleMatch(10, 20), makeRuleMatch(1, 9))).toBe(false);
  });
});
