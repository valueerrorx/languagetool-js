// JS twin of harness op "lang-priority" (MetaOps#priority).
import { lang, safe, MetaRule, ruleState } from './_meta-common.mjs';

// Java: MetaOps#priority(JsonNode)
export function run(a) {
  if (a.real === true) throw Object.assign(new Error('language rule lists not ported yet'), { notPorted: true });
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
  return res;
}
