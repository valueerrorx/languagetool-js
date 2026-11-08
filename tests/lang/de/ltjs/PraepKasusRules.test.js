// LTJS layer (D-061): preposition case rule, positive and negative examples.
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { Languages } from '../../../../src/core/Languages.js';
import { messagesFor, newLt } from '../../../support/ruleTestSupport.js';
import { getLtjsGermanPraepKasusRules, LTJS_PRAEP_KASUS_RULE_IDS } from '../../../../src/lang/de/ltjs/PraepKasusRules.js';
import { check } from '../../../../src/index.js';

const deDE = Languages.getLanguageForShortCode('de-DE');
const rule = getLtjsGermanPraepKasusRules(messagesFor(deDE), deDE)[0];
const lt = newLt(deDE);

// matches as "covered->suggestions"
function run(text) {
  return rule.match(lt.getAnalyzedSentence(text)).map((m) => `${text.slice(m.getFromPos(), m.getToPos())}->${m.getSuggestedReplacements().join('|')}`);
}

const BAD = [
  ['Nach die Matura stellt sich die Frage.', 'die Matura->der Matura'],
  ['Seit die Ferien ist es ruhig.', 'die Ferien->den Ferien'],
  ['Ich fahre mit die großen Kinder.', 'die großen Kinder->den großen Kindern'],
  ['Er kommt aus das Haus.', 'das Haus->dem Haus'],
  ['Wir gehen zu eine Freundin.', 'eine Freundin->einer Freundin'],
  ['Ich wohne bei meine Eltern.', 'meine Eltern->meinen Eltern'],
  ['Sie spricht von ihren Bruder.', 'ihren Bruder->ihrem Bruder'],
  ['Er spielt mit sein neues Auto.', 'sein neues Auto->seinem neuen Auto'],
  ['Nach den Unterricht gehen wir heim.', 'den Unterricht->dem Unterricht'],
];

const GOOD = [
  'Nach der Matura stellt sich die Frage.',
  'Ich fahre mit den großen Kindern.',
  'Ich treffe mich mit ein paar Freunden.',
  'Mit ein bisschen Glück klappt es.',
  'Nach und nach die Arbeit erledigen.',
  'Er wohnt bei seinen Eltern.',
  'Sie kommt aus dem Haus.',
  'Ich gehe zu meinem Bruder.',
  'Wir fahren mit dem Bus.',
  'Ohne die Kinder ist es ruhig.',
  'Er bittet um die Erlaubnis, mit zu kommen.',
  'Die Kinder kommen mit, die Eltern bleiben.',
  'Seit die Anlage automatisch lief, war das nicht mehr nötig.', // conjunction
  'Eine Nacht auf dem Berg macht der Sage nach den Besucher zum Dichter.', // postposition
  'Das sind meiner Meinung nach die Richtungen, in die man gehen muss.',
  'Man betrat vom Garten aus den Rundbau.', // adverb 'aus'
];

const rule2 = getLtjsGermanPraepKasusRules(messagesFor(deDE), deDE)[1];
function run2(text) {
  return rule2.match(lt.getAnalyzedSentence(text)).map((m) => `${text.slice(m.getFromPos(), m.getToPos())}->${m.getSuggestedReplacements().join('|')}`);
}

const BAD2 = [
  ['Wir warteten eine halbe Stunde unter einen großen Baum.', 'einen großen Baum->einem großen Baum'],
  ['Wir treffen uns um sieben vor den Eingang.', 'den Eingang->dem Eingang'],
  ['Meine Oma wohnt in die Stadt.', 'die Stadt->der Stadt'],
  ['Das Buch liegt in die Schublade.', 'die Schublade->der Schublade'],
  ['Er sitzt neben das Fenster.', 'das Fenster->dem Fenster'],
];

const GOOD2 = [
  'Wir warteten eine halbe Stunde unter einem großen Baum.',
  'Wir gehen in die Stadt.',
  'Er legt das Buch in die Schublade.',
  'Ich stehe auf und gehe in die Küche.',
  'Er arbeitet bis in die Nacht.',
  'Sie lebt in den Tag hinein.',
  'Er arbeitet sich in die Materie ein.',
  'Wir warten auf den Bus.',
  'Der Ball trifft in die Mitte.',
  'Sie wohnt in den Bergen.',
  'Er setzt sich neben das Fenster.',
];

describe('LTJS preposition case rule', () => {
  it('has the registered id, category GRAMMAR', () => {
    expect(rule.getId()).toBe(LTJS_PRAEP_KASUS_RULE_IDS[0]);
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

  it('two-way prepositions (LTJS_PRAEP_WECHSEL): positive examples', () => {
    expect(BAD2.map(([text]) => run2(text))).toEqual(BAD2.map(([, expected]) => [expected]));
  });

  it('two-way prepositions (LTJS_PRAEP_WECHSEL): negative examples', () => {
    expect(GOOD2.map((text) => [text, run2(text)])).toEqual(GOOD2.map((text) => [text, []]));
  });

  it('check(): on by default, off with extraRules: false or disabledRules', async () => {
    process.env.LTJS_EXTRA_RULES = '1';
    const text = 'Nach die Matura stellt sich die Frage.';
    const ids = async (o) => (await check(text, { language: 'de-DE', ...o })).matches.map((m) => m.rule.id);
    expect(await ids({})).toContain('LTJS_PRAEP_DATIV');
    expect(await ids({ extraRules: false })).not.toContain('LTJS_PRAEP_DATIV');
    expect(await ids({ disabledRules: ['LTJS_PRAEP_DATIV'] })).not.toContain('LTJS_PRAEP_DATIV');
  });
});
