// Ported from RuleFilterEvaluatorTest (languagetool-core)
import { describe, it, expect } from 'vitest';
import { AnalyzedToken } from '../../../src/core/AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../../../src/core/AnalyzedTokenReadings.js';
import { RuleFilterEvaluator } from '../../../src/core/patterns/RuleFilterEvaluator.js';
import { RuntimeException } from '../../../src/lib/java/errors.js';

const entries = (m) => m.entrySet().map((e) => `${e[0]}=${e[1]}`).sort();

describe('RuleFilterEvaluatorTest', () => {
  const evaluator = new RuleFilterEvaluator(null);

  // Java: RuleFilterEvaluatorTest#testGetResolvedArguments
  it('testGetResolvedArguments', () => {
    const readingsList = [
      new AnalyzedTokenReadings(new AnalyzedToken('fake1', 'pos', null), 0),
      new AnalyzedTokenReadings(new AnalyzedToken('fake2', 'pos', null), 0),
    ];
    const map = evaluator.getResolvedArguments('year:\\1 month:\\2', readingsList, -1, [1, 1]);
    expect(map.get('year')).toBe('fake1');
    expect(map.get('month')).toBe('fake2');
    expect(map.size()).toBe(2);
  });

  // Java: RuleFilterEvaluatorTest#testGetResolvedArgumentsWithColon
  it('testGetResolvedArgumentsWithColon', () => {
    const readingsList = [new AnalyzedTokenReadings(new AnalyzedToken('fake1', 'pos', null), 0)];
    const map = evaluator.getResolvedArguments('regex:(?:foo[xyz])bar', readingsList, -1, [1, 1]);
    expect(map.get('regex')).toBe('(?:foo[xyz])bar');
    expect(map.size()).toBe(1);
  });

  // Java: RuleFilterEvaluatorTest#testDuplicateKey
  it('testDuplicateKey', () => {
    const readingsList = [
      new AnalyzedTokenReadings(new AnalyzedToken('fake1', 'SENT_START', null), 0),
      new AnalyzedTokenReadings(new AnalyzedToken('fake1', 'pos', null), 0),
      new AnalyzedTokenReadings(new AnalyzedToken('fake2', 'pos', null), 0),
    ];
    expect(() => evaluator.getResolvedArguments('year:\\1 year:\\2', readingsList, -1, [1, 2])).toThrow(RuntimeException);
  });

  // Java: RuleFilterEvaluatorTest#testNoBackReference
  it('testNoBackReference', () => {
    const args = evaluator.getResolvedArguments('year:2 foo:bar', null, -1, []);
    expect(entries(args)).toEqual(['foo=bar', 'year=2']);
  });

  // Java: RuleFilterEvaluatorTest#testTooLargeBackRef
  it('testTooLargeBackRef', () => {
    expect(() => evaluator.getResolvedArguments('year:\\1 month:\\2 day:\\3 weekDay:\\4', null, -1, [])).toThrow(RuntimeException);
  });
});
