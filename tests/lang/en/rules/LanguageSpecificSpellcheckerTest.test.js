// Ported from LanguageSpecificSpellcheckerTest (en module)
import { describe, it } from 'vitest';
import '../../../../src/lang/register.js';
import { runLanguageSpecificTest } from '../../../support/SpellcheckerTest.js';

describe('LanguageSpecificSpellcheckerTest (en)', () => {
  // Java: LanguageSpecificSpellcheckerTest#testRules
  it('testRules', () => {
    runLanguageSpecificTest('en');
  });
});
