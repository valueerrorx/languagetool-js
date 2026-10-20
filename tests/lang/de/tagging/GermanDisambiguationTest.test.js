// Ported from GermanDisambiguationTest (languagetool-language-modules/de)
import { describe, it, expect, beforeEach } from 'vitest';
import '../../../../src/lang/register.js';
import { GermanyGerman } from '../../../../src/lang/de/language/GermanyGerman.js';
import { newLt } from '../../../support/ruleTestSupport.js'; // new JLanguageTool(language) without built-in rules, analysis is unaffected

// Java: List#toString() of AnalyzedSentence objects
const ls = (l) => `[${l.map((x) => x.toString()).join(', ')}]`;

describe('GermanDisambiguationTest', () => {
  let lt;

  // Java: GermanDisambiguationTest#setUp()
  beforeEach(() => {
    lt = newLt(GermanyGerman.getInstance());
  });

  // Java: GermanDisambiguationTest#testChunker()
  it('testChunker', () => {
    let tokens;

    tokens = lt.analyzeText('für Ihrer Sicherheit.');
    expect(ls(tokens)).toBe(
      '[<S> für[für/PRP:TMP+MOD+CAU:AKK,für/PRP:TMP+MOD+CAU:AKK,PP] Ihrer[Ihr/PRO:POS:DAT:SIN:FEM:BEG,Ihr/PRO:POS:DAT:SIN:FEM:STV,Ihr/PRO:POS:GEN:SIN:FEM:BEG,Ihr/PRO:POS:GEN:SIN:FEM:STV,B-NP|NPS|PP] Sicherheit[Sicherheit/SUB:DAT:SIN:FEM,Sicherheit/SUB:GEN:SIN:FEM,I-NP|NPS|PP].[</S>./PKT,<P/>,O]]');

    // FIXME: missing tags for "Ihrer"
    tokens = lt.analyzeText('Wir entwickeln ein Konzept für Ihrer Sicherheit.');
    expect(ls(tokens)).toBe(
      '[<S> Wir[ich/PRO:PER:NOM:PLU:ALG,O] entwickeln[entwickeln/VER:1:PLU:KJ1:SFT,entwickeln/VER:1:PLU:PRÄ:SFT,entwickeln/VER:3:PLU:KJ1:SFT,entwickeln/VER:3:PLU:PRÄ:SFT,entwickeln/VER:INF:SFT,O] ein[ein/ART:IND:AKK:SIN:NEU,ein/ART:IND:NOM:SIN:NEU,B-NP|NPS] Konzept[Konzept/SUB:AKK:SIN:NEU,Konzept/SUB:NOM:SIN:NEU,I-NP|NPS] für[für/PRP:TMP+MOD+CAU:AKK,PP] Ihrer[Ihr/PRO:POS:DAT:SIN:FEM:BEG,Ihr/PRO:POS:DAT:SIN:FEM:STV,Ihr/PRO:POS:GEN:SIN:FEM:BEG,Ihr/PRO:POS:GEN:SIN:FEM:STV,B-NP|NPS|PP] Sicherheit[Sicherheit/SUB:DAT:SIN:FEM,Sicherheit/SUB:GEN:SIN:FEM,I-NP|NPS|PP].[</S>./PKT,<P/>,O]]');

    tokens = lt.analyzeText('3-adische System');
    expect(tokens[0].getTokens()[1].isIgnoredBySpeller()).toBe(true);
    expect(tokens[0].getTokens()[2].isIgnoredBySpeller()).toBe(true);

    tokens = lt.analyzeText('3-adische Systeme');
    expect(tokens[0].getTokens()[1].isIgnoredBySpeller()).toBe(true);
    expect(tokens[0].getTokens()[2].isIgnoredBySpeller()).toBe(true);

    tokens = lt.analyzeText('3-adischen Systems');
    expect(tokens[0].getTokens()[1].isIgnoredBySpeller()).toBe(true);
    expect(tokens[0].getTokens()[2].isIgnoredBySpeller()).toBe(true);

    tokens = lt.analyzeText('Kelassurier Mauer');
    expect(tokens[0].getTokens()[1].isIgnoredBySpeller()).toBe(true);
    expect(tokens[0].getTokens()[2].isIgnoredBySpeller()).toBe(true);

    tokens = lt.analyzeText('Kelassurier Mauern');
    expect(tokens[0].getTokens()[1].isIgnoredBySpeller()).toBe(true);
    expect(tokens[0].getTokens()[2].isIgnoredBySpeller()).toBe(true);

    tokens = lt.analyzeText('Kelassurier Mauers');
    expect(tokens[0].getTokens()[1].isIgnoredBySpeller()).toBe(false);
    expect(tokens[0].getTokens()[2].isIgnoredBySpeller()).toBe(false);
  }, 60000);

  // Java: GermanDisambiguationTest#testUnificationKeepsReadingsForPotentialAgreementErrors()
  it('testUnificationKeepsReadingsForPotentialAgreementErrors', () => {
    assertAnalysisContains(
      'Wer, wie ich, seit vielen Jahre in dieser Branche tätig ist, kennt sich damit gut aus.',
      'vielen[viel/PRO:IND:DAT:PLU:NEU:B/S,viel/PRO:IND:GEN:PLU:NEU');
    assertAnalysisContains(
      'Der Ort bekam eine Schule samt ansässigen Lehrer.',
      'ansässig/ADJ:DAT:SIN:MAS:GRU:DEF');
    assertAnalysisContains(
      'Die Norm formuliert, was Unternehmen tun können und sollten, um den Qualitätsanforderungen ihrer Kunden gerecht zu werden.',
      'ihr/PRO:POS:GEN:PLU:MAS:BEG');
    assertAnalysisContains(
      'Mit welches Verkehrsmittel fahrt ihr in die Schule?',
      'welches[welch/PRO:RIN:AKK:SIN:NEU:B/S');
    assertAnalysisContains(
      'Er hat zu meiner Fragen nichts gesagt.',
      'mein/PRO:POS:GEN:PLU:FEM:BEG');
    assertAnalysisContains(
      'Sie verlangen das von viele europäischen Bürgern.',
      'viel/PRO:IND:AKK:PLU:MAS:B/S');
    assertAnalysisContains(
      'Die regelmäßigen Begegnungen junge Menschen in diesem Haus dienen der Friedensförderung.',
      'junge[jung/ADJ:AKK:PLU:MAS:GRU:SOL');
    assertAnalysisContains(
      'Sie hatte zwei kleiner Fragen.',
      'klein/ADJ:GEN:PLU:FEM:GRU:SOL');
    assertAnalysisContains(
      'Die Erkennung von typischen Fehler bereitet viel Mühe.',
      'typisch/ADJ:DAT:SIN:MAS:GRU:DEF');
    assertAnalysisContains(
      'Sie wollte nie etwas mit deinem Freunden unternehmen.',
      'dein/PRO:POS:DAT:SIN:NEU:BEG');
  });

  // Java: GermanDisambiguationTest#assertAnalysisContains(String,String)
  function assertAnalysisContains(sentence, expectedReading) {
    const analyzed = ls(lt.analyzeText(sentence));
    expect(analyzed.includes(expectedReading), analyzed).toBe(true);
  }
});
