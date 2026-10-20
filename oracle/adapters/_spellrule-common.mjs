// Shared helpers of the X-SPELLRULE adapters (F42): JS twins of SpellRuleOps helpers (docs/review/F42-oracle.md).
import '../../src/lang/register.js';
import { UserConfig } from '../../src/core/rules/model/UserConfig.js';
import { getMessageBundleForLanguage } from '../../src/core/resources/ResourceBundleTools.js';
import { MorfologikAmericanSpellerRule } from '../../src/lang/en/rules/MorfologikAmericanSpellerRule.js';
import { MorfologikBritishSpellerRule } from '../../src/lang/en/rules/MorfologikBritishSpellerRule.js';
import { MorfologikAustralianSpellerRule } from '../../src/lang/en/rules/MorfologikAustralianSpellerRule.js';
import { MorfologikCanadianSpellerRule } from '../../src/lang/en/rules/MorfologikCanadianSpellerRule.js';
import { MorfologikNewZealandSpellerRule } from '../../src/lang/en/rules/MorfologikNewZealandSpellerRule.js';
import { MorfologikSouthAfricanSpellerRule } from '../../src/lang/en/rules/MorfologikSouthAfricanSpellerRule.js';
import { MorfologikFrenchSpellerRule } from '../../src/lang/fr/rules/MorfologikFrenchSpellerRule.js';
import { GermanSpellerRule } from '../../src/lang/de/rules/GermanSpellerRule.js';
import { AustrianGermanSpellerRule } from '../../src/lang/de/rules/AustrianGermanSpellerRule.js';
import { SwissGermanSpellerRule } from '../../src/lang/de/rules/SwissGermanSpellerRule.js';
import { Hunspell } from '../../src/core/rules/spelling/hunspell/Hunspell.js';
import { HunspellRule } from '../../src/core/rules/spelling/hunspell/HunspellRule.js';
import { notPorted } from './_pipe-common.mjs';
import { clearDefaultSpellingRules } from '../../src/core/Language.js';
import { MorfologikMultiSpeller } from '../../src/core/rules/spelling/morfologik/MorfologikMultiSpeller.js';

// each case file is its own JVM in the oracle: the static caches start empty
export function beginCase() {
  MorfologikMultiSpeller.clearStaticCaches();
  HunspellRule.clearStaticCaches();
  Hunspell.clearCaches();
  clearDefaultSpellingRules();
}

// Java: SpellRuleOps#err(Throwable)
export function err(t) {
  if (t && t.notPorted === true) throw t;
  const e = { class: t.javaClass ?? t.constructor.FQCN ?? `js:${t.constructor.name}`, message: t.message ?? null };
  const c = typeof t.getCause === 'function' ? t.getCause() : null;
  if (c !== null && c !== undefined) e.cause = err(c);
  return e;
}

// Java: SpellRuleOps#strs(JsonNode,String)
export const strs = (a, k) => (a[k] !== undefined ? a[k].map((x) => (x === null ? null : String(x))) : []);

// Java: SpellRuleOps#userConfig(JsonNode)
export function userConfig(a) {
  if (a.userWords === undefined) return null;
  const cache = a.userCache !== undefined ? BigInt(a.userCache) : null;
  return new UserConfig(strs(a, 'userWords'), [], new Map(), 0, 1n, a.userName !== undefined ? a.userName : null, cache, null, false, null, null, false, [], false, false, false);
}

// Java: SpellRuleOps#safe(Callable0)
export function safe(fn) {
  try {
    return fn();
  } catch (t) {
    return { error: err(t) };
  }
}

// Java: <Language>#getRelevantRules: the spelling rule of the variant (HarnessLT: no GlobalConfig, no alt languages, no language model, no mother tongue)
export function spellingRules(l, uc) {
  const m = getMessageBundleForLanguage(l);
  const full = l.getShortCodeWithCountryAndVariant();
  const en = {
    'en-US': MorfologikAmericanSpellerRule, 'en-GB': MorfologikBritishSpellerRule, 'en-AU': MorfologikAustralianSpellerRule,
    'en-CA': MorfologikCanadianSpellerRule, 'en-NZ': MorfologikNewZealandSpellerRule, 'en-ZA': MorfologikSouthAfricanSpellerRule,
  };
  if (en[full] !== undefined) return [new en[full](m, l, null, uc, [], null, null)];
  // Java: GermanyGerman/AustrianGerman/SwissGerman#getRelevantLanguageModelCapableRules (JLanguageTool passes its field userConfig = new UserConfig() when none is given, so GermanyGerman never takes the default rule)
  if (full === 'de-DE') return [new GermanSpellerRule(m, l, uc ?? new UserConfig(), null, [], null)];
  if (full === 'de-AT') return [new AustrianGermanSpellerRule(m, l, uc ?? new UserConfig(), null)];
  if (full === 'de-CH') return [new SwissGermanSpellerRule(m, l, uc ?? new UserConfig(), null)];
  if (full === 'fr') return [uc === null ? l.getDefaultSpellingRule() : new MorfologikFrenchSpellerRule(m, l, uc, [])];
  throw notPorted(`spellrule: rule list of ${full}`);
}
