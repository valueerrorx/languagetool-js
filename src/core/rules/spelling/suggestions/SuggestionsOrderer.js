// Java: org.languagetool.rules.spelling.suggestions.SuggestionsOrderer (interface; implementations need an ML model, not ported)
import { defineInterface } from '../../../../lib/java/interfaces.js';

// Java: SuggestionsOrderer
export const SuggestionsOrderer = defineInterface('org.languagetool.rules.spelling.suggestions.SuggestionsOrderer');

// Java: SuggestionsOrderer#orderSuggestionsUsingModel(List,String,AnalyzedSentence,int) (default method)
export function orderSuggestionsUsingModel(orderer, suggestions, word, sentence, startPos) {
  const ordered = orderer.orderSuggestions(suggestions, word, sentence, startPos);
  return ordered.map((s) => s.getReplacement());
}
