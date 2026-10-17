// Ported from PatternRuleMatcherTest (languagetool-core); analysis adapted to en-US (Demo tagger not ported), matches via PatternRuleMatcher#match
import { describe, it, expect, beforeAll } from 'vitest';
import '../../../src/lang/register.js';
import { Languages } from '../../../src/core/Languages.js';
import { PatternToken } from '../../../src/core/patterns/PatternToken.js';
import { PatternRule } from '../../../src/core/patterns/PatternRule.js';
import { Match, CaseConversion, IncludeRange } from '../../../src/core/patterns/Match.js';
import { RuleMatch } from '../../../src/core/rules/model/RuleMatch.js';
import { PatternRuleMatcher } from '../../../src/core/patterns/PatternRuleMatcher.js';
import { getDemoLanguage } from '../../support/DemoLanguage.js';
import { newTool, withNoopAnalysis } from '../../../oracle/adapters/_check-pipe-common.mjs';

let lt;
let en;

const getMatches = (input, matcher) => matcher.match(withNoopAnalysis(en, true, () => lt.getAnalyzedSentence(input)));
const getMatcher = (...tokens) => new PatternRuleMatcher(getPatternRule(tokens), false);
const assertPosition = (match, from, to) => {
  expect(match.getFromPos(), 'Wrong start position').toBe(from);
  expect(match.getToPos(), 'Wrong end position').toBe(to);
};
const assertNoMatch = (input, matcher) => { expect(getMatches(input, matcher).length).toBe(0); };
const assertPartialMatch = (input, matcher) => {
  const matches = getMatches(input, matcher);
  expect(matches.length).toBe(1);
  expect(matches[0].getFromPos() > 0 || matches[0].getToPos() < input.length).toBe(true);
};
const assertCompleteMatch = (input, matcher) => {
  const matches = getMatches(input, matcher);
  expect(matches.length, `Got matches: [${matches.join(', ')}]`).toBe(1);
  expect(matches[0].getFromPos(), 'Wrong start position').toBe(0);
  expect(matches[0].getToPos(), 'Wrong end position').toBe(input.length);
};
const makeElement = (token) => new PatternToken(token, false, false, false);
// Java: PatternRuleMatcherTest#getPatternRule(String) / (List)
const getPatternRule = (x) => {
  if (typeof x === 'string') return getPatternRule(x.split(' ').map((part) => new PatternToken(part, false, false, false)));
  return new PatternRule('', getDemoLanguage(), x, 'my description', 'my message', 'short message');
};

describe('PatternRuleMatcherTest', () => {
  // adapted: Demo analysis (JLanguageTool with xx rules needs F30, DemoTagger not ported) -> en-US; only token texts matter here
  beforeAll(() => { en = Languages.getLanguageForShortCode('en-US');
    lt = newTool(en);
  });

  // Java: PatternRuleMatcherTest#testMatch
  it('testMatch', () => {
    const matcher = new PatternRuleMatcher(getPatternRule("my test"), false);
    assertPartialMatch("This is my test.", matcher);
    assertNoMatch("This is no test.", matcher);
  });

  // Java: PatternRuleMatcherTest#testZeroMinOccurrences
  it('testZeroMinOccurrences', () => {
    const patternTokenB = makeElement("b");
    patternTokenB.setMinOccurrence(0);
    const matcher = getMatcher(makeElement("a"), patternTokenB, makeElement("c"));  // regex syntax: a b? c
    assertNoMatch("b a", matcher);
    assertNoMatch("c a b", matcher);
    assertPartialMatch("b a c", matcher);
    assertPartialMatch("a c b", matcher);
    assertNoMatch("a b b c", matcher);
    assertCompleteMatch("a c", matcher);
    assertCompleteMatch("a b c", matcher);
    assertNoMatch("a X c", matcher);
    const matches = getMatches("a b c FOO a b c FOO a c a b c", matcher);
    //......................................^^^^^.....^^^^^.....^^^.^^^^^
    expect(matches.length).toBe(4);
    assertPosition(matches[0], 0, 5);
    assertPosition(matches[1], 10, 15);
    assertPosition(matches[2], 20, 23);
    assertPosition(matches[3], 24, 29);
  });

  // Java: PatternRuleMatcherTest#testTwoZeroMinOccurrences
  it('testTwoZeroMinOccurrences', () => {
    const patternTokenB1 = makeElement("ba");
    patternTokenB1.setMinOccurrence(0);
    const patternTokenB2 = makeElement("bb");
    patternTokenB2.setMinOccurrence(0);
    const matcher = getMatcher(makeElement("a"), patternTokenB1, patternTokenB2, makeElement("c"));  // regex syntax: a (ba)? (bb)? c
    
    assertNoMatch("ba a", matcher);
    assertNoMatch("c a bb", matcher);
    assertPartialMatch("z a c", matcher);
    assertPartialMatch("a c z", matcher);
    assertNoMatch("a ba ba c", matcher);
    assertCompleteMatch("a ba bb c", matcher);
    assertCompleteMatch("a ba c", matcher);
    assertCompleteMatch("a bb c", matcher);
    assertCompleteMatch("a c", matcher);
    assertNoMatch("a X c", matcher);
    
    const matches = getMatches("a ba c FOO a bb c FOO a c a ba bb c", matcher);
    //......................................^^^^^.....^^^^^.....^^^.^^^^^
    expect(matches.length).toBe(4);
    assertPosition(matches[0], 0, 6);
    assertPosition(matches[1], 11, 17);
    assertPosition(matches[2], 22, 25);
    assertPosition(matches[3], 26, 35);
  });

  // Java: PatternRuleMatcherTest#testZeroMinOccurrences2
  it('testZeroMinOccurrences2', () => {
    const patternTokenB = makeElement("b");
    patternTokenB.setMinOccurrence(0);
    // regex syntax: a b? c d e
    const matcher = getMatcher(makeElement("a"), patternTokenB, makeElement("c"), makeElement("d"), makeElement("e"));
    assertCompleteMatch("a b c d e", matcher);
    assertCompleteMatch("a c d e", matcher);
    assertNoMatch("a d", matcher);
    assertNoMatch("a c b d", matcher);
    assertNoMatch("a c b d e", matcher);
  });

  // Java: PatternRuleMatcherTest#testZeroMinOccurrences3
  it('testZeroMinOccurrences3', () => {
    const patternTokenC = makeElement("c");
    patternTokenC.setMinOccurrence(0);
    // regex syntax: a b c? d e
    const matcher = getMatcher(makeElement("a"), makeElement("b"), patternTokenC, makeElement("d"), makeElement("e"));
    assertCompleteMatch("a b c d e", matcher);
    assertCompleteMatch("a b d e", matcher);
    assertPartialMatch("a b c d e x", matcher);
    assertPartialMatch("x a b c d e", matcher);
    assertNoMatch("a b c e d", matcher);
    assertNoMatch("a c b d e", matcher);
  });

  // Java: PatternRuleMatcherTest#testZeroMinOccurrences4
  it('testZeroMinOccurrences4', () => {
    const patternTokenA = makeElement("a");
    patternTokenA.setMinOccurrence(0);
    const patternTokenC = makeElement("c");
    patternTokenC.setMinOccurrence(0);
    // regex syntax: a? b c? d e
    const matcher = getMatcher(patternTokenA, makeElement("b"), patternTokenC, makeElement("d"), makeElement("e"));
    const matches = getMatches("a b c d e", matcher);
    expect(matches.length).toBe(1);  // just the longest match...
    assertPosition(matches[0], 0, 9);
  });

  // Java: PatternRuleMatcherTest#testZeroMinOccurrencesWithEmptyElement
  it('testZeroMinOccurrencesWithEmptyElement', () => {
    const patternTokenB = makeElement(null);
    patternTokenB.setMinOccurrence(0);
    const matcher = getMatcher(makeElement("a"), patternTokenB, makeElement("c"));  // regex syntax: a .? c
    assertNoMatch("b a", matcher);
    assertNoMatch("c a b", matcher);
    assertPartialMatch("b a c", matcher);
    assertPartialMatch("a c b", matcher);
    assertNoMatch("a b b c", matcher);
    assertCompleteMatch("a c", matcher);
    assertCompleteMatch("a b c", matcher);
    assertCompleteMatch("a X c", matcher);
    const matches = getMatches("a b c FOO a X c", matcher);
    //......................................^^^^^.....^^^^^
    expect(matches.length).toBe(2);
    assertPosition(matches[0], 0, 5);
    assertPosition(matches[1], 10, 15);
  });

  // Java: PatternRuleMatcherTest#testZeroMinOccurrencesWithSuggestion
  it('testZeroMinOccurrencesWithSuggestion', () => {
    const patternTokenB = makeElement("b");
    patternTokenB.setMinOccurrence(0);

    const patternTokens = [makeElement("a"), patternTokenB, makeElement("c")];   // regex: a b? c
    const rule = new PatternRule("", getDemoLanguage(), patternTokens, "my description", "<suggestion>\\1 \\2 \\3</suggestion>", "short message");
    const matcher = new PatternRuleMatcher(rule, false);

    // we need to add this line to trigger proper replacement but I am not sure why :(
    rule.addSuggestionMatch(new Match(null, null, false, null, null, CaseConversion.NONE, false, false, IncludeRange.NONE));

    const matches = getMatches("a b c", matcher);
    expect([...matches[0].getSuggestedReplacements()]).toEqual(["a b c"]);

    const matches2 = getMatches("a c", matcher);
    expect([...matches2[0].getSuggestedReplacements()]).toEqual(["a c"]);
  });

  // Java: PatternRuleMatcherTest#testTwoMinOccurrences
  it.skip('testTwoMinOccurrences', () => { /* @Ignore: min can only be 0 or 1 so far */ });

  // Java: PatternRuleMatcherTest#testZeroMinTwoMaxOccurrences
  it('testZeroMinTwoMaxOccurrences', () => {
    const patternTokenB = makeElement("b");
    patternTokenB.setMinOccurrence(0);
    patternTokenB.setMaxOccurrence(2);
    const matcher = getMatcher(makeElement("a"), patternTokenB, makeElement("c"));
    assertCompleteMatch("a c", matcher);
    assertCompleteMatch("a  b c", matcher);
    assertCompleteMatch("a  b b c", matcher);
    assertNoMatch("a b b b c", matcher);
  });

  // Java: PatternRuleMatcherTest#testTwoMaxOccurrencesWithAnyToken
  it('testTwoMaxOccurrencesWithAnyToken', () => {
    const anyPatternToken = makeElement(null);
    anyPatternToken.setMaxOccurrence(2);
    const matcher = getMatcher(makeElement("a"), anyPatternToken, makeElement("c"));
    assertCompleteMatch("a b c", matcher);
    assertCompleteMatch("a b b c", matcher);
    assertNoMatch("a b b b c", matcher);
  });

  // Java: PatternRuleMatcherTest#testThreeMaxOccurrencesWithAnyToken
  it('testThreeMaxOccurrencesWithAnyToken', () => {
    const anyPatternToken = makeElement(null);
    anyPatternToken.setMaxOccurrence(3);
    const matcher = getMatcher(makeElement("a"), anyPatternToken, makeElement("c"));
    assertCompleteMatch("a b c", matcher);
    assertCompleteMatch("a b b c", matcher);
    assertCompleteMatch("a b b b c", matcher);
    assertNoMatch("a b b b b c", matcher);
  });

  // Java: PatternRuleMatcherTest#testZeroMinTwoMaxOccurrencesWithAnyToken
  it('testZeroMinTwoMaxOccurrencesWithAnyToken', () => {
    const anyPatternToken = makeElement(null);
    anyPatternToken.setMinOccurrence(0);
    anyPatternToken.setMaxOccurrence(2);
    const matcher = getMatcher(makeElement("a"), anyPatternToken, makeElement("c"));
    assertNoMatch("a b", matcher);
    assertNoMatch("b c", matcher);
    assertNoMatch("c", matcher);
    assertNoMatch("a", matcher);
    assertCompleteMatch("a c", matcher);
    assertCompleteMatch("a x c", matcher);
    assertCompleteMatch("a x x c", matcher);
    assertNoMatch("a x x x c", matcher);
  });

  // Java: PatternRuleMatcherTest#testTwoMaxOccurrences
  it('testTwoMaxOccurrences', () => {
    const patternTokenB = makeElement("b");
    patternTokenB.setMaxOccurrence(2);
    const matcher = getMatcher(makeElement("a"), patternTokenB);
    assertNoMatch("a a", matcher);
    assertCompleteMatch("a b", matcher);
    assertCompleteMatch("a b b", matcher);
    assertPartialMatch("a b c", matcher);
    assertPartialMatch("a b b c", matcher);
    assertPartialMatch("x a b b", matcher);

    const matches1 = getMatches("a b b b", matcher);
    expect(matches1.length).toBe(1);
    assertPosition(matches1[0], 0, 5);

    const matches2 = getMatches("a b b b foo a b b", matcher);
    expect(matches2.length).toBe(2);
    assertPosition(matches2[0], 0, 5);
    assertPosition(matches2[1], 12, 17);
  });

  // Java: PatternRuleMatcherTest#testThreeMaxOccurrences
  it('testThreeMaxOccurrences', () => {
    const patternTokenB = makeElement("b");
    patternTokenB.setMaxOccurrence(3);
    const matcher = getMatcher(makeElement("a"), patternTokenB);  // regex: a b{1,3}
    assertNoMatch("a a", matcher);
    assertCompleteMatch("a b", matcher);
    assertCompleteMatch("a b b", matcher);
    assertCompleteMatch("a b b b", matcher);
    assertPartialMatch("a b b b b", matcher);

    const matches1 = getMatches("a b b b b", matcher);
    expect(matches1.length).toBe(1);
    assertPosition(matches1[0], 0, 7);
  });

  // Java: PatternRuleMatcherTest#testOptionalWithoutExplicitMarker
  it('testOptionalWithoutExplicitMarker', () => {
    const patternTokenA = makeElement("a");
    const patternTokenB = makeElement("b");
    patternTokenB.setMinOccurrence(0);
    const patternTokenC = makeElement("c");
    const matcher = getMatcher(patternTokenA, patternTokenB, patternTokenC);  // regex syntax: a .? c

    const matches1 = getMatches("A B C ZZZ", matcher);
    expect(matches1.length).toBe(1);
    assertPosition(matches1[0], 0, 5);

    const matches2 = getMatches("A C ZZZ", matcher);
    expect(matches2.length).toBe(1);
    assertPosition(matches2[0], 0, 3);
  });

  // Java: PatternRuleMatcherTest#testOptionalWithExplicitMarker
  it('testOptionalWithExplicitMarker', () => {
    const patternTokenA = makeElement("a");
    patternTokenA.setInsideMarker(true);
    const patternTokenB = makeElement("b");
    patternTokenB.setMinOccurrence(0);
    patternTokenB.setInsideMarker(true);
    const patternTokenC = makeElement("c");
    patternTokenC.setInsideMarker(false);
    const matcher = getMatcher(patternTokenA, patternTokenB, patternTokenC);  // regex syntax: (a .?) c

    const matches1 = getMatches("A B C ZZZ", matcher);
    //.......................................^^^--
    expect(matches1.length).toBe(1);
    assertPosition(matches1[0], 0, 3);

    const matches2 = getMatches("A C ZZZ", matcher);
    //.......................................^--
    expect(matches2.length).toBe(1);
    assertPosition(matches2[0], 0, 1);
  });

  // Java: PatternRuleMatcherTest#testOptionalAnyTokenWithExplicitMarker
  it('testOptionalAnyTokenWithExplicitMarker', () => {
    const patternTokenA = makeElement("a");
    patternTokenA.setInsideMarker(true);
    const patternTokenB = makeElement(null);
    patternTokenB.setMinOccurrence(0);
    patternTokenB.setInsideMarker(true);
    const patternTokenC = makeElement("c");
    patternTokenC.setInsideMarker(false);
    const matcher = getMatcher(patternTokenA, patternTokenB, patternTokenC);  // regex syntax: (a .?) c

    const matches1 = getMatches("A x C ZZZ", matcher);
    //.......................................^^^--
    expect(matches1.length).toBe(1);
    assertPosition(matches1[0], 0, 3);

    const matches2 = getMatches("A C ZZZ", matcher);
    //.......................................^--
    expect(matches2.length).toBe(1);
    assertPosition(matches2[0], 0, 1);
  });

  // Java: PatternRuleMatcherTest#testOptionalAnyTokenWithExplicitMarker2
  it('testOptionalAnyTokenWithExplicitMarker2', () => {
    const patternTokenA = makeElement("the");
    patternTokenA.setInsideMarker(true);
    const patternTokenB = makeElement(null);
    patternTokenB.setMinOccurrence(0);
    patternTokenB.setInsideMarker(true);
    const patternTokenC = makeElement("bike");
    patternTokenC.setInsideMarker(false);
    const matcher = getMatcher(patternTokenA, patternTokenB, patternTokenC);  // regex syntax: (a .?) c

    const matches1 = getMatches("the nice bike ZZZ", matcher);
    //.......................................^^^^^^^^-----
    expect(matches1.length).toBe(1);
    assertPosition(matches1[0], 0, 8);

    const matches2 = getMatches("the bike ZZZ", matcher);
    //.......................................^^^-----
    expect(matches2.length).toBe(1);
    assertPosition(matches2[0], 0, 3);
  });

  // Java: PatternRuleMatcherTest#testUnlimitedMaxOccurrences
  it('testUnlimitedMaxOccurrences', () => {
    const patternTokenB = makeElement("b");
    patternTokenB.setMaxOccurrence(-1);
    const matcher = getMatcher(makeElement("a"), patternTokenB, makeElement("c"));
    assertNoMatch("a c", matcher);
    assertNoMatch("a b", matcher);
    assertNoMatch("b c", matcher);
    assertCompleteMatch("a b c", matcher);
    assertCompleteMatch("a b b c", matcher);
    assertCompleteMatch("a b b b b b b b b b b b b b b b b b b b b b b b b b c", matcher);
  });

  // Java: PatternRuleMatcherTest#testMaxTwoAndThreeOccurrences
  it('testMaxTwoAndThreeOccurrences', () => {
    const patternTokenA = makeElement("a");
    patternTokenA.setMaxOccurrence(2);
    const patternTokenB = makeElement("b");
    patternTokenB.setMaxOccurrence(3);
    const matcher = getMatcher(patternTokenA, patternTokenB);  // regex: a{1,2} b{1,3}
    assertCompleteMatch("a b", matcher);
    assertCompleteMatch("a b b", matcher);
    assertCompleteMatch("a b b b", matcher);
    assertNoMatch("a a", matcher);
    assertNoMatch("a x b b b", matcher);
    const matches2 = getMatches("a a b", matcher);
    expect(matches2.length).toBe(1); // just the longest match
    assertPosition(matches2[0], 0, 5);

    const matches3 = getMatches("a a b b", matcher);
    expect(matches3.length).toBe(1);
    assertPosition(matches3[0], 0, 7); // again, only the longest match

    const matches4 = getMatches("a a b b b", matcher);
    expect(matches4.length).toBe(1);
    assertPosition(matches4[0], 0, 9);
  });

  // Java: PatternRuleMatcherTest#testInfiniteSkip
  it('testInfiniteSkip', () => {
    const patternTokenA = makeElement("a");
    patternTokenA.setSkipNext(-1);
    const matcher = getMatcher(patternTokenA, makeElement("b"));
    assertCompleteMatch("a b", matcher);
    assertCompleteMatch("a x b", matcher);
    assertCompleteMatch("a x x b", matcher);
    assertCompleteMatch("a x x x b", matcher);
  });

  // Java: PatternRuleMatcherTest#testInfiniteSkipWithMatchReference
  it('testInfiniteSkipWithMatchReference', () => {
    const patternTokenAB = new PatternToken("a|b", false, true, false);
    patternTokenAB.setSkipNext(-1);
    const patternTokenC = makeElement("\\0");
    const match = new Match(null, null, false, null, null, CaseConversion.NONE, false, false, IncludeRange.NONE);
    match.setTokenRef(0);
    match.setInMessageOnly(true);
    patternTokenC.setMatch(match);
    const matcher = getMatcher(patternTokenAB, patternTokenC);
    assertCompleteMatch("a a", matcher);
    assertCompleteMatch("b b", matcher);
    assertCompleteMatch("a x a", matcher);
    assertCompleteMatch("b x b", matcher);
    assertCompleteMatch("a x x a", matcher);
    assertCompleteMatch("b x x b", matcher);

    assertNoMatch("a b", matcher);
    assertNoMatch("b a", matcher);
    assertNoMatch("b x a", matcher);
    assertNoMatch("b x a", matcher);
    assertNoMatch("a x x b", matcher);
    assertNoMatch("b x x a", matcher);

    const matches = getMatches("a foo a and b foo b", matcher);
    expect(matches.length).toBe(2);
    assertPosition(matches[0], 0, 7);
    assertPosition(matches[1], 12, 19);

    const matches2 = getMatches("xx a b x x x b a", matcher);
    expect(matches2.length).toBe(1);
    assertPosition(matches2[0], 3, 16);
  });

  // Java: PatternRuleMatcherTest#testNoMatchReferenceRecursion
  it('testNoMatchReferenceRecursion', () => {
    // \n in rule messages refers to matches, but if match text contains \n this should not be resolved
    const rule = new PatternRule("MATCH_REFERENCERE_CURSION_DEMO", getDemoLanguage(),
      [new PatternToken("\\p{Punct}", false, true, false), new PatternToken("\\d+", false, true, false)],
      "", "Here come the match references: \\1\\2. This is the end", "");
    const matcher = new PatternRuleMatcher(rule, false);
    const matches = getMatches(":42", matcher);
    expect(matches.length).toBe(1);
    expect(matches[0].getMessage()).toBe("Here come the match references: :42. This is the end");
    const matches2 = getMatches("\\42", matcher);
    expect(matches2.length).toBe(1);
    expect(matches2[0].getMessage()).toBe("Here come the match references: \\42. This is the end");
  });

  // Java: PatternRuleMatcherTest#testEquals
  it('testEquals', () => {
    const patternRule1 = new PatternRule("id1", getDemoLanguage(), [], "desc1", "msg1", "short1");
    const ruleMatch1 = new RuleMatch(patternRule1, null, 0, 1, "message");
    const ruleMatch2 = new RuleMatch(patternRule1, null, 0, 1, "message");
    expect(ruleMatch1.equals(ruleMatch2)).toBe(true);
    const ruleMatch3 = new RuleMatch(patternRule1, null, 0, 9, "message");
    expect(ruleMatch1.equals(ruleMatch3)).toBe(false);
    expect(ruleMatch2.equals(ruleMatch3)).toBe(false);
  });
});
