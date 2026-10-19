// Ported from EnglishDisambiguationRuleTest (languagetool-language-modules/en)
import { describe, it, beforeEach } from 'vitest';
import '../../../../src/lang/register.js';
import { English } from '../../../../src/lang/en/language/English.js';
import { EnglishTagger } from '../../../../src/lang/en/tagging/EnglishTagger.js';
import { EnglishHybridDisambiguator } from '../../../../src/lang/en/tagging/EnglishHybridDisambiguator.js';
import { WordTokenizer } from '../../../../src/core/text/tokenizers/WordTokenizer.js';
import { SRXSentenceTokenizer } from '../../../../src/core/text/tokenizers/SRXSentenceTokenizer.js';
import { XmlRuleDisambiguator } from '../../../../src/core/disambiguation/XmlRuleDisambiguator.js';
import { DemoDisambiguator } from '../../../../src/core/tagging/disambiguation/xx/DemoDisambiguator.js';
import { myAssertDisambiguated as myAssert } from '../../../support/TestTools.js';

describe('EnglishDisambiguationRuleTest', () => {
  let tagger;
  let tokenizer;
  let sentenceTokenizer;
  let disambiguator;
  let disamb2;
  let hybridDisam;

  // Java: EnglishDisambiguationRuleTest#setUp()
  beforeEach(() => {
    const lang = new English();
    tagger = new EnglishTagger();
    tokenizer = new WordTokenizer();
    sentenceTokenizer = new SRXSentenceTokenizer(lang);
    disambiguator = new XmlRuleDisambiguator(lang);
    disamb2 = new DemoDisambiguator();
    hybridDisam = new EnglishHybridDisambiguator(lang);
  });

  // Java: EnglishDisambiguationRuleTest#testChunker()
  it('testChunker', () => {
    myAssert('I cannot have it.',
      '/[null]SENT_START I/[I]PRP|I/[I]PRP_S1S  /[null]null cannot/[can]MD  /[null]null have/[have]VB  /[null]null it/[it]PRP|it/[it]PRP_O3SN|it/[it]PRP_S3SN ./[.]PCT',
      tokenizer, sentenceTokenizer, tagger, disambiguator);
    myAssert('I cannot have it.',
      '/[null]SENT_START I/[I]PRP|I/[I]PRP_S1S  /[null]null cannot/[can]MD  /[null]null have/[have]NN|have/[have]VB|have/[have]VBP  /[null]null it/[it]PRP|it/[it]PRP_O3SN|it/[it]PRP_S3SN ./[null]null',
      tokenizer, sentenceTokenizer, tagger, disamb2);
    myAssert('He is to blame.',
      '/[null]SENT_START He/[he]PRP|He/[he]PRP_S3SM  /[null]null is/[be]VBZ  /[null]null to/[to]IN|to/[to]TO  /[null]null blame/[blame]VB ./[.]PCT',
      tokenizer, sentenceTokenizer, tagger, disambiguator);
    myAssert('He is to blame.',
      '/[null]SENT_START He/[he]PRP|He/[he]PRP_S3SM  /[null]null is/[be]VBZ  /[null]null to/[to]IN|to/[to]TO  /[null]null blame/[blame]JJ|blame/[blame]NN:UN|blame/[blame]VB|blame/[blame]VBP ./[null]null',
      tokenizer, sentenceTokenizer, tagger, disamb2);
    myAssert('He is well known.',
      '/[null]SENT_START He/[he]PRP|He/[he]PRP_S3SM  /[null]null is/[be]VBZ  /[null]null well/[well]JJ|well/[well]NN|well/[well]RB|well/[well]UH|well/[well]VB|well/[well]VBP  /[null]null known/[know]VBN|known/[known]NN ./[null]null',
      tokenizer, sentenceTokenizer, tagger, disamb2);
    myAssert('The quid pro quo.',
      '/[null]SENT_START The/[the]DT  /[null]null quid/[quid pro quo]NN  /[null]null pro/[quid pro quo]NN  /[null]null quo/[quid pro quo]NN ./[.]PCT',
      tokenizer, sentenceTokenizer, tagger, hybridDisam);
    myAssert('The QUID PRO QUO.',
      '/[null]SENT_START The/[the]DT  /[null]null QUID/[quid pro quo]NN  /[null]null PRO/[quid pro quo]NN  /[null]null QUO/[quid pro quo]NN ./[.]PCT',
      tokenizer, sentenceTokenizer, tagger, hybridDisam);
  });
});
