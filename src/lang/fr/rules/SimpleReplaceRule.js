// org.languagetool.rules.fr.SimpleReplaceRule
import { AbstractSimpleReplaceRule } from '../../../core/rules/AbstractSimpleReplaceRule.js';
import { Categories } from '../../../core/rules/model/Category.js';
import { ITSIssueType } from '../../../core/rules/model/ITSIssueType.js';
import { Locale } from '../../../lib/java/Locale.js';

let wrongWords = null; // Java: static wrongWords = loadFromPath("/fr/replace.txt", "/fr/replace_custom.txt")
const FR_LOCALE = new Locale('FR');

// Java: SimpleReplaceRule
export class SimpleReplaceRule extends AbstractSimpleReplaceRule {
  static FQCN = 'org.languagetool.rules.fr.SimpleReplaceRule';

  // Java: SimpleReplaceRule#getWrongWords()
  getWrongWords() {
    if (wrongWords === null) wrongWords = AbstractSimpleReplaceRule.loadFromPath('/fr/replace.txt', '/fr/replace_custom.txt');
    return wrongWords;
  }

  // Java: SimpleReplaceRule(ResourceBundle,Language)
  constructor(messages, language) {
    super(messages, language);
    SimpleReplaceRule.prototype.getWrongWords.call(this); // Java: static initializer runs at class load
    super.setCategory(Categories.TYPOS.getCategory(messages));
    super.setLocQualityIssueType(ITSIssueType.Misspelling);
    this.setIgnoreTaggedWords();
    this.setCheckLemmas(false);
    super.useSubRuleSpecificIds();
  }

  // Java: SimpleReplaceRule#getId()
  getId() {
    return 'FR_SIMPLE_REPLACE_SIMPLE';
  }

  // Java: SimpleReplaceRule#getDescription()
  getDescription() {
    return 'Mot incorrect : $match';
  }

  // Java: SimpleReplaceRule#getShort()
  getShort() {
    return 'Mot incorrect';
  }

  // Java: SimpleReplaceRule#getMessage(String,List)
  getMessage(tokenStr, replacements) {
    if (replacements.length > 0) {
      return 'Vouliez-vous dire « ' + replacements[0] + ' » ?';
    }
    return this.getShort();
  }

  // Java: SimpleReplaceRule#isCaseSensitive()
  isCaseSensitive() {
    return false;
  }

  // Java: SimpleReplaceRule#getLocale()
  getLocale() {
    return FR_LOCALE;
  }
}
