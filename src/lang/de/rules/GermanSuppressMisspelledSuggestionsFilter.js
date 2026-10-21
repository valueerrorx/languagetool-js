// org.languagetool.rules.de.GermanSuppressMisspelledSuggestionsFilter
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { AbstractSuppressMisspelledSuggestionsFilter } from '../../../core/rules/AbstractSuppressMisspelledSuggestionsFilter.js';

// Java: GermanSuppressMisspelledSuggestionsFilter
export class GermanSuppressMisspelledSuggestionsFilter extends AbstractSuppressMisspelledSuggestionsFilter {
  static FQCN = 'org.languagetool.rules.de.GermanSuppressMisspelledSuggestionsFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.de.GermanSuppressMisspelledSuggestionsFilter() throws java.io.IOException' }];
}

registerClass(GermanSuppressMisspelledSuggestionsFilter.FQCN, GermanSuppressMisspelledSuggestionsFilter);
