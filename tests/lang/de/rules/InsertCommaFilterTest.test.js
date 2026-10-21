// Ported from InsertCommaFilterTest
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { Languages } from '../../../../src/core/Languages.js';
import { RuleMatch } from '../../../../src/core/rules/model/RuleMatch.js';
import { JavaHashMap } from '../../../../src/lib/java/collections/JavaHashMap.js';
import { abstractCollectionToString } from '../../../../src/lib/java/toString.js';
import { InsertCommaFilter } from '../../../../src/lang/de/rules/InsertCommaFilter.js';
import { newLt } from '../../../support/ruleTestSupport.js';
import { FakeRule } from './_filterTestSupport.js';

describe('InsertCommaFilterTest', () => {
  // Java: InsertCommaFilterTest#runFilter
  const runFilter = (input, patternTokenPos, atrFromPos, atrToPos, fromPos, toPos, origRepl, newRepl, lt) => {
    const args = new JavaHashMap();
    const filter = new InsertCommaFilter();
    const sentence = lt.getAnalyzedSentence(input);
    const match = new RuleMatch(new FakeRule(), sentence, fromPos, toPos, 'fake msg');
    match.setSuggestedReplacement(origRepl);
    const atr = [
      sentence.getTokensWithoutWhitespace()[atrFromPos],
      sentence.getTokensWithoutWhitespace()[atrToPos],
    ];
    const matchTmp = filter.acceptRuleMatch(match, args, patternTokenPos, atr, null);
    expect(abstractCollectionToString(matchTmp.getSuggestedReplacements())).toBe(newRepl);
  };

  // Java: InsertCommaFilterTest#testFilter
  it('testFilter', () => {
    const lt = newLt(Languages.getLanguageForShortCode('de'));
    runFilter('Das Auto, das am Straßenrand steht parkt im Halteverbot.', 7,
      7, 8, 29, 40, 'steht parkt', '[steht, parkt]', lt);
    runFilter('Hoffe bei euch ist alles gut.', 1,
      1, 4, 0, 7, 'Hoffe bei euch ist', '[Hoffe, bei euch ist]', lt);
  });
});
