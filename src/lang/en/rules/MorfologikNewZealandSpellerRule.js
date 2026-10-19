// org.languagetool.rules.en.MorfologikNewZealandSpellerRule
import { AbstractEnglishSpellerRule } from './AbstractEnglishSpellerRule.js';
import { VariantInfo } from './VariantInfo.js';
import { registerComponent } from '../../../core/language/components.js';
import { toLowerCase } from '../../../lib/java/strings.js';

const RESOURCE_FILENAME = '/en/hunspell/en_NZ.dict';
const LANGUAGE_SPECIFIC_PLAIN_TEXT_DICT = 'en/hunspell/spelling_en-NZ.txt';
let US_ENGLISH = null; // Java: static final Map US_ENGLISH = loadWordlist("en/en-US-GB.txt", 0), initialised with the class

// Java: MorfologikNewZealandSpellerRule
export class MorfologikNewZealandSpellerRule extends AbstractEnglishSpellerRule {
  static FQCN = 'org.languagetool.rules.en.MorfologikNewZealandSpellerRule';

  // Java: MorfologikNewZealandSpellerRule(ResourceBundle,Language,UserConfig,List) / (ResourceBundle,Language,GlobalConfig,UserConfig,List,LanguageModel,Language)
  constructor(messages, language, ...rest) {
    if (US_ENGLISH === null) US_ENGLISH = AbstractEnglishSpellerRule.loadWordlist('en/en-US-GB.txt', 0);
    super(messages, language, ...rest);
  }

  // Java: MorfologikNewZealandSpellerRule#isValidInOtherVariant(String)
  isValidInOtherVariant(word) {
    const otherVariant = US_ENGLISH.get(toLowerCase(word));
    if (otherVariant !== undefined) {
      return new VariantInfo('American English', otherVariant);
    }
    return null;
  }

  // Java: MorfologikNewZealandSpellerRule#getFileName()
  getFileName() {
    return RESOURCE_FILENAME;
  }

  // Java: MorfologikNewZealandSpellerRule#getId()
  getId() {
    return 'MORFOLOGIK_RULE_EN_NZ';
  }

  // Java: MorfologikNewZealandSpellerRule#getLanguageVariantSpellingFileName()
  getLanguageVariantSpellingFileName() {
    return LANGUAGE_SPECIFIC_PLAIN_TEXT_DICT;
  }
}
registerComponent(MorfologikNewZealandSpellerRule.FQCN, (...args) => new MorfologikNewZealandSpellerRule(...args));
