// org.languagetool.rules.de.NonSignificantVerbsRule
import { Pattern } from '../../../lib/java/regex/index.js';
import { d2i } from '../../../lib/java/casts.js';
import { startsWith } from '../../../lib/java/strings.js';
import { AbstractStatisticStyleRule } from '../../../core/rules/AbstractStatisticStyleRule.js';
import { Example } from '../../../core/rules/model/Examples.js';

const DEFAULT_MIN_PER_MILL = 8;

const nonSignificant = ['haben', 'sein', 'machen', 'tun'];

const UNKNOWN_WORD = Pattern.compile('^[A-Za-zÄÖÜäöüß]+$');

// Java: NonSignificantVerbsRule#isUnknownWord(AnalyzedTokenReadings)
function isUnknownWord(token) {
  return token.isPosTagUnknown() && token.getToken().length > 2 && UNKNOWN_WORD.matcher(token.getToken()).matches();
}

// Java: NonSignificantVerbsRule#isException(AnalyzedTokenReadings[],int)
function isException(tokens, num) {
  if (startsWith(tokens[num].getToken(), 'sein') || startsWith(tokens[num].getToken(), 'Sein')) {
    return true;
  } else if (tokens[num].hasLemma('machen')) {
    for (let i = 1; i < tokens.length; i++) {
      if ('Angst' === tokens[i].getToken() || 'Weg' === tokens[i].getToken() ||
          'frisch' === tokens[i].getToken() || 'bemerkbar' === tokens[i].getToken() ||
          'aufmerksam' === tokens[i].getToken()) {
        return true;
      }
    }
  } else {
    const isHaben = tokens[num].hasLemma('haben');
    if (isHaben) {
      for (let i = 1; i < tokens.length; i++) {
        const sToken = tokens[i].getToken();
        if (sToken === 'Glück' || sToken === 'Angst' || sToken === 'Mühe' ||
            sToken === 'Recht' || sToken === 'recht') {
          return true;
        }
      }
    }
    if (isHaben || tokens[num].hasLemma('sein')) {
      for (let i = 1; i < tokens.length; i++) {
        if (tokens[i].hasPosTagStartingWith('PA2') || tokens[i].hasPosTagStartingWith('VER:PA2') ||
            'Flucht' === tokens[i].getToken() || isUnknownWord(tokens[i])) {
          return true;
        }
      }
    }
  }
  return false;
}

// Java: NonSignificantVerbsRule
export class NonSignificantVerbsRule extends AbstractStatisticStyleRule {
  static FQCN = 'org.languagetool.rules.de.NonSignificantVerbsRule';

  // Java: NonSignificantVerbsRule(ResourceBundle,Language,UserConfig)
  constructor(messages, lang, userConfig) {
    super(messages, lang, userConfig, DEFAULT_MIN_PER_MILL);
    this.addExamplePair(Example.wrong('Er <marker>machte</marker> einen Kuchen.'),
      Example.fixed('Das macht mir Angst.'));
  }

  // Java: NonSignificantVerbsRule#denominator()
  denominator() {
    return 1000.0;
  }

  // Java: NonSignificantVerbsRule#conditionFulfilled(AnalyzedTokenReadings[],int)
  conditionFulfilled(tokens, nAnalysedToken) {
    if (tokens[nAnalysedToken].hasAnyLemma(...nonSignificant) && !isException(tokens, nAnalysedToken)) {
      return nAnalysedToken;
    }
    return -1;
  }

  // Java: NonSignificantVerbsRule#sentenceConditionFulfilled(AnalyzedTokenReadings[],int)
  sentenceConditionFulfilled() {
    return false;
  }

  // Java: NonSignificantVerbsRule#excludeDirectSpeech()
  excludeDirectSpeech() {
    return true;
  }

  // Java: NonSignificantVerbsRule#getLimitMessage(int,double)
  getLimitMessage(limit, percent) {
    if (limit === 0) {
      return 'Dieses Verb hat wenig Aussagekraft. Verwenden Sie wenn möglich ein anderes oder formulieren Sie den Satz um.';
    }
    return 'Mehr als ' + limit + '‰ wenig aussagekräftige Verben {' + d2i(percent + 0.5) +
        '‰} gefunden. Verwenden Sie wenn möglich ein anderes Verb oder formulieren Sie den Satz um.';
  }

  // Java: NonSignificantVerbsRule#getSentenceMessage()
  getSentenceMessage() {
    return null;
  }

  // Java: NonSignificantVerbsRule#getId()
  getId() {
    return 'NON_SIGNIFICANT_VERB_DE';
  }

  // Java: NonSignificantVerbsRule#getDescription()
  getDescription() {
    return 'Statistische Stilanalyse: Verben mit wenig Aussagekraft';
  }

  // Java: NonSignificantVerbsRule#getConfigurePercentText()
  getConfigurePercentText() {
    return 'Anzeigen wenn mehr als ...‰ eines Kapitels wenig aussagekräftige Verben sind:';
  }

  // Java: NonSignificantVerbsRule#getConfigureWithoutDirectSpeachText()
  getConfigureWithoutDirectSpeachText() {
    return 'Keine direkte Rede und Zitate berücksichtigen';
  }
}
