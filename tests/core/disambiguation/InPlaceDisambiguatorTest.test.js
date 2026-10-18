// Extra test (no Java original): JLanguageTool#getAnalyzedSentence with a disambiguator that mutates readings in place (F15 review tests a)
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { AnalyzedToken } from '../../../src/core/AnalyzedToken.js';
import { JLanguageTool } from '../../../src/core/JLanguageTool.js';
import { AbstractDisambiguator } from '../../../src/core/tagging/disambiguation/AbstractDisambiguator.js';
import { DemoLanguage, useXxTestResources } from '../../support/DemoLanguage.js';

// disambiguator that adds a reading to the shared token objects (like DisambiguationPatternRule action ADD)
class MutatingDisambiguator extends AbstractDisambiguator {
  disambiguate(input) {
    for (const t of input.getTokensWithoutWhitespace()) {
      if (!t.isSentenceStart() && !t.isWhitespace()) t.addReading(new AnalyzedToken(t.getToken(), 'MUT', t.getToken()), 'test');
    }
    return input;
  }
}

class MutatingLanguage extends DemoLanguage {
  createDefaultDisambiguator() { return new MutatingDisambiguator(); }
}

describe('InPlaceDisambiguatorTest', () => {
  useXxTestResources();

  it('keeps the pre-disambiguation readings independent and chunks the disambiguated tokens', () => {
    const lang = new MutatingLanguage();
    const seen = [];
    lang.setPostDisambiguationChunker({ addChunkTags(tokens) { seen.push(tokens.map((t) => t.getAnalyzedToken(0).getPOSTag())); } });
    const lt = new JLanguageTool(lang);
    const s = lt.getAnalyzedSentence('Hello world');
    const words = s.getTokensWithoutWhitespace().filter((t) => !t.isSentenceStart());
    expect(words[0].getReadingsLength()).toBe(1); // addReading replaces the untagged (null POS) reading
    expect(words[0].hasPosTag('MUT')).toBe(true);
    const pre = s.getPreDisambigTokens().filter((t) => !t.isSentenceStart() && !t.isWhitespace());
    expect(pre[0].getReadingsLength()).toBe(1);
    expect(pre[0].hasPosTag('MUT')).toBe(false);
    expect(pre[0].getAnalyzedToken(0).getPOSTag()).toBeNull();
    expect(pre[0]).not.toBe(words[0]);
    // the post chunker ran once, on the disambiguated tokens (sentence start, Hello, space, world): MUT is seen
    expect(seen.length).toBe(1);
    expect(seen[0].slice(0, 3)).toEqual(['SENT_START', 'MUT', null]);
    expect(seen[0][3]).toBe(words[1].getAnalyzedToken(0).getPOSTag());
  });
});
