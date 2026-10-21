// org.languagetool.rules.de.StyleTooOftenUsedNounRule
import { AbstractStyleTooOftenUsedWordRule } from '../../../core/rules/AbstractStyleTooOftenUsedWordRule.js';

const DEFAULT_MIN_PERCENT = 5;

// Java: StyleTooOftenUsedNounRule
export class StyleTooOftenUsedNounRule extends AbstractStyleTooOftenUsedWordRule {
  static FQCN = 'org.languagetool.rules.de.StyleTooOftenUsedNounRule';

  // Java: StyleTooOftenUsedNounRule(ResourceBundle,Language,UserConfig)
  constructor(messages, lang, userConfig) {
    super(messages, lang, userConfig, DEFAULT_MIN_PERCENT);
    if (userConfig !== null && userConfig !== undefined) {
      const linguServices = userConfig.getLinguServices();
      if (linguServices !== null && linguServices !== undefined) {
        linguServices.setThesaurusRelevantRule(this);
      }
    }
  }

  // Java: StyleTooOftenUsedNounRule#getLimitMessage(int)
  getLimitMessage(limit) {
    return 'Das Substantiv wird häufiger verwendet als ' + limit + '% aller Substantive. ' +
           'Möglicherweise ist es besser es durch ein Synonym zu ersetzen.';
  }

  // Java: StyleTooOftenUsedNounRule#getId()
  getId() {
    return 'TOO_OFTEN_USED_NOUN_DE';
  }

  // Java: StyleTooOftenUsedNounRule#getDescription()
  getDescription() {
    return 'Statistische Stilanalyse: Zu häufig genutztes Substantiv';
  }

  // Java: StyleTooOftenUsedNounRule#getConfigureText()
  getConfigureText() {
    return 'Anzeigen wenn ein Substantiv häufiger verwendet wird als ...% aller Substantive:';
  }

  // Java: StyleTooOftenUsedNounRule#isToCountedWord(AnalyzedTokenReadings)
  isToCountedWord(token) {
    return token.hasPosTagStartingWith('SUB:');
  }

  // Java: StyleTooOftenUsedNounRule#isException(AnalyzedTokenReadings[],int)
  isException(tokens, n) {
    const token = tokens[n];
    return token.hasPosTagStartingWith('PRO:')
        || token.getToken() === 'Ich'
        || token.getToken() === 'Aber'
        || token.getToken() === 'Ja'
        || (n < tokens.length - 1 && (token.getToken() === 'Frau' || token.getToken() === 'Herr')
            && (tokens[n + 1].hasPosTagStartingWith('EIG:') || tokens[n + 1].isPosTagUnknown()));
  }

  // Java: StyleTooOftenUsedNounRule#toAddedLemma(AnalyzedTokenReadings)
  toAddedLemma(token) {
    return this.getLemmaForPosTagStartsWith('SUB:', token);
  }
}
