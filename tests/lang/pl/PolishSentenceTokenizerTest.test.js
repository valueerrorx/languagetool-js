// Ported from PolishSentenceTokenizerTest (pl module)
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { Languages } from '../../../src/core/Languages.js';
import { SRXSentenceTokenizer } from '../../../src/core/text/tokenizers/SRXSentenceTokenizer.js';

describe('PolishSentenceTokenizerTest', () => {
  const stokenizer = new SRXSentenceTokenizer(Languages.getLanguageForShortCode('pl'));

  // Java: TestTools#testSplit(String[],SentenceTokenizer)
  const testSplit = (...sentences) => expect(stokenizer.tokenize(sentences.join(''))).toEqual(sentences);

  // Java: PolishSentenceTokenizerTest#testTokenize
  it('testTokenize', () => {
    testSplit('To się wydarzyło 3.10.2000 i mam na to dowody.');
    testSplit('To było 13.12 - nikt nie zapomni tego przemówienia.');
    testSplit('Heute ist der 13.12.2004.');
    testSplit('To jest np. ten debil spod jedynki.');
    testSplit('To jest 1. wydanie.');
    testSplit('Dziś jest 13. rocznica powstania wąchockiego.');
    testSplit('Das in Punkt 3.9.1 genannte Verhalten.');
    testSplit('To jest tzw. premier.');
    testSplit('Jarek kupił sobie kurteczkę, tj. strój Marka.');
    testSplit('„Prezydent jest niemądry”. ', 'Tak wyszło.');
    testSplit('„Prezydent jest niemądry”, powiedział premier');
    testSplit('Temperatura wody w systemie wynosi 30°C.', 'W skład obiegu otwartego wchodzi zbiornik i armatura.');
    testSplit('Zabudowano kolumny o długości 45 m. ', 'Woda z ujęcia jest dostarczana do zakładu.');
    testSplit('Najlepszym polskim reżyserem był St. Różewicz. ', 'Chodzi o brata wielkiego poety.');
    testSplit('Ks. Jankowski jest prof. teologii.');
    testSplit('To wydarzyło się w 1939 r.', 'To był burzliwy rok.');
    testSplit('Prezydent jest popierany przez 20 proc. społeczeństwa.');
    testSplit('Moje wystąpienie ma na celu zmobilizowanie zarządu partii do działań, które umożliwią uzyskanie 40 proc.', 'Nie widzę dziś na scenie politycznej formacji, która lepiej by łączyła różne poglądy');
    testSplit('To jest zmienna A.', 'Zaś to jest zmienna B.');
    testSplit('Mam już 20 mln.', 'To powinno mi wystarczyć');
    testSplit('Mam już 20 mln. buraków.');
    testSplit('Rytmem tej wiecznie przemijającej światowej egzystencji […] rytmem mesjańskiej natury jest szczęście.');
    testSplit('W gazecie napisali, że pasy (sic!) pogryzły człowieka.');
    testSplit('Mam w magazynie dwie skrzynie LMD20. ', 'Jestem żołnierzem i wiem, jak można ich użyć');
  });
});
