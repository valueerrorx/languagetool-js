// Ported from MatchStateTest (languagetool-core)
import { describe, it, expect } from 'vitest';
import { Match, CaseConversion, IncludeRange } from '../../../src/core/patterns/Match.js';
import { MatchState } from '../../../src/core/patterns/MatchState.js';
import { FakeLanguage } from '../../support/FakeLanguage.js';

// Java: MatchStateTest#getMatchState(CaseConversion)
const getMatchState = (conversion) => new MatchState(new Match('', '', false, '', '', conversion, false, false, IncludeRange.NONE), null);

describe('MatchStateTest', () => {
  // Java: MatchStateTest#testConvertCase
  it('testConvertCase', () => {
    const startUpper = getMatchState(CaseConversion.STARTUPPER);
    expect(startUpper.convertCase(null, 'Y', new FakeLanguage('en'))).toBeNull();
    expect(startUpper.convertCase('', 'Y', new FakeLanguage('en'))).toBe('');
    expect(startUpper.convertCase('x', 'Y', new FakeLanguage('en'))).toBe('X');
    expect(startUpper.convertCase('xxx', 'Yyy', new FakeLanguage('en'))).toBe('Xxx');
    // special case for Dutch:
    expect(startUpper.convertCase('ijsselmeer', 'Uppercase', new FakeLanguage('nl'))).toBe('IJsselmeer');
    expect(startUpper.convertCase('ijsselmeer', 'lowercase', new FakeLanguage('nl'))).toBe('IJsselmeer');
    expect(startUpper.convertCase('ij', 'Uppercase', new FakeLanguage('nl'))).toBe('IJ');

    const preserve = getMatchState(CaseConversion.PRESERVE);
    expect(preserve.convertCase('xxx', 'Yyy', new FakeLanguage('en'))).toBe('Xxx');
    expect(preserve.convertCase('xxx', 'yyy', new FakeLanguage('en'))).toBe('xxx');
    expect(preserve.convertCase('xxx', 'YYY', new FakeLanguage('en'))).toBe('XXX');
    // special case for Dutch:
    expect(preserve.convertCase('ijsselmeer', 'Uppercase', new FakeLanguage('nl'))).toBe('IJsselmeer');
    expect(preserve.convertCase('ijsselmeer', 'lowercase', new FakeLanguage('nl'))).toBe('ijsselmeer');
    expect(preserve.convertCase('ijsselmeer', 'ALLUPPER', new FakeLanguage('nl'))).toBe('IJSSELMEER');

    const startLower = getMatchState(CaseConversion.STARTLOWER);
    expect(startLower.convertCase('xxx', 'YYY', new FakeLanguage('en'))).toBe('xxx');
    expect(startLower.convertCase('xxx', 'yyy', new FakeLanguage('en'))).toBe('xxx');
    expect(startLower.convertCase('xxx', 'Yyy', new FakeLanguage('en'))).toBe('xxx');
    expect(startLower.convertCase('XXX', 'Yyy', new FakeLanguage('en'))).toBe('xXX');
    expect(startLower.convertCase('Xxx', 'Yyy', new FakeLanguage('en'))).toBe('xxx');
  });
});
