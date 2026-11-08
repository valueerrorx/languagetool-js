// LTJS layer (D-061): German comma rules, positive and negative examples per rule, registration and priority.
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { Languages } from '../../../../src/core/Languages.js';
import { messagesFor, newLt } from '../../../support/ruleTestSupport.js';
import { getLtjsGermanCommaRules, LTJS_KOMMA_RULE_IDS } from '../../../../src/lang/de/ltjs/KommaRules.js';
import { LTJS_GERMAN_RULE_IDS, getLtjsGermanRules } from '../../../../src/lang/de/ltjs/GermanLtjsRules.js';
import { LTJS_DAS_DASS_RULE_IDS } from '../../../../src/lang/de/ltjs/DasDassRules.js';
import { LTJS_RELATIV_RULE_IDS } from '../../../../src/lang/de/ltjs/RelativRules.js';
import { LTJS_SUBJEKT_VERB_RULE_IDS } from '../../../../src/lang/de/ltjs/SubjektVerbRules.js';
import { LTJS_PRAEP_KASUS_RULE_IDS } from '../../../../src/lang/de/ltjs/PraepKasusRules.js';
import { LTJS_PERFEKT_RULE_IDS } from '../../../../src/lang/de/ltjs/PerfektRules.js';
import { LTJS_AUSDRUCK_RULE_IDS } from '../../../../src/lang/de/ltjs/AusdruckRules.js';

const deDE = Languages.getLanguageForShortCode('de-DE');
const rules = Object.fromEntries(getLtjsGermanCommaRules(messagesFor(deDE), deDE).map((r) => [r.getId(), r]));
const lt = newLt(deDE);

// matches of one rule as "covered->suggestion"
function run(id, text) {
  return rules[id].match(lt.getAnalyzedSentence(text)).map((m) => `${text.slice(m.getFromPos(), m.getToPos())}->${m.getSuggestedReplacements()[0]}`);
}

// matches of all comma rules
function runAll(text) {
  const as = lt.getAnalyzedSentence(text);
  return Object.values(rules).flatMap((r) => r.match(as).map((m) => `${r.getId()}:${text.slice(m.getFromPos(), m.getToPos())}`));
}

const CASES = {
  LTJS_KOMMA_VORFELD: {
    bad: [
      ['Falls Sie eine schnellere Lieferung wünschen können wir Ihnen andere Modelle anbieten.', 'wünschen können->wünschen, können'],
      ['Solange die Rechnung nicht vorliegt werden wir den Betrag nicht überweisen.', 'vorliegt werden->vorliegt, werden'],
      ['Ob die beiden Taten zusammenhängen ist noch unklar.', 'zusammenhängen ist->zusammenhängen, ist'],
      ['Wer zu spät kommt muss draußen bleiben.', 'kommt muss->kommt, muss'],
      ['Die Frau, die gestern angerufen hat möchte einen Termin.', 'hat möchte->hat, möchte'],
      ['Sollten Sie Läuse finden behandeln Sie diese bitte mit einem Mittel aus der Apotheke.', 'finden behandeln->finden, behandeln'],
    ],
    good: [
      'Wenn du willst, kannst du mitkommen.',
      'Wenn er kommen will, dann soll er kommen.',
      'Er sagte, dass wir uns treffen können.',
      'Dass euer Wissen begrenzt sei in der Denkbarkeit, glaube ich nicht.',
      'Als Indiz dienen verbrannte Knochen.',
      'Es ist klar, dass die Balkone saniert werden müssen, was Zeit erfordert.',
    ],
  },
  LTJS_KOMMA_NEBENSATZ: {
    bad: [
      ['Er kam spät nach Hause da der Zug Verspätung hatte.', 'Hause da->Hause, da'],
      ['Sie lernt fleißig damit sie die Prüfung besteht.', 'fleißig damit->fleißig, damit'],
      ['Wir warten bis der Regen aufhört.', 'warten bis->warten, bis'],
      ['Er arbeitet mehr als ich dachte.', 'mehr als->mehr, als'],
      ['Er fragte mich wann der Zug abfährt.', 'mich wann->mich, wann'],
      ['Hat jemand eine Idee woran das liegen könnte?', 'Idee woran->Idee, woran'],
      ['Wir brauchen eine Liste, auf die jeder schreibt was fehlt.', 'schreibt was->schreibt, was'],
      ['Es ist gut so wie es ist.', 'gut so wie->gut, so wie'],
      ['Ich sage, dass es gut ist so wie es ist.', 'ist so wie->ist, so wie'],
      ['Ich mache es so wie er es will.', 'es so wie->es, so wie'],
    ],
    good: [
      'Es ist gut, so wie es ist.',
      'Es ist gut so, wie es ist.',
      'Er ist so groß wie sein Vater.',
      'Das Wetter ist heute so schön wie gestern.',
      'Ich sehe das so wie du.',
      'Mach es so wie ich.',
      'Er ist größer als sein Bruder.',
      'Sie arbeitet als Ärztin in Berlin.',
      'Er wurde als Kind adoptiert.',
      'Er hat damit viel Geld verdient.',
      'Er hat als Kind viel erlebt.',
      'Er läuft so schnell wie ein Hase.',
      'Ich bin seit drei Jahren hier.',
      'Das heißt man kann damit dieselben Aufgaben lösen.',
      'Der Fußball soll aus einem Material wie zum Beispiel Leder bestehen.',
      'Er wird als der historische Buddha bezeichnet.',
    ],
  },
  LTJS_KOMMA_RELATIVSATZ: {
    bad: [
      ['Viele Kinder brauchen Hilfe die sie zu Hause nicht bekommen.', 'Hilfe die->Hilfe, die'],
      ['Das ist ein Problem das wir lösen müssen.', 'Problem das->Problem, das'],
      ['Er hat einen Brief geschickt in dem er eine Mieterhöhung ankündigt.', 'geschickt in->geschickt, in'],
      ['Auf der Karte stand der Name eines Ortes den keiner von uns kannte.', 'Ortes den->Ortes, den'],
    ],
    good: [
      'Ich habe die Kinder die Hausaufgaben machen lassen.',
      'Die Zahl der Neugeborenen übersteigt die der Gestorbenen.',
      'Er sprach mit dem Vater der beiden Kinder.',
      'Die Gruppe der von Hegel verfassten Texte ist groß.',
      'Er gab dem Mann die Hand.',
      'Die Kosten, die entstehen, trägt der Mieter.',
    ],
  },
  LTJS_KOMMA_INFINITIV: {
    bad: [
      ['Hast du Lust nächste Woche mit ins Kino zu kommen?', 'Lust nächste->Lust, nächste'],
      ['Es ist wichtig regelmäßig Sport zu treiben.', 'wichtig regelmäßig->wichtig, regelmäßig'],
      ['Ich bin es gewohnt selbstständig zu arbeiten.', 'gewohnt selbstständig->gewohnt, selbstständig'],
      ['Bitte erinnern Sie Ihr Kind daran Mützen nicht zu teilen.', 'daran Mützen->daran, Mützen'],
      ['Sie ging nach Hause anstatt auf ihn zu warten.', 'Hause anstatt->Hause, anstatt'],
      ['Ich habe die Möglichkeit genutzt mich weiterzubilden.', 'genutzt mich->genutzt, mich'],
    ],
    good: [
      'Ich habe keine Lust zu lesen.',
      'Es ist schwer zu sagen.',
      'Das ist leicht zu verstehen.',
      'Er hat nichts zu verlieren.',
      'Ich versuche die Zeit sinnvoll zu nutzen.',
      'Er versucht ohne die Hilfe der anderen aufzustehen.',
      'Es ist meist nicht möglich zu entscheiden.',
      'Seit einiger Zeit sind ähnliche Stände zu finden.',
    ],
  },
  LTJS_KOMMA_ABER: {
    bad: [
      ['Der Teig ist zwar schön aufgegangen aber das Brot war innen feucht.', 'aufgegangen aber->aufgegangen, aber'],
    ],
    good: [
      'Er kam aber nicht.',
      'Die Cluster deuten aber auf eine geringe Virulenz hin.',
      'Darin eingelegt aber waren Geldscheine.',
      'Das ist klein, aber fein.',
    ],
  },
  LTJS_KOMMA_NEBENSATZ_ENDE: {
    bad: [
      ['Wir gehen davon aus, dass es sich um ein Versehen handelt und hoffen auf eine schnelle Klärung.', 'handelt und->handelt, und'],
    ],
    good: [
      'Ich weiß, dass er kommt und geht.',
      'Wir hoffen, dass es klappt und alle zufrieden sind.',
    ],
  },
  LTJS_KOMMA_UND_PRAEDIKAT: {
    bad: [
      ['Sie öffnete die Tür, und ging hinaus.', 'Tür, und->Tür und'],
      ['Ich habe die Tür geöffnet, und das Licht eingeschaltet.', 'geöffnet, und->geöffnet und'],
      ['Die Brühgruppe lässt sich herausnehmen, und unter dem Wasserhahn abspülen.', 'herausnehmen, und->herausnehmen und'],
      ['Den Lauch putzen, waschen, und in feine Ringe schneiden.', 'waschen, und->waschen und'],
      ['Der Parkwächter, der die beiden sah, schüttelte den Kopf, und ging weiter.', 'Kopf, und->Kopf und'],
    ],
    good: [
      'Er las ein Buch, und sie hörte Musik.',
      'Ich rief ihn an, und er kam sofort.',
      'Die Kinder spielen, und die Eltern lesen.',
      'Er hat die Wohnung gekauft, und die Bank finanziert.',
      'Er sagte, er sei krank, und ging nach Hause.',
      'Welche Rolle spielt dabei die Erfüllung, und ist denn die Übermacht so groß?',
      'Dann müsste eine Wanderung einsetzen, oder Unternehmen ihre Produktion verlagern.',
    ],
  },
  LTJS_KOMMA_SUBJEKT_VERB: {
    bad: [
      ['Der Betrag von 245 Euro, muss bis zum 30. April auf dem Konto sein.', 'Euro, muss->Euro muss'],
      ['Von den bestellten 500 Kartons, sind nur 420 angekommen.', 'Kartons, sind->Kartons sind'],
      ['Weitere Informationen, erhalten Sie bei der Hausverwaltung.', 'Informationen, erhalten->Informationen erhalten'],
    ],
    good: [
      'Herr Müller, kommen Sie bitte.',
      'Liebe Kollegen, wir treffen uns morgen.',
      'Kinder, kommt sofort her!',
      'Der Chef, sagt sie, kommt später.',
      'Die Sterblichkeitsraten, bezogen auf die Pandemie, sind gestiegen.',
      'Alle ökonomischen Kategorien, sei es Geld oder Kapital, sind historisch.',
      'Seiner Ausbildung nach Jurist, hielt er Vorträge.',
    ],
  },
  LTJS_KOMMA_PRAEPOSITIONALOBJEKT: {
    bad: [
      ['Ich wäre froh, über jeden Tipp.', 'froh, über->froh über'],
      ['Wir freuen uns, über Ihr Feedback.', 'uns, über->uns über'],
    ],
    good: [
      'Ich wäre froh über jeden Tipp.',
      'Ich bin froh, dass du da bist.',
      'Wir freuen uns, Sie zu sehen.',
    ],
  },
  LTJS_KOMMA_NACH_UND: {
    bad: [
      ['Ich hoffe auf eine baldige Antwort und, verbleibe mit freundlichen Grüßen.', 'und, verbleibe->und verbleibe'],
    ],
    good: [
      'Er kam und, wie immer, war er zu spät.',
      'Gerne laufe ich davon; und, läuft man gut, so entläuft man.',
    ],
  },
};

describe('LTJS comma rules', () => {
  it('has one rule per registered id, category PUNCTUATION', () => {
    expect(Object.keys(rules).sort()).toEqual([...LTJS_KOMMA_RULE_IDS].sort());
    for (const r of Object.values(rules)) {
      expect(r.getId().startsWith('LTJS_KOMMA_')).toBe(true);
      expect(r.getCategory().getId().toString()).toBe('PUNCTUATION');
    }
  });

  it('the layer registers das/dass, comma and relative pronoun rules', () => {
    expect([...LTJS_GERMAN_RULE_IDS].sort()).toEqual([...LTJS_DAS_DASS_RULE_IDS, ...LTJS_KOMMA_RULE_IDS, ...LTJS_RELATIV_RULE_IDS, ...LTJS_SUBJEKT_VERB_RULE_IDS, ...LTJS_PRAEP_KASUS_RULE_IDS, ...LTJS_PERFEKT_RULE_IDS, ...LTJS_AUSDRUCK_RULE_IDS].sort());
    expect(getLtjsGermanRules(messagesFor(deDE), deDE).map((r) => r.getId()).sort()).toEqual([...LTJS_GERMAN_RULE_IDS].sort());
  });

  it('comma rules rank below every Java comma rule (overlapping Java matches win)', () => {
    for (const id of LTJS_KOMMA_RULE_IDS) expect(deDE.getPriorityForId(id)).toBe(-60);
    expect(deDE.getPriorityForId('SUBJUNKTION_KOMMA_2')).toBeGreaterThan(-60);
    expect(deDE.getPriorityForId('LTJS_DAS_DASS_VERB')).toBe(0);
  });

  for (const [id, { bad, good }] of Object.entries(CASES)) {
    it(`${id}: positive examples`, () => {
      for (const [text, expected] of bad) expect(run(id, text), text).toEqual([expected]);
    });
    it(`${id}: negative examples`, () => {
      for (const text of good) expect(run(id, text), text).toEqual([]);
    });
  }

  it('no comma rule fires on correct sentences', () => {
    for (const { good } of Object.values(CASES)) {
      for (const text of good) expect(runAll(text), text).toEqual([]);
    }
  });

  it('rule examples: incorrect example matches, correct example does not', () => {
    for (const r of Object.values(rules)) {
      for (const ex of r.getIncorrectExamples()) {
        const text = ex.getExample().replace(/<\/?marker>/g, '');
        expect(r.match(lt.getAnalyzedSentence(text)).length, text).toBe(1);
      }
      for (const ex of r.getCorrectExamples()) {
        const text = ex.getExample().replace(/<\/?marker>/g, '');
        expect(r.match(lt.getAnalyzedSentence(text)).length, text).toBe(0);
      }
    }
  });
});
