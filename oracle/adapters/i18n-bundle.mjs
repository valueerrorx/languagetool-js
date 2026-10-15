// JS twin of harness op "i18n-bundle" (I18nOps#bundleDump). Language is a minimal stand-in until the Language port exists (F-later):
// short code, countries and default-variant country as observed for the languages used by the X-I18N cases.
import { Locale } from '../../src/lib/java/Locale.js';
import { getMessageBundle, getMessageBundleForLanguage, MESSAGE_BUNDLE } from '../../src/core/resources/ResourceBundleTools.js';
import { getDataBroker } from '../../src/core/resources/LtStatics.js';
import { IllegalArgumentException } from '../../src/lib/java/errors.js';

// code -> [shortCode, countries, default variant shortCode (null = none), default variant countries]
const LANGS = {
  'de-DE': ['de', ['DE'], 'de', ['DE']], 'de-AT': ['de', ['AT'], 'de', ['DE']], 'de-CH': ['de', ['CH'], 'de', ['DE']],
  'en-US': ['en', ['US'], 'en', ['US']], 'en-GB': ['en', ['GB'], 'en', ['US']], fr: ['fr', ['FR'], 'fr', ['FR']],
  de: ['de', ['LU'], 'de', ['DE']], en: ['en', [], 'en', ['US']], 'fr-CA': ['fr', ['CA'], 'fr', ['FR']], 'fr-FR': ['fr', ['FR'], 'fr', ['FR']],
  'en-CA': ['en', ['CA'], 'en', ['US']], 'en-AU': ['en', ['AU'], 'en', ['US']],
  'de-DE-x-simple-language': ['de-DE-x-simple-language', ['DE'], 'de', ['DE']],
  'ca-ES': ['ca', ['ES'], 'ca', ['ES']], es: ['es', ['ES'], 'es', ['ES']], 'pl-PL': ['pl', ['PL'], 'pl', ['PL']],
  'uk-UA': ['uk', ['UA'], 'uk', ['UA']], nl: ['nl', ['NL'], 'nl', ['NL']], 'pt-PT': ['pt', ['PT'], 'pt', ['PT']],
  ar: ['ar', [], null, []], sv: ['sv', ['SE'], 'sv', ['SE']], 'zh-CN': ['zh', ['CN'], 'zh', ['CN']], 'ja-JP': ['ja', ['JP'], 'ja', ['JP']],
  'ga-IE': ['ga', ['IE'], 'ga', ['IE']], 'el-GR': ['el', ['GR'], 'el', ['GR']], 'ru-RU': ['ru', ['RU'], 'ru', ['RU']],
};

// Java: Languages#getLanguageForShortCode(String)
function languageFor(code) {
  const e = LANGS[code];
  if (!e) throw new IllegalArgumentException(`'${code}' is not a language code known to LanguageTool`);
  const [sc, countries, dvSc, dvCountries] = e;
  const lang = {
    getShortCode: () => sc,
    getCountries: () => countries,
    getLocale: () => new Locale(sc),
    getLocaleWithCountryAndVariant: () => (countries.length > 0 ? new Locale(sc, countries[0]) : new Locale(sc)),
    getDefaultLanguageVariant: () => (dvSc === null ? null : { getShortCode: () => dvSc, getCountries: () => dvCountries }),
  };
  return lang;
}

// Java: I18nOps#bundle(JsonNode)
export function getBundle(a) {
  const lang = a.lang ?? null;
  if (lang === null || lang === 'default') return getMessageBundle();
  return getMessageBundleForLanguage(languageFor(lang));
}

// Java: I18nOps#err(Throwable)
function err(t) {
  return { class: t.javaClass ?? t.constructor.name, message: t.getMessage ? t.getMessage() : t.message };
}

// Java: I18nOps#bundleDump(JsonNode)
export function run(a) {
  const lang = a.lang ?? null;
  const out = {};
  const b = getBundle(a);
  out.bundleClass = b.constructor.FQCN;
  out.bundleLocale = b.getLocale() === null ? null : b.getLocale().toString();
  if (lang !== null && lang !== 'default') {
    const l = languageFor(lang);
    out.languageLocale = l.getLocale().toString();
    out.languageLocaleWithCountryAndVariant = l.getLocaleWithCountryAndVariant().toString();
    const raw = {};
    const locs = [l.getLocaleWithCountryAndVariant(), l.getLocale()];
    const dv = l.getDefaultLanguageVariant();
    if (dv !== null && dv.getCountries().length > 0) locs.push(new Locale(dv.getShortCode(), dv.getCountries()[0]));
    for (const x of locs) {
      try { raw[x.toString()] = getDataBroker().getResourceBundle(MESSAGE_BUNDLE, x).getLocale().toString(); } catch (t) { raw[x.toString()] = err(t); }
    }
    out.rawResolution = raw;
  }
  const keys = [...b.keySet()].sort();
  out.keyCount = keys.length;
  const values = {};
  for (const k of keys) {
    try { values[k] = b.getString(k); } catch (t) { values[k] = { error: err(t) }; }
  }
  out.values = values;
  const missing = {};
  const en = getDataBroker().getResourceBundle(MESSAGE_BUNDLE, Locale.ENGLISH);
  const keySet = new Set(keys);
  for (const k of [...en.keySet()].sort()) {
    if (keySet.has(k)) continue;
    try { missing[k] = b.getString(k); } catch (t) { missing[k] = { error: err(t) }; }
  }
  out.englishKeysNotInKeySet = missing;
  out.containsKeyNoSuchKey = b.containsKey('no_such_key_xyz');
  try { b.getString('no_such_key_xyz'); out.noSuchKey = null; } catch (t) { out.noSuchKey = err(t); }
  try { b.getString(null); out.nullKey = null; } catch (t) { out.nullKey = err(t); }
  return out;
}
