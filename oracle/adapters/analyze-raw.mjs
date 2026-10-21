// JS twin of harness op "analyze-raw" (CheckPipeOps#analyzeRaw).
import { languageFor, newTool, errorOf, withNoopAnalysis } from './_check-pipe-common.mjs';

// Java: CheckPipeOps#tok(AnalyzedTokenReadings)
function tok(t) {
  return [
    t.getToken(), t.getStartPos(), t.getEndPos(), t.getPosFix(), t.getCleanToken(), t.getWhitespaceBefore(),
    (t.isImmunized() ? 1 : 0) | (t.isIgnoredBySpeller() ? 2 : 0) | (t.isSentenceStart() ? 4 : 0) | (t.isSentenceEnd() ? 8 : 0)
      | (t.isParagraphEnd() ? 16 : 0) | (t.isWhitespace() ? 32 : 0) | (t.isLinebreak() ? 64 : 0) | (t.isTagged() ? 128 : 0)
      | (t.hasTypographicApostrophe() ? 256 : 0) | (t.isWhitespaceBefore() ? 512 : 0),
    t.getReadings().map((r) => [r.getToken(), r.getLemma(), r.getPOSTag()]),
    t.getChunkTags().map((c) => c.getChunkTag()),
  ];
}

// Java: CheckPipeOps#toks(AnalyzedTokenReadings[])
const toks = (a) => a.map(tok);

// Java: CheckPipeOps#analyzeRaw(JsonNode)
export function run(a) {
  const l = languageFor(a.lang);
  const real = l.getShortCode() === 'en' || l.getShortCode() === 'de' || l.getShortCode() === 'fr'; // English (F45), German (F51), French (F60) disambiguators ported: real post-disambiguation
  return (real ? (f) => f() : (f) => withNoopAnalysis(l, false, f))(() => {
    const lt = newTool(l);
    lt.setCleanOverlappingMatches(false);
    const results = a.texts.map((tn) => {
      try {
        const text = String(tn);
        const ss = [];
        let any = false;
        for (const s of lt.sentenceTokenize(text)) {
          const raw = lt.getRawAnalyzedSentence(s);
          const post = lt.getAnalyzedSentence(s);
          const rd = toks(raw.getTokens());
          const pd = toks(post.getTokens());
          const changed = JSON.stringify(rd) !== JSON.stringify(pd);
          any ||= changed;
          ss.push({ text: s, raw: rd, post: pd, pre: toks(post.getPreDisambigTokens()), disambChanged: changed, realDisamb: real });
        }
        const at = lt.analyzeText(text).map((s) => ({ text: s.getText(), tokens: toks(s.getTokens()), pre: toks(s.getPreDisambigTokens()) }));
        return { sentences: ss, analyzeText: at, disambChanged: any, realDisamb: real };
      } catch (t) {
        return errorOf(t);
      }
    });
    return { results };
  });
}
