// Ported from PolishSynthesizerTest (pl module)
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { AnalyzedToken } from '../../../src/core/AnalyzedToken.js';
import { PolishSynthesizer } from '../../../src/lang/pl/synthesis/PolishSynthesizer.js';

const dummyToken = (s) => new AnalyzedToken(s, s, s);
const arr = (a) => `[${a.join(', ')}]`;
const sorted = (a) => [...a].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));

describe('PolishSynthesizerTest', () => {
  // Java: PolishSynthesizerTest#testSynthesizeString
  it('testSynthesizeString', () => {
    const synth = PolishSynthesizer.INSTANCE;
    expect(synth.synthesize(dummyToken('blablabla'), 'blablabla').length).toBe(0);
    expect(arr(synth.synthesize(dummyToken('Aaron'), 'subst:sg:gen:m1'))).toBe('[Aarona]');
    expect(arr(synth.synthesize(dummyToken('Abchaz'), 'subst:sg:inst:m1'))).toBe('[Abchazem]');
    expect(arr(synth.synthesize(dummyToken('mieć'), 'verb:praet:sg:f:ter:imperf:refl.nonrefl'))).toBe('[miała]');
    expect(arr(synth.synthesize(dummyToken('brzydko'), 'adv:com'))).toBe('[brzydziej]');
    // with regular expressions
    expect(arr(sorted(synth.synthesize(dummyToken('toner'), 'subst:sg:gen:m.*', true)))).toBe('[tonera]');
    expect(arr(sorted(synth.synthesize(dummyToken('nieduży'), 'adj:sg.*(m[0-9]?|m.n):pos', true)))).toBe('[niedużego, nieduży]');
    expect(arr(sorted(synth.synthesize(dummyToken('mieć'), '.*praet:sg.*', true)))).toBe('[miał, miała, miałam, miałaś, miałem, miałeś, miało, miałom, miałoś]');
  });
});
