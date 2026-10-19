// org.languagetool.rules.de.GermanWrongWordInContextRule
import { WrongWordInContextRule } from '../../../core/rules/WrongWordInContextRule.js';
import { Example } from '../../../core/rules/model/Examples.js';

// Java: GermanWrongWordInContextRule
export class GermanWrongWordInContextRule extends WrongWordInContextRule {
  static FQCN = 'org.languagetool.rules.de.GermanWrongWordInContextRule';

  // Java: GermanWrongWordInContextRule(ResourceBundle,Language)
  constructor(messages, lang) {
    super(messages, lang);
    this.addExamplePair(Example.wrong('Die <marker>Miene</marker> vom Kugelschreiber ist leer.'),
      Example.fixed('Die <marker>Mine</marker> vom Kugelschreiber ist leer.'));
  }

  // Java: GermanWrongWordInContextRule#getCategoryString()
  getCategoryString() {
    return 'Leicht zu verwechselnde Wörter';
  }

  // Java: GermanWrongWordInContextRule#getId()
  getId() {
    return 'GERMAN_WRONG_WORD_IN_CONTEXT';
  }

  // Java: GermanWrongWordInContextRule#getDescription()
  getDescription() {
    return 'Mögliche Wortverwechslungen: $match';
  }

  // Java: GermanWrongWordInContextRule#getFilename()
  getFilename() {
    return '/de/wrongWordInContext.txt';
  }

  // Java: GermanWrongWordInContextRule#getMessageString()
  getMessageString() {
    return "Mögliche Wortverwechslung: Meinten Sie <suggestion>$SUGGESTION</suggestion> anstatt '$WRONGWORD'?";
  }

  // Java: GermanWrongWordInContextRule#getShortMessageString()
  getShortMessageString() {
    return 'Mögliche Wortverwechslung';
  }

  // Java: GermanWrongWordInContextRule#getLongMessageString()
  getLongMessageString() {
    return "Mögliche Wortverwechslung: Meinten Sie <suggestion>$SUGGESTION</suggestion> (= $EXPLANATION_SUGGESTION) anstatt '$WRONGWORD' (= $EXPLANATION_WRONGWORD)?";
  }
}
