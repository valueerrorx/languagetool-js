// Extra test (no Java original): XmlRuleDisambiguator on the xx rules (CD tagging, filter, cancel callback, load error wrapping)
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { JLanguageTool } from '../../../src/core/JLanguageTool.js';
import { XmlRuleDisambiguator } from '../../../src/core/disambiguation/XmlRuleDisambiguator.js';
import { DemoLanguage, useXxTestResources } from '../../support/DemoLanguage.js';

describe('XmlRuleDisambiguatorTest', () => {
  useXxTestResources();

  it('tags numbers with CD and applies the filter class', () => {
    const lt = new JLanguageTool(new DemoLanguage());
    const s = lt.getAnalyzedSentence('10 dollars');
    expect(s.getTokensWithoutWhitespace()[1].hasPosTag('CD')).toBe(true);
    expect(lt.getAnalyzedSentence('X9 dollars').getTokensWithoutWhitespace()[1].hasPosTag('CD')).toBe(true);
    expect(lt.getAnalyzedSentence('X8 dollars').getTokensWithoutWhitespace()[1].hasPosTag('CD')).toBe(false);
  });

  it('stops when the cancel callback fires', () => {
    const lang = new DemoLanguage();
    const lt = new JLanguageTool(lang);
    const raw = lt.getRawAnalyzedSentence('10 dollars');
    const d = new XmlRuleDisambiguator(lang);
    const out = d.disambiguate(raw, { checkCancelled: () => true });
    expect(out).toBe(raw);
    expect(raw.getTokensWithoutWhitespace()[1].hasPosTag('CD')).toBe(false);
  });

  it('wraps load errors with the file name', () => {
    class Other extends DemoLanguage { getShortCode() { return 'zz'; } }
    expect(() => new XmlRuleDisambiguator(new Other())).toThrow('Problems with loading disambiguation file: zz/disambiguation.xml');
  });
});
