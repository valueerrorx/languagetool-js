// Ported from PolishTest (pl module)
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { Languages } from '../../../src/core/Languages.js';
import { JLanguageTool } from '../../../src/core/JLanguageTool.js';
import { Polish } from '../../../src/lang/pl/language/Polish.js';
import { LanguageSpecificTest } from '../../support/LanguageSpecificTest.js';
import { simulateNoEnglishModule } from '../../support/NoEnglishModule.js';

simulateNoEnglishModule(); // the Java pl module tests run without the en module on the classpath

const LONG = 3600000;

describe('PolishTest', () => {
  const base = new LanguageSpecificTest('pl');

  // Java: PolishTest#testLanguage
  it('testLanguage', async () => {
    const s = 'Wpisz tekst lub użyj istniejącego przykładu. To jest przykładowy tekst który pokazuje, jak jak działa LanguageTool. LanguageTool ma jusz korektor psowni, który wyrurznia bledy na czewrono.';
    const lang = new Polish();
    base.testDemoText(lang, s, ['BRAK_PRZECINKA_KTORY', 'WORD_REPEAT_RULE', 'PL_SIMPLE_REPLACE', 'MORFOLOGIK_RULE_PL_PL', 'MORFOLOGIK_RULE_PL_PL', 'MORFOLOGIK_RULE_PL_PL', 'MORFOLOGIK_RULE_PL_PL']);
    await base.runTests(lang, null, 'ą');
  }, LONG);

  // Java: Polish metadata, getRelevantRules, getPriorityForId (PL-0001, PL-0002, PL-0009)
  it('metadata and rules', () => {
    const lang = Languages.getLanguageForShortCode('pl');
    expect(lang.getName()).toBe('Polish');
    expect(lang.getShortCodeWithCountryAndVariant()).toBe('pl-PL');
    expect(lang.getPriorityForId('ZDANIA_ZLOZONE')).toBe(-1);
    const ids = lang.getRelevantRules(JLanguageTool.getMessageBundle(), null, null, []).map((r) => r.getId());
    expect(ids).toEqual(['COMMA_PARENTHESIS_WHITESPACE', 'UPPERCASE_SENTENCE_START', 'WORD_REPEAT_RULE', 'WHITESPACE_RULE', 'SENTENCE_WHITESPACE',
      'PL_UNPAIRED_BRACKETS', 'MORFOLOGIK_RULE_PL_PL', 'PL_WORD_REPEAT', 'PL_COMPOUNDS', 'PL_SIMPLE_REPLACE', 'PL_WORD_COHERENCY', 'DASH_RULE']);
  }, LONG);
});
