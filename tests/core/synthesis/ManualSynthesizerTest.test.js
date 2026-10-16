// Ported from ManualSynthesizerTest (languagetool-core); class pulled forward from F24 for the German tagger
import { describe, it, expect, beforeEach } from 'vitest';
import { ManualSynthesizer } from '../../../src/core/tagging/synthesis/ManualSynthesizer.js';

// Java: String.valueOf(List<String>)
const ls = (l) => (l === null ? 'null' : `[${l.join(', ')}]`);

describe('ManualSynthesizerTest', () => {
  let synthesizer;

  // Java: ManualSynthesizerTest#setUp()
  beforeEach(() => {
    const data = '# some test data\n'
      + 'InflectedForm11\tLemma1\tPOS1\n'
      + 'InflectedForm121\tLemma1\tPOS2\n'
      + 'InflectedForm122\tLemma1\tPOS2\n'
      + 'InflectedForm2\tLemma2\tPOS1\n';
    synthesizer = new ManualSynthesizer(Buffer.from(data, 'utf8'));
  });

  // Java: ManualSynthesizerTest#testLookupNonExisting()
  it('testLookupNonExisting', () => {
    expect(synthesizer.lookup('', '')).toBeNull();
    expect(synthesizer.lookup('', null)).toBeNull();
    expect(synthesizer.lookup(null, '')).toBeNull();
    expect(synthesizer.lookup(null, null)).toBeNull();
    expect(synthesizer.lookup('NONE', 'UNKNOWN')).toBeNull();
  });

  // Java: ManualSynthesizerTest#testInvalidLookup()
  it('testInvalidLookup', () => {
    expect(synthesizer.lookup('NONE', 'POS1')).toBeNull();
    expect(synthesizer.lookup('Lemma1', 'UNKNOWN')).toBeNull();
    expect(synthesizer.lookup('Lemma1', 'POS.')).toBeNull(); // no reg exp
    expect(synthesizer.lookup('Lemma2', 'POS2')).toBeNull();
  });

  // Java: ManualSynthesizerTest#testValidLookup()
  it('testValidLookup', () => {
    expect(ls(synthesizer.lookup('Lemma1', 'POS1'))).toBe('[InflectedForm11]');
    expect(ls(synthesizer.lookup('Lemma1', 'POS2'))).toBe('[InflectedForm121, InflectedForm122]');
    expect(ls(synthesizer.lookup('Lemma2', 'POS1'))).toBe('[InflectedForm2]');
  });

  // Java: ManualSynthesizerTest#testCaseSensitive()
  it('testCaseSensitive', () => {
    // lookup is case sensitive:
    expect(synthesizer.lookup('LEmma1', 'POS1')).toBeNull();
  });
});
