// Shared helpers of the X-SPELLRULE adapters (F42): JS twins of SpellRuleOps helpers (docs/review/F42-oracle.md).
import '../../src/lang/register.js';
import { JLanguageTool } from '../../src/core/JLanguageTool.js';
import { UserConfig } from '../../src/core/rules/model/UserConfig.js';
import { Hunspell } from '../../src/core/rules/spelling/hunspell/Hunspell.js';
import { HunspellRule } from '../../src/core/rules/spelling/hunspell/HunspellRule.js';
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

// Java: new HarnessLT(l, uc).getAllRules() (CheckPipeOps.HarnessLT; Language#getRelevantRules incl. the spelling rule of the variant)
export function spellingRules(l, uc) {
  return new JLanguageTool(l, null, null, uc).getAllRules();
}
