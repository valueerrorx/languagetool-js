// org.languagetool.rules.en.EnglishConvertToSentenceCaseFilter
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { ConvertToSentenceCaseFilter } from '../../../core/rules/ConvertToSentenceCaseFilter.js';

// Java: EnglishConvertToSentenceCaseFilter
export class EnglishConvertToSentenceCaseFilter extends ConvertToSentenceCaseFilter {
  static FQCN = 'org.languagetool.rules.en.EnglishConvertToSentenceCaseFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.en.EnglishConvertToSentenceCaseFilter()' }];

  // Java: EnglishConvertToSentenceCaseFilter#tokenIsException(String)
  tokenIsException(s) {
    return s === 'me';
  }
}

registerClass(EnglishConvertToSentenceCaseFilter.FQCN, EnglishConvertToSentenceCaseFilter);
