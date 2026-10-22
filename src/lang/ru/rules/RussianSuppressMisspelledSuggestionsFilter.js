// Java: org.languagetool.rules.ru.RussianSuppressMisspelledSuggestionsFilter
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { AbstractSuppressMisspelledSuggestionsFilter } from '../../../core/rules/AbstractSuppressMisspelledSuggestionsFilter.js';

// Java: RussianSuppressMisspelledSuggestionsFilter
export class RussianSuppressMisspelledSuggestionsFilter extends AbstractSuppressMisspelledSuggestionsFilter {
  static FQCN = 'org.languagetool.rules.ru.RussianSuppressMisspelledSuggestionsFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.ru.RussianSuppressMisspelledSuggestionsFilter() throws java.io.IOException' }];
}

registerClass(RussianSuppressMisspelledSuggestionsFilter.FQCN, RussianSuppressMisspelledSuggestionsFilter);
