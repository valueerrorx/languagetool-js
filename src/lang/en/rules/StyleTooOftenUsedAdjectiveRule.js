// org.languagetool.rules.en.StyleTooOftenUsedAdjectiveRule
import { AbstractStyleTooOftenUsedWordRule } from '../../../core/rules/AbstractStyleTooOftenUsedWordRule.js';

const DEFAULT_MIN_PERCENT = 5;

// Java: StyleTooOftenUsedAdjectiveRule
export class StyleTooOftenUsedAdjectiveRule extends AbstractStyleTooOftenUsedWordRule {
  static FQCN = 'org.languagetool.rules.en.StyleTooOftenUsedAdjectiveRule';

  // Java: StyleTooOftenUsedAdjectiveRule(ResourceBundle,Language,UserConfig)
  constructor(messages, lang, userConfig) {
    super(messages, lang, userConfig, DEFAULT_MIN_PERCENT);
    this.sentenceMessage = null;
    if (userConfig !== null && userConfig !== undefined) {
      const linguServices = userConfig.getLinguServices();
      if (linguServices !== null && linguServices !== undefined) {
        linguServices.setThesaurusRelevantRule(this);
      }
    }
  }

  // Java: StyleTooOftenUsedAdjectiveRule#getLimitMessage(int)
  getLimitMessage(limit) {
    return 'The adjective is used more than ' + limit + '% times of all adjectives. '
      + 'It may be better to replace it with a synonym.';
  }

  // Java: StyleTooOftenUsedAdjectiveRule#getId()
  getId() {
    return 'TOO_OFTEN_USED_ADJECTIVE_EN';
  }

  // Java: StyleTooOftenUsedAdjectiveRule#getDescription()
  getDescription() {
    return 'Statistical Style Analysis: Overused Adjective';
  }

  // Java: StyleTooOftenUsedAdjectiveRule#getConfigureText()
  getConfigureText() {
    return 'Show when a adjective is used more often than ...% of all adjectives:';
  }

  // Java: StyleTooOftenUsedAdjectiveRule#isToCountedWord(AnalyzedTokenReadings)
  isToCountedWord(token) {
    return token.hasPosTagStartingWith('JJ');
  }

  // Java: StyleTooOftenUsedAdjectiveRule#isException(AnalyzedTokenReadings[],int)
  isException(tokens, n) {
    const token = tokens[n];
    return token.hasPosTagStartingWith('RB') || token.hasPosTagStartingWith('IN') || token.hasPosTagStartingWith('CD') || token.hasPosTagStartingWith('DT') || token.hasPosTagStartingWith('NN');
  }

  // Java: StyleTooOftenUsedAdjectiveRule#toAddedLemma(AnalyzedTokenReadings)
  toAddedLemma(token) {
    return this.getLemmaForPosTagStartsWith('JJ', token);
  }
}
