// JS twin of harness op "opennlp-model" (OpenNlpOps#model, docs/review/F44-oracle.md).
import { loadModels } from '../../src/lib/opennlp/Models.js';
import { mi } from './_opennlp-common.mjs';

const KEYS = ['Component-Name', 'OpenNLP-Version', 'Language', 'Timestamp', 'Training-Eventhash', 'Training-Algorithm', 'Training-Iterations', 'Training-Cutoff', 'Beam-Size', 'useAlphaNumericOptimization', 'Factory', 'Author', 'Version'];

// Java: OpenNlpOps#manifest(BaseModel) (TreeMap)
function manifest(m) {
  const r = {};
  for (const k of [...KEYS].sort()) r[k] = m.getManifestProperty(k);
  return r;
}

// Java: OpenNlpOps#model(JsonNode)
export function run() {
  const { tm, pm, cm } = loadModels();
  return {
    token: { manifest: manifest(tm), alphaNum: tm.useAlphaNumericOptimization(), language: tm.getLanguage(), maxent: mi(tm.getMaxentModel()) },
    pos: {
      manifest: manifest(pm),
      language: pm.getLanguage(),
      maxent: mi(pm.getPosModel()),
      hasTagDictionary: pm.getTagDictionary() !== null,
      factory: 'opennlp.tools.postag.POSTaggerFactory',
    },
    chunk: { manifest: manifest(cm), language: cm.getLanguage(), maxent: mi(cm.getChunkerModel()), factory: 'opennlp.tools.chunker.ChunkerFactory' },
  };
}
