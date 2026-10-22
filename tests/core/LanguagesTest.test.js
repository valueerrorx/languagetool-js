// Ported from LanguagesTest (languagetool-standalone); cases that need Demo ("xx") or out-of-scope languages (DEV-006) are left out.
import { describe, it, expect } from 'vitest';
import '../../src/lang/register.js';
import { Locale } from '../../src/lib/java/Locale.js';
import { Languages } from '../../src/core/Languages.js';
import { assertThrowsJava } from '../support/javaAssert.js';

const IAE = 'java.lang.IllegalArgumentException';

describe('LanguagesTest', () => {
  // Java: LanguagesTest#testGet (Demo language is not part of the distribution: get() equals getWithDemoLanguage())
  it('testGet', () => {
    expect(Languages.get().length).toBe(Languages.getWithDemoLanguage().length);
    expect(Languages.get().map((l) => l.getShortCodeWithCountryAndVariant())).toEqual([
      'de', 'de-DE', 'de-AT', 'de-CH', 'en', 'en-US', 'en-GB', 'en-AU', 'en-CA', 'en-NZ', 'en-ZA', 'es', 'es-AR', 'fr', 'fr-CA', 'fr-CH', 'fr-BE', 'it', 'pl-PL', 'ru-RU', 'sk-SK', 'sl-SI']);
  });

  // Java: LanguagesTest#testGetIsUnmodifiable
  it('testGetIsUnmodifiable', () => {
    const languages = Languages.get();
    expect(() => languages.push(languages[0])).toThrow(TypeError);
  });

  // Java: LanguagesTest#testGetWithDemoLanguageIsUnmodifiable
  it('testGetWithDemoLanguageIsUnmodifiable', () => {
    const languages = Languages.getWithDemoLanguage();
    expect(() => languages.push(languages[0])).toThrow(TypeError);
  });

  // Java: LanguagesTest#testGetLanguageForShortName
  it('testGetLanguageForShortName', () => {
    expect(Languages.getLanguageForShortCode('en-us').getShortCodeWithCountryAndVariant()).toBe('en-US');
    expect(Languages.getLanguageForShortCode('EN-US').getShortCodeWithCountryAndVariant()).toBe('en-US');
    expect(Languages.getLanguageForShortCode('en-US').getShortCodeWithCountryAndVariant()).toBe('en-US');
    expect(Languages.getLanguageForShortCode('de').getShortCodeWithCountryAndVariant()).toBe('de');
    assertThrowsJava(() => Languages.getLanguageForShortCode('xy'), IAE);
    assertThrowsJava(() => Languages.getLanguageForShortCode('YY-KK'), IAE);
  });

  // Java: LanguagesTest#testIsLanguageSupported
  it('testIsLanguageSupported', () => {
    expect(Languages.isLanguageSupported('en-US')).toBe(true);
    expect(Languages.isLanguageSupported('en-us')).toBe(true);
    expect(Languages.isLanguageSupported('EN-US')).toBe(true);
    expect(Languages.isLanguageSupported('de')).toBe(true);
    expect(Languages.isLanguageSupported('de-DE')).toBe(true);
    expect(Languages.isLanguageSupported('yy-ZZ')).toBe(false);
    expect(Languages.isLanguageSupported('zz')).toBe(false);
    expect(Languages.isLanguageSupported('somthing totally invalid')).toBe(false);
  });

  // Java: LanguagesTest#testIsLanguageSupportedInvalidCode
  it('testIsLanguageSupportedInvalidCode', () => {
    assertThrowsJava(() => Languages.isLanguageSupported('somthing-totally-inv-alid'), IAE);
  });

  // Java: LanguagesTest#testInvalidShortName1..3
  it('testInvalidShortName', () => {
    assertThrowsJava(() => Languages.getLanguageForShortCode('de-'), IAE, "'de-' isn't a valid language code");
    assertThrowsJava(() => Languages.getLanguageForShortCode('dexx'), IAE);
    assertThrowsJava(() => Languages.getLanguageForShortCode('xyz-xx'), IAE);
  });

  // Java: LanguagesTest#testGetLanguageForName
  it('testGetLanguageForName', () => {
    expect(Languages.getLanguageForName('English (US)').getShortCodeWithCountryAndVariant()).toBe('en-US');
    expect(Languages.getLanguageForName('German').getShortCodeWithCountryAndVariant()).toBe('de');
    expect(Languages.getLanguageForName('Foobar')).toBe(null);
  });

  // Java: LanguagesTest#testIsVariant
  it('testIsVariant', () => {
    expect(Languages.getLanguageForShortCode('en-US').isVariant()).toBe(true);
    expect(Languages.getLanguageForShortCode('de-CH').isVariant()).toBe(true);
    expect(Languages.getLanguageForShortCode('en').isVariant()).toBe(false);
    expect(Languages.getLanguageForShortCode('de').isVariant()).toBe(false);
  });

  // Java: LanguagesTest#testHasVariant
  it('testHasVariant', () => {
    expect(Languages.getLanguageForShortCode('en').hasVariant()).toBe(true);
    expect(Languages.getLanguageForShortCode('de').hasVariant()).toBe(true);
    expect(Languages.getLanguageForShortCode('en-US').hasVariant()).toBe(false);
    expect(Languages.getLanguageForShortCode('de-CH').hasVariant()).toBe(false);
    for (const language of Languages.getWithDemoLanguage()) {
      if (language.hasVariant()) {
        expect(language.getDefaultLanguageVariant(), `Language ${language} needs a default variant`).not.toBe(null);
      }
    }
  });

  // Java: LanguagesTest#isHiddenFromGui
  it('isHiddenFromGui', () => {
    expect(Languages.getLanguageForShortCode('en').isHiddenFromGui()).toBe(true);
    expect(Languages.getLanguageForShortCode('de').isHiddenFromGui()).toBe(true);
    expect(Languages.getLanguageForShortCode('en-US').isHiddenFromGui()).toBe(false);
    expect(Languages.getLanguageForShortCode('de-CH').isHiddenFromGui()).toBe(false);
    expect(Languages.getLanguageForShortCode('de-DE').isHiddenFromGui()).toBe(false);
  });

  // Java: LanguagesTest#testGetLanguageForLocale (pl and zz cases: pl is out of scope, zz falls back like Korean)
  it('testGetLanguageForLocale', () => {
    expect(Languages.getLanguageForLocale(Locale.GERMAN).getShortCode()).toBe('de');
    expect(Languages.getLanguageForLocale(Locale.GERMANY).getShortCode()).toBe('de');
    expect(Languages.getLanguageForLocale(new Locale('de', 'DE')).getShortCodeWithCountryAndVariant()).toBe('de-DE');
    expect(Languages.getLanguageForLocale(new Locale('de', 'AT')).getShortCodeWithCountryAndVariant()).toBe('de-AT');
    expect(Languages.getLanguageForLocale(new Locale('en', 'US')).getShortCodeWithCountryAndVariant()).toBe('en-US');
    expect(Languages.getLanguageForLocale(new Locale('en', 'GB')).getShortCodeWithCountryAndVariant()).toBe('en-GB');
    // fallback to the language's default variant if not specified:
    expect(Languages.getLanguageForLocale(new Locale('en')).getShortCodeWithCountryAndVariant()).toBe('en-US');
    expect(Languages.getLanguageForLocale(new Locale('de')).getShortCodeWithCountryAndVariant()).toBe('de-DE');
    // final fallback is everything else fails:
    expect(Languages.getLanguageForLocale(new Locale('ko')).getShortCodeWithCountryAndVariant()).toBe('en-US');
    expect(Languages.getLanguageForLocale(new Locale('zz')).getShortCodeWithCountryAndVariant()).toBe('en-US');
  });

  // Java: Languages#getLongCodeToLangMapping order (fixture X-LANG-REGISTRY/lists, in-scope entries)
  it('longCodeToLangMapping keeps the Java HashMap order', () => {
    expect(Languages.getLongCodeToLangMapping().keySet()).toEqual(['en-US', 'en-CA', 'en-ZA', 'sl-SI', 'de-AT', 'fr-CH', 'en-AU', 'de-CH', 'de-DE', 'sk-SK', 'es-ES', 'fr-CA', 'it-IT', 'en-NZ', 'pl-PL', 'ru-RU', 'es-AR', 'fr-BE', 'de-LU', 'fr-FR', 'en-GB']);
    expect(Languages.getLanguageForShortCode('fr-FR').getShortCodeWithCountryAndVariant()).toBe('fr');
  });

  // Java: Languages#getLanguageForShortCode(String,List) with noop codes
  it('noop language codes', () => {
    expect(Languages.getLanguageForShortCode('xyz', ['xyz']).getShortCode()).toBe('zz');
    expect(Languages.getLanguageForShortCode('de', ['de']).getShortCodeWithCountryAndVariant()).toBe('de');
    assertThrowsJava(() => Languages.getLanguageForShortCode('', ['']), IAE, 'langCode cannot be empty or whitespace only');
  });
});
