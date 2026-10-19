// JS twin of harness op "opennlp-enchunker" (OpenNlpOps#enchunker).
import { lang, fresh } from './_disamb-common.mjs';
import { err } from './_opennlp-common.mjs';
import { EnglishChunker } from '../../src/lang/en/chunking/EnglishChunker.js';
import { EnglishChunkFilter } from '../../src/lang/en/chunking/EnglishChunkFilter.js';

// Java: OpenNlpOps#dump(List)
function dump(l) {
  return l.map((t) => {
    const r = t.getReadings();
    return [t.getToken(), t.getChunkTags().map((c) => c.getChunkTag()), r === null ? null : r.getToken(), r === null ? null : r.getStartPos()];
  });
}

// Java: OpenNlpOps#enchunker(JsonNode)
export function run(a) {
  const l = lang('en-US');
  const chunker = new EnglishChunker();
  const filter = new EnglishChunkFilter();
  return a.texts.map((tn) => {
    const r = {};
    try {
      const s = fresh(l, 'en-US', tn);
      const list = [...s.getTokens()];
      r.openNlpTokens = chunker.tokenize(list.map((t) => t.getToken()).join(''));
      const orig = chunker.getChunkTagsForReadings(list);
      const filtered = filter.filter(orig);
      r.orig = dump(orig);
      r.filtered = dump(filtered);
      chunker.addChunkTags(list);
      r.assigned = list.map((t) => [t.getToken(), t.getChunkTags().map((c) => c.getChunkTag())]);
    } catch (t) {
      r.error = err(t);
    }
    return r;
  });
}
