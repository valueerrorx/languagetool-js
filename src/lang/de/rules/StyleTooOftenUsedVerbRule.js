// org.languagetool.rules.de.StyleTooOftenUsedVerbRule
import { AbstractStyleTooOftenUsedWordRule } from '../../../core/rules/AbstractStyleTooOftenUsedWordRule.js';

const DEFAULT_MIN_PERCENT = 5;

// Java: StyleTooOftenUsedVerbRule
export class StyleTooOftenUsedVerbRule extends AbstractStyleTooOftenUsedWordRule {
  static FQCN = 'org.languagetool.rules.de.StyleTooOftenUsedVerbRule';

  // Java: StyleTooOftenUsedVerbRule(ResourceBundle,Language,UserConfig)
  constructor(messages, lang, userConfig) {
    super(messages, lang, userConfig, DEFAULT_MIN_PERCENT);
    if (userConfig !== null && userConfig !== undefined) {
      const linguServices = userConfig.getLinguServices();
      if (linguServices !== null && linguServices !== undefined) {
        linguServices.setThesaurusRelevantRule(this);
      }
    }
  }

  // Java: StyleTooOftenUsedVerbRule#getLimitMessage(int)
  getLimitMessage(limit) {
    return 'Das Verb wird häufiger verwendet als ' + limit + '% aller Verben. ' +
           'Möglicherweise ist es besser es durch ein Synonym zu ersetzen.';
  }

  // Java: StyleTooOftenUsedVerbRule#getId()
  getId() {
    return 'TOO_OFTEN_USED_VERB_DE';
  }

  // Java: StyleTooOftenUsedVerbRule#getDescription()
  getDescription() {
    return 'Statistische Stilanalyse: Zu häufig genutztes Verb';
  }

  // Java: StyleTooOftenUsedVerbRule#getConfigureText()
  getConfigureText() {
    return 'Anzeigen wenn ein Verb häufiger verwendet wird als ...% aller Verben:';
  }

  // Java: StyleTooOftenUsedVerbRule#isToCountedWord(AnalyzedTokenReadings)
  isToCountedWord(token) {
    return token.hasPosTagStartingWith('VER:');
  }

  // Java: StyleTooOftenUsedVerbRule#isException(AnalyzedTokenReadings[],int)
  isException(tokens, n) {
    const token = tokens[n];
    return token.hasPosTagStartingWith('VER:MOD') || token.hasPosTagStartingWith('VER:AUX') ||
        token.hasPosTagStartingWith('ART') || token.hasPosTagStartingWith('ADJ');
  }

  // Java: StyleTooOftenUsedVerbRule#toAddedLemma(AnalyzedTokenReadings)
  toAddedLemma(token) {
    return this.getLemmaForPosTagStartsWith('VER:', token);
  }
}
