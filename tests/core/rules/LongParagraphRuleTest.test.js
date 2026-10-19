// Ported from LongParagraphRuleTest (languagetool-core)
import { describe, it, expect } from 'vitest';
import { LongParagraphRule } from '../../../src/core/rules/LongParagraphRule.js';
import { englishMessages, newLt } from '../../support/ruleTestSupport.js';
import { getDemoLanguage, useXxTestResources } from '../../support/DemoLanguage.js';

describe('LongParagraphRuleTest', () => {
  useXxTestResources();
  const EN = getDemoLanguage();

  // Java: LongParagraphRuleTest#testRule
  it('testRule', () => {
    const rule = new LongParagraphRule(englishMessages(), EN, null, 6);
    const lt = newLt(EN);
    expect(rule.match(lt.analyzeText('This is a short paragraph.')).length).toBe(0);
    expect(rule.match(lt.analyzeText('This is only almost long paragraph by unit test standards.')).length).toBe(0);
    expect(rule.match(lt.analyzeText("Here's some text as a filler. This is a long paragraph by unit test standards.")).length).toBe(1);
    expect(rule.match(lt.analyzeText("Here's some text as a filler.  A test. A long paragraph by unit test standards.")).length).toBe(1);
    expect(rule.match(lt.analyzeText("Here's some text as a filler.  A test.\nNot a long paragraph.\nBecause of the line breaks.\n")).length).toBe(0);
    expect(rule.match(lt.analyzeText('- [ ] A test.\n- [ ] Not a long paragraph.\n- [ ] Because of the line breaks.\n- [ ] More text even.\n')).length).toBe(0);

    const text1 = "This is a short paragraph.\n\nHere's some text as filler. This is a long paragraph by unit test standards.";
    const matches1 = rule.match(lt.analyzeText(text1));
    expect(matches1.length).toBe(1);
    expect(matches1[0].getFromPos()).toBe(45); // "filler"
    expect(matches1[0].getToPos()).toBe(54);

    const text2 = "Here's some text as filler. This is a long paragraph by unit test standards.\n\nAnother paragraph.\n\nHere's some text as morefiller - this is a long paragraph by unit test standards.";
    const matches2 = rule.match(lt.analyzeText(text2));
    expect(matches2.length).toBe(2);
    expect(matches2[0].getFromPos()).toBe(17); // "filler"
    expect(matches2[0].getToPos()).toBe(26);
    expect(matches2[1].getFromPos()).toBe(115); // "morefiller"
    expect(matches2[1].getToPos()).toBe(128);
  });
});
