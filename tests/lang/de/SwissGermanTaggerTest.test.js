// Ported from SwissGermanTaggerTest (languagetool-language-modules/de)
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { GermanTagger } from '../../../src/lang/de/tagging/GermanTagger.js';
import { SwissGermanTagger } from '../../../src/lang/de/tagging/SwissGermanTagger.js';
import { toSortedString } from '../../support/germanTaggerTools.js';

describe('SwissGermanTaggerTest', () => {
  // Java: SwissGermanTaggerTest#testTagger()
  it('testTagger', () => {
    const swissTagger = new SwissGermanTagger();
    const germanTagger = new GermanTagger();

    const aToken = swissTagger.lookup('gross');
    expect(toSortedString(aToken)).toBe('gross[groß/ADJ:PRD:GRU]');
    expect(aToken.getReadings()[0].getLemma()).toBe('groß');

    const aToken2 = swissTagger.lookup('Anmassung');
    expect(toSortedString(aToken2)).toBe('Anmassung[Anmaßung/SUB:AKK:SIN:FEM, '
      + 'Anmaßung/SUB:DAT:SIN:FEM, '
      + 'Anmaßung/SUB:GEN:SIN:FEM, '
      + 'Anmaßung/SUB:NOM:SIN:FEM]');
    expect(aToken2.getReadings()[0].getLemma()).toBe('Anmaßung');

    expect(swissTagger.lookup('die').equals(germanTagger.lookup('die'))).toBe(true);
    expect(swissTagger.lookup('Auto').equals(germanTagger.lookup('Auto'))).toBe(true);
  });
});
