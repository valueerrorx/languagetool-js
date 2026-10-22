// Java: org.languagetool.rules.es.SpanishSuppressMisspelledSuggestionsFilter
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { AbstractSuppressMisspelledSuggestionsFilter } from '../../../core/rules/AbstractSuppressMisspelledSuggestionsFilter.js';

// Java: SpanishSuppressMisspelledSuggestionsFilter
export class SpanishSuppressMisspelledSuggestionsFilter extends AbstractSuppressMisspelledSuggestionsFilter {
  static FQCN = 'org.languagetool.rules.es.SpanishSuppressMisspelledSuggestionsFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.es.SpanishSuppressMisspelledSuggestionsFilter() throws java.io.IOException' }];
}

registerClass(SpanishSuppressMisspelledSuggestionsFilter.FQCN, SpanishSuppressMisspelledSuggestionsFilter);
