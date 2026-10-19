// JS twin of harness op "sr-check" (SpellRuleOps#check, docs/review/F42-oracle.md): only the speller rule is added to the tool and enabled.
import { JLanguageTool } from '../../src/core/JLanguageTool.js';
import { selectRules } from '../../src/core/Tools.js';
import { getLanguageForShortCodeGuarded as languageFor } from '../../src/core/language/javaLanguages.js';
import { runCase } from './check2.mjs';
import { beginCase, err, spellingRules, strs, userConfig } from './_spellrule-common.mjs';

export { beginCase };

// Java: SpellRuleOps#check(JsonNode)
export function run(a) {
  const l = languageFor(a.lang);
  const res = {};
  let lt;
  let rules;
  try {
    const uc = userConfig(a);
    rules = spellingRules(l, uc);
    lt = new JLanguageTool(l, [], null, null, null, uc, true, false, []);
    for (const r of rules) lt.addRule(r);
  } catch (t) {
    if (t && t.notPorted === true) throw t;
    res.buildError = err(t);
    return res;
  }
  lt.setCleanOverlappingMatches(false);
  const enabled = new Set(strs(a, 'ids'));
  const selected = [];
  for (const r of lt.getAllRules()) {
    if (enabled.has(r.getId())) {
      selected.push(`${r.getFullId()}|${r.constructor.FQCN}`);
      if (typeof r.acceptPhrases === 'function') {
        if (a.ignoreTokens !== undefined) r.addIgnoreTokens(strs(a, 'ignoreTokens'));
        if (a.acceptPhrases !== undefined) r.acceptPhrases(strs(a, 'acceptPhrases'));
        if (a.considerIgnore !== undefined) r.setConsiderIgnoreWords(a.considerIgnore === true);
      }
    }
  }
  selectRules(lt, [], [], new Set(), enabled, true, false);
  res.selected = selected;
  res.cases = a.cases.map((c) => runCase(lt, c));
  return res;
}
