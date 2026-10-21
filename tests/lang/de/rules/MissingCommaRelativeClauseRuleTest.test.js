// Ported from MissingCommaRelativeClauseRuleTest (de)
import { describe, it, expect } from 'vitest';
import { Languages } from '../../../../src/core/Languages.js';
import { MissingCommaRelativeClauseRule } from '../../../../src/lang/de/rules/MissingCommaRelativeClauseRule.js';
import { messagesFor, newLt } from '../../../support/ruleTestSupport.js';

describe('MissingCommaRelativeClauseRuleTest', () => {
  // Java: MissingCommaRelativeClauseRuleTest#assertNoMatch(String,MissingCommaRelativeClauseRule,JLanguageTool)
  function assertNoMatch(input, rule, lt) {
    expect(rule.match(lt.getAnalyzedSentence(input)).length).toBe(0);
  }

  // Java: MissingCommaRelativeClauseRuleTest#assertMatch(String,int,int,MissingCommaRelativeClauseRule,JLanguageTool)
  function assertMatch(input, from, to, rule, lt) {
    const matches = rule.match(lt.getAnalyzedSentence(input));
    expect(matches.length).toBe(1);
    expect(matches[0].getFromPos()).toBe(from);
    expect(matches[0].getToPos()).toBe(to);
  }

  // Java: MissingCommaRelativeClauseRuleTest#testMatch
  it('testMatch', () => {
    const lt = newLt(Languages.getLanguageForShortCode("de-DE")); // Java: new JLanguageTool(de-DE), only used for getAnalyzedSentence
    let rule = new MissingCommaRelativeClauseRule(messagesFor(Languages.getLanguageForShortCode("de")));
    
    assertMatch("Das Auto das am Straßenrand steht parkt im Halteverbot.", 4, 12, rule, lt);
    assertMatch("Das Auto das am Straßenrand steht, parkt im Halteverbot.", 4, 12, rule, lt);
    assertMatch("Das Auto in dem der Mann sitzt, parkt im Halteverbot.", 4, 15, rule, lt);
    assertMatch("Das Auto in dem der Mann sitzt parkt im Halteverbot.", 4, 15, rule, lt);
    assertMatch("Die Frau die vor dem Auto steht hat schwarze Haare.", 4, 12, rule, lt);
    assertMatch("Die Frau die vor dem Auto steht, hat schwarze Haare.", 4, 12, rule, lt);
    assertMatch("Alles was ich habe, ist ein Buch.", 0, 9, rule, lt);
    
    assertNoMatch("Computer machen die Leute dumm.", rule, lt);
    assertNoMatch("Die Unstimmigkeit zwischen den Geschichten der zwei Unfallbeteiligten war groß.", rule, lt);
    assertNoMatch("Ebenso darf keine schwerere Strafe als die zum Zeitpunkt der Begehung der strafbaren Handlung angedrohte Strafe verhängt werden.", rule, lt);
    assertNoMatch("Als dritte Gruppe lassen sich Aminosäuren fassen, die der Organismus anstelle dieser in Proteine einbaut.", rule, lt);
    assertNoMatch("Selbst wenn das alles perfekt verlustfrei wäre, hätte ich nichts gewonnen.", rule, lt);
    assertNoMatch("Die Studenten, deren Urteil am stärksten von dem der Profis abwich, waren sich sicher, einen guten von einem schlechten unterscheiden zu können.", rule, lt);
    assertNoMatch("Die Studenten, deren Urteil am stärksten durch das der Profis beeinflusst wurde, waren sich sicher, einen guten von einem schlechten unterscheiden zu können.", rule, lt);

    rule = new MissingCommaRelativeClauseRule(messagesFor(Languages.getLanguageForShortCode("de")), true);
    
    assertMatch("Das Auto, das am Straßenrand steht parkt im Halteverbot.", 29, 40, rule, lt);
    assertMatch("Das Auto, in dem der Mann sitzt parkt im Halteverbot.", 26, 37, rule, lt);
    assertMatch("Die Frau, die vor dem Auto steht hat schwarze Haare.", 27, 36, rule, lt);
    assertMatch("Alles, was ich habe ist ein Buch.", 15, 23, rule, lt);
    assertMatch("In diesem Prozess sind aber Entwicklungsschritte ja integriert, die wir Psychiater glaube ich auch gut kennen.", 72, 93, rule, lt);
    assertMatch("Alles, was du für die Spieße brauchst sind Tortellini, getrocknete Tomaten, Cherrytomaten und Mozzarellakugeln.", 29, 42, rule, lt);

    assertNoMatch(".... das war eher so das, was alle im Browser deaktiviert hatten, weil man dachte, über Javascript wird irgendwie Schadsoftware eingeschleust.", rule, lt);
    assertNoMatch("Ich habe einige Fehler begangen, die ich vermeiden hätte können sollen.", rule, lt);
    assertNoMatch("Doch die Rolle, die Mohammed bin Salman in Riad spielt, ist zwiespältig.", rule, lt);
    assertNoMatch("Laut Josef Peter Burg gehörte das Haus, aus dem er samt Familie geworfen wurde, Werner und Sigrid Bahlke, während er darin wohnte und darauf aufpasste.", rule, lt);
    assertNoMatch("Darüber hinaus stellt die klassische Metaphysik eine Grundfrage, die sich etwa wie folgt formulieren lässt: Warum ist überhaupt Seiendes und nicht vielmehr Nichts?", rule, lt);
    assertNoMatch("Wenn du alles, was du meinst nicht zu können, von anderen erledigen lässt, wirst du es niemals selbst lernen.", rule, lt);
    assertNoMatch("Er hat einen Zeitraum durchlebt, in dem seine Gedanken verträumt auf den weiten Feldern der Mysterien umherirrten.", rule, lt);
    assertNoMatch("Es ist die Wiederkehr der Panikmache, die der neue Nationalismus mit dem der Sprachreiniger verbindet und die Geschichte der Sprachreinigung zu einem Lehrstück macht.", rule, lt);   
    assertNoMatch("Gesuche können von Institutionen, Organisationen, Vereinen und Gruppierungen gestellt werden, die im Kanton Luzern domiziliert sind.", rule, lt);
    assertNoMatch("Die Klausel kann zudem nur Gleichrang mit Verbindlichkeiten des Schuldners herstellen, die vom Gesetz in der Insolvenz nicht privilegiert sind, so dass die Klausel nichts an der gesetzlich vorgesehenen Rangfolge im Insolvenzverfahren ändert.", rule, lt);
    assertNoMatch("Plan von Maßnahmen, mit denen das Ansteckungsrisiko während des Aufenthalts an einem Ort verringert werden soll", rule, lt);
    assertNoMatch("Aus diesem Grund sind die Wörter nicht direkt übersetzt, stattdessen wird der Zustand oder die Situation beschrieben in der die Wörter benutzt werden.", rule, lt);
    assertNoMatch("Kryptographisch sichere Verfahren sind dann solche, für die es keine bessere Methode zum Brechen der Sicherheit als das Faktorisieren einer großen Zahl gibt, insbesondere kann der private nicht aus dem öffentlichen Schlüssel errechnet werden.", rule, lt);
    assertNoMatch("Wayne Jancik begrenzt seine One-Hit-Wonders in den USA auf die Billboard-Top-40-Pop-Hitparade mit einer „Ruhe-Periode“ von 5 Jahren, innerhalb derer kein weiterer Hit desselben Interpreten in die Top 40 gelangen darf.", rule, lt);
    assertNoMatch("Nach dem Abzug russischer Truppen aus der Region Kiew sind in den ehemals besetzten und umkämpften ukrainischen Gebieten inzwischen Hunderte Leichen von Bewohnern gefunden worden.", rule, lt);
    assertNoMatch("Bei der Installation werden Ihnen Sticker und Aufkleber zur Verfügung gestellt, die Sie anstelle der traditionellen Emojis verwenden können.", rule, lt);
    assertNoMatch("»Alles, was wir dank dieses Projektes sehen werden, wird für uns neu sein«, so der renommierte Bienenforscher.", rule, lt);
  });
});
