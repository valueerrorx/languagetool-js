// Ported from DateCheckFilterTest (en module)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { DateCheckFilter } from '../../../../src/lang/en/rules/DateCheckFilter.js';

describe('DateCheckFilterTest', () => {
  // Java: DateCheckFilterTest#testGetDayOfWeek
  it('testGetDayOfWeek', () => {
    const filter = new DateCheckFilter();
    expect(filter.getDayOfWeek('Sun')).toBe(1);
    expect(filter.getDayOfWeek('Mon')).toBe(2);
    expect(filter.getDayOfWeek('mon')).toBe(2);
    expect(filter.getDayOfWeek('Mon.')).toBe(2);
    expect(filter.getDayOfWeek('Monday')).toBe(2);
    expect(filter.getDayOfWeek('monday')).toBe(2);
    expect(filter.getDayOfWeek('Tue')).toBe(3);
    expect(filter.getDayOfWeek('Fri')).toBe(6);
    expect(filter.getDayOfWeek('Fr')).toBe(6);
    expect(filter.getDayOfWeek('Saturday')).toBe(7);
  });

  // Java: DateCheckFilterTest#testMonth
  it('testMonth', () => {
    const filter = new DateCheckFilter();
    expect(filter.getMonth('jan')).toBe(1);
    expect(filter.getMonth('dec')).toBe(12);
    expect(filter.getMonth('december')).toBe(12);
    expect(filter.getMonth('December')).toBe(12);
    expect(filter.getMonth('DECEMBER')).toBe(12);
  });
});
