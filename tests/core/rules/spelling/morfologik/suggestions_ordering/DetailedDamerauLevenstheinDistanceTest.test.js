// Ported from DetailedDamerauLevenstheinDistanceTest (languagetool-core); both Java tests are @Ignore
import { describe, it, expect } from 'vitest';
import { DetailedDamerauLevenstheinDistance as D } from '../../../../../../src/core/rules/spelling/morfologik/suggestions_ordering/DetailedDamerauLevenstheinDistance.js';

describe('DetailedDamerauLevenstheinDistanceTest', () => {
  // Java: DetailedDamerauLevenstheinDistanceTest#testDistanceComputation (@Ignore: Needs further debugging)
  it.skip('testDistanceComputation', () => {});

  // Java: DetailedDamerauLevenstheinDistanceTest#testDistanceDetails (@Ignore: WIP)
  it.skip('testDistanceDetails', () => {
    expect(new D.Distance().delete().equals(D.compare('Test', 'Tet'))).toBe(true);
    expect(new D.Distance().insert().equals(D.compare('Test', 'Teste'))).toBe(true);
    expect(new D.Distance().transpose().equals(D.compare('Test', 'Tets'))).toBe(true);
    expect(new D.Distance().replace().equals(D.compare('Test', 'Tast'))).toBe(true);
    expect(new D.Distance().replace().insert().equals(D.compare('Test', 'Taste'))).toBe(true);
    expect(new D.Distance().delete().transpose().equals(D.compare('Test', 'Tts'))).toBe(true);
    expect(new D.Distance().insert().insert().equals(D.compare('Test', 'Teeste'))).toBe(true);
  });
});
