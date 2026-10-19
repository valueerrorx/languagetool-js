import { LanguageDependentRuleMatchFilter } from '../rules/LanguageDependentRuleMatchFilter.js';
import { CleanOverlappingFilter } from '../rules/CleanOverlappingFilter.js';

// Post-check filters of JLanguageTool#filterMatches (F35).

// Java: new LanguageDependentRuleMatchFilter(language, rules).filter(ruleMatches, annotatedText) -> language.filterRuleMatches(..., rules.allRuleIds()); CORE-0087
export const postFilterHooks = {
  languageDependent: (language, rules, ruleMatches, annotatedText) => new LanguageDependentRuleMatchFilter(language, rules).filter(ruleMatches, annotatedText),
  // Java: new CleanOverlappingFilter(language, hidePremiumMatches).filter(ruleMatches); CORE-0187
  cleanOverlapping: (language, hidePremiumMatches, ruleMatches) => new CleanOverlappingFilter(language, hidePremiumMatches).filter(ruleMatches),
};
