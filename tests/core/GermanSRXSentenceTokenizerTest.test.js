// Ported from GermanSRXSentenceTokenizerTest (languagetool-language-modules/de).
import { describe, it, expect } from 'vitest';
import '../../src/lang/register.js';
import { Languages } from '../../src/core/Languages.js';
import { SRXSentenceTokenizer } from '../../src/core/text/tokenizers/SRXSentenceTokenizer.js';

// Java: TestTools#testSplit(String[],SentenceTokenizer)
function testSplit(sentences, tokenizer) {
  expect(tokenizer.tokenize(sentences.join(''))).toEqual(sentences);
}

describe('GermanSRXSentenceTokenizerTest', () => {
  const stokenizer = new SRXSentenceTokenizer(Languages.getLanguageForShortCode('de-DE'));

  // Java: GermanSRXSentenceTokenizerTest#testTokenize()
  it('testTokenize', () => {
    testSplit(["Dies ist ein Satz."], stokenizer);
    testSplit(["Dies ist ein Satz. ", "Noch einer."], stokenizer);
    testSplit(["Dies ist ein Satz.¹ ", "Noch einer."], stokenizer);
    testSplit(["Ein Satz! ", "Noch einer."], stokenizer);
    testSplit(["Ein Satz... ", "Noch einer."], stokenizer);
    testSplit(["Unter http://www.test.de gibt es eine Website."], stokenizer);
    testSplit(["Das Schreiben ist auf den 3.10. datiert."], stokenizer);
    testSplit(["Das Schreiben ist auf den 31.1. datiert."], stokenizer);
    testSplit(["Das Schreiben ist auf den 3.10.2000 datiert."], stokenizer);
    testSplit(["Natürliche Vererbungsprozesse prägten sich erst im 18. und frühen 19. Jahrhundert aus."], stokenizer);
    testSplit(["Das ist ja 1a. ", "Und das auch."], stokenizer);
    testSplit(["Hallo, ich bin’s. ", "Könntest du kommen?"], stokenizer);
    testSplit(["In der 1. Bundesliga kam es zum Eklat."], stokenizer);
    testSplit(["Dies ist, z. B., ein Satz."], stokenizer);
    testSplit(["Da hatte es über 30 °C. ", "Hier kommt der nächste Satz."], stokenizer);
    testSplit(["Das 1. Internationale Filmfestival findet nächste Woche statt."], stokenizer);
    testSplit(["Friedrich I., auch bekannt als Friedrich der Große."], stokenizer);
    testSplit(["Friedrich II., auch bekannt als Friedrich der Große."], stokenizer);
    testSplit(["Friedrich IIXC., auch bekannt als Friedrich der Große."], stokenizer);
    testSplit(["Friedrich II. öfter auch bekannt als Friedrich der Große."], stokenizer);
    testSplit(["Friedrich VII. öfter auch bekannt als Friedrich der Große."], stokenizer);
    testSplit(["Friedrich X. öfter auch bekannt als Friedrich der Zehnte."], stokenizer);
    expect(stokenizer.tokenize("Dies ist ein Satz. \u00A0Noch einer.").length).toBe(2);
    expect(stokenizer.tokenize("Dies ist ein Satz.   \u00A0Noch einer.").length).toBe(2);
    expect(stokenizer.tokenize("Dies ist ein Satz.\u00A0 Noch einer.").length).toBe(2);
    expect(stokenizer.tokenize("Dies ist ein Satz.\u00A0\u00A0\u00A0 Noch einer.").length).toBe(2);
    testSplit(["Ein Satz!\u00A0", "Noch einer."], stokenizer);
    testSplit(["Dies ist, z.\u00A0B., ein Satz."], stokenizer);
    testSplit(["Hier steht was mit mehr Wörtern, weil wir mal sehen wollen, wie denn so die Erkennung der Satzlänge geht, wenn die Sätze doch deutlich länger werden, also wirklich deutlich länger als das normal.\u00A0", "Hier steht etwas anderes."], stokenizer);
    testSplit(["Heute ist der 13.12.2004."], stokenizer);
    testSplit(["Heute ist der 13. Dezember."], stokenizer);
    testSplit(["Heute ist der 1. Januar."], stokenizer);
    testSplit(["Es geht am 24.09. los."], stokenizer);
    testSplit(["Es geht um ca. 17:00 los."], stokenizer);
    testSplit(["Das in Punkt 3.9.1 genannte Verhalten."], stokenizer);
    testSplit(["Diese Periode begann im 13. Jahrhundert und damit bla."], stokenizer);
    testSplit(["Diese Periode begann im 13. oder 14. Jahrhundert und damit bla."], stokenizer);
    testSplit(["Diese Periode datiert auf das 13. bis zum 14. Jahrhundert und damit bla."], stokenizer);
    testSplit(["Das gilt lt. aktuellem Plan."], stokenizer);
    testSplit(["Orangen, Äpfel etc. werden gekauft."], stokenizer);
    testSplit(["Das ist,, also ob es bla."], stokenizer);
    testSplit(["Das ist es.. ", "So geht es weiter."], stokenizer);
    testSplit(["Das hier ist ein(!) Satz."], stokenizer);
    testSplit(["Das hier ist ein(!!) Satz."], stokenizer);
    testSplit(["Das hier ist ein(?) Satz."], stokenizer);
    testSplit(["Das hier ist ein(???) Satz."], stokenizer);
    testSplit(["Das hier ist ein(???) Satz."], stokenizer);
    testSplit(["»Der Papagei ist grün.« ", "Das kam so."], stokenizer);
    testSplit(["»Der Papagei ist grün«, sagte er"], stokenizer);
    testSplit(["Das war es: gar nichts."], stokenizer);
    testSplit(["Das war es: Dies ist ein neuer Satz."], stokenizer);
    testSplit(["schlug er die Richtung nach der K … brücke ein. "], stokenizer);
    testSplit(["sobald ich es von einem Freunde zurückbekomme …« Er wurde verlegen und schwieg."], stokenizer);
    testSplit(["Er kannte eine Unmenge Quellen, aus denen er schöpfen konnte, d. h. natürlich, wo er durch Arbeit sich etwas verdienen konnte."], stokenizer);
    testSplit(["Stimme am lautesten heraustönte …. ", "Sobald er auf der Straße war"], stokenizer);
    testSplit(["»Welche Wohnung?\" ", "»Die, wo wir arbeiten."], stokenizer);
    testSplit(["»Nun also, wie ist's?« fragte Lushin und blickte sie fest an."], stokenizer);
    testSplit(["»Nun also, wie ist es?« fragte Lushin und blickte sie fest an."], stokenizer);
    testSplit(["„Nun also, wie ist es?“ fragte Lushin und blickte sie fest an."], stokenizer);
    testSplit(["»Nun also, wie ist es?« ", "Dann ging er."], stokenizer);
    testSplit(["Dies ist ein Satz mit einer EMail.Addresse@example.com!"], stokenizer);
    testSplit(["Sonderbarerweise sind auch Beispiel!Eins@example.com und Foo?Bar@example.com valide."], stokenizer);
    testSplit(["Er kauft Obst, Gemüse, Brot, Milch, usw. ", "Danach geht er nach Hause."], stokenizer);
    testSplit(["Sie kaufte Bücher, Hefte, Stifte usw., weil sie sich auf das neue Schuljahr vorbereiten wollte."], stokenizer);
    testSplit(["Im Supermarkt gibt es viele Sorten von Käse, Wurst, Brot usw. und alle sind sehr lecker."], stokenizer);
    testSplit(["Im Büro gibt es Computer, Drucker, Telefone etc. ", "Die Mitarbeiter arbeiten den ganzen Tag an verschiedenen Projekten."], stokenizer);
    testSplit(["Die Ergebnisse sind in Tabellen, Grafiken, Diagrammen etc. dargestellt."], stokenizer);
    testSplit(["Master of Law (LL.B.)"], stokenizer);
    testSplit(["Master of Law (LL. B.)"], stokenizer);
  });
});
