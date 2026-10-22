// Ported from SpanishTaggerTest (es module)
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { Languages } from '../../../src/core/Languages.js';
import { SRXSentenceTokenizer } from '../../../src/core/text/tokenizers/SRXSentenceTokenizer.js';
import { SpanishTagger } from '../../../src/lang/es/tagging/SpanishTagger.js';
import { SpanishWordTokenizer } from '../../../src/lang/es/tokenizers/SpanishWordTokenizer.js';
import { SpanishHybridDisambiguator } from '../../../src/lang/es/tagging/SpanishHybridDisambiguator.js';
import { myAssert, myAssertDisambiguated, testDictionary } from '../../support/TestTools.js';

describe('SpanishTaggerTest', () => {
  const tagger = SpanishTagger.INSTANCE;
  const tokenizer = new SpanishWordTokenizer();

  // Java: SpanishTaggerTest#testDictionary
  it('testDictionary', () => {
    expect(testDictionary(tagger)).toBe(0);
  });

  // Java: SpanishTaggerTest#testTagger
  it('testTagger', () => {
    myAssert('destacadamente', 'destacadamente/[destacadamente]RG', tokenizer, tagger);
    myAssert('DESTACADAMENTE', 'DESTACADAMENTE/[destacadamente]RG', tokenizer, tagger);
    myAssert('alucinadamente', 'alucinadamente/[alucinadamente]RG', tokenizer, tagger);
    myAssert('disputadamente', 'disputadamente/[disputadamente]RG', tokenizer, tagger);
    myAssert('superincómodas', 'superincómodas/[superincómodo]AQ0FP0', tokenizer, tagger);

    // all-upper case that is common noun & proper noun
    myAssert('RIOJA', 'RIOJA/[Rioja]NPCNG00|RIOJA/[rioja]NCMS000', tokenizer, tagger);

    myAssert('dímelo', 'dímelo/[decir]VMM02S0:PP1CS000:PP3MSA00', tokenizer, tagger);

    myAssert('Soy un hombre muy honrado.',
      'Soy/[ser]VSIP1S0 -- un/[uno]DI0MS0 -- hombre/[hombre]I|hombre/[hombre]NCMS000 -- muy/[muy]RG -- honrado/[honrar]VMP00SM',
      tokenizer, tagger);
    myAssert('Tengo que ir a mi casa.',
      'Tengo/[tener]VMIP1S0 -- que/[que]CS|que/[que]PR0CN000 -- ir/[ir]VMN0000 -- a/[a]NCFS000|a/[a]SPS00 -- mi/[mi]DP1CSS|mi/[mi]NCMS000 -- casa/[casa]NCFS000|casa/[casar]VMIP3S0|casa/[casar]VMM02S0',
      tokenizer, tagger);
    myAssert('blablabla', 'blablabla/[null]null', tokenizer, tagger);
    myAssert('autoeducan', 'autoeducan/[autoeducar]VMIP3P0', tokenizer, tagger);
    myAssert('autorretratarán', 'autorretratarán/[autorretratar]VMIF3P0', tokenizer, tagger);
    myAssert('autorralentizan', 'autorralentizan/[autorralentizar]VMIP3P0', tokenizer, tagger);
    myAssert('autoralentizan', 'autoralentizan/[null]null', tokenizer, tagger);
    myAssert('autoretratarán', 'autoretratarán/[null]null', tokenizer, tagger);
    myAssert('económico-sociales', 'económico-sociales/[económico-social]AQ0CP0', tokenizer, tagger);
    myAssert('jurídico-económicas', 'jurídico-económicas/[jurídico-económico]AQ0FP0', tokenizer, tagger);
  });

  // Java: SpanishTaggerTest#testDisambiguator
  it('testDisambiguator', () => {
    const disambiguator = new SpanishHybridDisambiguator(Languages.getLanguageForShortCode('es'));
    const sentenceTokenizer = new SRXSentenceTokenizer(Languages.getLanguageForShortCode('es'));
    myAssertDisambiguated('Era muy muy ',
      '/[null]SENT_START Era/[erar]VMIP3S0|Era/[erar]VMM02S0|Era/[ser]VSII1S0|Era/[ser]VSII3S0  /[null]null muy/[muy muy]LOC_ADV|muy/[muy]_allow_repeat  /[null]null muy/[muy muy]LOC_ADV  /[null]null',
      tokenizer, sentenceTokenizer, tagger, disambiguator);
  });
});
