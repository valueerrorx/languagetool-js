// Java: org.languagetool.language.identifier.LanguageIdentifierService (enum singleton INSTANCE)
import { DefaultLanguageIdentifier } from './DefaultLanguageIdentifier.js';
import { isLanguageSupported } from './DetectionLanguages.js';
import { SimpleLanguageIdentifier } from './SimpleLanguageIdentifier.js';

// Java: org.languagetool.language.identifier.LanguageIdentifierService
export class LanguageIdentifierService {
  static FQCN = 'org.languagetool.language.identifier.LanguageIdentifierService';

  constructor() {
    this.defaultIdentifier = null;
    this.simpleIdentifier = null;
  }

  // Java: LanguageIdentifierService#getDefaultLanguageIdentifier(int,File,File,File) (first call wins; 0 -> default 1000)
  getDefaultLanguageIdentifier(maxLength, ngramLangIdentData = null, fasttextBinary = null, fasttextModel = null) {
    if (this.defaultIdentifier === null) {
      const defaultIdentifier = maxLength > 0 ? new DefaultLanguageIdentifier(maxLength) : new DefaultLanguageIdentifier();
      defaultIdentifier.enableNgrams(ngramLangIdentData);
      defaultIdentifier.enableFasttext(fasttextBinary, fasttextModel);
      this.defaultIdentifier = defaultIdentifier;
    }
    return this.defaultIdentifier;
  }

  // Java: LanguageIdentifierService#getSimpleLanguageIdentifier(List) (speller based, R5: not ported yet)
  getSimpleLanguageIdentifier(preferredLangCodes) {
    if (this.simpleIdentifier === null) {
      this.simpleIdentifier = preferredLangCodes === null || preferredLangCodes === undefined
        ? new SimpleLanguageIdentifier() : new SimpleLanguageIdentifier(preferredLangCodes);
    }
    return this.simpleIdentifier;
  }

  // Java: LanguageIdentifierService#getInitialized()
  getInitialized() {
    if (this.defaultIdentifier !== null) return this.defaultIdentifier;
    if (this.simpleIdentifier !== null) return this.simpleIdentifier;
    return null;
  }

  // Java: LanguageIdentifierService#canLanguageBeDetected(String,List)
  canLanguageBeDetected(langCode, additionalLanguageCodes) {
    return isLanguageSupported(langCode) || additionalLanguageCodes.includes(langCode);
  }

  // Java: LanguageIdentifierService#clearLanguageIdentifier(String)
  clearLanguageIdentifier(type) {
    switch (type) {
      case 'default':
        this.defaultIdentifier = null;
        break;
      case 'simple':
        this.simpleIdentifier = null;
        break;
      case 'both':
        this.simpleIdentifier = null;
        this.defaultIdentifier = null;
        break;
      default:
        break;
    }
    return this;
  }

  static INSTANCE = new LanguageIdentifierService();
}
