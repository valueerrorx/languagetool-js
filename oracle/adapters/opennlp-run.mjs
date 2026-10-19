// JS twin of harness op "opennlp-run" (OpenNlpOps#run).
import { loadModels } from '../../src/lib/opennlp/Models.js';
import { TokenizerME } from '../../src/lib/opennlp/TokenizerME.js';
import { POSTaggerME } from '../../src/lib/opennlp/POSTaggerME.js';
import { ChunkerME } from '../../src/lib/opennlp/ChunkerME.js';
import { doubleToString } from '../../src/lib/java/toString.js';
import { ds, err } from './_opennlp-common.mjs';

// Java: OpenNlpOps#seqs(Sequence[])
const seqs = (ss) => ss.map((s) => ({ outcomes: s.getOutcomes(), probs: ds(s.getProbs()), score: doubleToString(s.getScore()) }));

// Java: OpenNlpOps#run(JsonNode)
export function run(a) {
  const { tm, pm, cm } = loadModels();
  return a.texts.map((text) => {
    const r = {};
    try {
      const clean = String(text).replace(/’/g, "'");
      const tok = new TokenizerME(tm);
      const tokens = tok.tokenize(clean);
      const tp = tok.getTokenProbabilities();
      const spans = new TokenizerME(tm).tokenizePos(clean);
      r.tokens = tokens;
      r.tokenProbs = ds(tp);
      r.spans = spans.map((s) => [s.getStart(), s.getEnd()]);
      const pos = new POSTaggerME(pm);
      const tags = pos.tag(tokens);
      r.tags = tags;
      r.tagProbs = ds(pos.probs());
      r.tagTopK = seqs(new POSTaggerME(pm).topKSequences(tokens));
      const ch = new ChunkerME(cm);
      const chunks = ch.chunk(tokens, tags);
      r.chunks = chunks;
      r.chunkProbs = ds(ch.probs());
      r.chunkTopK = seqs(new ChunkerME(cm).topKSequences(tokens, tags));
      r.chunkSpans = `[${new ChunkerME(cm).chunkAsSpans(tokens, tags).map((s) => s.toString()).join(', ')}]`;
    } catch (t) {
      r.error = err(t);
    }
    return r;
  });
}
