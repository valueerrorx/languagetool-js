// org.languagetool.rules.en.EnglishUnpairedQuotesRule
import { GenericUnpairedQuotesRule } from '../../../core/rules/GenericUnpairedQuotesRule.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { getUrl } from '../../../core/Tools.js';

const EN_START_SYMBOLS = ['“', '"', "'", '‘'];
const EN_END_SYMBOLS = ['”', '"', "'", '’'];

// Java: EnglishUnpairedQuotesRule
export class EnglishUnpairedQuotesRule extends GenericUnpairedQuotesRule {
  static FQCN = 'org.languagetool.rules.en.EnglishUnpairedQuotesRule';

  // Java: EnglishUnpairedQuotesRule(ResourceBundle,Language)
  constructor(messages) {
    super(messages, EN_START_SYMBOLS, EN_END_SYMBOLS);
    this.setUrl(getUrl('https://languagetool.org/insights/post/punctuation-guide/#what-are-quotation-marks'));
    this.addExamplePair(Example.wrong('"I\'m over here,<marker></marker> she said.'),
      Example.fixed('"I\'m over here,<marker>"</marker> she said.'));
  }

  // Java: EnglishUnpairedQuotesRule#getId()
  getId() {
    return 'EN_UNPAIRED_QUOTES';
  }

  // Java: EnglishUnpairedQuotesRule#isNotBeginningApostrophe(AnalyzedTokenReadings[],int)
  isNotBeginningApostrophe(tokens, i) {
    if (tokens[i].hasPosTag('_apostrophe_contraction_') || tokens[i].hasPosTag('POS') || tokens[i].hasPosTag('NNP')) {
      return false;
    }
    return true;
  }

  // Java: EnglishUnpairedQuotesRule#isNotEndingApostrophe(AnalyzedTokenReadings[],int)
  isNotEndingApostrophe(tokens, i) {
    if (tokens[i].hasPosTag('_apostrophe_contraction_') || tokens[i].hasPosTag('POS') || tokens[i].hasPosTag('NNP')) {
      return false;
    }
    return true;
  }
}
