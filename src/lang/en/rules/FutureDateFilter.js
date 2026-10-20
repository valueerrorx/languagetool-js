// org.languagetool.rules.en.FutureDateFilter
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { AbstractFutureDateFilter } from '../../../core/rules/AbstractFutureDateFilter.js';
import { DateFilterHelper } from './DateFilterHelper.js';

// Java: FutureDateFilter
export class FutureDateFilter extends AbstractFutureDateFilter {
  static FQCN = 'org.languagetool.rules.en.FutureDateFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.en.FutureDateFilter()' }];

  dateFilterHelper = new DateFilterHelper();

  // Java: FutureDateFilter#getMonth(String)
  getMonth(localizedMonth) {
    return this.dateFilterHelper.getMonth(localizedMonth);
  }

  // Java: FutureDateFilter#getCalendar()
  getCalendar() {
    return this.dateFilterHelper.getCalendar();
  }
}

registerClass(FutureDateFilter.FQCN, FutureDateFilter);
