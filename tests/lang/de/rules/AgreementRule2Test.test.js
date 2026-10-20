// Ported from AgreementRule2Test (de-DE)
import { describe, it, expect } from 'vitest';
import { Languages } from '../../../../src/core/Languages.js';
import { AgreementRule2 } from '../../../../src/lang/de/rules/AgreementRule2.js';
import { messagesFor, newLt } from '../../../support/ruleTestSupport.js';

describe('AgreementRule2Test', () => {
  const lang = Languages.getLanguageForShortCode('de-DE');
  const lt = newLt(lang);
  const rule = new AgreementRule2(messagesFor(Languages.getLanguageForShortCode('en')), lang);

  // Java: AgreementRule2Test#assertGood(String)
  function assertGood(s) {
    const matches = rule.match(lt.getAnalyzedSentence(s));
    expect(matches.length).toBe(0);
  }

  // Java: AgreementRule2Test#assertBad(String) / assertBad(String,String)
  function assertBad(s, suggestion) {
    const matches = rule.match(lt.getAnalyzedSentence(s));
    expect(matches.length).toBe(1);
    if (suggestion !== undefined) {
      expect(matches[0].getSuggestedReplacements().includes(suggestion), `Got suggestions: [${matches[0].getSuggestedReplacements().join(', ')}], expected: ${suggestion}`).toBe(true);
    }
  }

  // Java: AgreementRule2Test#testRule
  it('testRule', () => {
    assertBad("Kleiner Haus am Waldesrand");
    assertGood("Kleines Haus am Waldesrand");
    assertBad("\"Kleiner Haus am Waldesrand\"");
    assertGood("\"Kleines Haus am Waldesrand\"");
    assertBad("Wirtschaftlich Wachstum kommt ins Stocken");
    assertGood("Wirtschaftliches Wachstum kommt ins Stocken");
    assertGood("Unter Berücksichtigung des Übergangs");

    assertGood("Wirklich Frieden herrscht aber noch nicht");
    assertBad("Deutscher Taschenbuch");
    assertGood("Deutscher Taschenbuch Verlag expandiert");
    
    assertGood("Wohl Anfang 1725 begegnete Bach dem Dichter.");
    assertGood("Weniger Personal wird im ganzen Land gebraucht.");
    assertGood("National Board of Review"); // eng
    assertGood("International Management"); // eng.
    assertGood("Gemeinsam Sportler anfeuern.");
    assertGood("Viel Spaß beim Arbeiten");
    assertGood("Ganz Europa stand vor einer Neuordnung.");
    assertGood("Gesetzlich Versicherte sind davon ausgenommen.");
    assertGood("Ausreichend Bananen essen.");
    assertGood("Nachhaltig Yoga praktizieren");
    assertGood("Überraschend Besuch bekommt er dann von ihr.");
    assertGood("Ruhig Schlafen & Zentral Wohnen");
    assertGood("Voller Mitleid");
    assertGood("Voll Mitleid");
    assertGood("Einzig Fernschüsse brachten Erfolgsaussichten.");
    assertGood("Gelangweilt Dinge sortieren hilft als Ablenkung.");
    assertGood("Ganzjährig Garten pflegen");
    assertGood("Herzlich Willkommen bei unseren günstigen Rezepten!");
    assertGood("10-tägiges Rückgaberecht");
    assertGood("Angeblich Schüsse vor Explosionen gefallen");
    assertGood("Dickes Danke auch an Elena");
    assertGood("Dickes Dankeschön auch an Elena");
    assertGood("Echt Scheiße");
    assertGood("Entsprechende Automaten werden heute nicht mehr gebaut");
    assertGood("Existenziell Bedrohte kriegen einen Taschenrechner");
    assertGood("Flächendeckend Tempo 30");
    assertGood("Frei Klavier spielen lernen");
    assertGood("Ganz Eilige können es schaffen");
    assertGood("Gering Gebildete laufen Gefahr ...");
    assertGood("Ganz Ohr ist man hier");
    assertGood("Gleichzeitig Muskeln aufbauen und Fett verlieren");
    assertGood("Klar Schiff, Erster Offizier!");
    assertGood("Kostenlos Bewegung schnuppern");
    assertGood("Prinzipiell Anrecht auf eine Vertretung");
    assertGood("Regelrecht Modell gestanden haben Michel");
    assertGood("Weitgehend Konsens, auch über ...");
    assertGood("Alarmierte Polizeibeamte nahmen den Mann fest.");
    assertGood("Anderen Brot und Arbeit ermöglichen - das ist ihr Ziel");
    assertGood("Diverse Unwesen, mit denen sich Hellboy beschäftigen muss, ...");
    assertGood("Gut Qualifizierte bekommen Angebote");
    assertGood("Liebe Mai, wie geht es dir?");
    assertGood("Willkommen Simpsons-Fan!");
  });

  // Java: AgreementRule2Test#testSuggestion
  it('testSuggestion', () => {
    //assertBad("Kleine Haus am Waldesrand", "Kleines Haus");
    //assertBad("Kleinen Haus am Waldesrand", "Kleines Haus");
    assertGood("Kleinem Haus am Waldesrand ...");
    assertBad("Kleiner Haus am Waldesrand", "Kleines Haus");
    assertBad("Kleines Häuser am Waldesrand", "Kleine Häuser");
    assertBad("Kleinem Häuser am Waldesrand", "Kleine Häuser");
    //assertBad("Kleinen Häuser am Waldesrand", "Kleine Häuser");
    assertBad("Kleines Tisch reicht auch", "Kleiner Tisch");
    assertGood("Junger Frau geht das Geld aus");
    assertGood("Junge Frau gewinnt im Lotto");
    assertBad("Junges Frau gewinnt im Lotto", "Junge Frau");
    //assertBad("Jungen Frau gewinnt im Lotto", "Junge Frau");
    assertBad("Jungem Frau gewinnt im Lotto", "Junge Frau");
    assertBad("Jung Frau gewinnt im Lotto", "Junge Frau");
    assertBad("Wirtschaftlich Wachstum kommt ins Stocken", "Wirtschaftliches Wachstum");
    assertBad("Wirtschaftlicher Wachstum kommt ins Stocken", "Wirtschaftliches Wachstum");
    //assertBad("Wirtschaftliche Wachstum kommt ins Stocken", "Wirtschaftliches Wachstum");
  });
});
