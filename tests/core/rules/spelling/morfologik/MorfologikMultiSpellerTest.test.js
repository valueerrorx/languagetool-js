// Ported from MorfologikMultiSpellerTest (languagetool-core)
import { describe, it, expect } from 'vitest';
import '../../../../../src/lang/register.js';
import { MorfologikMultiSpeller } from '../../../../../src/core/rules/spelling/morfologik/MorfologikMultiSpeller.js';
import { RuntimeException } from '../../../../../src/lib/java/errors.js';
import { useXxTestResources } from '../../../../support/DemoLanguage.js';

describe('MorfologikMultiSpellerTest', () => {
  useXxTestResources();

  // Java: MorfologikMultiSpellerTest#getSpeller()
  const getSpeller = () => new MorfologikMultiSpeller('/xx/spelling/test.dict', ['/xx/spelling/test2.txt'], null, 1);
  const str = (l) => `[${l.join(', ')}]`;

  // Java: MorfologikMultiSpellerTest#testIsMisspelled
  it('testIsMisspelled', () => {
    const speller = getSpeller();
    // from test.dict:
    expect(speller.isMisspelled('wordone')).toBe(false);
    expect(speller.isMisspelled('wordtwo')).toBe(false);
    // from test2.txt:
    expect(speller.isMisspelled('Abc')).toBe(false);
    expect(speller.isMisspelled('wordthree')).toBe(false);
    expect(speller.isMisspelled('wordfour')).toBe(false);
    expect(speller.isMisspelled('üblich')).toBe(false);
    expect(speller.isMisspelled('schön')).toBe(false);
    expect(speller.isMisspelled('Fön')).toBe(false);
    expect(speller.isMisspelled('Fün')).toBe(false);
    expect(speller.isMisspelled('Fän')).toBe(false);
    // from both test.dict and test2.txt:
    expect(speller.isMisspelled('Häuser')).toBe(false);
    // not in any of the files:
    expect(speller.isMisspelled('notthere')).toBe(true);
    expect(speller.isMisspelled('Fun')).toBe(true);
    expect(speller.isMisspelled('Füns')).toBe(true);
    expect(speller.isMisspelled('AFün')).toBe(true);
  });

  // Java: MorfologikMultiSpellerTest#testGetSuggestions
  it('testGetSuggestions', () => {
    const speller = getSpeller();
    expect(str(speller.getSuggestions('wordone'))).toBe('[]'); // a non-misspelled word
    expect(str(speller.getSuggestions('wordones'))).toBe('[wordone]');
    expect(str(speller.getSuggestions('Abd'))).toBe('[Abc]');
    expect(str(speller.getSuggestions('Fxn'))).toBe('[Fän, Fön, Fün]');
    expect(str(speller.getSuggestions('Häusers'))).toBe('[Häuser]');
  });

  // Java: MorfologikMultiSpellerTest#testInvalidFileName
  it('testInvalidFileName', () => {
    expect(() => new MorfologikMultiSpeller('/xx/spelling/test.dict.README', ['/xx/spelling/test2.txt'], null, 1)).toThrow(RuntimeException);
  });

  // Java: MorfologikMultiSpellerTest#testInvalidFile
  it('testInvalidFile', () => {
    expect(() => new MorfologikMultiSpeller('/xx/spelling/no-such-file', ['/xx/spelling/test2.txt'], null, 1)).toThrow(RuntimeException);
  });
});
