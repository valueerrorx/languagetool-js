// LTJS layer (D-061): relative pronoun agreement rule, positive and negative examples.
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { Languages } from '../../../../src/core/Languages.js';
import { messagesFor, newLt } from '../../../support/ruleTestSupport.js';
import { getLtjsGermanRelativRules, LTJS_RELATIV_RULE_IDS } from '../../../../src/lang/de/ltjs/RelativRules.js';
import { check } from '../../../../src/index.js';

const deDE = Languages.getLanguageForShortCode('de-DE');
const rule = getLtjsGermanRelativRules(messagesFor(deDE), deDE)[0];
const lt = newLt(deDE);

// matches as "covered->suggestions"
function run(text) {
  return rule.match(lt.getAnalyzedSentence(text)).map((m) => `${text.slice(m.getFromPos(), m.getToPos())}->${m.getSuggestedReplacements().join('|')}`);
}

const BAD = [
  ['Das Protokoll, den du mir geschickt hast, habe ich gelesen.', 'den->das'],
  ['Ihr Unternehmen, die für seine Produkte bekannt ist, beeindruckt mich.', 'die->das'],
  ['Besonders betroffen sind Küstenregionen, dessen Bewohner mit Überschwemmungen kämpfen.', 'dessen->deren'],
  ['Eine Freundin, dessen Bruder Medizin studiert, hat mir geschrieben.', 'dessen->deren'],
  ['Der Arzt, die uns behandelt, ist krank.', 'die->der|den'], // nominative or accusative: both forms offered
  ['Der Teil, das wir brauchen, fehlt.', 'das->der|den'],
  ['Die Stadt, in dem ich wohne, ist klein.', 'dem->der'],
  ['Die Kinder, das draußen spielen, sind laut.', 'das->die'],
  ['Das Buch, der auf dem Tisch liegt, gehört mir.', 'der->das|dem'],
];

const GOOD = [
  'Das Protokoll, das du mir geschickt hast, habe ich gelesen.',
  'Die Bürgerinitiative, die seit Langem einen Schulweg fordert, ist zufrieden.',
  'Die Bürgerinitiative, der ich vertraue, ist zufrieden.',
  'Küstenregionen, deren Bewohner mit Überschwemmungen kämpfen, sind betroffen.',
  'Die Mutter des Kindes, die gestern angerufen hat, kommt morgen.',
  'Der Brief an die Firma, den ich geschrieben habe, ist weg.',
  'Ich kaufte Brot, die Kinder kauften Obst.',
  'Er hat einen Hund, die Katze hat er abgegeben.',
  'Das ist der Mann, dem ich geholfen habe.',
  'Die Freunde, denen ich vertraue, kommen morgen.',
  'Wir besuchten Berlin, das sehr groß ist.',
  'Er kam spät, der Zug hatte Verspätung.',
  'Ich traf den Lehrer, der war gut gelaunt.',
  'Das Haus am See, das wir gemietet haben, ist schön.',
  'Der Lehrer, die uns unterrichten, sind krank.', // 'Lehrer' is also plural: no decision
  'Am Abend waren wir in einem Heurigen, den uns die Rezeptionistin empfohlen hatte.', // nominalised adjective
  'Mit dem Bekannten, den ich traf, sprach ich lange.',
  // corpus false alarms (Leipzig news/wikipedia sample)
  'Beschlagnahmt wurden zwei Fahrzeuge, ein BMW und ein Audi, die als Tatmittel dienten.', // coordination
  'Dagegen stehen 42 Prozent, die ein Verbot ablehnen.', // measure
  'Er bekommt eine Beifahrerin, Case, aus dem Frauengefängnis, die ihm hilft.', // apposition
  'Selbst innerhalb der Bewegung gibt es seit langem Stimmen, die sich dagegen erheben.',
  'Dort liegt der Tierfriedhof Les Jardins du Souvenir, der 1989 eröffnet wurde.', // foreign name
  'Sie suchten nach „Macho“-Sängern mit Bart, die auch tanzen können.', // unknown compound
];

describe('LTJS relative pronoun rule', () => {
  it('has the registered id, category GRAMMAR', () => {
    expect(rule.getId()).toBe(LTJS_RELATIV_RULE_IDS[0]);
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
    const text = 'Das Protokoll, den du mir geschickt hast, habe ich gelesen.'; // Java does not flag it
    const ids = async (o) => (await check(text, { language: 'de-DE', ...o })).matches.map((m) => m.rule.id);
    expect(await ids({})).toContain('LTJS_RELATIVPRONOMEN');
    expect(await ids({ extraRules: false })).not.toContain('LTJS_RELATIVPRONOMEN');
    expect(await ids({ disabledRules: ['LTJS_RELATIVPRONOMEN'] })).not.toContain('LTJS_RELATIVPRONOMEN');
  });
});
