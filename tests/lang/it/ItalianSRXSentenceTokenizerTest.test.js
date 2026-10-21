// Ported from ItalianSRXSentenceTokenizerTest (it module)
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { Languages } from '../../../src/core/Languages.js';
import { SRXSentenceTokenizer } from '../../../src/core/text/tokenizers/SRXSentenceTokenizer.js';

describe('ItalianSRXSentenceTokenizerTest', () => {
  const stokenizer = new SRXSentenceTokenizer(Languages.getLanguageForShortCode('it'));

  // Java: TestTools#testSplit(String[],SentenceTokenizer)
  const testSplit = (...sentences) => expect(stokenizer.tokenize(sentences.join(''))).toEqual(sentences);

  // Java: ItalianSRXSentenceTokenizerTest#testTokenize()
  it('testTokenize', () => {
    testSplit('Il Castello Reale di Racconigi è situato a Racconigi, in provincia di Cuneo ma poco distante da Torino. ',
      'Nel corso della sua quasi millenaria storia ha visto numerosi rimaneggiamenti e divenne di proprietà dei Savoia a partire dalla seconda metà del XIV secolo.');
    testSplit('Dott. Bunsen Honeydew'); // abbreviation
    testSplit(
      'Abbiamo isolato N. meningitidis da un campione di sangue. ',
      'La Prov. di Bolzano ha competenze autonome. ',
      'La Reg. d’Abruzzo confina con il Lazio. ',
      'Il cd. regolamento è stato approvato ieri. ',
      'Alcuni frutti, es. mele e pere, sono disponibili. ',
      'Nel XIX sec. si verificarono grandi cambiamenti. ',
      'Lavora nel sett. energetico da anni. ',
      'La diagnosi è compatibile con sdr. metabolica. ',
      '“Basta!” disse Maria. ',
      'Prima del ricovero, tutti gli accertamenti necessari (esami ematici, ECG, TAC, ecc.) sono stati completati secondo protocollo.'
    );
  });
});
