// Ported from SlovakTest (sk module) and SlovakConcurrencyTest
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { Languages } from '../../../src/core/Languages.js';
import { JLanguageTool } from '../../../src/core/JLanguageTool.js';
import { LanguageSpecificTest } from '../../support/LanguageSpecificTest.js';
import { simulateNoEnglishModule } from '../../support/NoEnglishModule.js';

simulateNoEnglishModule(); // the Java sk module tests run without the en module on the classpath

const LONG = 3600000;

describe('SlovakTest', () => {
  const base = new LanguageSpecificTest('sk');

  // Java: SlovakTest#testLanguage
  it('testLanguage', async () => {
    await base.runTests(Languages.getLanguageForShortCode('sk'));
  }, LONG);

  // Java: Slovak metadata and getRelevantRules (SK-0001, SK-0002)
  it('metadata and rules', () => {
    const lang = Languages.getLanguageForShortCode('sk');
    expect(lang.getName()).toBe('Slovak');
    expect(lang.getShortCodeWithCountryAndVariant()).toBe('sk-SK');
    expect(lang.getMaintainers().map((c) => c.getName())).toEqual(['Zdenko Podobný']);
    const lt = new JLanguageTool(lang);
    const ids = lt.getAllActiveRules().map((r) => r.getId());
    expect(ids).toContain('SK_COMPOUNDS');
    expect(ids).toContain('MORFOLOGIK_RULE_SK_SK');
    expect(lang.getRuleFileNames().map((f) => f.split('/').pop())).toEqual(['grammar.xml', 'grammar-typography.xml']);
  }, LONG);

  // Java: SlovakConcurrencyTest (sequential in JS)
  it('concurrency sample', () => {
    const lang = Languages.getLanguageForShortCode('sk');
    for (let i = 0; i < 5; i++) {
      expect(new JLanguageTool(lang).check('Wikipédia neobsahuje článok s takýmto názvom.')).not.toBeNull();
    }
  }, LONG);
});
