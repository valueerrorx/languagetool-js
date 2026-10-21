// org.languagetool.rules.fr.FrenchRepeatedWordsRule
import { AbstractRepeatedWordsRule } from '../../../core/rules/AbstractRepeatedWordsRule.js';
import { replaceOnce } from '../../../lib/java/StringUtils.js';
import { getClassBroker } from '../../../core/resources/LtStatics.js';
import { FrenchSynthesizer } from '../synthesis/FrenchSynthesizer.js';

let wordsToCheck = null; // Java: static wordsToCheck = loadWords("/fr/synonyms.txt")

// Java: FrenchRepeatedWordsRule
export class FrenchRepeatedWordsRule extends AbstractRepeatedWordsRule {
  static FQCN = 'org.languagetool.rules.fr.FrenchRepeatedWordsRule';

  // Java: FrenchRepeatedWordsRule(ResourceBundle)
  constructor(messages) {
    super(messages, getClassBroker().forName('org.languagetool.language.French').getInstance());
    if (wordsToCheck === null) wordsToCheck = AbstractRepeatedWordsRule.loadWords('/fr/synonyms.txt');
    // super.setDefaultTempOff();
  }

  // Java: FrenchRepeatedWordsRule#getMessage()
  getMessage() {
    return "Ce mot apparaît déjà dans l'une des phrases précédant immédiatement celle-ci. Utilisez un synonyme pour apporter plus de variété à votre texte, excepté si la répétition est intentionnelle.";
  }

  // Java: FrenchRepeatedWordsRule#getDescription()
  getDescription() {
    return ('Synonymes de mots répétés.');
  }

  // Java: FrenchRepeatedWordsRule#getWordsToCheck()
  getWordsToCheck() {
    return wordsToCheck;
  }

  // Java: FrenchRepeatedWordsRule#getShortMessage()
  getShortMessage() {
    return 'Style : Mot répété';
  }

  // Java: FrenchRepeatedWordsRule#getSynthesizer()
  getSynthesizer() {
    return FrenchSynthesizer.INSTANCE;
  }

  // Java: FrenchRepeatedWordsRule#adjustPostag(String)
  adjustPostag(postag) {
    if (postag.endsWith('e sp')) {
      return replaceOnce(postag, 'e sp', '. .*');
    } else if (postag.endsWith('m s')) {
      return replaceOnce(postag, 'm s', '[me] sp?');
    } else if (postag.endsWith('f s')) {
      return replaceOnce(postag, 'f s', '[fe] sp?');
    } else if (postag.endsWith('m p')) {
      return replaceOnce(postag, 'm p', '[me] s?p');
    } else if (postag.endsWith('f p')) {
      return replaceOnce(postag, 'f p', '[fe] s?p');
    } else if (postag.endsWith('e s')) {
      return replaceOnce(postag, 'e s', '[me] sp?'); // also F ?
    } else if (postag.endsWith('e p')) {
      return replaceOnce(postag, 'e p', '[me] s?p'); // also F ?
    } else if (postag.endsWith('m sp')) {
      return replaceOnce(postag, 'm sp', '[me] s?p?');
    } else if (postag.endsWith('f sp')) {
      return replaceOnce(postag, 'f sp', '[fe] s?p?');
    }
    return postag;
  }

  // Java: FrenchRepeatedWordsRule#isException(AnalyzedTokenReadings[],int,boolean,boolean,boolean)
  isException(tokens, i, sentStart, isCapitalized, isAllUppercase) {
    if (isAllUppercase || (isCapitalized && !sentStart)) {
      return true;
    }
    return tokens[i].hasPosTagStartingWith('Z');
  }
}
