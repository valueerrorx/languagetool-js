// Ported from ItalianTaggerTest (it module)
import { describe, it, beforeEach } from 'vitest';
import '../../../src/lang/register.js';
import { ItalianTagger } from '../../../src/lang/it/tagging/ItalianTagger.js';
import { WordTokenizer } from '../../../src/core/text/tokenizers/WordTokenizer.js';
import { myAssert, testDictionary } from '../../support/TestTools.js';

describe('ItalianTaggerTest', () => {
  let tagger;
  let tokenizer;
  beforeEach(() => {
    tagger = new ItalianTagger();
    tokenizer = new WordTokenizer();
  });

  // Java: ItalianTaggerTest#testDictionary()
  it('testDictionary', () => {
    testDictionary(tagger);
  });

  // Java: ItalianTaggerTest#testTagger()
  it('testTagger', () => {
    myAssert("Non c'è linguaggio senza inganno.",
      'Non/[non]ADV -- c/[C]NPR -- è/[essere]AUX:ind+pres+3+s|è/[essere]VER:ind+pres+3+s -- linguaggio/[linguaggio]NOUN-M:s -- senza/[senza]CON|senza/[senza]PRE -- inganno/[ingannare]VER:ind+pres+1+s|inganno/[inganno]NOUN-M:s', tokenizer, tagger);
    myAssert("Amo quelli che desiderano l'impossibile.",
      'Amo/[amare]VER:ind+pres+1+s -- quelli/[quelli]PRO-DEMO-M-P|quelli/[quello]DET-DEMO:m+p -- che/[che]CON|che/[che]DET-WH:f+p|che/[che]DET-WH:f+s|che/[che]DET-WH:m+p|che/[che]DET-WH:m+s|che/[che]WH-CHE -- desiderano/[desiderare]VER:ind+pres+3+p -- l/[null]null -- impossibile/[impossibile]ADJ:pos+f+s|impossibile/[impossibile]ADJ:pos+m+s', tokenizer, tagger);
    myAssert('blablabla', 'blablabla/[null]null', tokenizer, tagger);
  });
});
