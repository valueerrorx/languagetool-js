// Java: org.languagetool.rules.it.DateCheckFilter
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { Calendar } from '../../../lib/java/Calendar.js';
import { Locale } from '../../../lib/java/Locale.js';
import { RuntimeException } from '../../../lib/java/errors.js';
import { toLowerCase } from '../../../lib/java/strings.js';
import { AbstractDateCheckFilter } from '../../../core/rules/AbstractDateCheckFilter.js';

// Java: DateCheckFilter
export class DateCheckFilter extends AbstractDateCheckFilter {
  static FQCN = 'org.languagetool.rules.it.DateCheckFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.it.DateCheckFilter()' }];

  // Java: DateCheckFilter#getCalendar()
  getCalendar() {
    return Calendar.getInstance(Locale.UK);
  }

  // Java: DateCheckFilter#getDayOfWeek(String) and #getDayOfWeek(Calendar) (overloads, one JS method dispatching on the argument type)
  getDayOfWeek(arg) {
    if (arg instanceof Calendar) {
      const englishDay = arg.getDisplayName(Calendar.DAY_OF_WEEK, Calendar.LONG, Locale.UK);
      if (englishDay === 'Sunday') return 'domenica';
      if (englishDay === 'Monday') return 'lunedì';
      if (englishDay === 'Tuesday') return 'martedì';
      if (englishDay === 'Wednesday') return 'mercoledì';
      if (englishDay === 'Thursday') return 'giovedì';
      if (englishDay === 'Friday') return 'venerdì';
      if (englishDay === 'Saturday') return 'sabato';
      return '';
    }
    const dayStr = arg;
    const day = toLowerCase(dayStr);
    if (day.startsWith('do') || day === 'domenica') return Calendar.SUNDAY;
    if (day.startsWith('lu') || day === 'lunedì') return Calendar.MONDAY;
    if (day.startsWith('ma') || day === 'martedì') return Calendar.TUESDAY;
    if (day.startsWith('me') || day === 'mercoledì') return Calendar.WEDNESDAY;
    if (day.startsWith('gi') || day === 'giovedì') return Calendar.THURSDAY;
    if (day.startsWith('ve') || day === 'venerdì') return Calendar.FRIDAY;
    if (day.startsWith('sa') || day === 'sabato') return Calendar.SATURDAY;
    throw new RuntimeException("Could not find day of week for '" + dayStr + "'");
  }

  // Java: DateCheckFilter#getMonth(String)
  getMonth(monthStr) {
    const mon = toLowerCase(monthStr);
    if (mon.startsWith('gen')) return 1;
    if (mon.startsWith('feb')) return 2;
    if (mon.startsWith('mar')) return 3;
    if (mon.startsWith('apr')) return 4;
    if (mon.startsWith('mag')) return 5;
    if (mon.startsWith('giu')) return 6;
    if (mon.startsWith('lug')) return 7;
    if (mon.startsWith('ago')) return 8;
    if (mon.startsWith('set')) return 9;
    if (mon.startsWith('ott')) return 10;
    if (mon.startsWith('nov')) return 11;
    if (mon.startsWith('dic')) return 12;
    throw new RuntimeException("Could not find month '" + monthStr + "'");
  }
}

registerClass(DateCheckFilter.FQCN, DateCheckFilter);
