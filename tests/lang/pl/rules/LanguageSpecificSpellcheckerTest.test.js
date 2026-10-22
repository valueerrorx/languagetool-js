// Ported from LanguageSpecificSpellcheckerTest (pl module)
import { describe, it } from 'vitest';
import '../../../../src/lang/register.js';
import { runLanguageSpecificTest } from '../../../support/SpellcheckerTest.js';

describe('LanguageSpecificSpellcheckerTest (pl)', () => {
  // Java: SpellcheckerTest#testLanguageSpecificSpellchecker
  it('runLanguageSpecificTest', () => {
    runLanguageSpecificTest('pl');
  });
});
