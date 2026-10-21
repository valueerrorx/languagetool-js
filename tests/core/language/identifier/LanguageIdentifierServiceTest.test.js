// Ported from LanguageIdentifierServiceTest (languagetool-standalone)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { DefaultLanguageIdentifier } from '../../../../src/core/language/identifier/DefaultLanguageIdentifier.js';
import { SimpleLanguageIdentifier } from '../../../../src/core/language/identifier/SimpleLanguageIdentifier.js';
import { LanguageIdentifierService } from '../../../../src/core/language/identifier/LanguageIdentifierService.js';

describe('LanguageIdentifierServiceTest', () => {
  // Java: LanguageIdentifierServiceTest#testFactory
  it('testFactory', () => {
    const default1 = LanguageIdentifierService.INSTANCE.clearLanguageIdentifier('default').getDefaultLanguageIdentifier(0, null, null, null);
    const default2 = LanguageIdentifierService.INSTANCE.clearLanguageIdentifier('default').getDefaultLanguageIdentifier(1000, null, null, null);
    const simple1 = LanguageIdentifierService.INSTANCE.clearLanguageIdentifier('simple').getSimpleLanguageIdentifier(null);
    const simple2 = LanguageIdentifierService.INSTANCE.clearLanguageIdentifier('simple').getSimpleLanguageIdentifier(null);
    expect(default1).toBeInstanceOf(DefaultLanguageIdentifier);
    expect(default2).toBeInstanceOf(DefaultLanguageIdentifier);
    expect(default1).not.toBe(default2);
    expect(simple1).toBeInstanceOf(SimpleLanguageIdentifier);
    expect(simple2).toBeInstanceOf(SimpleLanguageIdentifier);
    expect(simple1).not.toBe(simple2);
  });

  // Java: LanguageIdentifierServiceTest#testFactoryWithoutReset
  it('testFactoryWithoutReset', () => {
    const default1 = LanguageIdentifierService.INSTANCE.getDefaultLanguageIdentifier(0, null, null, null);
    const default2 = LanguageIdentifierService.INSTANCE.getDefaultLanguageIdentifier(1000, null, null, null);
    const simple1 = LanguageIdentifierService.INSTANCE.getSimpleLanguageIdentifier([]);
    const simple2 = LanguageIdentifierService.INSTANCE.getSimpleLanguageIdentifier([]);
    expect(default1).toBe(default2);
    expect(simple1).toBe(simple2);
    expect(simple1).not.toBe(default1);
    expect(simple1).not.toBe(default2);
    expect(simple2).not.toBe(default1);
    expect(simple2).not.toBe(default2);
  });
});
