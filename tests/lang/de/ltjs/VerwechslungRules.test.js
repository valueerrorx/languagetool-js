// LTJS layer (D-061): word confusion rules, positive and negative examples.
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { Languages } from '../../../../src/core/Languages.js';
import { messagesFor, newLt } from '../../../support/ruleTestSupport.js';
import { getLtjsGermanVerwechslungRules, LTJS_VERWECHSLUNG_RULE_IDS } from '../../../../src/lang/de/ltjs/VerwechslungRules.js';
import { check } from '../../../../src/index.js';

const deDE = Languages.getLanguageForShortCode('de-DE');
const rules = getLtjsGermanVerwechslungRules(messagesFor(deDE), deDE);
const lt = newLt(deDE);

// matches of all rules as "ID:covered->suggestion"
function run(text) {
  const as = lt.getAnalyzedSentence(text);
  return rules.flatMap((r) => r.match(as).map((m) => `${r.getId()}:${text.slice(m.getFromPos(), m.getToPos())}->${m.getSuggestedReplacements().join('|')}`));
}

const BAD = [
  ['Gib aber nicht zu fiel Salz hinein.', 'LTJS_FIEL_VIEL:fiel->viel'],
  ['Das ist mir zu fiel Arbeit.', 'LTJS_FIEL_VIEL:fiel->viel'],
  ['Fiel Spaß beim Konzert!', 'LTJS_FIEL_VIEL:Fiel->Viel'],
  ['Ein Satz mit fielen Fehlern.', 'LTJS_FIELEN_VIELEN:fielen->vielen'],
  ['In fielen Fällen hilft das.', 'LTJS_FIELEN_VIELEN:fielen->vielen'],
  ['Nach fielen langen Jahren kam er zurück.', 'LTJS_FIELEN_VIELEN:fielen->vielen'],
  ['Er hat den fielen Leuten geholfen.', 'LTJS_FIELEN_VIELEN:fielen->vielen'],
  ['Das gefällt mir an so fielen Orten.', 'LTJS_FIELEN_VIELEN:fielen->vielen'],
  ['Fielen Dank für deine Hilfe!', 'LTJS_FIELEN_VIELEN:Fielen->Vielen'],
  ['Wen ihr Tipps habt, schreibt sie bitte in die Gruppe.', 'LTJS_WEN_WENN:Wen->Wenn'],
  ['Wen du Zeit hast, ruf mich an.', 'LTJS_WEN_WENN:Wen->Wenn'],
  ['Ich komme, wen ich fertig bin.', 'LTJS_WEN_WENN:wen->wenn'],
];

const GOOD = [
  'Gib aber nicht zu viel Salz hinein.',
  'Er fiel vom Fahrrad.',
  'Als ihm das Erbe zu fiel, war er glücklich.',
  'Es fiel Schnee.',
  'Am Morgen fiel Regen, wir blieben drinnen.',
  'Ein Satz mit vielen Fehlern.',
  'Es fielen Schüsse.',
  'Am Abend fielen dicke Flocken.',
  'Und so fielen Tore am laufenden Band.',
  'Die Aufgaben, die ihm zu fielen, waren leicht.',
  'Als die Äpfel zu Boden fielen, lachten wir.',
  'Worauf fielen die Blicke?',
  'Den Angaben zufolge fielen Schüsse.',
  'Meiner Meinung nach fielen zu viele Tore.',
  'Die ganze Nacht über fielen dicke Flocken.',
  'Seit 2016 fielen mit Ausnahme eines Jahres alle Spiele aus.',
  'Wen ihr einladet, ist eure Sache.',
  'Wen du gesehen hast, weiß ich nicht.',
  'Wen hast du gestern getroffen?',
  'Wen ihr Peter vorstellt, ist egal.',
  'Wenn ihr Tipps habt, schreibt sie bitte.',
];

describe('LTJS confusion rules', () => {
  it('have the registered ids, category GRAMMAR', () => {
    expect(rules.map((r) => r.getId())).toEqual([...LTJS_VERWECHSLUNG_RULE_IDS]);
    for (const r of rules) expect(r.getCategory().getId().toString()).toBe('GRAMMAR');
  });

  it('positive examples', () => {
    expect(BAD.map(([text]) => run(text))).toEqual(BAD.map(([, expected]) => [expected]));
  });

  it('negative examples', () => {
    expect(GOOD.map((text) => [text, run(text)])).toEqual(GOOD.map((text) => [text, []]));
  });

  it('rule examples: incorrect example matches, correct example does not', () => {
    for (const r of rules) {
      for (const ex of r.getIncorrectExamples()) expect(r.match(lt.getAnalyzedSentence(ex.getExample().replace(/<\/?marker>/g, ''))).length, r.getId()).toBe(1);
      for (const ex of r.getCorrectExamples()) expect(r.match(lt.getAnalyzedSentence(ex.getExample().replace(/<\/?marker>/g, ''))).length, r.getId()).toBe(0);
    }
  });

  it('check(): on by default, off with extraRules: false or disabledRules', async () => {
    process.env.LTJS_EXTRA_RULES = '1';
    const text = 'Gib aber nicht zu fiel Salz hinein.';
    const ids = async (o) => (await check(text, { language: 'de-DE', ...o })).matches.map((m) => m.rule.id);
    expect(await ids({})).toContain('LTJS_FIEL_VIEL');
    expect(await ids({ extraRules: false })).not.toContain('LTJS_FIEL_VIEL');
    expect(await ids({ disabledRules: ['LTJS_FIEL_VIEL'] })).not.toContain('LTJS_FIEL_VIEL');
  });
});
