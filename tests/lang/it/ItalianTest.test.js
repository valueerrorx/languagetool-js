// Ported from ItalianTest and ItalianConcurrencyTest (it module)
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { Languages } from '../../../src/core/Languages.js';
import { JLanguageTool } from '../../../src/core/JLanguageTool.js';
import { Italian } from '../../../src/lang/it/language/Italian.js';
import { LanguageSpecificTest } from '../../support/LanguageSpecificTest.js';
import { simulateNoEnglishModule } from '../../support/NoEnglishModule.js';

simulateNoEnglishModule(); // the Java it module tests run without the en module on the classpath

const LONG = 3600000;

describe('ItalianTest', () => {
  const base = new LanguageSpecificTest('it');

  // Java: ItalianTest#testLanguage
  it('testLanguage', async () => {
    const s = 'Inserite qui il vostro testo... Oppure controlate direttamente questo ed avrete un assaggio di quali errori possono essere identificati con LanguageTool.';
    const lang = new Italian();
    base.testDemoText(lang, s, ['MORFOLOGIK_RULE_IT_IT', 'ST_03_001']);
    await base.runTests(lang);
  }, LONG);

  // Java: Italian metadata and getRelevantRules (IT-0001, IT-0002)
  it('metadata and rules', () => {
    const lang = Languages.getLanguageForShortCode('it');
    expect(lang.getName()).toBe('Italian');
    expect(lang.getCountries()).toEqual(['IT', 'CH']);
    expect(lang.getMaintainers().map((c) => c.getName())).toEqual(['Paolo Bianchini']);
    const ids = lang.getRelevantRules(JLanguageTool.getMessageBundle(), null, null, []).map((r) => r.getId());
    expect(ids).toEqual(['WHITESPACE_PUNCTUATION', 'COMMA_PARENTHESIS_WHITESPACE', 'DOUBLE_PUNCTUATION', 'UNPAIRED_BRACKETS',
      'MORFOLOGIK_RULE_IT_IT', 'UPPERCASE_SENTENCE_START', 'ITALIAN_WORD_REPEAT_RULE', 'WHITESPACE_RULE']);
  }, LONG);

  // Java: ItalianConcurrencyTest (sequential in JS)
  it('concurrency sample', () => {
    const lang = Languages.getLanguageForShortCode('it');
    for (let i = 0; i < 5; i++) {
      expect(new JLanguageTool(lang).check("Da Wikipedia, l'enciclopedia libera.")).not.toBeNull();
    }
  }, LONG);
});
