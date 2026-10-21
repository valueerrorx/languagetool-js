// Ported from LanguageSpecificSpellcheckerTest (it module)
import { describe, it } from 'vitest';
import '../../../../src/lang/register.js';
import { runLanguageSpecificTest } from '../../../support/SpellcheckerTest.js';

describe('LanguageSpecificSpellcheckerTest (it)', () => {
  // Java: SpellcheckerTest#testLanguageSpecificSpellchecker
  it('runLanguageSpecificTest', () => {
    runLanguageSpecificTest('it');
  });
});
