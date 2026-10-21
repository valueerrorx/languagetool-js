// Extra test (the Java SimpleLanguageIdentifierTest covers 30 languages; here the registered languages en/de/fr, DEV-006): speller based detection
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { SimpleLanguageIdentifier } from '../../../../src/core/language/identifier/SimpleLanguageIdentifier.js';

describe('SimpleLanguageIdentifier', () => {
  const identifier = new SimpleLanguageIdentifier(['en-US', 'de-DE', 'fr']);
  const code = (text) => identifier.detectLanguage(text, [], []).getDetectedLanguage().getShortCode();

  // Java: SimpleLanguageIdentifier#detectLanguage(String,List,List)
  it('detects by the error rate of the default spellers', () => {
    expect(code('This is a simple sentence about the weather today.')).toBe('en');
    expect(code('Dies ist ein einfacher Satz über das Wetter von heute.')).toBe('de');
    expect(code('Ceci est une phrase simple sur le temps aujourd’hui.')).toBe('fr');
  });

  // Java: SimpleLanguageIdentifier#detectLanguage(String,List,List)
  it('uses the "spellchecker" detection source and the Noop language for unsupported scripts', () => {
    expect(identifier.detectLanguage('Dies ist ein einfacher Satz über das Wetter von heute.', [], []).getDetectionSource()).toBe('spellchecker');
    expect(identifier.detectLanguage('ลินุกซ์ (อังกฤษ: Linux)', [], []).getDetectedLanguage().getShortCode()).toBe('zz');
  });

  // Java: SimpleLanguageIdentifier#detectLanguage(String)
  it('the plain detectLanguage(String) returns null', () => {
    expect(identifier.detectLanguage('hello')).toBeNull();
  });
});
