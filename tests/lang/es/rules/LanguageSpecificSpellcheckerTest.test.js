// Ported from LanguageSpecificSpellcheckerTest (es module)
import { describe, it } from 'vitest';
import '../../../../src/lang/register.js';
import { runLanguageSpecificTest } from '../../../support/SpellcheckerTest.js';

describe('LanguageSpecificSpellcheckerTest (es)', () => {
  // Java: SpellcheckerTest#testLanguageSpecificSpellchecker
  it('runLanguageSpecificTest', () => {
    runLanguageSpecificTest('es');
  });
});
