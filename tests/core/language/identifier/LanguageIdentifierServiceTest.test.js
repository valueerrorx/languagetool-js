// Ported from LanguageIdentifierServiceTest (languagetool-standalone); SimpleLanguageIdentifier needs spellers (F18 spec R5) -> notPorted until F46.
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { DefaultLanguageIdentifier } from '../../../../src/core/language/identifier/DefaultLanguageIdentifier.js';
import { LanguageIdentifierService } from '../../../../src/core/language/identifier/LanguageIdentifierService.js';

describe('LanguageIdentifierServiceTest', () => {
  // Java: LanguageIdentifierServiceTest#testFactory (default part; the simple part is R5)
  it('testFactory', () => {
    const default1 = LanguageIdentifierService.INSTANCE.clearLanguageIdentifier('default').getDefaultLanguageIdentifier(0, null, null, null);
    const default2 = LanguageIdentifierService.INSTANCE.clearLanguageIdentifier('default').getDefaultLanguageIdentifier(1000, null, null, null);
    expect(default1).toBeInstanceOf(DefaultLanguageIdentifier);
    expect(default2).toBeInstanceOf(DefaultLanguageIdentifier);
    expect(default1).not.toBe(default2);
    expect(() => LanguageIdentifierService.INSTANCE.clearLanguageIdentifier('simple').getSimpleLanguageIdentifier(null)).toThrow(/not ported/);
  });

  // Java: LanguageIdentifierServiceTest#testFactoryWithoutReset (default part)
  it('testFactoryWithoutReset', () => {
    const default1 = LanguageIdentifierService.INSTANCE.getDefaultLanguageIdentifier(0, null, null, null);
    const default2 = LanguageIdentifierService.INSTANCE.getDefaultLanguageIdentifier(1000, null, null, null);
    expect(default1).toBe(default2);
  });
});
