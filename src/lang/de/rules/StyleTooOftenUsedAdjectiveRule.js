// org.languagetool.rules.de.StyleTooOftenUsedAdjectiveRule
import { AbstractStyleTooOftenUsedWordRule } from '../../../core/rules/AbstractStyleTooOftenUsedWordRule.js';

const DEFAULT_MIN_PERCENT = 5;

// Java: StyleTooOftenUsedAdjectiveRule
export class StyleTooOftenUsedAdjectiveRule extends AbstractStyleTooOftenUsedWordRule {
  static FQCN = 'org.languagetool.rules.de.StyleTooOftenUsedAdjectiveRule';

  // Java: StyleTooOftenUsedAdjectiveRule(ResourceBundle,Language,UserConfig)
  constructor(messages, lang, userConfig) {
    super(messages, lang, userConfig, DEFAULT_MIN_PERCENT);
    if (userConfig !== null && userConfig !== undefined) {
      const linguServices = userConfig.getLinguServices();
      if (linguServices !== null && linguServices !== undefined) {
        linguServices.setThesaurusRelevantRule(this);
      }
    }
  }

  // Java: StyleTooOftenUsedAdjectiveRule#getLimitMessage(int)
  getLimitMessage(limit) {
    return 'Das Adjektiv wird häufiger verwendet als ' + limit + '% aller Adjektive . ' +
           'Möglicherweise ist es besser es durch ein Synonym zu ersetzen.';
  }

  // Java: StyleTooOftenUsedAdjectiveRule#getId()
  getId() {
    return 'TOO_OFTEN_USED_ADJECTIVE_DE';
  }

  // Java: StyleTooOftenUsedAdjectiveRule#getDescription()
  getDescription() {
    return 'Statistische Stilanalyse: Zu häufig genutztes Adjektiv';
  }

  // Java: StyleTooOftenUsedAdjectiveRule#getConfigureText()
  getConfigureText() {
    return 'Anzeigen wenn ein Adjektiv häufiger verwendet wird als ...% aller Adjektive:';
  }

  // Java: StyleTooOftenUsedAdjectiveRule#isToCountedWord(AnalyzedTokenReadings)
  isToCountedWord(token) {
    return token.hasPosTagStartingWith('ADJ:');
  }

  // Java: StyleTooOftenUsedAdjectiveRule#isException(AnalyzedTokenReadings[],int)
  isException(tokens, n) {
    const token = tokens[n];
    return token.hasPosTagStartingWith('PRO:') || token.hasPosTagStartingWith('ADV:') ||
        token.hasPosTagStartingWith('ZUS');
  }

  // Java: StyleTooOftenUsedAdjectiveRule#toAddedLemma(AnalyzedTokenReadings)
  toAddedLemma(token) {
    return this.getLemmaForPosTagStartsWith('ADJ:', token);
  }
}
