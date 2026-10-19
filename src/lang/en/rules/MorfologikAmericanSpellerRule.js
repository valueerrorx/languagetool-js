// org.languagetool.rules.en.MorfologikAmericanSpellerRule
import { AbstractEnglishSpellerRule } from './AbstractEnglishSpellerRule.js';
import { VariantInfo } from './VariantInfo.js';
import { SuggestedReplacement } from '../../../core/rules/model/SuggestedReplacement.js';
import { registerComponent } from '../../../core/language/components.js';
import { toLowerCase } from '../../../lib/java/strings.js';

const RESOURCE_FILENAME = '/en/hunspell/en_US.dict';
const LANGUAGE_SPECIFIC_PLAIN_TEXT_DICT = 'en/hunspell/spelling_en-US.txt';
let BRITISH_ENGLISH = null; // Java: static final Map BRITISH_ENGLISH = loadWordlist("en/en-US-GB.txt", 1), initialised with the class

// Java: MorfologikAmericanSpellerRule
export class MorfologikAmericanSpellerRule extends AbstractEnglishSpellerRule {
  static FQCN = 'org.languagetool.rules.en.MorfologikAmericanSpellerRule';
  static RULE_ID = 'MORFOLOGIK_RULE_EN_US';

  // Java: MorfologikAmericanSpellerRule(ResourceBundle,Language) / (..., UserConfig, List) / (..., GlobalConfig, UserConfig, List, LanguageModel, Language)
  constructor(messages, language, ...rest) {
    if (BRITISH_ENGLISH === null) BRITISH_ENGLISH = AbstractEnglishSpellerRule.loadWordlist('en/en-US-GB.txt', 1);
    if (rest.length === 0) {
      super(messages, language, null, null, [], null, null);
    } else {
      super(messages, language, ...rest);
    }
  }

  // Java: MorfologikAmericanSpellerRule#isValidInOtherVariant(String)
  isValidInOtherVariant(word) {
    const otherVariant = BRITISH_ENGLISH.get(toLowerCase(word));
    if (otherVariant !== undefined) {
      return new VariantInfo('British English', otherVariant);
    }
    return null;
  }

  // Java: MorfologikAmericanSpellerRule#getFileName()
  getFileName() {
    return RESOURCE_FILENAME;
  }

  // Java: MorfologikAmericanSpellerRule#getId()
  getId() {
    return MorfologikAmericanSpellerRule.RULE_ID;
  }

  // Java: MorfologikAmericanSpellerRule#getLanguageVariantSpellingFileName()
  getLanguageVariantSpellingFileName() {
    return LANGUAGE_SPECIFIC_PLAIN_TEXT_DICT;
  }

  // Java: MorfologikAmericanSpellerRule#getAdditionalTopSuggestions(List,String)
  getAdditionalTopSuggestions(suggestions, word) {
    let s = null;
    if ('automize' === word) {
      s = ['automate'];
    } else if ('automized' === word) {
      s = ['automated'];
    } else if ('automizing' === word) {
      s = ['automating'];
    } else if ('automizes' === word) {
      s = ['automates'];
    }
    if (s !== null) {
      return SuggestedReplacement.convert(s);
    }
    return super.getAdditionalTopSuggestions(suggestions, word);
  }
}
registerComponent(MorfologikAmericanSpellerRule.FQCN, (...args) => new MorfologikAmericanSpellerRule(...args));
