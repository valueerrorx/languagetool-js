// Extra unit tests for the generic core rule filters (F34); the Java core module has no test classes for them (behaviour verified by the X-FILTERS fixtures)
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Calendar } from '../../../src/lib/java/Calendar.js';
import { Locale } from '../../../src/lib/java/Locale.js';
import { JavaHashMap } from '../../../src/lib/java/collections/JavaHashMap.js';
import { IllegalArgumentException, NumberFormatException, RuntimeException } from '../../../src/lib/java/errors.js';
import { RuleMatch } from '../../../src/core/rules/model/RuleMatch.js';
import { Rule } from '../../../src/core/rules/model/Rule.js';
import { AbstractDateCheckFilter } from '../../../src/core/rules/AbstractDateCheckFilter.js';
import { AbstractFutureDateFilter } from '../../../src/core/rules/AbstractFutureDateFilter.js';
import { AbstractNewYearDateFilter } from '../../../src/core/rules/AbstractNewYearDateFilter.js';
import { AbstractTextToNumberFilter } from '../../../src/core/rules/AbstractTextToNumberFilter.js';
import { DateRangeChecker } from '../../../src/core/rules/DateRangeChecker.js';
import { ShortenedYearRangeChecker } from '../../../src/core/rules/ShortenedYearRangeChecker.js';
import { YMDDateHelper } from '../../../src/core/rules/YMDDateHelper.js';
import { TestHackHelper } from '../../../src/core/rules/TestHackHelper.js';
import { WhitespaceCheckFilter } from '../../../src/core/rules/WhitespaceCheckFilter.js';
import { UnderlineSpacesFilter } from '../../../src/core/rules/UnderlineSpacesFilter.js';
import { EditDistance } from '../../../src/core/rules/spelling/symspell/implementation/EditDistance.js';
import { RuleFilterCreator } from '../../../src/core/patterns/RuleFilterCreator.js';
import { EN, newLt, useNoopAnalysis } from '../../support/ruleTestSupport.js';

class FakeRule extends Rule {
  getId() { return 'FAKE_ID'; }

  getDescription() { return 'fake'; }

  match() { return RuleMatch.EMPTY_ARRAY; }
}

const map = (...pairs) => {
  const m = new JavaHashMap();
  for (const [k, v] of pairs) m.put(k, v);
  return m;
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const dayOfWeekOf = (s) => {
  const i = DAYS.findIndex((d) => d.toLowerCase().startsWith(s.toLowerCase().slice(0, 3)));
  if (i < 0) throw new RuntimeException(`Could not find day of week for '${s}'`);
  return i + 1;
};
const calendar = () => Calendar.getInstance(new Locale('en', 'GB'));

class TestDateCheck extends AbstractDateCheckFilter {
  getCalendar() { return calendar(); }

  getDayOfWeek(x) { return typeof x === 'string' ? dayOfWeekOf(x) : DAYS[x.get(Calendar.DAY_OF_WEEK) - 1]; }

  getMonth() { return 1; }
}
class TestFuture extends AbstractFutureDateFilter {
  getCalendar() { return calendar(); }

  getMonth() { return 1; }
}
class TestNewYear extends AbstractNewYearDateFilter {
  getCalendar() { return calendar(); }

  getMonth() { return 1; }
}

describe('generic filters', () => {
  useNoopAnalysis(EN);
  let prevTime;
  let prevTz;
  beforeAll(() => {
    prevTime = process.env.LTJS_FIXED_TIME;
    prevTz = process.env.TZ;
    process.env.TZ = 'Europe/Vienna';
    process.env.LTJS_FIXED_TIME = '2027-01-05T12:00:00+01:00';
  });
  afterAll(() => {
    if (prevTime === undefined) delete process.env.LTJS_FIXED_TIME; else process.env.LTJS_FIXED_TIME = prevTime;
    if (prevTz === undefined) delete process.env.TZ; else process.env.TZ = prevTz;
  });

  const sentenceOf = (text) => newLt(EN).analyzeText(text)[0];
  const matchFor = (text, from, to, message = 'msg {realDay} {day} {year} {realYear}') => new RuleMatch(new FakeRule(), sentenceOf(text), from, to, message);

  it('AbstractDateCheckFilter keeps wrong weekdays and fills the placeholders', () => {
    const f = new TestDateCheck();
    const m = matchFor('Sunday 8 March 2026', 0, 6, 'is {day} not {realDay}? {currentYear}');
    const r = f.acceptRuleMatch(m, map(['year', '2026'], ['month', '3'], ['day', '8'], ['weekDay', 'Monday']), 0, [], [1]);
    expect(r.getMessage()).toBe('is Monday not Sunday? 2027');
    expect(r.getUrl().toString()).toBe('https://www.timeanddate.com/calendar/?year=2026');
    expect(f.acceptRuleMatch(m, map(['year', '2026'], ['month', '3'], ['day', '8'], ['weekDay', 'Sunday']), 0, [], [1])).toBeNull();
    // invalid dates are left to another rule
    expect(f.acceptRuleMatch(m, map(['year', '2026'], ['month', '2'], ['day', '30'], ['weekDay', 'Monday']), 0, [], [1])).toBeNull();
    // RuntimeException of the hooks is swallowed, IllegalArgumentException is not
    expect(f.acceptRuleMatch(m, map(['year', '2026'], ['month', '3'], ['day', '8'], ['weekDay', 'Xyz']), 0, [], [1])).toBeNull();
    expect(() => f.acceptRuleMatch(m, map(['year', '2026'], ['month', '3'], ['weekDay', 'Monday']), 0, [], [1])).toThrow(IllegalArgumentException);
    expect(() => f.acceptRuleMatch(m, map(['year', 'x'], ['month', '3'], ['day', '8'], ['weekDay', 'Monday']), 0, [], [1])).toThrow(NumberFormatException);
  });

  it('AbstractFutureDateFilter compares with the clock (2027-01-05)', () => {
    const f = new TestFuture();
    const m = matchFor('x', 0, 1);
    expect(f.acceptRuleMatch(m, map(['year', '2027'], ['month', '1'], ['day', '6']))).toBe(m);
    expect(f.acceptRuleMatch(m, map(['year', '2027'], ['month', '1'], ['day', '5']))).toBeNull();
    expect(f.acceptRuleMatch(m, map(['year', '2100'], ['month', '2'], ['day', '29']))).toBe(m); // invalid date rolls over in compareTo
  });

  it('AbstractNewYearDateFilter fires in January for the previous year', () => {
    const f = new TestNewYear();
    const m = matchFor('x', 0, 1, '{year} -> {realYear}');
    const r = f.acceptRuleMatch(m, map(['year', '2026'], ['month', '3'], ['day', '1']));
    expect(r.getMessage()).toBe('2026 -> 2027');
    expect(f.acceptRuleMatch(m, map(['year', '2026'], ['month', '12'], ['day', '1']))).toBeNull();
    expect(f.acceptRuleMatch(m, map(['year', '2025'], ['month', '3'], ['day', '1']))).toBeNull();
  });

  it('TestHackHelper switches the 2014 hack on', () => {
    TestHackHelper.setJUnitTest(true);
    try {
      const m = matchFor('x', 0, 1, '{year} -> {realYear}');
      const r = new TestNewYear().acceptRuleMatch(m, map(['year', '2013'], ['month', '3'], ['day', '1']));
      expect(r.getMessage()).toBe('2013 -> 2014');
    } finally {
      TestHackHelper.setJUnitTest(false);
    }
    expect(TestHackHelper.isJUnitTest()).toBe(false);
  });

  it('range checkers', () => {
    const m = matchFor('x', 0, 1);
    const d = new DateRangeChecker();
    expect(d.acceptRuleMatch(m, map(['x', '1999'], ['y', '1990']))).toBe(m);
    expect(d.acceptRuleMatch(m, map(['x', '1990'], ['y', '1999']))).toBeNull();
    expect(d.acceptRuleMatch(m, map(['x', 'a'], ['y', '1999']))).toBeNull();
    const s = new ShortenedYearRangeChecker();
    expect(s.acceptRuleMatch(m, map(['x', '1998'], ['y', '92']))).toBe(m);
    expect(s.acceptRuleMatch(m, map(['x', '1998'], ['y', '99']))).toBeNull();
  });

  it('YMDDateHelper', () => {
    const h = new YMDDateHelper();
    const args = h.parseDate(map(['date', '2026-03-15']));
    expect([args.get('year'), args.get('month'), args.get('day')]).toEqual(['2026', '03', '15']);
    expect(() => h.parseDate(map())).toThrow("Missing key 'date'");
    expect(() => h.parseDate(map(['date', '2026-03']))).toThrow("Expected date in format 'yyyy-mm-dd': '2026-03'");
    const r = h.correctDate(matchFor('x', 0, 1, 'use {realDate}'), args);
    expect(r.getMessage()).toBe('use 2027-03-15');
  });

  it('WhitespaceCheckFilter and UnderlineSpacesFilter', () => {
    const s = sentenceOf('a  b');
    const tokens = s.getTokensWithoutWhitespace();
    const m = new RuleMatch(new FakeRule(), s, 3, 4, 'm');
    const w = new WhitespaceCheckFilter();
    // the whitespace before 'b' is the last whitespace token (one space)
    expect(w.acceptRuleMatch(m, map(['whitespaceChar', '  '], ['position', '3']), 0, tokens, [])).toBe(m);
    expect(w.acceptRuleMatch(m, map(['whitespaceChar', ' '], ['position', '3']), 0, tokens, [])).toBeNull();
    expect(() => w.acceptRuleMatch(m, map(['whitespaceChar', ' '], ['position', '0']), 0, tokens, [])).toThrow('Wrong position in WhitespaceCheckFilter: 0, must be 1 to 3');
    new UnderlineSpacesFilter().acceptRuleMatch(m, map(['underlineSpaces', 'before']), 0, tokens, []);
    expect([m.getFromPos(), m.getToPos()]).toEqual([2, 4]);
  });

  it('EditDistance (Damerau)', () => {
    const e = new EditDistance('hello', EditDistance.DistanceAlgorithm.Damerau);
    expect(e.compare('hello', 4)).toBe(0);
    expect(e.compare('hlelo', 4)).toBe(1);
    expect(e.compare('helo', 4)).toBe(1);
    expect(e.compare('world', 2)).toBe(-1);
    expect(e.compare('', 4)).toBe(5);
    expect(new EditDistance('', EditDistance.DistanceAlgorithm.Damerau).compare('abc', 4)).toBe(3);
  });

  it('AbstractTextToNumberFilter float arithmetic', () => {
    const F = Math.fround;
    class T extends AbstractTextToNumberFilter {
      isComma(s) { return s === ','; }

      isPercentage(t, i) { return t[i].getToken() === '%'; }
    }
    AbstractTextToNumberFilter.numbers.put('one', F(1));
    AbstractTextToNumberFilter.numbers.put('two', F(2));
    AbstractTextToNumberFilter.numbers.put('big', F(16777217));
    AbstractTextToNumberFilter.multipliers.put('hundred', F(100));
    AbstractTextToNumberFilter.multipliers.put('quadrillion', F(1e20));
    const run = (text) => {
      const s = sentenceOf(text);
      const m = new RuleMatch(new FakeRule(), s, 0, text.length, 'm');
      new T().acceptRuleMatch(m, map(), 0, s.getTokensWithoutWhitespace(), []);
      return m.getSuggestedReplacements();
    };
    expect(run('two hundred one')).toEqual(['201']);
    expect(run('hundred')).toEqual(['100']);
    expect(run('big')).toEqual(['16777216']);
    expect(run('one quadrillion')).toEqual(['1.0E20']);
    expect(run('one , two')).toEqual(['1.2']);
  });

  it('abstract filter classes cannot be instantiated by RuleFilterCreator', () => {
    expect(() => RuleFilterCreator.getInstance().getFilter('org.languagetool.rules.AbstractDateCheckFilter')).toThrow(RuntimeException);
  });
});
