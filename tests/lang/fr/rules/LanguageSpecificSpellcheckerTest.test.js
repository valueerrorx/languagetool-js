// Ported from LanguageSpecificSpellcheckerTest (fr module)
import { describe, it } from 'vitest';
import '../../../../src/lang/register.js';
import { runLanguageSpecificTest } from '../../../support/SpellcheckerTest.js';

describe('LanguageSpecificSpellcheckerTest (fr)', () => {
  // Java: LanguageSpecificSpellcheckerTest#testRules
  it('testRules', () => {
    runLanguageSpecificTest('fr');
  });
});
