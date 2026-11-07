// LTJS layer (D-061): all German LTJS rules (das/dass, comma, relative pronouns, subject-verb), appended to German#getRelevantRules when the layer is on.
import { getLtjsGermanDasDassRules, LTJS_DAS_DASS_RULE_IDS } from './DasDassRules.js';
import { getLtjsGermanCommaRules, LTJS_KOMMA_RULE_IDS } from './KommaRules.js';
import { getLtjsGermanRelativRules, LTJS_RELATIV_RULE_IDS } from './RelativRules.js';
import { getLtjsGermanSubjektVerbRules, LTJS_SUBJEKT_VERB_RULE_IDS } from './SubjektVerbRules.js';

// rule ids of the layer for German (registered for switching the layer off per request)
export const LTJS_GERMAN_RULE_IDS = Object.freeze([...LTJS_DAS_DASS_RULE_IDS, ...LTJS_KOMMA_RULE_IDS, ...LTJS_RELATIV_RULE_IDS, ...LTJS_SUBJEKT_VERB_RULE_IDS]);

// the LTJS rules for German; equal matches of two rules: the later rule wins (CleanOverlappingFilter)
export function getLtjsGermanRules(messages, language) {
  // relative pronoun rules before das/dass: 'die Meinung, das …' is more likely 'dass' than 'die'
  return [...getLtjsGermanCommaRules(messages, language), ...getLtjsGermanRelativRules(messages, language),
    ...getLtjsGermanSubjektVerbRules(messages, language), ...getLtjsGermanDasDassRules(messages, language)];
}
