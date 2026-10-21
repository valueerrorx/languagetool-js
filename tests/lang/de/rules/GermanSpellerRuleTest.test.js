// Ported from GermanSpellerRuleTest (languagetool-language-modules/de)
// ignored in Java: testIgnoreMisspelledWordForRegressions, testForRegressions (local corpus), testMorfologikSpeller, testMorfologikSpeller2, testMorfologikSpellerWithSpellingTxt (morfologik internals, @Ignore)
import { describe, it, expect, afterEach } from 'vitest';
import '../../../../src/lang/register.js';
import { Languages } from '../../../../src/core/Languages.js';
import { getDataBroker } from '../../../../src/core/resources/LtStatics.js';
import { CachingWordListLoader } from '../../../../src/core/rules/spelling/CachingWordListLoader.js';
import { SuggestedReplacement } from '../../../../src/core/rules/model/SuggestedReplacement.js';
import { GermanSpellerRule } from '../../../../src/lang/de/rules/GermanSpellerRule.js';
import { AustrianGermanSpellerRule } from '../../../../src/lang/de/rules/AustrianGermanSpellerRule.js';
import { SwissGermanSpellerRule } from '../../../../src/lang/de/rules/SwissGermanSpellerRule.js';
import { LineExpander } from '../../../../src/lang/de/rules/LineExpander.js';
import { messagesFor, newLt } from '../../../support/ruleTestSupport.js';
import { JLanguageTool } from '../../../../src/core/JLanguageTool.js';
import { disableAllRulesExcept } from '../../../support/TestTools.js';
import { simulateNoEnglishModule } from '../../../support/NoEnglishModule.js';

const GERMAN_DE = Languages.getLanguageForShortCode('de-DE');
const GERMAN_CH = Languages.getLanguageForShortCode('de-CH');
const deMessages = () => messagesFor(Languages.getLanguageForShortCode('de')); // Java: TestTools.getMessages("de")
const enMessages = () => messagesFor(Languages.getLanguageForShortCode('en')); // Java: TestTools.getEnglishMessages()
const ls = (l) => `[${l.join(', ')}]`; // Java: List#toString()
const is = (x) => x;

// Java: GermanSpellerRuleTest$MyGermanSpellerRule
class MyGermanSpellerRule extends GermanSpellerRule {
  // Java: MyGermanSpellerRule(ResourceBundle,German)
  constructor(messages, language) {
    super(messages, language, null, null);
    this.ensureInitialized();
  }

  // Java: MyGermanSpellerRule#doIgnoreWord(String)
  doIgnoreWord(word) {
    return super.ignoreWordAt([word], 0);
  }
}

// Java: GermanSpellerRuleTest#accept(String,GermanSpellerRule)
function accept(word, rule) {
  expect(rule.ignoreWordAt([word], 0)).toBe(true);
}

// Java: GermanSpellerRuleTest#dontAccept(String,GermanSpellerRule)
function dontAccept(word, rule) {
  expect(rule.ignoreWordAt([word], 0)).toBe(false);
}

// Java: GermanSpellerRuleTest#assertCorrect(String,MyGermanSpellerRule,JLanguageTool)
function assertCorrect(word, rule, lt) {
  expect(rule.match(lt.getAnalyzedSentence(word)).length).toEqual(0);
}

// Java: GermanSpellerRuleTest#assertIncorrect(String,MyGermanSpellerRule,JLanguageTool)
function assertIncorrect(word, rule, lt) {
  expect(rule.match(lt.getAnalyzedSentence(word)).length).toEqual(1);
}

// Java: GermanSpellerRuleTest#assertFirstSuggestion(String,String,GermanSpellerRule,JLanguageTool)
function assertFirstSuggestion(input, expected, rule, lt) {
  const matches = rule.match(lt.getAnalyzedSentence(input));
  if (expected === null) {
    expect(matches[0].getSuggestedReplacements().length, `Matches: ${ls(matches[0].getSuggestedReplacements())}`).toEqual(0);
  } else if (matches.length === 0) {
    throw new Error(`Matches: ${matches.length}, expected at least one`);
  } else {
    expect(matches[0].getSuggestedReplacements()[0], `Matches: ${matches.length}, Suggestions of first match: ${ls(matches[0].getSuggestedReplacements())}`).toEqual(expected);
  }
}

// Java: GermanSpellerRuleTest#assertNotSuggestion(String,String,GermanSpellerRule,JLanguageTool)
function assertNotSuggestion(input, notExpected, rule, lt) {
  const matches = rule.match(lt.getAnalyzedSentence(input));
  for (const match of matches) {
    expect(match.getSuggestedReplacements().includes(notExpected), `Found unexpected suggestion '${notExpected}' for input '${input}'`).toBe(false);
  }
}

// Java: GermanSpellerRuleTest#assertCorrection(HunspellRule,String,String...)
function assertCorrection(rule, input, ...expectedTerms) {
  const suggestions = rule.getSuggestions(input);
  for (const expectedTerm of expectedTerms) {
    expect(suggestions.includes(expectedTerm), `Not found: '${expectedTerm}' in: ${ls(suggestions)} for input '${input}'`).toBe(true);
  }
  if (expectedTerms.length === 0 && suggestions.length > 0) {
    throw new Error(`Didn't expect suggestions at all for '${input}', got: ${ls(suggestions)}`);
  }
}

// Java: GermanSpellerRuleTest#assertCorrectionsByOrder(HunspellRule,String,String...)
function assertCorrectionsByOrder(rule, input, ...expectedTerms) {
  const suggestions = rule.getSuggestions(input);
  let i = 0;
  for (const expectedTerm of expectedTerms) {
    expect(suggestions[i] === expectedTerm, `Not found at position ${i}: '${expectedTerm}' in: ${ls(suggestions)} for input '${input}'`).toBe(true);
    i++;
  }
}

// Java: GermanSpellerRuleTest#expandLines(List)
function expandLines(prohibit) {
  const lineExpander = new LineExpander();
  const expanded = [];
  for (const line of prohibit) {
    expanded.push(...lineExpander.expandLine(line));
  }
  return expanded;
}

// Java: GermanSpellerRuleTest#commonGermanAsserts(HunspellRule,JLanguageTool)
function commonGermanAsserts(rule, lt) {
    expect(rule.match(lt.getAnalyzedSentence("Der Waschmaschinentestversuch")).length).toEqual(0);  // compound
    expect(rule.match(lt.getAnalyzedSentence("Der Waschmaschinentest-Versuch")).length).toEqual(0);  // compound
    expect(rule.match(lt.getAnalyzedSentence("Der Arbeitnehmer")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Die Verhaltensänderung")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Er bzw. sie.")).length).toEqual(0); // abbreviations
    expect(rule.match(lt.getAnalyzedSentence("Die Standarte")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Die Standarten")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Die Standartenführer")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Der Standard")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Der Standardversuch")).length).toEqual(0);

    expect(rule.match(lt.getAnalyzedSentence("Der Waschmaschinentest-Dftgedgs")).length).toEqual(1);
    expect(rule.match(lt.getAnalyzedSentence("Der Dftgedgs-Waschmaschinentest")).length).toEqual(1);
    expect(rule.match(lt.getAnalyzedSentence("Der Waschmaschinentestdftgedgs")).length).toEqual(1);
    expect(rule.match(lt.getAnalyzedSentence("Der Waschmaschinentestversuch orkt")).length).toEqual(1);
    expect(rule.match(lt.getAnalyzedSentence("Der Arbeitsnehmer")).length).toEqual(1);  // wrong interfix
    expect(rule.match(lt.getAnalyzedSentence("Die Verhaltenänderung")).length).toEqual(1);  // missing interfix
    expect(rule.match(lt.getAnalyzedSentence("Er bw. sie.")).length).toEqual(1); // abbreviations (bzw.)
    expect(rule.match(lt.getAnalyzedSentence("Der asdegfue orkt")).length).toEqual(2);
    expect(rule.match(lt.getAnalyzedSentence("rumfangreichen")).length).toEqual(1);
    expect(rule.match(lt.getAnalyzedSentence("Der Standart")).length).toEqual(1);
    expect(rule.match(lt.getAnalyzedSentence("Der Standartversuch")).length).toEqual(1);
    expect(rule.match(lt.getAnalyzedSentence("Halterun")).length).toEqual(1);
    expect(rule.match(lt.getAnalyzedSentence("Wandhalterun")).length).toEqual(1);
    expect(rule.match(lt.getAnalyzedSentence("Halterung")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Wandhalterung")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Willkommenbei")).length).toEqual(1);
    expect(rule.match(lt.getAnalyzedSentence("Fantasieschafft")).length).toEqual(1);
    expect(rule.match(lt.getAnalyzedSentence("Babyquietschte")).length).toEqual(1);
    expect(rule.match(lt.getAnalyzedSentence("nordwestfranzösisch")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("nordestnisch")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("westmünsterländische")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("süddeutschland")).length).toEqual(1);
    expect(rule.match(lt.getAnalyzedSentence("Desktopbetrieb")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Desktophintergrund")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Unibetrieb")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Integrallogarithmus")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Fledermaussonar")).length).toEqual(0);
}

simulateNoEnglishModule(); // the Java de module tests run without the en module on the classpath

describe('GermanSpellerRuleTest', () => {
  // the tests are long synchronous computations: give the event loop a turn between tests so that vitest's worker RPC does not time out
  afterEach(() => new Promise((resolve) => setTimeout(resolve, 1)));

  // Java: GermanSpellerRuleTest#testGetMessage
  it('testGetMessage', () => {
    let rule = new GermanSpellerRule(deMessages(), GERMAN_DE);
    expect(rule.getMessage("aussen", new SuggestedReplacement("außen"))).toEqual("Nach einer Silbe aus zwei Vokalen (hier: au) schreibt man 'ß' statt 'ss'.");
    expect(rule.getMessage("Strasse", new SuggestedReplacement("Straße"))).toEqual("Nach einer lang gesprochenen Silbe (hier: a) schreibt man 'ß' statt 'ss'.");
    expect(rule.getMessage("STRASSE", new SuggestedReplacement("STRAßE"))).toEqual("Möglicher Tippfehler gefunden.");
    expect(rule.getMessage("nomral", new SuggestedReplacement("normal"))).toEqual("Möglicher Tippfehler gefunden.");
  });

  // Java: GermanSpellerRuleTest#testIgnoreMisspelledWord
  it('testIgnoreMisspelledWord', () => {
    let rule = new GermanSpellerRule(deMessages(), GERMAN_DE);
    expect(rule.ignorePotentiallyMisspelledWord("Wahlkamp")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Ahmenforscherin")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Bachwettbewerb")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Berlinhauptbahnhof")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Schwedenreise")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Erwachsenenintensivkurse")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Horizontalbohrtechnik")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Bogenschiessen")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Badefenster")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Badspaß")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Widersachen")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Widerherstellung")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Journalistendramas")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Bürokratieaufbau")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Bestangebotsklauseln")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Wendeplatte")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Tassentrio")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Ausbiegemöglichkeit")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Lipochrom")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Ostteil")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Ostenteil")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Perspektivwechsel")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Perspektivewechsel")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Suchemaschine")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Sprachvariante")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Sprachevariante")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Sprachenvariante")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Kontrollgremiums")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Kontrollegremiums")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Kontrollengremiums")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Leuchtfunktion")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Leuchtefunktion")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Schulstreit")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Schulestreit")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Stelleplätze")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Herzensanliegen")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Herzenanliegen")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Vornamensliste")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Wörterbuch")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Wortgrenze")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Weltklimaveränderung")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Weltbummler")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Demokratenversammlung")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Zahnbürsten")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Zähnebürsten")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Zähnebürste")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Apfelstehlen")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Äpfelstehlen")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Zwiebelschneiden")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Zwiebelnschneiden")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Fußballspielen")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Fußbällespielen")).toBe(false);
    //assertTrue(rule.ignorePotentiallyMisspelledWord("Naseputzen"));
    //assertFalse(rule.ignorePotentiallyMisspelledWord("Nasenputzen"));
    expect(rule.ignorePotentiallyMisspelledWord("Abbiegemöglichkeit")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Cholesterinwiederaufnahmehemmer")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Kennenlernmöglichkeit")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Konstruktionsverfahren")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Wölkchenbildung")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Abschlussgruße")).toBe(false);  // probably "...grüße"
    expect(rule.ignorePotentiallyMisspelledWord("Offenlegungsfrist")).toBe(true);
    //assertFalse(rule.ignorePotentiallyMisspelledWord("Offenlegungsfirst"));
    //assertFalse(rule.ignorePotentiallyMisspelledWord("Dachfrist"));
    expect(rule.ignorePotentiallyMisspelledWord("Hospizgemeinschaft")).toBe(true);  //no infix-s for compounds: .*z + noun
    expect(rule.ignorePotentiallyMisspelledWord("Azubikommt")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Lasstest")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Ablassbild")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Wachtums-Pistole")).toBe(false);  // split as "Wacht, ums-Pistole"
    expect(rule.ignorePotentiallyMisspelledWord("Discorum")).toBe(false);  // "Disco, rum" and "rum" is only 3 chars and thus too short
    expect(rule.ignorePotentiallyMisspelledWord("Arbeitsgeber")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Arbeitsgeberverhandlungen")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Arbeitplatz")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Rechtlage")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Rechtextremismus")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Rechtanwälten")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Rechtfertigungsgrund")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Rechtsfertigungsgrund")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Ausleihstelle")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Aus-leihstelle")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("AusLeihStelle")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Trauringkollektionen")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Vorraus")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Weinkühlschrank")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Weinkühl-schrank")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Weinskühlschrank")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Weinsskühlschrank")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Schokobrunnen")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Schokosbrunnen")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Gensfleisch")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Grossmächten")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Aussichtplattform")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Datumangabe")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Hundefutterschachtel")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Leistungsversuchstest")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Nachuntersuchungstest")).toBe(true);  // needs extension in ExtendedGermanWordSplitter.extendedList (as of 2023-10-02)
    expect(rule.ignorePotentiallyMisspelledWord("Robustheitsabstände")).toBe(true);  // triggers use of nonStrictSplitter (2023-09-18, might change...)
    expect(rule.ignorePotentiallyMisspelledWord("Robustheitsabstände.")).toBe(true);  // triggers use of nonStrictSplitter (2023-09-18, might change...)
    expect(rule.ignorePotentiallyMisspelledWord("Absenkungsvorgaben")).toBe(true);  // triggers use of nonStrictSplitter (2023-09-26, might change...)
    expect(rule.ignorePotentiallyMisspelledWord("Prioritätsdings")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Prioritätsdings.")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Haltungsschäden")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Prioritäts-Dings")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Prioritäts-Dings.")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Haltungs-Schäden")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Kritzelcafé")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("haltungschäden")).toBe(false);  // lowercase
    expect(rule.ignorePotentiallyMisspelledWord("haltungs-schäden")).toBe(false);  // lowercase
    expect(rule.ignorePotentiallyMisspelledWord("haltungs-Schäden")).toBe(false);  // lowercase
    expect(rule.ignorePotentiallyMisspelledWord("Haltungschäden")).toBe(false);  // missing infix-s
    expect(rule.ignorePotentiallyMisspelledWord("Haltung-Schäden")).toBe(false);  // missing infix-s
    expect(rule.ignorePotentiallyMisspelledWord("Hultungsschäden")).toBe(false);  // misspelling in first word
    expect(rule.ignorePotentiallyMisspelledWord("Hultungs-Schäden")).toBe(false);  // misspelling in first word
    expect(rule.ignorePotentiallyMisspelledWord("Haltungsscheden")).toBe(false);  // misspelling in second part
    expect(rule.ignorePotentiallyMisspelledWord("Haltungs-Scheden")).toBe(false);  // misspelling in second part
    expect(rule.ignorePotentiallyMisspelledWord("HaltungsSchäden")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Haltungsei")).toBe(false);  // second part too short
    expect(rule.ignorePotentiallyMisspelledWord("Haltungs-Ei")).toBe(false);  // second part too short
    expect(rule.ignorePotentiallyMisspelledWord("Leistungsnach")).toBe(false);  // second part not a noun
    expect(rule.ignorePotentiallyMisspelledWord("Antwortzugeschnitten")).toBe(false);  // second part not a noun
    expect(rule.ignorePotentiallyMisspelledWord("Leistungsgegangen")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Leistungsgegangen.")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Leistungsversuchstestnachweis")).toBe(false);  // 4 or more parts not yet supported
    expect(rule.ignorePotentiallyMisspelledWord("Leistung")).toBe(false);  // not a compound
    expect(rule.ignorePotentiallyMisspelledWord("Leistungs")).toBe(false);  // not a compound
    expect(rule.ignorePotentiallyMisspelledWord("Anschauungswiese")).toBe(false);  // from prohibit.txt
    expect(rule.ignorePotentiallyMisspelledWord("Fakultätsaal")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Implementierungs-pflicht")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Sachsenmeisterschaf")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Agensprinzip")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("SEO-ExpertIn")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("SEO-Expert*in")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("SEO-Expert:in")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("SEO-Expert_in")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("SEO-Expert/-in")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("SEO-ExpertInnen")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("SEO-Expert*innen")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("SEO-Expert:innen")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("SEO-Expert_innen")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("SEO-Expert/-innen")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Bürge*in")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("ArbeitnehmerInnenschutzgesetz")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Arbeitnehmer*innenschutzgesetz")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Arbeitnehmer:innenschutzgesetz")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Arbeitnehmer_innenschutzgesetz")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Arbeitnehmer/-innenschutzgesetz")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("PDFversion")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("AktienIndex")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("EisenbahnerInnern")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Eisenbahner*innern")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Eisenbahner/-innern")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Ireland")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Karnevalmuseum")).toBe(true);
    //assertTrue(rule.ignorePotentiallyMisspelledWord("Karnevalsmuseum"));
    expect(rule.ignorePotentiallyMisspelledWord("Alkoholgenuß")).toBe(false);
    // special cases:
    expect(rule.ignorePotentiallyMisspelledWord("Actionsspaß")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Aktionswoche")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Aktionwoche")).toBe(false);
    //assertTrue(rule.ignorePotentiallyMisspelledWord("Jungsnamen")); // 'Jungs' is colloquial for 'Jungen'
    expect(rule.ignorePotentiallyMisspelledWord("Aufschwungsphase")).toBe(false); // see prohibit.txt
    expect(rule.ignorePotentiallyMisspelledWord("Absprungsrate")).toBe(false); // see prohibit.txt
    //
    expect(rule.ignorePotentiallyMisspelledWord("Ahornswald")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Aluminiumssockel")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Antwortszeiten")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Austauschsprogramms")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Bahnstrasse")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Bausstellen")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Bergstrasse")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Berufungssausschuss")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Betreffszeile")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Bundeswasserstrassen")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Bunsenbrennerflamme")).toBe(true);
    //
    expect(rule.ignorePotentiallyMisspelledWord("Abstiegzone")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Abstimmungbeschluss")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Dorfstrasse")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Kitasausbau")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Linkelemente")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Linksdrehung")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Linkpartei")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Linksportal")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Muttertagskarte")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Muttertagkarte")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Verbandmaterial")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Verbandsmaterial")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Verbandgemeinde")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Sonntagnachmittag")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Sonntagsfahrer")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Sonntagfahrer")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Gerätebezeichnung")).toBe(true);
    expect(rule.ignorePotentiallyMisspelledWord("Gerätbezeichnung")).toBe(false);
    expect(rule.ignorePotentiallyMisspelledWord("Abflußleitung")).toBe(false); // old spelling
    expect(rule.ignorePotentiallyMisspelledWord("Abflussleitung")).toBe(true); // new spelling
    expect(rule.ignorePotentiallyMisspelledWord("Grünschloß")).toBe(false); // old spelling
    expect(rule.ignorePotentiallyMisspelledWord("Grünschloss")).toBe(true); // new spelling
    expect(rule.ignorePotentiallyMisspelledWord("Bewußtseinswandels")).toBe(false); // old spelling
    expect(rule.ignorePotentiallyMisspelledWord("Bewusstseinswandels")).toBe(true); // new spelling
    expect(rule.ignorePotentiallyMisspelledWord("Meerweine")).toBe(false);
    //
  });

  // Java: GermanSpellerRuleTest#testArtig
  it('testArtig', () => {
    let rule = new GermanSpellerRule(deMessages(), GERMAN_DE);
    accept("zigarrenartig", rule);
    accept("zigarrenartige", rule);
    accept("zigarrenartiger", rule);
    accept("zigarrenartiges", rule);
    accept("zigarrenartigen", rule);
    accept("zigarrenartigem", rule);
    accept("handlungsartig", rule);
    dontAccept("zigarrenartigex", rule);
    dontAccept("handlungartig", rule);
    dontAccept("arbeitartig", rule);
    dontAccept("kostefrei", rule);
    dontAccept("reglemäßig", rule);
    dontAccept("hatfrei", rule);
    dontAccept("geruchhemmend", rule);
    dontAccept("aberabhängig", rule);
  });

  // Java: GermanSpellerRuleTest#testSplitWords
  it('testSplitWords', () => {
    let rule = new GermanSpellerRule(deMessages(), GERMAN_DE);
    let lt = newLt(GERMAN_DE);
    let matches = rule.match(lt.getAnalyzedSentence("Das ist ein sher schöner Satz."));
    expect(matches.length).toEqual(1);
    expect(matches[0].getSuggestedReplacements()[0]).toEqual("sehr");
    expect(matches[0].getFromPos()).toEqual(12);
    expect(matches[0].getToPos()).toEqual(16);
    matches = rule.match(lt.getAnalyzedSentence("Das sin die Optionen."));
    expect(matches.length).toEqual(1);
    expect(matches[0].getSuggestedReplacements()[0]).toEqual("ein");
    expect(matches[0].getSuggestedReplacements()[1]).toEqual("sind");
    matches = rule.match(lt.getAnalyzedSentence("Gibt es einen grund, dass…"));
    expect(matches.length).toEqual(1);
    expect(matches[0].getSuggestedReplacements()[0]).toEqual("Grund");

    matches = rule.match(lt.getAnalyzedSentence("Kryptomarktplatzes"));
    expect(matches.length).toEqual(0);
  });

  // Java: GermanSpellerRuleTest#testGetOnlySuggestions
  it('testGetOnlySuggestions', () => {
    let rule = new GermanSpellerRule(deMessages(), GERMAN_DE);
    expect(rule.getOnlySuggestions("autentisch").length).toEqual(1);
    expect(rule.getOnlySuggestions("autentisch")[0].getReplacement()).toEqual("authentisch");
    expect(rule.getOnlySuggestions("brillianter").length).toEqual(1);
    expect(rule.getOnlySuggestions("brillianter")[0].getReplacement()).toEqual("brillanter");
    expect(rule.getOnlySuggestions("autentischeres").length).toEqual(1);
    expect(rule.getOnlySuggestions("autentischeres")[0].getReplacement()).toEqual("authentischeres");
    expect(rule.getOnlySuggestions("Autentischere").length).toEqual(1);
    expect(rule.getOnlySuggestions("Autentischere")[0].getReplacement()).toEqual("Authentischere");
    let lt = newLt(GERMAN_DE);
    let matches = rule.match(lt.getAnalyzedSentence("Eine autentische Sache."));
    expect(matches.length).toEqual(1);
    expect(matches[0].getSuggestedReplacements().length).toEqual(1);
    expect(matches[0].getSuggestedReplacements()[0]).toEqual("authentische");
  });

  // Java: GermanSpellerRuleTest#testFilterForLanguage
  it('testFilterForLanguage', () => {
    let rule = new GermanSpellerRule(deMessages(), GERMAN_DE);
    let list1 = ["Mafiosi s", "foo"];
    rule.filterForLanguage(list1);
    expect(list1).toEqual(["foo"]);

    let list2 = ["-bar", "foo"];
    rule.filterForLanguage(list2);
    expect(list2).toEqual(["foo"]);

    let ruleCH = new SwissGermanSpellerRule(deMessages(), GERMAN_CH);
    let list3 = ["Muße", "foo"];
    ruleCH.filterForLanguage(list3);
    expect(list3).toEqual(["Musse", "foo"]);
  });

  // Java: GermanSpellerRuleTest#testSortSuggestion
  it('testSortSuggestion', () => {
    let rule = new GermanSpellerRule(deMessages(), GERMAN_DE);
    expect(ls(rule.sortSuggestionByQuality("fehler", ["fehla", "xxx", "Fehler"]))).toEqual("[Fehler, fehla, xxx]");
    expect(ls(rule.sortSuggestionByQuality("mülleimer", ["Mülheimer", "-mülheimer", "Melkeimer", "Mühlheimer", "Mülleimer"]))).toEqual("[Mülleimer, Mülheimer, -mülheimer, Melkeimer, Mühlheimer]");

    // filtering out undesired inflected forms
    expect(ls(rule.sortSuggestionByQuality("glückklich", ["glücklich", "glückliche", "glücklichen", "glücklicher", "glückliches"]))).toEqual("[glücklich]");
    expect(ls(rule.sortSuggestionByQuality("Fußbaall", ["Fußball", "Fußballs", "Ausball", "Fußball", "Fußbälle"]))).toEqual("[Fußball, Ausball]");
    expect(ls(rule.sortSuggestionByQuality("glücklichr", ["glücklich", "glückliche", "glücklicher", "glücklichen", "glückliches"]))).toEqual("[glücklich, glückliche, glücklicher, glücklichen, glückliches]");
  });

  // Java: GermanSpellerRuleTest#testFilteringOutSuggestions
  it('testFilteringOutSuggestions', () => {
    let rule = new GermanSpellerRule(deMessages(), GERMAN_DE);
    let lt = newLt(GERMAN_DE);
    expect(ls(rule.match(lt.getAnalyzedSentence("glückklich"))[0].getSuggestedReplacements())).toEqual("[glücklich, glücklichst]");
    expect(ls(rule.match(lt.getAnalyzedSentence("erleddigt"))[0].getSuggestedReplacements())).toEqual("[erledigt, erledige, erledigst]");
    expect(ls(rule.match(lt.getAnalyzedSentence("glücklichhe"))[0].getSuggestedReplacements())).toEqual("[glückliche, glücklichst]");
    expect(ls(rule.match(lt.getAnalyzedSentence("glückklicher"))[0].getSuggestedReplacements())).toEqual("[glücklicher, glücklichst]");
    expect(ls(rule.match(lt.getAnalyzedSentence("großdenken"))[0].getSuggestedReplacements())).toEqual("[Großdenken, groß denken, großdenkend, Grasstängel, Grasstängeln, Tröstungen, großdenkende, großtunden, großtäten, tröstenden]");
  });

  // Java: GermanSpellerRuleTest#testProhibited
  it('testProhibited', () => {
    let rule = new GermanSpellerRule(deMessages(), GERMAN_DE);
    rule.getSuggestions("");  // needed to force a proper init
    expect(rule.isProhibited("Standart-Test")).toBe(true);  // entry with ".*" in prohibited.txt
    expect(rule.isProhibited("Blindarmentzündung")).toBe(true);  // entry with ".*" in prohibited.txt
    expect(rule.isProhibited("Weihnachtfreier")).toBe(true);
    expect(rule.isProhibited("Standard-Test")).toBe(false);
    expect(rule.isProhibited("Abstellgreis")).toBe(true);
    expect(rule.isProhibited("Abstellgreise")).toBe(true);
    expect(rule.isProhibited("Abstellgreisen")).toBe(true);
    expect(rule.isProhibited("Landstreckenflüge")).toBe(true);
    expect(rule.isProhibited("Landstreckenflügen")).toBe(true);
    expect(rule.isProhibited("Abdominalgangion")).toBe(true);
    expect(rule.isProhibited("Abdominalgangionen")).toBe(true);
    expect(rule.isProhibited("Badegas")).toBe(true);  // non-expanded entry in prohibited.txt
    expect(rule.isProhibited("Aktienkur")).toBe(true); // non-expanded entry in prohibited.txt
    expect(rule.isProhibited("Stellungsnahmen")).toBe(true); // expanded entry in prohibited.txt
    expect(rule.isProhibited("Varietee")).toBe(true); // expanded entry in prohibited.txt
    expect(rule.isProhibited("Varietees")).toBe(true); // expanded entry in prohibited.txt
    expect(rule.isProhibited("Feuerwerksartigel")).toBe(true); // entry with ".*" at line start in prohibited.txt
    expect(rule.isProhibited("Feuerwerksartigeln")).toBe(true); // entry with ".*" at line start in prohibited.txt
    expect(rule.isProhibited("Feuerwerksartigels")).toBe(true); // entry with ".*" at line start in prohibited.txt
    expect(rule.isProhibited("To-go")).toBe(true); // entry with ".*" at line start in prohibited.txt
  });

  // Java: GermanSpellerRuleTest#testFilterBadSuggestions
  it('testFilterBadSuggestions', () => {
    let rule = new GermanSpellerRule(deMessages(), GERMAN_DE);
    let lt = newLt(GERMAN_DE);
    assertNotSuggestion("nicht in euerer", "i neuerer", rule, lt);
    assertNotSuggestion("Ich rauche ne Zigarette", "rauchen e", rule, lt);
  });

  // Java: GermanSpellerRuleTest#testGetAdditionalTopSuggestions (part 1 of 5; split to keep single synchronous test bodies short)
  it('testGetAdditionalTopSuggestions part 1', () => {
    let rule = new GermanSpellerRule(deMessages(), GERMAN_DE);
    let lt = newLt(GERMAN_DE);
    expect(ls(rule.match(lt.getAnalyzedSentence("dan"))[0].getSuggestedReplacements()).startsWith("[dann, Dan, den, an")).toBe(true);
    expect(ls(rule.match(lt.getAnalyzedSentence("konservierungsstoffstatistik"))[0].getSuggestedReplacements())).toEqual("[Konservierungsstoffstatistik]");
    expect(rule.match(lt.getAnalyzedSentence("konservierungsstoffsasdsasda"))[0].getSuggestedReplacements().length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Ventrolateral")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("haben -sehr")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Kleindung")).length).toEqual(1);  // ignored due to ignoreCompoundWithIgnoredWord(), but still in ignore.txt -> ignore.txt must override this
    expect(ls(rule.match(lt.getAnalyzedSentence("Majonäse."))[0].getSuggestedReplacements())).toEqual("[Mayonnaise]");
    assertFirstSuggestion("Schöler-", "Schüler-", rule, lt);
    assertFirstSuggestion("wars.", "war es", rule, lt);
    assertFirstSuggestion("konservierungsstoffe", "Konservierungsstoffe", rule, lt);
//    assertFirstSuggestion("Ist Ventrolateral", "ventrolateral", rule, lt);
    assertFirstSuggestion("denkte", "dachte", rule, lt);
    assertFirstSuggestion("schwimmte", "schwamm", rule, lt);
    assertFirstSuggestion("gehte", "ging", rule, lt);
    assertFirstSuggestion("greifte", "griff", rule, lt);
    assertFirstSuggestion("geschwimmt", "geschwommen", rule, lt);
    assertFirstSuggestion("gegeht", "gegangen", rule, lt);
    assertFirstSuggestion("getrinkt", "getrunken", rule, lt);
    assertFirstSuggestion("gespringt", "gesprungen", rule, lt);
    assertFirstSuggestion("geruft", "gerufen", rule, lt);
//    assertFirstSuggestion("Au-pair-Agentr", "Au-pair-Agentur", rule, lt); // "Au-pair" from spelling.txt 
    assertFirstSuggestion("Netflix-Flm", "Netflix-Film", rule, lt); // "Netflix" from spelling.txt
    assertFirstSuggestion("Bund-Länder-Kommissio", "Bund-Länder-Kommission", rule, lt);
    assertFirstSuggestion("Emailaccount", "E-Mail-Account", rule, lt);
    assertFirstSuggestion("Emailacount", "E-Mail-Account", rule, lt);
    assertFirstSuggestion("millionmal", "Million Mal", rule, lt);
    assertFirstSuggestion("millionenmal", "Millionen Mal", rule, lt);
    assertFirstSuggestion("geupdated", "upgedatet", rule, lt);
    assertFirstSuggestion("rosanen", "rosa", rule, lt);
    assertFirstSuggestion("missionariesierung", "Missionierung", rule, lt);
    assertFirstSuggestion("angehangener", "angehängter", rule, lt);
    assertFirstSuggestion("aufgehangene", "aufgehängte", rule, lt);
    assertFirstSuggestion("Germanistiker", "Germanist", rule, lt);
    assertFirstSuggestion("Germanistikern", "Germanisten", rule, lt);
    assertFirstSuggestion("Germanistikerin", "Germanistin", rule, lt);
    assertFirstSuggestion("erhöherung", "Erhöhung", rule, lt);
    assertFirstSuggestion("aufjedenfall", "auf jeden Fall", rule, lt);
    assertFirstSuggestion("Aufjedenfall", "Auf jeden Fall", rule, lt);
    assertFirstSuggestion("funkzunierende", "funktionierende", rule, lt);
    assertFirstSuggestion("funkzuniert", "funktioniert", rule, lt);
    assertFirstSuggestion("Mayonese", "Mayonnaise", rule, lt);
    assertFirstSuggestion("Majonäse", "Mayonnaise", rule, lt);
    assertFirstSuggestion("Salatmajonäse", "Salatmayonnaise", rule, lt);
    assertFirstSuggestion("Physiklaborants", "Physiklaboranten", rule, lt);
    assertFirstSuggestion("interkurelle", "interkulturelle", rule, lt);
    assertFirstSuggestion("Zuende", "Zu Ende", rule, lt);
    assertFirstSuggestion("zuende", "zu Ende", rule, lt);
    assertFirstSuggestion("wolt", "wollt", rule, lt);
    assertFirstSuggestion("allmähliges", "allmähliches", rule, lt);
    assertFirstSuggestion("Allmähllig", "Allmählich", rule, lt);
    assertFirstSuggestion("Probiren", "Probieren", rule, lt);
    assertFirstSuggestion("gesetztreu", "gesetzestreu", rule, lt);
    assertFirstSuggestion("wikiche", "wirkliche", rule, lt);
    assertFirstSuggestion("kongratulierst", "gratulierst", rule, lt);
    assertFirstSuggestion("Makeup", "Make-up", rule, lt);
    assertFirstSuggestion("profesionehlle", "professionelle", rule, lt);
    assertFirstSuggestion("professionählles", "professionelles", rule, lt);
    assertFirstSuggestion("gehnemigung", "Genehmigung", rule, lt);
    assertFirstSuggestion("korregierungen", "Korrekturen", rule, lt);
    assertFirstSuggestion("Korrigierungen", "Korrekturen", rule, lt);
    assertFirstSuggestion("Ticketresawihrung", "Ticketreservierung", rule, lt);
    assertFirstSuggestion("gin", "ging", rule, lt);
    assertFirstSuggestion("Gleichrechtige", "Gleichberechtigte", rule, lt);
    assertFirstSuggestion("unnützliche", "unnütze", rule, lt);
    assertFirstSuggestion("hälst", "hältst", rule, lt);
    assertFirstSuggestion("erhälst", "erhältst", rule, lt);
    assertFirstSuggestion("Verstehendnis", "Verständnis", rule, lt);
    //assertFirstSuggestion("Wohlfühlsein", "Wellness", rule, lt);
    assertFirstSuggestion("schmetrlinge", "Schmetterlinge", rule, lt);
    assertFirstSuggestion("einlamienirte", "laminierte", rule, lt);
    assertFirstSuggestion("Assecoires", "Accessoires", rule, lt);
    assertFirstSuggestion("Vorraussetzungen", "Voraussetzungen", rule, lt);
    assertFirstSuggestion("aufwechselungsreichem", "abwechslungsreichem", rule, lt);
    assertFirstSuggestion("nachwievor", "nach wie vor", rule, lt);
    assertFirstSuggestion("letztenendes", "letzten Endes", rule, lt);
    assertFirstSuggestion("mitanader", "miteinander", rule, lt);
    assertFirstSuggestion("nocheimal", "noch einmal", rule, lt);
    assertFirstSuggestion("konflikationen", "Komplikationen", rule, lt);
    assertFirstSuggestion("unswar", "und zwar", rule, lt);
    assertFirstSuggestion("fomelare", "Formulare", rule, lt);
  });

  // Java: GermanSpellerRuleTest#testGetAdditionalTopSuggestions (part 2 of 5; split to keep single synchronous test bodies short)
  it('testGetAdditionalTopSuggestions part 2', () => {
    let rule = new GermanSpellerRule(deMessages(), GERMAN_DE);
    let lt = newLt(GERMAN_DE);
    assertFirstSuggestion("immoment", "im Moment", rule, lt);
    assertFirstSuggestion("inordnung", "in Ordnung", rule, lt);
    assertFirstSuggestion("inbälde", "in Bälde", rule, lt);
    assertFirstSuggestion("unaufbesichtigt", "unbeaufsichtigt", rule, lt);
    assertFirstSuggestion("uberaschend", "überraschend", rule, lt);
    assertFirstSuggestion("uberagendes", "überragendes", rule, lt);
    assertFirstSuggestion("unabsichtiges", "unabsichtliches", rule, lt);
    assertFirstSuggestion("organisatives", "organisatorisches", rule, lt);
    assertFirstSuggestion("Medallion", "Medaillon", rule, lt);
    assertFirstSuggestion("diagnosiere", "diagnostiziere", rule, lt);
    assertFirstSuggestion("diagnoziert", "diagnostiziert", rule, lt);
    assertFirstSuggestion("durschnittliche", "durchschnittliche", rule, lt);
    assertFirstSuggestion("durschnitliche", "durchschnittliche", rule, lt);
    assertFirstSuggestion("durchnitliche", "durchschnittliche", rule, lt);
    assertFirstSuggestion("Durschnittswerte", "Durchschnittswerte", rule, lt);
    assertFirstSuggestion("Durschnittsbürgers", "Durchschnittsbürgers", rule, lt);
    assertFirstSuggestion("Heileit", "Highlight", rule, lt);
    assertFirstSuggestion("todesbedrohende", "lebensbedrohende", rule, lt);
    assertFirstSuggestion("todesbedrohliches", "lebensbedrohliches", rule, lt);
    assertFirstSuggestion("einfühlsvoller", "einfühlsamer", rule, lt);
    assertFirstSuggestion("folklorisch", "folkloristisch", rule, lt);
    assertFirstSuggestion("Religiösischen", "Religiösen", rule, lt);
    assertFirstSuggestion("reschaschiert", "recherchiert", rule, lt);
    assertFirstSuggestion("bißjen", "bisschen", rule, lt);
    assertFirstSuggestion("bisien", "bisschen", rule, lt);
    assertFirstSuggestion("Gruessen", "Grüßen", rule, lt);
    //assertFirstSuggestion("Matschscheibe", "Mattscheibe", rule, lt);
    assertFirstSuggestion("Pearl-Harbour", "Pearl Harbor", rule, lt);
    assertFirstSuggestion("Autonomität", "Autonomie", rule, lt);
    assertFirstSuggestion("Kompatibelkeit", "Kompatibilität", rule, lt);
    assertFirstSuggestion("Sensibelkeit", "Sensibilität", rule, lt);
    assertFirstSuggestion("Flexibelkeit", "Flexibilität", rule, lt);
    assertFirstSuggestion("WiFi-Direkt", "Wi-Fi Direct", rule, lt);
    assertFirstSuggestion("Wi-Fi-Direct", "Wi-Fi Direct", rule, lt);
    assertFirstSuggestion("hofen", "hoffen", rule, lt);
    assertFirstSuggestion("frustuck", "Frühstück", rule, lt);
    assertFirstSuggestion("recourcen", "Ressourcen", rule, lt);
    assertFirstSuggestion("familiärische", "familiäre", rule, lt);
    assertFirstSuggestion("familliarisches", "familiäres", rule, lt);
    assertFirstSuggestion("sommerverie", "Sommerferien", rule, lt);
    assertFirstSuggestion("thelepatie", "Telepathie", rule, lt);
    assertFirstSuggestion("artz", "Arzt", rule, lt);
    assertFirstSuggestion("berücksichtung", "Berücksichtigung", rule, lt);
    assertFirstSuggestion("okey", "okay", rule, lt);
    assertFirstSuggestion("Energiesparung", "Energieeinsparung", rule, lt);
    assertFirstSuggestion("Deluxe-Version", "De-luxe-Version", rule, lt);
    assertFirstSuggestion("De-luxe-Champagnr", "De-luxe-Champagner", rule, lt);
    assertFirstSuggestion("problemhafte", "problembehaftete", rule, lt);
    assertFirstSuggestion("solltes", "solltest", rule, lt);
    assertFirstSuggestion("Kilimanjaro", "Kilimandscharo", rule, lt);
    assertFirstSuggestion("unzerbrechbare", "unzerbrechliche", rule, lt);
    assertFirstSuggestion("voraussichtige", "voraussichtliche", rule, lt);
    assertFirstSuggestion("Aleine", "Alleine", rule, lt);
    assertFirstSuggestion("abenzu", "ab und zu", rule, lt);
    assertFirstSuggestion("ergeitz", "Ehrgeiz", rule, lt);
    assertFirstSuggestion("chouch", "Couch", rule, lt);
    assertFirstSuggestion("kontaktfreundliche", "kontaktfreudige", rule, lt);
    assertFirstSuggestion("angestegt", "angesteckt", rule, lt);
    assertFirstSuggestion("festellt", "feststellt", rule, lt);
    assertFirstSuggestion("liqide", "liquide", rule, lt);
    assertFirstSuggestion("gelessen", "gelesen", rule, lt);
    assertFirstSuggestion("Getrixe", "Getrickse", rule, lt);
    assertFirstSuggestion("Naricht", "Nachricht", rule, lt);
    assertFirstSuggestion("konektschen", "Connection", rule, lt);
    assertFirstSuggestion("Neukundenaquise", "Neukundenakquise", rule, lt);
    assertFirstSuggestion("Gehorsamkeitsverweigerung", "Gehorsamsverweigerung", rule, lt);
    assertFirstSuggestion("leinensamens", "Leinsamens", rule, lt);
    assertFirstSuggestion("Oldheimer", "Oldtimer", rule, lt);
    assertFirstSuggestion("verhing", "verhängte", rule, lt);
    assertFirstSuggestion("vorallendingen", "vor allen Dingen", rule, lt);
    assertFirstSuggestion("unternehmenslüstige", "unternehmungslustige", rule, lt);
    assertFirstSuggestion("proffesionaler", "professioneller", rule, lt);
    assertFirstSuggestion("gesundliches", "gesundheitliches", rule, lt);
    assertFirstSuggestion("eckelt", "ekelt", rule, lt);
    assertFirstSuggestion("geherte", "geehrte", rule, lt);
    assertFirstSuggestion("Kattermesser", "Cuttermesser", rule, lt);
    assertFirstSuggestion("antisemitistischer", "antisemitischer", rule, lt);
    assertFirstSuggestion("unvorsehbares", "unvorhersehbares", rule, lt);
    assertFirstSuggestion("Würtenberg", "Württemberg", rule, lt);
    assertFirstSuggestion("Baden-Würtenbergs", "Baden-Württembergs", rule, lt);
  });

  // Java: GermanSpellerRuleTest#testGetAdditionalTopSuggestions (part 3 of 5; split to keep single synchronous test bodies short)
  it('testGetAdditionalTopSuggestions part 3', () => {
    let rule = new GermanSpellerRule(deMessages(), GERMAN_DE);
    let lt = newLt(GERMAN_DE);
    //assertFirstSuggestion("Rechtsschreibungsfehlern", "Rechtschreibfehlern", rule, lt);
    assertFirstSuggestion("indifiziert", "identifiziert", rule, lt);
    assertFirstSuggestion("verblüte", "verblühte", rule, lt);
    assertFirstSuggestion("dreitem", "drittem", rule, lt);
    assertFirstSuggestion("zukuenftliche", "zukünftige", rule, lt);
    assertFirstSuggestion("schwarzwälderkirschtorte", "Schwarzwälder Kirschtorte", rule, lt);
    assertFirstSuggestion("kolegen", "Kollegen", rule, lt);
    assertFirstSuggestion("gerechtlichkeit", "Gerechtigkeit", rule, lt);
    assertFirstSuggestion("Zuverlässlichkeit", "Zuverlässigkeit", rule, lt);
    //assertFirstSuggestion("Krankenhausen", "Krankenhäusern", rule, lt);
    assertFirstSuggestion("jedwilliger", "jedweder", rule, lt);
    assertFirstSuggestion("Betriebsratzimmern", "Betriebsratszimmern", rule, lt);
    assertFirstSuggestion("ausiehst", "aussiehst", rule, lt);
    assertFirstSuggestion("unterbemittelnde", "minderbemittelte", rule, lt);
    assertFirstSuggestion("koregiert", "korrigiert", rule, lt);
    assertFirstSuggestion("Gelangenheitsbestätigungen", "Gelangensbestätigungen", rule, lt);
    assertFirstSuggestion("mitenand", "miteinander", rule, lt);
    assertFirstSuggestion("hinunher", "hin und her", rule, lt);
    assertFirstSuggestion("Xter", "X-ter", rule, lt);
    assertFirstSuggestion("Kaufentfehlung", "Kaufempfehlung", rule, lt);
    assertFirstSuggestion("unverzeilige", "unverzeihliche", rule, lt);
    assertFirstSuggestion("Addons", "Add-ons", rule, lt);
    assertFirstSuggestion("Mitgliederinnen", "Mitglieder", rule, lt);
    assertFirstSuggestion("Feinleiner", "Fineliner", rule, lt);
    assertFirstSuggestion("größester", "größter", rule, lt);
    assertFirstSuggestion("verhäufte", "gehäufte", rule, lt);
    assertFirstSuggestion("naheste", "nächste", rule, lt);
    assertFirstSuggestion("fluoreszenzierend", "fluoreszierend", rule, lt);
    assertFirstSuggestion("revalierender", "rivalisierender", rule, lt);
    assertFirstSuggestion("häherne", "härene", rule, lt);
    assertFirstSuggestion("Portfolien", "Portfolios", rule, lt);
    assertFirstSuggestion("Nivo", "Niveau", rule, lt);
    assertFirstSuggestion("dilletanten", "Dilettanten", rule, lt);
    assertFirstSuggestion("intersannt", "interessant", rule, lt);
    assertFirstSuggestion("allereinzigstem", "einzigem", rule, lt);
    assertFirstSuggestion("Einzigste", "Einzige", rule, lt);
    assertFirstSuggestion("namenhafte", "namhafte", rule, lt);
    assertFirstSuggestion("homeophatisch", "homöopathisch", rule, lt);
    assertFirstSuggestion("verswindet", "verschwindet", rule, lt);
    assertFirstSuggestion("Durschnitt", "Durchschnitt", rule, lt);
    assertFirstSuggestion("Durchnitts", "Durchschnitts", rule, lt);
    assertFirstSuggestion("überdurschnittlichem", "überdurchschnittlichem", rule, lt);
    assertFirstSuggestion("Unterdurschnittlicher", "Unterdurchschnittlicher", rule, lt);
    assertFirstSuggestion("höchstwahrliche", "höchstwahrscheinliche", rule, lt);
    assertFirstSuggestion("vidasehen", "wiedersehen", rule, lt);
    assertFirstSuggestion("striktliches", "striktes", rule, lt);
    assertFirstSuggestion("preventiert", "verhindert", rule, lt);
    assertFirstSuggestion("zurverfügung", "zur Verfügung", rule, lt);
    assertFirstSuggestion("trationelle", "traditionelle", rule, lt);
    assertFirstSuggestion("achsiales", "axiales", rule, lt);
    assertFirstSuggestion("famiele", "Familie", rule, lt);
    assertFirstSuggestion("miters", "Mieters", rule, lt);
    assertFirstSuggestion("besigen", "besiegen", rule, lt);
    assertFirstSuggestion("verziehrte", "verzierte", rule, lt);
    assertFirstSuggestion("pieken", "piken", rule, lt); // Duden insists on this spelling
    assertFirstSuggestion("Erstsemesterin", "Erstsemester", rule, lt);
    assertFirstSuggestion("zauberlicher", "zauberischer", rule, lt);
    assertFirstSuggestion("assessoars", "Accessoires", rule, lt);
    assertFirstSuggestion("könntes", "könntest", rule, lt);
    assertFirstSuggestion("Casemangement", "Case Management", rule, lt);
    assertFirstSuggestion("Anolierung", "Annullierung", rule, lt);
    assertFirstSuggestion("Liaisonen", "Liaisons", rule, lt);
    assertFirstSuggestion("kinderlichem", "kindlichem", rule, lt);
    assertFirstSuggestion("wiedersprichst", "widersprichst", rule, lt);
    assertFirstSuggestion("unproffesionele", "unprofessionelle", rule, lt);
    assertFirstSuggestion("gefrustuckt", "gefrühstückt", rule, lt);
    assertFirstSuggestion("Durführung", "Durchführung", rule, lt);
    assertFirstSuggestion("verheielte", "verheilte", rule, lt);
    assertFirstSuggestion("ausgewönlich", "außergewöhnlich", rule, lt);
    assertFirstSuggestion("unausweichbaren", "unausweichlichen", rule, lt);
    assertFirstSuggestion("Dampfschiffahrtskapitän", "Dampfschifffahrtskapitän", rule, lt);
    assertFirstSuggestion("Helfes-Helfern", "Helfershelfern", rule, lt);
    assertFirstSuggestion("Intelligentsbestie", "Intelligenzbestie", rule, lt);
    assertFirstSuggestion("avantgardische", "avantgardistische", rule, lt);
    assertFirstSuggestion("gewohnheitsbedürftigen", "gewöhnungsbedürftigen", rule, lt);
    assertFirstSuggestion("patroliert", "patrouilliert", rule, lt);
    assertFirstSuggestion("beidiges", "beides", rule, lt);
    assertFirstSuggestion("revolutioniesiert", "revolutioniert", rule, lt);
    assertFirstSuggestion("Copyride", "Copyright", rule, lt);
    assertFirstSuggestion("angesehende", "angesehene", rule, lt);
  });

  // Java: GermanSpellerRuleTest#testGetAdditionalTopSuggestions (part 4 of 5; split to keep single synchronous test bodies short)
  it('testGetAdditionalTopSuggestions part 4', () => {
    let rule = new GermanSpellerRule(deMessages(), GERMAN_DE);
    let lt = newLt(GERMAN_DE);
    assertFirstSuggestion("angesehendsten", "angesehensten", rule, lt);
    assertFirstSuggestion("frühstücksbüfé", "Frühstücksbuffet", rule, lt);
    assertFirstSuggestion("deutsprachiger", "deutschsprachiger", rule, lt);
    assertFirstSuggestion("gehäckelten", "gehäkelten", rule, lt);
    assertFirstSuggestion("Alterego", "Alter Ego", rule, lt);
    assertFirstSuggestion("Makeupstylistin", "Make-up-Stylistin", rule, lt);
    assertFirstSuggestion("islamophobische", "islamophobe", rule, lt);
    assertFirstSuggestion("Fedbäck", "Feedback", rule, lt);
    assertFirstSuggestion("desöfterem", "des Öfteren", rule, lt);
    assertFirstSuggestion("momentmal", "Moment mal", rule, lt);
    assertFirstSuggestion("eingängliche", "eingängige", rule, lt);
    assertFirstSuggestion("kusengs", "Cousins", rule, lt);
    assertFirstSuggestion("Influenzer", "Influencer", rule, lt);
    assertFirstSuggestion("kaperzität", "Kapazität", rule, lt);
    assertFirstSuggestion("ausversehendlich", "aus Versehen", rule, lt);
    assertFirstSuggestion("tränern", "Trainern", rule, lt);
    assertFirstSuggestion("Teiming", "Timing", rule, lt);
    assertFirstSuggestion("inzinierung", "Inszenierung", rule, lt);
    assertFirstSuggestion("weireten", "weiteren", rule, lt);
    assertFirstSuggestion("Nivoschalters", "Niveauschalters", rule, lt);
    assertFirstSuggestion("exhibitionischer", "exhibitionistischer", rule, lt);
    assertFirstSuggestion("geschalten", "geschaltet", rule, lt);
    assertFirstSuggestion("unterschiebenes", "unterschriebenes", rule, lt);
    assertFirstSuggestion("Umbekwehmer", "Unbequemer", rule, lt);
    assertFirstSuggestion("Unbequemliche", "Unbequeme", rule, lt);
    assertFirstSuggestion("unbequemlichstes", "unbequemstes", rule, lt);
    assertFirstSuggestion("Desatören", "Deserteuren", rule, lt);
    assertFirstSuggestion("Panelen", "Paneelen", rule, lt);
    assertFirstSuggestion("Deja-Vue", "Déjà-vu", rule, lt);
    assertFirstSuggestion("Dejavou", "Déjà-vu", rule, lt);
    assertFirstSuggestion("Cremefraiche", "Crème fraîche", rule, lt);
    assertFirstSuggestion("aragemont", "Arrangement", rule, lt);
    assertFirstSuggestion("Diseing", "Design", rule, lt);
    assertFirstSuggestion("Lieradresse", "Lieferadresse", rule, lt);
    assertFirstSuggestion("Boykutierung", "Boykottierung", rule, lt);
    assertFirstSuggestion("rethorisch", "rhetorisch", rule, lt);
    assertFirstSuggestion("anschliessliche", "anschließende", rule, lt);
    assertFirstSuggestion("Überstreitung", "Überschreitung", rule, lt);
    assertFirstSuggestion("werkzeug.", "Werkzeug", rule, lt);
    assertFirstSuggestion("Wärkzeug.", "Werkzeug", rule, lt);
    //assertFirstSuggestion("Fußgängerunterweg", "Fußgängerunterführung", rule, lt);
    assertFirstSuggestion("Ingineuer", "Ingenieur", rule, lt);
    assertFirstSuggestion("Panacotta", "Panna cotta", rule, lt);
    assertFirstSuggestion("Ärcker", "Erker", rule, lt);
    assertFirstSuggestion("genrealistischer", "generalistischer", rule, lt);
    assertFirstSuggestion("schweinerosane", "schweinchenrosa", rule, lt);
    assertFirstSuggestion("anstecklichen", "ansteckenden", rule, lt);
    assertFirstSuggestion("geflechtetes", "geflochtenes", rule, lt);
    assertFirstSuggestion("ärtlichem", "ärztlichem", rule, lt);
    assertFirstSuggestion("großzüges", "großzügiges", rule, lt);
    assertFirstSuggestion("Einbahnfrei", "Einwandfrei", rule, lt);
    assertFirstSuggestion("einbandfreier", "einwandfreier", rule, lt);
    assertFirstSuggestion("Beanstandigung", "Beanstandung", rule, lt);
    assertFirstSuggestion("Beanstandigungen", "Beanstandungen", rule, lt);
    assertFirstSuggestion("zweiundhalb", "zweieinhalb", rule, lt);
    assertFirstSuggestion("dreiundhalb", "dreieinhalb", rule, lt);
    assertFirstSuggestion("Zuguterletzt", "Zu guter Letzt", rule, lt);
    assertFirstSuggestion("guterletzt", "guter Letzt", rule, lt);
    assertFirstSuggestion("unfährer", "unfairer", rule, lt);
    assertFirstSuggestion("unfäre", "unfaire", rule, lt);
    assertFirstSuggestion("medikatöses", "medikamentöses", rule, lt);
    assertFirstSuggestion("versendliches", "versehentliches", rule, lt);
    assertFirstSuggestion("Nootbooks", "Notebooks", rule, lt);
    assertFirstSuggestion("Eigtl", "Eigtl.", rule, lt);
    assertFirstSuggestion("pflanzige", "pflanzliche", rule, lt);
    assertFirstSuggestion("geblogt", "gebloggt", rule, lt);
    assertFirstSuggestion("ähliche", "ähnliche", rule, lt);
    assertFirstSuggestion("entfängt", "empfängt", rule, lt);
    assertFirstSuggestion("verewiglichte", "verewigte", rule, lt);
    assertFirstSuggestion("zeritifierte", "zertifizierte", rule, lt);
    assertFirstSuggestion("gerähte", "Geräte", rule, lt);
    assertFirstSuggestion("pirsing", "Piercing", rule, lt);
    assertFirstSuggestion("behilfreiches", "behilfliches", rule, lt);
    assertFirstSuggestion("einsichtbar", "einsehbar", rule, lt);
    assertFirstSuggestion("vollrichtest", "verrichtest", rule, lt);
    assertFirstSuggestion("Vollrichtet", "Verrichtet", rule, lt);
    assertFirstSuggestion("bedingslosem", "bedingungslosem", rule, lt);
    assertFirstSuggestion("überstenden", "berstenden", rule, lt);
    assertFirstSuggestion("abbonierst", "abonnierst", rule, lt);
    assertFirstSuggestion("Apeliere", "Appelliere", rule, lt);
  });

  // Java: GermanSpellerRuleTest#testGetAdditionalTopSuggestions (part 5 of 5; split to keep single synchronous test bodies short)
  it('testGetAdditionalTopSuggestions part 5', () => {
    let rule = new GermanSpellerRule(deMessages(), GERMAN_DE);
    let lt = newLt(GERMAN_DE);
    assertFirstSuggestion("voltieschiert", "voltigiert", rule, lt);
    assertFirstSuggestion("meistverkaufteste", "meistverkaufte", rule, lt);
    assertFirstSuggestion("unleshaftem", "unleserlichem", rule, lt);
    assertFirstSuggestion("glaubenswürdig", "glaubwürdig", rule, lt);
    assertFirstSuggestion("nivovolle", "niveauvolle", rule, lt);
    assertFirstSuggestion("niwovoller", "niveauvoller", rule, lt);
    assertFirstSuggestion("notgezwungender", "notgedrungener", rule, lt);
    assertFirstSuggestion("misstraurig", "misstrauisch", rule, lt);
    assertFirstSuggestion("Aux-Anschluss", "AUX-Anschluss", rule, lt);
    assertFirstSuggestion("Wi", "Wie", rule, lt);
    assertFirstSuggestion("Verspäterung", "Verspätung", rule, lt);
    assertFirstSuggestion("groesste", "größte", rule, lt);
    assertFirstSuggestion("tefonische", "telefonische", rule, lt);
    assertFirstSuggestion("optimalisiert", "optimiert", rule, lt);
    assertFirstSuggestion("introvertisches", "introvertiertes", rule, lt);
    assertFirstSuggestion("Entercotte", "Entrecôte", rule, lt);
    assertFirstSuggestion("hirachie", "Hierarchie", rule, lt);
    assertFirstSuggestion("amierte", "armierte", rule, lt);
    assertFirstSuggestion("Versiehrten", "Versierten", rule, lt);
    assertFirstSuggestion("durchsichtbar", "durchsichtig", rule, lt);
    assertFirstSuggestion("offensichtiges", "offensichtliches", rule, lt);
    assertFirstSuggestion("zurverfühgung", "zur Verfügung", rule, lt);
    assertFirstSuggestion("Bewusstliches", "Bewusstes", rule, lt);
    assertFirstSuggestion("leidensvolle", "leidvolle", rule, lt);
    assertFirstSuggestion("augensichtlich", "augenscheinlich", rule, lt);
    assertFirstSuggestion("Krankenbrüdern", "Krankenpflegern", rule, lt);
    assertFirstSuggestion("Lan-Kabel", "LAN-Kabel", rule, lt);
    assertFirstSuggestion("perfekteste", "perfekte", rule, lt);
    assertFirstSuggestion("gleichtig", "gleichzeitig", rule, lt);
    assertFirstSuggestion("vorsichgeht", "vor sich geht", rule, lt);
    assertFirstSuggestion("Simkarte", "SIM-Karte", rule, lt);
    assertFirstSuggestion("Pineingabe", "PIN-Eingabe", rule, lt);
    assertFirstSuggestion("carnivorischen", "karnivoren", rule, lt);
    assertFirstSuggestion("Zaubererinnen", "Zauberinnen", rule, lt);
    assertFirstSuggestion("erroriere", "eruiere", rule, lt);
    assertFirstSuggestion("erroriert", "eruiert", rule, lt);
    assertFirstSuggestion("Second-Hand-Shops", "Secondhandshops", rule, lt);
    assertFirstSuggestion("mediterranischer", "mediterraner", rule, lt);
    assertFirstSuggestion("unterschreibungsfähige", "unterschriftsfähige", rule, lt);
    assertFirstSuggestion("interplementiert", "implementiert", rule, lt);
    assertFirstSuggestion("hochalterlich", "hochmittelalterlich", rule, lt);
    assertFirstSuggestion("posiniert", "positioniert", rule, lt);
    assertFirstSuggestion("russophobische", "russophobe", rule, lt);
    assertFirstSuggestion("unsachmässiger", "unsachgemäßer", rule, lt);
    assertFirstSuggestion("modernisches", "modernes", rule, lt);
    assertFirstSuggestion("intapretation", "Interpretation", rule, lt);
    assertFirstSuggestion("Rethorikkurses", "Rhetorikkurses", rule, lt);
    assertFirstSuggestion("Deprisonen", "Depressionen", rule, lt);

    assertFirstSuggestion("battalione", "Bataillone", rule, lt);
    assertFirstSuggestion("Besuchungsverbot", "Besuchsverbot", rule, lt);
    assertFirstSuggestion("widersprüchiges", "widersprüchliches", rule, lt);
    assertFirstSuggestion("camelionhafte", "chamäleonhafte", rule, lt);
    assertFirstSuggestion("angehangenen", "angehängten", rule, lt);
    assertFirstSuggestion("spätrige", "spätere", rule, lt);
    assertFirstSuggestion("faustigen", "faustdicken", rule, lt);
    assertFirstSuggestion("Belastungsekgs", "Belastungs-EKGs", rule, lt);
    assertFirstSuggestion("-Teex", "Tee", rule, lt);
    assertFirstSuggestion("- Teex", "Tee", rule, lt);
    assertFirstSuggestion("- Kaffeex", "Kaffee", rule, lt);
    assertFirstSuggestion("E -Commerce", "E-Commerce", rule, lt);
    assertFirstSuggestion("Intranzparentheit", "Intransparenz", rule, lt);
    assertFirstSuggestion("aufkeinenfal", "auf keinen Fall", rule, lt);
    assertFirstSuggestion("unverantwortunglosen", "verantwortungslosen", rule, lt);
    assertFirstSuggestion("unverantwortungslose", "verantwortungslose", rule, lt);
    assertFirstSuggestion("neuliche", "neuerliche", rule, lt);
    assertFirstSuggestion("kompensioniert", "kompensiert", rule, lt);
    assertFirstSuggestion("desinfektionierender", "desinfizierender", rule, lt);
    assertFirstSuggestion("Desinfektioniert", "Desinfiziert", rule, lt);
    assertFirstSuggestion("desinfektionierst", "desinfizierst", rule, lt);
    assertFirstSuggestion("Neuhichkeit", "Neuigkeit", rule, lt);
    assertFirstSuggestion("neuhichkeiten", "Neuigkeiten", rule, lt);
    assertFirstSuggestion("Maßname", "Maßnahme", rule, lt);
    assertFirstSuggestion("Maßnamen", "Maßnahmen", rule, lt);
    assertFirstSuggestion("Analysemaßname", "Analysemaßnahme", rule, lt);
    assertFirstSuggestion("Analysemaßnamen", "Analysemaßnahmen", rule, lt);
    assertFirstSuggestion("Analysemassnamen", "Analysemaßnahmen", rule, lt);

  });

  // Java: GermanSpellerRuleTest#testAddIgnoreWords
  it('testAddIgnoreWords', () => {
    let rule = new MyGermanSpellerRule(deMessages(), GERMAN_DE);
    rule.addIgnoreWords("Fußelmappse");
    let lt = newLt(GERMAN_DE);
    assertCorrect("Fußelmappse", rule, lt);
    rule.addIgnoreWords("Fußelmappse/N");
    assertCorrect("Fußelmappse", rule, lt);
    assertCorrect("Fußelmappsen", rule, lt);
    rule.addIgnoreWords("Toggeltröt/NS");
    assertCorrect("Toggeltröt", rule, lt);
    assertCorrect("Toggeltröts", rule, lt);
    assertCorrect("Toggeltrötn", rule, lt);
    let ruleCH = new MyGermanSpellerRule(deMessages(), GERMAN_CH);
    ruleCH.addIgnoreWords("Fußelmappse/N");
    assertCorrect("Fusselmappse", ruleCH, lt);
    assertCorrect("Fusselmappsen", ruleCH, lt);
    assertCorrect("Coronapatienten", rule, lt);
    assertCorrect("Coronapatienten.", rule, lt);

    assertCorrect("Universitätsmitarbeitende", rule, lt);
    assertCorrect("Universitätsmitarbeitenden", rule, lt);
    assertIncorrect("Xyzmitarbeitende", rule, lt);
    assertIncorrect("Xyzmitarbeitenden", rule, lt);
    assertIncorrect("Universitetsmitarbeitende", rule, lt);
    assertIncorrect("Universitetsmitarbeitenden", rule, lt);
  });

  // Java: GermanSpellerRuleTest#testDashAndHyphenEtc
  it('testDashAndHyphenEtc', () => {
    let rule = new GermanSpellerRule(deMessages(), GERMAN_DE);
    let lt = new JLanguageTool(GERMAN_DE);
    disableAllRulesExcept(lt, GermanSpellerRule.RULE_ID);

    expect(lt.check("\uFEFF-Product Development Coordinator").length).toEqual(2);
    expect(lt.check("-Product Development Coordinator").length).toEqual(2);
    expect(lt.check("\uFEFF-Einx Test").length).toEqual(1);
    expect(lt.check("\uFEFF-Ein Test").length).toEqual(0);
    expect(lt.check("Gratis E\uFEFF-Book").length).toEqual(0);

    // "-" as bullet point with no space:
    expect(lt.check("-Tee\n\n-Kaffee").length).toEqual(0);
    let matches1 = lt.check("-Teex\n\n-Kaffee");
    expect(matches1.length).toEqual(1);
    expect(matches1[0].getFromPos()).toEqual(1);
    expect(matches1[0].getToPos()).toEqual(5);
    let matches2 = lt.check("- Teex\n\n-Kaffee");
    expect(matches2.length).toEqual(1);
    expect(matches2[0].getFromPos()).toEqual(2);
    expect(matches2[0].getToPos()).toEqual(6);

    expect(rule.match(lt.getAnalyzedSentence("Ist doch - gut")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Ist doch -- gut")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Stil- und Grammatikprüfung gut")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Stil- bzw. Grammatikprüfung gut")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Oliven- und Mandelöl")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Stil-, Text- und Grammatikprüfung gut")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Er liebt die Stil-, Text- und Grammatikprüfung.")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Stil-, Text- und Grammatikprüfung")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Stil-, Text- oder Grammatikprüfung")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Hierzu zählen Einkommen-, Körperschaft- sowie Gewerbesteuer.")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Miet- und Zinseinkünfte")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("SPD- und CDU-Abgeordnete")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Haupt- und Nebensatz")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Vertuschungs- und Bespitzelungsmaßnahmen")).length).toEqual(0); // remove "s" from "Vertuschungs" before spell check
//    assertEquals(0, rule.match(lt.getAnalyzedSentence("Au-pair-Agentur")).length); // compound with ignored word from spelling.txt
    expect(rule.match(lt.getAnalyzedSentence("Netflix-Film")).length).toEqual(0); // compound with ignored word from spelling.txt
    expect(rule.match(lt.getAnalyzedSentence("Bund-Länder-Kommission")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Des World Wide Webs")).length).toEqual(0); // expanded multi-word entry from spelling.txt
    expect(rule.match(lt.getAnalyzedSentence("Der westperuanische Ferienort.")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("„Pumpe“-Nachfolge")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("\"Pumpe\"-Nachfolge")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("ÖVP- und FPÖ-Chefverhandler")).length).toEqual(0); // first part is from spelling.txt
    expect(rule.match(lt.getAnalyzedSentence("α-Strahlung")).length).toEqual(0); // compound with ignored word from spelling.txt
    expect(rule.match(lt.getAnalyzedSentence("Primär-α-Mischkristallen")).length).toEqual(0); // compound with ignored word from spelling.txt
    expect(rule.match(lt.getAnalyzedSentence("supergut")).length).toEqual(0); // elativ meaning "sehr gut"
    expect(rule.match(lt.getAnalyzedSentence("90°-Winkel")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Kosten- und Kreditmanagement")).length).toEqual(0);

    expect(rule.match(lt.getAnalyzedSentence("Miet und Zinseinkünfte")).length).toEqual(1);
    expect(rule.match(lt.getAnalyzedSentence("Stil- und Grammatik gut")).length).toEqual(1);
    expect(rule.match(lt.getAnalyzedSentence("Flasch- und Grammatikprüfung gut")).length).toEqual(1);
    //assertEquals(1, rule.match(langTool.getAnalyzedSentence("Haupt- und Neben")).length);  // hunspell accepts this :-(

    // check acceptance of words in ignore.txt ending with "-*"
    expect(rule.match(lt.getAnalyzedSentence("Dual-Use-Güter")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Dual-Use- und Wirtschaftsgüter")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Test-Dual-Use")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Dual-Use")).length).toEqual(1);
    expect(rule.match(lt.getAnalyzedSentence("Einpseudowortmitßfürlanguagetooltests-Auto")).length).toEqual(0);

    // from spelling.txt, also accepted as uppercase variant:
    expect(rule.match(lt.getAnalyzedSentence("-ablenkungsfrei")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("-ablenkungsfreies")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("-Ablenkungsfrei")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("-Ablenkungsfreies")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("- Ablenkungsfrei")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("- Ablenkungsfreies")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("abmantelung")).length).toEqual(1);  // only as uppercase in spelling.txt
    expect(rule.match(lt.getAnalyzedSentence("- abmantelung")).length).toEqual(1);
    expect(rule.match(lt.getAnalyzedSentence("machtS")).length).toEqual(1);
    expect(rule.match(lt.getAnalyzedSentence("All-Inclusive-Preis")).length).toEqual(1);
    expect(rule.match(lt.getAnalyzedSentence("dRanging")).length).toEqual(1);
    expect(rule.match(lt.getAnalyzedSentence("Das Draufklicken")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Des Draufklickens")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Des draufklickens")).length).toEqual(1);

    // originally from spelling.txt:
    expect(rule.match(lt.getAnalyzedSentence("Wichtelmännchen")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Wichtelmännchens")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("wichtelmännchen")).length).toEqual(1);  // no reason to accept it as lowercase
    expect(rule.match(lt.getAnalyzedSentence("wichtelmännchens")).length).toEqual(1);  // no reason to accept it as lowercase

    expect(rule.match(lt.getAnalyzedSentence("vorgehängt")).length).toEqual(0);  // from spelling.txt
    expect(rule.match(lt.getAnalyzedSentence("vorgehängten")).length).toEqual(0);  // from spelling.txt with suffix
    expect(rule.match(lt.getAnalyzedSentence("Vorgehängt")).length).toEqual(0);  // from spelling.txt, it's lowercase there but we accept uppercase at idx = 0
    expect(rule.match(lt.getAnalyzedSentence("Vorgehängten")).length).toEqual(0);  // from spelling.txt with suffix, it's lowercase there but we accept uppercase at idx = 0
    expect(rule.match(lt.getAnalyzedSentence("Wichtelmännchen-vorgehängt")).length).toEqual(0);  // from spelling.txt formed hyphenated compound
    expect(rule.match(lt.getAnalyzedSentence("Wichtelmännchen-Au-pair")).length).toEqual(0);  // from spelling.txt formed hyphenated compound

    expect(rule.match(lt.getAnalyzedSentence("Fermi-Dirac-Statistik")).length).toEqual(0);  // from spelling.txt formed hyphenated compound
    expect(rule.match(lt.getAnalyzedSentence("To-go-Becher")).length).toEqual(0);  // from spelling.txt formed hyphenated compound
//    assertEquals(0, rule.match(lt.getAnalyzedSentence("Au-pair-Wichtelmännchen")).length);  // from spelling.txt formed hyphenated compound
//    assertEquals(0, rule.match(lt.getAnalyzedSentence("Secondhandware")).length);  // from spelling.txt formed compound
//    assertEquals(0, rule.match(lt.getAnalyzedSentence("Feynmandiagramme")).length);  // from spelling.txt formed compound
//    assertEquals(0, rule.match(lt.getAnalyzedSentence("Helizitätsoperator")).length);  // from spelling.txt formed compound
//    assertEquals(0, rule.match(lt.getAnalyzedSentence("Wodkaherstellung")).length);  // from spelling.txt formed compound
    expect(rule.match(lt.getAnalyzedSentence("Latte-macchiato-Glas")).length).toEqual(0);  // formerly from spelling.txt formed compound
    expect(rule.match(lt.getAnalyzedSentence("Werkverträgler-Glas")).length).toEqual(0);  // from spelling.txt formed compound
    expect(rule.match(lt.getAnalyzedSentence("Werkverträglerglas")).length).toEqual(0);  // from spelling.txt formed compound
    expect(rule.match(lt.getAnalyzedSentence("Werkverträglerdu")).length).toEqual(1);  // from spelling.txt formed "compound" with last part too short
//    assertEquals(0, rule.match(lt.getAnalyzedSentence("No-Name-Hersteller")).length);  // from spelling.txt formed compound
    expect(rule.match(lt.getAnalyzedSentence("Helizitätso")).length).toEqual(1);  // from spelling.txt formed compound (second part is too short)
    expect(rule.match(lt.getAnalyzedSentence("Feynmand")).length).toEqual(1);  // from spelling.txt formed compound (second part is too short)

    expect(rule.match(lt.getAnalyzedSentence("Einpseudowortmitssfürlanguagetooltests-Auto")).length).toEqual(1);
    let ruleCH = new GermanSpellerRule(deMessages(), GERMAN_CH);
    expect(ruleCH.match(lt.getAnalyzedSentence("Einpseudowortmitßfürlanguagetooltests-Auto")).length).toEqual(1);
    expect(ruleCH.match(lt.getAnalyzedSentence("Einpseudowortmitssfürlanguagetooltests-Auto")).length).toEqual(0);

    // bullet points in Google Docs:
    expect(rule.match(lt.getAnalyzedSentence("\uFEFFAblenkungsfreie Schreibumgebung")).length).toEqual(0);

    expect(rule.match(lt.getAnalyzedSentence("Die blablaxx.mp3 und das sdifguds.avi bzw. die XYZXYZ.AVI")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Ausgestrahlt von 3sat")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Ein 32stel eines Loses")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Der Verlust eines 32stels eines Loses")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Ein 5tel eines Loses")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Der Verlust eines 5tels eines Loses")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("ein 100stel-Millimeter")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("ein 5tel-Gramm")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("ein 100stel-Milimeter")).length).toEqual(1);
    expect(rule.match(lt.getAnalyzedSentence("ein 5tel-Grömm")).length).toEqual(1);
    expect(rule.match(lt.getAnalyzedSentence("ein 5tl-Gramm")).length).toEqual(1);
    expect(rule.match(lt.getAnalyzedSentence("ein 100stl-Millimeter")).length).toEqual(1);
    expect(rule.match(lt.getAnalyzedSentence("ein tl-Gramm")).length).toEqual(1);
    expect(rule.match(lt.getAnalyzedSentence("ein stl-Millimeter")).length).toEqual(1);
    expect(rule.match(lt.getAnalyzedSentence("ein tel-Gramm")).length).toEqual(1);
    expect(rule.match(lt.getAnalyzedSentence("ein stel-Millimeter")).length).toEqual(1);
    expect(rule.match(lt.getAnalyzedSentence("Bitte stel dich dazu")).length).toEqual(1);
  });

  // Java: GermanSpellerRuleTest#testGetSuggestionsFromSpellingTxt
  it('testGetSuggestionsFromSpellingTxt', () => {
    let ruleGermany = new MyGermanSpellerRule(deMessages(), GERMAN_DE);
    expect(ls(ruleGermany.getSuggestions("Ligafußboll"))).toEqual("[Ligafußball]");  // from spelling.txt, removed: Ligafußballs
    expect(ls(ruleGermany.getSuggestions("free-and-open-source"))).toEqual("[]");  // to prevent OutOfMemoryErrors: do not create hyphenated compounds consisting of >3 parts
    let ruleSwiss = new MyGermanSpellerRule(deMessages(), GERMAN_CH);
    expect(ls(ruleSwiss.getSuggestions("Ligafußboll"))).toEqual("[Ligafussball]"); // removed: Ligafussballs
    expect(ls(ruleSwiss.getSuggestions("konfliktbereid"))).toEqual("[konfliktbereit, konfliktbereite]");
    expect(ls(ruleSwiss.getSuggestions("konfliktbereitel"))).toEqual("[konfliktbereite, konfliktbereiten, konfliktbereitem, konfliktbereiter, konfliktbereites, konfliktbereit]");
  });

  // Java: GermanSpellerRuleTest#testIgnoreWord
  it('testIgnoreWord', () => {
    let ruleGermany = new MyGermanSpellerRule(deMessages(), GERMAN_DE);
    expect(ruleGermany.doIgnoreWord("einPseudoWortFürLanguageToolTests")).toBe(true);  // from ignore.txt
    expect(ruleGermany.doIgnoreWord("Hundhütte")).toBe(false);                 // compound formed from two valid words, but still incorrect
    expect(ruleGermany.doIgnoreWord("Frauversteher")).toBe(false);             // compound formed from two valid words, but still incorrect
    expect(ruleGermany.doIgnoreWord("Wodkasglas")).toBe(false);                // compound formed from two valid words, but still incorrect
    expect(ruleGermany.doIgnoreWord("Author")).toBe(false);
    expect(ruleGermany.doIgnoreWord("SecondhandWare")).toBe(false);            // from spelling.txt formed compound
    expect(ruleGermany.doIgnoreWord("MHDware")).toBe(false);                   // from spelling.txt formed compound
    let ruleSwiss = new MyGermanSpellerRule(deMessages(), GERMAN_CH);
    expect(ruleSwiss.doIgnoreWord("einPseudoWortFürLanguageToolTests")).toBe(true);
    expect(ruleSwiss.doIgnoreWord("Ligafußball")).toBe(false);        // 'ß' never accepted for Swiss
  });

  // Java: GermanSpellerRuleTest#testRuleWithGermanyGerman
  it('testRuleWithGermanyGerman', () => {
    let rule = new GermanSpellerRule(deMessages(), GERMAN_DE);
    let lt = newLt(GERMAN_DE);
    commonGermanAsserts(rule, lt);
    expect(rule.match(lt.getAnalyzedSentence("Der äußere Übeltäter.")).length).toEqual(0);  // umlauts
    expect(rule.match(lt.getAnalyzedSentence("Der äussere Übeltäter.")).length).toEqual(1);
    expect(rule.match(lt.getAnalyzedSentence("Die Mozart'sche Sonate.")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Einbusse")).length).toEqual(1);
    expect(rule.match(lt.getAnalyzedSentence("Einbussen")).length).toEqual(1);
  });

  // Java: GermanSpellerRuleTest#testRuleWithAustrianGerman
  it('testRuleWithAustrianGerman', () => {
    let language = Languages.getLanguageForShortCode("de-AT");
    let rule = new AustrianGermanSpellerRule(deMessages(), language);
    let lt = newLt(language);
    commonGermanAsserts(rule, lt);
    expect(rule.match(lt.getAnalyzedSentence("Der äußere Übeltäter.")).length).toEqual(0);  // umlauts
    expect(rule.match(lt.getAnalyzedSentence("Der äussere Übeltäter.")).length).toEqual(1);
  });

  // Java: GermanSpellerRuleTest#testRuleWithSwissGerman
  it('testRuleWithSwissGerman', () => {
    let language = Languages.getLanguageForShortCode("de-CH");
    let rule = new SwissGermanSpellerRule(deMessages(), language);
    let lt = newLt(language);
    commonGermanAsserts(rule, lt);
    expect(rule.match(lt.getAnalyzedSentence("Der äußere Übeltäter.")).length).toEqual(1);  // ß not allowed in Swiss
    expect(rule.match(lt.getAnalyzedSentence("Der äussere Übeltäter.")).length).toEqual(0);  // ss is used instead of ß
    expect(rule.match(lt.getAnalyzedSentence("Einbusse")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Einbussen")).length).toEqual(0);
  });

  // Java: GermanSpellerRuleTest#testGetSuggestions
  it('testGetSuggestions', () => {
    let rule = new GermanSpellerRule(deMessages(), GERMAN_DE);

    assertCorrection(rule, "Hauk", "Haus", "Haut");
    assertCorrection(rule, "Eisnbahn", "Eisbahn", "Eisenbahn");
    assertCorrection(rule, "Rechtschreipreform", "Rechtschreibreform");
    assertCorrection(rule, "Theatrekasse", "Theaterkasse");
    assertCorrection(rule, "Traprennen", "Trabrennen");
    assertCorrection(rule, "Autuverkehr", "Autoverkehr");
    assertCorrection(rule, "Rechtschreibprüfun", "Rechtschreibprüfung");
    assertCorrection(rule, "Rechtschreib-Prüfun", "Rechtschreib-Prüfung");
    assertCorrection(rule, "bw.", "bzw.");
    assertCorrection(rule, "kan", "kann", "an");
    assertCorrection(rule, "kan.", "kann.", "an.");
    assertCorrection(rule, "Einzahlungschein", "Einzahlungsschein");
    assertCorrection(rule, "Arbeitamt", "Arbeitet", "Arbeitsamt");
    assertCorrection(rule, "Ordnungshütter", "Ordnungshüter");
    assertCorrection(rule, "inneremedizin", "innere Medizin");
    assertCorrection(rule, "innereMedizin", "innere Medizin");
    //assertCorrection(rule, "Inneremedizin", "Innere Medizin");
    assertCorrection(rule, "InnereMedizin", "Innere Medizin");
    assertCorrection(rule, "gleichgroß", "gleich groß");

    //TODO: requires morfologik-speller change (suggestions for known words):
    assertCorrection(rule, "Arbeitamt", "Arbeitsamt");

    assertCorrection(rule, "Autoverkehrr", "Autoverkehr");

    assertCorrection(rule, "hasslich", "hässlich", "fasslich");
    assertCorrection(rule, "Struße", "Strauße", "Straße", "Sträuße");

    assertCorrection(rule, "gewohnlich", "gewöhnlich");
    assertCorrection(rule, "gawöhnlich", "gewöhnlich");
    assertCorrection(rule, "gwöhnlich", "gewöhnlich");
    assertCorrection(rule, "geewöhnlich", "gewöhnlich");
    assertCorrection(rule, "gewönlich", "gewöhnlich");

    assertCorrection(rule, "außergewöhnkich", "außergewöhnlich");
    assertCorrection(rule, "agressiv", "aggressiv");
    assertCorrection(rule, "agressivster", "aggressivster");
    assertCorrection(rule, "agressiver", "aggressiver");
    assertCorrection(rule, "agressive", "aggressive");

    assertCorrection(rule, "Algorythmus", "Algorithmus");
    assertCorrection(rule, "Algorhythmus", "Algorithmus");

    assertCorrection(rule, "Amalgan", "Amalgam");
    assertCorrection(rule, "Amaturenbrett", "Armaturenbrett");
    assertCorrection(rule, "Aquise", "Akquise");
    assertCorrection(rule, "Artzt", "Arzt");

    assertCorrection(rule, "aufgrunddessen", "aufgrund dessen");

    assertCorrection(rule, "barfuss", "barfuß");
    assertCorrection(rule, "Batallion", "Bataillon");
    assertCorrection(rule, "Medallion", "Medaillon");
    assertCorrection(rule, "Scheisse", "Scheiße");
    assertCorrection(rule, "Handselvertreter", "Handelsvertreter");

    assertCorrection(rule, "aul", "auf");
    assertCorrection(rule, "Icj", "Ich");   // only "ich" (lowercase) is in the lexicon
    //assertCorrection(rule, "Ihj", "Ich");   // only "ich" (lowercase) is in the lexicon - does not work because of the limit

    // three part compounds:
    assertCorrection(rule, "Handelsvertretertrffen", "Handelsvertretertreffen");
    assertCorrection(rule, "Handelsvartretertreffen", "Handelsvertretertreffen");
    assertCorrection(rule, "Handelsvertretertriffen", "Handelsvertretertreffen");
    assertCorrection(rule, "Handelsvertrtertreffen", "Handelsvertretertreffen");
    assertCorrection(rule, "Handselvertretertreffen", "Handelsvertretertreffen");

    assertCorrection(rule, "Arbeidszimmer", "Arbeitszimmer");
    assertCorrection(rule, "Postleidzahl", "Postleitzahl");
    assertCorrection(rule, "vorallem", "vor allem");
    assertCorrection(rule, "wieviel", "wie viel");
    assertCorrection(rule, "wieviele", "wie viele");
    assertCorrection(rule, "wievielen", "wie vielen");
    assertCorrection(rule, "undzwar", "und zwar");
    assertCorrection(rule, "Ambei", "Anbei");
    assertCorrection(rule, "Kostn-", "Kosten-");
    assertCorrection(rule, "Adam-Ries-Nachfahrenbuch");

    // TODO: compounds with errors in more than one part
    // totally wrong jwordsplitter split: Hands + elvertretertreffn:
    //assertCorrection(rule, "Handselvertretertreffn", "Handelsvertretertreffen");
  });

  // Java: GermanSpellerRuleTest#testSuggestions
  it('testSuggestions', () => {
    let rule = new GermanSpellerRule(deMessages(), GERMAN_DE);
    let lt = newLt(GERMAN_DE);
    assertFirstSuggestion("informationnen.", "Informationen", rule, lt);
    assertFirstSuggestion("Kundigungsfrist.", "Kündigungsfrist", rule, lt);
    assertFirstSuggestion("aufgeregegt.", "aufgeregt", rule, lt);
    assertFirstSuggestion("informationnen...", "Informationen..", rule, lt);  // not 100% perfect, but we can live with this...
    assertFirstSuggestion("arkbeiten-", "arbeiten", rule, lt);
    //assertFirstSuggestion("arkjbeiten-", "arbeiten", rule, lt);
    // commas are actually not part of the word, so the suggestion doesn't include them:
    assertFirstSuggestion("informationnen,", "Informationen", rule, lt);
    assertFirstSuggestion("ALT-TARIF,", null, rule, lt);
    assertNotSuggestion("Pseudo-Rebellentum", "Pseudo- Rebellentum", rule, lt);
    assertNotSuggestion("Pseudo-Rebellentum", "Pseudo--Rebellentum", rule, lt);
    assertNotSuggestion("Virtualisierungs-Layer", "Virtualisierungs--Layer", rule, lt);
    assertNotSuggestion("Mediations-Background", "Mediation s-Background", rule, lt);
    assertFirstSuggestion("ALT-ÜBERSICHT,", null, rule, lt);
    assertFirstSuggestion("Sakralkultur,", null, rule, lt);
    assertFirstSuggestion("Auschwitzmythxs,", null, rule, lt);  // correction prevented by lcDoNotSuggestWords
    assertFirstSuggestion("Wursteinalgen", "Wursteinlagen", rule, lt);  // "algen" was accepted in de_DE.dic as compound part, we removed it
    assertFirstSuggestion("Wursteinalge", "Wursteinlage", rule, lt);    // "algen" was accepted in de_DE.dic as compound part, we removed it
  });

  // Java: GermanSpellerRuleTest#testGetSuggestionOrder
  it('testGetSuggestionOrder', () => {
    let rule = new GermanSpellerRule(deMessages(), GERMAN_DE);
    assertCorrectionsByOrder(rule, "heisst", "heißt");  // "heißt" should be first
    assertCorrectionsByOrder(rule, "heissen", "heißen");
    assertCorrectionsByOrder(rule, "müßte", "musste", "müsste");
    assertCorrectionsByOrder(rule, "schmohren", "schmoren");
    assertCorrectionsByOrder(rule, "Fänomen", "Phänomen");
    assertCorrectionsByOrder(rule, "homofob", "homophob");
    assertCorrectionsByOrder(rule, "ueber", "über");
    //assertCorrectionsByOrder(rule, "uebel", "übel");
    assertCorrectionsByOrder(rule, "Aerger", "Ärger");
    assertCorrectionsByOrder(rule, "Walt", "Wald");
    assertCorrectionsByOrder(rule, "Rythmus", "Rhythmus");
    assertCorrectionsByOrder(rule, "Rytmus", "Rhythmus");
    assertCorrectionsByOrder(rule, "is", "IS", "die", "in", "im", "ist");  // 'ist' should actually be preferred...
    assertCorrectionsByOrder(rule, "Fux", "Fuchs");  // fixed in morfologik 2.1.4
    assertCorrectionsByOrder(rule, "schänken", "Schänken");  // "schenken" is missing
  });

  // Java: GermanSpellerRuleTest#testIsMisspelled
  it('testIsMisspelled', () => {
    let rule = new GermanSpellerRule(deMessages(), GERMAN_DE);
    expect(rule.isMisspelled("dshfsdhsdf")).toBe(true);
    expect(rule.isMisspelled("Haussarbeit")).toBe(true);
    expect(rule.isMisspelled("Überschus")).toBe(true);
    expect(rule.isMisspelled("Überschussen")).toBe(true);

    expect(rule.isMisspelled("Hausarbeit")).toBe(false);
    expect(rule.isMisspelled("Überschuss")).toBe(false);
    expect(rule.isMisspelled("Überschüsse")).toBe(false);

    expect(rule.isMisspelled("Spielzugcomputer")).toBe(true);
    expect(rule.isMisspelled("Spielzugcomputern")).toBe(true);
    expect(rule.isMisspelled("Spielzug")).toBe(false);
    expect(rule.isMisspelled("Spielzugs")).toBe(false);

    expect(rule.isMisspelled("Studentenschafte")).toBe(true);
    expect(rule.isMisspelled("Steuereigenschafte")).toBe(true);
    expect(rule.isMisspelled("Studentenschaften")).toBe(false);
    expect(rule.isMisspelled("Steuereigenschaften")).toBe(false);
    expect(rule.isMisspelled("Eigenschaften")).toBe(false);
    expect(rule.isMisspelled("wirtschafte")).toBe(false);

    expect(rule.isMisspelled("Gebietskörperschaf")).toBe(true);
    expect(rule.isMisspelled("Gebietskörperschafs")).toBe(true);
    expect(rule.isMisspelled("Gebietskörperschafen")).toBe(true);
    expect(rule.isMisspelled("Freundschaf")).toBe(true);
    expect(rule.isMisspelled("Wollschaf")).toBe(false);
    expect(rule.isMisspelled("Wollschafs")).toBe(false);
    expect(rule.isMisspelled("Wollschafen")).toBe(false);
  });

  // Java: GermanSpellerRuleTest#testGenderCompound
  it('testGenderCompound', () => {
    let rule = new GermanSpellerRule(deMessages(), GERMAN_DE);
    let lt = newLt(GERMAN_DE);

    expect(rule.match(lt.getAnalyzedSentence("Jurist:innenausbildunk")).length).toEqual(1);
    expect(rule.match(lt.getAnalyzedSentence("Jurrist:innenausbildung")).length).toEqual(2);
    expect(rule.match(lt.getAnalyzedSentence("Jurist:innenausbildung")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Ein Satz. Die Jurist:innenausbildung und die Jurist*innenausbildung.")).length).toEqual(0);

    expect(rule.match(lt.getAnalyzedSentence("Jurist*innenausbildunk")).length).toEqual(1);
    expect(rule.match(lt.getAnalyzedSentence("Jurrist*innenausbildung")).length).toEqual(2);
    expect(rule.match(lt.getAnalyzedSentence("Jurist*innenausbildung")).length).toEqual(0);

    expect(rule.match(lt.getAnalyzedSentence("Jurist_innenausbildunk")).length).toEqual(1);
    expect(rule.match(lt.getAnalyzedSentence("Jurrist_innenausbildung")).length).toEqual(2);
    expect(rule.match(lt.getAnalyzedSentence("Jurist_innenausbildung")).length).toEqual(0);

    expect(rule.match(lt.getAnalyzedSentence("Die Häuser der Juriest_innen sind grün.")).length).toEqual(1);
    expect(rule.match(lt.getAnalyzedSentence("Die Häuser der Juriest*innen sind grün.")).length).toEqual(1);
    expect(rule.match(lt.getAnalyzedSentence("Die Häuser der Juriest:innen sind grün.")).length).toEqual(1);

    expect(rule.match(lt.getAnalyzedSentence("Die Häuser der Jurist_innen sind grün.")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Die Häuser der Jurist*innen sind grün.")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Die Häuser der Jurist:innen sind grün.")).length).toEqual(0);

    expect(rule.match(lt.getAnalyzedSentence("Die Jurist_innenausbildung ist schwer.")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Die Jurist*innenausbildung ist schwer.")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Die Jurist:innenausbildung ist schwer.")).length).toEqual(0);

    expect(rule.match(lt.getAnalyzedSentence("Die Jurist_innenausbieldung ist schwer.")).length).toEqual(1);
    expect(rule.match(lt.getAnalyzedSentence("Die Jurist*innenausbieldung ist schwer.")).length).toEqual(1);
    expect(rule.match(lt.getAnalyzedSentence("Die Jurist:innenausbieldung ist schwer.")).length).toEqual(1);

    expect(rule.match(lt.getAnalyzedSentence("Die Juriest_innenausbildung ist schwer.")).length).toEqual(2);
    expect(rule.match(lt.getAnalyzedSentence("Die Juriest*innenausbildung ist schwer.")).length).toEqual(2);
    expect(rule.match(lt.getAnalyzedSentence("Die Juriest:innenausbildung ist schwer.")).length).toEqual(2);

    expect(rule.match(lt.getAnalyzedSentence("Die Juriest_innenausbieldung ist schwer.")).length).toEqual(2);
    expect(rule.match(lt.getAnalyzedSentence("Die Juriest*innenausbieldung ist schwer.")).length).toEqual(2);
    expect(rule.match(lt.getAnalyzedSentence("Die Juriest:innenausbieldung ist schwer.")).length).toEqual(2);

    expect(rule.match(lt.getAnalyzedSentence("Die SEO-Expert*innen")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Die SEO-Expxrt*innen")).length).toEqual(1);
    expect(rule.match(lt.getAnalyzedSentence("Die SEO-Expert*annen")).length).toEqual(2);

    //check common file name with _
    expect(rule.match(lt.getAnalyzedSentence("Die Datei heißt Jurist_innen.txt.")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Die Datei heißt Jurist_innen.txt und ist leer.")).length).toEqual(0);

    expect(rule.match(lt.getAnalyzedSentence("Die Datei heißt Juriest_innen.txt.")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Die Datei heißt Juriest_innen.txt und ist leer.")).length).toEqual(0);

    expect(rule.match(lt.getAnalyzedSentence("Die Datei heißt Juriest_innenausbieldung.txt.")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Die Datei heißt Juriest_innenausbieldung.txt und ist leer.")).length).toEqual(0);

    //check uncommon file name with _
    expect(rule.match(lt.getAnalyzedSentence("Die Datei heißt Jurist_innen.mfgjg.")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Die Datei heißt Jurist_innen.mfgjg und ist leer.")).length).toEqual(0);

    expect(rule.match(lt.getAnalyzedSentence("Die Datei heißt Juriest_innen.mfgjg.")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Die Datei heißt Juriest_innen.mfgjg und ist leer.")).length).toEqual(0);

    expect(rule.match(lt.getAnalyzedSentence("Die Datei heißt Juriest_innenausbieldung.mfgjg.")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Die Datei heißt Juriest_innenausbieldung.mfgjg und ist leer.")).length).toEqual(0);

    expect(rule.match(lt.getAnalyzedSentence("Die Datei heißt counterelements4_0.xsd")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Die Datei heißt counter-elements4_0.xsd")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Die Datei heißt counterelements4_0.mfgjg und ist leer.")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("Der @bla_xyz hat das gesagt")).length).toEqual(0);

    expect(rule.match(lt.getAnalyzedSentence("richtig_stimmt")).length).toEqual(0);
    expect(rule.match(lt.getAnalyzedSentence("flasch_nittrichtig")).length).toEqual(2);
  });

  // Java: GermanSpellerRuleTest#testPosition
  it('testPosition', () => {
    let rule = new GermanSpellerRule(deMessages(), GERMAN_DE);
    let lt = newLt(GERMAN_DE);
    let match1 = rule.match(lt.getAnalyzedSentence( "Er ist entsetzt, weil beim 'Wiederaufbau' das original-gotische Achsfenster mit reichem Maßwerk ausgebaut " + "und an die südliche TeStWoRt gesetzt wurde."));
    expect(match1.length).toEqual(1);
    expect(match1[0].getFromPos()).toEqual(126);
    expect(match1[0].getToPos()).toEqual(134);
  });

  // Java: GermanSpellerRuleTest#testMorfologikSuggestionsWorkaround
  it('testMorfologikSuggestionsWorkaround', () => {
    let rule1 = new GermanSpellerRule(deMessages(), GERMAN_DE);
    let rule2 = new GermanSpellerRule(deMessages(), GERMAN_DE);
    let lt = newLt(GERMAN_DE);

    let sentence1 = "Das Absinken der Motordrehzahl bfi größeren Geschwindigkeiten war.";
    let sentence2 = "Welche die Eidgenossenschaft ls Staatenbund wiederhergestellt hat.";

    let matches11 = rule1.match(lt.getAnalyzedSentence(sentence1));
    let matches12 = rule1.match(lt.getAnalyzedSentence(sentence2));

    let matches22 = rule2.match(lt.getAnalyzedSentence(sentence2));
    let matches21 = rule2.match(lt.getAnalyzedSentence(sentence1));

    expect([matches11, matches12, matches21, matches22].every((arr) => arr.length === 1)).toBe(true);

    expect(matches21[0].getSuggestedReplacements().length).toEqual(matches11[0].getSuggestedReplacements().length);
    expect(matches22[0].getSuggestedReplacements().length).toEqual(matches12[0].getSuggestedReplacements().length);

    // a bug caused "bie" to be ignored:
    let matches20 = rule1.match(lt.getAnalyzedSentence("laut Beispielen bie"));
    expect(matches20.length).toEqual(1);
  });

  // Java: GermanSpellerRuleTest#testProhibitVsSpellingDeCH
  it('testProhibitVsSpellingDeCH', () => {
    let loader = new CachingWordListLoader();
    let prohibit = expandLines(loader.loadWords("/de/hunspell/prohibit.txt"));
    let deCH = expandLines(getDataBroker().getFromResourceDirAsLines("/de/hunspell/spelling-de-CH.txt"));
    for (const deCHWord of deCH) {
      if (prohibit.includes(deCHWord)) {
        throw new Error("'" + deCHWord + "' is both in prohibit.txt (used for all de-.. variants) and in spelling-de-CH.txt");
      }
      if (deCHWord.includes("ß")) {
        throw new Error("'" + deCHWord + "' from spelling-de-CH.txt contains 'ß' - should be 'ss' instead");
      }
    }
  });
});
