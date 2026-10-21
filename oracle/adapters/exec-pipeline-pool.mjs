// JS twin of harness op "exec-pipeline-pool" (LtjsBridge#pipelinePool, SRV-0151..0153): pool identity, frozen pipelines, unmodifiable views.
import { CategoryId } from '../../src/core/rules/model/Category.js';
import { IllegalArgumentException } from '../../src/lib/java/errors.js';
import { IllegalPipelineMutationException } from '../../src/server/Pipeline.js';
import { PipelinePool } from '../../src/server/PipelinePool.js';
import { config, err, settings } from './_exec-common.mjs';

// Java: LtjsBridge#pipelinePool(JsonNode)
export function run(a) {
  const cfg = config(a.config);
  const pool = new PipelinePool(cfg, null, false);
  const named = new Map();
  const settingsOf = new Map();
  const out = [];
  for (const st of a.steps) {
    const op = st.op;
    const name = st.name !== undefined ? st.name : null;
    const r = { op };
    if (name !== null) r.name = name;
    try {
      switch (op) {
        case 'get': {
          const s = settings(st.settings);
          const p = pool.getPipeline(s);
          const same = [];
          for (const [k, v] of named) if (v === p) same.push(k);
          named.set(name, p);
          settingsOf.set(name, s);
          r.sameAs = same;
          try {
            p.setMaxErrorsPerWordRate(0);
            r.frozen = false;
          } catch (e) {
            if (!(e instanceof IllegalPipelineMutationException)) throw e;
            r.frozen = true;
            r.message = e.getMessage();
          }
          break;
        }
        case 'return':
          pool.returnPipeline(settingsOf.get(name), named.get(name));
          r.returned = true;
          break;
        case 'mutate': {
          const p = named.get(name);
          const m = st.method;
          switch (m) {
            case 'setCleanOverlappingMatches': p.setCleanOverlappingMatches(true); break;
            case 'setMaxErrorsPerWordRate': p.setMaxErrorsPerWordRate(0.5); break;
            case 'disableRule': p.disableRule('X_RULE'); break;
            case 'disableRules': p.disableRules(['X_RULE', 'Y_RULE']); break;
            case 'disableCategory': p.disableCategory(new CategoryId('X_CAT')); break;
            case 'enableRule': p.enableRule('X_RULE'); break;
            case 'enableRuleCategory': p.enableRuleCategory(new CategoryId('X_CAT')); break;
            case 'addRule': p.addRule(null); break;
            case 'setOutput': p.setOutput({ println: () => { } }); break;
            case 'addMatchFilter': p.addMatchFilter({ filter: (ms) => ms }); break;
            default: throw new IllegalArgumentException(`unknown mutator ${m}`);
          }
          r.method = m;
          r.mutated = true;
          break;
        }
        case 'view': {
          const p = named.get(name);
          const m = st.method;
          r.method = m;
          switch (m) {
            case 'getDisabledRules.add': p.getDisabledRules().add('Z'); break;
            case 'getAllRules.clear': p.getAllRules().length = 0; break;
            case 'getAllActiveRules.clear': p.getAllActiveRules().length = 0; break;
            case 'getCategories.clear': p.getCategories().clear(); break;
            case 'getUnknownWords.clear': p.getUnknownWords().length = 0; break;
            default: throw new IllegalArgumentException(`unknown view ${m}`);
          }
          r.modified = true;
          break;
        }
        case 'check': {
          const p = named.get(name);
          const ms = [];
          for (const rm of p.check(st.text)) ms.push({ rule: rm.getRule().getFullId(), from: rm.getFromPos(), to: rm.getToPos() });
          r.matches = ms;
          break;
        }
        case 'sleep': break;
        default: throw new IllegalArgumentException(`unknown step ${op}`);
      }
    } catch (t) {
      if (t === null || typeof t !== 'object' || typeof t.getMessage !== 'function') throw t;
      r.error = err(t);
    }
    out.push(r);
  }
  return out;
}
