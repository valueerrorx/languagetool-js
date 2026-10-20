// JS twin of harness op "en-rulelist" (EnRuleListOps#run, docs/review/F50-oracle.md).
import { JLanguageTool, Level } from '../../src/core/JLanguageTool.js';
import { UserConfig } from '../../src/core/rules/model/UserConfig.js';
import { AbstractPatternRule } from '../../src/core/patterns/AbstractPatternRule.js';
import { javaCompare } from '../../src/lib/java/strings.js';
import { errorOf } from './_check-pipe-common.mjs';
import { lang } from './_content-common.mjs';

export { beginCase } from './_content-common.mjs';

// Java: EnRuleListOps#err(Throwable)
const err = (t) => ({ error: errorOf(t) });

// Java: EnRuleListOps#row(Rule)
function row(r) {
  return [
    r.getFullId(),
    r.constructor.FQCN ?? `js:${r.constructor.name}`,
    r.getCategory() === null ? null : r.getCategory().getId().toString(),
    r.isDefaultOff(),
    r.isDefaultTempOff(),
    r.getCategory() !== null && r.getCategory().isDefaultOff(),
    r.isPremium(),
    r.getPriority(),
  ];
}

// Java: EnRuleListOps#rows(List)
const rows = (l) => l.map(row);

// Java: EnRuleListOps#lang(JsonNode)
const langOf = (n) => (n === undefined || n === null ? null : lang(n));

// Java: EnRuleListOps#run(JsonNode)
export function run(a) {
  const l = langOf(a.lang);
  const mt = langOf(a.motherTongue);
  const res = {};
  if (a.kind === 'direct') {
    const b = JLanguageTool.getMessageBundle(l);
    const uc = new UserConfig();
    try { res.relevantRules = rows(l.getRelevantRules(b, uc, mt, [])); } catch (t) { res.relevantRules = err(t); }
    try { res.languageModelRulesNullLm = rows(l.getRelevantLanguageModelRules(b, null, uc)); } catch (t) { res.languageModelRulesNullLm = err(t); }
    try { res.languageModelCapableNullLm = rows(l.getRelevantLanguageModelCapableRules(b, null, null, uc, mt, [])); } catch (t) { res.languageModelCapableNullLm = err(t); }
    try { res.remoteRules = rows(l.getRelevantRemoteRules(b, [], null, uc, mt, [], false)); } catch (t) { res.remoteRules = err(t); }
    try { res.hasNGramFalseFriendRule = l.hasNGramFalseFriendRule(mt); } catch (t) { res.hasNGramFalseFriendRule = err(t); }
    return res;
  }
  // lt: all rules in order with activity flags per level
  const lt = mt === null ? new JLanguageTool(l) : new JLanguageTool(l, mt);
  const active = new Set(lt.getAllActiveRules());
  const out = [];
  for (const r of lt.getAllRules()) {
    out.push([...row(r), active.has(r),
      JLanguageTool.isRuleActiveForLevelAndToneTags(r, Level.DEFAULT, new Set()),
      JLanguageTool.isRuleActiveForLevelAndToneTags(r, Level.PICKY, new Set()),
      r.getSourceFile(), r instanceof AbstractPatternRule]);
  }
  res.columns = ['fullId', 'class', 'categoryId', 'defaultOff', 'defaultTempOff', 'categoryDefaultOff', 'premium', 'priority', 'activeByDefault', 'levelDefault', 'levelPicky', 'sourceFile', 'isPatternRule'];
  res.rules = out;
  res.activeCount = active.size;
  res.disabledRules = [...lt.getDisabledRules()].sort(javaCompare);
  return res;
}
