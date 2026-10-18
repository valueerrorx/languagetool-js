// JS twin of harness op "filter-run" (FilterOps#filterRun): acceptRuleMatch of generic core filters via test subclasses of the abstract ones.
// Contract with the port (docs/review/F34-oracle.md): abstract base classes are registered under their Java FQCN (ClassBroker), protected hooks keep the Java names;
// overloaded Java methods (getDayOfWeek(String)/getDayOfWeek(Calendar)) are ONE JS method that dispatches on the argument type; src/lib/java/Calendar.js provides Calendar.getInstance(Locale).
import { resetState } from './_unify-common.mjs';
import { releaseXx } from './_disamb-common.mjs';
import { CFG, resetFilters, lang, fresh, ruleFor, dump, err, setClock, pairMap, baseClass, optional, filterCreator } from './_filters-common.mjs';
import { hasClass } from '../../src/core/resources/ClassBroker.js';
import { RuleMatch } from '../../src/core/rules/model/RuleMatch.js';
import { Locale } from '../../src/lib/java/Locale.js';
import { AnalyzedToken } from '../../src/core/AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../../src/core/AnalyzedTokenReadings.js';
import { AnalyzedSentence } from '../../src/core/AnalyzedSentence.js';
import { trimSpecialCharacters, isNumeric } from '../../src/core/text/StringTools.js';
import { javaSplit } from '../../src/lib/java/strings.js';
import { IllegalArgumentException, RuntimeException } from '../../src/lib/java/errors.js';

export function beginCase() { resetState(); resetFilters(); }

const PKG = 'org.languagetool.rules.';
const cache = new Map();
const cached = (key, mk) => { if (!cache.has(key)) cache.set(key, mk()); return cache.get(key); };
const localeOf = (tag) => { const [l, c] = tag.split('-'); return new Locale(l, c ?? ''); };

// Java: FilterOps.DateCfg
class DateCfg {
  constructor(c) { this.c = c ?? {}; }

  async calendar() {
    const { Calendar } = await optional('lib/java/Calendar.js', 'java.util.Calendar helper (src/lib/java/Calendar.js)');
    return Calendar.getInstance(localeOf(this.c.locale ?? 'en-GB'));
  }

  dayOfWeek(s) {
    const day = (this.c.trim ?? true) ? trimSpecialCharacters(s).toLowerCase() : s.toLowerCase();
    for (const p of this.c.dayPrefix) if (day.startsWith(p[0])) return p[1];
    throw new RuntimeException(`Could not find day of week for '${s}'`);
  }

  async dayName(d) { const { Calendar } = await optional('lib/java/Calendar.js', 'Calendar'); return this.c.dayNames[d.get(Calendar.DAY_OF_WEEK) - 1]; }

  month(s) {
    const mon = (this.c.trim ?? true) ? trimSpecialCharacters(s).toLowerCase() : s.toLowerCase();
    for (const p of this.c.monthPrefix) if (mon.startsWith(p[0])) return p[1];
    throw new RuntimeException(`Could not find month '${s}'`);
  }

  dayOfMonth(s) {
    if (this.c.dayWords) { let i = 0; for (const w of this.c.dayWords) { i++; if (w === s) return i; } }
    return 0;
  }
}

// calendar hooks: the port's getCalendar() is synchronous, so the Calendar module is loaded before the subclass is built
async function calendarClass() { return (await optional('lib/java/Calendar.js', 'java.util.Calendar helper (src/lib/java/Calendar.js)')).Calendar; }

async function makeDate(kind, c) {
  const Base = baseClass(PKG + { datecheck: 'AbstractDateCheckFilter', 'datecheck-sugg': 'AbstractDateCheckWithSuggestionsFilter', future: 'AbstractFutureDateFilter', newyear: 'AbstractNewYearDateFilter' }[kind]);
  const Calendar = await calendarClass();
  const d = new DateCfg(c);
  const names = (date) => d.c.dayNames[date.get(Calendar.DAY_OF_WEEK) - 1];
  const C = class extends Base {
    getCalendar() { return Calendar.getInstance(localeOf(d.c.locale ?? 'en-GB')); }

    getDayOfWeek(x) { return typeof x === 'string' ? d.dayOfWeek(x) : names(x); }

    getDayOfMonth(s) { return d.dayOfMonth(s); }

    getMonth(s) { return d.month(s); }

    getErrorMessageWrongYear() { return d.c.wrongYear ?? 'wrong year {currentYear}'; }

    // Java: DateCheckSugg#getDayStrLikeOriginal (en variant)
    getDayStrLikeOriginal(day, original) {
      if (d.c.dayStrLike !== 'en') return day;
      if (/^[0-9]+$/.test(original) && original.length > 0) return day;
      const number = parseInt(day, 10);
      if (number >= 11 && number <= 13) return `${number}th`;
      switch (number % 10) {
        case 1: return `${number}st`;
        case 2: return `${number}nd`;
        case 3: return `${number}rd`;
        default: return `${number}th`;
      }
    }

    // Java: DateCheckSugg#adjustSuggestion (de variant)
    adjustSuggestion(sugg) {
      if (d.c.adjust !== 'de') return sugg;
      const dotCommaPos = sugg.indexOf('.,');
      if (dotCommaPos > 5 && dotCommaPos < 12) return sugg.replaceAll('.,', ',');
      const commaPos = sugg.indexOf(',');
      if (dotCommaPos < 0 && commaPos > 0 && commaPos < 5) return sugg.replaceAll(',', '.,');
      return sugg;
    }
  };
  return new C();
}

async function makePartialPos(l, mode) {
  const Base = baseClass(`${PKG}PartialPosTagFilter`);
  const C = class extends Base {
    tag(token) {
      if (mode === 'demo') {
        if (token === 'accurate') return [new AnalyzedTokenReadings([new AnalyzedToken(token, 'JJ', 'fake')], 0)];
        return null;
      }
      const tags = l.getTagger().tag([token]);
      if (mode === 'disamb') {
        const d = l.getDisambiguator().disambiguate(new AnalyzedSentence([...tags]));
        return [...d.getTokens()];
      }
      return tags;
    }
  };
  return new C();
}

async function makeFindSugg(l, c) {
  const Base = baseClass(`${PKG}AbstractFindSuggestionsFilter`);
  c ??= {};
  const C = class extends Base {
    getTagger() { return l.getTagger(); }

    getSpellingSuggestions(atr) { const s = c.spell?.[atr.getToken()]; return s === undefined ? [] : [...s]; }

    getSynthesizer() { return c.synth === true ? l.getSynthesizer() : null; }

    isSuggestionException(a) { return c.excRegex !== undefined && new RegExp(`^(?:${c.excRegex})$`, 'u').test(a.getToken()); }

    cleanSuggestion(s) { return c.clean === true ? s.replaceAll('-', '') : s; }

    preProcessWrongWord(w) { return c.pre === true ? w.toUpperCase() : super.preProcessWrongWord(w); }
  };
  return new C();
}

async function makeAdvSynth(c) {
  const Base = baseClass(`${PKG}AbstractAdvancedSynthesizerFilter`);
  c ??= {};
  const C = class extends Base {
    isSuggestionException(token) { return c.excRegex !== undefined && new RegExp(`^(?:${c.excRegex})$`, 'u').test(token); }

    getNewLemma(word, newLemma) { return c.newLemma === true && word !== null ? word + newLemma.substring(1) : null; }
  };
  return new C();
}

async function makeNumberInWord(l, c) {
  const Base = baseClass(`${PKG}AbstractNumberInWordFilter`);
  c ??= {};
  const C = class extends Base {
    isMisspelled(word) { return (c.misspelled ?? []).includes(word); }

    getSuggestions(word) { const s = c.spell?.[word]; return s === undefined ? [] : [...s]; }
  };
  return new C(l);
}

async function makeContractions(c) {
  const Base = baseClass(`${PKG}AbstractMakeContractionsFilter`);
  const C = class extends Base {
    fixContractions(s) { for (const p of c?.pairs ?? []) s = s.replaceAll(p[0], p[1]); return s; }
  };
  return new C();
}

const F = (v) => Math.fround(v);
async function makeTextToNumber(c) {
  const Base = baseClass(`${PKG}AbstractTextToNumberFilter`);
  c ??= {};
  const C = class extends Base {
    isComma(s) { return s === ',' || s === 'point'; }

    isPercentage(t, i) { return t[i].getToken() === '%' || t[i].getToken() === 'percent'; }

    formatResult(s) { return c.brackets === true ? `[${s}]` : s; }

    tokenize(s) { return c.splitDash === true ? javaSplit(s, '-') : super.tokenize(s); }
  };
  // Java: static initializer of the test subclass fills the protected static maps of the abstract class
  if (Base.numbers === undefined || Base.multipliers === undefined) throw Object.assign(new Error('not ported yet: AbstractTextToNumberFilter static numbers/multipliers maps'), { notPorted: true });
  if (!Base.numbers.containsKey('zero')) {
    const n = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'twenty', 'thirty', 'forty', 'fifty', 'ninety'];
    const v = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 20, 30, 40, 50, 90];
    n.forEach((k, i) => Base.numbers.put(k, F(v[i])));
    Base.numbers.put('half', F(0.5)); Base.numbers.put('tenth', F(0.1)); Base.numbers.put('hundredth', F(0.01)); Base.numbers.put('big', F(16777217));
    Base.multipliers.put('hundred', F(100)); Base.multipliers.put('thousand', F(1000)); Base.multipliers.put('million', F(1000000));
    Base.multipliers.put('billion', F(1000000000)); Base.multipliers.put('trillion', F(1e12)); Base.multipliers.put('quadrillion', F(1e20));
  }
  return new C();
}

async function makeSentenceCase(c) {
  const { ConvertToSentenceCaseFilter } = await optional('core/rules/ConvertToSentenceCaseFilter.js', `${PKG}ConvertToSentenceCaseFilter`);
  const C = class extends ConvertToSentenceCaseFilter {
    tokenIsException(s) { return (c?.exceptions ?? []).includes(s); }
  };
  return new C();
}

async function makeSuppress() {
  const Base = baseClass(`${PKG}AbstractSuppressMisspelledSuggestionsFilter`);
  return new (class extends Base {})();
}

// Java: FilterOps#create(Language,JsonNode)
async function create(l, f) {
  const c = f.cfgRef !== undefined ? CFG.get(f.cfgRef) : f.cfg;
  if (f.cls !== undefined) {
    if (!hasClass(f.cls)) throw Object.assign(new Error(`not ported yet: ${f.cls} (filter class not registered)`), { notPorted: true });
    return filterCreator().getFilter(f.cls);
  }
  switch (f.test) {
    case 'datecheck': case 'datecheck-sugg': case 'future': case 'newyear': return makeDate(f.test, c);
    case 'partialpos': return makePartialPos(l, c?.mode ?? 'tagger');
    case 'findsugg': return makeFindSugg(l, c);
    case 'advsynth': return makeAdvSynth(c);
    case 'suppress': return makeSuppress();
    case 'numberinword': return makeNumberInWord(l, c);
    case 'contractions': return makeContractions(c);
    case 'texttonumber': return makeTextToNumber(c);
    case 'sentencecase': return makeSentenceCase(c);
    default: throw new IllegalArgumentException(`unknown test filter ${f.test}`);
  }
}

// Java: FilterOps#tokensOf(AnalyzedSentence)
const tokensOf = (s) => s.getTokensWithoutWhitespace().map((t) => [t.getToken(), t.getStartPos(), t.getEndPos(), t.isWhitespaceBefore()]);

// Java: FilterOps#filterRun(JsonNode)
export async function run(a) {
  const restore = setClock(a.clockAt);
  try { return await runImpl(a); } finally { restore(); if (a.lang === 'xx') releaseXx(); }
}

async function runImpl(a) {
  const l = lang(a.lang);
  try {
    const rule = ruleFor(l);
    const s = fresh(l, a.lang, a.text);
    const all = s.getTokensWithoutWhitespace();
    const pt = a.window !== undefined ? all.slice(a.window[0], a.window[1]) : all;
    const m = new RuleMatch(rule, s, a.from, a.to, a.message ?? 'msg', a.shortMessage ?? null);
    if (a.suggestions !== undefined) m.setSuggestedReplacements(a.suggestions);
    if (a.setOriginal === undefined || a.setOriginal === true) m.setOriginalErrorStr();
    const o = {};
    if (a.dumpTokens !== undefined) o.tokens = tokensOf(s);
    const pre = JSON.stringify(dump(m));
    const f = await create(l, a.filter);
    let r;
    try {
      r = await f.acceptRuleMatch(m, pairMap(a.args), a.patternTokenPos, pt, [...a.tokenPositions]);
    } catch (t) {
      o.result = err(t);
      if (JSON.stringify(dump(m)) !== pre) o.inAfter = dump(m);
      return o;
    }
    if (r === null || r === undefined) o.result = null;
    else {
      o.result = { same: r === m };
      if (r !== m) o.result.dump = dump(r);
    }
    if (JSON.stringify(dump(m)) !== pre) o.inAfter = dump(m);
    return o;
  } catch (t) { return err(t); }
}

void isNumeric;
