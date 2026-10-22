// Ported from DateCheckFilterTest (ru module)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { DateCheckFilter } from '../../../../src/lang/ru/rules/DateCheckFilter.js';

describe('DateCheckFilterTest (ru)', () => {
  // Java: DateCheckFilterTest#testGetDayOfWeek
  it('testGetDayOfWeek', () => {
    const filter = new DateCheckFilter();
    expect(filter.getDayOfWeek('пн')).toBe(2);
    expect(filter.getDayOfWeek('пн.')).toBe(2);
    expect(filter.getDayOfWeek('вт')).toBe(3);
    expect(filter.getDayOfWeek('пт')).toBe(6);
  });

  // Java: DateCheckFilterTest#testMonth
  it('testMonth', () => {
    const filter = new DateCheckFilter();
    expect(filter.getMonth('I')).toBe(1);
    expect(filter.getMonth('XII')).toBe(12);
    expect(filter.getMonth('декабрь')).toBe(12);
    expect(filter.getMonth('Декабрь')).toBe(12);
    expect(filter.getMonth('ДЕКАБРЬ')).toBe(12);
  });
});
