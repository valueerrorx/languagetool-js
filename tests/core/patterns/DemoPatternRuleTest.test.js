// Ported from DemoPatternRuleTest (languagetool-core); analysis adapted to en-US (Demo tagger not ported); testRules runs the F31 PatternRuleTest infrastructure (tests/support/PatternRuleTest.js)
import { describe, it, expect, beforeAll } from 'vitest';
import '../../../src/lang/register.js';
import { javaSplit } from '../../../src/lib/java/strings.js';
import { Languages } from '../../../src/core/Languages.js';
import { PatternToken, PosToken } from '../../../src/core/patterns/PatternToken.js';
import { PatternRule } from '../../../src/core/patterns/PatternRule.js';
import { PatternRuleMatcher } from '../../../src/core/patterns/PatternRuleMatcher.js';
import { getDemoLanguage, DemoLanguage, useXxTestResources } from '../../support/DemoLanguage.js';
import { PatternRuleTest } from '../../support/PatternRuleTest.js';
import { newTool, withNoopAnalysis } from '../../../oracle/adapters/_check-pipe-common.mjs';
import { SENTENCE_START_TAGNAME } from '../../../src/core/JLanguageToolConstants.js';

const language = getDemoLanguage();
let en;
let lt;
const analyzed = (s) => withNoopAnalysis(en, true, () => lt.getAnalyzedSentence(s));

// Java: PatternRuleTest#makePatternRule(String,boolean,boolean)
const makePatternRule = (s, caseSensitive = false, regex = false) => {
  const patternTokens = [];
  const parts = javaSplit(s, ' ');
  let pos = false;
  for (const element of parts) {
    if (element === SENTENCE_START_TAGNAME) {
      pos = true;
    }
    let pToken;
    if (!pos) {
      pToken = new PatternToken(element, caseSensitive, regex, false);
    } else {
      pToken = new PatternToken('', caseSensitive, regex, false);
    }
    if (pos) {
      pToken.setPosToken(new PosToken(element, false, false));
    }
    patternTokens.push(pToken);
    pos = false;
  }
  return new PatternRule('ID1', language, patternTokens, 'test rule', 'user visible message', 'short comment');
};

describe('DemoPatternRuleTest', () => {
  useXxTestResources();

  beforeAll(() => {
    en = Languages.getLanguageForShortCode('en-US');
    lt = newTool(en);
  });

  // Java: DemoPatternRuleTest#testGrammarRulesFromXML2
  it('testGrammarRulesFromXML2', () => {
    expect(() => new PatternRule('-1', language, [], '', '', '')).not.toThrow();
  });

  // Java: DemoPatternRuleTest#testMakeSuggestionUppercase
  it('testMakeSuggestionUppercase', () => {
    const patternToken = new PatternToken('Were', false, false, false);
    const message = 'Did you mean: <suggestion>where</suggestion> or <suggestion>we</suggestion>?';
    const rule = new PatternRule('MY_ID', language, [patternToken], 'desc', message, 'msg');
    const matches = rule.match(analyzed('Were are in the process of ...'));

    expect(matches.length).toBe(1);
    const match = matches[0];
    const replacements = match.getSuggestedReplacements();
    expect(replacements.length).toBe(2);
    expect(replacements[0]).toBe('Where');
    expect(replacements[1]).toBe('We');
  });

  // Java: DemoPatternRuleTest#testRule
  it('testRule', () => {
    let pr = makePatternRule('one');
    let matches = pr.match(analyzed('A non-matching sentence.'));
    expect(matches.length).toBe(0);
    matches = pr.match(analyzed('A matching sentence with one match.'));
    expect(matches.length).toBe(1);
    expect(matches[0].getFromPos()).toBe(25);
    expect(matches[0].getToPos()).toBe(28);
    // these two are not set if the rule is called standalone (not via JLanguageTool):
    expect(matches[0].getColumn()).toBe(-1);
    expect(matches[0].getLine()).toBe(-1);
    expect(matches[0].getRule().getId()).toBe('ID1');
    expect(matches[0].getMessage()).toBe('user visible message');
    expect(matches[0].getShortMessage()).toBe('short comment');
    matches = pr.match(analyzed('one one and one: three matches'));
    expect(matches.length).toBe(3);

    pr = makePatternRule('one two');
    matches = pr.match(analyzed('this is one not two'));
    expect(matches.length).toBe(0);
    matches = pr.match(analyzed('this is two one'));
    expect(matches.length).toBe(0);
    matches = pr.match(analyzed('this is one two three'));
    expect(matches.length).toBe(1);
    matches = pr.match(analyzed('one two'));
    expect(matches.length).toBe(1);

    pr = makePatternRule('one|foo|xxxx two', false, true);
    matches = pr.match(analyzed('one foo three'));
    expect(matches.length).toBe(0);
    matches = pr.match(analyzed('one two'));
    expect(matches.length).toBe(1);
    matches = pr.match(analyzed('foo two'));
    expect(matches.length).toBe(1);
    matches = pr.match(analyzed('one foo two'));
    expect(matches.length).toBe(1);
    matches = pr.match(analyzed('y x z one two blah foo'));
    expect(matches.length).toBe(1);

    pr = makePatternRule('one|foo|xxxx two|yyy', false, true);
    matches = pr.match(analyzed('one, yyy'));
    expect(matches.length).toBe(0);
    matches = pr.match(analyzed('one yyy'));
    expect(matches.length).toBe(1);
    matches = pr.match(analyzed('xxxx two'));
    expect(matches.length).toBe(1);
    matches = pr.match(analyzed('xxxx yyy'));
    expect(matches.length).toBe(1);
  });

  // Java: DemoPatternRuleTest#testSentenceStart
  it('testSentenceStart', () => {
    const pr = makePatternRule('SENT_START One');
    expect(pr.match(analyzed('Not One word.')).length).toBe(0);
    expect(pr.match(analyzed('One word.')).length).toBe(1);
  });

  // Java: DemoPatternRuleTest#testFormatMultipleSynthesis
  it('testFormatMultipleSynthesis', () => {
    const suggestions1 = ['blah blah', 'foo bar'];
    expect(PatternRuleMatcher.formatMultipleSynthesis(suggestions1,
      'This is how you should write: <suggestion>', '</suggestion>.'))
      .toBe('This is how you should write: <suggestion>blah blah</suggestion>, <suggestion>foo bar</suggestion>.');

    const suggestions2 = ['test', ' '];
    expect(PatternRuleMatcher.formatMultipleSynthesis(suggestions2,
      'This is how you should write: <suggestion>', '</suggestion>.'))
      .toBe('This is how you should write: <suggestion>test</suggestion>, <suggestion> </suggestion>.');
  });

  // Java: DemoPatternRuleTest#testRules; runnable infrastructure: tests/support/PatternRuleTest.js (see DemoRulesExamplesTest)
  it('testRules', async () => {
    const test = new PatternRuleTest();
    await test.runTestForLanguage(new DemoLanguage());
    test.ruleErrors.check(); // Java: PatternRuleErrorCollector rule verifies after the test
  });
});
