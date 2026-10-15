// Ported from AnalyzedSentenceTest (languagetool-core).
import { describe, it, expect } from 'vitest';
import { AnalyzedToken } from '../../src/core/AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../../src/core/AnalyzedTokenReadings.js';
import { AnalyzedSentence } from '../../src/core/AnalyzedSentence.js';

function words() {
  const w = new Array(3);
  w[0] = new AnalyzedTokenReadings(new AnalyzedToken('', 'SENT_START', null));
  w[1] = new AnalyzedTokenReadings(new AnalyzedToken('word', 'POS', 'lemma'));
  w[2] = new AnalyzedTokenReadings(new AnalyzedToken('.', 'INTERP', null));
  w[2].addReading(new AnalyzedToken('.', 'SENT_END', null), '');
  return w;
}

describe('AnalyzedSentenceTest', () => {
  // Java: AnalyzedSentenceTest#testToString
  it('testToString', () => {
    const sentence = new AnalyzedSentence(words());
    expect(sentence.toString()).toBe('<S> word[lemma/POS].[./INTERP,</S>]');
  });

  // Java: AnalyzedSentenceTest#testCopy
  it('testCopy', () => {
    const w = words();
    const sentence = new AnalyzedSentence(w);
    const copySentence = sentence.copy(sentence);
    expect(sentence.equals(copySentence)).toBe(true);
    // now change the first sentence
    w[1].immunize(999);
    expect(sentence.toString()).toBe('<S> word[lemma/POS{!}].[./INTERP,</S>]');
    expect(sentence.equals(copySentence)).toBe(false);
  });
});
