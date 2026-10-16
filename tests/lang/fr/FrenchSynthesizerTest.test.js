// Ported from FrenchSynthesizerTest (languagetool-language-modules/fr)
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { AnalyzedToken } from '../../../src/core/AnalyzedToken.js';
import { FrenchSynthesizer } from '../../../src/lang/fr/synthesis/FrenchSynthesizer.js';

describe('FrenchSynthesizerTest', () => {
  const dummyToken = (tokenStr) => new AnalyzedToken(tokenStr, tokenStr, tokenStr);
  const arr = (a) => `[${a.join(', ')}]`; // Java: Arrays#toString(Object[])

  // Java: FrenchSynthesizerTest#testSynthesizeStringString()
  it('testSynthesizeStringString', () => {
    const synth = FrenchSynthesizer.INSTANCE;
    expect(synth.synthesize(dummyToken('blablabla'), 'blablabla').length).toBe(0);

    expect(arr(synth.synthesize(dummyToken('nager'), 'V ind pres 3 p'))).toBe('[nagent]');
    expect(arr(synth.synthesize(dummyToken('le'), 'D (m|e) (p|sp)', true))).toBe('[les]');
    expect(arr(synth.synthesize(dummyToken('marin'), 'J [me] (p|sp)', true))).toBe('[marins]');
    expect(arr(synth.synthesize(new AnalyzedToken('marine', 'J f s', 'marin'), 'J [me] (p|sp)', true))).toBe('[marins]');
    expect(arr(synth.synthesize(new AnalyzedToken('marine', 'V ind pres 1 s', 'mariner'), 'V ppa [me] (p|sp)', true))).toBe('[marinés]');
  });
});
