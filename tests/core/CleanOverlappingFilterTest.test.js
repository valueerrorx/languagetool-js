// CleanOverlappingFilterTest (Demo language -> en-US with getPriorityForId override; FakeRule -> FakeRule test class)
import { describe, it, expect } from 'vitest';
import '../../src/lang/register.js';
import { Languages } from '../../src/core/Languages.js';
import { AnalyzedSentence } from '../../src/core/AnalyzedSentence.js';
import { CleanOverlappingFilter } from '../../src/core/rules/CleanOverlappingFilter.js';
import { Rule } from '../../src/core/rules/model/Rule.js';
import { RuleMatch } from '../../src/core/rules/model/RuleMatch.js';
import { Tag } from '../../src/core/rules/model/Tag.js';

// Java: org.languagetool.rules.FakeRule
class FakeRule extends Rule {
  constructor(id = 'FAKE-RULE', tag = null) {
    super();
    this.ruleId = id;
    if (tag !== null) this.setTags([tag]);
  }

  getId() { return this.ruleId; }

  getDescription() { return '<none>'; }

  match() { return []; }
}

const PRIORITIES = {
  P3_RULE: 3, P2_RULE: 2, P2_PREMIUM_RULE: 2, COMMA_HIGH_PRIORITY: 2, MISSING_THE_HIGH_PRIORITY: 2,
  P1_RULE: 1, P1_RULE_B: 1, P1_PREMIUM_RULE: 1, COMMA_LOW_PRIORITY: 1, COMMA_LOW_PRIORITY2: 1, MISSING_THE_LOW_PRIORITY: 1,
  MISC: 0,
};

// Java: CleanOverlappingFilterTest.MyDemoLang
const myDemoLang = () => {
  const lang = Object.create(Languages.getLanguageForShortCode('en-US'));
  lang.getPriorityForId = (id) => {
    if (!(id in PRIORITIES)) throw new Error(`No priority defined for ${id}`);
    return PRIORITIES[id];
  };
  return lang;
};

// Java: CleanOverlappingFilterTest.MyCleanOverlappingFilter
class MyCleanOverlappingFilter extends CleanOverlappingFilter {
  isPremiumRule(ruleMatch) { return ruleMatch.getRule().getId().includes('PREMIUM'); }
}

const sentence = new AnalyzedSentence([]);
const m = (rule, from, to, msg) => new RuleMatch(rule, sentence, from, to, msg);
const ids = (list) => list.map((x) => x.getRule().getId());

describe('CleanOverlappingFilterTest', () => {
  // Java: CleanOverlappingFilterTest#testFilter
  it('testFilter', () => {
    const filter = new MyCleanOverlappingFilter(myDemoLang(), true);
    expect(filter.filter([]).length).toBe(0);
    expect(filter.filter([m(new FakeRule(), 0, 10, 'msg'), m(new FakeRule(), 11, 20, 'msg')]).length).toBe(2);
    expect(filter.filter([m(new FakeRule(), 0, 10, 'msg'), m(new FakeRule(), 10, 20, 'msg')]).length).toBe(2);
    const two = (a, b, ta = null, tb = null, rs = [[0, 10], [9, 20]]) =>
      ids(filter.filter([m(new FakeRule(a, ta), rs[0][0], rs[0][1], 'msg1'), m(new FakeRule(b, tb), rs[1][0], rs[1][1], 'msg2')]));
    expect(two('P1_RULE', 'P1_RULE_B')).toEqual(['P1_RULE_B']);
    expect(two('P1_RULE_B', 'P1_RULE')).toEqual(['P1_RULE']); // latest wins with equal priority
    expect(two('P1_RULE', 'P2_RULE')).toEqual(['P2_RULE']);
    expect(two('P2_RULE', 'P1_RULE')).toEqual(['P2_RULE']);
    expect(two('P2_PREMIUM_RULE', 'P1_RULE')).toEqual(['P1_RULE']); // premium rules are hidden
    expect(two('P1_RULE', 'P2_PREMIUM_RULE')).toEqual(['P1_RULE']);
    expect(two('P2_PREMIUM_RULE', 'P1_RULE', Tag.picky)).toEqual(['P1_RULE']);
    expect(two('P1_RULE', 'P2_PREMIUM_RULE', null, Tag.picky)).toEqual(['P1_RULE']);
    expect(two('P2_RULE', 'P1_RULE', Tag.picky)).toEqual(['P1_RULE']); // picky
    expect(two('P1_RULE', 'P2_RULE', null, Tag.picky)).toEqual(['P1_RULE']);

    const comma = (a, b) => {
      const r1 = m(new FakeRule(a), 5, 10, 'msg1');
      r1.addSuggestedReplacement('right,');
      const r2 = m(new FakeRule(b), 10, 15, 'msg2');
      r2.addSuggestedReplacement(', left');
      return ids(filter.filter([r1, r2]));
    };
    expect(comma('COMMA_LOW_PRIORITY', 'COMMA_HIGH_PRIORITY')).toEqual(['COMMA_HIGH_PRIORITY']);
    expect(comma('COMMA_HIGH_PRIORITY', 'COMMA_LOW_PRIORITY')).toEqual(['COMMA_HIGH_PRIORITY']);
    expect(comma('COMMA_LOW_PRIORITY2', 'COMMA_LOW_PRIORITY')).toEqual(['COMMA_LOW_PRIORITY']);

    const r7 = m(new FakeRule('MISSING_THE_HIGH_PRIORITY'), 5, 10, 'msg1');
    r7.addSuggestedReplacement('of the');
    const r8 = m(new FakeRule('MISSING_THE_LOW_PRIORITY'), 11, 15, 'msg2');
    r8.addSuggestedReplacement('the provisions');
    expect(ids(filter.filter([r7, r8]))).toEqual(['MISSING_THE_HIGH_PRIORITY']);

    expect(() => filter.filter([m(new FakeRule('P1_RULE'), 11, 12, 'msg2'), m(new FakeRule('P2_RULE', Tag.picky), 9, 10, 'msg1')]))
      .toThrow(/The list of rule matches is not ordered/);
  });

  // derived from code (CleanOverlappingFilter#filter premium branch): hidePremiumMatches=false keeps the premium priority
  it('premium matches are not hidden with hidePremiumMatches=false', () => {
    const filter = new MyCleanOverlappingFilter(myDemoLang(), false);
    const two = (a, b) => ids(filter.filter([m(new FakeRule(a), 0, 10, 'm1'), m(new FakeRule(b), 9, 20, 'm2')]));
    expect(two('P2_PREMIUM_RULE', 'P1_RULE')).toEqual(['P2_PREMIUM_RULE']);
    expect(two('P1_RULE', 'P2_PREMIUM_RULE')).toEqual(['P2_PREMIUM_RULE']);
  });

  // derived from code: both premium and hidden -> equal MIN_VALUE priority -> longest wins; picky is not applied to MIN_VALUE
  it('two hidden premium matches: longest wins, equal length -> last', () => {
    const filter = new MyCleanOverlappingFilter(myDemoLang(), true);
    const two = (a, ra, b, rb) => ids(filter.filter([m(new FakeRule(a, Tag.picky), ra[0], ra[1], 'm1'), m(new FakeRule(b), rb[0], rb[1], 'm2')]));
    expect(two('P1_PREMIUM_RULE', [0, 15], 'P2_PREMIUM_RULE', [9, 20])).toEqual(['P1_PREMIUM_RULE']);
    expect(two('P1_PREMIUM_RULE', [0, 10], 'P2_PREMIUM_RULE', [9, 19])).toEqual(['P2_PREMIUM_RULE']);
  });

  // derived from code: picky lowers priority (P3 picky still loses to P1); two picky rules compare shifted priorities
  it('picky rules lose against non-picky, compare among themselves by priority', () => {
    const filter = new MyCleanOverlappingFilter(myDemoLang(), true);
    const two = (a, b) => ids(filter.filter([m(new FakeRule(a, Tag.picky), 0, 10, 'm1'), m(new FakeRule(b, Tag.picky), 9, 20, 'm2')]));
    expect(two('P3_RULE', 'P1_RULE')).toEqual(['P3_RULE']);
    expect(two('P1_RULE', 'P3_RULE')).toEqual(['P3_RULE']);
    const one = filter.filter([m(new FakeRule('P3_RULE', Tag.picky), 0, 10, 'm1'), m(new FakeRule('P1_RULE'), 9, 20, 'm2')]);
    expect(ids(one)).toEqual(['P1_RULE']);
  });
});
