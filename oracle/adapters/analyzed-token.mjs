// JS twin of harness op "analyzed-token" (TextOps#analyzedToken); tagger mode needs taggers/tokenizers (later steps) and is notPorted.
import { AnalyzedToken } from '../../src/core/AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../../src/core/AnalyzedTokenReadings.js';
import { AnalyzedSentence } from '../../src/core/AnalyzedSentence.js';
import { ChunkTag } from '../../src/core/chunking/ChunkTag.js';
import { IllegalArgumentException } from '../../src/lib/java/errors.js';
import { javaCompare } from '../../src/lib/java/strings.js';
import { str } from './_text-common.mjs';

// Java: TextOps#readings(JsonNode,int)
function readings(t, pos) {
  const l = [];
  const tok = str(t.token);
  if (t.readings) for (const r of t.readings) l.push(new AnalyzedToken(tok, str(r[0]), str(r[1])));
  const atr = new AnalyzedTokenReadings(l, 'startPos' in t ? t.startPos : pos);
  if (t.chunkTags) atr.setChunkTags(t.chunkTags.map((x) => new ChunkTag(x)));
  if ('whitespaceBefore' in t) atr.setWhitespaceBefore(t.whitespaceBefore);
  if (t.sentEnd === true) atr.setSentEnd();
  if (t.paraEnd === true) atr.setParagraphEnd();
  if ('immunize' in t) atr.immunize(t.immunize);
  return atr;
}

// Java: TextOps#tokenInfo(AnalyzedTokenReadings)
function tokenInfo(t) {
  return {
    toString: t.toString(),
    token: t.getToken(),
    startPos: t.getStartPos(),
    endPos: t.getEndPos(),
    isWhitespace: t.isWhitespace(),
    isLinebreak: t.isLinebreak(),
    isSentStart: t.isSentenceStart(),
    isSentEnd: t.isSentenceEnd(),
    isParaEnd: t.isParagraphEnd(),
    isTagged: t.isTagged(),
    isWhitespaceBefore: t.isWhitespaceBefore(),
    whitespaceBefore: t.getWhitespaceBefore(),
    cleanToken: t.getCleanToken(),
    isImmunized: t.isImmunized(),
    isIgnoredBySpeller: t.isIgnoredBySpeller(),
    readings: t.getReadings().map((r) => [r.getToken(), r.getPOSTag(), r.getLemma(), r.toString()]),
    chunkTags: t.getChunkTags().map((c) => c.getChunkTag()),
  };
}

// Java: TextOps#sentenceInfo(AnalyzedSentence)
function sentenceInfo(s) {
  return {
    toString: s.toString(),
    toStringSemicolon: s.toString(';'),
    toShortString: s.toShortString(','),
    text: s.getText(),
    annotations: s.getAnnotations(),
    nonWhitespaceTokenCount: s.getNonWhitespaceTokenCount(),
    tokens: s.getTokens().map(tokenInfo),
    lemmaSet: [...s.getLemmaSet()].sort(javaCompare),
  };
}

// Java: TextOps#analyzedToken(JsonNode)
export function run(a) {
  const mode = a.mode;
  if (mode === 'tagger') {
    throw Object.assign(new Error('tagger-based request'), { notPorted: true });
  }
  if (mode === 'synthetic') {
    const l = [];
    let pos = 0;
    for (const t of a.tokens) {
      const r = readings(t, pos);
      l.push(r);
      pos += t.token.length;
    }
    return sentenceInfo(new AnalyzedSentence(l));
  }
  if (mode === 'token') {
    const t = new AnalyzedToken(str(a.token), str(a.pos), str(a.lemma));
    return {
      toString: t.toString(),
      posTag: t.getPOSTag(),
      lemma: t.getLemma(),
      matches: t.matches(new AnalyzedToken(str(a.token), str(a.pos), str(a.lemma))),
    };
  }
  throw new IllegalArgumentException('mode');
}
