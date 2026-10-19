// org.languagetool.rules.en.EnglishPlainEnglishRule
import { AbstractSimpleReplaceRule2 } from '../../../core/rules/AbstractSimpleReplaceRule2.js';
import { Categories } from '../../../core/rules/model/Category.js';
import { ITSIssueType } from '../../../core/rules/model/ITSIssueType.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { Locale } from '../../../lib/java/Locale.js';
import { getUrl } from '../../../core/Tools.js';
import { English } from '../language/English.js';

const FILE_NAME = '/en/wordiness.txt';
const EN_LOCALE = new Locale('en'); // locale used on case-conversion

// Java: EnglishPlainEnglishRule
export class EnglishPlainEnglishRule extends AbstractSimpleReplaceRule2 {
  static FQCN = 'org.languagetool.rules.en.EnglishPlainEnglishRule';
  static EN_PLAIN_ENGLISH_REPLACE = 'EN_PLAIN_ENGLISH_REPLACE';

  // Java: EnglishPlainEnglishRule#getFileNames()
  getFileNames() {
    return [FILE_NAME];
  }

  // Java: EnglishPlainEnglishRule(ResourceBundle)
  constructor(messages) {
    super(messages, new English());
    this.setDefaultOff(); // reactivate after feature freeze
    this.setCategory(Categories.PLAIN_ENGLISH.getCategory(messages));
    this.setLocQualityIssueType(ITSIssueType.Style);
    this.addExamplePair(Example.wrong('<marker>fatal outcome</marker>'),
      Example.fixed('<marker>death</marker>'));
  }

  // Java: EnglishPlainEnglishRule#getId()
  getId() {
    return EnglishPlainEnglishRule.EN_PLAIN_ENGLISH_REPLACE;
  }

  // Java: EnglishPlainEnglishRule#getDescription()
  getDescription() {
    return '1. Wordiness (General)';
  }

  // Java: EnglishPlainEnglishRule#getShort()
  getShort() {
    return 'Wordiness';
  }

  // Java: EnglishPlainEnglishRule#getMessage()
  getMessage() {
    return "'$match' is a wordy or complex expression. In some cases, it might be preferable to use $suggestions.";
  }

  // Java: EnglishPlainEnglishRule#getSuggestionsSeparator()
  getSuggestionsSeparator() {
    return ' or ';
  }

  // Java: EnglishPlainEnglishRule#getUrl()
  getUrl() {
    return getUrl('https://en.wikipedia.org/wiki/List_of_plain_English_words_and_phrases');
  }

  // Java: EnglishPlainEnglishRule#getLocale()
  getLocale() {
    return EN_LOCALE;
  }
}
