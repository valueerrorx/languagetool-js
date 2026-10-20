// org.languagetool.rules.en.DateFilterHelper (package-private)
import { Calendar } from '../../../lib/java/Calendar.js';
import { Locale } from '../../../lib/java/Locale.js';
import { RuntimeException } from '../../../lib/java/errors.js';
import { toLowerCase } from '../../../lib/java/strings.js';
import { trimSpecialCharacters } from '../../../core/text/StringTools.js';

// Java: DateFilterHelper
export class DateFilterHelper {
  static FQCN = 'org.languagetool.rules.en.DateFilterHelper';

  // Java: DateFilterHelper#getCalendar()
  getCalendar() {
    return Calendar.getInstance(Locale.UK);
  }

  // Java: DateFilterHelper#getDayOfWeek(String) and #getDayOfWeek(Calendar) (overloads, one JS method dispatching on the argument type)
  getDayOfWeek(arg) {
    if (arg instanceof Calendar) {
      return arg.getDisplayName(Calendar.DAY_OF_WEEK, Calendar.LONG, Locale.UK);
    }
    const dayStr = arg;
    const day = toLowerCase(trimSpecialCharacters(dayStr));
    if (day.startsWith('su')) return Calendar.SUNDAY;
    if (day.startsWith('mo')) return Calendar.MONDAY;
    if (day.startsWith('tu')) return Calendar.TUESDAY;
    if (day.startsWith('we')) return Calendar.WEDNESDAY;
    if (day.startsWith('th')) return Calendar.THURSDAY;
    if (day.startsWith('fr')) return Calendar.FRIDAY;
    if (day.startsWith('sa')) return Calendar.SATURDAY;
    throw new RuntimeException("Could not find day of week for '" + dayStr + "'");
  }

  // Java: DateFilterHelper#getMonth(String)
  getMonth(monthStr) {
    const mon = toLowerCase(trimSpecialCharacters(monthStr));
    if (mon.startsWith('jan')) return 1;
    if (mon.startsWith('feb')) return 2;
    if (mon.startsWith('mar')) return 3;
    if (mon.startsWith('apr')) return 4;
    if (mon.startsWith('may')) return 5;
    if (mon.startsWith('jun')) return 6;
    if (mon.startsWith('jul')) return 7;
    if (mon.startsWith('aug')) return 8;
    if (mon.startsWith('sep')) return 9;
    if (mon.startsWith('oct')) return 10;
    if (mon.startsWith('nov')) return 11;
    if (mon.startsWith('dec')) return 12;
    throw new RuntimeException("Could not find month '" + monthStr + "'");
  }
}
