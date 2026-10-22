// Java: org.languagetool.rules.es.SpanishWordRepeatRule
import { WordRepeatRule } from '../../../core/rules/WordRepeatRule.js';

// Java: SpanishWordRepeatRule
export class SpanishWordRepeatRule extends WordRepeatRule {
  static FQCN = 'org.languagetool.rules.es.SpanishWordRepeatRule';

  // Java: SpanishWordRepeatRule(ResourceBundle,Language)
  constructor(messages, language) {
    super(messages, language);
  }

  // Java: SpanishWordRepeatRule#getId()
  getId() {
    return 'SPANISH_WORD_REPEAT_RULE';
  }

  // Java: SpanishWordRepeatRule#ignore(AnalyzedTokenReadings[],int)
  ignore(tokens, position) {
    if (position > 0 && (tokens[position].hasPosTag('_allow_repeat') || tokens[position - 1].hasPosTag('_allow_repeat'))) {
      return true;
    }
    return super.ignore(tokens, position);
  }
}
