// JS twin of harness op "analyze" (ContentOps#analyze).
import { tool } from './_content-common.mjs';

export { beginCase } from './_content-common.mjs';

// Java: ContentOps#token(AnalyzedTokenReadings)
function token(t) {
  return {
    text: t.getToken(),
    startPos: t.getStartPos(),
    endPos: t.getEndPos(),
    whitespaceBefore: t.getWhitespaceBefore(),
    readings: t.getReadings().map((r) => ({ token: r.getToken(), lemma: r.getLemma(), pos: r.getPOSTag() })),
    chunkTags: t.getChunkTags().map((c) => c.getChunkTag()),
    immunized: t.isImmunized(),
    ignoreSpelling: t.isIgnoredBySpeller(),
    sentenceStart: t.isSentenceStart(),
    sentenceEnd: t.isSentenceEnd(),
    paragraphEnd: t.isParagraphEnd(),
    whitespace: t.isWhitespace(),
    linebreak: t.isLinebreak(),
  };
}

// Java: ContentOps#analyze(JsonNode)
export function run(a) {
  const lt = tool(a);
  const pre = a.preDisambiguation === true;
  const sents = [];
  let offset = 0;
  for (const s of lt.analyzeText(a.text)) {
    const so = { text: s.getText(), offset };
    offset += s.getText().length;
    so.tokens = s.getTokens().map(token);
    if (pre) so.preDisambigTokens = s.getPreDisambigTokens().map(token);
    sents.push(so);
  }
  return { sentences: sents };
}
