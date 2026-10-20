// org.languagetool.rules.en.StyleTooOftenUsedVerbRule
import { AbstractStyleTooOftenUsedWordRule } from '../../../core/rules/AbstractStyleTooOftenUsedWordRule.js';

const DEFAULT_MIN_PERCENT = 5;

// Java: StyleTooOftenUsedVerbRule
export class StyleTooOftenUsedVerbRule extends AbstractStyleTooOftenUsedWordRule {
  static FQCN = 'org.languagetool.rules.en.StyleTooOftenUsedVerbRule';

  // Java: StyleTooOftenUsedVerbRule(ResourceBundle,Language,UserConfig)
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

  // Java: StyleTooOftenUsedVerbRule#getLimitMessage(int)
  getLimitMessage(limit) {
    return 'The verb is used more than ' + limit + '% times of all verbs. '
      + 'It may be better to replace it with a synonym.';
  }

  // Java: StyleTooOftenUsedVerbRule#getId()
  getId() {
    return 'TOO_OFTEN_USED_VERB_EN';
  }

  // Java: StyleTooOftenUsedVerbRule#getDescription()
  getDescription() {
    return 'Statistical Style Analysis: Overused Verb';
  }

  // Java: StyleTooOftenUsedVerbRule#getConfigureText()
  getConfigureText() {
    return 'Show when a verb is used more often than ...% of all verbs:';
  }

  // Java: StyleTooOftenUsedVerbRule#isToCountedWord(AnalyzedTokenReadings)
  isToCountedWord(token) {
    return token.hasPosTagStartingWith('VB');
  }

  // Java: StyleTooOftenUsedVerbRule#isException(AnalyzedTokenReadings[],int)
  isException(tokens, n) {
    const token = tokens[n];
    return token.hasAnyLemma('be', 'have', 'do') || token.hasPosTagStartingWith('IN') || token.hasPosTagStartingWith('NN');
  }

  // Java: StyleTooOftenUsedVerbRule#toAddedLemma(AnalyzedTokenReadings)
  toAddedLemma(token) {
    return this.getLemmaForPosTagStartsWith('VB', token);
  }
}
