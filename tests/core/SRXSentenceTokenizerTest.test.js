// Ported from SRXSentenceTokenizerTest (languagetool-standalone) and SimpleSentenceTokenizerTest (languagetool-core); wave-1 languages only (DEV-006).
import { describe, it, expect } from 'vitest';
import '../../src/lang/register.js';
import { Languages } from '../../src/core/Languages.js';
import { SRXSentenceTokenizer } from '../../src/core/text/tokenizers/SRXSentenceTokenizer.js';
import { SimpleSentenceTokenizer } from '../../src/core/text/tokenizers/SimpleSentenceTokenizer.js';
import { AmericanEnglish } from '../../src/lang/en/language/AmericanEnglish.js';
import { French } from '../../src/lang/fr/language/French.js';

describe('SRXSentenceTokenizerTest', () => {
  // Java: SRXSentenceTokenizerTest#testOfficeFootnoteTokenize()
  it('testOfficeFootnoteTokenize', () => {
    let count = 0;
    for (const language of Languages.get()) {
      if (language.getSentenceTokenizer().constructor !== SRXSentenceTokenizer) continue;
      const input = 'A sentence.\u0002 And another one.';
      const tokenizer = new SRXSentenceTokenizer(language);
      expect(`[${tokenizer.tokenize(input).join(', ')}]`).toBe('[A sentence.\u0002 , And another one.]');
      count++;
    }
    expect(count).toBeGreaterThan(0);
  });

  // Java: SRXSentenceTokenizerTest#testDotNetSentence()
  it('testDotNetSentence', () => {
    for (const language of [AmericanEnglish.getInstance(), French.getInstance()]) {
      const tokenizer = new SRXSentenceTokenizer(language);
      expect(tokenizer.tokenize('.Net is a platform. .Net is a platform. The platform is .Net.'))
        .toEqual(['.Net is a platform. ', '.Net is a platform. ', 'The platform is .Net.']);
    }
  });
});

describe('SimpleSentenceTokenizerTest', () => {
  // Java: SimpleSentenceTokenizerTest#testTokenize()
  it('testTokenize', () => {
    const sentences = ['Hi! ', 'This is a test. ', "Here's more. ", 'And even more?? ', 'Yes.'];
    expect(new SimpleSentenceTokenizer().tokenize(sentences.join(''))).toEqual(sentences);
  });
});
