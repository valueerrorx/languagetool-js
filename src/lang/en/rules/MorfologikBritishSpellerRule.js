// org.languagetool.rules.en.MorfologikBritishSpellerRule
import { AbstractEnglishSpellerRule } from './AbstractEnglishSpellerRule.js';
import { VariantInfo } from './VariantInfo.js';
import { registerComponent } from '../../../core/language/components.js';
import { toLowerCase } from '../../../lib/java/strings.js';

const RESOURCE_FILENAME = '/en/hunspell/en_GB.dict';
const LANGUAGE_SPECIFIC_PLAIN_TEXT_DICT = 'en/hunspell/spelling_en-GB.txt';
let US_ENGLISH = null; // Java: static final Map US_ENGLISH = loadWordlist("en/en-US-GB.txt", 0), initialised with the class

// Java: MorfologikBritishSpellerRule
export class MorfologikBritishSpellerRule extends AbstractEnglishSpellerRule {
  static FQCN = 'org.languagetool.rules.en.MorfologikBritishSpellerRule';

  static RULE_ID = 'MORFOLOGIK_RULE_EN_GB';

  // Java: MorfologikBritishSpellerRule(ResourceBundle,Language,UserConfig,List) / (ResourceBundle,Language,GlobalConfig,UserConfig,List,LanguageModel,Language)
  constructor(messages, language, ...rest) {
    if (US_ENGLISH === null) US_ENGLISH = AbstractEnglishSpellerRule.loadWordlist('en/en-US-GB.txt', 0);
    super(messages, language, ...rest);
  }

  // Java: MorfologikBritishSpellerRule#isValidInOtherVariant(String)
  isValidInOtherVariant(word) {
    const otherVariant = US_ENGLISH.get(toLowerCase(word));
    if (otherVariant !== undefined) {
      return new VariantInfo('American English', otherVariant);
    }
    return null;
  }

  // Java: MorfologikBritishSpellerRule#getFileName()
  getFileName() {
    return RESOURCE_FILENAME;
  }

  // Java: MorfologikBritishSpellerRule#getId()
  getId() {
    return MorfologikBritishSpellerRule.RULE_ID;
  }

  // Java: MorfologikBritishSpellerRule#getLanguageVariantSpellingFileName()
  getLanguageVariantSpellingFileName() {
    return LANGUAGE_SPECIFIC_PLAIN_TEXT_DICT;
  }
}
registerComponent(MorfologikBritishSpellerRule.FQCN, (...args) => new MorfologikBritishSpellerRule(...args));
