// Ported from GermanWrongWordInContextRuleTest (de-DE, real German disambiguation and chunking since F51)
import { describe, it, expect } from 'vitest';
import { Languages } from '../../../src/core/Languages.js';
import { GermanWrongWordInContextRule } from '../../../src/lang/de/rules/GermanWrongWordInContextRule.js';
import { newLt } from '../../support/ruleTestSupport.js';

describe('GermanWrongWordInContextRuleTest', () => {
  const lang = Languages.getLanguageForShortCode('de-DE');
  const lt = newLt(lang);
  const rule = new GermanWrongWordInContextRule(null, lang);
  const assertGood = (sentence) => expect(rule.match(lt.getAnalyzedSentence(sentence)).length).toBe(0);
  const assertBad = (sentence) => expect(rule.match(lt.getAnalyzedSentence(sentence)).length).toBe(1);

  // Java: GermanWrongWordInContextRuleTest#testRule
  it('testRule', () => {
    // Laiche/Leiche
    assertBad("Eine Laiche ist ein toter Körper.");
    assertGood("Eine Leiche ist ein toter Körper.");
    assertGood("Die Leichen der Verstorbenen wurden ins Wasser geworfen.");
    // Lid/Lied
    //assertGood("Ihre Lider sind entzündet.");
    //assertGood("Er hat entzündete Lider.");
    //assertGood("Wir singen gemeinsam Lieder.");
    //assertGood("Lieder singen wir.");
    //expect(rule.match(lt.getAnalyzedSentence("Lider singen wir."))[0].getFromPos()).toBe(0);
    //expect(rule.match(lt.getAnalyzedSentence("Ihre Lieder sind entzündet."))[0].getToPos()).toBe(11);
    //expect(rule.match(lt.getAnalyzedSentence("Er hat entzündete Lieder."))[0].getSuggestedReplacements()[0]).toBe("Lider");
    //expect(rule.match(lt.getAnalyzedSentence("Wir singen gemeinsam Lider."))[0].getSuggestedReplacements()[0]).toBe("Lieder");
    // malen/mahlen
    //assertGood("Ich soll Bilder einer Mühle malen.");
    //assertGood("Ich male ein Bild einer Mühle.");
    //assertGood("Das Bild zeigt eine mahlende Mühle.");
    //assertGood("Eine mahlende Mühle zeigt das Bild.");
    //assertGood("Wenn du mal etwas Mehl brauchst, kannst du zu mir kommen.");
    //assertBad("Weizen ausmalen.");
    //assertBad("Ich mahle das Bild aus.");
    //assertBad("Eine Mühle wird zum Malen verwendet.");
    //assertBad("Das gemalene Korn aus der Mühle ist gut.");
    //assertBad("Zum Malen verwendet man eine Mühle.");
    //assertBad("Du musst das Bild ausmahlen.");
    //assertBad("Wir haben das im Kunstunterricht gemahlt.");
    //assertBad("Er hat ein schönes Selbstporträt gemahlt.");
    //expect(rule.match(lt.getAnalyzedSentence("Das Korn wird in den Mühlen gemalen."))[0].getSuggestedReplacements()[0]).toBe("gemahlen");
    //expect(rule.match(lt.getAnalyzedSentence("Wir mahlten im Kunstunterricht."))[0].getSuggestedReplacements()[0]).toBe("malten");
    // Mine/Miene
    assertGood("Er verzieht keine Miene.");
    assertGood("Er verzieht keine Miene.");
    assertGood("Die Explosion der Mine.");
    assertGood("Die Mine ist explodiert.");
    assertGood("Er versucht, keine Miene zu verziehen.");
    assertGood("Sie sollen weiter Minen eingesetzt haben.");
    assertGood("Er verzieht sich nach Bekanntgabe der Mineralölsteuerverordnung.");
    assertBad("Er verzieht keine Mine.");
    assertBad("Mit unbewegter Mine.");
    assertBad("Er setzt eine kalte Mine auf.");
    assertBad("Er sagt, die unterirdische Miene sei zusammengestürzt.");
    assertBad("Die Miene ist eingestürzt.");
    assertBad("Die Sprengung mit Mienen ist toll.");
    assertBad("Der Bleistift hat eine Miene.");
    assertBad("Die Mienen sind gestern Abend explodiert.");
    assertBad("Die Miene des Kugelschreibers ist leer.");
    expect(rule.match(lt.getAnalyzedSentence("Er hat das mit den Mienen weggesprengt."))[0].getSuggestedReplacements()[0]).toBe("Minen");
    expect(rule.match(lt.getAnalyzedSentence("Er versucht, keine Mine zu verziehen."))[0].getSuggestedReplacements()[0]).toBe("Miene");
    // Saite/Seite
    //assertGood("Die Seiten des Buches sind beschrieben.");
    // assertGood("Dieses Buch über die Gitarre hat nur sechs Seiten.");
    // assertGood("Diese Gitarre hat sechs Saiten.");
    // assertGood("Die UNO muss andere Saiten aufziehen.");
    // assertGood("Eine Gitarre hat Saiten, aber keine Seiten.");
    // assertGood("Die Saiten des Violoncellos sind kurz.");
    // assertGood("Dieses Buch über die Gitarre hat nur sechs Seiten.");
    // assertGood("Eine Seite und eine scharfe Suppe.");
    // assertBad("Die Saiten des Buches sind beschrieben.");
    // assertBad("Die Seiten des Klaviers werden angeschlagen.");
    // assertBad("Die Seiten der Kurzhalsgeige sind gerissen.");
    // assertBad("Die Seiten des Kontrabasses sind gerissen.");
    // assertBad("Bei der UNO müssen andere Seiten aufgezogen werden.");
    // assertBad("Die Seiten des Violoncellos sind kurz.");
    // expect(rule.match(lt.getAnalyzedSentence("Die E-Gitarre hat eine sechste Seite."))[0].getSuggestedReplacements()[0]).toBe("Saite");
    // expect(rule.match(lt.getAnalyzedSentence("Dieses Buch hat sechs Saiten."))[0].getSuggestedReplacements()[0]).toBe("Seiten");
    // Neutron/Neuron
    assertGood("Nervenzellen nennt man Neuronen");
    assertGood("Das Neutron ist elektisch neutral");
    assertBad("Atomkerne bestehen aus Protonen und Neuronen");
    assertBad("Über eine Synapse wird das Neutron mit einer bestimmten Zelle verknüpft und nimmt mit der lokal zugeordneten postsynaptischen Membranregion eines Dendriten Signale auf.");
    expect(rule.match(lt.getAnalyzedSentence("Protonen und Neuronen sind Bausteine des Atomkerns"))[0].getSuggestedReplacements()[0]).toBe("Neutronen");
    expect(rule.match(lt.getAnalyzedSentence("Das Axon des Neutrons ..."))[0].getSuggestedReplacements()[0]).toBe("Neurons");
    // Wunde/Winde
    assertGood("Das Seil läuft durch eine Winde.");
    assertGood("Eine blutende Wunde");
    assertBad("Es kamen Keime in die Winde.");
    assertBad("Möglicherweise wehen die Wunde gerade nicht günstig.");
    // betäuben/bestäuben
    assertGood("Er war durch die Narkose betäubt.");
    assertGood("Die Biene bestäubt die Blume.");
    assertBad("Den Kuchen mit Puderzucker betäuben.");
    assertBad("Von Drogen bestäubt spürte er keine Schmerzen.");
    // ver(r)eisen
    assertGood("Er verreist stets mit leichtem Gepäck.");
    assertGood("Die Warze wurde vereist.");
    assertBad("Nach Diktat vereist.");
    assertBad("Die Tragfläche war verreist.");
  }, 60000);
});
