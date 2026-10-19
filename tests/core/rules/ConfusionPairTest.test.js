// Ported from ConfusionPairTest (languagetool-core)
import { describe, it, expect } from 'vitest';
import { ConfusionPair } from '../../../src/core/rules/ConfusionPair.js';

describe('ConfusionPairTest', () => {
  // Java: ConfusionPairTest#testGet
  it('testGet', () => {
    const confusionSet = new ConfusionPair('one', 'two', 1n, true);
    expect(confusionSet.getTerms().length).toBe(2);
    expect(`[${confusionSet.getTerms().join(', ')}]`).toContain('one');
    expect(`[${confusionSet.getTerms().join(', ')}]`).toContain('two');
    expect(confusionSet.getUppercaseFirstCharTerms().length).toBe(2);
    expect(`[${confusionSet.getUppercaseFirstCharTerms().join(', ')}]`).toContain('One');
    expect(`[${confusionSet.getUppercaseFirstCharTerms().join(', ')}]`).toContain('Two');
  });

  // Java: ConfusionPairTest#testEquals
  it('testEquals', () => {
    const confusionSet1a = new ConfusionPair('one', 'two', 1n, true);
    const confusionSet1a2 = new ConfusionPair('one', 'two', 1n, true);
    const confusionSet1b = new ConfusionPair('two', 'one', 1n, true);
    const confusionSet3 = new ConfusionPair('Two', 'one', 1n, true);
    const confusionSet4 = new ConfusionPair('Two', 'one', 2n, true);
    expect(confusionSet1a.equals(confusionSet1a2)).toBe(true);
    expect(confusionSet1a.equals(confusionSet1b)).toBe(false);
    expect(confusionSet1a.equals(confusionSet3)).toBe(false);
    expect(confusionSet1b.equals(confusionSet3)).toBe(false);
    expect(confusionSet3.equals(confusionSet4)).toBe(false);
  });
});
