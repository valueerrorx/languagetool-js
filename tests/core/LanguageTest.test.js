// Ported from LanguageTest (languagetool-standalone) and the registry-only parts of FrenchTest/GermanTest/EnglishTest; JLanguageTool-based cases follow with F15.
import { describe, it, expect } from 'vitest';
import '../../src/lang/register.js';
import { Locale } from '../../src/lib/java/Locale.js';
import { getDataBroker } from '../../src/core/resources/LtStatics.js';
import { MESSAGE_BUNDLE } from '../../src/core/resources/ResourceBundleTools.js';
import { Languages } from '../../src/core/Languages.js';
import { German } from '../../src/lang/de/language/German.js';
import { GermanyGerman } from '../../src/lang/de/language/GermanyGerman.js';
import { AustrianGerman } from '../../src/lang/de/language/AustrianGerman.js';
import { SwissGerman } from '../../src/lang/de/language/SwissGerman.js';
import { English } from '../../src/lang/en/language/English.js';
import { AmericanEnglish } from '../../src/lang/en/language/AmericanEnglish.js';
import { BritishEnglish } from '../../src/lang/en/language/BritishEnglish.js';
import { French } from '../../src/lang/fr/language/French.js';
import { assertThrowsJava } from '../support/javaAssert.js';

// Java: TestTools#getMessages(String)
const getMessages = (code) => getDataBroker().getResourceBundle(MESSAGE_BUNDLE, new Locale(code));

describe('LanguageTest', () => {
  // Java: LanguageTest#testRuleFileName (non-premium branch)
  it('testRuleFileName', () => {
    expect(`[${BritishEnglish.getInstance().getRuleFileNames().join(', ')}]`).toBe('[/org/languagetool/rules/en/grammar.xml, /org/languagetool/rules/en/style.xml, /org/languagetool/rules/en/en-GB/grammar.xml, /org/languagetool/rules/en/en-GB/style.xml]');
    expect(`[${AmericanEnglish.getInstance().getRuleFileNames().join(', ')}]`).toBe('[/org/languagetool/rules/en/grammar.xml, /org/languagetool/rules/en/style.xml, /org/languagetool/rules/en/en-US/grammar.xml, /org/languagetool/rules/en/en-US/style.xml]');
    expect(`[${new English().getRuleFileNames().join(', ')}]`).toBe('[/org/languagetool/rules/en/grammar.xml, /org/languagetool/rules/en/style.xml]');
    expect(`[${new German().getRuleFileNames().join(', ')}]`).toBe('[/org/languagetool/rules/de/grammar.xml, /org/languagetool/rules/de/style.xml]');
  });

  // Java: LanguageTest#testGetTranslatedName
  it('testGetTranslatedName', () => {
    expect(new English().getTranslatedName(getMessages('en'))).toBe('English');
    expect(BritishEnglish.getInstance().getTranslatedName(getMessages('en'))).toBe('English (British)');
    expect(new English().getTranslatedName(getMessages('de'))).toBe('Englisch');
    expect(BritishEnglish.getInstance().getTranslatedName(getMessages('de'))).toBe('Englisch (Großbritannien)');
    expect(new German().getTranslatedName(getMessages('de'))).toBe('Deutsch');
    expect(new SwissGerman().getTranslatedName(getMessages('de'))).toBe('Deutsch (Schweiz)');
  });

  // Java: LanguageTest#testGetShortNameWithVariant
  it('testGetShortNameWithVariant', () => {
    expect(AmericanEnglish.getInstance().getShortCodeWithCountryAndVariant()).toBe('en-US');
    expect(new German().getShortCodeWithCountryAndVariant()).toBe('de');
  });

  // Java: LanguageTest#testEquals
  it('testEquals', () => {
    expect(GermanyGerman.getInstance().equals(GermanyGerman.getInstance())).toBe(true);
    expect(new AustrianGerman().equals(GermanyGerman.getInstance())).toBe(false);
    expect(new AustrianGerman().equals(new German())).toBe(false);
  });

  // Java: LanguageTest#testEqualsConsiderVariantIfSpecified
  it('testEqualsConsiderVariantIfSpecified', () => {
    // every language equals itself:
    expect(new German().equalsConsiderVariantsIfSpecified(new German())).toBe(true);
    expect(GermanyGerman.getInstance().equalsConsiderVariantsIfSpecified(GermanyGerman.getInstance())).toBe(true);
    expect(new English().equalsConsiderVariantsIfSpecified(new English())).toBe(true);
    expect(AmericanEnglish.getInstance().equalsConsiderVariantsIfSpecified(AmericanEnglish.getInstance())).toBe(true);
    // equal if variant is the same, but only if specified:
    expect(AmericanEnglish.getInstance().equalsConsiderVariantsIfSpecified(new English())).toBe(true);
    expect(new English().equalsConsiderVariantsIfSpecified(AmericanEnglish.getInstance())).toBe(true);
    expect(AmericanEnglish.getInstance().equalsConsiderVariantsIfSpecified(BritishEnglish.getInstance())).toBe(false);
    expect(new English().equalsConsiderVariantsIfSpecified(new German())).toBe(false);
  });

  // Java: AmericanEnglish#AmericanEnglish() instantiation check
  it('registered languages cannot be instantiated twice', () => {
    assertThrowsJava(() => new AmericanEnglish(), 'java.lang.RuntimeException', 'Language was already instantiated, see the cause stacktrace below.');
    assertThrowsJava(() => new French(), 'java.lang.RuntimeException', 'Language was already instantiated, see the cause stacktrace below.');
  });

  // Java: German#getInstance()
  it('German.getInstance always throws', () => {
    assertThrowsJava(() => German.getInstance(), 'java.lang.RuntimeException', 'You should not obtain the German language instance. Use getInstance method of derived language class instead. Or maybe subclass did not implement the getInstance method.');
  });

  // Java: FrenchTest#testAdvancedTypography
  it('French testAdvancedTypography', () => {
    const lang = French.getInstance();
    expect(lang.toAdvancedTypography('"C\'est"')).toBe('« C’est »');
    expect(lang.toAdvancedTypography('"C\'est" ')).toBe('« C’est » ');
    expect(lang.toAdvancedTypography("'C'est'")).toBe('‘C’est’');
    expect(lang.toAdvancedTypography("Vouliez-vous dire 'C'est'?")).toBe('Vouliez-vous dire ‘C’est’ ?');
    expect(lang.toAdvancedTypography('Vouliez-vous dire "C\'est"?')).toBe('Vouliez-vous dire « C’est » ?');
    expect(lang.toAdvancedTypography("Vouliez-vous dire <suggestion>C'est</suggestion>?")).toBe('Vouliez-vous dire « C’est » ?');
    expect(lang.toAdvancedTypography('Confusion possible : "a" est une conjugaison du verbe avoir. Vouliez-vous dire « à »?'))
      .toBe('Confusion possible : « a » est une conjugaison du verbe avoir. Vouliez-vous dire « à » ?');
    expect(lang.toAdvancedTypography('C\'est l\'"homme".')).toBe('C’est l’«\u00a0homme\u00a0».');
    expect(lang.toAdvancedTypography('Vouliez-vous dire <suggestion>50 $</suggestion>?')).toBe('Vouliez-vous dire « 50 $ » ?');
  });

  // Java: Language#getPriorityForId and the id2prio maps (DE-0004, EN-0004, FR-0005)
  it('priorities', () => {
    expect(Languages.getLanguageForShortCode('de').getPriorityForId('DE_PROHIBITED_PHRASE')).toBe(11);
    expect(Languages.getLanguageForShortCode('de').getPriorityForId('AI_DE_GGEC_REPLACEMENT_NOUN')).toBe(-1);
    expect(Languages.getLanguageForShortCode('en-GB').getPriorityForId('OXFORD_SPELLING_IZE')).toBe(-22);
    expect(Languages.getLanguageForShortCode('en').getPriorityForId('TOO_LONG_SENTENCE')).toBe(-997);
    expect(Languages.getLanguageForShortCode('fr').getPriorityForId('FR_COMPOUNDS_X')).toBe(500);
    expect(Languages.getLanguageForShortCode('fr').getPriorityForId('SOME_STYLE')).toBe(-50);
  });
});
