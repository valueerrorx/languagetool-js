// Ported from FrenchTaggerTest (languagetool-language-modules/fr).
import { describe, it, beforeEach } from 'vitest';
import '../../src/lang/register.js';
import { FrenchTagger } from '../../src/lang/fr/tagging/FrenchTagger.js';
import { FrenchWordTokenizer } from '../../src/lang/fr/tokenizers/FrenchWordTokenizer.js';
import { myAssert, testDictionary } from '../support/TestTools.js';

describe('FrenchTaggerTest', () => {
  let tagger;
  let tokenizer;
  beforeEach(() => {
    tagger = FrenchTagger.INSTANCE;
    tokenizer = new FrenchWordTokenizer();
  });

  // Java: FrenchTaggerTest#testDictionary()
  it('testDictionary', () => {
    testDictionary(tagger);
  });

  // Java: FrenchTaggerTest#testTagger()
  it('testTagger', () => {
    myAssert("C'est la vie.", "C'/[ce]R dem m s -- est/[est]N m s|est/[être]V etre ind pres 3 s -- la/[la]N m sp|la/[le]D f s|la/[le]R pers obj 3 f s -- vie/[vie]N f s", tokenizer, tagger);
    myAssert("Je ne parle pas français.", "Je/[je]R pers suj 1 s -- ne/[ne]A -- parle/[parler]V imp pres 2 s|parle/[parler]V ind pres 1 s|parle/[parler]V ind pres 3 s|parle/[parler]V sub pres 1 s|parle/[parler]V sub pres 3 s -- pas/[pas]A|pas/[pas]N m sp -- français/[français]J m sp|français/[français]N m sp", tokenizer, tagger);
    myAssert("blablabla","blablabla/[blablabla]N m s", tokenizer, tagger);
    myAssert("passagère","passagère/[passager]J f s|passagère/[passager]N f s", tokenizer, tagger);
    myAssert("nonexistingword","nonexistingword/[null]null", tokenizer, tagger);
    myAssert("auto-mutile","auto-mutile/[auto-mutiler]V imp pres 2 s|auto-mutile/[auto-mutiler]V ind pres 1 s|auto-mutile/[auto-mutiler]V ind pres 3 s|auto-mutile/[auto-mutiler]V sub pres 1 s|auto-mutile/[auto-mutiler]V sub pres 3 s", tokenizer, tagger);
    myAssert("auto-mutilées","auto-mutilées/[auto-mutiler]V ppa f p", tokenizer, tagger);
    myAssert("micro-plastiques","micro-plastiques/[micro-plastique]J e p|micro-plastiques/[micro-plastique]N e p", tokenizer, tagger);
    myAssert("sous-espace","sous-espace/[sous-espace]N m s", tokenizer, tagger);
    myAssert("sous-corps","sous-corps/[sous-corps]N m sp", tokenizer, tagger);
    myAssert("auto-empoisonnement","auto-empoisonnement/[auto-empoisonnement]N m s", tokenizer, tagger);
    myAssert("auto-équilibrage","auto-équilibrage/[auto-équilibrage]N m s", tokenizer, tagger);
    myAssert("Grand-Chambre","Grand-Chambre/[grand-chambre]N f s", tokenizer, tagger);
    myAssert("d’aujourd’hui","d'/[de]D e sp|d'/[de]P -- aujourd'hui/[aujourd'hui]A", tokenizer, tagger);
    myAssert("d'aujourd’hui","d'/[de]D e sp|d'/[de]P -- aujourd'hui/[aujourd'hui]A", tokenizer, tagger);
    myAssert("d’aujourd'hui","d'/[de]D e sp|d'/[de]P -- aujourd'hui/[aujourd'hui]A", tokenizer, tagger);
    myAssert("Fontaine-l’Évêque","Fontaine-l'Évêque/[Fontaine-l'Évêque]Z e sp", tokenizer, tagger);
    myAssert("Fontaine-l'Évêque","Fontaine-l'Évêque/[Fontaine-l'Évêque]Z e sp", tokenizer, tagger);
    myAssert("entr'ouvrions","entr'ouvrions/[entr'ouvrir]V ind impa 1 p|entr'ouvrions/[entr'ouvrir]V sub pres 1 p", tokenizer, tagger);
    myAssert("entr’ouvrions","entr'ouvrions/[entr'ouvrir]V ind impa 1 p|entr'ouvrions/[entr'ouvrir]V sub pres 1 p", tokenizer, tagger);
    myAssert("Penses-tu","Penses/[penser]V ind pres 2 s|Penses/[penser]V sub pres 2 s -- -tu/[tu]R pers suj 2 s", tokenizer, tagger);
    myAssert("Strauss-Kahn", "Strauss-Kahn/[Strauss-Kahn]Z e sp", tokenizer, tagger);
    myAssert("va-t'en", "va/[aller]V imp pres 2 s|va/[aller]V ind pres 3 s -- -t/[te]R pers obj 2 s -- 'en/[en]R pers obj 3 sp", tokenizer, tagger);
    myAssert("Al-Qaïda","Al-Qaïda/[Al-Qaïda]Z f sp", tokenizer, tagger);
    myAssert("minitélévision","minitélévision/[minitélévision]N f s", tokenizer, tagger);
    myAssert("soeur","soeur/[sœur]N f s", tokenizer, tagger);
    myAssert("oeils-de-boeuf","oeils-de-boeuf/[œils-de-bœuf]N m p", tokenizer, tagger);
    myAssert("Ç'avait","Ç'/[cela]R dem m s -- avait/[avoir]V avoir ind impa 3 s", tokenizer, tagger);
    myAssert("aéro-club","aéro-club/[aéro-club]N m s", tokenizer, tagger);
    myAssert("Aéro-club","Aéro-club/[aéro-club]N m s", tokenizer, tagger);
    myAssert("Aéro-Club","Aéro-Club/[aéro-club]N m s", tokenizer, tagger);
    myAssert("AÉRO-CLUB","AÉRO-CLUB/[aéro-club]N m s", tokenizer, tagger);
    myAssert("ex-Le Pen", "ex/[ex]A|ex/[ex]N e sp -- Le/[le]D m s|Le/[le]R pers obj 3 m s -- " + "Pen/[null]null", tokenizer, tagger);
    myAssert("Saint-Côme-Le Mesnil", "Saint-Côme/[Saint-Côme]Z e sp -- Le/[le]D m s|Le/[le]R pers obj 3 m s" + " -- Mesnil/[null]null", tokenizer, tagger);
    myAssert("Dieppe-Le Tréport", "Dieppe/[Dieppe]Z e sp -- Le/[le]D m s|Le/[le]R " + "pers obj 3 m s -- Tréport/[null]null", tokenizer, tagger);
    myAssert("Caricaturistes-Les fantassins de la démocratie", "Caricaturistes/[caricaturiste]N e p -- " + "Les/[le]D e p|Les/[les]R pers obj 3 e p -- fantassins/[fantassin]N m p -- de/[de]D e sp|de/[de]P -- la/[la]N m" + " sp|la/[le]D f s|la/[le]R pers obj 3 f s -- démocratie/[démocratie]N f s", tokenizer, tagger);
  });
});
