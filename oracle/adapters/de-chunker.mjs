// JS twin of harness op "de-chunker" (CheckPipeOps#deChunker): GermanChunker run directly on post-disambiguation and raw tokens vs the pipeline.
import { languageFor, newTool, errorOf } from './_check-pipe-common.mjs';
import { GermanChunker } from '../../src/lang/de/chunking/GermanChunker.js';

const CACHE = new Map(); // Java: CheckPipeOps#CACHE (key "analyze|<lang>")

// Java: CheckPipeOps#chunkDump(List)
function chunkDump(l) {
  return l.map((t) => [t.getToken(), t.getReadings().map((r) => r.getPOSTag()), t.getChunkTags().map((c) => c.getChunkTag())]);
}

// Java: CheckPipeOps#deChunker(JsonNode)
export function run(a) {
  const key = `analyze|${a.lang}`;
  let lt = CACHE.get(key);
  if (lt === undefined) {
    lt = newTool(languageFor(a.lang));
    lt.setCleanOverlappingMatches(false);
    CACHE.set(key, lt);
  }
  const results = a.texts.map((tn) => {
    try {
      const ss = [];
      for (const s of lt.sentenceTokenize(String(tn))) {
        const so = { text: s };
        const post = lt.getAnalyzedSentence(s);
        const pl = [...post.getTokens()];
        so.pipeline = chunkDump(pl);
        for (const t of pl) t.setChunkTags([]);
        new GermanChunker().addChunkTags(pl);
        so.onPost = chunkDump(pl);
        const rl = [...lt.getRawAnalyzedSentence(s).getTokens()];
        new GermanChunker().addChunkTags(rl);
        so.onRaw = chunkDump(rl);
        ss.push(so);
      }
      return { sentences: ss };
    } catch (t) {
      return errorOf(t);
    }
  });
  return { results };
}
