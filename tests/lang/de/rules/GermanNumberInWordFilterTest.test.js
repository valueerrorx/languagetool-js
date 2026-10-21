// Ported from GermanNumberInWordFilterTest
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { Languages } from '../../../../src/core/Languages.js';
import { RuleMatch } from '../../../../src/core/rules/model/RuleMatch.js';
import { JavaHashMap } from '../../../../src/lib/java/collections/JavaHashMap.js';
import { GermanNumberInWordFilter } from '../../../../src/lang/de/rules/GermanNumberInWordFilter.js';
import { newLt } from '../../../support/ruleTestSupport.js';
import { FakeRule } from './_filterTestSupport.js';

describe('GermanNumberInWordFilterTest', () => {
  // Java: GermanNumberInWordFilterTest#runFilter
  const runFilter = (input, arg, newRepl, patternTokenPos, fromPos, toPos, lt) => {
    const filter = new GermanNumberInWordFilter();
    const sentence = lt.getAnalyzedSentence(input);
    const match = new RuleMatch(new FakeRule(), sentence, fromPos, toPos, 'fake msg');
    const args = new JavaHashMap();
    args.put('word', arg);
    const matchTmp = filter.acceptRuleMatch(match, args, patternTokenPos, sentence.getTokensWithoutWhitespace(), null);
    expect(matchTmp).not.toBeNull();
    expect(matchTmp.getSuggestedReplacements()).toContain(newRepl);
  };

  // Java: GermanNumberInWordFilterTest#testFilter
  it('testFilter', () => {
    const lt = newLt(Languages.getLanguageForShortCode('de'));
    runFilter('Schöne Grüß0e aus Potsdam.', 'Grüß0e', 'Grüße', 2, 0, 5, lt);
    runFilter('Schöne Grü0e aus Potsdam.', 'Grü0e', 'Grüße', 2, 0, 5, lt);
    runFilter('Der Aut0r schreibt ein Buch.', 'Aut0r', 'Autor', 2, 0, 5, lt);
  });
});
