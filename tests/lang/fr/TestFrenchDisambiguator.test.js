// Extra test (Java has none) for the test-only TestFrenchDisambiguator and its resource disambiguator.xml (FR-0221)
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { JLanguageTool } from '../../../src/core/JLanguageTool.js';
import { French } from '../../../src/lang/fr/language/French.js';
import { TestFrenchDisambiguator } from './TestFrenchDisambiguator.js';

describe('TestFrenchDisambiguator', () => {
  // Java: TestFrenchDisambiguator#disambiguate(AnalyzedSentence)
  it('immunizes languageTool', () => {
    const lt = new JLanguageTool(French.getInstance());
    const sentence = lt.getAnalyzedSentence('Utilisez languageTool ici.');
    const result = new TestFrenchDisambiguator().disambiguate(sentence);
    const tokens = result.getTokensWithoutWhitespace().filter((t) => t.getToken() === 'languageTool');
    expect(tokens.length).toBe(1);
    expect(tokens[0].isImmunized()).toBe(true);
    expect(lt.getAnalyzedSentence('Utilisez languageTool ici.').getTokensWithoutWhitespace().filter((t) => t.getToken() === 'languageTool')[0].isImmunized()).toBe(false);
  });
});
