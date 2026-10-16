// Ported from PatternTokenTest (languagetool-core)
import { describe, it, expect } from 'vitest';
import { AnalyzedToken } from '../../../src/core/AnalyzedToken.js';
import { PatternToken } from '../../../src/core/patterns/PatternToken.js';
import { PatternTokenBuilder } from '../../../src/core/patterns/PatternTokenBuilder.js';
import {
  SENTENCE_START_TAGNAME, SENTENCE_END_TAGNAME, PARAGRAPH_END_TAGNAME,
} from '../../../src/core/JLanguageToolConstants.js';

const UNKNOWN_TAG = PatternToken.UNKNOWN_TAG;
const PosToken = PatternToken.PosToken;
const setOf = (...xs) => new Set(xs);
const asSet = (hs) => (hs === null ? null : new Set([...hs]));

describe('PatternTokenTest', () => {
  // Java: PatternTokenTest#testSentenceStart
  it('testSentenceStart', () => {
    const patternToken = new PatternToken('', false, false, false);
    patternToken.setPosToken(new PosToken(SENTENCE_START_TAGNAME, false, false));
    expect(patternToken.isSentenceStart()).toBe(true);
    patternToken.setPosToken(new PosToken(SENTENCE_START_TAGNAME, false, true));
    expect(patternToken.isSentenceStart()).toBe(false);
    patternToken.setPosToken(new PosToken(SENTENCE_START_TAGNAME, true, false));
    expect(patternToken.isSentenceStart()).toBe(true);
    patternToken.setPosToken(new PosToken(SENTENCE_START_TAGNAME, true, true));
    expect(patternToken.isSentenceStart()).toBe(false);

    const patternToken2 = new PatternToken('bla|blah', false, true, false);
    patternToken2.setPosToken(new PosToken('foo', true, true));
    expect(patternToken2.isSentenceStart()).toBe(false);
  });

  // Java: PatternTokenTest#testUnknownTag
  it('testUnknownTag', () => {
    const patternToken = new PatternToken('', false, false, false);
    patternToken.setPosToken(new PosToken(UNKNOWN_TAG, false, false));

    const patternToken2 = new PatternToken('', false, false, false);
    patternToken2.setPosToken(new PosToken(UNKNOWN_TAG, false, true));

    const patternToken3 = new PatternToken('', false, false, false);
    patternToken3.setPosToken(new PosToken(UNKNOWN_TAG + '|VBG', true, false));

    const patternToken4 = new PatternToken('', false, false, false);
    patternToken4.setPosToken(new PosToken(UNKNOWN_TAG + '|VBG', true, true));

    const patternToken5 = new PatternToken('\\p{Ll}+', false, true, false);
    patternToken5.setPosToken(new PosToken(UNKNOWN_TAG, false, false));

    const an = new AnalyzedToken('schword', null, null);
    expect(patternToken.isMatched(an)).toBe(true);
    expect(patternToken2.isMatched(an)).toBe(false);
    expect(patternToken3.isMatched(an)).toBe(true);
    expect(patternToken4.isMatched(an)).toBe(false);
    expect(patternToken5.isMatched(an)).toBe(true);

    // if the AnalyzedToken is in the set of readings that have non-null tags...
    an.setNoPOSTag(false);
    expect(patternToken.isMatched(an)).toBe(false);
    expect(patternToken2.isMatched(an)).toBe(true);
    expect(patternToken3.isMatched(an)).toBe(false);
    expect(patternToken4.isMatched(an)).toBe(true);
    expect(patternToken5.isMatched(an)).toBe(false);

    const anSentEnd = new AnalyzedToken('schword', SENTENCE_END_TAGNAME, null);
    expect(patternToken.isMatched(anSentEnd)).toBe(true);
    expect(patternToken2.isMatched(anSentEnd)).toBe(false);
    expect(patternToken3.isMatched(anSentEnd)).toBe(true);
    expect(patternToken4.isMatched(anSentEnd)).toBe(false);
    expect(patternToken5.isMatched(anSentEnd)).toBe(true);

    const patternToken6 = new PatternToken('\\p{Ll}+', false, true, false);
    patternToken6.setPosToken(new PosToken(SENTENCE_END_TAGNAME, false, false));
    expect(patternToken6.isMatched(anSentEnd)).toBe(true);

    const patternToken7 = new PatternToken('\\p{Ll}+', false, true, false);
    patternToken7.setPosToken(new PosToken(SENTENCE_END_TAGNAME + '|BLABLA', true, false));
    expect(patternToken7.isMatched(anSentEnd)).toBe(true);

    // if the AnalyzedToken is in the set of readings that have non-null tags...
    anSentEnd.setNoPOSTag(false);
    expect(patternToken.isMatched(anSentEnd)).toBe(false);
    expect(patternToken2.isMatched(anSentEnd)).toBe(true);
    expect(patternToken3.isMatched(anSentEnd)).toBe(false);
    expect(patternToken4.isMatched(anSentEnd)).toBe(true);
    expect(patternToken5.isMatched(anSentEnd)).toBe(false);

    const anParaEnd = new AnalyzedToken('schword', PARAGRAPH_END_TAGNAME, null);
    expect(patternToken.isMatched(anParaEnd)).toBe(true);
    expect(patternToken2.isMatched(anParaEnd)).toBe(false);
    expect(patternToken3.isMatched(anParaEnd)).toBe(true);
    expect(patternToken4.isMatched(anParaEnd)).toBe(false);
    expect(patternToken5.isMatched(anParaEnd)).toBe(true);

    // if the AnalyzedToken is in the set of readings that have non-null tags...
    anParaEnd.setNoPOSTag(false);
    expect(patternToken.isMatched(anParaEnd)).toBe(false);
    expect(patternToken2.isMatched(anParaEnd)).toBe(true);
    expect(patternToken3.isMatched(anParaEnd)).toBe(false);
    expect(patternToken4.isMatched(anParaEnd)).toBe(true);
    expect(patternToken5.isMatched(anParaEnd)).toBe(false);

    const anWithPOS = new AnalyzedToken('schword', 'POS', null);
    expect(patternToken.isMatched(anWithPOS)).toBe(false);
    expect(patternToken2.isMatched(anWithPOS)).toBe(true);
    expect(patternToken3.isMatched(anWithPOS)).toBe(false);
    expect(patternToken4.isMatched(anWithPOS)).toBe(true);
    expect(patternToken5.isMatched(anWithPOS)).toBe(false);
  });

  // Java: PatternTokenTest#testNegation
  it('testNegation', () => {
    let token = new PatternTokenBuilder().tokenRegex('an?|the').negate().build();
    expect(token.getNegation()).toBe(true);

    token = new PatternTokenBuilder().tokenRegex('an?|the').build();
    expect(token.getNegation()).toBe(false);

    token = new PatternTokenBuilder().pos('NNS').negate().build();
    expect(token.getNegation()).toBe(true);

    token = new PatternTokenBuilder().pos('NNS').build();
    expect(token.getNegation()).toBe(false);

    token = new PatternTokenBuilder().token('text').negate().build();
    expect(token.getNegation()).toBe(true);

    token = new PatternTokenBuilder().token('text').build();
    expect(token.getNegation()).toBe(false);
  });

  // Java: PatternTokenTest#testFormHints
  it('testFormHints', () => {
    let token = new PatternTokenBuilder().tokenRegex('an?|the|th[eo]se').build();
    expect(asSet(token.calcFormHints())).toEqual(setOf('a', 'an', 'the', 'these', 'those'));

    token = new PatternTokenBuilder().token('foo').build();
    expect(asSet(token.calcFormHints())).toEqual(setOf('foo'));

    token = new PatternTokenBuilder().tokenRegex('(foo)?.*').build();
    expect(token.calcFormHints()).toBeNull();

    token = new PatternTokenBuilder().csTokenRegex('a|b').build();
    expect(asSet(token.calcFormHints())).toEqual(setOf('a', 'b'));

    token = new PatternTokenBuilder().token('a').min(0).build();
    expect(token.calcFormHints()).toBeNull();

    token = new PatternTokenBuilder().tokenRegex('an|the').build();
    token.setOrGroupElement(new PatternTokenBuilder().tokenRegex('foo|bar').build());
    expect(asSet(token.calcFormHints())).toEqual(setOf('an', 'the', 'foo', 'bar'));
    token.setOrGroupElement(new PatternTokenBuilder().tokenRegex('foo.*|bar').build());
    expect(token.calcFormHints()).toBeNull();

    token = new PatternTokenBuilder().tokenRegex('an|the').build();
    token.setAndGroupElement(new PatternTokenBuilder().tokenRegex('foo|an').build());
    expect(asSet(token.calcFormHints())).toEqual(setOf('an'));
  });
});
