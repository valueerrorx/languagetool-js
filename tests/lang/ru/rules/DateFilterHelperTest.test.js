// Extra test (ru DateFilterHelper has no Java test; values from a JDK 17 probe)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { Calendar } from '../../../../src/lib/java/Calendar.js';
import { Locale } from '../../../../src/lib/java/Locale.js';
import { DateFilterHelper } from '../../../../src/lang/ru/rules/DateFilterHelper.js';

describe('DateFilterHelper (ru)', () => {
  // Java: DateFilterHelper#getDayOfWeek(Calendar)
  it('day names of Locale ru', () => {
    const h = new DateFilterHelper();
    const cal = h.getCalendar();
    cal.set(Calendar.DAY_OF_WEEK, Calendar.WEDNESDAY);
    expect(h.getDayOfWeek(cal)).toBe('среда');
    cal.set(Calendar.DAY_OF_MONTH, 1);
    cal.set(Calendar.MONTH, 2);
    expect(cal.getDisplayName(Calendar.MONTH, Calendar.LONG, Locale.forLanguageTag('ru'))).toBe('марта');
    expect(cal.getDisplayName(Calendar.MONTH, Calendar.SHORT, Locale.forLanguageTag('ru'))).toBe('мар.');
  });

  // Java: DateFilterHelper#getDayOfWeek(String), #getMonth(String)
  it('prefix tables', () => {
    const h = new DateFilterHelper();
    expect(h.getDayOfWeek('Суббота')).toBe(Calendar.SATURDAY);
    expect(h.getDayOfWeek('вос')).toBe(Calendar.SUNDAY);
    expect(h.getMonth('Мая')).toBe(5);
    expect(h.getMonth('дек.')).toBe(12);
    expect(() => h.getMonth('xyz')).toThrow("Could not find month 'xyz'");
    expect(() => h.getDayOfWeek('xyz')).toThrow("Could not find day of week for 'xyz'");
  });
});
