// Ported from RussianTest (ru module)
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { JLanguageTool } from '../../../src/core/JLanguageTool.js';
import { Russian } from '../../../src/lang/ru/language/Russian.js';
import { LanguageSpecificTest } from '../../support/LanguageSpecificTest.js';
import { simulateNoEnglishModule } from '../../support/NoEnglishModule.js';

simulateNoEnglishModule(); // the Java ru module tests run without the en module on the classpath

const LONG = 3600000;

describe('RussianTest', () => {
  const base = new LanguageSpecificTest('ru');

  // Java: RussianTest#testLanguage
  it('testLanguage', async () => {
    const s = 'Вставьте ваш текст сюда .. или проверьте этот текстт. Релиз LanguageTool 4.7 состоялся в четверг 28 сентября 2019 года.';
    const lang = Russian.getInstance();
    base.testDemoText(lang, s, ['DOUBLE_PUNCTUATION', 'UPPERCASE_SENTENCE_START', 'MORFOLOGIK_RULE_RU_RU', 'DATE_WEEKDAY1']);
    await base.runTests(lang);
  }, LONG);

  // Java: Russian#getRelevantRules order (RU-0002)
  it('getRelevantRules order', () => {
    const lang = Russian.getInstance();
    const ids = lang.getRelevantRules(JLanguageTool.getMessageBundle(), null, null, []).map((r) => r.getId());
    expect(ids).toEqual(['COMMA_PARENTHESIS_WHITESPACE', 'UPPERCASE_SENTENCE_START', 'MORFOLOGIK_RULE_RU_RU', 'WHITESPACE_RULE', 'SENTENCE_WHITESPACE',
      'WHITESPACE_PARAGRAPH', 'WHITESPACE_PARAGRAPH_BEGIN', 'TOO_LONG_SENTENCE', 'TOO_LONG_PARAGRAPH', 'PARAGRAPH_REPEAT_BEGINNING_RULE',
      'FILLER_WORDS_RU', 'PUNCTUATION_PARAGRAPH_END2', 'MORFOLOGIK_RULE_RU_RU_YO', 'RU_UNPAIRED_BRACKETS', 'RU_COMPOUNDS', 'RU_SIMPLE_REPLACE',
      'WORD_REPEAT_RULE', 'RU_WORD_COHERENCY', 'RU_WORD_REPEAT', 'RU_WORD_ROOT_REPEAT', 'RU_VERB_CONJUGATION', 'RU_DASH_RULE', 'RU_SPECIFIC_CASE']);
  }, LONG);
});
