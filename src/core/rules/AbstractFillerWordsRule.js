// org.languagetool.rules.AbstractFillerWordsRule
import { AbstractStatisticStyleRule } from './AbstractStatisticStyleRule.js';
import { RuleOption } from './model/RuleOption.js';

const DEFAULT_MIN_PERCENT = 8;

// Java: AbstractFillerWordsRule (abstract: isFillerWord(String)); the private field minPercent of the subclass is fillerMinPercent here (the super class has its own minPercent)
export class AbstractFillerWordsRule extends AbstractStatisticStyleRule {
  static FQCN = 'org.languagetool.rules.AbstractFillerWordsRule';
  static RULE_ID = 'FILLER_WORDS';

  // Java: AbstractFillerWordsRule(ResourceBundle,Language,UserConfig[,boolean]); defaultActive is unused in Java
  constructor(messages, lang, userConfig) {
    super(messages, lang, userConfig, DEFAULT_MIN_PERCENT);
    this.fillerMinPercent = DEFAULT_MIN_PERCENT;
  }

  // Java: AbstractFillerWordsRule#getDescription()
  getDescription() {
    return this.messages.getString('filler_words_rule_desc');
  }

  // Java: AbstractFillerWordsRule#getId()
  getId() {
    return AbstractFillerWordsRule.RULE_ID;
  }

  // Java: AbstractFillerWordsRule#getRuleOptions()
  getRuleOptions() {
    return [new RuleOption(this.fillerMinPercent, this.messages.getString('filler_words_rule_opt_text'), 0, 100)];
  }

  // Java: AbstractFillerWordsRule#getMessage()
  getMessage() {
    return this.messages.getString('filler_words_rule_msg');
  }

  // Java: AbstractFillerWordsRule#isException(AnalyzedTokenReadings[],int)
  isException() {
    return false;
  }

  // Java: AbstractFillerWordsRule#conditionFulfilled(AnalyzedTokenReadings[],int)
  conditionFulfilled(tokens, nAnalysedToken) {
    if (this.isFillerWord(tokens[nAnalysedToken].getToken()) && !this.isException(tokens, nAnalysedToken)) {
      return nAnalysedToken;
    }
    return -1;
  }

  // Java: AbstractFillerWordsRule#sentenceConditionFulfilled(AnalyzedTokenReadings[],int)
  sentenceConditionFulfilled() {
    return false;
  }

  // Java: AbstractFillerWordsRule#excludeDirectSpeech()
  excludeDirectSpeech() {
    return true;
  }

  // Java: AbstractFillerWordsRule#getLimitMessage(int,double)
  getLimitMessage() {
    return this.getMessage();
  }

  // Java: AbstractFillerWordsRule#getSentenceMessage()
  getSentenceMessage() {
    return null;
  }

  // Java: AbstractFillerWordsRule#getConfigurePercentText()
  getConfigurePercentText() {
    return null;
  }

  // Java: AbstractFillerWordsRule#getConfigureWithoutDirectSpeachText()
  getConfigureWithoutDirectSpeachText() {
    return null;
  }

  // Java: AbstractFillerWordsRule#minToCheckParagraph()
  minToCheckParagraph() {
    return 0;
  }
}
