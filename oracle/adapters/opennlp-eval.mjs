// JS twin of harness op "opennlp-eval" (OpenNlpOps#eval).
import { loadModels } from '../../src/lib/opennlp/Models.js';
import { bitsOf, ds, err } from './_opennlp-common.mjs';

// Java: OpenNlpOps#eval(JsonNode)
export function run(a) {
  const { tm, pm, cm } = loadModels();
  const mm = a.model === 'token' ? tm.getMaxentModel() : a.model === 'pos' ? pm.getPosModel() : cm.getChunkerModel();
  return a.contexts.map((cn) => {
    try {
      const p = mm.eval(cn.map(String));
      return { probs: ds(p), bits: Array.from(p, bitsOf), best: mm.getBestOutcome(p), all: mm.getAllOutcomes(p) };
    } catch (t) {
      return { error: err(t) };
    }
  });
}
