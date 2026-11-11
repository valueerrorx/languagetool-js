// Shared check path of src/index.js (node) and src/browser-entry.js (web worker): check(), listLanguages(),
// registerLanguage(), setMemoryLimits(). No top-level node: imports and no server surface; startServer stays in index.js.
import { Languages } from './Languages.js';
import { JLanguageTool, Level, ParagraphHandling } from './JLanguageTool.js';
import { RuleMatchesAsJsonSerializer } from './RuleMatchesAsJsonSerializer.js';
import { DetectedLanguage } from './rules/model/DetectedLanguage.js';
import { CategoryId } from './rules/model/Category.js';
import { selectRules } from './Tools.js';
import { LanguageIdentifierService } from './language/identifier/LanguageIdentifierService.js';
import { Language } from './Language.js';
import { registerClass } from './resources/ClassBroker.js';
import { addResourceRoot } from './resources/ResourceDataBroker.js';
import { getExtraRuleIds, parseExtraRulesFlag } from './ltjs/extraRules.js';

const CONTEXT_SIZE = 40; // as the server (TextChecker.CONTEXT_SIZE)
let MAX_CACHED_INSTANCES = 8; // LRU cap, adjustable via setMemoryLimits()
let MAX_TEXT_LENGTH = Infinity; // unlimited like the original index.js; setMemoryLimits({maxTextLength}) applies a cap (e.g. the iOS worker's 50000)
const cache = new Map(); // key -> JLanguageTool (insertion order = LRU order)

// bounds the shared check path memory: maxCachedInstances (LRU cache size, at least 1) and maxTextLength (thrown on longer texts)
export function setMemoryLimits({ maxCachedInstances, maxTextLength } = {}) {
  if (maxCachedInstances !== undefined && maxCachedInstances !== null) MAX_CACHED_INSTANCES = Math.max(1, maxCachedInstances);
  if (maxTextLength !== undefined && maxTextLength !== null) MAX_TEXT_LENGTH = maxTextLength;
}

// lists the registered languages like GET /v2/languages: [{name, code, longCode}]
export function listLanguages() {
  return Languages.get().map((lang) => ({ name: lang.getName(), code: lang.getShortCode(), longCode: lang.getShortCodeWithCountryAndVariant() }));
}

// registers a custom language (browser/worker): a minimal dynamic Language class whose rules/dictionaries load from
// resourceRoot via the resource broker (addResourceRoot); it shows up in listLanguages() and is usable in check().
// longCode defaults to shortCode. Returns the registered language.
export function registerLanguage({ name, shortCode, longCode = shortCode, resourceRoot }) {
  const fqcn = `org.languagetool.ltjs.Language.${shortCode}`;
  class RegisteredLanguage extends Language {
    static FQCN = fqcn;
    getShortCode() { return shortCode; }
    getName() { return name; }
    getCountries() { return longCode.length > shortCode.length && longCode.startsWith(`${shortCode}-`) ? [longCode.slice(shortCode.length + 1)] : []; }
    getMaintainers() { return []; }
    getRelevantRules() { return []; } // only pattern rules (from resourceRoot grammar.xml via getRuleFileNames())
  }
  registerClass(fqcn, RegisteredLanguage);
  const lang = Languages.getOrAddLanguageByClassName(fqcn);
  if (resourceRoot !== undefined && resourceRoot !== null) addResourceRoot(resourceRoot);
  return lang;
}

// resolves a language code ("de", "de-DE", "auto") to a registered Language
function resolveLanguage(code, text) {
  if (code === undefined || code === null || code === '') throw new Error("check(): option 'language' is required (e.g. 'de-DE' or 'auto')");
  if (code === 'auto') {
    // server TextChecker#detectLanguageOfString with default arguments, inlined to keep this module free of the server surface;
    // the returned DetectedLanguage carries givenLanguage null (as in the server port), keep .getGivenLanguage() verbatim
    const identifier = LanguageIdentifierService.INSTANCE.getSimpleLanguageIdentifier([]);
    const detected = identifier.detectLanguage(identifier.cleanAndShortenText(text), [], [], false);
    let lang = detected === null ? Languages.getLanguageForShortCode('en') : detected.getDetectedLanguage();
    // mirrors TextChecker#detectLanguageOfString: no preferredVariants, so resolve the default variant (de -> de-DE, en -> en-US)
    if (lang.getDefaultLanguageVariant() !== null) {
      lang = lang.getDefaultLanguageVariant();
    }
    return new DetectedLanguage(null, lang, detected !== null ? detected.getDetectionConfidence() : 0,
      detected !== null ? detected.getDetectionSource() : null).getGivenLanguage();
  }
  return Languages.getLanguageForShortCode(code);
}

// JLanguageTool of a language/rule selection, kept in a small LRU cache (creating one loads all rules)
function getInstance(lang, motherTongue, o) {
  const key = JSON.stringify([lang.getShortCodeWithCountryAndVariant(), motherTongue?.getShortCodeWithCountryAndVariant() ?? null,
    o.enabledRules, o.disabledRules, o.enabledCategories, o.disabledCategories, o.enabledOnly]);
  let lt = cache.get(key);
  if (lt !== undefined) {
    cache.delete(key);
    cache.set(key, lt);
    return lt;
  }
  lt = new JLanguageTool(lang, motherTongue);
  selectRules(lt, new Set(o.disabledCategories.map((c) => new CategoryId(c))), new Set(o.enabledCategories.map((c) => new CategoryId(c))),
    new Set(o.disabledRules), new Set(o.enabledRules), o.enabledOnly, false);
  cache.set(key, lt);
  if (cache.size > MAX_CACHED_INSTANCES) cache.delete(cache.keys().next().value);
  return lt;
}

const list = (v) => (v === undefined || v === null ? [] : (Array.isArray(v) ? v : String(v).split(',').filter((s) => s !== '')));

/**
 * Checks a text. Returns the LanguageTool /v2/check JSON object ({software, warnings, language, matches, ...}).
 * options: language (required, e.g. 'de-DE', 'en', 'auto'), motherTongue, enabledRules, disabledRules, enabledCategories,
 * disabledCategories (arrays or comma separated strings), enabledOnly (bool), level ('default' | 'picky'),
 * extraRules (bool, default true: the LTJS rule layer, D-061; env LTJS_EXTRA_RULES=0 removes it process-wide).
 * Set via setMemoryLimits({maxTextLength}), texts longer than that cap throw 'check(): text too long' (unlimited by default).
 */
export async function check(text, options = {}) {
  if (typeof text !== 'string') throw new TypeError('check(): text must be a string');
  if (text.length > MAX_TEXT_LENGTH) throw new Error('check(): text too long');
  const lang = resolveLanguage(options.language, text);
  const motherTongue = options.motherTongue ? Languages.getLanguageForShortCode(options.motherTongue) : null;
  const level = String(options.level ?? 'default').toLowerCase() === 'picky' ? Level.PICKY : Level.DEFAULT;
  const enabledOnly = options.enabledOnly === true;
  // LTJS layer (D-061): extraRules: false switches the layer's rules off for this call
  const extraOff = !parseExtraRulesFlag(options.extraRules) && !enabledOnly ? getExtraRuleIds(lang.getShortCode()) : [];
  const lt = getInstance(lang, motherTongue, {
    enabledRules: list(options.enabledRules), disabledRules: [...list(options.disabledRules), ...extraOff],
    enabledCategories: list(options.enabledCategories), disabledCategories: list(options.disabledCategories),
    enabledOnly,
  });
  const matches = lt.check(text, true, ParagraphHandling.NORMAL, null, level);
  const json = new RuleMatchesAsJsonSerializer().ruleMatchesToJson(matches, text, CONTEXT_SIZE, new DetectedLanguage(lang, lang));
  return JSON.parse(json);
}
