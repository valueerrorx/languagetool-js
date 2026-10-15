// JS twin of harness op "active-rules" (CheckPipeOps#activeRules).
import { JLanguageTool, Level } from '../../src/core/JLanguageTool.js';
import { javaCompare } from '../../src/lib/java/strings.js';
import { PREFIX, makeAll } from './_synth-rules.mjs';
import { categories, filteredSet, ids, languageFor, newTool, select, tones } from './_check-pipe-common.mjs';

// Java: CheckPipeOps#activeRules(JsonNode)
export function run(a) {
  const l = languageFor(a.lang);
  const mt = a.motherTongue !== undefined && a.motherTongue !== null ? languageFor(a.motherTongue) : null;
  const lt = newTool(l, mt);
  for (const r of makeAll(a.rules)) lt.addRule(r);
  const lines = [];
  select(lt, a.selection, lines);
  const res = {};
  res.allRules = ids(lt.getAllRules());
  res.allActive = ids(lt.getAllActiveRules());
  res.disabledRules = filteredSet(lt.getDisabledRules());
  res.categories = categories(lt);
  const dis = new Set();
  for (const r of lt.getAllRules()) if (r.getId().startsWith(PREFIX) && lt.isCategoryDisabled(r.getCategory().getId())) dis.add(r.getCategory().getId().toString());
  res.disabledCategories = [...dis].sort(javaCompare);
  res.stdout = lines;
  res.combos = (a.combos ?? []).map((c) => {
    const level = Level.valueOf(c.level);
    const tt = tones(c);
    const active = [];
    for (const r of lt.getAllActiveRules()) if (r.getId().startsWith(PREFIX) && JLanguageTool.isRuleActiveForLevelAndToneTags(r, level, tt)) active.push(r.getFullId());
    return active;
  });
  return res;
}
