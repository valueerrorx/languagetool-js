// Ported from AgreementSuggestor2Test (de-DE)
import { describe, it, expect } from 'vitest';
import { Languages } from '../../../../src/core/Languages.js';
import { AgreementSuggestor2 } from '../../../../src/lang/de/rules/AgreementSuggestor2.js';
import { ReplacementType } from '../../../../src/lang/de/rules/AgreementRule.js';
import { newLt } from '../../../support/ruleTestSupport.js';

const assertThat = (actual, expected) => expect(actual).toBe(expected);
const is = (x) => x;
const list = (l) => `[${l.join(', ')}]`; // Java: List#toString
const fail = (msg) => expect.unreachable(msg);

describe('AgreementSuggestor2Test', () => {
  const german = Languages.getLanguageForShortCode('de-DE');
  const synthesizer = german.getSynthesizer();
  const lt = newLt(german);

  // Java: AgreementSuggestor2Test#testInteractive
  it('testInteractive', () => {
    //assertSuggestion1("des Züchten", "[das Züchten, dem Züchten, des Züchtens]");
  });

  // Java: AgreementSuggestor2Test#testAdverbSuggestions
  it('testAdverbSuggestions', () => {
    assertSuggestion3("ein sehr schönes Tisch", "[ein sehr schöner Tisch]", true);
    assertSuggestion3("eines sehr schönen Tisch", "[einen sehr schönen Tisch, einem sehr schönen Tisch, eines sehr schönen Tischs, eines sehr schönen Tisches]", true);
    assertSuggestion3("der sehr schönen Tischen", "[dem sehr schönen Tischen, den sehr schönen Tischen, der sehr schönen Tische]", true);
  });

  // Java: AgreementSuggestor2Test#testSuggestions
  it('testSuggestions', () => {
    assertSuggestion1("deine Buch", "[dein Buch, deinem Buch, deine Bücher, deinem Buche, deines Buchs, deines Buches, deiner Bücher, deinen Büchern]");
    assertSuggestion1("dieser Buch", "[dieses Buch, diesem Buch, dies Buch, dieser Bücher, diesem Buche, dieses Buchs, dieses Buches, diese Bücher, diesen Büchern]");
    assertSuggestion1("die Kabels", "[die Kabel, des Kabels, der Kabel, den Kabel, dem Kabel, das Kabel, den Kabeln]");
    assertSuggestion1("die LAN-Kabels", "[die LAN-Kabel, des LAN-Kabels, der LAN-Kabel, den LAN-Kabel, dem LAN-Kabel, das LAN-Kabel, den LAN-Kabeln]");
    assertSuggestion1("mehrere Kabels", "[mehrere Kabel, mehreren Kabeln, mehrerer Kabel]");
    assertSuggestion1("mehrere LAN-Kabels", "[mehrere LAN-Kabel, mehreren LAN-Kabeln, mehrerer LAN-Kabel]");
    assertSuggestion1("mehrere WLAN-LAN-Kabels", "[mehrere WLAN-LAN-Kabel, mehreren WLAN-LAN-Kabeln, mehrerer WLAN-LAN-Kabel]");
    assertSuggestion1("Ihren Verständnis", "[Ihrem Verständnis, Ihr Verständnis, Ihres Verständnisses]");
    assertSuggestion1("des Züchten", "[das Züchten, dem Züchten, des Züchtens]");
    assertSuggestion1("die Kühlschranktest", "[die Kühlschrankteste, die Kühlschranktests, der Kühlschranktest, den Kühlschranktest, " +
      "dem Kühlschranktest, des Kühlschranktests, den Kühlschranktests, der Kühlschrankteste, der Kühlschranktests, " +
      "des Kühlschranktestes, den Kühlschranktesten]");
    assertSuggestion1("die Kühlschrankverarbeitungstest", "[die Kühlschrankverarbeitungsteste, die Kühlschrankverarbeitungstests, " +
      "der Kühlschrankverarbeitungstest, den Kühlschrankverarbeitungstest, dem Kühlschrankverarbeitungstest, " +
      "des Kühlschrankverarbeitungstests, den Kühlschrankverarbeitungstests, der Kühlschrankverarbeitungsteste, " +
      "der Kühlschrankverarbeitungstests, des Kühlschrankverarbeitungstestes, den Kühlschrankverarbeitungstesten]");
    assertSuggestion2("den gleiche Gebiete", "[dem gleichen Gebiete, den gleichen Gebieten, der gleichen Gebiete, " +
      "das gleiche Gebiet, die gleichen Gebiete, dem gleichen Gebiet, des gleichen Gebietes, des gleichen Gebiets]");
    assertSuggestion2("den vorangegangen Versuchen", "[den vorangegangenen Versuchen, das vorangegangene Versuchen, " +
      "dem vorangegangenen Versuchen, den vorangegangenen Versuch, der vorangegangene Versuch, des vorangegangenen Versuches, " +
      "das vorangegangene versuchen, dem vorangegangenen versuchen, des vorangegangenen Versuchens, der vorangegangenen Versuche, " +
      "dem vorangegangenen Versuch, des vorangegangenen Versuchs, des vorangegangenen versuchens, die vorangegangenen Versuche]");
    assertSuggestion1("der Blutflusses", "[des Blutflusses, der Blutfluss, der Blutflüsse, den Blutfluss, dem Blutfluss, den Blutflüssen, die Blutflüsse]");
    assertSuggestion2("ein anstrengenden Tag",
      "[ein anstrengender Tag, ein anstrengendes Tag, einen anstrengenden Tag, einem anstrengenden Tag, eines anstrengenden Tags, eines anstrengenden Tages]");
    //assertSuggestion2("vor allem Teams", "[vor allen Teams]");  // TODO: 'allen' is PRO:IND, 'allem' is PRO:DEM, so we don't map yet between those
    assertSuggestion1("dasselbe Erinnerung", "[dieselbe Erinnerung, derselben Erinnerung]");
    assertSuggestion1("derselbe Erinnerung", "[derselben Erinnerung, dieselbe Erinnerung]");
    assertSuggestion1("derselbe Frau", "[derselben Frau, dieselbe Frau]");
    assertSuggestion1("dieselben Erinnerung", "[dieselbe Erinnerung, derselben Erinnerung]");
    assertSuggestion1("derselben Mann", "[derselbe Mann, denselben Mann, demselben Mann, desselben Manns, desselben Mannes]");
    assertSuggestion1("demselben Frau", "[derselben Frau, dieselbe Frau]");
    assertSuggestion1("desselben Mann", "[denselben Mann, demselben Mann, desselben Manns, derselbe Mann, desselben Mannes]");
    assertSuggestion1("Desselben Mann", "[Denselben Mann, Demselben Mann, Desselben Manns, Derselbe Mann, Desselben Mannes]");
    assertSuggestion1("meinem Eltern", "[meine Eltern, meinen Eltern, meiner Eltern]");
    assertSuggestion1("eure Auge", "[eurem Auge, eure Augen, euer Auge, euerem Auge, euerm Auge, eures Auges, euren Augen, eueres Auges, euerer Augen]");
    assertSuggestion1("welche Internetvideo", "[welches Internetvideo, welchem Internetvideo, welche Internetvideos, welches Internetvideos, welchen Internetvideos, welcher Internetvideos]");
    assertSuggestion1("welchen Internetvideo", "[welches Internetvideo, welchem Internetvideo, welchen Internetvideos, welches Internetvideos, welche Internetvideos, welcher Internetvideos]");
    assertSuggestion1("welches Mann", "[welcher Mann, welchen Mann, welchem Mann, welches Manns, welches Mannes, welche Männer, welcher Männer, welchen Männern]");
    assertSuggestion1("welchem Frau", "[welche Frau, welcher Frau, welche Frauen, welchen Frauen, welcher Frauen]");
    assertSuggestion1("welcher Kind", "[welches Kind, welchem Kind, welcher Kinder, welchem Kinde, welches Kinds, welches Kindes, welche Kinder, welchen Kindern]");
    assertSuggestion1("Welcher Kind", "[Welches Kind, Welchem Kind, Welcher Kinder, Welchem Kinde, Welches Kinds, Welches Kindes, Welche Kinder, Welchen Kindern]");
  });

  // Java: AgreementSuggestor2Test#testSuggestionsWithReplType
  it('testSuggestionsWithReplType', () => {
    let analyzedSentence = lt.getAnalyzedSentence("gehe zur Mann");
    let tags = [...analyzedSentence.getTokensWithoutWhitespace()];
    let suggestor = new AgreementSuggestor2(synthesizer, tags[2], tags[3], ReplacementType.Zur);
    assertThat(list(suggestor.getSuggestions()), is("[zum Mann, zu Männern]"));

    analyzedSentence = lt.getAnalyzedSentence("gehe zur kuschelige Ferienwohnung");
    tags = [...analyzedSentence.getTokensWithoutWhitespace()];
    suggestor = new AgreementSuggestor2(synthesizer, tags[2], tags[3], tags[4], ReplacementType.Zur);
    assertThat(list(suggestor.getSuggestions()), is("[zur kuscheligen Ferienwohnung, zu kuscheligen Ferienwohnungen]"));
  });

  // Java: AgreementSuggestor2Test#testSuggestionsWithReplTypeIns
  it('testSuggestionsWithReplTypeIns', () => {
    let analyzedSentence = lt.getAnalyzedSentence("gehe ins Hauses");
    let tags = [...analyzedSentence.getTokensWithoutWhitespace()];
    let suggestor = new AgreementSuggestor2(synthesizer, tags[2], tags[3], ReplacementType.Ins);
    assertThat(list(suggestor.getSuggestions()), is("[ins Haus, im Hause, im Haus, in die Häuser, in den Häusern]"));
  });

  // Java: AgreementSuggestor2Test#testSuggestionsWithReplTypeInsAdj
  it('testSuggestionsWithReplTypeInsAdj', () => {
    let analyzedSentence = lt.getAnalyzedSentence("gehe ins großen Haus");
    let tags = [...analyzedSentence.getTokensWithoutWhitespace()];
    let suggestor = new AgreementSuggestor2(synthesizer, tags[2], tags[3], tags[4], ReplacementType.Ins);
    assertThat(list(suggestor.getSuggestions()), is("[im großen Haus, ins große Haus, im großen Hause, in die großen Häuser, in den großen Häusern]"));
  });

  // Java: AgreementSuggestor2Test#testSuggestionsHaus
  it('testSuggestionsHaus', () => {
    assertSuggestion1("Der Haus", "[Dem Haus, Das Haus, Der Häuser, Dem Hause, Des Hauses, Die Häuser, Den Häusern]");
    assertSuggestion1("der Haus", "[dem Haus, das Haus, der Häuser, dem Hause, des Hauses, die Häuser, den Häusern]");
    assertSuggestion1("das Haus", "[dem Haus, dem Hause, des Hauses, die Häuser, der Häuser, den Häusern]");
    assertSuggestion1("der Haus", "[dem Haus, das Haus, der Häuser, dem Hause, des Hauses, die Häuser, den Häusern]");
    assertSuggestion1("die Haus", "[das Haus, dem Haus, die Häuser, dem Hause, des Hauses, der Häuser, den Häusern]");
    assertSuggestion1("die Hauses", "[des Hauses, die Häuser, dem Hause, das Haus, dem Haus, der Häuser, den Häusern]");
    assertSuggestion1("die Häusern", "[die Häuser, den Häusern, der Häuser, dem Hause, des Hauses, das Haus, dem Haus]");
    // filtered:
    assertSuggestion1("Der Haus", "[Dem Haus, Das Haus, Der Häuser]", true);
    assertSuggestion1("der Haus", "[dem Haus, das Haus, der Häuser]", true);
    assertSuggestion1("das Haus", "[dem Haus]", true);
    assertSuggestion1("der Haus", "[dem Haus, das Haus, der Häuser]", true);
    assertSuggestion1("die Haus", "[das Haus, dem Haus, die Häuser]", true);
    assertSuggestion1("die Hauses", "[des Hauses, die Häuser]", true);
    assertSuggestion1("die Häusern", "[die Häuser, den Häusern]", true);
    assertSuggestion1("unsere Buch", "[unser Buch, unserem Buch, unsere Bücher]", true);
  });

  // Java: AgreementSuggestor2Test#testDetAdjNounSuggestions
  it('testDetAdjNounSuggestions', () => {
    assertSuggestion2("die neuen Unterlage", "[die neue Unterlage, die neuen Unterlagen, der neuen Unterlage, den neuen Unterlagen, der neuen Unterlagen]");
    assertSuggestion2("der neue Unterlagen", "[der neuen Unterlagen, der neuen Unterlage, den neuen Unterlagen, die neue Unterlage, die neuen Unterlagen]");
    assertSuggestion2("eine schönes Auto", "[ein schönes Auto, einem schönen Auto, eines schönen Autos]");
    assertSuggestion2("eine schöne Auto", "[ein schönes Auto, einem schönen Auto, eines schönen Autos]");
    assertSuggestion2("ein schöne Auto", "[ein schönes Auto, einem schönen Auto, eines schönen Autos]");
    assertSuggestion2("einen großen Auto", "[einem großen Auto, eines großen Autos, ein großes Auto]");
    assertSuggestion2("der schöne Auto", "[das schöne Auto, dem schönen Auto, der schönen Autos, des schönen Autos, den schönen Autos, die schönen Autos]");
    assertSuggestion2("der kleine Auto", "[das kleine Auto, dem kleinen Auto, der kleinen Autos, des kleinen Autos, den kleinen Autos, die kleinen Autos]");
    assertSuggestion2("der kleiner Auto", "[dem kleinen Auto, der kleinen Autos, das kleine Auto, des kleinen Autos, den kleinen Autos, die kleinen Autos]");
    assertSuggestion2("das stärkste Körperteil", "[der stärkste Körperteil, den stärksten Körperteil, dem stärksten Körperteil, des stärksten Körperteils, dem stärksten Körperteile, des stärksten Körperteiles, die stärksten Körperteile, der stärksten Körperteile, den stärksten Körperteilen]");
    // "benötigten" ist PA2:
    assertSuggestion2("die benötigten Unterlage", "[die benötigte Unterlage, die benötigten Unterlagen, der benötigten Unterlage, den benötigten Unterlagen, der benötigten Unterlagen]");
    assertSuggestion2("eine benötigten Unterlage", "[eine benötigte Unterlage, einer benötigten Unterlage]");
    assertSuggestion2("die voller Verzierungen", "[die vollen Verzierungen, die volle Verzierung, den vollen Verzierungen, der vollen Verzierungen, der vollen Verzierung]"); // evtl. Fehlalarm...
    assertSuggestion2("zu zukünftigen Vorstands", "[]");  // ?
    assertSuggestion2("des südlichen Kontinent", "[den südlichen Kontinent, dem südlichen Kontinent, des südlichen Kontinents, des südlichen Kontinentes, der südliche Kontinent, der südlichen Kontinente, die südlichen Kontinente, den südlichen Kontinenten]");
    assertSuggestion2("die erwartet Entwicklung", "[die erwartete Entwicklung, der erwarteten Entwicklung, die erwarteten Entwicklungen, den erwarteten Entwicklungen, der erwarteten Entwicklungen]");
    assertSuggestion2("die verschieden Ämter", "[die verschiedenen Ämter, der verschiedenen Ämter, den verschiedenen Ämtern, das verschiedene Amt, dem verschiedenen Amte, des verschiedenen Amtes, dem verschiedenen Amt, des verschiedenen Amts]");
    assertSuggestion2("keine richtiger Fahrerin", "[keine richtige Fahrerin, keiner richtigen Fahrerin, keine richtigen Fahrerinnen, keinen richtigen Fahrerinnen, keiner richtigen Fahrerinnen]");
    // GRU, KOM, SUP:
    assertSuggestion2("das schönes Auto", "[das schöne Auto, dem schönen Auto, des schönen Autos, die schönen Autos, den schönen Autos, der schönen Autos]");
    assertSuggestion2("das schöneren Auto", "[das schönere Auto, dem schöneren Auto, des schöneren Autos, die schöneren Autos, den schöneren Autos, der schöneren Autos]");
    assertSuggestion2("das schönstem Auto", "[das schönste Auto, dem schönsten Auto, des schönsten Autos, die schönsten Autos, den schönsten Autos, der schönsten Autos]");
    assertSuggestion2("das schönsten Auto", "[das schönste Auto, dem schönsten Auto, das schöne Auto, des schönsten Autos, die schönsten Autos, " +
      "den schönsten Autos, der schönsten Autos, dem schönen Auto, des schönen Autos, die schönen Autos, den schönen Autos, der schönen Autos]");
    assertSuggestion2("der ikonischen Gebäuden", "[den ikonischen Gebäuden, der ikonischen Gebäude, dem ikonischen Gebäude, des ikonischen Gebäudes, die ikonischen Gebäude, das ikonische Gebäude]");
    assertSuggestion2("der ikonischeren Gebäuden", "[den ikonischeren Gebäuden, der ikonischeren Gebäude, dem ikonischeren Gebäude, des ikonischeren Gebäudes, die ikonischeren Gebäude, das ikonischere Gebäude]");
    assertSuggestion2("der ikonischsten Gebäuden", "[den ikonischsten Gebäuden, der ikonischsten Gebäude, dem ikonischsten Gebäude, " +
      "des ikonischsten Gebäudes, die ikonischsten Gebäude, den ikonischen Gebäuden, der ikonischen Gebäude, das ikonischste Gebäude, " +
      "dem ikonischen Gebäude, des ikonischen Gebäudes, die ikonischen Gebäude, das ikonische Gebäude]");
    assertSuggestion2("den meisten Fälle", "[den meisten Fällen, der meisten Fälle, die meisten Fälle]");
  });

  // Java: AgreementSuggestor2Test#testDetNounSuggestionsWithPreposition
  it('testDetNounSuggestionsWithPreposition', () => {
    let analyzedSentence = lt.getAnalyzedSentence("für dein Schmuck");
    let tags = [...analyzedSentence.getTokensWithoutWhitespace()];
    let suggestor = new AgreementSuggestor2(synthesizer, tags[2], tags[3], null);
    assertThat(list(suggestor.getSuggestions(false)), is("[deinen Schmuck, deinem Schmuck, deines Schmucks, deines Schmuckes]"));
    assertThat(list(suggestor.getSuggestions(true)), is("[deinen Schmuck, deinem Schmuck]"));
    suggestor.setPreposition(tags[1]);  // "für"
    assertThat(list(suggestor.getSuggestions(false)), is("[deinen Schmuck]"));
    assertThat(list(suggestor.getSuggestions(true)), is("[deinen Schmuck]"));
  });

  // Java: AgreementSuggestor2Test#testDetAdjNounSuggestionsWithPreposition
  it('testDetAdjNounSuggestionsWithPreposition', () => {
    let analyzedSentence = lt.getAnalyzedSentence("über ein hilfreichen Tipp");
    let tags = [...analyzedSentence.getTokensWithoutWhitespace()];
    let suggestor = new AgreementSuggestor2(synthesizer, tags[2], tags[3], tags[4], null);
    assertThat(list(suggestor.getSuggestions()), is("[ein hilfreicher Tipp, einen hilfreichen Tipp, einem hilfreichen Tipp, eines hilfreichen Tipps]"));
    suggestor.setPreposition(tags[1]);  // "über"
    assertThat(list(suggestor.getSuggestions()), is("[einen hilfreichen Tipp, einem hilfreichen Tipp]"));

    analyzedSentence = lt.getAnalyzedSentence("an den stacheligen Pflanzenteile");
    tags = [...analyzedSentence.getTokensWithoutWhitespace()];
    suggestor = new AgreementSuggestor2(synthesizer, tags[2], tags[3], tags[4], null);
    assertThat(list(suggestor.getSuggestions()), is("[den stacheligen Pflanzenteil, dem stacheligen Pflanzenteile, " +
      "den stacheligen Pflanzenteilen, der stacheligen Pflanzenteile, die stacheligen Pflanzenteile, dem stacheligen Pflanzenteil, " +
      "des stacheligen Pflanzenteiles, des stacheligen Pflanzenteils, der stachelige Pflanzenteil, das stachelige Pflanzenteil]"));
    suggestor.setPreposition(tags[1]);  // "an"
    assertThat(list(suggestor.getSuggestions()), is("[den stacheligen Pflanzenteil, dem stacheligen Pflanzenteile, " +
      "den stacheligen Pflanzenteilen, die stacheligen Pflanzenteile, dem stacheligen Pflanzenteil, das stachelige Pflanzenteil]"));
  });

  // Java: AgreementSuggestor2Test#testDetAdjAdjNounSuggestions
  it('testDetAdjAdjNounSuggestions', () => {
    assertSuggestion3("eine solides strategisches Fundament", "[ein solides strategisches Fundament]", true);
    assertSuggestion3("ein solide strategisches Fundament", "[ein solides strategisches Fundament]", true);
    assertSuggestion3("ein solides strategische Fundament", "[ein solides strategisches Fundament]", true);
    assertSuggestion3("ein solides strategisches Fundamente", "[ein solides strategisches Fundament]", true);
    assertSuggestion3("ein solides strategisches Fundamenten", "[ein solides strategisches Fundament]", true);
    assertSuggestion3("die meisten kommerziellen System", "[die meisten kommerziellen Systeme]", true);
    assertSuggestion3("die meisten kommerzielle Systeme", "[die meisten kommerziellen Systeme]", true);
    assertSuggestion3("die meisten kommerziell Systeme", "[die meisten kommerziellen Systeme]", true);
    assertSuggestion3("die meisten kommerziell System", "[die meisten kommerziellen Systeme]", true);
    assertSuggestion3("Die meisten kommerziellen System", "[Die meisten kommerziellen Systeme]", true);
    assertSuggestion3("der meisten kommerziellen System", "[der meisten kommerziellen Systeme]", true);
    assertSuggestion3("der meisten kommerziellen Systems", "[der meisten kommerziellen Systeme]", true);
    //assertSuggestion3("jedes viertes fremdsprachliche Wurzeln", "[jedes vierte fremdsprachliche Wurzeln]", true);  // TODO
  });

  // Java: AgreementSuggestor2Test#assertSuggestion1(String,String) / (String,String,boolean)
  function assertSuggestion1(input, expectedSuggestions, filter = false) {
    const analyzedSentence = lt.getAnalyzedSentence(input);
    const tags = [...analyzedSentence.getTokensWithoutWhitespace()];
    if (analyzedSentence.getTokensWithoutWhitespace().length !== 3) { // 2 tokens + sentence start token
      fail('Please use 2 tokens (det, noun) as input: ' + input);
    }
    const suggestor = new AgreementSuggestor2(synthesizer, tags[1], tags[2], null);
    assertThat(list(suggestor.getSuggestions(filter)), is(expectedSuggestions));
  }

  // Java: AgreementSuggestor2Test#assertSuggestion2(String,String)
  function assertSuggestion2(input, expectedSuggestions) {
    const analyzedSentence = lt.getAnalyzedSentence(input);
    const tags = [...analyzedSentence.getTokensWithoutWhitespace()];
    if (analyzedSentence.getTokensWithoutWhitespace().length !== 4) { // 3 tokens + sentence start token
      fail('Please use 3 tokens (det, adj, noun) as input: ' + input);
    }
    const suggestor = new AgreementSuggestor2(synthesizer, tags[1], tags[2], tags[3], null);
    assertThat(list(suggestor.getSuggestions()), is(expectedSuggestions));
  }

  // Java: AgreementSuggestor2Test#assertSuggestion3(String,String,boolean)
  function assertSuggestion3(input, expectedSuggestions, filter) {
    const analyzedSentence = lt.getAnalyzedSentence(input);
    const tags = [...analyzedSentence.getTokensWithoutWhitespace()];
    if (analyzedSentence.getTokensWithoutWhitespace().length !== 5) { // 4 tokens + sentence start token
      fail('Please use 4 tokens (det, adj, adj, noun) as input: ' + input);
    }
    const suggestor = new AgreementSuggestor2(synthesizer, tags[1], tags[2], tags[3], tags[4], null);
    assertThat(list(suggestor.getSuggestions(filter)), is(expectedSuggestions));
  }
});
