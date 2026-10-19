// JS twin of harness op "tools-correct" (ToolsOps#correct, docs/review/F40-oracle.md).
import { FakeRule } from '../../src/core/rules/FakeRule.js';
import { RuleMatch } from '../../src/core/rules/model/RuleMatch.js';
import { correctTextFromMatches } from '../../src/core/Tools.js';
import { errorOf } from './_check-pipe-common.mjs';
import { langFor, notPorted } from './_bitext-common.mjs';

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
  langFor(a.lang);
  throw notPorted(`tools-correct: rule list of ${a.lang} (built-in Java rules not ported, F45+)`);
}
