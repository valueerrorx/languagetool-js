// JS twin of harness op "pipe-office" (PipeOps#office, docs/review/F35-oracle.md).
import { CategoryId } from '../../src/core/rules/model/Category.js';
import { javaCompare } from '../../src/lib/java/strings.js';
import { JLanguageTool } from '../../src/core/JLanguageTool.js';
import { errorOf, languageFor } from './_check-pipe-common.mjs';
import { buildAll } from './_pipe-common.mjs';

const fullIds = (rules) => rules.map((r) => r.getFullId());
const sorted = (c) => [...c].sort(javaCompare);

// Java: PipeOps#office(JsonNode)
export function run(a) {
  const lt = new JLanguageTool(languageFor(a.lang), [], null, null, null, null, true, false, buildAll(a.rules));
  lt.setCleanOverlappingMatches(false);
  const steps = [];
  for (const st of a.steps) {
    const r = {};
    try {
      switch (st.do) {
        case 'office': r.result = fullIds(lt.getAllActiveOfficeRules()); break;
        case 'active': r.result = fullIds(lt.getAllActiveRules()); break;
        case 'disable': lt.disableRule(st.id); break;
        case 'enable': lt.enableRule(st.id); break;
        case 'disableCategory': lt.disableCategory(new CategoryId(st.id)); break;
        case 'state': r.result = { disabled: sorted(lt.getDisabledRules()), enabled: sorted(lt.enabledRules) }; break;
        default: throw new Error(st.do);
      }
    } catch (t) {
      Object.assign(r, errorOf(t));
    }
    steps.push(r);
  }
  return { steps };
}
