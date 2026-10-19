// org.languagetool.rules.en.ContractionSpellingRule
import { AbstractSimpleReplaceRule } from '../../../core/rules/AbstractSimpleReplaceRule.js';
import { Categories } from '../../../core/rules/model/Category.js';
import { ITSIssueType } from '../../../core/rules/model/ITSIssueType.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { Locale } from '../../../lib/java/Locale.js';
import { getUrl } from '../../../core/Tools.js';

let wrongWords = null; // Java: static wrongWords = loadFromPath("/en/contractions.txt")
const EN_LOCALE = new Locale('en');

// Java: ContractionSpellingRule
export class ContractionSpellingRule extends AbstractSimpleReplaceRule {
  static FQCN = 'org.languagetool.rules.en.ContractionSpellingRule';
  static CONTRACTION_SPELLING_RULE = 'EN_CONTRACTION_SPELLING';

  // Java: ContractionSpellingRule#getWrongWords()
  getWrongWords() {
    if (wrongWords === null) wrongWords = AbstractSimpleReplaceRule.loadFromPath('/en/contractions.txt');
    return wrongWords;
  }

  // Java: ContractionSpellingRule(ResourceBundle,Language)
  constructor(messages, language) {
    super(messages, language);
    ContractionSpellingRule.prototype.getWrongWords.call(this); // Java: static initializer runs at class load
    super.setCategory(Categories.TYPOS.getCategory(messages));
    this.setLocQualityIssueType(ITSIssueType.Misspelling);
    this.addExamplePair(Example.wrong('We <marker>havent</marker> earned anything.'),
      Example.fixed("We <marker>haven't</marker> earned anything."));
    this.setUrl(getUrl('https://languagetool.org/insights/post/grammar-contractions/'));
    super.setCheckLemmas(false);
  }

  // Java: ContractionSpellingRule#getId()
  getId() {
    return ContractionSpellingRule.CONTRACTION_SPELLING_RULE;
  }

  // Java: ContractionSpellingRule#getDescription()
  getDescription() {
    return 'Spelling of English contractions';
  }

  // Java: ContractionSpellingRule#getShort()
  getShort() {
    return 'Spelling mistake';
  }

  // Java: ContractionSpellingRule#getMessage(String,List)
  getMessage() {
    return 'Possible spelling mistake found.';
  }

  // Java: ContractionSpellingRule#isCaseSensitive()
  isCaseSensitive() {
    return true;
  }

  // Java: ContractionSpellingRule#getLocale()
  getLocale() {
    return EN_LOCALE;
  }
}
