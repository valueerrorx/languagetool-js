// Ported from LanguageBuilderTest (languagetool-core) plus the file name and extension paths of LanguageBuilder.
import { describe, it, expect } from 'vitest';
import '../../src/lang/register.js';
import { File } from '../../src/lib/java/io/File.js';
import { LanguageBuilder } from '../../src/core/language/LanguageBuilder.js';
import { Languages, resetDynamicLanguages } from '../../src/core/Languages.js';
import { assertThrowsJava } from '../support/javaAssert.js';

describe('LanguageBuilderTest', () => {
  // Java: LanguageBuilderTest#testMakeAdditionalLanguage
  it('testMakeAdditionalLanguage', () => {
    const language = LanguageBuilder.makeAdditionalLanguage(new File('rules-xy-Fakelanguage.xml'));
    expect(language.getName()).toBe('Fakelanguage');
    expect(language.getShortCode()).toBe('xy');
    expect(language.getRelevantRules(null, null, null, []).length).toBe(0);
    expect(language.isExternal()).toBe(true);
  });

  // Java: LanguageBuilderTest#testIllegalFileName
  it('testIllegalFileName', () => {
    assertThrowsJava(() => LanguageBuilder.makeAdditionalLanguage(new File('foo')), 'org.languagetool.language.RuleFilenameException',
      'Rule file must be named rules-<xx>-<lang>.xml (<xx> = language code, <lang> = language name),\nfor example: rules-en-English.xml\nCurrent name: foo');
  });

  // Java: LanguageBuilder#makeLanguage extends a registered language
  it('extends a registered language', () => {
    const language = LanguageBuilder.makeAdditionalLanguage(new File('/tmp/rules-de-Deutsch.xml'));
    expect(language.getName()).toBe('Deutsch');
    expect(language.getShortCode()).toBe('de');
    expect(language.getRuleFileNames().at(-1)).toBe('/tmp/rules-de-Deutsch.xml');
  });
});

describe('dynamic languages', () => {
  // Java: Languages#addLanguage
  it('addLanguage', () => {
    try {
      const lang = Languages.addLanguage('Dyn Dict', 'dd-XX', new File('/tmp/x/dd.dict'));
      expect(lang.getShortCode()).toBe('dd');
      expect(lang.isSpellcheckOnlyLanguage()).toBe(true);
      expect(lang.getCommonWordsPath()).toBe('/tmp/x/common_words.txt');
      expect(Languages.getLanguageForShortCode('dd').getName()).toBe('Dyn Dict');
      assertThrowsJava(() => Languages.addLanguage('Bad', 'bb', new File('/tmp/x/bb.txt')), 'java.lang.RuntimeException',
        "Please specify a dictPath that ends in '.dict' (Morfologik binary dictionary) or '.dic' (Hunspell dictionary): /tmp/x/bb.txt");
    } finally {
      resetDynamicLanguages();
    }
  });
});
