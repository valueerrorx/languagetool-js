// Ported from SlovakSentenceTokenizerTest (sk module)
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { Languages } from '../../../src/core/Languages.js';
import { SRXSentenceTokenizer } from '../../../src/core/text/tokenizers/SRXSentenceTokenizer.js';

// Java: TestTools#testSplit(String[],SentenceTokenizer)
function tsplit(sentences, tokenizer) {
  expect(tokenizer.tokenize(sentences.join(''))).toEqual(sentences);
}

describe('SlovakSentenceTokenizerTest', () => {
  const lang = Languages.getLanguageForShortCode('sk');
  const stokenizer = new SRXSentenceTokenizer(lang); // accept \n as paragraph
  const stokenizer2 = new SRXSentenceTokenizer(lang); // accept only \n\n as paragraph
  stokenizer.setSingleLineBreaksMarksParagraph(true);
  stokenizer2.setSingleLineBreaksMarksParagraph(false);

  const testSplit = (sentences, tok = stokenizer2) => tsplit(sentences, tok);

  // Java: SlovakSentenceTokenizerTest#testTokenize()
  it('testTokenize', () => {
    testSplit(["This is a sentence. "]);
    testSplit(["Dies ist ein Satz."]);
    testSplit(["Dies ist ein Satz. ", "Noch einer."]);
    testSplit(["Ein Satz! ", "Noch einer."]);
    testSplit(["Ein Satz... ", "Noch einer."]);
    testSplit(["Unter http://www.test.de gibt es eine Website."]);
    testSplit(["Das ist,, also ob es bla."]);
    testSplit(["Das ist es.. ", "So geht es weiter."]);
    testSplit(["Das hier ist ein(!) Satz."]);
    testSplit(["Das hier ist ein(!!) Satz."]);
    testSplit(["Das hier ist ein(?) Satz."]);
    testSplit(["Das hier ist ein(???) Satz."]);
    testSplit(["Das hier ist ein(???) Satz."]);
    testSplit(["Das war es: gar nichts."]);
    testSplit(["Das war es: Dies ist ein neuer Satz."]);
    testSplit(["Here's a"]);
    testSplit(["Here's a sentence. ", "And here's one that's not comp"]);
    testSplit(["„Prezydent jest niemądry”. ", "Tak wyszło."]);
    testSplit(["„Prezydent jest niemądry”, powiedział premier"]);
    testSplit(["Das Schreiben ist auf den 3.10. datiert."]);
    testSplit(["Das Schreiben ist auf den 31.1. datiert."]);
    testSplit(["Das Schreiben ist auf den 3.10.2000 datiert."]);
    testSplit(["Toto 2. vydanie bolo rozobrané za 1,5 roka."]);
    testSplit(["Festival Bažant Pohoda slávi svoje 10. výročie."]);
    testSplit(["Dlho odkladané parlamentné voľby v Angole sa uskutočnia 5. septembra."]);
    testSplit(["Das in Punkt 3.9.1 genannte Verhalten."]);
    testSplit(["Aké sú skutočné príčiny tzv. transformačných príznakov?"]);
    testSplit(["Aké príplatky zamestnancovi (napr. za nadčas) stanovuje Zákonník práce?"]);
    testSplit(["Počas neprítomnosti zastupuje MUDr. Marianna Krupšová."]);
    testSplit(["Staroveký Egypt vznikol okolo r. 3150 p.n.l. (tzn. 3150 pred Kr.). ", "A zanikol v r. 31 pr. Kr."]);
    testSplit(["Temperatura wody w systemie wynosi 30°C.", "W skład obiegu otwartego wchodzi zbiornik i armatura."]);
    testSplit(["Zabudowano kolumny o długości 45 m. ", "Woda z ujęcia jest dostarczana do zakładu."]);
    testSplit(["Najlepszym polskim reżyserem był St. Różewicz. ", "Chodzi o brata wielkiego poety."]);
    testSplit(["Nore M. hrozí za podvod 10 až 15 rokov."]);
    testSplit(["To jest zmienna A.", "Zaś to jest zmienna B."]);
    testSplit(["Mam w magazynie dwie skrzynie LMD20. ", "Jestem żołnierzem i wiem, jak można ich użyć"]);
    testSplit(["Rytmem tej wiecznie przemijającej światowej egzystencji […] rytmem mesjańskiej natury jest szczęście."]);
    testSplit(["This is a sentence. "]);
    testSplit(["This is a sentence. ", "And this is another one."]);
    testSplit(["This is a sentence.", "Isn't it?", "Yes, it is."]);
    testSplit(["Don't split strings like U. S. A. either."]);
    testSplit(["Don't split strings like U.S.A. either."]);
    testSplit(["Don't split... ", "Well you know. ", "Here comes more text."]);
    testSplit(["Don't split... well you know. ", "Here comes more text."]);
    testSplit(["The \".\" should not be a delimiter in quotes."]);
    testSplit(["\"Here he comes!\" she said."]);
    testSplit(["\"Here he comes!\", she said."]);
    testSplit(["\"Here he comes.\" ", "But this is another sentence."]);
    testSplit(["\"Here he comes!\". ", "That's what he said."]);
    testSplit(["The sentence ends here. ", "(Another sentence.)"]);
    testSplit(["He won't go. ", "Really."]);
    testSplit(["He won't say no.", "Not really."]);
    testSplit(["This is it: a test."]);
    testSplit([ "He won't\n\n", "Really." ], stokenizer2);
    testSplit([ "He won't\n", "Really." ], stokenizer);
    testSplit([ "He won't\n\n", "Really." ], stokenizer2);
    testSplit([ "He won't\nReally." ], stokenizer2);
    testSplit(["James is from the Ireland!", "He lives in Spain now."]);
  });
});
