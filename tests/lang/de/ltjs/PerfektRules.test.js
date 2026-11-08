// LTJS layer (D-061): perfect auxiliary rule, positive and negative examples.
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { Languages } from '../../../../src/core/Languages.js';
import { messagesFor, newLt } from '../../../support/ruleTestSupport.js';
import { getLtjsGermanPerfektRules, LTJS_PERFEKT_RULE_IDS } from '../../../../src/lang/de/ltjs/PerfektRules.js';
import { check } from '../../../../src/index.js';

const deDE = Languages.getLanguageForShortCode('de-DE');
const rule = getLtjsGermanPerfektRules(messagesFor(deDE), deDE)[0];
const lt = newLt(deDE);

// matches as "covered->suggestions"
function run(text) {
  return rule.match(lt.getAnalyzedSentence(text)).map((m) => `${text.slice(m.getFromPos(), m.getToPos())}->${m.getSuggestedReplacements().join('|')}`);
}

const BAD = [
  ['Letztes Mal haben wir danach mit dem Taxi heimgefahren.', 'haben->sind'],
  ['Unser Bus hat erst um acht Uhr abgefahren.', 'hat->ist'],
  ['Ich habe gestern spät eingeschlafen.', 'habe->bin'],
  ['Er hatte schon gegangen.', 'hatte->war'],
  ['Es hat mir nicht gelungen.', 'hat->ist'],
  ['Ich weiß, dass er gekommen hat.', 'hat->ist'],
  ['Hast du schon aufgestanden?', 'Hast->Bist'],
];

const GOOD = [
  'Wir sind mit dem Taxi heimgefahren.',
  'Der Film hat mir gefallen.', // 'gefallen' (to please)
  'Er hat die ganze Strecke abgefahren.',
  'Ich habe lange gesessen.', // regional: both auxiliaries
  'Er hat das Auto gefahren.',
  'Wir haben die Grenze passiert.',
  'Er hat gegessen und ist gegangen.',
  'Sie hat sich umgezogen.',
  'Ich habe ihn kommen sehen.',
  'Er hat ein gelungenes Fest gefeiert.',
];

describe('LTJS perfect auxiliary rule', () => {
  it('has the registered id, category GRAMMAR', () => {
    expect(rule.getId()).toBe(LTJS_PERFEKT_RULE_IDS[0]);
    expect(rule.getCategory().getId().toString()).toBe('GRAMMAR');
  });

  it('positive examples', () => {
    expect(BAD.map(([text]) => run(text))).toEqual(BAD.map(([, expected]) => [expected]));
  });

  it('negative examples', () => {
    expect(GOOD.map((text) => [text, run(text)])).toEqual(GOOD.map((text) => [text, []]));
  });

  it('rule example: incorrect example matches, correct example does not', () => {
    for (const ex of rule.getIncorrectExamples()) expect(run(ex.getExample().replace(/<\/?marker>/g, '')).length).toBe(1);
    for (const ex of rule.getCorrectExamples()) expect(run(ex.getExample().replace(/<\/?marker>/g, ''))).toEqual([]);
  });

  it('check(): on by default, off with extraRules: false or disabledRules', async () => {
    process.env.LTJS_EXTRA_RULES = '1';
    const text = 'Unser Bus hat erst um acht Uhr abgefahren.';
    const ids = async (o) => (await check(text, { language: 'de-DE', ...o })).matches.map((m) => m.rule.id);
    expect(await ids({})).toContain('LTJS_PERFEKT_SEIN');
    expect(await ids({ extraRules: false })).not.toContain('LTJS_PERFEKT_SEIN');
    expect(await ids({ disabledRules: ['LTJS_PERFEKT_SEIN'] })).not.toContain('LTJS_PERFEKT_SEIN');
  });
});
