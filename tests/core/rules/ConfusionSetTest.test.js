// Ported from ConfusionSetTest (languagetool-core)
import { describe, it, expect } from 'vitest';
import { ConfusionSet } from '../../../src/core/rules/ConfusionSet.js';

describe('ConfusionSetTest', () => {
  // Java: ConfusionSetTest#testGet
  it('testGet', () => {
    const confusionSet = new ConfusionSet(1n, 'one', 'two');
    expect(confusionSet.getSet().size()).toBe(2);
    expect(confusionSet.getSet().toString()).toContain('one');
    expect(confusionSet.getSet().toString()).toContain('two');
    expect(confusionSet.getUppercaseFirstCharSet().size()).toBe(2);
    expect(confusionSet.getUppercaseFirstCharSet().toString()).toContain('One');
    expect(confusionSet.getUppercaseFirstCharSet().toString()).toContain('Two');
  });

  // Java: ConfusionSetTest#testEquals
  it('testEquals', () => {
    const confusionSet1a = new ConfusionSet(1n, 'one', 'two');
    const confusionSet1b = new ConfusionSet(1n, 'two', 'one');
    const confusionSet3 = new ConfusionSet(1n, 'Two', 'one');
    const confusionSet4 = new ConfusionSet(2n, 'Two', 'one');
    expect(confusionSet1a.equals(confusionSet1b)).toBe(true);
    expect(confusionSet1a.equals(confusionSet3)).toBe(false);
    expect(confusionSet1b.equals(confusionSet3)).toBe(false);
    expect(confusionSet3.equals(confusionSet4)).toBe(false);
  });
});
