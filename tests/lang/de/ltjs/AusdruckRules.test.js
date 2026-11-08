// LTJS layer (D-061): comparison and expression rules, positive and negative examples.
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { Languages } from '../../../../src/core/Languages.js';
import { messagesFor, newLt } from '../../../support/ruleTestSupport.js';
import { getLtjsGermanAusdruckRules, LTJS_AUSDRUCK_RULE_IDS } from '../../../../src/lang/de/ltjs/AusdruckRules.js';
import { check } from '../../../../src/index.js';

const deDE = Languages.getLanguageForShortCode('de-DE');
const rules = getLtjsGermanAusdruckRules(messagesFor(deDE), deDE);
const lt = newLt(deDE);

// matches of all rules as "ID:covered->suggestion"
function run(text) {
  const as = lt.getAnalyzedSentence(text);
  return rules.flatMap((r) => r.match(as).map((m) => `${r.getId()}:${text.slice(m.getFromPos(), m.getToPos())}->${m.getSuggestedReplacements().join('|')}`));
}

const BAD = [
  ['Die Kosten liegen bei mehr wie zwei Millionen Euro.', 'LTJS_MEHR_WIE:mehr wie->mehr als'],
  ['Es waren weniger wie 20 Leute da.', 'LTJS_MEHR_WIE:weniger wie->weniger als'],
  ['Die Konzentration ist heute so hoch als nie zuvor.', 'LTJS_SO_ALS:so hoch als->so hoch wie'],
  ['Desto wärmer es ist, desto schneller altert der Akku.', 'LTJS_DESTO_JE:Desto->Je'],
  ['Ich frage mich, warum dass niemand die Anwohner fragt.', 'LTJS_W_DASS:warum dass->warum'],
  ['Ich weiß nicht, ob dass stimmt.', 'LTJS_W_DASS:ob dass->ob'],
  ['Seit ihr am Freitag im Büro?', 'LTJS_SEIT_SEID:Seit->Seid'],
  ['Hey, seit ihr heute Abend auch beim Konzert?', 'LTJS_SEIT_SEID:seit->seid'],
];

const GOOD = [
  'Die Kosten liegen bei mehr als zwei Millionen Euro.',
  'Es ist nicht mehr wie früher.',
  'Er ist so groß wie sein Vater.',
  'Komm so bald als möglich.',
  'Er ist größer als sein Vater.',
  'Je wärmer es ist, desto schneller altert der Akku.',
  'Er wurde desto vorsichtiger, je älter er wurde.',
  'Ich frage mich, warum niemand fragt.',
  'Er tat es so, dass niemand es merkte.',
  'Seid ihr am Freitag im Büro?',
  'Seit ihr Vater gestorben ist, lebt sie allein.',
  'Seit ihr hier wohnt, ist es ruhiger.',
  'Wie lange wohnt ihr schon hier, seit ihr umgezogen seid?',
];

describe('LTJS comparison and expression rules', () => {
  it('have the registered ids, category GRAMMAR', () => {
    expect(rules.map((r) => r.getId())).toEqual([...LTJS_AUSDRUCK_RULE_IDS]);
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
    const text = 'Die Kosten liegen bei mehr wie zwei Millionen Euro.';
    const ids = async (o) => (await check(text, { language: 'de-DE', ...o })).matches.map((m) => m.rule.id);
    expect(await ids({})).toContain('LTJS_MEHR_WIE');
    expect(await ids({ extraRules: false })).not.toContain('LTJS_MEHR_WIE');
    expect(await ids({ disabledRules: ['LTJS_MEHR_WIE'] })).not.toContain('LTJS_MEHR_WIE');
  });
});
