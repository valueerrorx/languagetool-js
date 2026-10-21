// JS twin of harness op "tools-correct" (ToolsOps#correct, docs/review/F40-oracle.md).
import { FakeRule } from '../../src/core/rules/FakeRule.js';
import { RuleMatch } from '../../src/core/rules/model/RuleMatch.js';
import { JLanguageTool } from '../../src/core/JLanguageTool.js';
import { correctText, correctTextFromMatches } from '../../src/core/Tools.js';
import { errorOf } from './_check-pipe-common.mjs';
import { WAVE_CODES } from '../lib/scope.mjs';
import { langFor, notPorted } from './_bitext-common.mjs';

const LTS = new Map(); // Java: ToolsOps#LTS

// Java: ToolsOps#correct(JsonNode)
export function run(a) {
  const out = [];
  if (a.matchSets !== undefined) {
    for (const set of a.matchSets) {
      const r = {};
      const contents = set.contents;
      r.contents = contents;
      try {
        const ms = [];
        for (const m of set.matches) {
          const rm = new RuleMatch(new FakeRule(), null, m.from, m.to, 'msg');
          if (m.replacements !== undefined) rm.setSuggestedReplacements([...m.replacements]);
          ms.push(rm);
        }
        r.result = correctTextFromMatches(contents, ms);
      } catch (t) {
        r.error = errorOf(t);
      }
      out.push(r);
    }
    return out;
  }
  const l = langFor(a.lang);
  if (!WAVE_CODES.includes(l.getShortCode())) throw notPorted(`tools-correct: rule list of ${a.lang} (rule list not ported)`);
  let lt = LTS.get(a.lang);
  if (lt === undefined) LTS.set(a.lang, lt = new JLanguageTool(l)); // Java: ToolsOps#lt(String)
  if (a.ids !== undefined) {
    const ids = new Set(a.ids.map(String));
    for (const r of lt.getAllRules()) if (!ids.has(r.getId())) lt.disableRule(r.getId());
  }
  for (const t of a.texts) {
    const r = { text: String(t) };
    try {
      r.result = correctText(String(t), lt);
      r.matches = lt.check(String(t)).length;
    } catch (e) {
      r.error = errorOf(e);
    }
    out.push(r);
  }
  return out;
}
