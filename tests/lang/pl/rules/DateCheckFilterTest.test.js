// Ported from DateCheckFilterTest (pl module)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { DateCheckFilter } from '../../../../src/lang/pl/rules/DateCheckFilter.js';

describe('DateCheckFilterTest (pl)', () => {
  // Java: DateCheckFilterTest#testGetDayOfWeek
  it('testGetDayOfWeek', () => {
    const filter = new DateCheckFilter();
    expect(filter.getDayOfWeek('niedz')).toBe(1);
    expect(filter.getDayOfWeek('pon')).toBe(2);
    expect(filter.getDayOfWeek('Pon')).toBe(2);
    expect(filter.getDayOfWeek('pon.')).toBe(2);
    expect(filter.getDayOfWeek('poniedziałek')).toBe(2);
    expect(filter.getDayOfWeek('Poniedziałek')).toBe(2);
    expect(filter.getDayOfWeek('wtorek')).toBe(3);
    expect(filter.getDayOfWeek('pt')).toBe(6);
    expect(filter.getDayOfWeek('piątek')).toBe(6);
  });

  // Java: DateCheckFilterTest#testMonth
  it('testMonth', () => {
    const filter = new DateCheckFilter();
    expect(filter.getMonth('I')).toBe(1);
    expect(filter.getMonth('XII')).toBe(12);
    expect(filter.getMonth('grudnia')).toBe(12);
    expect(filter.getMonth('Grudnia')).toBe(12);
    expect(filter.getMonth('GRUDNIA')).toBe(12);
  });
});
