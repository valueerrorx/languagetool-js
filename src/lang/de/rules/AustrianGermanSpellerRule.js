// org.languagetool.rules.de.AustrianGermanSpellerRule
import { GermanSpellerRule } from './GermanSpellerRule.js';
import { CachingWordListLoader } from '../../../core/rules/spelling/CachingWordListLoader.js';
import { registerComponent } from '../../../core/language/components.js';

const LANGUAGE_SPECIFIC_PLAIN_TEXT_DICT = 'de/hunspell/spelling-de-AT.txt'; // Java: AustrianGermanSpellerRule#LANGUAGE_SPECIFIC_PLAIN_TEXT_DICT

// Java: AustrianGermanSpellerRule
export class AustrianGermanSpellerRule extends GermanSpellerRule {
  static FQCN = 'org.languagetool.rules.de.AustrianGermanSpellerRule';

  // Java: AustrianGermanSpellerRule(ResourceBundle,German) / (ResourceBundle,German,UserConfig,LanguageModel)
  constructor(messages, language, userConfig = null, lm = null) {
    super(messages, language, userConfig, LANGUAGE_SPECIFIC_PLAIN_TEXT_DICT, [], lm);
    this.variantWordListLoader = new CachingWordListLoader(); // Java: own private wordListLoader field (the parent keeps its own)
  }

  // Java: AustrianGermanSpellerRule#getId()
  getId() {
    return 'AUSTRIAN_GERMAN_SPELLER_RULE';
  }

  // Java: AustrianGermanSpellerRule#init()
  init() {
    super.init();
    for (const ignoreWord of this.variantWordListLoader.loadWords('/de/hunspell/spelling-de-AT.txt')) {
      this.addIgnoreWords(ignoreWord);
    }
  }

  // Java: AustrianGermanSpellerRule#getLanguageVariantSpellingFileName()
  getLanguageVariantSpellingFileName() {
    return LANGUAGE_SPECIFIC_PLAIN_TEXT_DICT;
  }
}
registerComponent(AustrianGermanSpellerRule.FQCN, (...args) => new AustrianGermanSpellerRule(...args));
