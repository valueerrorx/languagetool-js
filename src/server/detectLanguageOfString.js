// Java: TextChecker#detectLanguageOfString and #parseLanguage (request side of detection; the rest of TextChecker is F69)
import { ArrayIndexOutOfBoundsException, IllegalArgumentException } from '../lib/java/errors.js';
import { javaSplit } from '../lib/java/strings.js';
import { getLanguageForShortCode } from '../core/language/identifier/DetectionLanguages.js';
import { DetectedLanguage } from '../core/rules/model/DetectedLanguage.js';
import { BadRequestException } from './BadRequestException.js';

// Java: TextChecker#parseLanguage(String) (all distribution languages, DEV-008)
export function parseLanguage(code) {
  try {
    return getLanguageForShortCode(code);
  } catch (e) {
    if (e instanceof IllegalArgumentException) throw new BadRequestException(e.getMessage());
    throw e;
  }
}

// Java: TextChecker#detectLanguageOfString(String,String,List,List,List,boolean)
export function detectLanguageOfString(languageIdentifier, text, fallbackLanguage, preferredVariants, noopLangs, preferredLangs, forcePreferredLanguages = false) {
  let lang;
  const cleanText = languageIdentifier.cleanAndShortenText(text);
  const detected = languageIdentifier.detectLanguage(cleanText, noopLangs, preferredLangs, forcePreferredLanguages);
  if (detected === null) {
    lang = parseLanguage(fallbackLanguage !== null && fallbackLanguage !== undefined ? fallbackLanguage : 'en');
  } else {
    lang = detected.getDetectedLanguage();
  }
  if (preferredVariants.length > 0) {
    for (const preferredVariant of preferredVariants) {
      if (!preferredVariant.includes('-')) {
        throw new BadRequestException(`Invalid format for 'preferredVariants', expected a dash as in 'en-GB': '${preferredVariant}'`);
      }
      const parts = javaSplit(preferredVariant, '-');
      if (parts.length === 0) throw new ArrayIndexOutOfBoundsException('Index 0 out of bounds for length 0'); // e.g. "-"
      const preferredVariantLang = parts[0];
      if (preferredVariantLang === lang.getShortCode()) {
        lang = parseLanguage(preferredVariant);
        if (lang === null) {
          throw new BadRequestException(`Invalid 'preferredVariants', no such language/variant found: '${preferredVariant}'`);
        }
      }
    }
  } else if (lang.getDefaultLanguageVariant() !== null) {
    lang = lang.getDefaultLanguageVariant();
  }
  return new DetectedLanguage(null, lang, detected !== null ? detected.getDetectionConfidence() : 0,
    detected !== null ? detected.getDetectionSource() : null);
}
