// org.languagetool.rules.de.GermanRepeatedWordsRule
import { AbstractRepeatedWordsRule } from '../../../core/rules/AbstractRepeatedWordsRule.js';
import { getClassBroker } from '../../../core/resources/LtStatics.js';
import { GermanSynthesizer } from '../synthesis/GermanSynthesizer.js';

let wordsToCheck = null; // Java: static wordsToCheck = loadWords("/de/synonyms.txt")

// Java: GermanRepeatedWordsRule
export class GermanRepeatedWordsRule extends AbstractRepeatedWordsRule {
  static FQCN = 'org.languagetool.rules.de.GermanRepeatedWordsRule';

  // Java: GermanRepeatedWordsRule(ResourceBundle)
  constructor(messages) {
    super(messages, getClassBroker().forName('org.languagetool.language.GermanyGerman').getInstance());
    if (wordsToCheck === null) wordsToCheck = AbstractRepeatedWordsRule.loadWords('/de/synonyms.txt');
    // super.setDefaultTempOff();
  }

  // Java: GermanRepeatedWordsRule#getMessage()
  getMessage() {
    return 'Dieses Wort kommt in einem nahe gelegenen vorherigen Satz bereits vor. Verwenden Sie ein Synonym, um Ihren Text abwechslungsreicher zu gestalten, außer die Wiederholung ist beabsichtigt.';
  }

  // Java: GermanRepeatedWordsRule#getDescription()
  getDescription() {
    return ('Synonyme für wiederholte Wörter.');
  }

  // Java: GermanRepeatedWordsRule#getWordsToCheck()
  getWordsToCheck() {
    return wordsToCheck;
  }

  // Java: GermanRepeatedWordsRule#getShortMessage()
  getShortMessage() {
    return 'Stil: Wortwiederholung';
  }

  // Java: GermanRepeatedWordsRule#getSynthesizer()
  getSynthesizer() {
    return GermanSynthesizer.INSTANCE;
  }

  // Java: GermanRepeatedWordsRule#isException(AnalyzedTokenReadings[],int,boolean,boolean,boolean)
  isException(tokens, i, sentStart, isCapitalized, isAllUppercase) {
    if (isAllUppercase || (isCapitalized && !sentStart)) {
      return true;
    }
    return tokens[i].hasPosTagStartingWith('EIG:');
  }
}
