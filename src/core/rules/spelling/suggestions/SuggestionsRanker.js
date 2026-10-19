// Java: org.languagetool.rules.spelling.suggestions.SuggestionsRanker (interface; implementations need an ML model, not ported)
import { defineInterface } from '../../../../lib/java/interfaces.js';
import { SuggestionsOrderer } from './SuggestionsOrderer.js';

// Java: SuggestionsRanker
export const SuggestionsRanker = defineInterface('org.languagetool.rules.spelling.suggestions.SuggestionsRanker', SuggestionsOrderer);
