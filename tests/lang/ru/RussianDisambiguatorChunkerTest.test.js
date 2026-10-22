// Smoke tests of the Russian hybrid disambiguator (multiwords + XML) and chunker wiring
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { Russian } from '../../../src/lang/ru/language/Russian.js';
import { newLt } from '../../support/ruleTestSupport.js';

describe('RussianHybridDisambiguator / RussianChunker', () => {
  it('analyzes a sentence with chunk tags and yo marker', () => {
    const lt = newLt(Russian.getInstance());
    const s = lt.getAnalyzedSentence('Иванов Иван ежик видел.');
    const toks = s.getTokensWithoutWhitespace();
    const tags = (i) => toks[i].getChunkTags().map((t) => t.getChunkTag());
    expect(tags(1)).toContain('B-NP');
    expect(tags(2)).toContain('I-NP');
    expect(tags(3)).toEqual(['MayMissingYO']);
  });

  it('is a lazy singleton', () => {
    const lang = Russian.getInstance();
    expect(lang.getDisambiguator()).toBe(lang.getDisambiguator());
  });
});
