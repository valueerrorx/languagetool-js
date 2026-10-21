// Ported from GermanCompoundRuleTest (de)
import { describe, it } from 'vitest';
import { Languages } from '../../../../src/core/Languages.js';
import { GermanCompoundRule } from '../../../../src/lang/de/rules/GermanCompoundRule.js';
import { SwissCompoundRule } from '../../../../src/lang/de/rules/SwissCompoundRule.js';
import { AbstractCompoundRuleTest } from '../../../support/AbstractCompoundRuleTest.js';
import { messagesFor, newLt } from '../../../support/ruleTestSupport.js';

describe('GermanCompoundRuleTest', () => {
  const t = new AbstractCompoundRuleTest();

  // Java: GermanCompoundRuleTest#runTests
  function runTests() {
    // correct sentences:
    t.check(0, "Eine tolle CD-ROM");
    t.check(0, "Eine tolle CD-ROM.");
    t.check(0, "Ein toller CD-ROM-Test.");
    t.check(0, "Systemadministrator");
    t.check(0, "Eine Million Dollar");
    t.check(0, "Das System des Administrators");
    t.check(0, "Nur im Stand-by-Betrieb");
    t.check(0, "Start, Ziel, Sieg");
    t.check(0, "Roll-on-roll-off-Schiff");
    t.check(0, "Halswirbelsäule");
    t.check(0, "Castrop-Rauxel");
    t.check(0, "2-Zimmer-Wohnung");
    t.check(0, "3-Zimmer-Wohnung");
    t.check(0, "Hals-Wirbel-Säule");   // doubtful whether this is correct...
    t.check(0, "Die Bürger konnten an die 900 Meter Kabel in Eigenregie verlegen.");
    t.check(0, "Die Bürger konnten ca. 900 Meter Kabel in Eigenregie verlegen.");
    t.check(0, "Aus dem Tank zapften die Diebe rund 250 Liter Diesel ab.");
    t.check(0, "Aus dem Tank zapften die Diebe 250 Liter Diesel ab.");
    t.check(0, "Lohnt sich die Werbung vom ausgegebenen Euro aus gedacht?");
    // incorrect sentences:
    t.check(1, "System Administrator", "Systemadministrator");
    t.check(1, "System-Administrator");
    t.check(1, "bla bla bla bla bla System Administrator bla bla bla bla bla");
    t.check(1, "System Administrator blubb");
    t.check(1, "Der System Administrator");
    t.check(1, "Der dumme System Administrator");
    t.check(1, "CD ROM", "CD-ROM");
    t.check(1, "Nur im Stand by Betrieb", "Stand-by-Betrieb");
    t.check(1, "Ein echter Start Ziel Sieg", "Start-Ziel-Sieg");
    t.check(1, "Ein echter Start Ziel Sieg.");
    t.check(1, "Ein Start Ziel Sieg");
    t.check(1, "Start Ziel Sieg");
    t.check(1, "Start Ziel Sieg!");
    t.check(1, "Doppler Effekt");
    t.check(1, "3 Tage Woche");
    t.check(1, "4 Tage Woche");
    t.check(1, "5 Tage Woche");
    t.check(1, "100 m Lauf");
    t.check(1, "200 m Lauf");
    t.check(1, "800 m Lauf");
    t.check(1, "1000 m Lauf");
    t.check(1, "2 Zimmer Wohnung");
    t.check(1, "3 Zimmer-Wohnung");
    t.check(1, "4-Zimmer Wohnung");
    t.check(1, "5 Zimmer Wohnung");
    t.check(1, "6 Zimmer Wohnung");
    t.check(1, "1000 Jahr Feier");
    t.check(1, "1000-Jahr Feier");
    t.check(1, "1000 Jahr-Feier");
    t.check(2, "Der dumme System Administrator legt die CD ROM");
    t.check(2, "Der dumme System Administrator legt die CD ROM.");
    t.check(2, "Der dumme System Administrator legt die CD ROM ein blah");
    t.check(2, "System Administrator CD ROM");
// t.check(2, "Hals Wirbel Säule");
    t.check(1, "Und herum zu knobeln können.", "herumzuknobeln");
    t.check(1, "Castrop Rauxel", "Castrop-Rauxel");
    // suggestion not on dictionary
    // t.check(1, "Roll on roll off Schiff", "Roll-on-roll-off-Schiff");
    t.check(1, "Spin off");
    // no hyphen suggestion for some words:
    t.check(1, "Das ist Haar sträubend", "Haarsträubend");
    // Only hyphen suggestion for some words:
    // suggestion not on dictionary
    // t.check(1, "Reality TV", "Reality-TV");
    t.check(1, "Spin off", "Spin-off");
    // also accept incorrect upper/lowercase spelling:
// t.check(1, "Spin Off", "Spin-Off");
// t.check(1, "CW Wert", "CW-Wert");
    // also detect an error if only some of the hyphens are missing:
    // t.check(1, "Roll-on-roll-off Schiff", "Roll-on-roll-off-Schiff");
    t.check(1, "Geräte Wahl", "Geräte-Wahl", "Gerätewahl");
    // first part is a single character:
    t.check(0, "x-mal");
    t.check(1, "x mal", "x-mal");
    t.check(0, "y-Achse");
    t.check(1, "y Achse", "y-Achse");
  
    // "Blu-ray-Brenner*"
    t.check(0, "Blu-ray-Brenner");
    t.check(1, "Blu ray Brenner", "Blu-ray-Brenner");
    // "nach-denken+"
    t.check(0, "Ich muss nachdenken");
    t.check(1, "Ich muss  nach denken", "nachdenken");
    // "Back-up$"
    t.check(0, "Backup");
    t.check(0, "Back-up");
    t.check(1, "Back up", "Back-up", "Backup");
    // "Aggregat-Zustand?"
    t.check(0, "Aggregatzustand");
    // t.check(0, "Aggregat-Zustand");
    t.check(1, "Aggregat-Zustand", "Aggregatzustand");
    t.check(1, "Aggregat Zustand", "Aggregatzustand");
    t.check(1, "Billard Kugel", "Billardkugel");

  }

  // Java: GermanCompoundRuleTest#testRule
  it('testRule', () => {
    t.lt = newLt(Languages.getLanguageForShortCode('de-DE')); // Java: new JLanguageTool(de-DE), only used for getAnalyzedSentence
    t.rule = new GermanCompoundRule(messagesFor(Languages.getLanguageForShortCode('de')), Languages.getLanguageForShortCode('de-DE'), null);
    // t.testAllCompounds();
    runTests();
    t.rule = new SwissCompoundRule(messagesFor(Languages.getLanguageForShortCode('de')), Languages.getLanguageForShortCode('de-DE'), null);
    runTests();
  });
});
