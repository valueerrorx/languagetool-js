// Java: org.languagetool.rules.ru.DateFilterHelper (package-private)
import { Calendar } from '../../../lib/java/Calendar.js';
import { Locale } from '../../../lib/java/Locale.js';
import { RuntimeException } from '../../../lib/java/errors.js';
import { toLowerCase } from '../../../lib/java/strings.js';
import { trimSpecialCharacters } from '../../../core/text/StringTools.js';

// Java: DateFilterHelper
export class DateFilterHelper {
  static FQCN = 'org.languagetool.rules.ru.DateFilterHelper';

  // Java: DateFilterHelper#getCalendar()
  getCalendar() {
    return Calendar.getInstance(Locale.forLanguageTag('ru'));
  }

  // Java: DateFilterHelper#getDayOfWeek(String) and #getDayOfWeek(Calendar) (overloads, one JS method dispatching on the argument type)
  getDayOfWeek(arg) {
    if (arg instanceof Calendar) {
      return arg.getDisplayName(Calendar.DAY_OF_WEEK, Calendar.LONG, Locale.forLanguageTag('ru'));
    }
    const dayStr = arg;
    const day = toLowerCase(trimSpecialCharacters(dayStr)); // quickfix for special characters like soft hyphens
    if (day.startsWith('суб')) return Calendar.SATURDAY;
    if (day.startsWith('вс')) return Calendar.SUNDAY;
    if (day.startsWith('вос')) return Calendar.SUNDAY;
    if (day.startsWith('пн')) return Calendar.MONDAY;
    if (day.startsWith('пон')) return Calendar.MONDAY;
    if (day.startsWith('вт')) return Calendar.TUESDAY;
    if (day.startsWith('ср')) return Calendar.WEDNESDAY;
    if (day.startsWith('чт')) return Calendar.THURSDAY;
    if (day.startsWith('чет')) return Calendar.THURSDAY;
    if (day.startsWith('пт')) return Calendar.FRIDAY;
    if (day.startsWith('пят')) return Calendar.FRIDAY;
    if (day.startsWith('сб')) return Calendar.SATURDAY;
    throw new RuntimeException("Could not find day of week for '" + dayStr + "'");
  }

  // Java: DateFilterHelper#getMonth(String)
  getMonth(monthStr) {
    const mon = toLowerCase(trimSpecialCharacters(monthStr));
    if (mon.startsWith('янв')) return 1;
    if (mon.startsWith('фев')) return 2;
    if (mon.startsWith('мар')) return 3;
    if (mon.startsWith('апр')) return 4;
    if (mon.startsWith('май')) return 5;
    if (mon.startsWith('мая')) return 5;
    if (mon.startsWith('июн')) return 6;
    if (mon.startsWith('июл')) return 7;
    if (mon.startsWith('авг')) return 8;
    if (mon.startsWith('сен')) return 9;
    if (mon.startsWith('окт')) return 10;
    if (mon.startsWith('ноя')) return 11;
    if (mon.startsWith('дек')) return 12;
    throw new RuntimeException("Could not find month '" + monthStr + "'");
  }
}
