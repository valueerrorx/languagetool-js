// org.languagetool.rules.en.NewYearDateFilter
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { AbstractNewYearDateFilter } from '../../../core/rules/AbstractNewYearDateFilter.js';
import { DateFilterHelper } from './DateFilterHelper.js';

// Java: NewYearDateFilter
export class NewYearDateFilter extends AbstractNewYearDateFilter {
  static FQCN = 'org.languagetool.rules.en.NewYearDateFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.en.NewYearDateFilter()' }];

  dateFilterHelper = new DateFilterHelper();

  // Java: NewYearDateFilter#getMonth(String)
  getMonth(localizedMonth) {
    return this.dateFilterHelper.getMonth(localizedMonth);
  }

  // Java: NewYearDateFilter#getCalendar()
  getCalendar() {
    return this.dateFilterHelper.getCalendar();
  }
}

registerClass(NewYearDateFilter.FQCN, NewYearDateFilter);
