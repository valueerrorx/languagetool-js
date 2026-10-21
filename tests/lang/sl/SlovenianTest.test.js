// Ported from SlovenianTest (sl module)
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { Languages } from '../../../src/core/Languages.js';
import { JLanguageTool } from '../../../src/core/JLanguageTool.js';
import { LanguageSpecificTest } from '../../support/LanguageSpecificTest.js';
import { simulateNoEnglishModule } from '../../support/NoEnglishModule.js';

simulateNoEnglishModule(); // the Java sl module tests run without the en module on the classpath

const LONG = 3600000;

describe('SlovenianTest', () => {
  const base = new LanguageSpecificTest('sl');

  // JUnit: SlovenianTest#testLanguage
  it('testLanguage', async () => {
    const s = 'Tukaj vnesite svoje besedilo... Pa poglejmo primer besedila s nekaj napakami ki jih lahko razpozna orodje LanguageTool; ko opazite napake, jih lahko enostavno popiravite. ( Obenem se izvrši tudi preverjanje črkovanja črkovanja.';
    const lang = Languages.getLanguageForShortCode('sl');
    base.testDemoText(lang, s,
      ['TROPIČJETRI', 'PREDLOG_S', 'KI_BREZ_VEJICE', 'MORFOLOGIK_RULE_SL_SI', 'COMMA_PARENTHESIS_WHITESPACE', 'WORD_REPEAT_RULE']);
    await base.runTests(lang);
  }, LONG);

  // Java: Slovenian metadata and getRelevantRules (SL-0001, SL-0002)
  it('metadata and rules', () => {
    const lang = Languages.getLanguageForShortCode('sl');
    expect(lang.getName()).toBe('Slovenian');
    expect(lang.getShortCodeWithCountryAndVariant()).toBe('sl-SI');
    expect(lang.getMaintainers().map((c) => c.getName())).toEqual(['Martin Srebotnjak']);
    const ids = new JLanguageTool(lang).getAllActiveRules().map((r) => r.getId());
    expect(ids).toContain('MORFOLOGIK_RULE_SL_SI');
    expect(ids).toContain('WORD_REPEAT_RULE');
  }, LONG);
});
