// Ported from GermanFillerWordsRuleTest (de module)
import { describe, it, expect } from 'vitest';
import { GermanFillerWordsRule } from '../../../../src/lang/de/rules/GermanFillerWordsRule.js';
import { UserConfig } from '../../../../src/core/rules/model/UserConfig.js';
import { messagesFor, newLt } from '../../../support/ruleTestSupport.js';
import { german, setUpRule as setUpRuleOn } from './_styleTestSupport.js';

describe('GermanFillerWordsRuleTest', () => {
  const lang = german();
  // Java: GermanFillerWordsRuleTest#setUpRule(JLanguageTool,UserConfig)
  const setUpRule = (lt, userConfig) => setUpRuleOn(lt, new GermanFillerWordsRule(messagesFor(lang), lang, userConfig));

  // Java: GermanFillerWordsRuleTest#testRule
  it('testRule', () => {
    const lt = newLt(lang);
    setUpRule(lt, null);

    //  more than 8% filler words (default)
    expect(lt.check('Der Satz enthält augenscheinlich ein Füllwort.').length).toBe(1);
    expect(lt.check('Der Satz enthält augenscheinlich relativ viele Füllwörter.').length).toBe(2);
    //  less than 8% filler words - don't show them
    expect(lt.check('Der Satz enthält augenscheinlich ein Füllwort, aber es sind nicht genug um angezeigt zu werden.').length).toBe(0);
    //  direct speech or citation - don't show filler words
    expect(lt.check('»Der Satz enthält augenscheinlich ein Füllwort«').length).toBe(0);
    //  less than 8% filler words - but three in one sentence (show 3 instead of 4) <- don't show them per default
    expect(lt.check('Der Text enthält zu wenige Füllwörter, daher werden sie nicht angezeigt. Was sich an diesem Satz mit diesem relativ einfachen Füllwort zeigt. Dazu müssen noch eine Reihe von Sätzen geschrieben werden, um die Anzahl der Wörter zu erhöhen. Langsam sollten die Anzahl der Worte für das Drücken unter die kritische Grenze reichen. Jetzt schreibe ich allerdings einen Satz, der drei Füllwörter enthält, was allemal ziemlich ausreichend ist.').length).toBe(0);
    //  less than 8% filler words - but two consecutively (show 2 instead of 3) <- don't show them per default
    expect(lt.check('Der Text enthält zu wenige Füllwörter, daher werden sie nicht angezeigt. Was sich an diesem Satz mit diesem relativ einfachen Füllwort zeigt. Dazu müssen noch eine Reihe von Sätzen geschrieben werden, um die Anzahl der Wörter zu erhöhen. Langsam sollten die Anzahl der Worte für das Drücken unter die kritische Grenze reichen. Jetzt schreibe ich einen Satz, der zwei Füllwörter hintereinander enthält, was allemal ziemlich ausreichend ist.').length).toBe(0);

    //  percentage set to zero - show all filler words
    const ruleValues = new Map();
    ruleValues.set('FILLER_WORDS_DE', [0]);
    let userConfig = new UserConfig(ruleValues);
    setUpRule(lt, userConfig);
    expect(lt.check('»Der Satz enthält augenscheinlich ein Füllwort«').length).toBe(1);
    expect(lt.check('Der Satz enthält augenscheinlich ein Füllwort, aber es sind nicht genug um angezeigt zu werden.').length).toBe(1);

    ruleValues.set('FILLER_WORDS_DE', [8, true, true, true]);
    userConfig = new UserConfig(ruleValues);
    setUpRule(lt, userConfig);
    //  direct speech or citation - show filler words because of option set
    expect(lt.check('»Der Satz enthält augenscheinlich ein Füllwort«').length).toBe(1);
    //  less than 8% filler words - but three in one sentence (show 3 instead of 4)
    expect(lt.check('Der Text enthält zu wenige Füllwörter, daher werden sie nicht angezeigt. Was sich an diesem Satz mit diesem relativ einfachen Füllwort zeigt. Dazu müssen noch eine Reihe von Sätzen geschrieben werden, um die Anzahl der Wörter zu erhöhen. Langsam sollten die Anzahl der Worte für das Drücken unter die kritische Grenze reichen. Jetzt schreibe ich allerdings einen Satz, der vier Füllwörter enthält, was allemal ziemlich ausreichend ist.').length).toBe(4);
    //  less than 8% filler words - but two consecutively (show 2 instead of 3)
    expect(lt.check('Der Text enthält zu wenige Füllwörter, daher werden sie nicht angezeigt. Was sich an diesem Satz mit diesem relativ einfachen Füllwort zeigt. Dazu müssen noch eine Reihe von Sätzen geschrieben werden, um die Anzahl der Wörter zu erhöhen. Langsam sollten die Anzahl der Worte für das Drücken unter die kritische Grenze reichen. Jetzt schreibe ich einen Satz, der zwei Füllwörter hintereinander enthält, was allemal ziemlich ausreichend ist.').length).toBe(3);
  });
});
