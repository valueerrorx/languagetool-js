import { CleanOverlappingFilter } from '../rules/CleanOverlappingFilter.js';

// Post-check filters of JLanguageTool#filterMatches owned by F35 (spec F15 R1): pass-through hooks until then.

// Java: new LanguageDependentRuleMatchFilter(language, rules).filter(ruleMatches, annotatedText) -> language.filterRuleMatches(..., rules.allRuleIds()); F35 (CORE-0087)
export const postFilterHooks = {
  languageDependent: (language, rules, ruleMatches) => ruleMatches,
  // Java: new CleanOverlappingFilter(language, hidePremiumMatches).filter(ruleMatches); F35 (CORE-0187)
  cleanOverlapping: (language, hidePremiumMatches, ruleMatches) => new CleanOverlappingFilter(language, hidePremiumMatches).filter(ruleMatches),
};
