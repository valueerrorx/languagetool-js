// LTJS rule layer (D-061): own detection rules beyond Java (ids LTJS_*), on by default.
// Switch: env LTJS_EXTRA_RULES=0|1 (process-wide, read when a language builds its rule list); per request: check({extraRules: false}) or /v2/check ltjsExtraRules=false.

export const LTJS_RULE_PREFIX = 'LTJS_';

const registry = new Map(); // language short code -> rule ids of the layer

// false for 0/false/off/no (any case), true otherwise; undefined/null/'' -> fallback
export function parseExtraRulesFlag(value, fallback = true) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  const v = String(value).trim().toLowerCase();
  if (v === '') return fallback;
  return !(v === '0' || v === 'false' || v === 'off' || v === 'no');
}

// whether languages add the LTJS layer to their rule lists (env LTJS_EXTRA_RULES, default on)
export function isExtraRulesEnabled() {
  return parseExtraRulesFlag(process.env.LTJS_EXTRA_RULES, true);
}

// a language module announces the ids of its LTJS rules (used to switch the layer off per request)
export function registerExtraRuleIds(shortCode, ids) {
  registry.set(shortCode, [...ids]);
}

// ids of the LTJS rules of a language (empty if the layer is off or the language has none)
export function getExtraRuleIds(shortCode) {
  if (!isExtraRulesEnabled()) return [];
  return [...(registry.get(shortCode) ?? [])];
}
