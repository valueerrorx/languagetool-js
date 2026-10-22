// Java: org.languagetool.rules.es.SimpleReplaceRule
import { AbstractSimpleReplaceRule } from '../../../core/rules/AbstractSimpleReplaceRule.js';
import { Categories } from '../../../core/rules/model/Category.js';
import { ITSIssueType } from '../../../core/rules/model/ITSIssueType.js';
import { Locale } from '../../../lib/java/Locale.js';

let wrongWords = null; // Java: static wrongWords = loadFromPath("/es/replace.txt", "/es/replace_custom.txt")
const ES_LOCALE = new Locale('ES');

// Java: SimpleReplaceRule (es)
export class SimpleReplaceRule extends AbstractSimpleReplaceRule {
  static FQCN = 'org.languagetool.rules.es.SimpleReplaceRule';

  // Java: SimpleReplaceRule#getWrongWords()
  getWrongWords() {
    if (wrongWords === null) wrongWords = AbstractSimpleReplaceRule.loadFromPath('/es/replace.txt', '/es/replace_custom.txt');
    return wrongWords;
  }

  // Java: SimpleReplaceRule(ResourceBundle,Language)
  constructor(messages, language) {
    super(messages, language);
    this.getWrongWords(); // Java: static initializer runs at class load
    super.setCategory(Categories.TYPOS.getCategory(messages));
    super.setLocQualityIssueType(ITSIssueType.Misspelling);
    this.setIgnoreTaggedWords();
    this.setCheckLemmas(false);
    super.useSubRuleSpecificIds();
  }

  // Java: SimpleReplaceRule#getId()
  getId() {
    return 'ES_SIMPLE_REPLACE_SIMPLE';
  }

  // Java: SimpleReplaceRule#getDescription()
  getDescription() {
    return 'Palabra incorrecta: $match';
  }

  // Java: SimpleReplaceRule#getShort()
  getShort() {
    return 'Palabra incorrecta';
  }

  // Java: SimpleReplaceRule#getMessage(String,List)
  getMessage(tokenStr, replacements) {
    if (replacements.length > 0) {
      return '¿Quería decir «' + replacements[0] + '»?';
    }
    return this.getShort();
  }

  // Java: SimpleReplaceRule#isCaseSensitive()
  isCaseSensitive() {
    return false;
  }

  // Java: SimpleReplaceRule#getLocale()
  getLocale() {
    return ES_LOCALE;
  }
}
