// Java: org.languagetool.rules.es.DateCheckFilter
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { AbstractDateCheckWithSuggestionsFilter } from '../../../core/rules/AbstractDateCheckWithSuggestionsFilter.js';
import { DateFilterHelper } from './DateFilterHelper.js';

// Java: DateCheckFilter (Spanish localization of AbstractDateCheckFilter)
export class DateCheckFilter extends AbstractDateCheckWithSuggestionsFilter {
  static FQCN = 'org.languagetool.rules.es.DateCheckFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.es.DateCheckFilter()' }];

  dateFilterHelper = new DateFilterHelper();

  // Java: DateCheckFilter#getMonth(String)
  getMonth(localizedMonth) {
    return this.dateFilterHelper.getMonth(localizedMonth);
  }

  // Java: DateCheckFilter#getCalendar()
  getCalendar() {
    return this.dateFilterHelper.getCalendar();
  }

  // Java: DateCheckFilter#getDayOfWeek(String) and #getDayOfWeek(Calendar) (overloads, one JS method dispatching on the argument type)
  getDayOfWeek(arg) {
    return this.dateFilterHelper.getDayOfWeek(arg);
  }

  // Java: DateCheckFilter#getErrorMessageWrongYear()
  getErrorMessageWrongYear() {
    return 'Este fecha no es correcta. ¿Se refería al año "{currentYear}"?';
  }
}

registerClass(DateCheckFilter.FQCN, DateCheckFilter);
