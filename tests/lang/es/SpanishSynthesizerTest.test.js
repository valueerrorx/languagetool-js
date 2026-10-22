// Ported from SpanishSynthesizerTest (es module)
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { AnalyzedToken } from '../../../src/core/AnalyzedToken.js';
import { SpanishSynthesizer } from '../../../src/lang/es/synthesis/SpanishSynthesizer.js';

const dummyToken = (s) => new AnalyzedToken(s, s, s);
const arr = (a) => `[${a.join(', ')}]`;

describe('SpanishSynthesizerTest', () => {
  // Java: SpanishSynthesizerTest#testSynthesizeStringString
  it('testSynthesizeStringString', () => {
    const synth = SpanishSynthesizer.INSTANCE;
    expect(synth.synthesize(dummyToken('blablabla'), 'blablabla').length).toBe(0);
    expect(arr(synth.synthesize(dummyToken('temer'), 'VMSI3S0'))).toBe('[temiera, temiese]');
    expect(arr(synth.synthesize(dummyToken('presidente'), 'NCCP000'))).toBe('[presidentes]');
    expect(arr(synth.synthesize(dummyToken('contar'), 'VMSP2P0'))).toBe('[contéis]');
    expect(arr(synth.synthesize(dummyToken('probar'), 'VMP00SM'))).toBe('[probado]');
    expect(arr(synth.synthesize(dummyToken('probar'), 'VMP00SM', false))).toBe('[probado]');
    // with regular expressions
    expect(arr(synth.synthesize(dummyToken('probar'), 'VMP00SM', true))).toBe('[probado]');
    expect(arr(synth.synthesize(dummyToken('probar'), 'VMP00SM|VMG0000', true))).toBe('[probando, probado]');
  });
});
