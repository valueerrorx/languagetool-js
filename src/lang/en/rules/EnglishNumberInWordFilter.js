// org.languagetool.rules.en.EnglishNumberInWordFilter
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { Locale } from '../../../lib/java/Locale.js';
import { MESSAGE_BUNDLE } from '../../../core/JLanguageToolConstants.js';
import { getDataBroker } from '../../../core/resources/LtStatics.js';
import { AbstractNumberInWordFilter } from '../../../core/rules/AbstractNumberInWordFilter.js';
import { AmericanEnglish } from '../language/AmericanEnglish.js';
import { MorfologikAmericanSpellerRule } from './MorfologikAmericanSpellerRule.js';

let englishSpellerRule = null; // Java: EnglishNumberInWordFilter#englishSpellerRule (static)

// Java: EnglishNumberInWordFilter
export class EnglishNumberInWordFilter extends AbstractNumberInWordFilter {
  static FQCN = 'org.languagetool.rules.en.EnglishNumberInWordFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.en.EnglishNumberInWordFilter() throws java.io.IOException' }];

  // Java: EnglishNumberInWordFilter#EnglishNumberInWordFilter()
  constructor() {
    super(AmericanEnglish.getInstance());
    const messages = getDataBroker().getResourceBundle(MESSAGE_BUNDLE, new Locale(this.language.getShortCode()));
    if (englishSpellerRule === null) {
      englishSpellerRule = new MorfologikAmericanSpellerRule(messages, AmericanEnglish.getInstance());
    }
  }

  // Java: EnglishNumberInWordFilter#isMisspelled(String)
  isMisspelled(word) {
    return englishSpellerRule.isMisspelled(word);
  }

  // Java: EnglishNumberInWordFilter#getSuggestions(String)
  getSuggestions(word) {
    return englishSpellerRule.getSpellingSuggestions(word);
  }
}

registerClass(EnglishNumberInWordFilter.FQCN, EnglishNumberInWordFilter);
