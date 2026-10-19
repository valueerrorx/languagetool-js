// Ported from NewLineFilterTest (languagetool-standalone); en-US with no-op analysis stands in for the full JLanguageTool
import { describe, it, expect } from 'vitest';
import { Rule } from '../../../src/core/rules/model/Rule.js';
import { RuleMatch } from '../../../src/core/rules/model/RuleMatch.js';
import { NewLineMatchFilter } from '../../../src/core/rules/NewLineMatchFilter.js';
import { AnnotatedTextBuilder } from '../../../src/core/text/AnnotatedTextBuilder.js';
import { EN, newLt, useNoopAnalysis } from '../../support/ruleTestSupport.js';

// Java: org.languagetool.rules.FakeRule
class FakeRule extends Rule {
  getId() { return 'FAKE_ID'; }

  getDescription() { return 'A fake rule for tests only.'; }

  match() { return RuleMatch.EMPTY_ARRAY; }
}

describe('NewLineFilterTest', () => {
  useNoopAnalysis(EN);

  // Java: NewLineFilterTest#test
  const test = (text, lt, filter, fromPosBeforeFilter, toPosBeforeFilter, suggestionBeforeFilter, fromPosAfterFilter, toPosAfterFilter,
    expectedMatchesAfterFilter, suggestionAfterFilter) => {
    const sentence = lt.analyzeText(text)[0];
    const ruleMatch = new RuleMatch(new FakeRule(), sentence, fromPosBeforeFilter, toPosBeforeFilter, 'match1');
    ruleMatch.setSuggestedReplacement(suggestionBeforeFilter);

    const filteredRuleMatch = filter.filter([ruleMatch], new AnnotatedTextBuilder().addText(text).build());
    if (expectedMatchesAfterFilter) {
      const matchToCheck = filteredRuleMatch[0];
      expect(filteredRuleMatch.length).toBe(1);
      expect(matchToCheck.getFromPos()).toBe(fromPosAfterFilter);
      expect(matchToCheck.getToPos()).toBe(toPosAfterFilter);
      expect(matchToCheck.getSuggestedReplacements()).toContain(suggestionAfterFilter);
    } else {
      expect(filteredRuleMatch.length).toBe(0);
    }
  };

  // Java: NewLineFilterTest#testFilter
  it('testFilter', () => {
    const lt = newLt(EN);
    const filter = new NewLineMatchFilter();
    const text1 = 'I’m+the+Heeadline\n\n\n\n⁣\n\n\n\nI’m+some+plain+teext.';
    test(text1, lt, filter, 8, 21, 'Headline\n\n\n\n⁣\n\n\n\n', 8, 17, true, 'Headline');
    test(text1, lt, filter, 8, 21, 'Heeadline\n\n\n\n⁣\n\n\n\n', 8, 17, false, null);
  });
});
