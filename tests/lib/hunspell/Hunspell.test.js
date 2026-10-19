import { describe, it, expect, beforeAll } from 'vitest';
import { Hunspell } from '../../../src/core/rules/spelling/hunspell/Hunspell.js';

// Extra test: Hunspell WASM wrapper smoke + determinism (DEV-009)
describe('Hunspell wrapper', () => {
  let d;
  beforeAll(() => { Hunspell.clearCaches(); d = Hunspell.forDictionaryInResources('de_DE', '/de/hunspell/'); }, 60000);

  it('spells', () => {
    expect(d.spell('Haus')).toBe(true);
    expect(d.spell('Hauus')).toBe(false);
  });

  it('suggests', () => {
    expect(d.suggest('Hauus')).toContain('Haus');
  });

  it('is deterministic (work budget instead of wall clock)', () => {
    for (const w of ['Zahnarztpraxis', 'Handschufach', 'Kaffemaschine']) {
      expect(d.suggest(w)).toEqual(d.suggest(w));
    }
  }, 60000);
});
