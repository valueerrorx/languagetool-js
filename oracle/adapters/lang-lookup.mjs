// JS twin of harness op "lang-lookup" (LangOps#lookup).
import { IllegalArgumentException, UnsupportedOperationException } from '../../src/lib/java/errors.js';
import { Languages } from '../../src/core/Languages.js';
import { describe, langResult, locale, outOfScope, safe, str, wrap } from './_lang-common.mjs';

// Java: LangOps#lookup(JsonNode)
export function run(a) {
  return a.calls.map((c) => {
    const level = c.level ?? 0;
    const fn = c.fn;
    return safe(() => {
      switch (fn) {
        case 'shortCode': {
          let l;
          if (c.noop !== undefined) l = Languages.getLanguageForShortCode(str(c.code), c.noop.map(str));
          else l = Languages.getLanguageForShortCode(str(c.code));
          return langResult(l, level);
        }
        case 'name': return langResult(Languages.getLanguageForName(str(c.name)), level);
        case 'supported': {
          const code = str(c.code);
          const b = Languages.isLanguageSupported(code);
          let out = false;
          if (b) out = outOfScope(Languages.getLanguageForShortCode(code));
          return wrap(b, out, out ? 'language-out-of-scope' : null);
        }
        case 'locale': return langResult(Languages.getLanguageForLocale(locale(c.locale)), level);
        case 'className': return langResult(Languages.getOrAddLanguageByClassName(str(c.className)), level);
        case 'list':
        case 'listWithDemo':
          return (fn === 'list' ? Languages.get() : Languages.getWithDemoLanguage()).map((x) => wrap(describe(x, level), outOfScope(x), outOfScope(x) ? 'language-out-of-scope' : null));
        case 'longCodes':
          return Languages.getLongCodeToLangMapping().entrySet().map(([k, v]) => [k, v.getShortCodeWithCountryAndVariant(), outOfScope(v)]);
        case 'listUnmodifiable': {
          const l = Languages.get();
          try {
            if (Object.isFrozen(l)) throw new UnsupportedOperationException();
            l.push(l[0]);
            return 'added';
          } catch (e) {
            if (e instanceof UnsupportedOperationException) return 'UnsupportedOperationException';
            throw e;
          }
        }
        default: throw new IllegalArgumentException(`bad fn ${fn}`);
      }
    });
  });
}
