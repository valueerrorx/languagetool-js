// Ported from EnglishNumberInWordFilterTest (en module)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { Languages } from '../../../../src/core/Languages.js';
import { Rule } from '../../../../src/core/rules/model/Rule.js';
import { RuleMatch } from '../../../../src/core/rules/model/RuleMatch.js';
import { JavaHashMap } from '../../../../src/lib/java/collections/JavaHashMap.js';
import { EnglishNumberInWordFilter } from '../../../../src/lang/en/rules/EnglishNumberInWordFilter.js';
import { newLt } from '../../../support/ruleTestSupport.js';

// Java: org.languagetool.rules.FakeRule
class FakeRule extends Rule {
  getId() { return 'FAKE_ID'; }

  getDescription() { return 'A fake rule for tests only.'; }

  match() { return RuleMatch.EMPTY_ARRAY; }
}

describe('EnglishNumberInWordFilterTest', () => {
  // Java: EnglishNumberInWordFilterTest#runFilter
  const runFilter = (input, arg, newRepl, patternTokenPos, fromPos, toPos, lt) => {
    const filter = new EnglishNumberInWordFilter();
    const sentence = lt.getAnalyzedSentence(input);
    const match = new RuleMatch(new FakeRule(), sentence, fromPos, toPos, 'fake msg');
    const args = new JavaHashMap();
    args.put('word', arg);
    const tokenPositions = null;
    const matchTmp = filter.acceptRuleMatch(match, args, patternTokenPos, sentence.getTokensWithoutWhitespace(), tokenPositions);
    expect(matchTmp).not.toBeNull();
    expect(matchTmp.getSuggestedReplacements()).toContain(newRepl);
  };

  // Java: EnglishNumberInWordFilterTest#testFilter
  it('testFilter', () => {
    const lt = newLt(Languages.getLanguageForShortCode('en'));
    runFilter('Go0d morning, Potsdam.', 'Go0d', 'Good', 2, 0, 4, lt);
  });
});
