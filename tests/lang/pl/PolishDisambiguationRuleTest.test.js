// Ported from PolishDisambiguationRuleTest (pl module)
import { describe, it, beforeEach } from 'vitest';
import '../../../src/lang/register.js';
import { Polish } from '../../../src/lang/pl/language/Polish.js';
import { PolishTagger } from '../../../src/lang/pl/tagging/PolishTagger.js';
import { WordTokenizer } from '../../../src/core/text/tokenizers/WordTokenizer.js';
import { SRXSentenceTokenizer } from '../../../src/core/text/tokenizers/SRXSentenceTokenizer.js';
import { MultiWordChunker } from '../../../src/core/tagging/disambiguation/MultiWordChunker.js';
import { myAssertDisambiguated } from '../../support/TestTools.js';

describe('PolishDisambiguationRuleTest', () => {
  let tagger;
  let tokenizer;
  let sentenceTokenizer;
  let disambiguator;
  beforeEach(() => {
    tagger = new PolishTagger();
    tokenizer = new WordTokenizer();
    sentenceTokenizer = new SRXSentenceTokenizer(new Polish());
    disambiguator = MultiWordChunker.getInstance('/pl/multiwords.txt');
  });

  // Java: PolishDisambiguationRuleTest#testChunker
  it('testChunker', () => {
    myAssertDisambiguated('To test... dezambiguacji',
      '/[null]SENT_START To/[ten]adj:sg:acc:n1.n2:pos|To/[ten]adj:sg:nom.voc:n1.n2:pos|To/[to]conj|To/[to]qub|To/[to]subst:sg:acc:n2|To/[to]subst:sg:nom:n2  /[null]null test/[test]subst:sg:acc:m3|test/[test]subst:sg:nom:m3 ./[...]<ELLIPSIS> ./[null]null ./[...]</ELLIPSIS>  /[null]null dezambiguacji/[null]null', tokenizer, sentenceTokenizer, tagger, disambiguator);
    myAssertDisambiguated('On, to znaczy premier, jest niezbyt mądry',
      '/[null]SENT_START On/[on]adj:sg:acc:m3:pos|On/[on]adj:sg:nom.voc:m1.m2.m3:pos|On/[on]ppron3:sg:nom:m1.m2.m3:ter:akc.nakc:praep.npraep ,/[null]null  /[null]null to/[ten]adj:sg:acc:n1.n2:pos|to/[ten]adj:sg:nom.voc:n1.n2:pos|to/[to znaczy]<TO_ZNACZY>|to/[to]conj|to/[to]qub|to/[to]subst:sg:acc:n2|to/[to]subst:sg:nom:n2  /[null]null znaczy/[to znaczy]</TO_ZNACZY>|znaczy/[znaczyć]verb:fin:sg:ter:imperf:refl.nonrefl  /[null]null premier/[premier]subst:pl:acc:f|premier/[premier]subst:pl:dat:f|premier/[premier]subst:pl:gen:f|premier/[premier]subst:pl:inst:f|premier/[premier]subst:pl:loc:f|premier/[premier]subst:pl:nom:f|premier/[premier]subst:pl:voc:f|premier/[premier]subst:sg:acc:f|premier/[premier]subst:sg:dat:f|premier/[premier]subst:sg:gen:f|premier/[premier]subst:sg:inst:f|premier/[premier]subst:sg:loc:f|premier/[premier]subst:sg:nom:f|premier/[premier]subst:sg:nom:m1|premier/[premier]subst:sg:voc:f|premier/[premiera]subst:pl:gen:f ,/[null]null  /[null]null jest/[być]verb:fin:sg:ter:imperf:nonrefl  /[null]null niezbyt/[niezbyt]adv  /[null]null mądry/[mądry]adj:sg:acc:m3:pos|mądry/[mądry]adj:sg:nom.voc:m1.m2.m3:pos|mądry/[mądry]subst:sg:nom:m1|mądry/[mądry]subst:sg:voc:m1', tokenizer, sentenceTokenizer, tagger, disambiguator);
    myAssertDisambiguated('Lubię go z uwagi na krótkie włosy.',
      '/[null]SENT_START Lubię/[lubić]verb:fin:sg:pri:imperf:nonrefl|Lubię/[lubić]verb:fin:sg:pri:imperf:refl.nonrefl  /[null]null go/[go]subst:pl:acc:n2|go/[go]subst:pl:dat:n2|go/[go]subst:pl:gen:n2|go/[go]subst:pl:inst:n2|go/[go]subst:pl:loc:n2|go/[go]subst:pl:nom:n2|go/[go]subst:pl:voc:n2|go/[go]subst:sg:acc:n2|go/[go]subst:sg:dat:n2|go/[go]subst:sg:gen:n2|go/[go]subst:sg:inst:n2|go/[go]subst:sg:loc:n2|go/[go]subst:sg:nom:n2|go/[go]subst:sg:voc:n2|go/[on]ppron3:sg:acc:m1.m2.m3:ter:nakc:npraep|go/[on]ppron3:sg:gen:m1.m2.m3:ter:nakc:npraep|go/[on]ppron3:sg:gen:n1.n2:ter:nakc:npraep  /[null]null z/[z uwagi na]<PREP:ACC>|z/[z]prep:acc:nwok|z/[z]prep:gen:nwok|z/[z]prep:inst:nwok  /[null]null uwagi/[uwaga]subst:pl:acc:f|uwagi/[uwaga]subst:pl:nom:f|uwagi/[uwaga]subst:pl:voc:f|uwagi/[uwaga]subst:sg:gen:f  /[null]null na/[na]interj|na/[na]prep:acc|na/[na]prep:loc|na/[z uwagi na]</PREP:ACC>  /[null]null krótkie/[krótki]adj:pl:acc:m2.m3.f.n1.n2.p2.p3:pos|krótkie/[krótki]adj:pl:nom.voc:m2.m3.f.n1.n2.p2.p3:pos|krótkie/[krótki]adj:sg:acc:n1.n2:pos|krótkie/[krótki]adj:sg:nom.voc:n1.n2:pos  /[null]null włosy/[włos]subst:pl:acc:m3|włosy/[włos]subst:pl:nom:m3|włosy/[włos]subst:pl:voc:m3|włosy/[włosy]subst:pl:acc:p3|włosy/[włosy]subst:pl:nom:p3|włosy/[włosy]subst:pl:voc:p3 ./[null]null', tokenizer, sentenceTokenizer, tagger, disambiguator);
    myAssertDisambiguated('Test...',
      '/[null]SENT_START Test/[test]subst:sg:acc:m3|Test/[test]subst:sg:nom:m3 ./[...]<ELLIPSIS> ./[null]null ./[...]</ELLIPSIS>', tokenizer, sentenceTokenizer, tagger, disambiguator);
    myAssertDisambiguated('Test... ',
      '/[null]SENT_START Test/[test]subst:sg:acc:m3|Test/[test]subst:sg:nom:m3 ./[...]<ELLIPSIS> ./[null]null ./[...]</ELLIPSIS>  /[null]null', tokenizer, sentenceTokenizer, tagger, disambiguator);
  });
});
