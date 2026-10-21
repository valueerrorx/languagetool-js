// org.languagetool.rules.fr.DateFilterHelper (package-private)
import { Calendar } from '../../../lib/java/Calendar.js';
import { Locale } from '../../../lib/java/Locale.js';
import { RuntimeException } from '../../../lib/java/errors.js';
import { toLowerCase } from '../../../lib/java/strings.js';

// Java: DateFilterHelper
export class DateFilterHelper {
  static FQCN = 'org.languagetool.rules.fr.DateFilterHelper';

  // Java: DateFilterHelper#getCalendar()
  getCalendar() {
    return Calendar.getInstance(Locale.FRENCH);
  }

  // Java: DateFilterHelper#getDayOfWeek(String) and #getDayOfWeek(Calendar) (overloads, one JS method dispatching on the argument type)
  getDayOfWeek(arg) {
    if (arg instanceof Calendar) {
      return arg.getDisplayName(Calendar.DAY_OF_WEEK, Calendar.LONG, Locale.FRENCH);
    }
    const dayStr = arg;
    const day = toLowerCase(dayStr);
    if (day.startsWith('dim')) return Calendar.SUNDAY;
    if (day.startsWith('lun')) return Calendar.MONDAY;
    if (day.startsWith('mar')) return Calendar.TUESDAY;
    if (day.startsWith('mer')) return Calendar.WEDNESDAY;
    if (day.startsWith('jeu')) return Calendar.THURSDAY;
    if (day.startsWith('ven')) return Calendar.FRIDAY;
    if (day.startsWith('sam')) return Calendar.SATURDAY;
    throw new RuntimeException("Could not find day of week for '" + dayStr + "'");
  }

  // Java: DateFilterHelper#getMonth(String)
  getMonth(monthStr) {
    const mon = toLowerCase(monthStr);
    if (mon.startsWith('jan')) return 1;
    if (mon.startsWith('fév')) return 2;
    if (mon.startsWith('fev')) return 2;
    if (mon.startsWith('mar')) return 3;
    if (mon.startsWith('avr')) return 4;
    if (mon.startsWith('mai')) return 5;
    // "juin" and "juillet" are never abbreviated with 3 letters
    // since it would be ambiguous (both start with "jui").
    if (mon.startsWith('juin')) return 6;
    if (mon.startsWith('juil')) return 7;
    if (mon.startsWith('aou') ||
        mon.startsWith('aoû')) return 8;
    if (mon.startsWith('sep')) return 9;
    if (mon.startsWith('oct')) return 10;
    if (mon.startsWith('nov')) return 11;
    if (mon.startsWith('déc')) return 12;
    if (mon.startsWith('dec')) return 12;
    throw new RuntimeException("Could not find month '" + monthStr + "'");
  }
}
