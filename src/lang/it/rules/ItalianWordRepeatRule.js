// Java: org.languagetool.rules.it.ItalianWordRepeatRule
import { WordRepeatRule } from '../../../core/rules/WordRepeatRule.js';
import { registerComponent } from '../../../core/language/components.js';

// Java: ItalianWordRepeatRule
export class ItalianWordRepeatRule extends WordRepeatRule {
  static FQCN = 'org.languagetool.rules.it.ItalianWordRepeatRule';

  // Java: ItalianWordRepeatRule(ResourceBundle,Language)
  constructor(messages, language) {
    super(messages, language);
  }

  // Java: ItalianWordRepeatRule#getId()
  getId() {
    return 'ITALIAN_WORD_REPEAT_RULE';
  }

  // Java: ItalianWordRepeatRule#ignore(AnalyzedTokenReadings[],int)
  ignore(tokens, position) {
    if (this.wordRepetitionOf('così', tokens, position)) {
      return true; // "Mi è sembrato così così."
    }
    if (this.wordRepetitionOf('passo', tokens, position)) {
      return true; // "che passo passo vanno verso la rovina"
    }
    if (this.wordRepetitionOf('piano', tokens, position)) {
      return true; // "Piano, piano, signor podestà."
    }
    if (this.wordRepetitionOf('via', tokens, position)) {
      return true; // "Il lessico si andava via via modificando."
    }
    return super.ignore(tokens, position);
  }
}

registerComponent(ItalianWordRepeatRule.FQCN, (...args) => new ItalianWordRepeatRule(...args));
