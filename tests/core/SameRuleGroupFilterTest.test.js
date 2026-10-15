// Ported from SameRuleGroupFilterTest (languagetool-core); PatternRule replaced by a plain Rule with the same id (only getId is read).
import { describe, it, expect } from 'vitest';
import { Rule } from '../../src/core/rules/model/Rule.js';
import { RuleMatch } from '../../src/core/rules/model/RuleMatch.js';
import { SameRuleGroupFilter } from '../../src/core/rules/SameRuleGroupFilter.js';

// stands in for PatternRule(id, language, tokens, desc, msg, shortMsg) / FakeRule
class IdRule extends Rule {
  constructor(id) {
    super();
    this.id = id;
  }

  getId() { return this.id; }

  getDescription() { return 'desc'; }

  match() { return []; }
}

const makeRuleMatch = (fromPos, toPos) => new RuleMatch(new IdRule('FAKE_ID'), null, fromPos, toPos, 'FakeMatch1');

describe('SameRuleGroupFilterTest', () => {
  // Java: SameRuleGroupFilterTest#testFilter
  it('testFilter', () => {
    const match1 = new RuleMatch(new IdRule('id1'), null, 10, 20, 'Match1');
    const match2 = new RuleMatch(new IdRule('id1'), null, 15, 25, 'Match2');
    const filteredMatches = new SameRuleGroupFilter().filter([match1, match2]);
    expect(filteredMatches.length).toBe(1);
    expect(filteredMatches[0].getMessage()).toBe('Match1');
  });

  // Java: SameRuleGroupFilterTest#testNoFilteringIfNotOverlapping
  it('testNoFilteringIfNotOverlapping', () => {
    const match1 = new RuleMatch(new IdRule('id1'), null, 10, 20, 'Match1');
    const match2 = new RuleMatch(new IdRule('id1'), null, 21, 25, 'Match2');
    expect(new SameRuleGroupFilter().filter([match1, match2]).length).toBe(2);
  });

  // Java: SameRuleGroupFilterTest#testNoFilteringIfDifferentRulegroups
  it('testNoFilteringIfDifferentRulegroups', () => {
    const match1 = new RuleMatch(new IdRule('id1'), null, 10, 20, 'Match1');
    const match2 = new RuleMatch(new IdRule('id2'), null, 15, 25, 'Match2');
    expect(new SameRuleGroupFilter().filter([match1, match2]).length).toBe(2);
  });

  // Java: SameRuleGroupFilterTest#testOverlaps
  it('testOverlaps', () => {
    const filter = new SameRuleGroupFilter();
    expect(filter.overlaps(makeRuleMatch(10, 20), makeRuleMatch(10, 20))).toBe(true);
    expect(filter.overlaps(makeRuleMatch(10, 20), makeRuleMatch(5, 11))).toBe(true);
    expect(filter.overlaps(makeRuleMatch(10, 20), makeRuleMatch(19, 21))).toBe(true);
    expect(filter.overlaps(makeRuleMatch(10, 20), makeRuleMatch(11, 19))).toBe(true);
    expect(filter.overlaps(makeRuleMatch(10, 20), makeRuleMatch(1, 10))).toBe(true);
    expect(filter.overlaps(makeRuleMatch(10, 20), makeRuleMatch(19, 20))).toBe(true);
    expect(filter.overlaps(makeRuleMatch(10, 20), makeRuleMatch(21, 30))).toBe(false);
    expect(filter.overlaps(makeRuleMatch(10, 20), makeRuleMatch(1, 9))).toBe(false);
  });

  // block test: input is sorted in place and stable by fromPos (Collections.sort)
  it('sorts stably by fromPos', () => {
    const a = new RuleMatch(new IdRule('a'), null, 5, 6, 'a');
    const b = new RuleMatch(new IdRule('b'), null, 1, 2, 'b');
    const c = new RuleMatch(new IdRule('c'), null, 5, 7, 'c');
    const list = [a, b, c];
    expect(new SameRuleGroupFilter().filter(list).map((m) => m.getMessage())).toEqual(['b', 'a', 'c']);
    expect(list.map((m) => m.getMessage())).toEqual(['b', 'a', 'c']);
  });
});
