// Helpers for the German style rule tests: stands in for "new JLanguageTool(de-DE)" + setUpRule (German#getRelevantRules is F59).
import { Languages } from '../../../../src/core/Languages.js';
import { newLt } from '../../../support/ruleTestSupport.js';

export const german = () => Languages.getLanguageForShortCode('de-DE');

// Java: setUpRule(lt, ...) of the rule tests: disable every rule, add the rule, enable it (an earlier instance with the same id is enabled again by id, as in Java)
export function setUpRule(lt, rule) {
  for (const r of lt.getAllRules()) {
    lt.disableRule(r.getId());
  }
  lt.addRule(rule);
  lt.enableRule(rule.getId());
}

// new JLanguageTool(lang) without built-in rules (German#getRelevantRules is F59), then setUpRule
export function ltWithRule(lang, rule) {
  const lt = newLt(lang);
  setUpRule(lt, rule);
  return lt;
}
