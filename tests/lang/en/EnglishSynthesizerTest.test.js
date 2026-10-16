// Ported from EnglishSynthesizerTest (languagetool-language-modules/en)
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { AnalyzedToken } from '../../../src/core/AnalyzedToken.js';
import { EnglishSynthesizer } from '../../../src/lang/en/synthesis/EnglishSynthesizer.js';

describe('EnglishSynthesizerTest', () => {
  const dummyToken = (tokenStr, tokenLemma = tokenStr) => new AnalyzedToken(tokenStr, tokenStr, tokenLemma);
  const arr = (a) => `[${a.join(', ')}]`; // Java: Arrays#toString(Object[])

  // Java: EnglishSynthesizerTest#testSynthesizeStringString()
  it('testSynthesizeStringString', () => {
    const synth = EnglishSynthesizer.INSTANCE;
    expect(synth.synthesize(dummyToken('blablabla'), 'blablabla').length).toBe(0);

    expect(arr(synth.synthesize(dummyToken('be'), 'VBD'))).toBe('[was, were]');
    expect(arr(synth.synthesize(dummyToken('president'), 'NNS'))).toBe('[presidents]');
    expect(arr(synth.synthesize(dummyToken('test'), 'VBD'))).toBe('[tested]');
    expect(arr(synth.synthesize(dummyToken('test'), 'VBD', false))).toBe('[tested]');
    // with regular expressions
    expect(arr(synth.synthesize(dummyToken('test'), 'VBD', true))).toBe('[tested]');
    expect(arr(synth.synthesize(dummyToken('test'), 'VBD|VBG', true))).toBe('[tested, testing]');
    // with special indefinite article
    expect(arr(synth.synthesize(dummyToken('university'), '+DT', false))).toBe('[a university, the university]');
    expect(arr(synth.synthesize(dummyToken('hour'), '+DT', false))).toBe('[an hour, the hour]');
    expect(arr(synth.synthesize(dummyToken('hour'), '+INDT', false))).toBe('[an hour]');
    // indefinite article and other changes...
    expect(arr(synth.synthesize(dummyToken('hours', 'hour'), 'NN\\+INDT', true))).toBe('[an hour]');
    expect(arr(synth.synthesize(dummyToken('hexagon'), 'NN|NN:.*\\+INDT', true))).toBe('[a hexagon]');
    // indefinite article and other changes...
    expect(arr(synth.synthesize(dummyToken('hours', 'hour'), 'NN\\+DT', true))).toBe('[the hour]');
    // from added.txt:
    expect(arr(synth.synthesize(dummyToken('absolutize'), 'VBD', false))).toBe('[absolutized]');
    expect(arr(synth.synthesize(dummyToken('absolutize'), 'VB[XD]', true))).toBe('[absolutized]');
    // from removed.txt:
    expect(arr(synth.synthesize(dummyToken('Christmas'), 'VBZ', false))).toBe('[]');

    expect(arr(synth.synthesize(dummyToken('12'), '_spell_number_', false))).toBe('[twelve]');
    expect(arr(synth.synthesize(dummyToken('1243'), '_spell_number_', false))).toBe('[one thousand two hundred forty-three]');
    expect(arr(synth.synthesize(dummyToken('12'), '_spell_number_', true))).toBe('[twelve]');

    expect(arr(synth.synthesize(dummyToken('myself', 'I'), 'PRP_S1S', true))).toBe('[I]');

    expect(arr(synth.synthesize(dummyToken('myself', 'I'), 'PRP\\$_A1S', true))).toBe('[my]');

    expect(arr(synth.synthesize(dummyToken('mix'), 'VBD'))).toBe('[mixed]');
    expect(arr(synth.synthesize(dummyToken('mix'), 'VBN'))).toBe('[mixed]');
  });
});

describe('EnglishSynthesizer substring bounds', () => {
  it('throws StringIndexOutOfBoundsException for bare +INDT with regexp', () => {
    const s = new EnglishSynthesizer();
    expect(() => s.synthesize3(new AnalyzedToken('a', 'NN', 'a'), '+INDT', true)).toThrow('begin 0, end -1, length 5');
  });
  it('throws StringIndexOutOfBoundsException for bare +DT with regexp', () => {
    const s = new EnglishSynthesizer();
    expect(() => s.synthesize3(new AnalyzedToken('a', 'NN', 'a'), '+DT', true)).toThrow('begin 0, end -1, length 3');
  });
});
