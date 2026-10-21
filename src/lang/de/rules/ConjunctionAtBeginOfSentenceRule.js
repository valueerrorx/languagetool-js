// org.languagetool.rules.de.ConjunctionAtBeginOfSentenceRule
import { d2i } from '../../../lib/java/casts.js';
import { AbstractStatisticSentenceStyleRule } from '../../../core/rules/AbstractStatisticSentenceStyleRule.js';

const DEFAULT_MIN_PERCENT = 10;

// Java: ConjunctionAtBeginOfSentenceRule#isConjunction(AnalyzedTokenReadings) (word is a conjunction)
function isConjunction(token) {
  return (token.hasPosTagStartingWith('KON'));
}

// Java: ConjunctionAtBeginOfSentenceRule#isComma(AnalyzedTokenReadings)
function isComma(token) {
  return (',' === token.getToken());
}

// Java: ConjunctionAtBeginOfSentenceRule
export class ConjunctionAtBeginOfSentenceRule extends AbstractStatisticSentenceStyleRule {
  static FQCN = 'org.languagetool.rules.de.ConjunctionAtBeginOfSentenceRule';

  // Java: ConjunctionAtBeginOfSentenceRule(ResourceBundle,Language,UserConfig)
  constructor(messages, lang, userConfig) {
    super(messages, lang, userConfig, DEFAULT_MIN_PERCENT);
    this.sentenceMessage = null;
  }

  // Java: ConjunctionAtBeginOfSentenceRule#conditionFulfilled(List)
  conditionFulfilled(sentence) {
    if (sentence.length < 3) {
      return null;
    }
    let token = null;
    let num = 0;
    if (this.isOpeningQuote(sentence[0])) {
      num++;
    }
    if (isConjunction(sentence[num])) {
      token = sentence[num];
    }
    if (token === null || token.getToken() === 'Wie' || token.getToken() === 'Seit' || token.getToken() === 'Allerdings'
        || (token.getToken() === 'Aber' && sentence[num + 1].getToken() === 'auch')) {
      return null;
    }
    if (token.getToken() === 'Um') {
      for (let i = 1; i < sentence.length; i++) {
        if (isComma(sentence[i]) || sentence[i].getToken() === 'herum') {
          return null;
        }
      }
      return token;
    }
    if (!token.hasPosTagStartingWith('KON:UNT') || token.getToken() === 'Sondern'
        || (token.getToken() === 'Auch' && sentence[num + 1].getToken() === 'wenn')) {
      if (token.getToken() === 'Entweder') {
        for (let i = 1; i < sentence.length; i++) {
          if (sentence[i].getToken() === 'oder') {
            return null;
          }
        }
      } else if (token.getToken() === 'Sowohl') {
        for (let i = 1; i < sentence.length - 1; i++) {
          if (sentence[i].getToken() === 'als' && sentence[i + 1].getToken() === 'auch') {
            return null;
          }
        }
      } else if (token.getToken() === 'Weder') {
        for (let i = 1; i < sentence.length; i++) {
          if (sentence[i].getToken() === 'noch') {
            return null;
          }
        }
      } else {
        if (sentence[sentence.length - 1].getToken() === '?') {
          return null;
        }
        return token;
      }
    }
    for (let i = 2; i < sentence.length; i++) {
      if (isComma(sentence[i])) {
        return null;
      }
    }
    return token;
  }

  // Java: ConjunctionAtBeginOfSentenceRule#excludeDirectSpeech()
  excludeDirectSpeech() {
    return true;
  }

  // Java: ConjunctionAtBeginOfSentenceRule#getLimitMessage(int,double)
  getLimitMessage(limit, percent) {
    if (limit === 0) {
      return 'Eine Konjunktion sollte nur in Ausnahmefällen am Satzanfang verwendet werden. Formulieren Sie den Satz um, falls möglich.';
    }
    return 'Mehr als ' + limit + '% Sätze beginnen mit einer Konjunktion {' + d2i(percent + 0.5) + '%} gefunden. Formulieren Sie den Satz um, falls möglich.';
  }

  // Java: ConjunctionAtBeginOfSentenceRule#getId()
  getId() {
    return 'SENTENCE_BEGINNING_WITH_CONJUNCTION_DE';
  }

  // Java: ConjunctionAtBeginOfSentenceRule#getDescription()
  getDescription() {
    return 'Statistische Stilanalyse: Sätze beginnend mit Konjunktion';
  }

  // Java: ConjunctionAtBeginOfSentenceRule#getConfigureText()
  getConfigureText() {
    return 'Anzeigen wenn mehr als ...% Sätze eines Kapitels mit einer Konjunktion beginnen:';
  }
}
