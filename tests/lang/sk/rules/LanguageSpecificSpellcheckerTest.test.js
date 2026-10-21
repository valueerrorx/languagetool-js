// Ported from LanguageSpecificSpellcheckerTest (sk module)
import { describe, it } from 'vitest';
import '../../../../src/lang/register.js';
import { runLanguageSpecificTest } from '../../../support/SpellcheckerTest.js';

describe('LanguageSpecificSpellcheckerTest (sk)', () => {
  // Java: SpellcheckerTest#testLanguageSpecificSpellchecker
  it('runLanguageSpecificTest', () => {
    runLanguageSpecificTest('sk');
  });
});
