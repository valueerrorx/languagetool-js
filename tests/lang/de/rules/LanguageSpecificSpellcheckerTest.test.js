// Ported from LanguageSpecificSpellcheckerTest (de module)
import { describe, it } from 'vitest';
import '../../../../src/lang/register.js';
import { runLanguageSpecificTest } from '../../../support/SpellcheckerTest.js';

describe('LanguageSpecificSpellcheckerTest (de)', () => {
  // Java: LanguageSpecificSpellcheckerTest#testRules
  it('testRules', () => {
    runLanguageSpecificTest('de');
  });
});
