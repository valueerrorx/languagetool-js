// Ported from EnglishSRXSentenceTokenizerTest (languagetool-language-modules/en).
import { describe, it, expect } from 'vitest';
import '../../src/lang/register.js';
import { Languages } from '../../src/core/Languages.js';
import { SRXSentenceTokenizer } from '../../src/core/text/tokenizers/SRXSentenceTokenizer.js';
import { English } from '../../src/lang/en/language/English.js';

// Java: TestTools#testSplit(String[],SentenceTokenizer)
function testSplit(sentences, tokenizer) {
  expect(tokenizer.tokenize(sentences.join(''))).toEqual(sentences);
}

describe('EnglishSRXSentenceTokenizerTest', () => {
  const stokenizer = new SRXSentenceTokenizer(new English()); // single line break marks a paragraph
  const stokenizer2 = new SRXSentenceTokenizer(new English());
  stokenizer.setSingleLineBreaksMarksParagraph(true);
  stokenizer2.setSingleLineBreaksMarksParagraph(false);

  // Java: EnglishSRXSentenceTokenizerTest#testTokenize()
  it('testTokenize', () => {
    testSplit(["What is the I.S?"], stokenizer);
    testSplit(["Where are the I.S and the M.Z notes? "], stokenizer);
    testSplit(["Here's a"], stokenizer);
    testSplit(["Here's a sentence. ", "And here's one that's not comp"], stokenizer);
    testSplit(["Or did you install it (i.e. MS Word) yourself?"], stokenizer);
    testSplit(["This is a sentence. "], stokenizer);
    testSplit(["This is a sentence. ", "And this is another one."], stokenizer);
    testSplit(["This is it. ", "and this is another sentence."], stokenizer);
    testSplit(["This is a sentence. ", "and this is another sentence."], stokenizer);
    testSplit(["This is a sentence.", "Isn't it?", "Yes, it is."], stokenizer);
    testSplit(["This is e.g. Mr. Smith, who talks slowly...", "But this is another sentence."], stokenizer);
    testSplit(["Chanel no. 5 is blah."], stokenizer);
    testSplit(["Mrs. Jones gave Peter $4.5, to buy Chanel No 5.", "He never came back."], stokenizer);
    testSplit(["On p. 6 there's nothing. ", "Another sentence."], stokenizer);
    testSplit(["Leave me alone!, he yelled. ", "Another sentence."], stokenizer);
    testSplit(["\"Leave me alone!\", he yelled."], stokenizer);
    testSplit(["'Leave me alone!', he yelled. ", "Another sentence."], stokenizer);
    testSplit(["'Leave me alone!,' he yelled. ", "Another sentence."], stokenizer);
    testSplit(["This works on the phrase level, i.e. not on the word level."], stokenizer);
    testSplit(["Let's meet at 5 p.m. in the main street."], stokenizer);
    testSplit(["James comes from the U.K. where he worked as a programmer."], stokenizer);
    testSplit(["Don't split strings like U.S.A. please."], stokenizer);
    testSplit(["Hello ( Hi! ) my name is Chris."], stokenizer);
    testSplit(["Don't split strings like U. S. A. either."], stokenizer);
    testSplit(["Don't split strings like U.S.A either."], stokenizer);
    testSplit(["Don't split... ", "Well you know. ", "Here comes more text."], stokenizer);
    testSplit(["Don't split... well you know. ", "Here comes more text."], stokenizer);
    testSplit(["Don't split . . . well you know. ", "Here comes more text."], stokenizer);
    testSplit(["This is a sentence. ", ".Net is a platform."], stokenizer);
    testSplit(["The \".\" should not be a delimiter in quotes."], stokenizer);
    testSplit(["\"Here he comes!\" she said."], stokenizer);
    testSplit(["\"Here he comes!\", she said."], stokenizer);
    testSplit(["\"Here he comes.\" ", "But this is another sentence."], stokenizer);
    testSplit(["\"Here he comes!\". ", "That's what he said."], stokenizer);
    testSplit(["The sentence ends here. ", "(Another sentence.)"], stokenizer);
    testSplit(["The sentence (...) ends here."], stokenizer);
    testSplit(["The sentence [...] ends here."], stokenizer);
    testSplit(["The sentence ends here (...). ", "Another sentence."], stokenizer);
    testSplit(["He won't. ", "Really."], stokenizer);
    testSplit(["He will not. ", "Really."], stokenizer);
    testSplit(["He won't go. ", "Really."], stokenizer);
    testSplit(["He won't say no.", "Not really."], stokenizer);
    testSplit(["He won't say No.", "Not really."], stokenizer);
    testSplit(["He won't say no. 5 is better. ", "Not really."], stokenizer);
    testSplit(["He won't say No. 5 is better. ", "Not really."], stokenizer);
    testSplit(["They met at 5 p.m. on Thursday."], stokenizer);
    testSplit(["They met at 5 p.m. ", "It was Thursday."], stokenizer);
    testSplit(["This is it: a test."], stokenizer);
    testSplit(["12) Make sure that the lamp is on. ", "12) Make sure that the lamp is on. "], stokenizer);
    testSplit(["He also offers a conversion table (see Cohen, 1988, p. 123). "], stokenizer);
    testSplit(["He won't\n\n", "Really."], stokenizer2);
    testSplit(["He won't\n", "Really."], stokenizer);
    testSplit(["He won't\n\n", "Really."], stokenizer2);
    testSplit(["He won't\nReally."], stokenizer2);
    testSplit(["James is from the Ireland!", "He lives in Spain now."], stokenizer);
    testSplit(["Jones Bros. have built a successful company."], stokenizer);
    testSplit(["It (really!) works."], stokenizer);
    testSplit(["It [really!] works."], stokenizer);
    testSplit(["It works (really!). ", "No doubt."], stokenizer);
    testSplit(["It works [really!]. ", "No doubt."], stokenizer);
    testSplit(["It really(!) works well."], stokenizer);
    testSplit(["It really[!] works well."], stokenizer);
    testSplit(["A test.\u00A0\n", "Another test."], stokenizer);
    testSplit(["A test.\u00A0", "Another test."], stokenizer);
    testSplit(["A test.\n", "Another test."], stokenizer);
    testSplit(["A test. \n", "Another test."], stokenizer);
    testSplit(["A test. \n", "\n", "Another test."], stokenizer);
    testSplit(["\"Here he comes.\"\u00a0", "But this is another sentence."], stokenizer);
    testSplit(["The new Yahoo! product is nice."], stokenizer);
    testSplit(["Yahoo!, what is it?"], stokenizer);
    testSplit(["Yahoo!", "What is it?"], stokenizer);
    testSplit(["This is a sentence.\u0002 ", "And this is another one."], stokenizer);
    testSplit(["Other good editions are in vol. 4."], stokenizer);
    testSplit(["Other good editions are in vol. IX."], stokenizer);
    testSplit(["Other good editions are in vol. I think."], stokenizer);
    testSplit(["Who Shall I Say is Calling & Other Stories S. Deziemianowicz, ed. (2009)"], stokenizer);
    testSplit(["Who Shall I Say is Calling & Other Stories S. Deziemianowicz, ed. ", "And this is another one."], stokenizer);
    testSplit(["This is a sentence written by Ed. ", "And this is another one."], stokenizer);
  });
});
