// org.languagetool.rules.en.SimpleReplaceProfanityRule
import { AbstractSimpleReplaceRule2 } from '../../../core/rules/AbstractSimpleReplaceRule2.js';
import { Categories } from '../../../core/rules/model/Category.js';
import { ITSIssueType } from '../../../core/rules/model/ITSIssueType.js';
import { Tag } from '../../../core/rules/model/Tag.js';
import { Locale } from '../../../lib/java/Locale.js';
import { getUrl } from '../../../core/Tools.js';

const EN_LOCALE = new Locale('EN');

// Java: SimpleReplaceProfanityRule
export class SimpleReplaceProfanityRule extends AbstractSimpleReplaceRule2 {
  static FQCN = 'org.languagetool.rules.en.SimpleReplaceProfanityRule';

  // Java: SimpleReplaceProfanityRule(ResourceBundle,Language)
  constructor(messages, language) {
    super(messages, language);
    // useSubRuleSpecificIds();
    this.setLocQualityIssueType(ITSIssueType.Style); // needs ITS issue to be 'Style' in order to get purple underline + lower prio
    this.setCategory(Categories.STYLE.getCategory(messages));
    this.setUrl(getUrl('https://en.wiktionary.org/wiki/Category:English_offensive_terms'));
    this.setTags([Tag.picky]);
    this.setRuleHasSuggestions(false);
  }

  // Java: SimpleReplaceProfanityRule#getFileNames()
  getFileNames() {
    return ['/en/replace_profanity.txt'];
  }

  // Java: SimpleReplaceProfanityRule#getId()
  getId() {
    return 'PROFANITY';
  }

  // Java: SimpleReplaceProfanityRule#getDescription()
  getDescription() {
    return 'Profanity';
  }

  // Java: SimpleReplaceProfanityRule#getShort()
  getShort() {
    return 'Profanity';
  }

  // Java: SimpleReplaceProfanityRule#getMessage()
  getMessage() {
    return 'This expression can be considered offensive.';
  }

  // Java: SimpleReplaceProfanityRule#getLocale()
  getLocale() {
    return EN_LOCALE;
  }
}
