// Ported from ItalianSynthesizerTest (it module)
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { AnalyzedToken } from '../../../src/core/AnalyzedToken.js';
import { ItalianSynthesizer } from '../../../src/lang/it/synthesis/ItalianSynthesizer.js';

describe('ItalianSynthesizerTest', () => {
  const dummyToken = (tokenStr) => new AnalyzedToken(tokenStr, tokenStr, tokenStr);
  const arr = (a) => `[${a.join(', ')}]`; // Java: Arrays#toString(Object[])

  // Java: ItalianSynthesizerTest#testSynthesizeStringString()
  it('testSynthesizeStringString', () => {
    const synth = ItalianSynthesizer.INSTANCE;
    expect(synth.synthesize(dummyToken('blablabla'), 'blablabla').length).toBe(0);
    expect(arr(synth.synthesize(dummyToken('richiedere'), 'VER:impr+pres+2+s'))).toBe('[richiedi]');
    expect(arr(synth.synthesize(dummyToken('esultare'), 'VER:part+past+s+f'))).toBe('[esultata]');
    expect(arr(synth.synthesize(dummyToken('libro'), 'NOUN-M:p'))).toBe('[libri]');
  });
});
