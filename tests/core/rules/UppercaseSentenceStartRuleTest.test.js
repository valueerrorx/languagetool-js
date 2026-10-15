// Ported from UppercaseSentenceStartRuleTest (languagetool-core); Demo language replaced by en-US
import { describe, it, expect } from 'vitest';
import { UppercaseSentenceStartRule } from '../../../src/core/rules/UppercaseSentenceStartRule.js';
import { Example } from '../../../src/core/rules/model/Examples.js';
import { EN, englishMessages, newLt, useNoopAnalysis } from '../../support/ruleTestSupport.js';

describe('UppercaseSentenceStartRuleTest', () => {
  useNoopAnalysis(EN);
  const rule = new UppercaseSentenceStartRule(englishMessages(), EN, Example.wrong('<marker>a</marker> sentence.'), Example.fixed('<marker>A</marker> sentence.'));
  const lt = newLt(EN);
  const assertGood = (s) => {
    const analyzedSentences = lt.analyzeText(s);
    expect(rule.match(analyzedSentences).length).toBe(0);
  };

  // Java: UppercaseSentenceStartRuleTest#testRule
  it('testRule', () => {
    // correct sentences:
    assertGood("this");
    assertGood("a) This is a test sentence.");
    assertGood("iv. This is a test sentence...");
    assertGood("\"iv. This is a test sentence...\"");
    assertGood("»iv. This is a test sentence...");
    assertGood("This");
    assertGood("This is");
    assertGood("This is a test sentence");
    assertGood("");
    assertGood("http://www.languagetool.org");
    assertGood("eBay can be at sentence start in lowercase.");
    assertGood("¿Esto es una pregunta?");
    assertGood("¿Esto es una pregunta?, ¿y esto?");
    assertGood("ø This is a test sentence with a wrong bullet character.");
    // incorrect sentences:
    let matches = rule.match(lt.analyzeText("this is a test sentence."));
    expect(matches.length).toBe(1);
    expect(matches[0].getFromPos()).toBe(0);
    expect(matches[0].getToPos()).toBe(4);
    let matches2 = rule.match(lt.analyzeText("this!"));
    expect(matches2.length).toBe(1);
    expect(matches2[0].getFromPos()).toBe(0);
    expect(matches2[0].getToPos()).toBe(4);
    let matches3 = rule.match(lt.analyzeText("'this is a sentence'."));
    expect(matches3.length).toBe(1);
    let matches4 = rule.match(lt.analyzeText("\"this is a sentence.\""));
    expect(matches4.length).toBe(1);
    let matches5 = rule.match(lt.analyzeText("„this is a sentence."));
    expect(matches5.length).toBe(1);
    let matches6 = rule.match(lt.analyzeText("«this is a sentence."));
    expect(matches6.length).toBe(1);
    let matches7 = rule.match(lt.analyzeText("‘this is a sentence."));
    expect(matches7.length).toBe(1);
    let matches8 = rule.match(lt.analyzeText("¿esto es una pregunta?"));
    expect(matches8.length).toBe(1);
    let matches9 = rule.match(lt.analyzeText("¿Esto es una pregunta? ¿y esto?"));
    expect(matches9.length).toBe(1);
  });
});
