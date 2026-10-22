// Java: org.languagetool.rules.pl.DateCheckFilter
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { Calendar } from '../../../lib/java/Calendar.js';
import { Locale } from '../../../lib/java/Locale.js';
import { RuntimeException } from '../../../lib/java/errors.js';
import { toLowerCase } from '../../../lib/java/strings.js';
import { AbstractDateCheckFilter } from '../../../core/rules/AbstractDateCheckFilter.js';

// Java: DateCheckFilter (pl)
export class DateCheckFilter extends AbstractDateCheckFilter {
  static FQCN = 'org.languagetool.rules.pl.DateCheckFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.pl.DateCheckFilter()' }];

  // Java: DateCheckFilter#getCalendar()
  getCalendar() {
    return Calendar.getInstance(Locale.forLanguageTag('pl'));
  }

  // Java: DateCheckFilter#getDayOfWeek(String) and #getDayOfWeek(Calendar) (overloads, one JS method dispatching on the argument type)
  getDayOfWeek(arg) {
    if (arg instanceof Calendar) {
      return arg.getDisplayName(Calendar.DAY_OF_WEEK, Calendar.LONG, Locale.forLanguageTag('pl'));
    }
    const dayStr = arg;
    const day = toLowerCase(dayStr);
    if (day.startsWith('pon')) return Calendar.MONDAY;
    if (day.startsWith('wt')) return Calendar.TUESDAY;
    if (day.startsWith('śr')) return Calendar.WEDNESDAY;
    if (day.startsWith('czw')) return Calendar.THURSDAY;
    if (day === 'pt' || day.startsWith('piątk') || day === 'piątek') return Calendar.FRIDAY;
    if (day.startsWith('sob')) return Calendar.SATURDAY;
    if (day.startsWith('niedz')) return Calendar.SUNDAY;
    throw new RuntimeException("Could not find day of week for '" + dayStr + "'");
  }

  // Java: DateCheckFilter#getMonth(String)
  getMonth(monthStr) {
    const mon = toLowerCase(monthStr);
    if (mon === 'stycznia' || monthStr === 'I') return 1;
    if (mon === 'lutego' || monthStr === 'II') return 2;
    if (mon === 'marca' || monthStr === 'III') return 3;
    if (mon === 'kwietnia' || monthStr === 'IV') return 4;
    if (mon === 'maja' || monthStr === 'V') return 5;
    if (mon === 'czerwca' || monthStr === 'VI') return 6;
    if (mon === 'lipca' || monthStr === 'VII') return 7;
    if (mon === 'sierpnia' || monthStr === 'VIII') return 8;
    if (mon === 'września' || monthStr === 'IX') return 9;
    if (mon === 'października' || monthStr === 'X') return 10;
    if (mon === 'listopada' || monthStr === 'XI') return 11;
    if (mon === 'grudnia' || monthStr === 'XII') return 12;
    throw new RuntimeException("Could not find month '" + monthStr + "'");
  }
}

registerClass(DateCheckFilter.FQCN, DateCheckFilter);
