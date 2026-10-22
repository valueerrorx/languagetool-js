// Java: org.languagetool.rules.es.DateFilterHelper (package-private)
import { Calendar } from '../../../lib/java/Calendar.js';
import { Locale } from '../../../lib/java/Locale.js';
import { RuntimeException } from '../../../lib/java/errors.js';
import { toLowerCase } from '../../../lib/java/strings.js';

// Java: DateFilterHelper
export class DateFilterHelper {
  static FQCN = 'org.languagetool.rules.es.DateFilterHelper';

  // Java: DateFilterHelper#getCalendar()
  getCalendar() {
    return Calendar.getInstance(Locale.FRANCE);
  }

  // Java: DateFilterHelper#getDayOfWeek(String) and #getDayOfWeek(Calendar) (overloads, one JS method dispatching on the argument type)
  getDayOfWeek(arg) {
    if (arg instanceof Calendar) {
      const englishDay = arg.getDisplayName(Calendar.DAY_OF_WEEK, Calendar.LONG, Locale.UK);
      if (englishDay === 'Sunday') return 'domingo';
      if (englishDay === 'Monday') return 'lunes';
      if (englishDay === 'Tuesday') return 'martes';
      if (englishDay === 'Wednesday') return 'miércoles';
      if (englishDay === 'Thursday') return 'jueves';
      if (englishDay === 'Friday') return 'viernes';
      if (englishDay === 'Saturday') return 'sábado';
      return '';
    }
    const dayStr = arg;
    const day = toLowerCase(dayStr);
    if (day === 'do' || day === 'domingo') return Calendar.SUNDAY;
    if (day === 'lu' || day === 'lunes') return Calendar.MONDAY;
    if (day === 'ma' || day === 'martes') return Calendar.TUESDAY;
    if (day === 'mi' || day === 'miércoles') return Calendar.WEDNESDAY;
    if (day === 'ju' || day === 'jueves') return Calendar.THURSDAY;
    if (day === 'vi' || day === 'viernes') return Calendar.FRIDAY;
    if (day === 'sa' || day === 'sábado') return Calendar.SATURDAY;
    throw new RuntimeException("Could not find day of week for '" + dayStr + "'");
  }

  // Java: DateFilterHelper#getMonth(String)
  getMonth(monthStr) {
    const mon = toLowerCase(monthStr);
    if (mon.startsWith('en')) return 1;
    if (mon.startsWith('fe')) return 2;
    if (mon.startsWith('mar') || mon.startsWith('mzo')) return 3;
    if (mon.startsWith('ab')) return 4;
    if (mon.startsWith('may') || mon.startsWith('my')) return 5;
    if (mon.startsWith('jun') || mon === 'jn') return 6;
    if (mon.startsWith('jul') || mon === 'jl') return 7;
    if (mon.startsWith('ag')) return 8;
    if (mon.startsWith('se') || mon.startsWith('sep')) return 9;
    if (mon.startsWith('oc')) return 10;
    if (mon.startsWith('no')) return 11;
    if (mon.startsWith('di')) return 12;
    throw new RuntimeException("Could not find month '" + monthStr + "'");
  }
}
