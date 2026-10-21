// JS twin of harness op "lang-priority" (MetaOps#priority).
import { JLanguageTool } from '../../src/core/JLanguageTool.js';
import { lang, safe, MetaRule, ruleState } from './_meta-common.mjs';

// Java: MetaOps#priority(JsonNode)
export function run(a) {
  const l = lang(a);
  const res = {};
  if (a.ids !== undefined) res.ids = a.ids.map((id) => [id, safe(() => l.getPriorityForId(id))]);
  if (a.rules !== undefined) {
    res.rules = a.rules.map((sp) => safe(() => {
      const r = new MetaRule(sp);
      const o = ruleState(r);
      o.rulePriority = l.getRulePriority(r);
      return o;
    }));
  }
  if (a.real === true) {
    const lt = new JLanguageTool(l);
    // compact row: [fullId, categoryId, issueType, ruleOwnPriority, getRulePriority]
    res.realRules = lt.getAllRules().map((r) => [r.getFullId(), r.getCategory() === null ? null : r.getCategory().getId().toString(),
      r.getLocQualityIssueType() === null ? null : r.getLocQualityIssueType().name(), r.getPriority(), l.getRulePriority(r)]);
  }
  return res;
}
