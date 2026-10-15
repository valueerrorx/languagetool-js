// org.languagetool.rules.de.GermanDoublePunctuationRule
import { DoublePunctuationRule } from '../../../core/rules/DoublePunctuationRule.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { getUrl } from '../../../core/Tools.js';

// Java: GermanDoublePunctuationRule
export class GermanDoublePunctuationRule extends DoublePunctuationRule {
  static FQCN = 'org.languagetool.rules.de.GermanDoublePunctuationRule';

  // Java: GermanDoublePunctuationRule(ResourceBundle)
  constructor(messages) {
    super(messages);
    this.setUrl(getUrl('https://dict.leo.org/grammatik/deutsch/Rechtschreibung/Amtlich/Interpunktion/pgf101-105.html#grammarpgf103'));
    this.addExamplePair(Example.wrong('Sein Vater ist Regierungsrat <marker>a. D..</marker>'),
      Example.fixed('Sein Vater ist Regierungsrat <marker>a. D.</marker>'));
  }

  // Java: GermanDoublePunctuationRule#getId()
  getId() {
    return 'DE_DOUBLE_PUNCTUATION';
  }

  // Java: GermanDoublePunctuationRule#getDotMessage()
  getDotMessage() {
    return 'Zwei aufeinander folgende Punkte. Auch wenn ein Satz mit einer Abkürzung endet, '
      + 'endet er nur mit einem Punkt (§103 Regelwerk).';
  }
}
