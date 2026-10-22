// Ported from RussianSynthesizerTest (ru module)
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { AnalyzedToken } from '../../../src/core/AnalyzedToken.js';
import { RussianSynthesizer } from '../../../src/lang/ru/synthesis/RussianSynthesizer.js';

const dummyToken = (s) => new AnalyzedToken(s, s, s);
const arr = (a) => `[${a.join(', ')}]`;

describe('RussianSynthesizerTest', () => {
  // Java: RussianSynthesizerTest#testSynthesizeString
  it('testSynthesizeString', () => {
    const synth = RussianSynthesizer.INSTANCE;
    expect(synth.synthesize(dummyToken('blablabla'), 'blablabla').length).toBe(0);
    expect(arr(synth.synthesize(dummyToken('семья'), 'NN:Inanim:Fem:Sin:Nom'))).toBe('[семья]');
    expect(arr(synth.synthesize(dummyToken('семья'), 'NN:Inanim:Fem:Sin:R'))).toBe('[семьи]');
  });
});
