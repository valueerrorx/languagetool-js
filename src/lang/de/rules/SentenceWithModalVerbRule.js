// org.languagetool.rules.de.SentenceWithModalVerbRule
import { d2i } from '../../../lib/java/casts.js';
import { AbstractStatisticSentenceStyleRule } from '../../../core/rules/AbstractStatisticSentenceStyleRule.js';

const DEFAULT_MIN_PERCENT = 18;

// Java: SentenceWithModalVerbRule#isModalVerb(AnalyzedTokenReadings)
function isModalVerb(token) {
  return (token.hasPosTagStartingWith('VER:MOD'));
}

// Java: SentenceWithModalVerbRule
export class SentenceWithModalVerbRule extends AbstractStatisticSentenceStyleRule {
  static FQCN = 'org.languagetool.rules.de.SentenceWithModalVerbRule';

  // Java: SentenceWithModalVerbRule(ResourceBundle,Language,UserConfig)
  constructor(messages, lang, userConfig) {
    super(messages, lang, userConfig, DEFAULT_MIN_PERCENT);
    this.sentenceMessage = null;
  }

  // Java: SentenceWithModalVerbRule#conditionFulfilled(List)
  conditionFulfilled(sentence) {
    for (let i = 0; i < sentence.length; i++) {
      if (isModalVerb(sentence[i])) {
        const token = sentence[i];
        for (i++; i < sentence.length; i++) {
          if (sentence[i].hasPosTagStartingWith('VER:INF')) {
            return token;
          } else if (this.isMark(sentence[i])) {
            return null;
          }
        }
      } else if (sentence[i].hasPosTagStartingWith('VER:INF')) {
        for (i++; i < sentence.length; i++) {
          if (isModalVerb(sentence[i])) {
            return sentence[i];
          } else if (this.isMark(sentence[i])) {
            return null;
          }
        }
      }
    }
    return null;
  }

  // Java: SentenceWithModalVerbRule#excludeDirectSpeech()
  excludeDirectSpeech() {
    return true;
  }

  // Java: SentenceWithModalVerbRule#getLimitMessage(int,double)
  getLimitMessage(limit, percent) {
    if (limit === 0) {
      return 'Modalverb: Modalverben blähen den Text häufig auf und sollten vermieden werden.';
    }
    return 'Mehr als ' + limit + '% Sätze mit Modalverben {' + d2i(percent + 0.5) + '%} gefunden. Modalverben blähen den Text häufig auf und sollten vermieden werden.';
  }

  // Java: SentenceWithModalVerbRule#getId()
  getId() {
    return 'SENTENCE_WITH_MODAL_VERB_DE';
  }

  // Java: SentenceWithModalVerbRule#getDescription()
  getDescription() {
    return 'Statistische Stilanalyse: Sätze mit Modalverben';
  }

  // Java: SentenceWithModalVerbRule#getConfigureText()
  getConfigureText() {
    return 'Anzeigen wenn mehr als ...% Sätze eines Kapitels Modalverben enthalten:';
  }
}
