// Ported from EnglishTaggerTest (languagetool-language-modules/en).
import { describe, it, expect, beforeEach } from 'vitest';
import '../../src/lang/register.js';
import { EnglishTagger } from '../../src/lang/en/tagging/EnglishTagger.js';
import { EnglishWordTokenizer } from '../../src/lang/en/tokenizers/EnglishWordTokenizer.js';
import { myAssert, testDictionary } from '../support/TestTools.js';

describe('EnglishTaggerTest', () => {
  let tagger;
  let tokenizer;
  beforeEach(() => {
    tagger = new EnglishTagger();
    tokenizer = new EnglishWordTokenizer();
  });

  // Java: EnglishTaggerTest#testDictionary()
  it('testDictionary', () => {
    testDictionary(tagger);
  });

  // Java: EnglishTaggerTest#testTagger()
  it('testTagger', () => {
    myAssert("This is a big house.", "This/[this]DT|This/[this]PDT -- is/[be]VBZ -- a/[a]DT -- big/[big]JJ|big/[big]RB -- house/[house]NN|house/[house]VB|house/[house]VBP", tokenizer, tagger);
    myAssert("Marketing do a lot of trouble.", "Marketing/[market]VBG|Marketing/[marketing]NN:U -- do/[do]VB|do/[do]VBP -- a/[a]DT -- lot/[lot]NN -- of/[of]IN -- trouble/[trouble]NN:UN|trouble/[trouble]VB|trouble/[trouble]VBP", tokenizer, tagger);
    myAssert("Manager use his laptop every day.", "Manager/[manager]NN -- use/[use]NN:UN|use/[use]VB|use/[use]VBP -- his/[he]PRP$_A3SM|his/[he]PRP$_P3SM|his/[hi]NNS|his/[his]PRP$ -- laptop/[laptop]NN -- every/[every]DT -- day/[day]NN:UN", tokenizer, tagger);
    myAssert("This is a bigger house.", "This/[this]DT|This/[this]PDT -- is/[be]VBZ -- a/[a]DT -- bigger/[big]JJR -- house/[house]NN|house/[house]VB|house/[house]VBP", tokenizer, tagger);
    myAssert("He doesn't believe me.", "He/[he]PRP|He/[he]PRP_S3SM -- does/[do]VBZ|does/[doe]NNS -- n't/[not]RB -- believe/[believe]VB|believe/[believe]VBP -- me/[I]PRP|me/[I]PRP_O1S", tokenizer, tagger);
    myAssert("It has become difficult.", "It/[it]PRP|It/[it]PRP_O3SN|It/[it]PRP_S3SN -- has/[have]VBZ -- become/[become]VB|become/[become]VBN|become/[become]VBP -- difficult/[difficult]JJ", tokenizer, tagger);
    myAssert("You haven't.", "You/[you]PRP|You/[you]PRP_O2P|You/[you]PRP_O2S|You/[you]PRP_S2P|You/[you]PRP_S2S -- have/[have]NN|have/[have]VB|have/[have]VBP -- n't/[not]RB", tokenizer, tagger);
    myAssert("You haven’t.", "You/[you]PRP|You/[you]PRP_O2P|You/[you]PRP_O2S|You/[you]PRP_S2P|You/[you]PRP_S2S -- have/[have]NN|have/[have]VB|have/[have]VBP -- n't/[not]RB", tokenizer, tagger);
  });

  // Java: EnglishTaggerTest#testLemma()
  it('testLemma', () => {
    const aToken = EnglishTagger.INSTANCE.tag(['Trump', 'works']);
    expect(aToken.length).toBe(2);
    expect(aToken[0].getReadings().length).toBe(4);
    expect(aToken[1].getReadings().length).toBe(2);
    expect(aToken[0].getReadings()[0].getLemma()).toBe('Trump');
    expect(aToken[0].getReadings()[1].getLemma()).toBe('trump');
    expect(aToken[0].getReadings()[2].getLemma()).toBe('trump');
    expect(aToken[0].getReadings()[3].getLemma()).toBe('trump');
    expect(aToken[1].getReadings()[0].getLemma()).toBe('work');
    expect(aToken[1].getReadings()[1].getLemma()).toBe('work');
  });
});
