// Java: org.languagetool.rules.spelling.morfologik.suggestions_ordering.SuggestionsOrdererConfig
import { JBoolean } from '../../../../../lib/java/numbers.js';
import { System } from '../../../../../lib/java/System.js';

const PROP_NAME = 'enableMLSuggestionsOrdering'; // Java: SuggestionsOrdererConfig#PROP_NAME

let ngramsPath = null; // Java: SuggestionsOrdererConfig#ngramsPath

// Java: SuggestionsOrdererConfig
export class SuggestionsOrdererConfig {
  static FQCN = 'org.languagetool.rules.spelling.morfologik.suggestions_ordering.SuggestionsOrdererConfig';

  // Java: SuggestionsOrdererConfig#getNgramsPath() (package-private)
  static getNgramsPath() {
    return ngramsPath;
  }

  // Java: SuggestionsOrdererConfig#setNgramsPath(String)
  static setNgramsPath(path) {
    ngramsPath = path;
  }

  // Java: SuggestionsOrdererConfig#isMLSuggestionsOrderingEnabled()
  static isMLSuggestionsOrderingEnabled() {
    const enableMLSuggestionsOrderingProperty = System.getProperty(PROP_NAME, 'false');
    return JBoolean.parseBoolean(enableMLSuggestionsOrderingProperty);
  }

  // Java: SuggestionsOrdererConfig#setMLSuggestionsOrderingEnabled(boolean)
  static setMLSuggestionsOrderingEnabled(MLSuggestionsOrderingEnabled) {
    System.setProperty(PROP_NAME, String(MLSuggestionsOrderingEnabled));
  }
}
