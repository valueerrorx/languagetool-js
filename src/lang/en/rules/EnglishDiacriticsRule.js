// org.languagetool.rules.en.EnglishDiacriticsRule
import { AbstractSimpleReplaceRule2 } from '../../../core/rules/AbstractSimpleReplaceRule2.js';
import { Categories } from '../../../core/rules/model/Category.js';
import { ITSIssueType } from '../../../core/rules/model/ITSIssueType.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { Locale } from '../../../lib/java/Locale.js';
import { getUrl } from '../../../core/Tools.js';
import { English } from '../language/English.js';

const FILE_NAME = '/en/diacritics.txt';
const EN_LOCALE = new Locale('en'); // locale used on case-conversion

// Java: EnglishDiacriticsRule
export class EnglishDiacriticsRule extends AbstractSimpleReplaceRule2 {
  static FQCN = 'org.languagetool.rules.en.EnglishDiacriticsRule';
  static EN_DIACRITICS_REPLACE = 'EN_DIACRITICS_REPLACE_ORTHOGRAPHY';

  // Java: EnglishDiacriticsRule#getFileNames()
  getFileNames() {
    return [FILE_NAME];
  }

  // Java: EnglishDiacriticsRule(ResourceBundle)
  constructor(messages) {
    super(messages, new English());
    this.useSubRuleSpecificIds();
    this.setCategory(Categories.TYPOS.getCategory(messages));
    this.setLocQualityIssueType(ITSIssueType.Misspelling);
    this.addExamplePair(Example.wrong('<marker>blase</marker>'),
      Example.fixed('<marker>blasé</marker>'));
  }

  // Java: EnglishDiacriticsRule#getId()
  getId() {
    return EnglishDiacriticsRule.EN_DIACRITICS_REPLACE;
  }

  // Java: EnglishDiacriticsRule#getDescription()
  getDescription() {
    return "Suggest diacritics for '$match'";
  }

  // Java: EnglishDiacriticsRule#getShort()
  getShort() {
    return 'The original word has a diacritic';
  }

  // Java: EnglishDiacriticsRule#getMessage()
  getMessage() {
    return "'$match' is an imported foreign name or expression, which originally has a diacritic.";
  }

  // Java: EnglishDiacriticsRule#getSuggestionsSeparator()
  getSuggestionsSeparator() {
    return ' or ';
  }

  // Java: EnglishDiacriticsRule#getUrl()
  getUrl() {
    return getUrl('https://en.wikipedia.org/wiki/English_terms_with_diacritical_marks');
  }

  // Java: EnglishDiacriticsRule#getLocale()
  getLocale() {
    return EN_LOCALE;
  }
}
