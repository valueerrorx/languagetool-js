// Calendar subset vs JDK 17 probe (TZ Europe/Vienna, now = 2026-03-15T10:00:00.123+01:00)
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Calendar } from '../../../src/lib/java/Calendar.js';
import { Locale } from '../../../src/lib/java/Locale.js';

let prevTz;
let prevTime;
beforeAll(() => {
  prevTime = process.env.LTJS_FIXED_TIME;
  process.env.LTJS_FIXED_TIME = '2026-03-15T10:00:00.123+01:00';
  prevTz = process.env.TZ;
  process.env.TZ = 'Europe/Vienna';
});
afterAll(() => {
  if (prevTime === undefined) delete process.env.LTJS_FIXED_TIME; else process.env.LTJS_FIXED_TIME = prevTime;
  if (prevTz === undefined) delete process.env.TZ; else process.env.TZ = prevTz;
});

const strict = (y, m, d, loc = new Locale('de', 'DE')) => {
  const c = Calendar.getInstance(loc);
  c.setLenient(false);
  c.set(y, m, d, 0, 0, 0);
  return c;
};
const fields = (c) => [c.get(Calendar.DAY_OF_WEEK), c.get(Calendar.YEAR), c.get(Calendar.MONTH), c.get(Calendar.DAY_OF_MONTH), c.get(Calendar.WEEK_OF_YEAR)];

describe('Calendar', () => {
  it('week data', () => {
    const w = (l, c) => { const x = Calendar.getInstance(new Locale(l, c)); return [x.getFirstDayOfWeek(), x.getMinimalDaysInFirstWeek()]; };
    expect(w('de', 'DE')).toEqual([2, 4]);
    expect(w('en', 'US')).toEqual([1, 1]);
    expect(w('en', 'GB')).toEqual([2, 4]);
    expect(w('fr', 'FR')).toEqual([2, 4]);
    expect(w('ar', '')).toEqual([1, 1]);
  });

  it('cutover 1582', () => {
    expect(fields(strict(1582, 9, 4))).toEqual([5, 1582, 9, 4, 40]);
    expect(() => strict(1582, 9, 5).get(Calendar.YEAR)).toThrow("the specified date doesn't exist");
    expect(() => strict(1582, 9, 14).get(Calendar.YEAR)).toThrow("the specified date doesn't exist");
    expect(fields(strict(1582, 9, 15))).toEqual([6, 1582, 9, 15, 40]);
  });

  it('leap years and non-lenient errors', () => {
    expect(fields(strict(2024, 1, 29))).toEqual([5, 2024, 1, 29, 9]);
    expect(fields(strict(2000, 1, 29))).toEqual([3, 2000, 1, 29, 9]);
    expect(() => strict(2023, 1, 29).get(Calendar.YEAR)).toThrow('MONTH: 1 -> 2');
    expect(() => strict(1900, 1, 29).get(Calendar.YEAR)).toThrow('MONTH: 1 -> 2');
    expect(() => strict(2026, 0, 32).get(Calendar.YEAR)).toThrow('DAY_OF_MONTH');
    expect(() => strict(0, 0, 1).get(Calendar.YEAR)).toThrow('YEAR');
    expect(fields(strict(292278994, 0, 1))).toEqual([4, 292278994, 0, 1, 1]);
    expect(() => strict(292278994, 11, 31).get(Calendar.YEAR)).toThrow('YEAR: 292278994 -> 292269054');
  });

  it('lenient set rolls over', () => {
    const c = Calendar.getInstance(new Locale('de', 'DE'));
    c.set(2026, 0, 32, 0, 0, 0);
    expect([c.get(Calendar.DAY_OF_WEEK), c.get(Calendar.YEAR), c.get(Calendar.MONTH), c.get(Calendar.DAY_OF_MONTH)]).toEqual([1, 2026, 1, 1]);
    const d = Calendar.getInstance(new Locale('de', 'DE'));
    d.set(1582, 9, 10, 0, 0, 0);
    expect([d.get(Calendar.DAY_OF_WEEK), d.get(Calendar.DAY_OF_MONTH)]).toEqual([4, 20]);
  });

  it('set(DAY_OF_WEEK) keeps the week of now', () => {
    const c = Calendar.getInstance(new Locale('en', 'US'));
    c.set(Calendar.DAY_OF_WEEK, Calendar.MONDAY);
    expect([c.get(Calendar.DAY_OF_WEEK), c.get(Calendar.DAY_OF_MONTH)]).toEqual([2, 16]);
    const e = Calendar.getInstance(new Locale('de', 'DE'));
    e.set(Calendar.DAY_OF_WEEK, 8);
    expect([e.get(Calendar.DAY_OF_WEEK), e.get(Calendar.DAY_OF_MONTH)]).toEqual([1, 15]);
  });

  it('after compares instants', () => {
    const now = Calendar.getInstance(new Locale('en', 'US'));
    expect(strict(2026, 2, 15).after(now)).toBe(false);
    expect(strict(2026, 2, 16).after(now)).toBe(true);
  });
});

describe('Calendar compare of invalid non-lenient dates', () => {
  it('after() rolls the invalid date over instead of throwing', () => {
    const now = Calendar.getInstance(new Locale('de', 'DE'));
    expect(strict(2100, 1, 29).after(now)).toBe(true);
    expect(strict(2026, 0, 32).after(now)).toBe(false);
  });
});
