// JS twin of harness op "rule-load" (RuleLoadOps#ruleLoad, docs/review/F25-oracle.md); modes needing PatternRuleLoader stay notPorted (F25b).
import { getDataBroker } from '../../src/core/resources/LtStatics.js';
import { PatternRuleBuilderHelper } from '../../src/core/patterns/PatternRuleBuilderHelper.js';
import { Languages } from '../../src/core/Languages.js';
import { err, buildToken, tokenDump } from './_ruleload-common.mjs';

// Java: RuleLoadOps#files(JsonNode)
function files() {
  const out = [];
  for (const l of Languages.get()) {
    const sc = l.getShortCode();
    if (!(sc === 'de' || sc === 'en' || sc === 'fr')) continue;
    const fs = [];
    for (const fn of l.getRuleFileNames()) {
      let is = null;
      try {
        is = getDataBroker().getAsStream(fn);
      } catch (t) {
        if (t && t.notPorted === true) throw t;
        // ignore
      }
      fs.push({ name: fn, inBroker: is !== null && is !== undefined });
    }
    out.push({ code: l.getShortCodeWithCountryAndVariant(), class: l.constructor.FQCN, files: fs });
  }
  return { languages: out };
}

// Java: RuleLoadOps#builder(JsonNode)
function builder(a) {
  const out = [];
  for (const spec of a.tokens) {
    let r;
    try {
      if (!Array.isArray(spec)) {
        // PatternRuleBuilderHelper statics
        const h = String(spec.helper);
        const arg = String(spec.arg);
        let t;
        switch (h) {
          case 'csToken': t = PatternRuleBuilderHelper.csToken(arg); break;
          case 'pos': t = PatternRuleBuilderHelper.pos(arg); break;
          case 'token': t = PatternRuleBuilderHelper.token(arg); break;
          case 'regex': t = PatternRuleBuilderHelper.regex(arg); break;
          case 'csRegex': t = PatternRuleBuilderHelper.csRegex(arg); break;
          default: throw new Error(`unknown helper: ${h}`);
        }
        r = tokenDump(t);
      } else {
        r = tokenDump(buildToken(spec));
      }
    } catch (t) {
      r = err(t);
    }
    out.push(r);
  }
  return { tokens: out };
}

// Java: RuleLoadOps#ruleLoad(JsonNode)
export function run(a) {
  switch (a.mode) {
    case 'files': return files();
    case 'builder': return builder(a);
    case 'file':
    case 'tokens':
    case 'patternRules':
    case 'inline':
      throw Object.assign(new Error(`not ported yet: PatternRuleLoader (rule-load mode ${a.mode}, F25b)`), { notPorted: true });
    default: throw new Error(`unknown mode: ${a.mode}`);
  }
}
