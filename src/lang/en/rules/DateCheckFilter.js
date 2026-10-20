// org.languagetool.rules.en.DateCheckFilter
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { Integer } from '../../../lib/java/int.js';
import { AbstractDateCheckWithSuggestionsFilter } from '../../../core/rules/AbstractDateCheckWithSuggestionsFilter.js';
import { isNumeric } from '../../../core/text/StringTools.js';
import { DateFilterHelper } from './DateFilterHelper.js';

// Java: DateCheckFilter
export class DateCheckFilter extends AbstractDateCheckWithSuggestionsFilter {
  static FQCN = 'org.languagetool.rules.en.DateCheckFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.en.DateCheckFilter()' }];

  dateFilterHelper = new DateFilterHelper();

  // Java: DateCheckFilter#getCalendar()
  getCalendar() {
    return this.dateFilterHelper.getCalendar();
  }

  // Java: DateCheckFilter#getErrorMessageWrongYear()
  getErrorMessageWrongYear() {
    return 'This date is wrong. Did you mean "{currentYear}"?';
  }

  // Java: DateCheckFilter#getDayOfWeek(String) and #getDayOfWeek(Calendar) (overloads, one JS method dispatching on the argument type)
  getDayOfWeek(arg) {
    return this.dateFilterHelper.getDayOfWeek(arg);
  }

  // Java: DateCheckFilter#getMonth(String)
  getMonth(monthStr) {
    return this.dateFilterHelper.getMonth(monthStr);
  }

  // Java: DateCheckFilter#getDayStrLikeOriginal(String,String)
  getDayStrLikeOriginal(day, original) {
    if (isNumeric(original)) {
      return day;
    }
    const number = Integer.parseInt(day);
    if (number >= 11 && number <= 13) {
      return number + 'th';
    }
    switch (number % 10) {
      case 1:
        return number + 'st';
      case 2:
        return number + 'nd';
      case 3:
        return number + 'rd';
      default:
        return number + 'th';
    }
  }
}

registerClass(DateCheckFilter.FQCN, DateCheckFilter);
