// Ported from SlovakSynthesizerTest (sk module)
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { AnalyzedToken } from '../../../src/core/AnalyzedToken.js';
import { SlovakSynthesizer } from '../../../src/lang/sk/synthesis/SlovakSynthesizer.js';

describe('SlovakSynthesizerTest', () => {
  const dummyToken = (tokenStr) => new AnalyzedToken(tokenStr, tokenStr, tokenStr);
  const arr = (a) => `[${a.join(', ')}]`; // Java: Arrays#toString(Object[])

  // Java: SlovakSynthesizerTest#testSynthesizeStringString()
  it('testSynthesizeStringString', () => {
    const synth = SlovakSynthesizer.INSTANCE;
    expect(synth.synthesize(dummyToken('blablabla'), 'blablabla').length).toBe(0);
    expect(arr(synth.synthesize(dummyToken('časopis'), 'SSis2'))).toBe('[časopisu]');
    // with regular expressions
    expect(arr(synth.synthesize(dummyToken('časopis'), 'SS.*', true))).toBe('[časopisy, časopisov, časopisom, časopisy, časopisy, časopisoch, časopismi, časopis, časopisu, časopisu, časopis, časopis, časopise, časopisom]');
  });
});
