// W03: core hooks used by the wave-2 languages (it, es, sl, ru, sk, pl)
import { describe, it, expect } from 'vitest';
import { Language } from '../../src/core/Language.js';
import { Locale } from '../../src/lib/java/Locale.js';
import { Calendar } from '../../src/lib/java/Calendar.js';
import { hasClass } from '../../src/core/resources/ClassBroker.js';
import '../../src/core/patterns/filterRegistry.js';
import '../../src/lang/register.js';

describe('wave-2 hooks', () => {
  it('Language defaults', () => {
    const l = Object.create(Language.prototype);
    expect(l.adaptSuggestion('a e el', 'x')).toBe('a e el');
    expect(l.adaptSuggestionsList(['a', 'b'], 'x')).toEqual(['a', 'b']);
    expect(l.hasMinMatchesRules()).toBe(false);
    class L2 extends Language { adaptSuggestion(s, o) { return s + o; } }
    expect(Object.create(L2.prototype).adaptSuggestionsList(['a'], 'x')).toEqual(['ax']);
  });
  it('Locale.forLanguageTag', () => {
    expect(Locale.forLanguageTag('ru').equals(new Locale('ru'))).toBe(true);
    expect(Locale.forLanguageTag('pl-PL').getCountry()).toBe('PL');
  });
  it('week data like JDK 17', () => {
    const w = (loc) => { const c = Calendar.getInstance(loc); return [c.getFirstDayOfWeek(), c.getMinimalDaysInFirstWeek()]; };
    expect(w(Locale.forLanguageTag('ru'))).toEqual([1, 1]);
    expect(w(Locale.forLanguageTag('pl'))).toEqual([1, 1]);
    expect(w(Locale.FRANCE)).toEqual([2, 4]);
    expect(w(Locale.UK)).toEqual([2, 4]);
    expect(w(new Locale('it', 'IT'))).toEqual([2, 4]);
  });
  it('filter registry has base classes', () => {
    expect(hasClass('org.languagetool.rules.PartialPosTagFilter')).toBe(true);
    expect(hasClass('org.languagetool.rules.es.FindSuggestionsFilter')).toBe(true);
  });
});
