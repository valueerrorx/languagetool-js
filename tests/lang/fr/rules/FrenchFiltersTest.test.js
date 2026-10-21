// Extra tests for the French rule filters (no Java JUnit exists; behaviour checked against the X-FRFILTERS fixtures)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { Calendar } from '../../../../src/lib/java/Calendar.js';
import { Locale } from '../../../../src/lib/java/Locale.js';
import { RuntimeException } from '../../../../src/lib/java/errors.js';
import { JavaHashMap } from '../../../../src/lib/java/collections/JavaHashMap.js';
import { RuleMatch } from '../../../../src/core/rules/model/RuleMatch.js';
import { DateCheckFilter } from '../../../../src/lang/fr/rules/DateCheckFilter.js';
import { DMYDateCheckFilter } from '../../../../src/lang/fr/rules/DMYDateCheckFilter.js';
import { MakeContractionsFilter } from '../../../../src/lang/fr/rules/MakeContractionsFilter.js';
import { SuggestionsFilter } from '../../../../src/lang/fr/rules/SuggestionsFilter.js';
import { FakeRule } from '../../de/rules/_filterTestSupport.js';

describe('FrenchFiltersTest', () => {
  it('testDayOfWeekAndMonth', () => {
    const filter = new DateCheckFilter();
    expect(filter.getDayOfWeek('Dim')).toBe(Calendar.SUNDAY);
    expect(filter.getDayOfWeek('mer.')).toBe(Calendar.WEDNESDAY);
    expect(filter.getDayOfWeek('SAMEDI')).toBe(Calendar.SATURDAY);
    expect(() => filter.getDayOfWeek('xyz')).toThrow(RuntimeException);
    expect(filter.getMonth('févr')).toBe(2);
    expect(filter.getMonth('aoû')).toBe(8);
    expect(filter.getMonth('juil')).toBe(7);
    expect(filter.getMonth('Décembre')).toBe(12);
    expect(() => filter.getMonth('jui')).toThrow(RuntimeException);
  });

  it('testDayName', () => {
    const filter = new DateCheckFilter();
    const calendar = Calendar.getInstance(Locale.FRENCH);
    calendar.set(2014, 8 - 1, 29);
    expect(filter.getDayOfWeek(calendar)).toBe('vendredi');
    expect(calendar.getDisplayName(Calendar.MONTH, Calendar.LONG, Locale.FRENCH)).toBe('août'); // JDK 17 probe
    expect(calendar.getDisplayName(Calendar.DAY_OF_WEEK, Calendar.SHORT, Locale.FRENCH)).toBe('ven.');
  });

  it('testDmyArgs', () => {
    const filter = new DMYDateCheckFilter();
    const match = new RuleMatch(new FakeRule(), null, 0, 10, 'message');
    const map = new JavaHashMap();
    map.put('year', '2014');
    expect(() => filter.acceptRuleMatch(match, map, -1, null, null)).toThrow(RuntimeException);
  });

  it('testMakeContractions', () => {
    const filter = new MakeContractionsFilter();
    expect(filter.fixContractions('de le chat et À LES amis, de les, à le')).toBe('du chat et aux amis, des, au');
  });

  it('testSuggestionsFilter', () => {
    const filter = new SuggestionsFilter();
    const match = new RuleMatch(new FakeRule(), null, 0, 10, 'message');
    match.setSuggestedReplacements(['un', 'des', 'DES']);
    const map = new JavaHashMap();
    map.put('RemoveSuggestionsRegexp', 'des');
    expect(filter.acceptRuleMatch(match, map, 0, null, null).getSuggestedReplacements()).toEqual(['un']);
  });
});
