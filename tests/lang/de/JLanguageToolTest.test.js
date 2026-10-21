// Ported from JLanguageToolTest (de module; Premium.isPremiumVersion() is false)
import { describe, it, expect } from 'vitest';
import '../../../src/lang/register.js';
import { JLanguageTool, Level, Mode, ParagraphHandling } from '../../../src/core/JLanguageTool.js';
import { Languages } from '../../../src/core/Languages.js';
import { AnnotatedTextBuilder } from '../../../src/core/text/AnnotatedTextBuilder.js';
import { GermanyGerman } from '../../../src/lang/de/language/GermanyGerman.js';
import { simulateNoEnglishModule } from '../../support/NoEnglishModule.js';

simulateNoEnglishModule(); // the Java de module tests run without the en module on the classpath

const LONG = 3600000;

describe('JLanguageToolTest (de)', () => {
  // Java: JLanguageToolTest#testGerman
  it('testGerman', () => {
    const lt = new JLanguageTool(Languages.getLanguageForShortCode('de'));
    expect(lt.check('Ein Test, der keine Fehler geben sollte.').length).toBe(0);
    expect(lt.check('Ein Test Test, der Fehler geben sollte.').length).toBe(1);
    lt.setListUnknownWords(true);
    // no spelling mistakes as we have not created a variant:
    expect(lt.check('I can give you more a detailed description').length).toBe(0);
    // test unknown words listing
    expect(`[${lt.getUnknownWords().join(', ')}]`).toBe('[I, can, description, detailed, give, more, you]');
  }, LONG);

  // Java: JLanguageToolTest#testGermanyGerman
  it('testGermanyGerman', () => {
    const lt = new JLanguageTool(Languages.getLanguageForShortCode('de-DE'));
    expect(lt.check('Ein Test, der keine Fehler geben sollte.').length).toBe(0);
    expect(lt.check('Ein Test Test, der Fehler geben sollte.').length).toBe(1);
    lt.setListUnknownWords(true);
    // German rule has no effect with English error, but they are spelling mistakes:
    expect(lt.check('I can give you more a detailed description').length).toBe(6);
    // test unknown words listing
    expect(`[${lt.getUnknownWords().join(', ')}]`).toBe('[I, can, description, detailed, give, more, you]');
  }, LONG);

  // Java: JLanguageToolTest#testPositionsWithGerman
  it('testPositionsWithGerman', () => {
    const lt = new JLanguageTool(Languages.getLanguageForShortCode('de-DE'));
    const matches = lt.check('Stundenkilometer');
    expect(matches.length).toBe(1);
    const match = matches[0];
    expect(match.getLine()).toBe(0);
    expect(match.getColumn()).toBe(1);
  }, LONG);

  // Java: JLanguageToolTest#testCleanOverlappingWithGerman
  it('testCleanOverlappingWithGerman', () => {
    const lt = new JLanguageTool(Languages.getLanguageForShortCode('de-DE'));
    // Juxtaposed errors in "TRGS - Technische" should not be removed.
    const text = 'TRGS - Technische Regeln für Gefahrstoffe';
    const matches = lt.check(new AnnotatedTextBuilder().addText(text).build(), true,
      ParagraphHandling.NORMAL, null, Mode.ALL, Level.PICKY);
    expect(matches.length).toBe(3);
  }, LONG);

  // Java: JLanguageToolTest#testAdvancedTypography
  it('testAdvancedTypography', () => {
    const lang = GermanyGerman.getInstance();
    expect(lang.toAdvancedTypography('Das ist...')).toBe('Das ist…');
    expect(lang.toAdvancedTypography('Meinten Sie "entschieden" oder "entscheidend"?')).toBe('Meinten Sie „entschieden“ oder „entscheidend“?');
    expect(lang.toAdvancedTypography("Meinten Sie 'entschieden' oder 'entscheidend'?")).toBe('Meinten Sie ‚entschieden‘ oder ‚entscheidend‘?');

    expect(lang.toAdvancedTypography('z. B.')).toBe('z. B.');
    expect(lang.toAdvancedTypography('z.B.')).toBe('z. B.');
    expect(lang.toAdvancedTypography('i.d.R.')).toBe('i. d. R.');
    expect(lang.toAdvancedTypography('i. d. R.')).toBe('i. d. R.');

    expect(lang.toAdvancedTypography('Zeichen ohne sein Gegenstück: \'"\' scheint zu fehlen')).toBe('Zeichen ohne sein Gegenstück: ‚"‘ scheint zu fehlen');
  });

  // Java: JLanguageToolTest#testGermanVariants
  it('testGermanVariants', () => {
    const sentence = 'Ein Test, der keine Fehler geben sollte.';
    const sentence2 = 'Ein Test Test, der Fehler geben sollte.';
    for (const langCode of ['de-DE', 'de-CH', 'de-AT']) {
      const lt = new JLanguageTool(Languages.getLanguageForShortCode(langCode));
      expect(lt.check(sentence).length).toBe(0);
      expect(lt.check(sentence2).length).toBe(1);
    }
  }, LONG);
});
