// Ported from SlovakTaggerTest (sk module)
import { describe, it, beforeEach } from 'vitest';
import '../../../src/lang/register.js';
import { SlovakTagger } from '../../../src/lang/sk/tagging/SlovakTagger.js';
import { WordTokenizer } from '../../../src/core/text/tokenizers/WordTokenizer.js';
import { myAssert, testDictionary } from '../../support/TestTools.js';

describe('SlovakTaggerTest', () => {
  let tagger;
  let tokenizer;
  beforeEach(() => {
    tagger = new SlovakTagger();
    tokenizer = new WordTokenizer();
  });

  // Java: SlovakTaggerTest#testDictionary()
  it('testDictionary', () => {
    testDictionary(tagger);
  });

  // Java: SlovakTaggerTest#testTagger()
  it('testTagger', () => {
    myAssert('Tu nájdete vybrané čísla a obsahy časopisu Kultúra slova.',
      'Tu/[tu]J|Tu/[tu]PD|Tu/[tu]T -- nájdete/[nájsť]VKdpb+ -- vybrané/[vybraný]Gtfp1x|vybrané/[vybraný]Gtfp4x|vybrané/[vybraný]Gtfp5x|vybrané/[vybraný]Gtip1x|vybrané/[vybraný]Gtip4x|vybrané/[vybraný]Gtip5x|vybrané/[vybraný]Gtnp1x|vybrané/[vybraný]Gtnp4x|vybrané/[vybraný]Gtnp5x|vybrané/[vybraný]Gtns1x|vybrané/[vybraný]Gtns4x|vybrané/[vybraný]Gtns5x -- čísla/[číslo]SSnp1|čísla/[číslo]SSnp4|čísla/[číslo]SSnp5|čísla/[číslo]SSns2 -- a/[a]J|a/[a]O|a/[a]Q|a/[a]SUnp1|a/[a]SUnp2|a/[a]SUnp3|a/[a]SUnp4|a/[a]SUnp5|a/[a]SUnp6|a/[a]SUnp7|a/[a]SUns1|a/[a]SUns2|a/[a]SUns3|a/[a]SUns4|a/[a]SUns5|a/[a]SUns6|a/[a]SUns7|a/[a]T|a/[a]W|a/[as]W -- obsahy/[obsah]SSip1|obsahy/[obsah]SSip4|obsahy/[obsah]SSip5 -- časopisu/[časopis]SSis2|časopisu/[časopis]SSis3 -- Kultúra/[kultúra]SSfs1|Kultúra/[kultúra]SSfs5 -- slova/[slovo]SSns2', tokenizer, tagger);
    myAssert('blabla', 'blabla/[null]null', tokenizer, tagger);
  });
});
