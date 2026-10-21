// Ported from GermanStyleRepeatedWordRuleTest (de module)
import { describe, it, expect } from 'vitest';
import { GermanStyleRepeatedWordRule } from '../../../../src/lang/de/rules/GermanStyleRepeatedWordRule.js';
import { UserConfig } from '../../../../src/core/rules/model/UserConfig.js';
import { messagesFor, newLt } from '../../../support/ruleTestSupport.js';
import { german, setUpRule as setUpRuleOn } from './_styleTestSupport.js';

describe('GermanStyleRepeatedWordRuleTest', () => {
  const lang = german();
  let ruleId;

  // Java: GermanStyleRepeatedWordRuleTest#setUpRule(JLanguageTool,Map)
  function setUpRule(lt, ruleValues) {
    const userConfig = ruleValues === null ? new UserConfig() : new UserConfig(ruleValues);
    const rule = new GermanStyleRepeatedWordRule(messagesFor(lang), lang, userConfig);
    ruleId = rule.getId();
    setUpRuleOn(lt, rule);
  }

  // Java: GermanStyleRepeatedWordRuleTest#getRuleValues(int,boolean,boolean)
  function getRuleValues(numSentences, excludeDirectSpeech, testComposedWords) {
    return new Map([[ruleId, [numSentences, excludeDirectSpeech, testComposedWords]]]);
  }

  // Java: GermanStyleRepeatedWordRuleTest#testRule
  it('testRule', () => {
    const lt = newLt(lang);
    setUpRule(lt, null);

    expect(lt.check('Der alte Mann wohnte in einem großen Haus. Es stand in einem großen Garten.').length).toBe(2);
    expect(lt.check('Der alte Mann wohnte in einem großen Haus. Es stand in einem weitläufigen Garten.').length).toBe(0);
    expect(lt.check('Endlos lang zog sich der Ton dahin, aber schließlich verklang er doch.').length).toBe(0);
    expect(lt.check('Die Au leuchtete im Blitz, die Glühwürmchen flimmerten vor Aufregung.').length).toBe(0);
    expect(lt.check('Sie sind alle in der gleichen Art hergestellt. Nur bei einem Artefakt wurde eine andere Vorgehensweise angewandt.').length).toBe(0);
    expect(lt.check('Ich erkannte keinen Lidschlag zu spät, dass es nicht in ihrer Absicht lag.').length).toBe(0);
    expect(lt.check('Dieser Schritt brachte uns näher an die Lösung. Der nächste würde das Problem für immer aus der Welt schaffen.').length).toBe(0);
    expect(lt.check('Er lehnte seinen Wanderstab gegen die Wand.').length).toBe(0);
    expect(lt.check('Zweifel lagen in der Luft, ob es richtig war, diesen Weg einzuschlagen.').length).toBe(0);
    expect(lt.check('Der Donnerhall verklang nur langsam in meinen Ohren. Das war mir in all den Jahren meines Lebens noch nicht passiert.').length).toBe(0);
    expect(lt.check('Der Schiffsmotor, der im Heck des Schiffs eingebaut war, röhrte. Auf Hochtouren lief der Motor.').length).toBe(0);
    expect(lt.check('Der Buntspecht stolzierte den Baum hoch. Schon klopfte der Specht.').length).toBe(0);
    expect(lt.check('Rotbraun war die Farbe der Haselnuss. Der Horizont schimmerte rot.').length).toBe(0);
    expect(lt.check("Rotbraun war die Farbe der Haselnuss. Was für eine 'Farbe'?").length).toBe(0);
    expect(lt.check('Der Ausblick war überwätigend. "Was für ein Ausblick!", sagte sie auch prompt.').length).toBe(0);
    expect(lt.check('Frau Heinrich stand unschlüssig in in ihrem Garten. Frau Müller schaute zu ihr herüber.').length).toBe(0);

    setUpRule(lt, getRuleValues(1, false, true));
    expect(lt.check('Der Schiffsmotor, der im Heck des Schiffs eingebaut war, röhrte. Auf Hochtouren lief der Motor.').length).toBe(3);
    expect(lt.check('Der Buntspecht stolzierte den Baum hoch. Schon klopfte der Specht.').length).toBe(2);
    expect(lt.check('Rotbraun war die Farbe der Haselnuss. Der Horizont schimmerte rot.').length).toBe(2);
    expect(lt.check('Der Ausblick war überwätigend. "Was für ein Ausblick!", sagte sie auch prompt.').length).toBe(2);
  });
});
