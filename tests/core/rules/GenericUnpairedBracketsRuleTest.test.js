// Ported from GenericUnpairedBracketsRuleTest (languagetool-core); FakeLanguage replaced by en-US
import { describe, it, expect } from 'vitest';
import { GenericUnpairedBracketsRule } from '../../../src/core/rules/GenericUnpairedBracketsRule.js';
import { EN, englishMessages, newLt, useNoopAnalysis } from '../../support/ruleTestSupport.js';

describe('GenericUnpairedBracketsRuleTest', () => {
  useNoopAnalysis(EN);
  const setUpRule = () => newLt(EN, new GenericUnpairedBracketsRule(englishMessages(), ['»'], ['«']));
  const assertMatches = (lt, expectedMatches, input) => {
    const ruleMatches = lt.check(input);
    expect(ruleMatches.length, `Expected ${expectedMatches} matches, got: ${ruleMatches}`).toBe(expectedMatches);
  };

  // Java: GenericUnpairedBracketsRuleTest#testRule
  it('testRule', () => {
    const lt = setUpRule();
    const m = (n, s) => assertMatches(lt, n, s);
    m(0, 'This is »correct«.');
    m(0, '»Correct«\n»And »here« it ends.«');
    m(0, '»Correct. This is more than one sentence.«');
    m(0, '»Correct. This is more than one sentence.«\n»And »here« it ends.«');
    m(0, '»Correct«\n\n»And here it ends.«\n\nMore text.');
    m(0, "»Correct, he said. This is the next sentence.« Here's another sentence.");
    m(0, "»Correct, he said.\n\nThis is the next sentence.« Here's another sentence.");
    m(0, "»Correct, he said.\n\n\n\nThis is the next sentence.« Here's another sentence.");
    m(0, 'This »is also »correct««.');
    m(0, 'Good.\n\nThis »is also »correct««.');
    m(0, 'Good.\n\n\nThis »is also »correct««.');
    m(0, 'Good.\n\n\n\nThis »is also »correct««.');
    m(0, 'This is funny :-)');
    m(0, "This is sad :-( isn't it");
    m(0, 'This is funny :)');
    m(0, "This is sad :( isn't it");
    m(0, 'a) item one\nb) item two');
    m(0, 'a) item one\nb) item two\nc) item three');
    m(0, '\na) item one\nb) item two\nc) item three');
    m(0, '\n\na) item one\nb) item two\nc) item three');
    m(0, 'This is a), not b)');
    m(0, 'This is it (a, not b) some more test');
    m(0, 'This is »not an error yet');
    m(0, 'See https://de.wikipedia.org/wiki/Schlammersdorf_(Adelsgeschlecht)');
    m(1, 'This is not correct«');
    m(1, 'This is »not correct.');
    m(1, 'This is »not an error yet\n\nBut now it has become one');
    m(1, 'This is correct.\n\n»But this is not.');
    m(1, 'This is correct.\n\nBut this is not«');
    m(1, '»This is correct«\n\nBut this is not«');
    m(1, '»This is correct«\n\nBut this »is« not«');
    m(1, "This is not correct. No matter if it's more than one sentence«");
    m(1, "»This is not correct. No matter if it's more than one sentence");
    m(1, "Correct, he said. This is the next sentence.« Here's another sentence.");
    m(1, "»Correct, he said. This is the next sentence. Here's another sentence.");
    m(1, "»Correct, he said. This is the next sentence.\n\nHere's another sentence.");
    m(1, "»Correct, he said. This is the next sentence.\n\n\n\nHere's another sentence.");
  });

  // Java: GenericUnpairedBracketsRuleTest#testRuleMatchPositions
  it('testRuleMatchPositions', () => {
    const lt = setUpRule();
    const match1 = lt.check('This »is a test.')[0];
    expect(match1.getFromPos()).toBe(5);
    expect(match1.getToPos()).toBe(6);
    expect(match1.getLine()).toBe(0);
    expect(match1.getEndLine()).toBe(0);
    expect(match1.getColumn()).toBe(5);
    expect(match1.getEndColumn()).toBe(6);
    const match2 = lt.check('This.\nSome stuff.\nIt »is a test.')[0];
    expect(match2.getFromPos()).toBe(21);
    expect(match2.getToPos()).toBe(22);
    expect(match2.getLine()).toBe(2); // first line is 0
    expect(match2.getEndLine()).toBe(2);
    expect(match2.getColumn()).toBe(4);
    expect(match2.getEndColumn()).toBe(5);
    const match3 = lt.check('Th\u00ADis »is a test.')[0];
    expect(match3.getFromPos()).toBe(6);
    expect(match3.getToPos()).toBe(7);
  });
});
