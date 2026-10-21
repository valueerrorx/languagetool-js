// JS twin of harness op "sr-check" (SpellRuleOps#check, docs/review/F42-oracle.md): real tool (HarnessLT) with the language rule list.
import { JLanguageTool } from '../../src/core/JLanguageTool.js';
import { selectRules } from '../../src/core/Tools.js';
import { getLanguageForShortCodeGuarded as languageFor } from '../../src/core/language/javaLanguages.js';
import { runCase } from './check2.mjs';
import { beginCase, err, strs, userConfig } from './_spellrule-common.mjs';

export { beginCase };

// Java: SpellRuleOps#check(JsonNode)
export function run(a) {
  const l = languageFor(a.lang);
  const res = {};
  let lt;
  try {
    const uc = userConfig(a);
    lt = new JLanguageTool(l, null, null, uc); // Java: HarnessLT(Language,UserConfig)
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
