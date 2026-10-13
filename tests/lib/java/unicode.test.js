import { describe, it, expect } from 'vitest';
import * as C from '../../../src/lib/java/Character.js';
import { toLowerCase, toUpperCase } from '../../../src/lib/java/strings.js';
import { normalize, Form } from '../../../src/lib/java/Normalizer.js';

describe('Character (Unicode 13 tables)', () => {
  it('types and predicates', () => {
    expect(C.getType(0x41)).toBe(C.UPPERCASE_LETTER);
    expect(C.isLetter(0x1e9e)).toBe(true);
    expect(C.digit(0x0663, 10)).toBe(3);
    expect(C.getNumericValue(0x216b)).toBe(12);
    expect(C.UnicodeScript.of(0x3b1).name()).toBe('GREEK');
  });
});

describe('String case mapping', () => {
  it('locale rules', () => {
    expect(toUpperCase('i', 'tr')).toBe('İ');
    expect(toUpperCase('i', 'tr-TR')).toBe('İ');
    expect(toLowerCase('I', 'az')).toBe('ı');
    expect(toUpperCase('straße')).toBe('STRASSE');
    expect(toLowerCase('ΑΣ')).toBe('ας');
    expect(toLowerCase('Σ')).toBe('σ');
  });
});

describe('Normalizer', () => {
  it('forms', () => {
    expect(normalize('ä', Form.NFD)).toBe('ä');
    expect(normalize('ä', Form.NFC)).toBe('ä');
    expect(normalize('ﬁ', Form.NFKC)).toBe('fi');
  });
});
