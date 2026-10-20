// org.languagetool.rules.en.StyleTooOftenUsedNounRule
import { AbstractStyleTooOftenUsedWordRule } from '../../../core/rules/AbstractStyleTooOftenUsedWordRule.js';

const DEFAULT_MIN_PERCENT = 5;

// Java: StyleTooOftenUsedNounRule
export class StyleTooOftenUsedNounRule extends AbstractStyleTooOftenUsedWordRule {
  static FQCN = 'org.languagetool.rules.en.StyleTooOftenUsedNounRule';

  // Java: StyleTooOftenUsedNounRule(ResourceBundle,Language,UserConfig)
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

  // Java: StyleTooOftenUsedNounRule#getLimitMessage(int)
  getLimitMessage(limit) {
    return 'The noun is used more than ' + limit + '% times of all nouns. '
      + 'It may be better to replace it with a synonym.';
  }

  // Java: StyleTooOftenUsedNounRule#getId()
  getId() {
    return 'TOO_OFTEN_USED_NOUN_EN';
  }

  // Java: StyleTooOftenUsedNounRule#getDescription()
  getDescription() {
    return 'Statistical Style Analysis: Overused Noun';
  }

  // Java: StyleTooOftenUsedNounRule#getConfigureText()
  getConfigureText() {
    return 'Show when a noun is used more often than ...% of all nouns:';
  }

  // Java: StyleTooOftenUsedNounRule#isToCountedWord(AnalyzedTokenReadings)
  isToCountedWord(token) {
    return token.hasPosTagStartingWith('NN');
  }

  // Java: StyleTooOftenUsedNounRule#isException(AnalyzedTokenReadings[],int)
  isException(tokens, n) {
    const token = tokens[n];
    return token.hasPosTagStartingWith('NNP') || token.hasPosTagStartingWith('IN') || token.hasPosTagStartingWith('JJ') || token.hasPosTagStartingWith('RB') || token.hasPosTagStartingWith('VB');
  }

  // Java: StyleTooOftenUsedNounRule#toAddedLemma(AnalyzedTokenReadings)
  toAddedLemma(token) {
    return this.getLemmaForPosTagStartsWith('NN', token);
  }
}
