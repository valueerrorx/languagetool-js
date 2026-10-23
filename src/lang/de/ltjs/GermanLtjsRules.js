// LTJS layer (D-061): all German LTJS rules (das/dass and comma), appended to German#getRelevantRules when the layer is on.
import { getLtjsGermanDasDassRules, LTJS_DAS_DASS_RULE_IDS } from './DasDassRules.js';
import { getLtjsGermanCommaRules, LTJS_KOMMA_RULE_IDS } from './KommaRules.js';

// rule ids of the layer for German (registered for switching the layer off per request)
export const LTJS_GERMAN_RULE_IDS = Object.freeze([...LTJS_DAS_DASS_RULE_IDS, ...LTJS_KOMMA_RULE_IDS]);

// the LTJS rules for German; equal matches of two rules: the later rule wins (CleanOverlappingFilter)
export function getLtjsGermanRules(messages, language) {
  return [...getLtjsGermanCommaRules(messages, language), ...getLtjsGermanDasDassRules(messages, language)];
}
