// Ported from GenericUnpairedQuotesRuleTest (languagetool-core); FakeLanguage replaced by en-US
import { describe, it, expect } from 'vitest';
import { GenericUnpairedQuotesRule } from '../../../src/core/rules/GenericUnpairedQuotesRule.js';
import { EN, englishMessages, newLt, useNoopAnalysis } from '../../support/ruleTestSupport.js';

describe('GenericUnpairedQuotesRuleTest', () => {
  useNoopAnalysis(EN);
  let lt;
  const setUpRule = () => {
    lt = newLt(EN, new GenericUnpairedQuotesRule(englishMessages(), ['»', '«', '"', "'", '›', '‹'], ['«', '»', '"', "'", '‹', '›']));
  };
  const assertMatches = (expectedMatches, input) => {
    const ruleMatches = lt.check(input);
    expect(ruleMatches.length, `Expected ${expectedMatches} matches, got: ${ruleMatches}`).toBe(expectedMatches);
  };

  // Java: GenericUnpairedQuotesRuleTest#testRule
  it('testRule', () => {
    setUpRule();
    assertMatches(0, "This is »correct«.");
    assertMatches(0, "This is «correct».");
    assertMatches(0, "»Correct«\n»And ›here‹ it ends.«");
    assertMatches(0, "«Correct»\n«And ‹here› it ends.»");
    assertMatches(0, "»Correct. This is more than one sentence.«");
    assertMatches(0, "»Correct. This is more than one sentence.«\n»And ›here‹ it ends.«");
    assertMatches(0, "»Correct«\n\n»And here it ends.«\n\nMore text.");
    assertMatches(0, "»Correct, he said. This is the next sentence.« Here's another sentence.");
    assertMatches(0, "»Correct«, he said.\n\n»This is the next sentence.« »Here's another sentence.«");
    assertMatches(0, "»Correct«, he said. »This is the next sentence.«\n»Here's another sentence.«");
    assertMatches(0, "This »is also ›correct‹«.");
    assertMatches(0, "Good.\n\nThis »is also ›correct‹«.");
    assertMatches(0, "Good.\n\n\nThis »is also ›correct‹«.");
    assertMatches(0, "Good.\n\n\n\nThis »is also ›correct‹«.");
    assertMatches(0, "This is \"correct\".");
    assertMatches(0, "This is 'correct'.");
    assertMatches(0, "\"Correct\"\n\"And 'here' it ends.\"");
    assertMatches(0, "'Correct'\n'And \"here\" it ends.'");
    assertMatches(0, "This \"is also 'correct'\".");
    assertMatches(0, "This isn't \"incorrect\".");
    assertMatches(0, "\"This isn't incorrect.\"");
    assertMatches(0, "The screen is 20\" wide.");
    assertMatches(0, "\"The screen is 20\" wide.\"");
    assertMatches(1, "This is not correct«");
    assertMatches(1, "This is »not correct.");
    assertMatches(1, "This is »not correct");
    assertMatches(1, "This is »not an error yet\n\nBut now it has become one");
    assertMatches(1, "This is correct.\n\n»But this is not.");
    assertMatches(1, "This is correct.\n\nBut this is not«");
    assertMatches(1, "»This is correct«\n\nBut this is not«");
    assertMatches(1, "»This is correct«\n\nBut this »is« not«");
    assertMatches(1, "This is not correct. No matter if it's more than one sentence«");
    assertMatches(1, "»This is not correct. No matter if it's more than one sentence");
    assertMatches(1, "Correct, he said. This is the next sentence.« Here's another sentence.");
    assertMatches(1, "»Correct, he said. This is the next sentence. Here's another sentence.");
    assertMatches(1, "»Correct, he said. This is the next sentence.\n\nHere's another sentence.");
    assertMatches(1, "»Correct, he said. This is the next sentence.\n\n\n\nHere's another sentence.");
    assertMatches(2, "»Correct«\n»And »here« it ends with two matches.«");
    assertMatches(2, "»Correct. This is more than one sentence.«\n»And »here« it ends.«");
    assertMatches(2, "Good.\n\nThis »is also »correct««.");
    assertMatches(2, "Good.\n\n\nThis »is also »correct««.");
    assertMatches(2, "Good.\n\n\n\nThis »is also »correct««.");
  });

  // Java: GenericUnpairedQuotesRuleTest#testRuleMatchPositions
  it('testRuleMatchPositions', () => {
    setUpRule();
    let match1 = lt.check("This »is a test.")[0];
    expect(match1.getFromPos()).toBe(5);
    expect(match1.getToPos()).toBe(6);
    expect(match1.getLine()).toBe(0);
    expect(match1.getEndLine()).toBe(0);
    expect(match1.getColumn()).toBe(5);
    expect(match1.getEndColumn()).toBe(6);
    let match2 = lt.check("This.\nSome stuff.\nIt »is a test.")[0];
    expect(match2.getFromPos()).toBe(21);
    expect(match2.getToPos()).toBe(22);
    expect(match2.getLine()).toBe(2); // first line is 0
    expect(match2.getEndLine()).toBe(2);
    expect(match2.getColumn()).toBe(4);
    expect(match2.getEndColumn()).toBe(5);
    let match3 = lt.check("Th\u00ADis »is a test.")[0];
    expect(match3.getFromPos()).toBe(6);
    expect(match3.getToPos()).toBe(7);
  });
});
