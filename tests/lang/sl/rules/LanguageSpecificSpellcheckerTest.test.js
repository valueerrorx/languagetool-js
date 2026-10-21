// Ported from LanguageSpecificSpellcheckerTest (sl module)
import { describe, it } from 'vitest';
import '../../../../src/lang/register.js';
import { runLanguageSpecificTest } from '../../../support/SpellcheckerTest.js';

describe('LanguageSpecificSpellcheckerTest (sl)', () => {
  // Java: SpellcheckerTest#testLanguageSpecificSpellchecker
  it('runLanguageSpecificTest', () => {
    runLanguageSpecificTest('sl');
  });
});
