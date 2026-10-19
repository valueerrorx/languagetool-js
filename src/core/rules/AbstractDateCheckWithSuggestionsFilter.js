// org.languagetool.rules.AbstractDateCheckWithSuggestionsFilter
import { AbstractMethodError, IllegalArgumentException, NullPointerException, RuntimeException } from '../../lib/java/errors.js';
import { Calendar } from '../../lib/java/Calendar.js';
import { Integer } from '../../lib/java/int.js';
import { Pattern } from '../../lib/java/regex/index.js';
import { javaReplace, javaSplit, StringBuilder } from '../../lib/java/strings.js';
import { arrayGet } from '../../lib/java/arrays.js';
import { isNumeric } from '../../lib/java/StringUtils.js';
import { preserveCase, trimSpecialCharacters } from '../text/StringTools.js';
import { getUrl } from '../Tools.js';
import { RuleFilter } from '../patterns/RuleFilter.js';
import { RuleMatch } from './model/RuleMatch.js';
import { TestHackHelper } from './TestHackHelper.js';

// Java: AbstractDateCheckWithSuggestionsFilter
export class AbstractDateCheckWithSuggestionsFilter extends RuleFilter {
  static FQCN = 'org.languagetool.rules.AbstractDateCheckWithSuggestionsFilter';
  static JAVA_ABSTRACT = true;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.AbstractDateCheckWithSuggestionsFilter()' }];
  // The day of the month may contain not only digits but also extra letters such as "22nd" in English or "22-an" in Esperanto.
  static DAY_OF_MONTH_PATTERN = Pattern.compile('(\\d+).*');

  // Java: AbstractDateCheckWithSuggestionsFilter#getDayOfWeek(String) and #getDayOfWeek(Calendar) (overloads, one JS method dispatching on the argument type)
  getDayOfWeek() {
    throw new AbstractMethodError('org.languagetool.rules.AbstractDateCheckWithSuggestionsFilter.getDayOfWeek');
  }

  // Java: AbstractDateCheckWithSuggestionsFilter#getDayOfMonth(String)
  getDayOfMonth() {
    return 0;
  }

  // Java: AbstractDateCheckWithSuggestionsFilter#getMonth(String) (abstract)
  getMonth() {
    throw new AbstractMethodError('org.languagetool.rules.AbstractDateCheckWithSuggestionsFilter.getMonth');
  }

  // Java: AbstractDateCheckWithSuggestionsFilter#getCalendar() (abstract)
  getCalendar() {
    throw new AbstractMethodError('org.languagetool.rules.AbstractDateCheckWithSuggestionsFilter.getCalendar');
  }

  // Java: AbstractDateCheckWithSuggestionsFilter#getErrorMessageWrongYear() (abstract)
  getErrorMessageWrongYear() {
    throw new AbstractMethodError('org.languagetool.rules.AbstractDateCheckWithSuggestionsFilter.getErrorMessageWrongYear');
  }

  // Java: AbstractDateCheckWithSuggestionsFilter#acceptRuleMatch(RuleMatch,Map,int,AnalyzedTokenReadings[],List)
  acceptRuleMatch(match, args, patternTokenPos, patternTokens, tokenPositions) {
    try {
      const dayOfWeekPos = this.getSkipCorrectedReference(tokenPositions, Integer.parseInt(this.getRequired('weekDay', args)));
      const dayOfWeekStr = javaReplace(arrayGet(patternTokens, dayOfWeekPos).getToken(), '­', ''); // replace soft hyphen
      let dayPos;
      let monthPos;
      let yearPos;
      let dayStr;
      let monthStr;
      let yearStr;
      let isFullDateToken = false;
      const fullDatePos = this.getSkipCorrectedReference(tokenPositions, Integer.parseInt(this.getOptional('date', args, '-1'))); // format yyyy-mm-dd
      if (fullDatePos > -1) {
        const parts = javaSplit(arrayGet(patternTokens, fullDatePos).getToken(), '-');
        isFullDateToken = true;
        dayPos = fullDatePos;
        monthPos = fullDatePos;
        yearPos = fullDatePos;
        dayStr = arrayGet(parts, 2);
        monthStr = arrayGet(parts, 1);
        yearStr = arrayGet(parts, 0);
      } else {
        dayPos = this.getSkipCorrectedReference(tokenPositions, Integer.parseInt(this.getRequired('day', args)));
        monthPos = this.getSkipCorrectedReference(tokenPositions, Integer.parseInt(this.getRequired('month', args)));
        yearPos = this.getSkipCorrectedReference(tokenPositions, Integer.parseInt(this.getOptional('year', args, '-1')));
        dayStr = arrayGet(patternTokens, dayPos).getToken();
        monthStr = arrayGet(patternTokens, monthPos).getToken();
        yearStr = (yearPos > -1 ? arrayGet(patternTokens, yearPos).getToken() : null);
      }
      const dayOfWeekFromString = this.getDayOfWeek(dayOfWeekStr);
      const day = this.getDayOfMonthFromStr(dayStr);
      const month = this.getMonthFromStr(monthStr);
      const year = this.getYearFromStr(yearStr);
      const dateFromDate = this.getDate(day, month, year);
      const dayOfWeekFromDate = this.getDayOfWeekFromDate(dateFromDate);
      if (dayOfWeekFromDate === -1) {
        return null;
      }
      if (dayOfWeekFromString !== dayOfWeekFromDate) {
        const calFromDateString = Calendar.getInstance();
        calFromDateString.set(Calendar.DAY_OF_WEEK, dayOfWeekFromString);
        let message;
        // suggest changing the year (to current year)
        const currentYear = this.getYearFromStr(null);
        const dateFromDateChangeYear = this.getDate(day, month, currentYear);
        const dayOfWeekFromDateChangeYear = this.getDayOfWeekFromDate(dateFromDateChangeYear);
        if (dayOfWeekFromString === dayOfWeekFromDateChangeYear) {
          message = javaReplace(this.getErrorMessageWrongYear(), '{currentYear}', String(currentYear));
          const yearToken = arrayGet(patternTokens, yearPos);
          const ruleMatch = new RuleMatch(match.getRule(), match.getSentence(), yearToken.getStartPos(), yearToken.getEndPos(), message, match.getShortMessage());
          ruleMatch.setType(match.getType());
          ruleMatch.setUrl(getUrl('https://www.timeanddate.com/calendar/?year=' + dateFromDateChangeYear.get(Calendar.YEAR)));
          if (isFullDateToken) {
            ruleMatch.setSuggestedReplacement(currentYear + '-' + monthStr + '-' + dayStr);
          } else {
            ruleMatch.setSuggestedReplacement(String(currentYear));
          }
          return ruleMatch;
        }
        // suggest changing day of week or day of month
        message = javaReplace(match.getMessage(), '{realDay}', this.getDayOfWeek(dateFromDate));
        message = javaReplace(message, '{day}', this.getDayOfWeek(calFromDateString));
        message = javaReplace(message, '{currentYear}', String(Calendar.getInstance().get(Calendar.YEAR)));
        let startIndex;
        let endIndex;
        if (dayOfWeekPos < dayPos) {
          startIndex = dayOfWeekPos;
          endIndex = dayPos;
        } else {
          startIndex = dayPos;
          endIndex = dayOfWeekPos;
        }
        const ruleMatch = new RuleMatch(match.getRule(), match.getSentence(), arrayGet(patternTokens, startIndex).getStartPos(),
          arrayGet(patternTokens, endIndex).getEndPos(), message, match.getShortMessage());
        ruleMatch.setType(match.getType());
        ruleMatch.setUrl(getUrl('https://www.timeanddate.com/calendar/?year=' + dateFromDate.get(Calendar.YEAR)));
        // suggest changing day of week
        let suggestion = new StringBuilder();
        let isFirst = true;
        for (let j = startIndex; j <= endIndex; j++) {
          if (isFirst) {
            isFirst = false;
          } else if (arrayGet(patternTokens, j).isWhitespaceBefore()) {
            suggestion.append(' ');
          }
          if (j === dayOfWeekPos) {
            suggestion.append(preserveCase(this.getDayOfWeek(dateFromDate), dayOfWeekStr));
          } else {
            suggestion.append(arrayGet(patternTokens, j).getToken());
          }
        }
        if (suggestion.toString().length !== 0) {
          ruleMatch.setSuggestedReplacement(this.adjustSuggestion(suggestion.toString()));
        }
        // suggest changing day of month
        const correctedDayofMonth = this.findNewDayOfMonth(day, month, year, dayOfWeekFromString);
        if (correctedDayofMonth.length !== 0) {
          suggestion = new StringBuilder();
          isFirst = true;
          for (let j = startIndex; j <= endIndex; j++) {
            if (isFirst) {
              isFirst = false;
            } else if (arrayGet(patternTokens, j).isWhitespaceBefore()) {
              suggestion.append(' ');
            }
            if (j === dayPos) {
              if (isFullDateToken) {
                suggestion.append(yearStr + '-' + monthStr + '-' + correctedDayofMonth);
              } else {
                suggestion.append(this.getDayStrLikeOriginal(correctedDayofMonth, dayStr));
              }
            } else {
              suggestion.append(arrayGet(patternTokens, j).getToken());
            }
          }
          if (suggestion.toString().length !== 0) {
            ruleMatch.addSuggestedReplacement(this.adjustSuggestion(suggestion.toString()));
          }
        }
        return ruleMatch;
      }
      return null;
    } catch (e) {
      if (e instanceof TypeError) e = new NullPointerException(); // JS TypeError stands for a Java NPE
      if (e instanceof IllegalArgumentException) throw e;
      if (e instanceof RuntimeException) {
        // special characters which the regex matches but which cannot be mapped to days: skipped
        return null;
      }
      throw e;
    }
  }

  // Java: AbstractDateCheckWithSuggestionsFilter#findNewDayOfMonth(int,int,int,int) (private)
  findNewDayOfMonth(day, month, year, dayOfWeekFromString) {
    let difference = 1;
    while (difference < 7) {
      if (day - difference > 0) {
        const dateFromDate = this.getDate(day - difference, month, year);
        const dayOfWeekFromDate = this.getDayOfWeekFromDate(dateFromDate);
        if (dayOfWeekFromString === dayOfWeekFromDate) {
          return String(day - difference);
        }
      }
      if (day + difference < 32) {
        const dateFromDate = this.getDate(day + difference, month, year);
        const dayOfWeekFromDate = this.getDayOfWeekFromDate(dateFromDate);
        if (dayOfWeekFromString === dayOfWeekFromDate) {
          return String(day + difference);
        }
      }
      difference++;
    }
    return '';
  }

  // Java: AbstractDateCheckWithSuggestionsFilter#getDayOfWeekFromDate(Calendar) (private)
  getDayOfWeekFromDate(dateFromDate) {
    let dayOfWeekFromDate;
    try {
      dayOfWeekFromDate = dateFromDate.get(Calendar.DAY_OF_WEEK);
    } catch (ignore) {
      if (!(ignore instanceof IllegalArgumentException)) throw ignore;
      // happens with 'dates' like '32.8.2014' - those should be caught by a different rule
      return -1;
    }
    return dayOfWeekFromDate;
  }

  // Java: AbstractDateCheckWithSuggestionsFilter#getDate(int,int,int)
  getDate(dayOfMonth, month, year) {
    const calendar = this.getCalendar();
    calendar.setLenient(false); // be strict about validity of dates
    calendar.set(year, month, dayOfMonth, 0, 0, 0);
    return calendar;
  }

  // Java: AbstractDateCheckWithSuggestionsFilter#getYearFromStr(String) (private)
  getYearFromStr(yearArg) {
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
    return year;
  }

  // Java: AbstractDateCheckWithSuggestionsFilter#getDayOfMonthFromStr(String) (private)
  getDayOfMonthFromStr(dayOfMonthString) {
    const matcherDayOfMonth = AbstractDateCheckWithSuggestionsFilter.DAY_OF_MONTH_PATTERN.matcher(dayOfMonthString);
    if (matcherDayOfMonth.matches()) {
      // The day of the month is a number, possibly with a suffix such as "22nd"
      return Integer.parseInt(matcherDayOfMonth.group(1));
    }
    // In some languages, the day of the month can also be written with letters rather than with digits
    return this.getDayOfMonth(dayOfMonthString);
  }

  // Java: AbstractDateCheckWithSuggestionsFilter#getMonthFromStr(String) (private)
  getMonthFromStr(monthStr) {
    let month;
    if (isNumeric(monthStr)) {
      month = Integer.parseInt(monthStr);
    } else {
      month = this.getMonth(trimSpecialCharacters(monthStr));
    }
    return month - 1;
  }

  // Java: AbstractDateCheckWithSuggestionsFilter#getDayStrLikeOriginal(String,String)
  getDayStrLikeOriginal(day) {
    return day;
  }

  // Java: AbstractDateCheckWithSuggestionsFilter#adjustSuggestion(String) (typographical adjustments needed in some language)
  adjustSuggestion(sugg) {
    return sugg;
  }
}
