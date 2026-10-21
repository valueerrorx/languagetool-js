// org.languagetool.rules.de.GermanParagraphRepeatBeginningRule
import { ParagraphRepeatBeginningRule } from '../../../core/rules/ParagraphRepeatBeginningRule.js';

// Java: GermanParagraphRepeatBeginningRule
export class GermanParagraphRepeatBeginningRule extends ParagraphRepeatBeginningRule {
  static FQCN = 'org.languagetool.rules.de.GermanParagraphRepeatBeginningRule';

  // Java: GermanParagraphRepeatBeginningRule(ResourceBundle,Language)
  constructor(messages, lang) {
    super(messages, lang);
  }

  // Java: GermanParagraphRepeatBeginningRule#getId()
  getId() {
    return 'GERMAN_PARAGRAPH_REPEAT_BEGINNING_RULE';
  }

  // Java: GermanParagraphRepeatBeginningRule#isArticle(AnalyzedTokenReadings)
  isArticle(token) {
    return token.hasPosTagStartingWith('ART');
  }
}
