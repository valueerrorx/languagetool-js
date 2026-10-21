// org.languagetool.rules.de.UnnecessaryPhraseRule
import { d2i } from '../../../lib/java/casts.js';
import { substring, toLowerCase } from '../../../lib/java/strings.js';
import { AbstractStatisticStyleRule } from '../../../core/rules/AbstractStatisticStyleRule.js';
import { Example } from '../../../core/rules/model/Examples.js';

const DEFAULT_MIN_PER_MILL = 8;

const unnecessaryPhrases = [
  ['dann', 'und', 'wann'],
  ['des', 'Ungeachtet'],
  ['ganz', 'und', 'gar'],
  ['hie', 'und', 'da'],
  ['im', 'Allgemeinen'],
  ['in', 'der', 'Tat'],
  ['in', 'diesem', 'Zusammenhang'],
  ['mehr', 'oder', 'weniger'],
  ['meines', 'Erachtens'],
  ['ohne', 'weiteres'],
  ['ohne', 'Zweifel'],
  ['samt', 'und', 'sonders'],
  ['sowohl', 'als', 'auch'],
  ['voll', 'und', 'ganz'],
  ['von', 'Neuem'],
  ['allem', 'Anschein', 'nach'],
  ['aufs', 'Neue'],
  ['ein', 'bisschen'],
  ['ein', 'wenig'],
  ['des', 'Öfteren'],
  ['bei', 'weitem'],
  ['an', 'sich'],
];

// Java: UnnecessaryPhraseRule#firstCharToLower(AnalyzedTokenReadings[],int)
function firstCharToLower(tokens, nToken) {
  const token = tokens[nToken].getToken();
  return ((nToken !== 1 || token.length < 2) ? token : toLowerCase(substring(token, 0, 1)) + substring(token, 1));
}

// Java: UnnecessaryPhraseRule#isException(AnalyzedTokenReadings[],String[])
function isException(tokens, phrase) {
  if (phrase.length === 2) {
    if (phrase[0] === 'an' && phrase[1] === 'sich') {
      for (let j = 1; j < tokens.length; j++) {
        if (tokens[j].hasLemma('drücken')) {
          return true;
        }
      }
    }
  }
  return false;
}

// Java: UnnecessaryPhraseRule
export class UnnecessaryPhraseRule extends AbstractStatisticStyleRule {
  static FQCN = 'org.languagetool.rules.de.UnnecessaryPhraseRule';

  // Java: UnnecessaryPhraseRule(ResourceBundle,Language,UserConfig)
  constructor(messages, lang, userConfig) {
    super(messages, lang, userConfig, DEFAULT_MIN_PER_MILL);
    this.addExamplePair(Example.wrong('Das ist <marker>allem Anschein nach</marker> eine Phrase.'),
      Example.fixed('Das ist eine Phrase.'));
  }

  // Java: UnnecessaryPhraseRule#denominator()
  denominator() {
    return 10000.0;
  }

  // Java: UnnecessaryPhraseRule#conditionFulfilled(AnalyzedTokenReadings[],int)
  conditionFulfilled(tokens, nAnalysedToken) {
    for (let i = 0; i < unnecessaryPhrases.length; i++) {
      let j;
      for (j = 0; j < unnecessaryPhrases[i].length && nAnalysedToken + j < tokens.length &&
          unnecessaryPhrases[i][j] === firstCharToLower(tokens, nAnalysedToken + j); j++);
      if (j === unnecessaryPhrases[i].length) {
        if (isException(tokens, unnecessaryPhrases[i])) {
          return -1;
        } else {
          return nAnalysedToken + unnecessaryPhrases[i].length - 1;
        }
      }
    }
    return -1;
  }

  // Java: UnnecessaryPhraseRule#sentenceConditionFulfilled(AnalyzedTokenReadings[],int)
  sentenceConditionFulfilled() {
    return false;
  }

  // Java: UnnecessaryPhraseRule#excludeDirectSpeech()
  excludeDirectSpeech() {
    return true;
  }

  // Java: UnnecessaryPhraseRule#getLimitMessage(int,double)
  getLimitMessage(limit, percent) {
    if (limit === 0) {
      return 'Der Ausdruck gilt als Phrase. Es wird empfohlen ihn zu löschen, falls möglich.';
    }
    return 'Mehr als ' + limit + '‱ potenzielle Phrasen {' + d2i(percent + 0.5) +
        '‱} gefunden. Es wird empfohlen den Ausdruck zu löschen, falls möglich.';
  }

  // Java: UnnecessaryPhraseRule#getSentenceMessage()
  getSentenceMessage() {
    return null;
  }

  // Java: UnnecessaryPhraseRule#getId()
  getId() {
    return 'UNNECESSARY_PHRASES_DE';
  }

  // Java: UnnecessaryPhraseRule#getDescription()
  getDescription() {
    return 'Statistische Stilanalyse: Potenzielle Phrasen';
  }

  // Java: UnnecessaryPhraseRule#getConfigurePercentText()
  getConfigurePercentText() {
    return 'Anzeigen wenn mehr als ...‱ eines Kapitels potenzielle Phrasen sind:';
  }

  // Java: UnnecessaryPhraseRule#getConfigureWithoutDirectSpeachText()
  getConfigureWithoutDirectSpeachText() {
    return 'Keine direkte Rede und Zitate berücksichtigen';
  }
}
