// org.languagetool.rules.en.MorfologikSouthAfricanSpellerRule
import { AbstractEnglishSpellerRule } from './AbstractEnglishSpellerRule.js';
import { VariantInfo } from './VariantInfo.js';
import { registerComponent } from '../../../core/language/components.js';
import { toLowerCase } from '../../../lib/java/strings.js';

const RESOURCE_FILENAME = '/en/hunspell/en_ZA.dict';
const LANGUAGE_SPECIFIC_PLAIN_TEXT_DICT = 'en/hunspell/spelling_en-ZA.txt';
let US_ENGLISH = null; // Java: static final Map US_ENGLISH = loadWordlist("en/en-US-GB.txt", 0), initialised with the class

// Java: MorfologikSouthAfricanSpellerRule
export class MorfologikSouthAfricanSpellerRule extends AbstractEnglishSpellerRule {
  static FQCN = 'org.languagetool.rules.en.MorfologikSouthAfricanSpellerRule';

  // Java: MorfologikSouthAfricanSpellerRule(ResourceBundle,Language,UserConfig,List) / (ResourceBundle,Language,GlobalConfig,UserConfig,List,LanguageModel,Language)
  constructor(messages, language, ...rest) {
    if (US_ENGLISH === null) US_ENGLISH = AbstractEnglishSpellerRule.loadWordlist('en/en-US-GB.txt', 0);
    super(messages, language, ...rest);
  }

  // Java: MorfologikSouthAfricanSpellerRule#isValidInOtherVariant(String)
  isValidInOtherVariant(word) {
    const otherVariant = US_ENGLISH.get(toLowerCase(word));
    if (otherVariant !== undefined) {
      return new VariantInfo('American English', otherVariant);
    }
    return null;
  }

  // Java: MorfologikSouthAfricanSpellerRule#getFileName()
  getFileName() {
    return RESOURCE_FILENAME;
  }

  // Java: MorfologikSouthAfricanSpellerRule#getId()
  getId() {
    return 'MORFOLOGIK_RULE_EN_ZA';
  }

  // Java: MorfologikSouthAfricanSpellerRule#getLanguageVariantSpellingFileName()
  getLanguageVariantSpellingFileName() {
    return LANGUAGE_SPECIFIC_PLAIN_TEXT_DICT;
  }
}
registerComponent(MorfologikSouthAfricanSpellerRule.FQCN, (...args) => new MorfologikSouthAfricanSpellerRule(...args));
