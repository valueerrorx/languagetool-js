// Ported from RedundantModalOrAuxiliaryVerbTest (de module)
import { describe, it, expect } from 'vitest';
import { RedundantModalOrAuxiliaryVerb } from '../../../../src/lang/de/rules/RedundantModalOrAuxiliaryVerb.js';
import { messagesFor } from '../../../support/ruleTestSupport.js';
import { german, ltWithRule } from './_styleTestSupport.js';

describe('RedundantModalOrAuxiliaryVerbTest', () => {
  const lang = german();

  // Java: RedundantModalOrAuxiliaryVerbTest#testRule
  it('testRule', () => {
    const lt = ltWithRule(lang, new RedundantModalOrAuxiliaryVerb(messagesFor(lang)));

    // matches
    expect(lt.check('Erst werde ich die Preise vergleichen und erst dann werde ich entscheiden, ob ich die Kamera kaufe.').length).toBe(1);
    expect(lt.check('Sie hat das Foto von mir als kleinem Jungen angeschaut und hat gelacht.').length).toBe(1);
    expect(lt.check('Ich bin gern in eurer Mitte und ich bin gern zu Gast bei euch.').length).toBe(1);
    expect(lt.check('Da ich nun einmal bin, wer ich bin und was ich bin, kann ich es nicht übers Herz bringen.').length).toBe(1);
    expect(lt.check('Wann ist jemand kühn und wann ist jemand tollkühn?').length).toBe(1);
    expect(lt.check('Tom ist um halb drei angekommen und Mary ist kurze Zeit später angekommen.').length).toBe(1);
    expect(lt.check('Das Essen ist gut und der Service hier ist gut.').length).toBe(1);
    expect(lt.check('Wir müssen wissen, was wir tun sollen und wie wir es tun sollen.').length).toBe(1);
    expect(lt.check('Ich muss unbedingt wissen, was zu tun ist, wie es zu tun ist und wann es zu tun ist.').length).toBe(1);
    expect(lt.check('Er erzählte ihr, eine böse Hexe habe ihn in einen Frosch verwandelt und nur sie allein habe ihn retten können und morgen würden sie gemeinsam in sein Reich fahren.').length).toBe(1);
    // no match
    expect(lt.check('„nicht dürfen“ und „nicht müssen“ dürfen nicht miteinander verwechselt werden.').length).toBe(0);
    expect(lt.check('Ich mag Physik und Mathematik mag ich noch mehr.').length).toBe(0);
    expect(lt.check('Aus Angst vor den Zeitungen sind Politiker langweilig und am Ende sind sie selbst für die Zeitungen zu langweilig.').length).toBe(0);
    expect(lt.check('Ändert der Akkusativ wirklich die Bedeutung eines Satzes: Sie hat Aids oder Aids hat sie?').length).toBe(0);
    expect(lt.check('Tom hat eine Tüte Äpfel gekauft und er hat an einem Tag ein Drittel davon gegessen.').length).toBe(0);
    expect(lt.check('Mein Vaterland ist mein Stadtviertel und nun ist es beinahe nicht wiedererkennbar.').length).toBe(0);
    expect(lt.check('Johnny hat Alice vorgeschlagen und sie hat akzeptiert.').length).toBe(0);
    expect(lt.check('Unsere Zeit hier ist begrenzt und sie ist wertvoll.').length).toBe(0);
    expect(lt.check('Manchmal ist die Wahrheit nützlich und manchmal ist sie unnütz.').length).toBe(0);
    expect(lt.check('Treue ist irgendwo absolut oder sie ist gar nichts.').length).toBe(0);
    expect(lt.check('Sie mag niemanden und niemand mag sie.').length).toBe(0);
    expect(lt.check('Eines Tages wird die USA eine Frau als Präsidenten wählen und das wird kein schönes Schauspiel sein.').length).toBe(0);
    expect(lt.check('Mein Name ist Mary und das ist Tom.').length).toBe(0);
    expect(lt.check('Er hat seine Augen langsam geöffnet und dann hat sie ihn geküsst.').length).toBe(0);
    expect(lt.check('Die Flaneure haben es prinzipiell nicht eilig und sind immer für ein Schwätzchen zu haben.').length).toBe(0);
    expect(lt.check('Es sind Tendenzen erkennbar und diese Tendenzen sind leider nicht ermutigend.').length).toBe(0);
    expect(lt.check('Ja ist ja und nein ist nein, das nennt man Offenheit.').length).toBe(0);
    expect(lt.check('Wie werden einmal unsere Namen hinter den Erfindern des Fliegens und dergleichen vergessen werden?').length).toBe(0);
    expect(lt.check('In den Chroniken ist über die Flut von 1342 zu lesen, dass im Mainzer Dom einem Mann das Wasser bis zur Brust gestanden habe und dass man in Köln mit Booten über die Stadtmauern habe fahren können.').length).toBe(0);
    expect(lt.check('Sie stellt sicher, dass die gerissenen Bänder nicht belastet werden können und dass das Gelenk dennoch bewegt werden kann.').length).toBe(0);
  });
});
