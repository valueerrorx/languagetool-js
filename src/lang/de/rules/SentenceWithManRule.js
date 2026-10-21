// org.languagetool.rules.de.SentenceWithManRule
import { d2i } from '../../../lib/java/casts.js';
import { AbstractStatisticSentenceStyleRule } from '../../../core/rules/AbstractStatisticSentenceStyleRule.js';

const DEFAULT_MIN_PERCENT = 15;

// Java: SentenceWithManRule#isWordMan(AnalyzedTokenReadings)
function isWordMan(token) {
  return (token.hasLemma('man'));
}

// Java: SentenceWithManRule
export class SentenceWithManRule extends AbstractStatisticSentenceStyleRule {
  static FQCN = 'org.languagetool.rules.de.SentenceWithManRule';

  // Java: SentenceWithManRule(ResourceBundle,Language,UserConfig)
  constructor(messages, lang, userConfig) {
    super(messages, lang, userConfig, DEFAULT_MIN_PERCENT);
    this.sentenceMessage = null;
  }

  // Java: SentenceWithManRule#conditionFulfilled(List)
  conditionFulfilled(sentence) {
    for (let i = 0; i < sentence.length; i++) {
      if (isWordMan(sentence[i])) {
        return sentence[i];
      }
    }
    return null;
  }

  // Java: SentenceWithManRule#excludeDirectSpeech()
  excludeDirectSpeech() {
    return true;
  }

  // Java: SentenceWithManRule#denominator()
  denominator() {
    return 1000.0;
  }

  // Java: SentenceWithManRule#getLimitMessage(int,double)
  getLimitMessage(limit, percent) {
    if (limit === 0) {
      return "Sätze mit der indirekten Leseransprache 'man' sind stilistisch wenig elegant formuliert. Lässt sich das Wort vermeiden?";
    }
    return 'Mehr als ' + limit + "‰ Sätze mit der indirekten Leseransprache 'man' {" + d2i(percent + 0.5) + '‰} gefunden. Lässt sich das Wort vermeiden?';
  }

  // Java: SentenceWithManRule#getId()
  getId() {
    return 'SENTENCE_WITH_MAN_DE';
  }

  // Java: SentenceWithManRule#getDescription()
  getDescription() {
    return "Statistische Stilanalyse: Sätze mit indirekter Leseransprache 'man'";
  }

  // Java: SentenceWithManRule#getConfigureText()
  getConfigureText() {
    return "Anzeigen wenn mehr als ...‰ Sätze eines Kapitels 'man' enthalten:";
  }
}
