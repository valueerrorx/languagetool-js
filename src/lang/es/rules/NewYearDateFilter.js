// Java: org.languagetool.rules.es.NewYearDateFilter
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { AbstractNewYearDateFilter } from '../../../core/rules/AbstractNewYearDateFilter.js';
import { DateFilterHelper } from './DateFilterHelper.js';

// Java: NewYearDateFilter
export class NewYearDateFilter extends AbstractNewYearDateFilter {
  static FQCN = 'org.languagetool.rules.es.NewYearDateFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.es.NewYearDateFilter()' }];

  dateFilterHelper = new DateFilterHelper();

  // Java: NewYearDateFilter#getMonth(String)
  getMonth(localizedMonth) {
    return this.dateFilterHelper.getMonth(localizedMonth);
  }

  // Java: NewYearDateFilter#getCalendar()
  getCalendar() {
    return this.dateFilterHelper.getCalendar();
  }

  // Java: NewYearDateFilter#getDayOfWeek(Calendar)
  getDayOfWeek(date) {
    return this.dateFilterHelper.getDayOfWeek(date);
  }
}

registerClass(NewYearDateFilter.FQCN, NewYearDateFilter);
