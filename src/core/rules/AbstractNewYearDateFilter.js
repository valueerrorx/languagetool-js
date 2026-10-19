// org.languagetool.rules.AbstractNewYearDateFilter
import { AbstractMethodError, IllegalArgumentException } from '../../lib/java/errors.js';
import { Calendar } from '../../lib/java/Calendar.js';
import { Integer } from '../../lib/java/int.js';
import { Pattern } from '../../lib/java/regex/index.js';
import { javaReplace } from '../../lib/java/strings.js';
import { isNumeric } from '../../lib/java/StringUtils.js';
import { RuleFilter } from '../patterns/RuleFilter.js';
import { RuleMatch } from './model/RuleMatch.js';
import { TestHackHelper } from './TestHackHelper.js';

// The day of the month may contain not only digits but also extra letters such as "22nd" in English or "22-an" in Esperanto.
const DAY_OF_MONTH_PATTERN = Pattern.compile('(\\d+).*');

// Java: AbstractNewYearDateFilter
export class AbstractNewYearDateFilter extends RuleFilter {
  static FQCN = 'org.languagetool.rules.AbstractNewYearDateFilter';
  static JAVA_ABSTRACT = true;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.AbstractNewYearDateFilter()' }];

  // Java: AbstractNewYearDateFilter#isJanuary()
  isJanuary() {
    if (TestHackHelper.isJUnitTest()) {
      return true;
    }
    return this.getCalendar().get(Calendar.MONTH) === Calendar.JANUARY;
  }

  // Java: AbstractNewYearDateFilter#getCurrentYear()
  getCurrentYear() {
    if (TestHackHelper.isJUnitTest()) {
      return 2014;
    }
    return this.getCalendar().get(Calendar.YEAR);
  }

  // Java: AbstractNewYearDateFilter#getMonth(String) (abstract)
  getMonth() {
    throw new AbstractMethodError('org.languagetool.rules.AbstractNewYearDateFilter.getMonth');
  }

  // Java: AbstractNewYearDateFilter#getCalendar() (abstract)
  getCalendar() {
    throw new AbstractMethodError('org.languagetool.rules.AbstractNewYearDateFilter.getCalendar');
  }

  // Java: AbstractNewYearDateFilter#getDayOfMonth(String)
  getDayOfMonth() {
    return 0;
  }

  // Java: AbstractNewYearDateFilter#acceptRuleMatch(RuleMatch,Map,int,AnalyzedTokenReadings[],List)
  acceptRuleMatch(match, args) {
    const dateFromText = this.getDate(args);
    let monthFromText;
    let yearFromText;
    try {
      monthFromText = dateFromText.get(Calendar.MONTH);
      yearFromText = dateFromText.get(Calendar.YEAR);
    } catch (e) {
      if (!(e instanceof IllegalArgumentException)) throw e;
      return null; // date is not valid; another rule is responsible
    }
    const currentYear = this.getCurrentYear();
    if (this.isJanuary() && monthFromText !== 11 /* December */ && yearFromText + 1 === currentYear) {
      let message = javaReplace(match.getMessage(), '{year}', String(yearFromText));
      message = javaReplace(message, '{realYear}', String(currentYear));
      const ruleMatch = new RuleMatch(match.getRule(), match.getSentence(), match.getFromPos(), match.getToPos(), message, match.getShortMessage());
      ruleMatch.setType(match.getType());
      return ruleMatch;
    }
    return null;
  }

  // Java: AbstractNewYearDateFilter#getDate(Map) (private)
  getDate(args) {
    const year = Integer.parseInt(this.getRequired('year', args));
    const month = this.getMonthFromArguments(args);
    const dayOfMonth = this.getDayOfMonthFromArguments(args);
    const calendar = this.getCalendar();
    calendar.setLenient(false); // be strict about validity of dates
    calendar.set(year, month, dayOfMonth, 0, 0, 0);
    return calendar;
  }

  // Java: AbstractNewYearDateFilter#getDayOfMonthFromArguments(Map) (private)
  getDayOfMonthFromArguments(args) {
    const dayOfMonthString = javaReplace(this.getRequired('day', args), '­', ''); // replace soft hyphen
    const matcherDayOfMonth = DAY_OF_MONTH_PATTERN.matcher(dayOfMonthString);
    if (matcherDayOfMonth.matches()) {
      return Integer.parseInt(matcherDayOfMonth.group(1));
    }
    return this.getDayOfMonth(dayOfMonthString);
  }

  // Java: AbstractNewYearDateFilter#getMonthFromArguments(Map) (private)
  getMonthFromArguments(args) {
    const monthStr = javaReplace(this.getRequired('month', args), '­', ''); // replace soft hyphen
    let month;
    if (isNumeric(monthStr)) {
      month = Integer.parseInt(monthStr);
    } else {
      month = this.getMonth(monthStr);
    }
    return month - 1;
  }
}
