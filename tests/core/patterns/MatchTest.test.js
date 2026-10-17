// Ported from MatchTest (languagetool-core)
import { describe, it, expect, beforeEach } from 'vitest';
import { AnalyzedToken } from '../../../src/core/AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../../../src/core/AnalyzedTokenReadings.js';
import { Match, CaseConversion, IncludeRange } from '../../../src/core/patterns/Match.js';
import { ManualTagger } from '../../../src/core/tagging/ManualTagger.js';
import { ManualSynthesizer } from '../../../src/core/tagging/synthesis/ManualSynthesizer.js';
import { DemoLanguage } from '../../support/DemoLanguage.js';
import { ManualSynthesizerAdapter, ManualTaggerAdapter } from '../../support/ManualAdapters.js';
import { newTool } from '../../../oracle/adapters/_check-pipe-common.mjs';

const TEST_DATA = '# some test data\n'
  + 'inflectedform11\tlemma1\tPOS1\n'
  + 'inflectedform121\tlemma1\tPOS2\n'
  + 'inflectedform122\tlemma1\tPOS2\n'
  + 'inflectedform123\tlemma1\tPOS3\n'
  + 'inflectedform2\tlemma2\tPOS1\n';

// Java: Arrays.toString(String[])
const arrToString = (a) => `[${a.join(', ')}]`;

describe('MatchTest', () => {
  let languageTool;
  let synthesizer;
  let tagger;

  // Java: MatchTest#getAnalyzedTokenReadings(String)
  const getAnalyzedTokenReadings = (input, posTag, lemma) => {
    if (posTag === undefined) return languageTool.getAnalyzedSentence(input).getTokensWithoutWhitespace();
    return new AnalyzedTokenReadings(new AnalyzedToken(input, posTag, lemma), 0);
  };

  // Java: MatchTest#getMatch(String,String,CaseConversion) / (String,String,IncludeRange)
  const getMatch = (posTag, posTagReplace, x) => {
    if (x instanceof IncludeRange) return new Match(posTag, posTagReplace, true, null, null, CaseConversion.NONE, false, false, x);
    return new Match(posTag, posTagReplace, true, null, null, x, false, false, IncludeRange.NONE);
  };

  // Java: MatchTest#setUp()
  beforeEach(() => {
    tagger = new ManualTaggerAdapter(new ManualTagger(Buffer.from(TEST_DATA, 'utf8')));
    class TestDemo extends DemoLanguage {
      getName() { return 'TEST'; }

      createDefaultSynthesizer() { return synthesizer; }

      createDefaultTagger() { return tagger; }
    }
    const demo = new TestDemo();
    synthesizer = new ManualSynthesizerAdapter(new ManualSynthesizer(Buffer.from(TEST_DATA, 'utf8')), demo);
    languageTool = newTool(demo);
  });

  // Java: MatchTest#testStartUpper
  it('testStartUpper', () => {
    const match = getMatch('POS1', 'POS2', CaseConversion.STARTUPPER);
    const state = match.createState(synthesizer, getAnalyzedTokenReadings('inflectedform11', 'POS1', 'Lemma1'));
    expect(arrToString(state.toFinalString(null))).toBe('[Inflectedform121, Inflectedform122]');
  });

  // Java: MatchTest#testStartLower
  it('testStartLower', () => {
    const match = getMatch('POS1', 'POS2', CaseConversion.STARTLOWER);
    const state = match.createState(synthesizer, getAnalyzedTokenReadings('InflectedForm11', 'POS1', 'Lemma1'));
    expect(arrToString(state.toFinalString(null))).toBe('[inflectedform121, inflectedform122]');
  });

  // Java: MatchTest#testAllUpper
  it('testAllUpper', () => {
    const match = getMatch('POS1', 'POS2', CaseConversion.ALLUPPER);
    const state = match.createState(synthesizer, getAnalyzedTokenReadings('InflectedForm11', 'POS1', 'Lemma1'));
    expect(arrToString(state.toFinalString(null))).toBe('[INFLECTEDFORM121, INFLECTEDFORM122]');
  });

  // Java: MatchTest#testAllLower
  it('testAllLower', () => {
    const match = getMatch('POS1', 'POS2', CaseConversion.ALLLOWER);
    const state = match.createState(synthesizer, getAnalyzedTokenReadings('InflectedForm11', 'POS1', 'Lemma1'));
    expect(arrToString(state.toFinalString(null))).toBe('[inflectedform121, inflectedform122]');
  });

  // Java: MatchTest#testPreserveStartUpper
  it('testPreserveStartUpper', () => {
    const match = getMatch('POS1', 'POS2', CaseConversion.PRESERVE);
    const state = match.createState(synthesizer, getAnalyzedTokenReadings('InflectedForm11', 'POS1', 'Lemma1'));
    expect(arrToString(state.toFinalString(null))).toBe('[Inflectedform121, Inflectedform122]');
  });

  // Java: MatchTest#testStaticLemmaPreserveStartLower
  it('testStaticLemmaPreserveStartLower', () => {
    const match = getMatch('POS2', 'POS1', CaseConversion.PRESERVE);
    match.setLemmaString('lemma2');
    const state = match.createState(synthesizer, getAnalyzedTokenReadings('inflectedform121', 'POS2', 'Lemma1'));
    expect(arrToString(state.toFinalString(null))).toBe('[inflectedform2]');
  });

  // Java: MatchTest#testStaticLemmaPreserveStartUpper
  it('testStaticLemmaPreserveStartUpper', () => {
    const match = getMatch('POS2', 'POS1', CaseConversion.PRESERVE);
    match.setLemmaString('lemma2');
    const state = match.createState(synthesizer, getAnalyzedTokenReadings('InflectedForm121', 'POS2', 'Lemma1'));
    expect(arrToString(state.toFinalString(null))).toBe('[Inflectedform2]');
  });

  // Java: MatchTest#testStaticLemmaPreserveAllUpper
  it('testStaticLemmaPreserveAllUpper', () => {
    const match = getMatch('POS2', 'POS1', CaseConversion.PRESERVE);
    match.setLemmaString('lemma2');
    const state = match.createState(synthesizer, getAnalyzedTokenReadings('INFLECTEDFORM121', 'POS2', 'Lemma1'));
    expect(arrToString(state.toFinalString(null))).toBe('[INFLECTEDFORM2]');
  });

  // Java: MatchTest#testStaticLemmaPreserveMixed
  it('testStaticLemmaPreserveMixed', () => {
    const match = getMatch('POS2', 'POS1', CaseConversion.PRESERVE);
    match.setLemmaString('lemma2');
    const state = match.createState(synthesizer, getAnalyzedTokenReadings('infleCtedForm121', 'POS2', 'Lemma1'));
    expect(arrToString(state.toFinalString(null))).toBe('[inflectedform2]');
  });

  // Java: MatchTest#testPreserveStartLower
  it('testPreserveStartLower', () => {
    const match = getMatch('POS1', 'POS2', CaseConversion.PRESERVE);
    const state = match.createState(synthesizer, getAnalyzedTokenReadings('inflectedForm11', 'POS1', 'Lemma1'));
    expect(arrToString(state.toFinalString(null))).toBe('[inflectedform121, inflectedform122]');
  });

  // Java: MatchTest#testPreserveAllUpper
  it('testPreserveAllUpper', () => {
    const match = getMatch('POS1', 'POS2', CaseConversion.PRESERVE);
    const state = match.createState(synthesizer, getAnalyzedTokenReadings('INFLECTEDFORM11', 'POS1', 'Lemma1'));
    expect(arrToString(state.toFinalString(null))).toBe('[INFLECTEDFORM121, INFLECTEDFORM122]');
  });

  // Java: MatchTest#testPreserveMixed
  it('testPreserveMixed', () => {
    const match = getMatch('POS1', 'POS2', CaseConversion.PRESERVE);
    const state = match.createState(synthesizer, getAnalyzedTokenReadings('inflecTedForm11', 'POS1', 'Lemma1'));
    expect(arrToString(state.toFinalString(null))).toBe('[inflectedform121, inflectedform122]');
  });

  // Java: MatchTest#testPreserveNoneUpper
  it('testPreserveNoneUpper', () => {
    const match = getMatch('POS1', 'POS2', CaseConversion.NONE);
    const state = match.createState(synthesizer, getAnalyzedTokenReadings('INFLECTEDFORM11', 'POS1', 'Lemma1'));
    expect(arrToString(state.toFinalString(null))).toBe('[inflectedform121, inflectedform122]');
  });

  // Java: MatchTest#testPreserveNoneLower
  it('testPreserveNoneLower', () => {
    const match = getMatch('POS1', 'POS2', CaseConversion.NONE);
    const state = match.createState(synthesizer, getAnalyzedTokenReadings('inflectedform11', 'POS1', 'Lemma1'));
    expect(arrToString(state.toFinalString(null))).toBe('[inflectedform121, inflectedform122]');
  });

  // Java: MatchTest#testPreserveNoneMixed
  it('testPreserveNoneMixed', () => {
    const match = getMatch('POS1', 'POS2', CaseConversion.NONE);
    const state = match.createState(synthesizer, getAnalyzedTokenReadings('inFLectedFOrm11', 'POS1', 'Lemma1'));
    expect(arrToString(state.toFinalString(null))).toBe('[inflectedform121, inflectedform122]');
  });

  // Java: MatchTest#testSimpleIncludeFollowing
  it('testSimpleIncludeFollowing', () => {
    const match = getMatch(null, null, IncludeRange.FOLLOWING);
    const state = match.createState(synthesizer, getAnalyzedTokenReadings('inflectedform11 inflectedform2 inflectedform122 inflectedform122'), 1, 3);
    expect(arrToString(state.toFinalString(null))).toBe('[inflectedform2 inflectedform122]');
  });

  // Java: MatchTest#testPOSIncludeFollowing
  it('testPOSIncludeFollowing', () => {
    // POS is ignored when using IncludeRange.Following
    const match = getMatch('POS2', 'POS33', IncludeRange.FOLLOWING);
    const state = match.createState(synthesizer, getAnalyzedTokenReadings('inflectedform11 inflectedform2 inflectedform122 inflectedform122'), 1, 3);
    expect(arrToString(state.toFinalString(null))).toBe('[inflectedform2 inflectedform122]');
  });

  // Java: MatchTest#testIncludeAll
  it('testIncludeAll', () => {
    const match = getMatch(null, null, IncludeRange.ALL);
    const state = match.createState(synthesizer, getAnalyzedTokenReadings('inflectedform11 inflectedform2 inflectedform122 inflectedform122'), 1, 3);
    expect(arrToString(state.toFinalString(null))).toBe('[inflectedform11 inflectedform2 inflectedform122]');
  });

  // Java: MatchTest#testPOSIncludeAll
  it('testPOSIncludeAll', () => {
    const match = getMatch('POS1', 'POS3', IncludeRange.ALL);
    const state = match.createState(synthesizer, getAnalyzedTokenReadings('inflectedform11 inflectedform2 inflectedform122 inflectedform122'), 1, 3);
    expect(arrToString(state.toFinalString(null))).toBe('[inflectedform123 inflectedform2 inflectedform122]');
    // Note that in this case the first token has the requested POS (POS3 replaces POS1)
  });
});
