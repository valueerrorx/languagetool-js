// org.languagetool.rules.de.LongSentenceRule
import { LongSentenceRule as CoreLongSentenceRule } from '../../../core/rules/LongSentenceRule.js';
import { Example } from '../../../core/rules/model/Examples.js';

// Java: LongSentenceRule (de)
export class LongSentenceRule extends CoreLongSentenceRule {
  static FQCN = 'org.languagetool.rules.de.LongSentenceRule';

  // Java: LongSentenceRule(ResourceBundle,UserConfig,int)
  constructor(messages, userConfig, defaultWords) {
    super(messages, userConfig, defaultWords);
    this.addExamplePair(Example.wrong('<marker>Dies ist ein Bandwurmsatz, der immer weiter geht, obwohl das kein guter Stil ist, den man eigentlich berücksichtigen sollte, obwohl es auch andere Meinungen gibt, die aber in der Minderzahl sind, weil die meisten Autoren sich doch an die Stilvorgaben halten, wenn auch nicht alle, was aber letztendlich wiederum eine Sache des Geschmacks ist</marker>.'),
      Example.fixed('<marker>Dies ist ein kurzer Satz.</marker>'));
  }

  // Java: LongSentenceRule#getDescription()
  getDescription() {
    return 'Findet lange Sätze';
  }

  // Java: LongSentenceRule#getId()
  getId() {
    return 'TOO_LONG_SENTENCE_DE';
  }

  // Java: LongSentenceRule#getShortMessage()
  getShortMessage() {
    return 'Langer Satz';
  }
}
