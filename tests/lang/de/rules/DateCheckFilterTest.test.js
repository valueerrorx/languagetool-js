// Ported from DateCheckFilterTest (de module)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { Calendar } from '../../../../src/lib/java/Calendar.js';
import { IllegalArgumentException } from '../../../../src/lib/java/errors.js';
import { JavaHashMap } from '../../../../src/lib/java/collections/JavaHashMap.js';
import { RuleMatch } from '../../../../src/core/rules/model/RuleMatch.js';
import { DateCheckFilter } from '../../../../src/lang/de/rules/DateCheckFilter.js';
import { FakeRule } from './_filterTestSupport.js';

const match = new RuleMatch(new FakeRule(), null, 0, 10, 'message');
const filter = new DateCheckFilter();

// Java: DateCheckFilterTest#makeMap
function makeMap(year, month, dayOfMonth, weekDay) {
  const map = new JavaHashMap();
  map.put('year', year);
  map.put('month', month);
  map.put('day', dayOfMonth);
  map.put('weekDay', weekDay);
  return map;
}

describe('DateCheckFilterTest', () => {
  // Java: DateCheckFilterTest#testAcceptIncompleteArgs (expected = IllegalArgumentException)
  it('testAcceptIncompleteArgs', () => {
    const map = makeMap('2014', '8', '23', 'Samstag');
    map.remove('weekDay');
    expect(() => filter.acceptRuleMatch(match, map, -1, null, null)).toThrow(IllegalArgumentException);
  });

  // Java: DateCheckFilterTest#testGetDayOfWeek1
  it('testGetDayOfWeek1', () => {
    expect(filter.getDayOfWeek('So')).toBe(1);
    expect(filter.getDayOfWeek('Mo')).toBe(2);
    expect(filter.getDayOfWeek('mo')).toBe(2);
    expect(filter.getDayOfWeek('Mon.')).toBe(2);
    expect(filter.getDayOfWeek('Montag')).toBe(2);
    expect(filter.getDayOfWeek('montag')).toBe(2);
    expect(filter.getDayOfWeek('Di')).toBe(3);
    expect(filter.getDayOfWeek('Fr')).toBe(6);
    expect(filter.getDayOfWeek('Samstag')).toBe(7);
    expect(filter.getDayOfWeek('Sonnabend')).toBe(7);
  });

  // Java: DateCheckFilterTest#testGetDayOfWeek2
  it('testGetDayOfWeek2', () => {
    const calendar = Calendar.getInstance();
    calendar.set(2014, 8 - 1, 29);
    expect(filter.getDayOfWeek(calendar)).toBe('Freitag');
    calendar.set(2014, 8 - 1, 30);
    expect(filter.getDayOfWeek(calendar)).toBe('Samstag');
  });

  // Java: DateCheckFilterTest#testGetMonth
  it('testGetMonth', () => {
    expect(filter.getMonth('Januar')).toBe(1);
    expect(filter.getMonth('Jan')).toBe(1);
    expect(filter.getMonth('Jan.')).toBe(1);
    expect(filter.getMonth('Dezember')).toBe(12);
    expect(filter.getMonth('Dez')).toBe(12);
    expect(filter.getMonth('dez')).toBe(12);
    expect(filter.getMonth('DEZEMBER')).toBe(12);
    expect(filter.getMonth('dezember')).toBe(12);
  });
});
