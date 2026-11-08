// LTJS layer (D-061): subject-verb agreement rule, positive and negative examples.
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { Languages } from '../../../../src/core/Languages.js';
import { messagesFor, newLt } from '../../../support/ruleTestSupport.js';
import { getLtjsGermanSubjektVerbRules, LTJS_SUBJEKT_VERB_RULE_IDS } from '../../../../src/lang/de/ltjs/SubjektVerbRules.js';
import { check } from '../../../../src/index.js';

const deDE = Languages.getLanguageForShortCode('de-DE');
const rule = getLtjsGermanSubjektVerbRules(messagesFor(deDE), deDE)[0];
const lt = newLt(deDE);

// matches as "covered->suggestions"
function run(text) {
  return rule.match(lt.getAnalyzedSentence(text)).map((m) => `${text.slice(m.getFromPos(), m.getToPos())}->${m.getSuggestedReplacements().join('|')}`);
}

const BAD = [
  ['Die Ergebnisse ist sehr interessant.', 'ist->sind'],
  ['Viele Jugendliche arbeitet in den Ferien.', 'arbeitet->arbeiten'],
  ['Ein Spaziergang dauern oft nur zwanzig Minuten.', 'dauern->dauert'],
  ['Die Schauspieler hat sich zwar bemüht.', 'hat->haben'],
  ['Meine Stärken liegt in der Organisation.', 'liegt->liegen'],
  ['Der Gemeinderat haben den Bau beschlossen.', 'haben->hat'],
  ['Die Arbeiten soll im Frühjahr beginnen.', 'soll->sollen'],
  ['Die Klassen bereitet schon seit Wochen kleine Aufführungen vor.', 'bereitet->bereiten'],
  ['Viele Nutzer weiß nicht, wie das geht.', 'weiß->wissen'],
  ['Die Kinder spielte im Garten.', 'spielte->spielten'],
  ['Der Lehrer kommen gleich.', 'kommen->kommt'], // 'der' as nominative is singular only
  ['Lisa kommen wahrscheinlich später.', 'kommen->kommt'], // bare first name
  ['Der Gemeinderat haben am Dienstag den Bau beschlossen.', 'haben->hat'],
];

const GOOD = [
  'Die Ergebnisse sind sehr interessant.',
  'Die Kinder hat er gestern gesehen.', // fronted object
  'Die Bücher kauft meine Mutter.',
  'Den Kindern gefällt das Spiel.',
  'Das Problem sind die Kosten.', // predicative noun
  'Ein Großteil der Schüler sind krank.', // quantity noun
  'Zehn Euro ist zu viel.',
  'Viele Grüße sendet dir Anna.',
  'Die Mutter der Kinder kommt morgen.',
  'Die Lehrer kommen gleich.',
  'Heute kommt er später.',
  'Meine Eltern wohnen in Wien.',
  'Die Banane schälen, den Apfel entkernen und beides pürieren.', // recipe infinitives
  'Neuer Radweg beschlossen', // headline
  // corpus false alarms (Leipzig news/wikipedia sample)
  'Interessierte können an Testfahrten teilnehmen.', // bare nominalized adjective
  'Unbekannte hatten zuvor rund 140 Meter Kabel gestohlen.',
  'Graphen ist extrem leitfähig.',
  'Seine haben ein gutes Ergebnis eingefahren.', // possessive pronoun, no name
  'Zeitungen bitte vorher bündeln.',
  'Andere Angeklagte sollen verurteilt worden sein.',
  'Jedes Jahr werden mehr als 30.000 Kinder behandelt.', // time adverbial
  'Die Gründe will Hartlapp nun genauer erforschen.', // name after the verb
  'Das Dschungelcamp moderieren in diesem Jahr Sonja Zietlow und Jan Köppen.',
  'Diese Chance wollen und werden wir nutzen.',
  'Ein besonderes Merkmal waren die dreieckigen Lufteinlässe.', // plural predicative noun
  'Ein positives Testergebnis haben allerdings auch 110 der 950 Patienten.',
  // known limit: a nominative noun phrase agreeing with the verb follows, read as fronted object (like 'Die Bücher kauft meine Mutter')
  'Viele Jugendliche verbringt ihre Freizeit vor dem Bildschirm.',
];

describe('LTJS subject-verb rule', () => {
  it('has the registered id, category GRAMMAR', () => {
    expect(rule.getId()).toBe(LTJS_SUBJEKT_VERB_RULE_IDS[0]);
    expect(rule.getCategory().getId().toString()).toBe('GRAMMAR');
  });

  it('positive examples', () => {
    for (const [text, expected] of BAD) expect(run(text), text).toEqual([expected]);
  });

  it('negative examples', () => {
    for (const text of GOOD) expect(run(text), text).toEqual([]);
  });

  it('rule example: incorrect example matches, correct example does not', () => {
    for (const ex of rule.getIncorrectExamples()) expect(run(ex.getExample().replace(/<\/?marker>/g, '')).length).toBe(1);
    for (const ex of rule.getCorrectExamples()) expect(run(ex.getExample().replace(/<\/?marker>/g, ''))).toEqual([]);
  });

  it('check(): on by default, off with extraRules: false or disabledRules', async () => {
    process.env.LTJS_EXTRA_RULES = '1';
    const text = 'Die Klassen bereitet schon seit Wochen kleine Aufführungen vor.';
    const ids = async (o) => (await check(text, { language: 'de-DE', ...o })).matches.map((m) => m.rule.id);
    expect(await ids({})).toContain('LTJS_SUBJEKT_VERB');
    expect(await ids({ extraRules: false })).not.toContain('LTJS_SUBJEKT_VERB');
    expect(await ids({ disabledRules: ['LTJS_SUBJEKT_VERB'] })).not.toContain('LTJS_SUBJEKT_VERB');
  });
});
