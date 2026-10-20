// org.languagetool.rules.en.EnglishRedundancyRule
import { AbstractSimpleReplaceRule2 } from '../../../core/rules/AbstractSimpleReplaceRule2.js';
import { Categories } from '../../../core/rules/model/Category.js';
import { ITSIssueType } from '../../../core/rules/model/ITSIssueType.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { Locale } from '../../../lib/java/Locale.js';
import { getUrl } from '../../../core/Tools.js';
import { English } from '../language/English.js';

const FILE_NAME = '/en/redundancies.txt';
const EN_LOCALE = new Locale('en'); // locale used on case-conversion

// Java: EnglishRedundancyRule
export class EnglishRedundancyRule extends AbstractSimpleReplaceRule2 {
  static FQCN = 'org.languagetool.rules.en.EnglishRedundancyRule';
  static EN_REDUNDANCY_REPLACE = 'EN_REDUNDANCY_REPLACE';

  // Java: EnglishRedundancyRule#getFileNames()
  getFileNames() {
    return [FILE_NAME];
  }

  // Java: EnglishRedundancyRule(ResourceBundle)
  constructor(messages) {
    super(messages, new English());
    this.setCategory(Categories.REDUNDANCY.getCategory(messages));
    this.setLocQualityIssueType(ITSIssueType.Style);
    this.setDefaultOff(); // see #1997
    this.addExamplePair(Example.wrong('<marker>tuna fish</marker>'),
      Example.fixed('<marker>tuna</marker>'));
  }

  // Java: EnglishRedundancyRule#getId()
  getId() {
    return EnglishRedundancyRule.EN_REDUNDANCY_REPLACE;
  }

  // Java: EnglishRedundancyRule#getDescription()
  getDescription() {
    return '1. Redundancy (General)';
  }

  // Java: EnglishRedundancyRule#getShort()
  getShort() {
    return 'Redundancy';
  }

  // Java: EnglishRedundancyRule#getMessage()
  getMessage() {
    return "'$match' is a redundancy. In some cases, it might be preferable to use $suggestions";
  }

  // Java: EnglishRedundancyRule#getSuggestionsSeparator()
  getSuggestionsSeparator() {
    return ' or ';
  }

  // Java: EnglishRedundancyRule#getUrl()
  getUrl() {
    return getUrl('https://en.wikipedia.org/wiki/Redundancy_(linguistics)');
  }

  // Java: EnglishRedundancyRule#getLocale()
  getLocale() {
    return EN_LOCALE;
  }
}
