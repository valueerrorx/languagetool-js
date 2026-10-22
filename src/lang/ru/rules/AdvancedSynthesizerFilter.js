// Java: org.languagetool.rules.ru.AdvancedSynthesizerFilter
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { AbstractAdvancedSynthesizerFilter } from '../../../core/rules/AbstractAdvancedSynthesizerFilter.js';

// Java: AdvancedSynthesizerFilter
export class AdvancedSynthesizerFilter extends AbstractAdvancedSynthesizerFilter {
  static FQCN = 'org.languagetool.rules.ru.AdvancedSynthesizerFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.ru.AdvancedSynthesizerFilter()' }];
}

registerClass(AdvancedSynthesizerFilter.FQCN, AdvancedSynthesizerFilter);
