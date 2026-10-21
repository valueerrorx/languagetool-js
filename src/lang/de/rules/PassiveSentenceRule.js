// org.languagetool.rules.de.PassiveSentenceRule
import { d2i } from '../../../lib/java/casts.js';
import { AbstractStatisticSentenceStyleRule } from '../../../core/rules/AbstractStatisticSentenceStyleRule.js';

const DEFAULT_MIN_PERCENT = 8;

// Java: PassiveSentenceRule
export class PassiveSentenceRule extends AbstractStatisticSentenceStyleRule {
  static FQCN = 'org.languagetool.rules.de.PassiveSentenceRule';

  // Java: PassiveSentenceRule(ResourceBundle,Language,UserConfig)
  constructor(messages, lang, userConfig) {
    super(messages, lang, userConfig, DEFAULT_MIN_PERCENT);
    this.sentenceMessage = null;
  }

  // Java: PassiveSentenceRule#conditionFulfilled(List)
  conditionFulfilled(sentence) {
    for (let i = 0; i < sentence.length; i++) {
      if (sentence[i].hasLemma('werden')) {
        const token = sentence[i];
        for (i++; i < sentence.length; i++) {
          if (sentence[i].hasPosTagStartingWith('VER:PA2:')) {
            return token;
          } else if (this.isMark(sentence[i])) {
            return null;
          }
        }
      } else if (sentence[i].hasPosTagStartingWith('VER:PA2:')) {
        for (i++; i < sentence.length; i++) {
          if (sentence[i].hasLemma('werden')) {
            return sentence[i];
          } else if (this.isMark(sentence[i])) {
            return null;
          }
        }
      }
    }
    return null;
  }

  // Java: PassiveSentenceRule#excludeDirectSpeech()
  excludeDirectSpeech() {
    return true;
  }

  // Java: PassiveSentenceRule#getLimitMessage(int,double)
  getLimitMessage(limit, percent) {
    if (limit === 0) {
      return 'Passivsatz: Aktiv formulierte Sätze sprechen im Regelfall den Leser stärker an.';
    }
    return 'Mehr als ' + limit + '% Passivsätze {' + d2i(percent + 0.5) + '%} gefunden. Aktiv formulierte Sätze sprechen im Regelfall den Leser stärker an.';
  }

  // Java: PassiveSentenceRule#getId()
  getId() {
    return 'PASSIVE_SENTENCE_DE';
  }

  // Java: PassiveSentenceRule#getDescription()
  getDescription() {
    return 'Statistische Stilanalyse: Passivsätze';
  }

  // Java: PassiveSentenceRule#getConfigureText()
  getConfigureText() {
    return 'Anzeigen wenn mehr als ...% Sätze eines Kapitels Passivsätze sind:';
  }
}
