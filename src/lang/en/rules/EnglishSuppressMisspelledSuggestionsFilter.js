// org.languagetool.rules.en.EnglishSuppressMisspelledSuggestionsFilter
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { AbstractSuppressMisspelledSuggestionsFilter } from '../../../core/rules/AbstractSuppressMisspelledSuggestionsFilter.js';

// Java: EnglishSuppressMisspelledSuggestionsFilter
export class EnglishSuppressMisspelledSuggestionsFilter extends AbstractSuppressMisspelledSuggestionsFilter {
  static FQCN = 'org.languagetool.rules.en.EnglishSuppressMisspelledSuggestionsFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.en.EnglishSuppressMisspelledSuggestionsFilter() throws java.io.IOException' }];
}

registerClass(EnglishSuppressMisspelledSuggestionsFilter.FQCN, EnglishSuppressMisspelledSuggestionsFilter);
