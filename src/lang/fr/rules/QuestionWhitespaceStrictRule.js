// org.languagetool.rules.fr.QuestionWhitespaceStrictRule
import { QuestionWhitespaceRule } from './QuestionWhitespaceRule.js';
import { Tag } from '../../../core/rules/model/Tag.js';

// Java: QuestionWhitespaceStrictRule
export class QuestionWhitespaceStrictRule extends QuestionWhitespaceRule {
  static FQCN = 'org.languagetool.rules.fr.QuestionWhitespaceStrictRule';

  // Java: QuestionWhitespaceStrictRule(ResourceBundle,Language)
  constructor(messages, language) {
    super(messages, language);
    this.setTags([Tag.picky]);
    this.setDefaultTempOff();
  }

  // Java: QuestionWhitespaceStrictRule#getId()
  getId() {
    return 'FRENCH_WHITESPACE_STRICT';
  }

  // Java: QuestionWhitespaceStrictRule#getDescription()
  getDescription() {
    return 'Insertion des espaces fines insécables';
  }

  // Java: QuestionWhitespaceStrictRule#isAllowedWhitespaceChar(AnalyzedTokenReadings[],int)
  isAllowedWhitespaceChar(tokens, i) {
    // Strictly speaking, the character before ?!; should be an
    // "espace fine insécable" (U+202f). In practise, an
    // "espace insécable" (U+00a0) is also often used. Let's accept both.
    if (i < 0) {
      return false;
    }
    return tokens[i].getToken() === ' ' || tokens[i].getToken() === ' '
      // covered by FRENCH_WHITESPACE (non strict). This makes both rules mutually exclusive
      || !tokens[i].isWhitespace();
  }
}
