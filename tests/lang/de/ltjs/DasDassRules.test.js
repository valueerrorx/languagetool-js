// LTJS layer (D-061): das/dass rules, positive and negative examples per rule, plus the layer switch (env, check() option, /v2 parameter).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import '../../../../src/lang/register.js';
import { Languages } from '../../../../src/core/Languages.js';
import { JLanguageTool } from '../../../../src/core/JLanguageTool.js';
import { messagesFor, newLt } from '../../../support/ruleTestSupport.js';
import { getLtjsGermanDasDassRules, LTJS_DAS_DASS_RULE_IDS } from '../../../../src/lang/de/ltjs/DasDassRules.js';
import { LTJS_GERMAN_RULE_IDS } from '../../../../src/lang/de/ltjs/GermanLtjsRules.js';
import { parseExtraRulesFlag, getExtraRuleIds, isExtraRulesEnabled } from '../../../../src/core/ltjs/extraRules.js';
import { check } from '../../../../src/index.js';
import { V2TextChecker } from '../../../../src/server/TextChecker.js';
import { RequestCounter } from '../../../../src/server/LanguageToolHttpHandler.js';
import { HTTPServerConfig } from '../../../../src/server/HTTPServerConfig.js';
import { Headers } from '../../../../src/server/HttpExchange.js';
import { AnnotatedTextBuilder } from '../../../../src/core/text/AnnotatedTextBuilder.js';

const deDE = Languages.getLanguageForShortCode('de-DE');
const rules = Object.fromEntries(getLtjsGermanDasDassRules(messagesFor(deDE), deDE).map((r) => [r.getId(), r]));
const lt = newLt(deDE);

// matches of one rule as "covered->suggestion"
function run(id, text) {
  return rules[id].match(lt.getAnalyzedSentence(text)).map((m) => `${text.slice(m.getFromPos(), m.getToPos())}->${m.getSuggestedReplacements()[0]}`);
}

// matches of all layer rules
function runAll(text) {
  const as = lt.getAnalyzedSentence(text);
  return Object.values(rules).flatMap((r) => r.match(as).map((m) => `${r.getId()}:${text.slice(m.getFromPos(), m.getToPos())}`));
}

const CASES = {
  LTJS_DAS_DASS_VERB: {
    bad: [
      ['Sie sagte mir, das sie morgen kommt.', 'das->dass'],
      ['Wir wissen, das es schwierig wird.', 'das->dass'],
      ['Er behauptet, das er nichts gesehen hat.', 'das->dass'],
      ['Wir gehen davon aus, das alle Teilnehmer pünktlich erscheinen.', 'das->dass'],
      ['Kann es sein, das ich mich geirrt habe?', 'das->dass'],
      ['Es freut mich sehr, das du die Prüfung bestanden hast.', 'das->dass'],
      ['Wir hoffen, das Sie zufrieden sind.', 'das->dass'],
      ['Seinen Austritt begründete er damit, das er sich bedroht fühlte.', 'das->dass'],
      ['In Experimenten konnte gezeigt werden, das eine höhere Dosis besser wirkt.', 'das->dass'],
      ['Beachten Sie bitte darauf, das die Tür abends verschlossen bleibt.', 'das->dass'],
      ['Im Studium habe ich gelernt, das man Quellen prüfen muss.', 'das->dass'],
      ['Wir danken für Ihr Vertrauen und hoffen, das Sie wiederkommen.', 'das->dass'],
      ['Für die Anmeldung reicht es aus, das Sie das Formular abschicken.', 'das->dass'],
      ['Sie hatte versprochen, das sie anrufen würde sobald sie ankommt.', 'das->dass'],
      ['Beim Abbiegen muss man aufpassen, das man niemanden übersieht.', 'das->dass'],
      ['Aber können wir uns darauf verständigen, das jeder seinen Teller abräumt?', 'das->dass'],
      ['Diese Reformen führten dazu, das die Opposition die Regierung zu unterstützen begann.', 'das->dass'],
      ['Für die Statik bedeutet dies, das die Wand verstärkt werden muss.', 'das->dass'],
    ],
    good: [
      'Ich glaube, das ist richtig.',
      'Er sagte, das sei kein Problem.',
      'Ich habe das Buch gelesen, das du mir empfohlen hast.',
      'Ich weiß, das Auto ist kaputt.',
      'Ich hoffe, das klappt.',
      'Sie meinte, das wüsste sie nicht.',
      'Ich glaube, das muss er selbst entscheiden.',
      'Ich habe gehört, das Konzert wurde abgesagt.',
      'Er hat mir das Geld gegeben, das ich brauchte.',
      'Wir haben gesehen, dass das Haus brennt.',
      'Ich habe ein Lied gelernt, das mir gefällt.',
      'Er musste auf das Kind aufpassen, das krank war.',
      'Ich habe das Buch gekauft und gelesen, das er empfohlen hat.',
      'Wir haben ein Haus gesehen und gehofft, das wir kaufen können.',
    ],
  },
  LTJS_DAS_DASS_NOMEN: {
    bad: [
      ['Er war der Ansicht, das wir zu spät kommen würden.', 'das->dass'],
      ['Die Tatsache, das er gelogen hat, ärgert mich.', 'das->dass'],
      ['Das Problem ist, das niemand antwortet.', 'das->dass'],
      ['Wichtig ist, das alle mitmachen.', 'das->dass'],
      ['Ich hatte die Befürchtung, das etwas passiert ist.', 'das->dass'],
    ],
    good: [
      'Das Buch, das ich gelesen habe, war gut.',
      'Sie zeigte mir das Foto, das sie gemacht hatte.',
      'Wir haben das Problem besprochen, das uns Sorgen macht.',
      'Er erzählte von dem Unfall, das Auto war total beschädigt.',
      'Wir freuen uns über das Angebot, das Sie uns gemacht haben.',
      'Das Konzept der Universität, das in Kassel umgesetzt wurde, gilt als Erfolg.',
      'Es ist ein Spiel, das Kinder lieben.',
      'Wichtig ist auch, das Brot lange genug zu backen.',
    ],
  },
  LTJS_DAS_DASS_ADJ: {
    bad: [
      ['Es ist klar, das wir mehr Zeit brauchen.', 'das->dass'],
      ['Ich bin froh, das du gekommen bist.', 'das->dass'],
    ],
    good: [
      'Es ist wichtig, das Formular auszufüllen.',
      'Das Haus ist so groß, das reicht für uns alle.',
      'Es ist klar, das ist kein Spaß.',
    ],
  },
  LTJS_DAS_DAS: {
    bad: [
      ['Er erklärte, das das Projekt gescheitert sei.', 'das->dass'],
      ['Ich habe bemerkt, das die Tür offen war.', 'das->dass'],
      ['Ich wollte Bescheid geben, das der Termin verschoben wird.', 'das->dass'],
    ],
    good: [
      'Das Haus, das die Familie gekauft hat, ist alt.',
      'Er sieht das Kind, das die Katze füttert.',
      'Sie hat gesagt, dass das Essen gut war.',
    ],
  },
  LTJS_SO_ADJ_DASS: {
    bad: [
      ['Der Film war so langweilig, das wir eingeschlafen sind.', 'das->dass'],
      ['Es war so kalt, das der See zugefroren ist.', 'das->dass'],
    ],
    good: [
      'Er war so müde, das Buch fiel ihm aus der Hand.',
      'Es war so kalt, dass der See zugefroren ist.',
    ],
  },
  LTJS_SODASS: {
    bad: [
      ['Der Zug hatte Verspätung, so das wir den Anschluss verpassten.', 'so das->sodass'],
      ['Im Winter sinkt die Kaltluft ab, so das es im Tal kälter ist als am Hang.', 'so das->sodass'],
    ],
    good: [
      'Er sagte, so das Gerücht, nichts.',
      'Die Lage sei ernst, so das Ministerium am Montag in Berlin.',
      'Der Zug hatte Verspätung, sodass wir den Anschluss verpassten.',
    ],
  },
  LTJS_DASS_SATZANFANG: {
    bad: [
      ['Das du so früh kommst, freut mich.', 'Das->Dass'],
      ['Das er gewonnen hat, wundert niemanden.', 'Das->Dass'],
      ['Das Kinder lernen müssen, sorgfältig mit Geld umzugehen, ist klar.', 'Das->Dass'],
    ],
    good: [
      'Das Kind schläft, sagt sie.',
      'Das alles passiert, weil wir nichts tun.',
      'Das ändert sich, wenn er kommt.',
    ],
  },
  LTJS_DASS_RELATIVPRONOMEN: {
    bad: [
      ['Das Auto, dass er gekauft hat, ist rot.', 'dass->das'],
      ['Das Programm, dass wir installiert haben, läuft stabil.', 'dass->das'],
      ['Ein Bericht liegt vor, ein Gutachten, dass im Auftrag der Stadt erstellt wurde.', 'dass->das'],
      ['Insgesamt ein solides Fahrrad, dass ich empfehlen kann.', 'dass->das'],
      ['Er hielt ein Versprechen, dass er seiner Mutter gegeben hatte.', 'dass->das'],
      ['Im Fenster sah er ein Plakat in dem alten Kino, dass ihn überraschte.', 'dass->das'],
      ['Wir haben ein Hotel am See gebucht, dass uns Freunde empfohlen hatten.', 'dass->das'],
      ['Sie kam zurück und brachte ein Foto mit, dass sie im Urlaub gemacht hatte.', 'dass->das'],
      ['Bitte wählen Sie ein Kennwort, dass Sie sonst nirgends verwenden.', 'dass->das'],
      ['Im Ort wurde ein Museum errichtet, dass bis 1990 bestand.', 'dass->das'],
      ['Das ist ein Problem, dass die Leute stört.', 'dass->das'],
    ],
    good: [
      'Es ist ein Zeichen, dass man uns braucht.',
      'Er hat dem Kind empfohlen, dass es das Buch kauft.',
      'Das Gefühl, dass man gebraucht wird, ist schön.',
      'Ich habe ihm das Buch gegeben, dass er es lesen kann.',
      'Er schrieb ein Buch, dass er danach empfohlen hat, die Regeln zu ändern.',
      'Es ist allgemein bekannt, dass er Briefmarken sammelt.',
      'Das Gefühl, dass alles gut wird, ist schön.',
      'Das Ergebnis, dass die Preise steigen, überrascht niemanden.',
      'Das Versprechen, dass er kommt, hat er gehalten.',
      'Er erhielt die Nachricht, dass sein Vater gestorben sei.',
    ],
  },
  LTJS_DAS_DASS_KOMMA: {
    bad: [
      ['Vor der Abreise erfuhr er, das der Zug ausfällt.', 'das->dass'],
      ['Allerdings machte er deutlich, das er bleiben wollte.', 'das->dass'],
      ['Sie glaubt, das Maria eine Kollegin, mit der sie oft streitet, unterstützen wird.', 'das->dass'],
    ],
    good: [
      'Er las ein Buch, das ihm gefiel.',
      'Er sah etwas, das ihn erschreckte.',
      'Wir besuchten Berlin, das uns gefiel.',
      'Er traf ihn in Wien, das er liebte.',
      'Das Nachdenken darüber, welches die Faktoren seien, unter denen sich Demokratien entwickeln, hat begonnen.',
    ],
  },
  LTJS_OHNE_DASS: {
    bad: [
      ['Er verließ den Raum, ohne das jemand etwas bemerkte.', 'das->dass'],
      ['Sie half mir, anstatt das sie sich beschwerte.', 'das->dass'],
    ],
    good: [
      'Das ist ein Werkzeug, ohne das man nicht arbeiten kann.',
      'Er ging ohne das Geld nach Hause.',
      'Er kam, ohne das Auto zu nehmen.',
      'Sie erhalten das Gerät pünktlich ohne das zusätzliche Kosten entstehen.',
    ],
  },
  LTJS_DASS_STATT_DAS: {
    bad: [
      ['Ist dass für Sie in Ordnung?', 'dass->das'],
      ['Wenn Sie Fragen haben, teilen Sie uns dass bitte mit.', 'dass->das'],
      ['Geben Sie Salz dazu, dass verbessert den Geschmack.', 'dass->das'],
      ['Melden Sie sich bei der Verwaltung, dass Büro ist morgens geöffnet.', 'dass->das'],
    ],
    good: [
      'Ich hoffe, dass gesagt wird, was los ist.',
      'Ich weiß, dass Geld fehlt.',
      'Ich glaube schon, dass.',
      'Er sagte, dass er, wie immer, pünktlich komme.',
      'Es gibt Einigkeit darüber, dass bestimmte Kompetenzen dazugehören, z. B. Lesen.',
      'Was kann ich dafür, dass die Macht auf krummen Beinen Wandelt?',
    ],
  },
};

describe('LTJS das/dass rules', () => {
  it('has one rule per registered id', () => {
    expect(Object.keys(rules).sort()).toEqual([...LTJS_DAS_DASS_RULE_IDS].sort());
    for (const r of Object.values(rules)) {
      expect(r.getId().startsWith('LTJS_')).toBe(true);
      expect(r.getCategory().getId().toString()).toBe('GRAMMAR');
    }
  });

  for (const [id, { bad, good }] of Object.entries(CASES)) {
    it(`${id}: positive examples`, () => {
      for (const [text, expected] of bad) expect(run(id, text), text).toEqual([expected]);
    });
    it(`${id}: negative examples`, () => {
      for (const text of good) expect(run(id, text), text).toEqual([]);
    });
  }

  it('no layer rule fires on correct sentences', () => {
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

describe('LTJS layer switch', () => {
  let saved;
  beforeAll(() => { saved = process.env.LTJS_EXTRA_RULES; });
  afterAll(() => { if (saved === undefined) delete process.env.LTJS_EXTRA_RULES; else process.env.LTJS_EXTRA_RULES = saved; });

  it('parseExtraRulesFlag', () => {
    expect(parseExtraRulesFlag(undefined)).toBe(true);
    expect(parseExtraRulesFlag('')).toBe(true);
    expect(parseExtraRulesFlag('1')).toBe(true);
    expect(parseExtraRulesFlag('true')).toBe(true);
    expect(parseExtraRulesFlag('0')).toBe(false);
    expect(parseExtraRulesFlag('false')).toBe(false);
    expect(parseExtraRulesFlag('OFF')).toBe(false);
    expect(parseExtraRulesFlag(false)).toBe(false);
    expect(parseExtraRulesFlag(undefined, false)).toBe(false);
  });

  it('env LTJS_EXTRA_RULES adds or removes the layer', () => {
    const ids = (l) => l.getAllRules().map((r) => r.getId()).filter((id) => id.startsWith('LTJS_'));
    process.env.LTJS_EXTRA_RULES = '0';
    expect(isExtraRulesEnabled()).toBe(false);
    expect(getExtraRuleIds('de')).toEqual([]);
    expect(ids(new JLanguageTool(deDE))).toEqual([]);
    process.env.LTJS_EXTRA_RULES = '1';
    expect(isExtraRulesEnabled()).toBe(true);
    expect(getExtraRuleIds('de')).toEqual([...LTJS_GERMAN_RULE_IDS]);
    expect(ids(new JLanguageTool(deDE)).sort()).toEqual([...LTJS_GERMAN_RULE_IDS].sort());
    delete process.env.LTJS_EXTRA_RULES; // default: on
    expect(ids(new JLanguageTool(deDE)).length).toBe(LTJS_GERMAN_RULE_IDS.length);
    expect(ids(new JLanguageTool(Languages.getLanguageForShortCode('en-US')))).toEqual([]);
  });

  it('check(): extraRules option and disabledRules', async () => {
    process.env.LTJS_EXTRA_RULES = '1';
    const text = 'Meine Nachbarin hat mir erzählt, das ihr Sohn im Ausland studiert.'; // Java does not flag it
    const ltjs = async (o) => (await check(text, { language: 'de-DE', ...o })).matches.filter((m) => m.rule.id.startsWith('LTJS_'));
    const on = await ltjs({});
    expect(on.length).toBe(1);
    expect(on[0].replacements[0].value).toBe('dass');
    expect(await ltjs({ extraRules: false })).toEqual([]);
    expect((await ltjs({ disabledRules: [on[0].rule.id] })).map((m) => m.rule.id)).not.toContain(on[0].rule.id);
    expect(await ltjs({ disabledRules: LTJS_GERMAN_RULE_IDS })).toEqual([]);
  });

  it('/v2/check: ltjsExtraRules parameter', async () => {
    process.env.LTJS_EXTRA_RULES = '1';
    const ids = async (extra) => {
      const params = new Map([['text', 'not used'], ['language', 'de-DE']]);
      if (extra !== undefined) params.set('ltjsExtraRules', extra);
      const ex = { out: '', requestHeaders: new Headers(), responseHeaders: new Headers() };
      ex.getRequestHeaders = () => ex.requestHeaders;
      ex.getResponseHeaders = () => ex.responseHeaders;
      ex.sendResponseHeaders = () => {};
      ex.write = (b) => { ex.out += Buffer.from(b).toString('utf8'); };
      const checker = new V2TextChecker(new HTTPServerConfig(8081), false, null, new RequestCounter());
      await checker.checkText(new AnnotatedTextBuilder().addText('Meine Nachbarin hat mir erzählt, das ihr Sohn im Ausland studiert.').build(), ex, params, null, null);
      return JSON.parse(ex.out).matches.map((m) => m.rule.id).filter((id) => id.startsWith('LTJS_'));
    };
    expect((await ids(undefined)).length).toBe(1);
    expect(await ids('false')).toEqual([]);
    expect(await ids('0')).toEqual([]);
    expect((await ids('true')).length).toBe(1);
  });
});
