// org.languagetool.rules.AbstractFutureDateFilter
import { AbstractMethodError, IllegalArgumentException } from '../../lib/java/errors.js';
import { Calendar } from '../../lib/java/Calendar.js';
import { Integer } from '../../lib/java/int.js';
import { Pattern } from '../../lib/java/regex/index.js';
import { isNumeric } from '../../lib/java/StringUtils.js';
import { RuleFilter } from '../patterns/RuleFilter.js';
import { TestHackHelper } from './TestHackHelper.js';

const DAY_OF_MONTH_PATTERN = Pattern.compile('(\\d+).*');

// Java: AbstractFutureDateFilter
export class AbstractFutureDateFilter extends RuleFilter {
  static FQCN = 'org.languagetool.rules.AbstractFutureDateFilter';
  static JAVA_ABSTRACT = true;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.AbstractFutureDateFilter()' }];

  // Java: AbstractFutureDateFilter#getDayOfMonth(String)
  getDayOfMonth() {
    return 0;
  }

  // Java: AbstractFutureDateFilter#getMonth(String) (abstract)
  getMonth() {
    throw new AbstractMethodError('org.languagetool.rules.AbstractFutureDateFilter.getMonth');
  }

  // Java: AbstractFutureDateFilter#getCalendar() (abstract)
  getCalendar() {
    throw new AbstractMethodError('org.languagetool.rules.AbstractFutureDateFilter.getCalendar');
  }

  // Java: AbstractFutureDateFilter#acceptRuleMatch(RuleMatch,Map,int,AnalyzedTokenReadings[],List)
  acceptRuleMatch(match, args) {
    const dateFromDate = this.getDate(args);
    let currentDate = this.getCalendar();
    if (TestHackHelper.isJUnitTest()) {
      currentDate = new Calendar.Builder().setDate(2014, 0, 1).build();
    }
    try {
      if (dateFromDate.after(currentDate)) {
        return match;
      }
      return null;
    } catch (ignore) {
      if (!(ignore instanceof IllegalArgumentException)) throw ignore;
      // happens with 'dates' like '32.8.2014' - those should be caught by a different rule
      return null;
    }
  }

  // Java: AbstractFutureDateFilter#getDate(Map) (private)
  getDate(args) {
    const year = Integer.parseInt(this.getRequired('year', args));
    const month = this.getMonthFromArguments(args);
    const dayOfMonth = this.getDayOfMonthFromArguments(args);
    const calendar = this.getCalendar();
    calendar.setLenient(false); // be strict about validity of dates
    calendar.set(year, month, dayOfMonth, 0, 0, 0);
    return calendar;
  }

  // Java: AbstractFutureDateFilter#getDayOfMonthFromArguments(Map) (private)
  getDayOfMonthFromArguments(args) {
    const dayOfMonthString = this.getRequired('day', args);
    const matcherDayOfMonth = DAY_OF_MONTH_PATTERN.matcher(dayOfMonthString);
    if (matcherDayOfMonth.matches()) {
      return Integer.parseInt(matcherDayOfMonth.group(1));
    }
    return this.getDayOfMonth(dayOfMonthString);
  }

  // Java: AbstractFutureDateFilter#getMonthFromArguments(Map) (private)
  getMonthFromArguments(args) {
    const monthStr = this.getRequired('month', args);
    let month;
    if (isNumeric(monthStr)) {
      month = Integer.parseInt(monthStr);
    } else {
      month = this.getMonth(monthStr);
    }
    return month - 1;
  }
}
