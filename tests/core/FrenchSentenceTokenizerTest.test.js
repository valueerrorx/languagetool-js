// Ported from FrenchSentenceTokenizerTest (languagetool-language-modules/fr).
import { describe, it, expect } from 'vitest';
import '../../src/lang/register.js';
import { Languages } from '../../src/core/Languages.js';
import { SRXSentenceTokenizer } from '../../src/core/text/tokenizers/SRXSentenceTokenizer.js';
import { French } from '../../src/lang/fr/language/French.js';

// Java: TestTools#testSplit(String[],SentenceTokenizer)
function testSplit(sentences, tokenizer) {
  expect(tokenizer.tokenize(sentences.join(''))).toEqual(sentences);
}

describe('FrenchSentenceTokenizerTest', () => {
  const stokenizer = new SRXSentenceTokenizer(French.getInstance());

  // Java: FrenchSentenceTokenizerTest#testTokenize()
  it('testTokenize', () => {
    testSplit(["Je suis Chris."], stokenizer);
    testSplit(["Je suis Chris."], stokenizer);
    testSplit(["Je suis Chris ?!"], stokenizer);
    testSplit(["Je suis Chris ?"], stokenizer);
    testSplit(["Je suis      Chris ?"], stokenizer);
    testSplit(["Je suis Chris..."], stokenizer);
    testSplit(["Je suis Chris ..."], stokenizer);
    testSplit(["Je suis Chris …"], stokenizer);
    testSplit(["Votre nom: Chris !"], stokenizer);
    testSplit(["Je suis (...) Chris"], stokenizer);
    testSplit(["Je suis Chris (Christopher?)."], stokenizer);
    testSplit(["Je suis Chris (Christopher ?)."], stokenizer);
    testSplit(["Je suis Chris (Christopher ?!)."], stokenizer);
    testSplit(["Je suis E. Macron de France."], stokenizer);
    testSplit(["J'ai beaucoup d'amis (Tom, Lisa, ...)."], stokenizer);
    testSplit(["J'ai beaucoup d'amis (Tom, Lisa, ... )."], stokenizer);
    testSplit(["J'ai beaucoup d'amis (Tom, Lisa, …)."], stokenizer);
    testSplit(["La fréquence des P.A. et le nombre de fibres recrutées."], stokenizer);
    testSplit(["Mrs. America est une mini-série américaine créée par Dahvi Waller, diffusée depuis le 15 avril 2020 sur le site de VOD Hulu et la chaîne FX."], stokenizer);
    testSplit(["Il travaille pour Tiffany & Co. à Paris."], stokenizer);
    testSplit(["J'ai beaucoup d'amis (Tom, Lisa, ...) et je suis populaire !"], stokenizer);
    testSplit(["J'ai beaucoup d'amis (Tom, Lisa !) et je suis populaire !"], stokenizer);
    testSplit(["Ph.D. est un groupe de musique britannique."], stokenizer);
    testSplit(["Google Inc. est une entreprise américaine"], stokenizer);
    testSplit(["Le discours de E. Philippe devrait nous éclairer (un peu, beaucoup, ...?) sur ce qui nous attend."], stokenizer);
    testSplit(["Le discours de E. Philippe devrait nous éclairer (un peu, beaucoup, ...?) sur ce qui nous attend."], stokenizer);
    testSplit(["Op. cit., op. cit."], stokenizer);
    testSplit(["IVe siècle av. J.C. en architecture"], stokenizer);
    testSplit(["IVe\u00a0siècle\u00a0av.\u00a0J.C.\u00a0en\u00a0architecture"], stokenizer);
    testSplit(["IVe siècle av. J.-C. en architecture"], stokenizer);
    testSplit(["sa mort le 19 août 14 apr. J.-C."], stokenizer);
    testSplit(["Je suis Chris.[4] ", "Je suis Chris."], stokenizer);
    testSplit(["Je suis Chris.[4]\u00a0", "Je suis Chris."], stokenizer);
    testSplit(["gaffa.org"], stokenizer);
    testSplit(["Notice BnF de l'éd. Jean Marx."], stokenizer);
    testSplit(["L'Éducation nationale, impr. par ordre de la Convention nationale, Reprod. de l'éd. de : [Paris]."], stokenizer);
    testSplit(["Le discours de E. Philippe devrait nous éclairer (un peu, beaucoup, …?) sur ce qui nous attend."], stokenizer);
    testSplit(["Le discours de E. Philippe devrait nous éclairer (un peu, beaucoup, … ?) sur ce qui nous attend."], stokenizer);
    testSplit(["Comment ça va … ?"], stokenizer);
    testSplit(["« Le film était bien ? » ", "« Il était énorme ! ", "J'ai eu mal au ventre tellement je me suis marré ! »"], stokenizer);
    testSplit(["Si « cf. » désigne l’abréviation de « confer »"], stokenizer);
    testSplit(["« Le film était bien ? » ", "« Il était énorme ! ", "J'ai eu mal au ventre tellement je me suis marré ! »"], stokenizer);
    testSplit(["Si « cf. » désigne l’abréviation de « confer »,"], stokenizer);
    testSplit(["Ça ne sert à rien de me dire « Salut, comment ça va ? » si tu n'as rien d'autre à dire."], stokenizer);
    testSplit(["« Madame est dans sa chambre. » dit le serviteur."], stokenizer);
    testSplit(["« L'État, c'est moi ! » dit le roi."], stokenizer);
    expect(stokenizer.tokenize("Je suis Chris. Comment allez vous ?").length).toBe(2);
    expect(stokenizer.tokenize("Je suis Chris?   Comment allez vous ???").length).toBe(2);
    expect(stokenizer.tokenize("Je suis Chris ! Comment allez vous ???").length).toBe(2);
    expect(stokenizer.tokenize("Je suis Chris ? Comment allez vous ???").length).toBe(2);
    expect(stokenizer.tokenize("Je suis Chris. comment allez vous").length).toBe(2);
    expect(stokenizer.tokenize("Je suis Chris (...). comment allez vous").length).toBe(2);
    expect(stokenizer.tokenize("Je suis Chris (la la la …). comment allez vous").length).toBe(2);
    expect(stokenizer.tokenize("Je suis Chris (CHRISTOPHER!). Comment allez vous").length).toBe(2);
    expect(stokenizer.tokenize("Je suis Chris... Comment allez vous.").length).toBe(2);
    testSplit(["Je ferai ça... un autre jour."], stokenizer);
    testSplit(["Qu'en dites-vous ?, demanda-t-il."], stokenizer);
    testSplit(["Qu'en dites-vous ? demanda-t-il."], stokenizer);
    testSplit(["Qu'en dites-vous ! demanda-t-il."], stokenizer);
    testSplit(["Première phrase.Deuxième phrase."], stokenizer);
  });
});
