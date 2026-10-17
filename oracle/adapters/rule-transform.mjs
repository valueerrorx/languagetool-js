// JS twin of harness op "rule-transform" (RuleInfraOps#ruleTransform): Repeated/ConsistencyPatternRuleTransformer#apply and JLanguageTool#transformPatternRules.
import { resetState } from './_unify-common.mjs';
import { err, lang, optional, rules, kind, className } from './_ruleinfra-common.mjs';
import { AbstractPatternRule } from '../../src/core/patterns/AbstractPatternRule.js';
import { newTool } from './_check-pipe-common.mjs';

export function beginCase() { resetState(); }

const SUPPORT = ['de-DE', 'de-AT', 'en-US', 'en-GB', 'fr'];

// Java: RuleInfraOps#ruleBrief(Rule)
function ruleBrief(r) {
  const o = { class: className(r), id: r.getId(), subId: r.getSubId() };
  if (r instanceof AbstractPatternRule) {
    o.kind = kind(r);
    o.fullId = r.getFullId();
  }
  return o;
}

// Java: RuleInfraOps#transformedDump(Rule)
function transformedDump(r) {
  const o = { class: className(r), id: r.getId(), description: r.getDescription(), premium: r.isPremium(), minToCheckParagraph: r.minToCheckParagraph() };
  o.wrapped = r.getWrappedRules().map((x) => [x.getFullId(), x.getMinPrevMatches(), x.getDistanceTokens()]);
  o.supports = {};
  for (const c of SUPPORT) o.supports[c] = r.supportsLanguage(lang(c));
  return o;
}

// Java: RuleInfraOps#transformer(String,Language)
export async function makeTransformer(name, l) {
  if (name === 'repeated') {
    const m = await optional('core/patterns/RepeatedPatternRuleTransformer.js', 'RepeatedPatternRuleTransformer (F30)');
    return new m.RepeatedPatternRuleTransformer(l);
  }
  const m = await optional('core/patterns/ConsistencyPatternRuleTransformer.js', 'ConsistencyPatternRuleTransformer (F30)');
  return new m.ConsistencyPatternRuleTransformer(l);
}

// Java: RuleInfraOps#ruleTransform(JsonNode)
export async function run(a) {
  try {
    const l = lang(a.lang);
    const rs = rules(a);
    const o = { n: rs.length };
    if (a.transformer === 'tool') {
      const lt = newTool(l);
      if (typeof lt.transformPatternRules !== 'function') { const e = new Error('JLanguageTool#transformPatternRules not ported (F30)'); e.notPorted = true; throw e; }
      o.result = lt.transformPatternRules([...rs], l).map(ruleBrief);
      return o;
    }
    const tr = (await makeTransformer(a.transformer, l)).apply([...rs]);
    o.remaining = tr.getRemainingRules().map(ruleBrief);
    o.transformed = tr.getTransformedRules().map(transformedDump);
    return o;
  } catch (t) { return err(t); }
}
