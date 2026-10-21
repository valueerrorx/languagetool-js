// Helpers for the German style rule tests: "new JLanguageTool(de-DE)" + setUpRule.
import { Languages } from '../../../../src/core/Languages.js';
import { JLanguageTool } from '../../../../src/core/JLanguageTool.js';

export const german = () => Languages.getLanguageForShortCode('de-DE');

// Java: setUpRule(lt, ...) of the rule tests: disable every rule, add the rule, enable it (an earlier instance with the same id is enabled again by id, as in Java)
export function setUpRule(lt, rule) {
  for (const r of lt.getAllRules()) {
    lt.disableRule(r.getId());
  }
  lt.addRule(rule);
  lt.enableRule(rule.getId());
}

// new JLanguageTool(lang), then setUpRule
export function ltWithRule(lang, rule) {
  const lt = new JLanguageTool(lang);
  setUpRule(lt, rule);
  return lt;
}
