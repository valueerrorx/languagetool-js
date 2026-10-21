// org.languagetool.rules.AbstractDateCheckFilter
import { AbstractMethodError, IllegalArgumentException, NullPointerException, RuntimeException } from '../../lib/java/errors.js';
import { Calendar } from '../../lib/java/Calendar.js';
import { Integer } from '../../lib/java/int.js';
import { Pattern } from '../../lib/java/regex/index.js';
import { javaReplace } from '../../lib/java/strings.js';
import { isNumeric } from '../../lib/java/StringUtils.js';
import { trimSpecialCharacters } from '../text/StringTools.js';
import { getUrl } from '../Tools.js';
import { RuleFilter } from '../patterns/RuleFilter.js';
import { RuleMatch } from './model/RuleMatch.js';
import { TestHackHelper } from './TestHackHelper.js';
import { LoggerFactory } from '../../lib/slf4j/Logger.js';

const logger = LoggerFactory.getLogger('org.languagetool.rules.AbstractDateCheckFilter');

// Java: AbstractDateCheckFilter
export class AbstractDateCheckFilter extends RuleFilter {
  static FQCN = 'org.languagetool.rules.AbstractDateCheckFilter';
  static JAVA_ABSTRACT = true;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.AbstractDateCheckFilter()' }];
  // The day of the month may contain not only digits but also extra letters such as "22nd" in English or "22-an" in Esperanto.
  static DAY_OF_MONTH_PATTERN = Pattern.compile('(\\d+).*');

  // Java: AbstractDateCheckFilter#getDayOfWeek(String) and #getDayOfWeek(Calendar) (overloads, one JS method dispatching on the argument type)
  getDayOfWeek() {
    throw new AbstractMethodError('org.languagetool.rules.AbstractDateCheckFilter.getDayOfWeek');
  }

  // Java: AbstractDateCheckFilter#getDayOfMonth(String)
  getDayOfMonth() {
    return 0;
  }

  // Java: AbstractDateCheckFilter#getMonth(String) (abstract)
  getMonth() {
    throw new AbstractMethodError('org.languagetool.rules.AbstractDateCheckFilter.getMonth');
  }

  // Java: AbstractDateCheckFilter#getCalendar() (abstract)
  getCalendar() {
    throw new AbstractMethodError('org.languagetool.rules.AbstractDateCheckFilter.getCalendar');
  }

  // Java: AbstractDateCheckFilter#acceptRuleMatch(RuleMatch,Map,int,AnalyzedTokenReadings[],List)
  acceptRuleMatch(match, args) {
    try {
      const dayOfWeekFromString = this.getDayOfWeek(javaReplace(this.getRequired('weekDay', args), '­', '')); // replace soft hyphen
      const dateFromDate = this.getDate(args);
      let dayOfWeekFromDate;
      try {
        dayOfWeekFromDate = dateFromDate.get(Calendar.DAY_OF_WEEK);
      } catch (ignore) {
        if (!(ignore instanceof IllegalArgumentException)) throw ignore;
        // happens with 'dates' like '32.8.2014' - those should be caught by a different rule
        return null;
      }
      if (dayOfWeekFromString !== dayOfWeekFromDate) {
        const calFromDateString = Calendar.getInstance();
        calFromDateString.set(Calendar.DAY_OF_WEEK, dayOfWeekFromString);
        let message = javaReplace(match.getMessage(), '{realDay}', this.getDayOfWeek(dateFromDate));
        message = javaReplace(message, '{day}', this.getDayOfWeek(calFromDateString));
        message = javaReplace(message, '{currentYear}', String(Calendar.getInstance().get(Calendar.YEAR)));
        const ruleMatch = new RuleMatch(match.getRule(), match.getSentence(), match.getFromPos(), match.getToPos(), message, match.getShortMessage());
        ruleMatch.setType(match.getType());
        ruleMatch.setUrl(getUrl('https://www.timeanddate.com/calendar/?year=' + dateFromDate.get(Calendar.YEAR)));
        return ruleMatch;
      }
      return null;
    } catch (e) {
      if (e instanceof TypeError) e = new NullPointerException(); // JS TypeError stands for a Java NPE
      if (e instanceof IllegalArgumentException) throw e;
      if (e instanceof RuntimeException) {
        // special characters which the regex matches but which cannot be mapped to days: skipped
        logger.warn(`Skipping potential match for ${match.getRule().getFullId()}`, e);
        return null;
      }
      throw e;
    }
  }

  // Java: AbstractDateCheckFilter#getDate(Map) (private)
  getDate(args) {
    const yearArg = args.get('year');
    let year;
    if ((yearArg === null || yearArg === undefined) && TestHackHelper.isJUnitTest()) {
      // Volkswagen-style testing: for xml tests, we use weekdays of the year 2014
      year = 2014;
    } else if (yearArg === null || yearArg === undefined) {
      // assume current year for rule DATUM_WOCHENTAG_OHNE_JAHR etc.
      year = this.getCalendar().get(Calendar.YEAR);
    } else {
      year = Integer.parseInt(yearArg);
    }
    const month = this.getMonthFromArguments(args);
    const dayOfMonth = this.getDayOfMonthFromArguments(args);
    const calendar = this.getCalendar();
    calendar.setLenient(false); // be strict about validity of dates
    calendar.set(year, month, dayOfMonth, 0, 0, 0);
    return calendar;
  }

  // Java: AbstractDateCheckFilter#getDayOfMonthFromArguments(Map) (private)
  getDayOfMonthFromArguments(args) {
    const dayOfMonthString = this.getRequired('day', args);
    const matcherDayOfMonth = AbstractDateCheckFilter.DAY_OF_MONTH_PATTERN.matcher(dayOfMonthString);
    if (matcherDayOfMonth.matches()) {
      // The day of the month is a number, possibly with a suffix such as "22nd"
      return Integer.parseInt(matcherDayOfMonth.group(1));
    }
    // In some languages, the day of the month can also be written with letters rather than with digits
    return this.getDayOfMonth(dayOfMonthString);
  }

  // Java: AbstractDateCheckFilter#getMonthFromArguments(Map) (private)
  getMonthFromArguments(args) {
    const monthStr = this.getRequired('month', args);
    let month;
    if (isNumeric(monthStr)) {
      month = Integer.parseInt(monthStr);
    } else {
      month = this.getMonth(trimSpecialCharacters(monthStr));
    }
    return month - 1;
  }
}
