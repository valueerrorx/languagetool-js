// Ported from the de module rule tests (GenericUnpairedBracketsRuleTest, GermanWordRepeatRuleTest, UppercaseSentenceStartRuleTest, GermanCommaWhitespaceRuleTest, WordRepeatRuleTest, GermanUnpairedQuotesRuleTest, SentenceWhitespaceRuleTest); German tagger since F22, skipped tests name their missing step
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GenericUnpairedBracketsRule } from '../../../src/core/rules/GenericUnpairedBracketsRule.js';
import { GenericUnpairedQuotesRule } from '../../../src/core/rules/GenericUnpairedQuotesRule.js';
import { GermanWordRepeatRule } from '../../../src/lang/de/rules/GermanWordRepeatRule.js';
import { GermanCommaWhitespaceRule } from '../../../src/lang/de/rules/GermanCommaWhitespaceRule.js';
import { Example } from '../../../src/core/rules/model/Examples.js';
import { getUrl } from '../../../src/core/Tools.js';
import { Languages } from '../../../src/core/Languages.js';
import { NoopChunker } from '../../../src/core/noop/NoopChunker.js';
import { EN, englishMessages, newLt, useNoopAnalysis } from '../../support/ruleTestSupport.js';

describe('GermanRulesTest', () => {
  // GermanRuleDisambiguator and GermanChunker follow in F51: analysis runs with no-op disambiguation/chunking (as the en rule tests do)
  const germanDe = Languages.getLanguageForShortCode('de');
  useNoopAnalysis(germanDe);
  let savedPostChunker;
  beforeAll(() => {
    savedPostChunker = germanDe.getPostDisambiguationChunker();
    germanDe.setPostDisambiguationChunker(new NoopChunker());
  });
  afterAll(() => germanDe.setPostDisambiguationChunker(savedPostChunker));

  // lt/rule are created per test by the (skipped) bodies; the helpers mirror the Java private methods
  let lt;
  let rule;
  const assertMatches = (input, expectedMatches) => expect(rule.match([lt.getAnalyzedSentence(input)]).length).toBe(expectedMatches);
  const assertGood = (text, tool) => expect((tool ?? lt).check(text).length).toBe(0);
  const assertBad = (text, tool) => expect((tool ?? lt).check(text).length).toBe(1);
  const getBracketsRule = () => { throw new Error('de rule list: F17'); };
  const getQuotesRule = () => { throw new Error('de rule list: F17'); };
  const disableAllRulesExcept = () => { throw new Error('de rule list: F17'); };

  // SKIPPED: German language rules need the full de rule list (F59) and GermanRuleDisambiguator/GermanChunker (F51)
  // Java: GenericUnpairedBracketsRuleTest (de)#testGermanRule
  it.skip('testGermanRule_brackets', () => {
    lt = newLt(Languages.getLanguageForShortCode("de-DE"));
    rule = getBracketsRule(lt);
    // correct sentences:
    assertMatches("(Das sind die Sätze, die sie testen sollen).", 0);
    assertMatches("(Das sind die {Sätze}, die sie testen sollen).", 0);
    assertMatches("(Das sind die [Sätze], die sie testen sollen).", 0);
    assertMatches("(Das sind die Sätze (noch mehr Klammern [schon wieder!]), die sie testen sollen).", 0);
    assertMatches("Das ist ein Satz mit Smiley :-)", 0);
    assertMatches("Das ist auch ein Satz mit Smiley ;-)", 0);
    assertMatches("Das ist ein Satz mit Smiley :)", 0);
    assertMatches("Das ist ein Satz mit Smiley :(", 0);
    assertMatches("Die URL lautet https://de.wikipedia.org/wiki/Schlammersdorf_(Adelsgeschlecht)", 0);
    assertMatches("Die URL lautet https://de.wikipedia.org/wiki/Schlammersdorf_(Adelsgeschlecht).", 0);
    assertMatches("(Die URL lautet https://de.wikipedia.org/wiki/Schlammersdorf_(Adelsgeschlecht))", 0);
    assertMatches("(Die URL lautet https://de.wikipedia.org/wiki/Schlammersdorf)", 0);
    assertMatches("(Die URL lautet https://de.wikipedia.org/wiki/Schlammersdorf oder so)", 0);
    assertMatches("(Die URL lautet: http://www.pariscinema.org/).", 0);
    // these used to have wrong positions, causing "Could not map ... to original position":
    lt.check("Im Kran\u00ADken\u00ADhaus. Auch)");
    lt.check("Ein Kran\u00ADken\u00ADhaus. Auch)");
    lt.check("Das Kran\u00ADken\u00ADhaus. Auch)");
    lt.check("Kran\u00ADken\u00ADhaus. Auch)");
    lt.check("Kran\u00ADken\u00ADhaus. (Auch");
  });

  // SKIPPED: German language rules need the full de rule list (F59) and GermanRuleDisambiguator/GermanChunker (F51)
  // Java: GermanUnpairedQuotesRuleTest#testGermanRule
  it.skip('testGermanRule_quotes', () => {
    lt = newLt(Languages.getLanguageForShortCode("de-DE"));
    rule = getQuotesRule(lt);
    // correct sentences:
    assertMatches("»Das sind die Sätze, die sie testen sollen«.", 0);
    assertMatches("«Das sind die ‹Sätze›, die sie testen sollen».", 0);
    assertMatches("»Das sind die ›Sätze‹, die sie testen sollen«.", 0);
    assertMatches("»Das sind die Sätze ›noch mehr Anführungszeichen‹ ›schon wieder!‹, die sie testen sollen«.", 0);
    assertMatches("»Das sind die Sätze ›noch mehr Anführungszeichen ›hier ein Fehler!‹‹, die sie testen sollen«.", 2);
    assertMatches("„Das sind die Sätze ‚noch mehr Anführungszeichen‘ ‚schon wieder!‘, die sie testen sollen“.", 0);
    assertMatches("„Das sind die Sätze ‚noch mehr Anführungszeichen ‚hier ein Fehler!‘‘, die sie testen sollen“.", 2);
    assertMatches("„Das sind die Sätze, die sie testen sollen.“ „Hier steht ein zweiter Satz.“", 0);
    assertMatches("Drücken Sie auf den \"Jetzt Starten\"-Knopf.", 0);
    assertMatches("Welches ist dein Lieblings-\"Star Wars\"-Charakter?", 0);
    assertMatches("‚So 'n Blödsinn!‘", 0);
    assertMatches("‚’n Blödsinn!‘", 0);
    assertMatches("'So 'n Blödsinn!'", 0);
    assertMatches("''n Blödsinn!'", 0);
    assertMatches("‚Das ist Hans’.‘", 0);
    assertMatches("'Das ist Hans'.'", 0);
    assertMatches("Das Fahrrad hat 26\" Räder.", 0);
    assertMatches("\"Das Fahrrad hat 26\" Räder.\"", 0);
    assertMatches("und steigern » Datenbankperformance steigern » Tipps zur Performance-Verbesserung", 0);
    // incorrect sentences:
    assertMatches("\"Das Fahrrad hat 26\" Räder.\" \"Und hier fehlt das abschließende doppelte Anführungszeichen.", 1);
    assertMatches("Die „Sätze zum Testen.", 1);
    assertMatches("Die «Sätze zum Testen.", 1);
    assertMatches("Die »Sätze zum Testen.", 1);
    // these used to have wrong positions, causing "Could not map ... to original position":
    lt.check("Im Kran\u00ADken\u00ADhaus. Auch)");
    lt.check("Ein Kran\u00ADken\u00ADhaus. Auch)");
    lt.check("Das Kran\u00ADken\u00ADhaus. Auch)");
    lt.check("Kran\u00ADken\u00ADhaus. Auch)");
    lt.check("Kran\u00ADken\u00ADhaus. (Auch");
  });

  // SKIPPED: GermanWordRepeatRule.ANTI_PATTERNS need PatternToken/DisambiguationPatternRule (F25/F26)
  // Java: GermanWordRepeatRuleTest#testRule
  it.skip('testRule_germanWordRepeat', () => {
    const german = Languages.getLanguageForShortCode("de");
    let rule = new GermanWordRepeatRule(englishMessages(), german);
    let lt = newLt(german);
    expect(rule.match(lt.getAnalyzedSentence("Das ist gut so.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("Das ist ist gut so.")).length).toBe(1);
    expect(rule.match(lt.getAnalyzedSentence("Der der Mann")).length).toBe(1);
    expect(rule.match(lt.getAnalyzedSentence("Warum fragen Sie sie nicht selbst?")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("Er will nur sein Leben leben.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("Wie bei Honda, die die Bezahlung erhöht haben.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("Dann warfen sie sie weg.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("Dann konnte sie sie sehen.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("Er muss sein Essen essen.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("Wahrscheinlich ist das das Problem.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("Dann wäre das das erste Wirtschaftsmagazin mit mehr als 10.000 Lesern.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("Für mich war das das Härteste.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("Ich weiß, wer wer ist!")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("Ich kann das machen, falls das das Problem ist.")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("Als ich das das erste Mal gehört habe …")).length).toBe(0);
    expect(rule.match(lt.getAnalyzedSentence("Hat sie sie")).length).toBe(1); // used to crash, issue #1010
    expect(rule.match(lt.getAnalyzedSentence("Hat hat")).length).toBe(1);
    expect(rule.match(lt.getAnalyzedSentence("hat hat")).length).toBe(1);
  });

  // SKIPPED: German language rules need the full de rule list (F59) and GermanRuleDisambiguator/GermanChunker (F51)
  // Java: UppercaseSentenceStartRuleTest (de)#testRule
  it.skip('testRule_uppercase', () => {
    const lt = newLt(Languages.getLanguageForShortCode("de-DE"));
    disableAllRulesExcept(lt, "UPPERCASE_SENTENCE_START");
    expect(lt.check("etwas beginnen. und der auch nicht").length).toBe(2);
    expect(lt.check("schön").length).toBe(0); // not a real sentence
    expect(lt.check("Satz").length).toBe(0);
    expect(lt.check("Dies ist ein Satz. Und hier kommt noch einer").length).toBe(0);
    expect(lt.check("Dies ist ein Satz. Ätsch, noch einer mit Umlaut.").length).toBe(0);
    expect(lt.check("Dieser Satz ist bspw. okay so.").length).toBe(0);
    expect(lt.check("Dieser Satz ist z.B. okay so.").length).toBe(0);
    expect(lt.check("Dies ist ein Satz. \"Aber der hier auch!\".").length).toBe(0);
    expect(lt.check("\"Dies ist ein Satz!\"").length).toBe(0);
    expect(lt.check("'Dies ist ein Satz!'").length).toBe(0);
    expect(lt.check("mRNA-Impfstoffe sind wichtig.").length).toBe(0);
    expect(lt.check("Sehr geehrte Frau Merkel,\nwie wir Ihnen schon früher mitgeteilt haben...").length).toBe(0);
    //assertEquals(0, lt.check("Dies ist ein Satz. aber das hier noch nicht").length);
    expect(lt.check("schön!").length).toBe(1);
    expect(lt.check("Dies ist ein Satz. ätsch, noch einer mit Umlaut.").length).toBe(1);
    expect(lt.check("Dies ist ein Satz. \"aber der hier auch!\"").length).toBe(1);
    expect(lt.check("Dies ist ein Satz. „aber der hier auch!“").length).toBe(1);
    expect(lt.check("\"dies ist ein Satz!\"").length).toBe(1);
    expect(lt.check("'dies ist ein Satz!'").length).toBe(1);
    // Test soft hyphen removal / position fixing:
    let matches0 = lt.check("Ein Test. was?"); // no soft hyphen yet
    expect(matches0.length).toBe(1);
    expect(matches0[0].getFromPos()).toBe(10);
    expect(matches0[0].getToPos()).toBe(13);
    let matches1 = lt.check("Ein \u00ADTest. was?");
    expect(matches1.length).toBe(1);
    expect(matches1[0].getFromPos()).toBe(11);
    expect(matches1[0].getToPos()).toBe(14);
    let matches2 = lt.check("Ein \u00ADTe\u00ADst. was?");
    expect(matches2.length).toBe(1);
    expect(matches2[0].getFromPos()).toBe(12);
    expect(matches2[0].getToPos()).toBe(15);
    let matches3 = lt.check("Ein \u00ADTe\u00ADst. Te\u00ADst. was?");
    expect(matches3.length).toBe(1);
    expect(matches3[0].getFromPos()).toBe(19);
    expect(matches3[0].getToPos()).toBe(22);
    expect(lt.check("Willkommen… im Berlin.").length).toBe(0);
    expect(lt.check("Die neue Kollektion von NAU! ist jetzt online.").length).toBe(0);
  });

  // Java: GermanCommaWhitespaceRuleTest#testRule
  it('testRule_commaWhitespace', () => {
    const rule = new GermanCommaWhitespaceRule(englishMessages(),
      Example.wrong("Die Partei<marker> ,</marker> die die letzte Wahl gewann."),
      Example.fixed("Die Partei<marker>,</marker> die die letzte Wahl gewann."),
      getUrl("http://fake"));
    const lt = newLt(Languages.getLanguageForShortCode("de"));
    expect(rule.match(lt.getAnalyzedSentence("Es gibt 5 Millionen .de-Domains.")).length).toBe(0);
  });

  // SKIPPED: German language rules need the full de rule list (F59) and GermanRuleDisambiguator/GermanChunker (F51)
  // Java: WordRepeatRuleTest (de)#testRuleGerman
  it.skip('testRuleGerman', () => {
    const lt = newLt(german);
    assertGood("Das sind die Sätze, die die testen sollen.", lt);
    assertGood("Sätze, die die testen.", lt);
    assertGood("Das Haus, auf das das Mädchen zeigt.", lt);
    assertGood("Warum fragen Sie sie nicht selbst?", lt);
    assertGood("Er tut das, damit sie sie nicht sieht.", lt);
    assertBad("Die die Sätze zum testen.", lt);
    assertBad("Und die die Sätze zum testen.", lt);
    assertBad("Auf der der Fensterbank steht eine Blume.", lt);
    assertBad("Das Buch, in in dem es steht.", lt);
    assertBad("Das Haus, auf auf das Mädchen zurennen.", lt);
    assertBad("Sie sie gehen nach Hause.", lt);
  });

  // SKIPPED: German language rules need the full de rule list (F59) and GermanRuleDisambiguator/GermanChunker (F51)
  // Java: SentenceWhitespaceRuleTest (de)#testMatch
  it.skip('testMatch_sentenceWhitespace', () => {
    const lt = newLt(Languages.getLanguageForShortCode("de-DE"));
    disableAllRulesExcept(lt, "DE_SENTENCE_WHITESPACE");
    assertGood("Das ist ein Satz. Und hier der nächste.", lt);
    assertGood("Das ist ein Satz! Und hier der nächste.", lt);
    assertGood("Ist das ein Satz? Hier der nächste.", lt);
    assertBad("Das ist ein Satz.Und hier der nächste.", lt);
    assertBad("Das ist ein Satz!Und hier der nächste.", lt);
    assertBad("Ist das ein Satz?Hier der nächste.", lt);
    assertGood("Am 28. September.", lt);
    assertBad("Am 28.September.", lt);
    assertGood("Das 1. Internationale Filmfestival findet nächste Woche statt.", lt);
    assertBad("Das 1.Internationale Filmfestival findet nächste Woche statt.", lt);
    expect(lt.check("Am 7.September 2014.")[0].getMessage().includes("nach Ordnungszahlen")).toBe(true);
    expect(lt.check("Im September.Dann der nächste Satz.")[0].getMessage().includes("zwischen Sätzen")).toBe(true);
  });
});
