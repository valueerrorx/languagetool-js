// org.languagetool.rules.fr.FrenchSuppressMisspelledSuggestionsFilter
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { AbstractSuppressMisspelledSuggestionsFilter } from '../../../core/rules/AbstractSuppressMisspelledSuggestionsFilter.js';

// Java: FrenchSuppressMisspelledSuggestionsFilter
export class FrenchSuppressMisspelledSuggestionsFilter extends AbstractSuppressMisspelledSuggestionsFilter {
  static FQCN = 'org.languagetool.rules.fr.FrenchSuppressMisspelledSuggestionsFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.fr.FrenchSuppressMisspelledSuggestionsFilter() throws java.io.IOException' }];
}

registerClass(FrenchSuppressMisspelledSuggestionsFilter.FQCN, FrenchSuppressMisspelledSuggestionsFilter);
