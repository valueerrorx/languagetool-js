// org.languagetool.rules.de.DateCheckFilter
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { AbstractDateCheckWithSuggestionsFilter } from '../../../core/rules/AbstractDateCheckWithSuggestionsFilter.js';
import { indexOf, javaReplace } from '../../../lib/java/strings.js';
import { DateFilterHelper } from './DateFilterHelper.js';

// Java: DateCheckFilter
export class DateCheckFilter extends AbstractDateCheckWithSuggestionsFilter {
  static FQCN = 'org.languagetool.rules.de.DateCheckFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.de.DateCheckFilter()' }];

  dateFilterHelper = new DateFilterHelper();

  // Java: DateCheckFilter#getCalendar()
  getCalendar() {
    return this.dateFilterHelper.getCalendar();
  }

  // Java: DateCheckFilter#getDayOfWeek(String) and #getDayOfWeek(Calendar) (overloads, one JS method dispatching on the argument type)
  getDayOfWeek(arg) {
    return this.dateFilterHelper.getDayOfWeek(arg);
  }

  // Java: DateCheckFilter#getMonth(String)
  getMonth(monthStr) {
    return this.dateFilterHelper.getMonth(monthStr);
  }

  // Java: DateCheckFilter#getErrorMessageWrongYear()
  getErrorMessageWrongYear() {
    return 'Dieses Datum stimmt nicht mit dem Tag überein. Meinten Sie "{currentYear}"?';
  }

  // Java: DateCheckFilter#adjustSuggestion(String)
  adjustSuggestion(sugg) {
    // So. vs Sonntag
    const dotCommaPos = indexOf(sugg, '.,');
    if (dotCommaPos > 5 && dotCommaPos < 12) {
      // remove unnecessary dot
      return javaReplace(sugg, '.,', ',');
    }
    const commaPos = indexOf(sugg, ',');
    if (dotCommaPos < 0 && commaPos > 0 && commaPos < 5) {
      // add dot
      return javaReplace(sugg, ',', '.,');
    }
    return sugg;
  }
}

registerClass(DateCheckFilter.FQCN, DateCheckFilter);
