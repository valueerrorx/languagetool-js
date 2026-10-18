// Extra test: commons-text WordUtils#capitalize(String)
import { describe, it, expect } from 'vitest';
import { capitalize } from '../../../src/lib/java/WordUtils.js';

describe('WordUtils.capitalize', () => {
  it('capitalizes after whitespace only', () => {
    expect(capitalize('rhythm and blues')).toBe('Rhythm And Blues');
    expect(capitalize('a-b c\td e')).toBe('A-b C\tD e');
    expect(capitalize('')).toBe('');
    expect(capitalize('ǆa ǆb')).toBe('ǅa ǅb');
    expect(capitalize('ßx')).toBe('ßx');
    expect(capitalize('😀 x')).toBe('😀 X');
  });
});
