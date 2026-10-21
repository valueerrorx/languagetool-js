// Ported from LongSentenceRuleTest (de module; overrides testMatch of the core test)
import { describe, it, expect } from 'vitest';
import { LongSentenceRule } from '../../../../src/lang/de/rules/LongSentenceRule.js';
import { UserConfig } from '../../../../src/core/rules/model/UserConfig.js';
import { Languages } from '../../../../src/core/Languages.js';
import { messagesFor, newLt } from '../../../support/ruleTestSupport.js';
import { german } from './_styleTestSupport.js';

describe('LongSentenceRuleTest', () => {
  const lang = german();
  const lt = newLt(lang);
  // Java: LongSentenceRuleTest#assertNoMatch(String,LongSentenceRule,JLanguageTool)
  const assertNoMatch = (input, rule) => expect(rule.match(lt.analyzeText(input)).length).toBe(0);
  // Java: LongSentenceRuleTest#assertMatch(String,int,int,LongSentenceRule,JLanguageTool)
  const assertMatch = (input, from, to, rule) => {
    const matches = rule.match(lt.analyzeText(input));
    expect(matches.length).toBe(1);
    expect(matches[0].getFromPos()).toBe(from);
    expect(matches[0].getToPos()).toBe(to);
  };

  // Java: LongSentenceRuleTest#testMatch
  it('testMatch', () => {
    const rule = new LongSentenceRule(messagesFor(Languages.getLanguageForShortCode('de')) /* Java: TestTools.getMessages("de") */, new UserConfig(), 6);

    assertNoMatch('Eins zwei drei vier fünf sechs.', rule);
    //  Words after colon are treated like a separate sentence
    assertNoMatch('Ich zähle jetzt: "Eins zwei drei vier fünf sechs."', rule);
    assertNoMatch('Peter, bist du bereit?” Er nickte nur.\n', rule);
    assertNoMatch('Peter, du bist bereit.” Er nickte nur.\n', rule);
    assertNoMatch('Eins zwei drei vier fünf (sechs sieben) acht.', rule);
    assertMatch('Eins zwei drei vier fünf sechs sieben.', 0, 38, rule);
    assertMatch('Eins zwei drei vier fünf (sechs sieben) acht neun.', 0, 50, rule);
    assertMatch('Ich zähle jetzt: Eins zwei drei vier fünf sechs sieben.', 0, 55, rule);
    assertMatch('Ein Satz. Eins zwei drei vier fünf sechs sieben.', 10, 48, rule);
  });
});

