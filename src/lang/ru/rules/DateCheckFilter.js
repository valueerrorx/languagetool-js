// Java: org.languagetool.rules.ru.DateCheckFilter
import { registerClass } from '../../../core/resources/ClassBroker.js';
import { Calendar } from '../../../lib/java/Calendar.js';
import { Locale } from '../../../lib/java/Locale.js';
import { RuntimeException } from '../../../lib/java/errors.js';
import { toLowerCase } from '../../../lib/java/strings.js';
import { AbstractDateCheckFilter } from '../../../core/rules/AbstractDateCheckFilter.js';

// Java: DateCheckFilter (ru)
export class DateCheckFilter extends AbstractDateCheckFilter {
  static FQCN = 'org.languagetool.rules.ru.DateCheckFilter';
  static JAVA_ABSTRACT = false;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.ru.DateCheckFilter()' }];

  // Java: DateCheckFilter#getCalendar()
  getCalendar() {
    return Calendar.getInstance(Locale.forLanguageTag('ru'));
  }

  // Java: DateCheckFilter#getDayOfWeek(String) and #getDayOfWeek(Calendar) (overloads, one JS method dispatching on the argument type)
  getDayOfWeek(arg) {
    if (arg instanceof Calendar) {
      return arg.getDisplayName(Calendar.DAY_OF_WEEK, Calendar.LONG, Locale.forLanguageTag('ru'));
    }
    const dayStr = arg;
    const day = toLowerCase(dayStr);
    if (day.startsWith('пн') || day === 'понедельник') return Calendar.MONDAY;
    if (day.startsWith('вт')) return Calendar.TUESDAY;
    if (day.startsWith('ср')) return Calendar.WEDNESDAY;
    if (day.startsWith('чт') || day === 'четверг') return Calendar.THURSDAY;
    if (day === 'пт' || day.startsWith('пятниц')) return Calendar.FRIDAY;
    if (day.startsWith('сб') || day.startsWith('суббот')) return Calendar.SATURDAY;
    if (day.startsWith('вс') || day === 'воскресенье') return Calendar.SUNDAY;
    throw new RuntimeException("Could not find day of week for '" + dayStr + "'");
  }

  // Java: DateCheckFilter#getMonth(String)
  getMonth(monthStr) {
    const mon = toLowerCase(monthStr);
    if (mon === 'январь' || monthStr === 'I' || mon === 'января' || mon === 'янв') return 1;
    if (mon === 'февраль' || monthStr === 'II' || mon === 'февраля' || mon === 'фев') return 2;
    if (mon === 'март' || monthStr === 'III' || mon === 'марта' || mon === 'мар') return 3;
    if (mon === 'апрель' || monthStr === 'IV' || mon === 'апреля' || mon === 'апр') return 4;
    if (mon === 'май' || monthStr === 'V' || mon === 'мая') return 5;
    if (mon === 'июнь' || monthStr === 'VI' || mon === 'июня' || mon === 'ин') return 6;
    if (mon === 'июль' || monthStr === 'VII' || mon === 'июля' || mon === 'ил') return 7;
    if (mon === 'август' || monthStr === 'VIII' || mon === 'августа' || mon === 'авг') return 8;
    if (mon === 'сентябрь' || monthStr === 'IX' || mon === 'сентября' || mon === 'сен') return 9;
    if (mon === 'октябрь' || monthStr === 'X' || mon === 'октября' || mon === 'окт') return 10;
    if (mon === 'ноябрь' || monthStr === 'XI' || mon === 'ноября' || mon === 'ноя') return 11;
    if (mon === 'декабрь' || monthStr === 'XII' || mon === 'декабря' || mon === 'дек') return 12;
    throw new RuntimeException("Could not find month '" + monthStr + "'");
  }
}

registerClass(DateCheckFilter.FQCN, DateCheckFilter);
