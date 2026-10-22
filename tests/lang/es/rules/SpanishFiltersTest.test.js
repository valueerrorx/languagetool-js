// Extra tests for the Spanish rule filters (no Java JUnit exists; behaviour checked against the X-ESCHECK fixtures)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { Calendar } from '../../../../src/lib/java/Calendar.js';
import { RuntimeException } from '../../../../src/lib/java/errors.js';
import { DateCheckFilter } from '../../../../src/lang/es/rules/DateCheckFilter.js';
import { ConfusionPairsDataLoader } from '../../../../src/lang/es/rules/ConfusionPairsDataLoader.js';
import { TextToNumberFilter } from '../../../../src/lang/es/rules/TextToNumberFilter.js';

describe('SpanishFiltersTest', () => {
  it('testDayOfWeekAndMonth', () => {
    const filter = new DateCheckFilter();
    expect(filter.getDayOfWeek('Lunes')).toBe(Calendar.MONDAY);
    expect(filter.getDayOfWeek('sa')).toBe(Calendar.SATURDAY);
    expect(() => filter.getDayOfWeek('xyz')).toThrow(RuntimeException);
    expect(filter.getMonth('Mzo')).toBe(3);
    expect(filter.getMonth('jn')).toBe(6);
    expect(filter.getMonth('dic')).toBe(12);
    expect(() => filter.getMonth('xyz')).toThrow(RuntimeException);
  });

  it('testConfusionPairsAndTextToNumber', () => {
    const words = new ConfusionPairsDataLoader().loadWords('/es/confusion_pairs.txt');
    expect(words.size).toBe(827);
    const f = new TextToNumberFilter();
    expect(f.isComma('Coma')).toBe(true);
    expect(f.isComma('x')).toBe(false);
  });
});
