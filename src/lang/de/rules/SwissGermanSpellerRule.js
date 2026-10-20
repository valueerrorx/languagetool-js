// org.languagetool.rules.de.SwissGermanSpellerRule
import { GermanSpellerRule } from './GermanSpellerRule.js';
import { CachingWordListLoader } from '../../../core/rules/spelling/CachingWordListLoader.js';
import { registerComponent } from '../../../core/language/components.js';

const LANGUAGE_SPECIFIC_PLAIN_TEXT_DICT = 'de/hunspell/spelling-de-CH.txt'; // Java: SwissGermanSpellerRule#LANGUAGE_SPECIFIC_PLAIN_TEXT_DICT

// Java: SwissGermanSpellerRule
export class SwissGermanSpellerRule extends GermanSpellerRule {
  static FQCN = 'org.languagetool.rules.de.SwissGermanSpellerRule';

  // Java: SwissGermanSpellerRule(ResourceBundle,German) / (ResourceBundle,German,UserConfig,LanguageModel)
  constructor(messages, language, userConfig = null, lm = null) {
    super(messages, language, userConfig, LANGUAGE_SPECIFIC_PLAIN_TEXT_DICT, [], lm);
    this.variantWordListLoader = new CachingWordListLoader(); // Java: own private wordListLoader field (the parent keeps its own)
  }

  // Java: SwissGermanSpellerRule#getId()
  getId() {
    return 'SWISS_GERMAN_SPELLER_RULE';
  }

  // Java: SwissGermanSpellerRule#init()
  init() {
    super.init();
    for (const ignoreWord of this.variantWordListLoader.loadWords('/de/hunspell/spelling-de-CH.txt')) {
      this.addIgnoreWords(ignoreWord);
    }
  }

  // Java: SwissGermanSpellerRule#getLanguageVariantSpellingFileName()
  getLanguageVariantSpellingFileName() {
    return LANGUAGE_SPECIFIC_PLAIN_TEXT_DICT;
  }
}
registerComponent(SwissGermanSpellerRule.FQCN, (...args) => new SwissGermanSpellerRule(...args));
