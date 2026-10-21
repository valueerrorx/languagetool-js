// Ported from MorfologikFrenchSpellerRuleTest (fr module); real analysis (FrenchHybridDisambiguator, F60)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { Languages } from '../../../../src/core/Languages.js';
import { newLt } from '../../../support/ruleTestSupport.js';

describe('MorfologikFrenchSpellerRuleTest', () => {
  const french = Languages.getLanguageForShortCode('fr');
  const lt = newLt(french);
  const rule = french.getDefaultSpellingRule();

  // Java: MorfologikFrenchSpellerRuleTest#getTopSuggestions(RuleMatch,int)
  const getTopSuggestions = (match, maxSuggestions) => match.getSuggestedReplacements().slice(0, Math.min(maxSuggestions, match.getSuggestedReplacements().length));

  // Java: MorfologikFrenchSpellerRuleTest#assertMatches(String,int)
  const assertMatches = (input, expectedMatches) => {
    const matches = rule.match(lt.getAnalyzedSentence(input));
    expect(matches.length).toBe(expectedMatches);
  };

  // Java: MorfologikFrenchSpellerRuleTest#assertNoMatches(String)
  const assertNoMatches = (input) => assertMatches(input, 0);

  // Java: MorfologikFrenchSpellerRuleTest#assertIterateOverSuggestions(List,String[])
  const assertIterateOverSuggestions = (returnedSuggestions, expectedSuggestions) => {
    for (const expectedSuggestion of expectedSuggestions) {
      expect(returnedSuggestions.includes(expectedSuggestion), `Expected suggestions to contain '${expectedSuggestion}' but got [${returnedSuggestions.join(', ')}]`).toBe(true);
    }
  };

  // Java: MorfologikFrenchSpellerRuleTest#assertSuggestionsContain(String,String...)
  const assertSuggestionsContain = (input, ...expectedSuggestions) => {
    const matches = rule.match(lt.getAnalyzedSentence(input));
    const suggestions = getTopSuggestions(matches[0], 5);
    assertIterateOverSuggestions(suggestions, expectedSuggestions);
  };

  // Java: MorfologikFrenchSpellerRuleTest#assertSingleMatchWithSuggestions(String,String...)
  const assertSingleMatchWithSuggestions = (input, ...expectedSuggestions) => {
    const matches = rule.match(lt.getAnalyzedSentence(input));
    expect(matches.length).toBe(1);
    const suggestions = getTopSuggestions(matches[0], 5);
    assertIterateOverSuggestions(suggestions, expectedSuggestions);
  };

  // Java: MorfologikFrenchSpellerRuleTest#assertSingleMatchZeroSuggestions(String)
  const assertSingleMatchZeroSuggestions = (input) => {
    const matches = rule.match(lt.getAnalyzedSentence(input));
    expect(matches.length).toBe(1);
    const suggestions = matches[0].getSuggestedReplacements();
    expect(suggestions.length).toBe(0);
  };

  // Java: MorfologikFrenchSpellerRuleTest#assertExactSuggestion(String,String...)
  const assertExactSuggestion = (input, ...expected) => {
    const matches = rule.match(lt.getAnalyzedSentence(input));
    let i = 0;
    const suggestions = getTopSuggestions(matches[0], 5);
    for (const s of expected) {
      expect(suggestions[i]).toBe(s);
      i++;
    }
  };

  // Java: MorfologikFrenchSpellerRuleTest#testMorfologikSpeller
  it('testMorfologikSpeller', () => {
    assertSuggestionsContain("darriver", "d'arriver", "arriver");
    assertSuggestionsContain("decodés", "décodés", "décodes", "de codés");
  });

  // Java: MorfologikFrenchSpellerRuleTest#testApostrophes
  it('testApostrophes', () => {
    assertNoMatches("d'1");
    assertNoMatches("l'email");
    assertNoMatches("Aujourd'hui et jusqu'à demain.");
    assertNoMatches("Aujourd’hui et jusqu’à demain.");
    assertNoMatches("L'Allemagne et l'Italie.");
    assertMatches("L’allemagne et l’italie.", 2);
    assertNoMatches("de Harvard ou d'Harvard");
  });

  // Java: MorfologikFrenchSpellerRuleTest#testHyphenated
  it('testHyphenated', () => {
    assertNoMatches("L'Haÿ-les-Roses");
    assertMatches("L'Haÿ les Roses", 1);
    assertNoMatches("Il arrive après-demain.");
  });

  // Java: MorfologikFrenchSpellerRuleTest#testEmptyString
  it('testEmptyString', () => {
    assertNoMatches("");
  });

  // Java: MorfologikFrenchSpellerRuleTest#testUnusualPunctuaion
  it('testUnusualPunctuaion', () => {
    assertNoMatches("À propos de cette chose… ");
  });

  // Java: MorfologikFrenchSpellerRuleTest#testSanity
  it('testSanity', () => {
    assertNoMatches("Un test simple.");
    assertNoMatches("Le cœur, la sœur.");
    assertNoMatches("Ç'avait");
    assertNoMatches("LanguageTool");
    assertMatches("Un test simpple.", 1);
  });

  // Java: MorfologikFrenchSpellerRuleTest#testCorrectWords
  it('testCorrectWords', () => {
    assertNoMatches("Écoute-moi.");
    assertNoMatches("35%");
    assertNoMatches("20$");
    assertNoMatches("4x4");
    assertNoMatches("300 000 yen");
    assertNoMatches("20°C");
    assertNoMatches("même s'il coûte 10.000 yens");
    assertNoMatches("J'ai 38,9 de fièvre.");
    assertNoMatches("Thunderbird 2.0.0.14");
    assertNoMatches("Va-t’en !");
    assertNoMatches("-Je ne suis pas venu par manque de temps.");
    assertNoMatches("12hr-14hr");
    assertNoMatches("Dominique Strauss-Kahn");
    assertNoMatches("L'ONU");
    assertNoMatches("d'1");
    assertNoMatches("L'email");
    assertNoMatches("Et d'Harvard");
    assertNoMatches("déconfinement");
    assertNoMatches("Déconfinement");
    assertNoMatches("Le Déconfinement");
    assertNoMatches("Cesse de t'autoflageller.");
    assertNoMatches("L'iPhone");
    assertNoMatches("Une #sprache @mentioned mywebsite.org ereredd.7z, domaine .com, NH₄OH");
  });

  // Java: MorfologikFrenchSpellerRuleTest#testMultiwords
  it('testMultiwords', () => {
    assertNoMatches("vox populi");
    assertNoMatches("statu quo");
    assertNoMatches("Bugs Bunny");
  });

  // Java: MorfologikFrenchSpellerRuleTest#testMixedCase
  it('testMixedCase', () => {
    assertNoMatches("pH");
    assertSingleMatchWithSuggestions("Mcdonald", "McDonald", "Macdonald");
    assertNoMatches("McDonald's");
    assertNoMatches("McDonald’s");
    assertNoMatches("McDonald");
    assertMatches("thisisanerror", 1);
    assertMatches("thisIsAnError", 1);
    assertMatches("Thisisanerror", 1);
    assertMatches("ThisIsAnError", 1);
    assertExactSuggestion("Wordpress", "WordPress");
    assertExactSuggestion("wordpress", "WordPress");
    assertExactSuggestion("Playstation", "PlayStation");
  });

  // Java: MorfologikFrenchSpellerRuleTest#testIncorrectWords
  it('testIncorrectWords', () => {
    // might be too strict, but work
    assertExactSuggestion("Décu", "Déçu"); // see #912
    assertExactSuggestion("etant", "étant"); // see #1633
    assertExactSuggestion("Cliqez", "Cliquez");
    assertExactSuggestion("cliqez", "cliquez");
    assertExactSuggestion("problemes", "problèmes");
    assertExactSuggestion("la sante", "santé"); // see #2900
    // had to make these laxer as the order changed
    assertSuggestionsContain("damazon", "d'Amazon", "Amazon", "d'Amazone", "Damazan");
    assertSuggestionsContain("coulurs", "couleurs");
    assertSingleMatchWithSuggestions("Den", "De");
    assertSuggestionsContain("offe", "offre", "off", "bouffe", "offs", "bouffé");
    assertSuggestionsContain("camara", "caméra", "camard");
    assertSuggestionsContain("boton", "bâton", "béton", "Boston", "coton", "bouton"); // "bouton" would be better?
    assertSuggestionsContain("La journé", "journée"); // see #2900. Better: journée
    // strict
    assertExactSuggestion("deja", "déjà");
  });

  // Java: MorfologikFrenchSpellerRuleTest#testWordSplitting
  it('testWordSplitting', () => {
    assertSingleMatchWithSuggestions("BretagneItinéraire", "Bretagne Itinéraire");
    assertSingleMatchWithSuggestions("BruxellesCapitale", "Bruxelles Capitale");
    assertExactSuggestion("Parcontre", "Par contre"); // see #1797
    assertExactSuggestion("parcontre", "par contre"); // see #1797
    assertExactSuggestion("Situé àseulement 9 km", "seulement", "à seulement");
  });

  // Java: MorfologikFrenchSpellerRuleTest#testVerbsWithPronouns
  it('testVerbsWithPronouns', () => {
    assertSingleMatchWithSuggestions("ecoute-moi", "Écoute", "Écouté", "Coûte");
    assertSingleMatchWithSuggestions("ecrit-il", "Écrit", "Décrit");
    assertSingleMatchWithSuggestions("Etais-tu", "Étais", "Étés"); //TODO: suggest only verbs
    assertSingleMatchWithSuggestions("etais-tu", "Étais", "Étés"); //TODO: suggest only verbs
    assertSingleMatchWithSuggestions("etiez-vous", "Étiez");
    assertSingleMatchWithSuggestions("étaistu", "étais-tu");
    assertSingleMatchWithSuggestions("etaistu", "étais-tu");
    assertSingleMatchWithSuggestions("voulezvous", "voulez-vous");
    assertSingleMatchWithSuggestions("ecoutemoi", "écoute-moi");
    assertSingleMatchWithSuggestions("mappelle", "m'appelle", "mappe-le");
    assertSingleMatchWithSuggestions("mapelle", "ma pelle", "m'appelle");
    assertSingleMatchWithSuggestions("allonsy", "allons-y");
    assertSingleMatchWithSuggestions("buvezen", "buvez-en");
    assertSingleMatchWithSuggestions("avaisje", "avais-je");
    assertSingleMatchWithSuggestions("depeche-toi", "Dépêche", "Dépêché");
    assertSingleMatchWithSuggestions("depechetoi", "dépêche-toi");
    assertSingleMatchWithSuggestions("sattendre", "s'attendre", "attendre");
    assertSingleMatchWithSuggestions("preferes-tu", "Préférés", "Préfères"); //TODO
    assertSingleMatchWithSuggestions("àllonsy", "allons-y");
  });

  // Java: MorfologikFrenchSpellerRuleTest#testWordEdgeElision
  it('testWordEdgeElision', () => {
    assertSingleMatchWithSuggestions("Lhomme", "L'homme");
    assertSingleMatchWithSuggestions("dhommes", "d'hommes");
    assertSingleMatchWithSuggestions("ladolescence", "l'adolescence", "adolescence");
    assertSingleMatchWithSuggestions("qu’il sagissait", "il s'agissait"); // see #3068 TODO: change order
    assertSingleMatchWithSuggestions("dIsraël", "d'Israël");
    assertSingleMatchWithSuggestions("dOrient", "d'Orient");
  });

  // Java: MorfologikFrenchSpellerRuleTest#testWordEdgeElisionWithTypos
  it('testWordEdgeElisionWithTypos', () => {
    assertSingleMatchWithSuggestions("dOrien", "dorien", "d'Orient");
  });

  // Java: MorfologikFrenchSpellerRuleTest#testWordBoundaryIssues
  it('testWordBoundaryIssues', () => {
    assertSingleMatchWithSuggestions("bonne sante", "bonne santé", "bonnes ante"); // see #3068
  });

  // Java: MorfologikFrenchSpellerRuleTest#testScreaming
  it('testScreaming', () => {
    assertSingleMatchZeroSuggestions("AAAAAAAAAAAH");
  });

  // Java: MorfologikFrenchSpellerRuleTest#testTokenisation
  it('testTokenisation', () => {
    // digits and letters must be split
    assertSingleMatchWithSuggestions("123heures", "123 heures");
    // emoji and letters are tokenised separately, so this is not a spelling mistake
    assertNoMatches("⏰heures");
    // typo in "heuras", so we get "heures" as a suggestion, but the emoji is not touched
    assertSingleMatchWithSuggestions("⏰heuras", "heures");
    // "©" is a word character, so this is a single token, which triggers the speller
    assertSingleMatchWithSuggestions("©heures", "© heures");
    // these symbols are *not* word characters, so we get two tokens, and "heures" is fine
    assertNoMatches("►heures");
    assertNoMatches("◦heures");
  });

  // Java: MorfologikFrenchSpellerRuleTest#testNoPrefixSplit
  it('testNoPrefixSplit', () => {
    assertSingleMatchZeroSuggestions("macrodiscipline");
  });

  // Java: MorfologikFrenchSpellerRuleTest#testDigits
  it('testDigits', () => {
    assertSingleMatchWithSuggestions("windows1", "Windows");
    assertSingleMatchWithSuggestions("windows95", "Windows 95");
    assertSingleMatchWithSuggestions("à1930", "à 1930");
  });

  // Java: MorfologikFrenchSpellerRuleTest#testToImprove
  it('testToImprove', () => {
    assertSuggestionsContain("language", "l'engage", "l'aiguage", "l'engagé", "langage", "langages");
    assertSuggestionsContain("saperçoit", "sa perçoit", "s'aperçoit");
    assertSuggestionsContain("saperçu", "sa perçu", "aperçu");
  });

  // Java: MorfologikFrenchSpellerRuleTest#testMultitokens
  it('testMultitokens', () => {
    assertNoMatches("MERCEDES-BENZ");
    assertNoMatches("Walt Disney Animation Studios");
    assertNoMatches("MÉTÉO-FRANCE");
    assertNoMatches("CLERMONT-FERRAND");
  });
});
