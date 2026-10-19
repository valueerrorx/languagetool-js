// org.languagetool.rules.SuggestionWithMessage
import { Objects } from '../../lib/java/Objects.js';

// Java: SuggestionWithMessage
export class SuggestionWithMessage {
  static FQCN = 'org.languagetool.rules.SuggestionWithMessage';

  // Java: SuggestionWithMessage(String) / SuggestionWithMessage(String,String)
  constructor(suggestion, message = null) {
    this.suggestion = Objects.requireNonNull(suggestion);
    this.message = message;
  }

  // Java: SuggestionWithMessage#getSuggestion()
  getSuggestion() {
    return this.suggestion;
  }

  // Java: SuggestionWithMessage#getMessage()
  getMessage() {
    return this.message;
  }
}
