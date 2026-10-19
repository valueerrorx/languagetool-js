// Ported from MorfologikSpellerTest (languagetool-core)
import { describe, it, expect } from 'vitest';
import '../../../../../src/lang/register.js';
import { MorfologikSpeller } from '../../../../../src/core/rules/spelling/morfologik/MorfologikSpeller.js';
import { useXxTestResources } from '../../../../support/DemoLanguage.js';

describe('MorfologikSpellerTest', () => {
  useXxTestResources();

  // Java: MorfologikSpellerTest#testIsMisspelled
  it('testIsMisspelled', () => {
    const speller = new MorfologikSpeller('/xx/spelling/test.dict');
    expect(speller.convertsCase()).toBe(true);

    expect(speller.isMisspelled('wordone')).toBe(false);
    expect(speller.isMisspelled('Wordone')).toBe(false);
    expect(speller.isMisspelled('wordtwo')).toBe(false);
    expect(speller.isMisspelled('Wordtwo')).toBe(false);
    expect(speller.isMisspelled('Uppercase')).toBe(false);
    expect(speller.isMisspelled('Häuser')).toBe(false);

    expect(speller.isMisspelled('Hauser')).toBe(true);
    expect(speller.isMisspelled('wordones')).toBe(true);
    expect(speller.isMisspelled('nosuchword')).toBe(true);
  });

  // Java: MorfologikSpellerTest#testGetSuggestions
  it('testGetSuggestions', () => {
    const spellerDist1 = new MorfologikSpeller('/xx/spelling/test.dict', 1);
    const spellerDist2 = new MorfologikSpeller('/xx/spelling/test.dict', 2);
    const str = (l) => `[${l.map(String).join(', ')}]`;

    expect(str(spellerDist1.getSuggestions('wordone'))).toBe('[]');
    expect(str(spellerDist1.getSuggestions('wordonex'))).toBe('[wordone/51]');
    expect(str(spellerDist2.getSuggestions('wordone'))).toBe('[]');
    expect(str(spellerDist2.getSuggestions('wordonex'))).toBe('[wordone/51]');

    expect(str(spellerDist1.getSuggestions('wordonix'))).toBe('[]');
    expect(str(spellerDist2.getSuggestions('wordonix'))).toBe('[wordone/77]');

    expect(str(spellerDist2.getSuggestions('wordoxix'))).toBe('[]');
  });
});
