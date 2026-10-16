// Ported from GermanSynthesizerTest (languagetool-language-modules/de); synthesize() follows in F24, only synthesizeForPosTags (F22) is exercised
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { GermanSynthesizer } from '../../../src/lang/de/synthesis/GermanSynthesizer.js';

describe('GermanSynthesizerTest', () => {
  const synthesizer = GermanSynthesizer.INSTANCE;

  // SKIPPED: BaseSynthesizer#synthesize, Soros number spelling and compound forms are ported in F24
  // Java: GermanSynthesizerTest#testSynthesize()
  it.skip('testSynthesize', () => {});
  // Java: GermanSynthesizerTest#testSynthesizeCompounds()
  it.skip('testSynthesizeCompounds', () => {});
  // Java: GermanSynthesizerTest#testMorfologikBug()
  it.skip('testMorfologikBug', () => {});

  // extra: the F22 subset used by GermanTagger#initExpansionInfos (prefix_verb lines in spelling.txt)
  it('synthesizeForPosTags', () => {
    const forms = synthesizer.synthesizeForPosTags('geben', (s) => s.startsWith('VER:'));
    expect(forms).toContain('gab');
    expect(forms).toContain('gegeben');
    expect(forms.every((f) => !f.startsWith('Geb'))).toBe(true); // lowercase lemma -> lowercase forms only
    expect(synthesizer.synthesizeForPosTags('xyzzy', () => true)).toEqual([]);
    expect(() => synthesizer.synthesize()).toThrow(/not ported yet/);
  });
});
