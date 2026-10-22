// Java: org.languagetool.rules.es.SpanishWrongWordInContextRule
import { WrongWordInContextRule } from '../../../core/rules/WrongWordInContextRule.js';
import { ITSIssueType } from '../../../core/rules/model/ITSIssueType.js';

// Java: SpanishWrongWordInContextRule
export class SpanishWrongWordInContextRule extends WrongWordInContextRule {
  static FQCN = 'org.languagetool.rules.es.SpanishWrongWordInContextRule';

  // Java: SpanishWrongWordInContextRule(ResourceBundle,Language)
  constructor(messages, lang) {
    super(messages, lang);
    this.setLocQualityIssueType(ITSIssueType.Grammar);
    this.setMatchLemmmas();
  }

  // Java: SpanishWrongWordInContextRule#getCategoryString()
  getCategoryString() {
    return 'Confusiones';
  }

  // Java: SpanishWrongWordInContextRule#getId()
  getId() {
    return 'SPANISH_WRONG_WORD_IN_CONTEXT';
  }

  // Java: SpanishWrongWordInContextRule#getDescription()
  getDescription() {
    return 'Confusión según el contexto: $match';
  }

  // Java: SpanishWrongWordInContextRule#getFilename()
  getFilename() {
    return '/es/wrongWordInContext.txt';
  }

  // Java: SpanishWrongWordInContextRule#getMessageString()
  getMessageString() {
    return '¿Quería decir <suggestion>$SUGGESTION</suggestion> en vez de "$WRONGWORD"?';
  }

  // Java: SpanishWrongWordInContextRule#getShortMessageString()
  getShortMessageString() {
    return 'Posible confusión';
  }

  // Java: SpanishWrongWordInContextRule#getLongMessageString()
  getLongMessageString() {
    return '¿Quería decir <suggestion>$SUGGESTION</suggestion> ($EXPLANATION_SUGGESTION) en vez de "$WRONGWORD" ($EXPLANATION_WRONGWORD)?';
  }
}
