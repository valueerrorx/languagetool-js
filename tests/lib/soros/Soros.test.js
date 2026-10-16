// extra tests for Soros (no Java test class); expected values are taken from X-SYNTH golden fixtures
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { GermanSynthesizer } from '../../../src/lang/de/synthesis/GermanSynthesizer.js';
import { EnglishSynthesizer } from '../../../src/lang/en/synthesis/EnglishSynthesizer.js';
import { FrenchSynthesizer } from '../../../src/lang/fr/synthesis/FrenchSynthesizer.js';

describe('Soros', () => {
  it('spells numbers in de/en/fr', () => {
    expect(GermanSynthesizer.INSTANCE.getSpelledNumber('121')).toBe('einhunderteinundzwanzig');
    expect(GermanSynthesizer.INSTANCE.getSpelledNumber('1000000000000000')).toBe('eine Billiarde');
    expect(EnglishSynthesizer.INSTANCE.getSpelledNumber('1243')).toBe('one thousand two hundred forty-three');
    expect(FrenchSynthesizer.INSTANCE.getSpelledNumber('21')).toBe('vingt et un');
  });
  it('writes roman numbers', () => {
    expect(GermanSynthesizer.INSTANCE.getRomanNumber('121')).toBe('CXXI');
    expect(GermanSynthesizer.INSTANCE.getRomanNumber('abc')).toBe('');
  });
  it('null input throws the Matcher NPE', () => {
    expect(() => GermanSynthesizer.INSTANCE.getSpelledNumber(null)).toThrow('this.text');
  });
});
