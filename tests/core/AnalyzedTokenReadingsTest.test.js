// Ported from AnalyzedTokenReadingsTest (languagetool-core).
import { describe, it, expect } from 'vitest';
import { AnalyzedToken } from '../../src/core/AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../../src/core/AnalyzedTokenReadings.js';

describe('AnalyzedTokenReadingsTest', () => {
  // Java: AnalyzedTokenReadingsTest#testNewTags
  it('testNewTags', () => {
    let tokenReadings = new AnalyzedTokenReadings(new AnalyzedToken('word', 'POS', 'lemma'));
    expect(tokenReadings.isLinebreak()).toBe(false);
    expect(tokenReadings.isSentenceEnd()).toBe(false);
    expect(tokenReadings.isParagraphEnd()).toBe(false);
    expect(tokenReadings.isSentenceStart()).toBe(false);
    tokenReadings.setSentEnd();
    expect(tokenReadings.isSentenceStart()).toBe(false);
    expect(tokenReadings.isSentenceEnd()).toBe(true);
    // test SEND_END or PARA_END added directly via addReading
    tokenReadings = new AnalyzedTokenReadings(new AnalyzedToken('word', null, 'lemma'));
    tokenReadings.addReading(new AnalyzedToken('word', 'SENT_END', null), '');
    expect(tokenReadings.isSentenceEnd()).toBe(true);
    expect(tokenReadings.isParagraphEnd()).toBe(false);
    tokenReadings.addReading(new AnalyzedToken('word', 'PARA_END', null), '');
    expect(tokenReadings.isParagraphEnd()).toBe(true);
    expect(tokenReadings.isSentenceStart()).toBe(false);
    // but you can't add SENT_START to a non-empty token and get isSentStart == true
    tokenReadings.addReading(new AnalyzedToken('word', 'SENT_START', null), '');
    expect(tokenReadings.isSentenceStart()).toBe(false);
    const aTok = new AnalyzedToken('word', 'POS', 'lemma');
    aTok.setWhitespaceBefore(true);
    tokenReadings = new AnalyzedTokenReadings(aTok);
    expect(tokenReadings.getAnalyzedToken(0).equals(aTok)).toBe(true);
    const aTok2 = new AnalyzedToken('word', 'POS', 'lemma');
    expect(!aTok2.equals(tokenReadings.getAnalyzedToken(0))).toBe(true);
    const aTok3 = new AnalyzedToken('word', 'POS', 'lemma');
    aTok3.setWhitespaceBefore(true);
    expect(tokenReadings.getAnalyzedToken(0).equals(aTok3)).toBe(true);
    const testReadings = new AnalyzedTokenReadings(aTok3);
    testReadings.removeReading(aTok3, '');
    expect(testReadings.getReadingsLength()).toBe(1);
    expect(testReadings.getToken()).toBe('word');
    expect(!testReadings.hasPosTag('POS')).toBe(true);
    // now what about removing something that does not belong to testReadings?
    testReadings.leaveReading(aTok2);
    expect(testReadings.getToken()).toBe('word');
    expect(!testReadings.hasPosTag('POS')).toBe(true);
    testReadings.removeReading(aTok2, '');
    expect(testReadings.getToken()).toBe('word');
    expect(!testReadings.hasPosTag('POS')).toBe(true);
  });

  // Java: AnalyzedTokenReadingsTest#testToString
  it('testToString', () => {
    const tokenReadings = new AnalyzedTokenReadings(new AnalyzedToken('word', 'POS', 'lemma'));
    expect(tokenReadings.toString()).toBe('word[lemma/POS*]');
    tokenReadings.addReading(new AnalyzedToken('word', 'POS2', 'lemma2'), '');
    expect(tokenReadings.toString()).toBe('word[lemma/POS*,lemma2/POS2*]');
  });

  // Java: AnalyzedTokenReadingsTest#testHasPosTag
  it('testHasPosTag', () => {
    const tokenReadings = new AnalyzedTokenReadings(new AnalyzedToken('word', 'POS:FOO:BAR', 'lemma'));
    expect(tokenReadings.hasPosTag('POS:FOO:BAR')).toBe(true);
    expect(tokenReadings.hasPosTag('POS:FOO:bar')).toBe(false);
    expect(tokenReadings.hasPosTag('POS:FOO')).toBe(false);
    expect(tokenReadings.hasPosTag('xaz')).toBe(false);
  });

  // Java: AnalyzedTokenReadingsTest#testHasPartialPosTag
  it('testHasPartialPosTag', () => {
    const tokenReadings = new AnalyzedTokenReadings(new AnalyzedToken('word', 'POS:FOO:BAR', 'lemma'));
    for (const t of ['POS:FOO:BAR', 'POS:FOO:', 'POS:FOO', ':FOO:', 'FOO:BAR']) expect(tokenReadings.hasPartialPosTag(t)).toBe(true);
    for (const t of ['POS:FOO:BARX', 'POS:foo:BAR', 'xaz']) expect(tokenReadings.hasPartialPosTag(t)).toBe(false);
  });

  // Java: AnalyzedTokenReadingsTest#testMatchesPosTagRegex
  it('testMatchesPosTagRegex', () => {
    const tokenReadings = new AnalyzedTokenReadings(new AnalyzedToken('word', 'POS:FOO:BAR', 'lemma'));
    expect(tokenReadings.matchesPosTagRegex('POS:FOO:BAR')).toBe(true);
    expect(tokenReadings.matchesPosTagRegex('POS:...:BAR')).toBe(true);
    expect(tokenReadings.matchesPosTagRegex('POS:[A-Z]+:BAR')).toBe(true);
    expect(tokenReadings.matchesPosTagRegex('POS:[AB]OO:BAR')).toBe(false);
    expect(tokenReadings.matchesPosTagRegex('POS:FOO:BARX')).toBe(false);
  });

  // Java: AnalyzedTokenReadingsTest#testIteration
  it('testIteration', () => {
    const tokenReadings = new AnalyzedTokenReadings([new AnalyzedToken('word1', null, null), new AnalyzedToken('word2', null, null)], 0);
    let i = 0;
    for (const tokenReading of tokenReadings) {
      if (i === 0) expect(tokenReading.getToken()).toBe('word1');
      else if (i === 1) expect(tokenReading.getToken()).toBe('word2');
      else expect.fail();
      i++;
    }
    expect(i).toBe(2);
  });
});
