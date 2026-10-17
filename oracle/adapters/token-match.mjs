// JS twin of harness op "token-match" (TokMatchOps#tokenMatch).
import { readFileSync } from 'node:fs';
import { getDataBroker } from '../../src/core/resources/LtStatics.js';
import { PatternRuleLoader } from '../../src/core/patterns/PatternRuleLoader.js';
import { AnalyzedToken } from '../../src/core/AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../../src/core/AnalyzedTokenReadings.js';
import { ChunkTag } from '../../src/core/chunking/ChunkTag.js';
import { err, lang } from './_ruleload-common.mjs';
import { newTool, withNoopAnalysis } from './_check-pipe-common.mjs';

const FILES = new Map();
const INLINE = new Map();
const TOOLS = new Map();

// Java: RuleLoadOps#loadFile(Language,String)
function loadFile(l, fileName) {
  const key = `${l.getShortCodeWithCountryAndVariant()}|${fileName}`;
  if (FILES.has(key)) return FILES.get(key);
  let is = getDataBroker().getAsStream(fileName);
  if (is === null) is = readFileSync(fileName);
  const rules = new PatternRuleLoader().getRules(is, fileName, l);
  FILES.set(key, rules);
  return rules;
}

// Java: TokMatchOps#resolve(JsonNode)
function resolve(src) {
  const l = lang(src.lang);
  let rules;
  let ri;
  if (src.xml !== undefined) {
    const key = `${l.getShortCodeWithCountryAndVariant()}|${src.xml}`;
    rules = INLINE.get(key);
    if (rules === undefined) {
      rules = new PatternRuleLoader().getRules(Buffer.from(src.xml, 'utf8'), 'inline.xml', l);
      INLINE.set(key, rules);
    }
    ri = src.rule ?? 0;
  } else {
    rules = loadFile(l, l.getRuleFileNames()[src.file]);
    ri = src.rule;
  }
  let t = rules[ri].getPatternTokens()[src.tok];
  if (src.ex !== undefined) for (const i of src.ex) t = t.getExceptionList()[i];
  return t;
}

// Java: TokMatchOps#tool(Language)
function tool(l) {
  const k = l.getShortCodeWithCountryAndVariant();
  if (!TOOLS.has(k)) TOOLS.set(k, newTool(l));
  return TOOLS.get(k);
}

// Java: TokMatchOps#synth(JsonNode)
function synth(s) {
  const rd = s.readings.map((r) => new AnalyzedToken(r[0], r[1], r[2]));
  const atr = new AnalyzedTokenReadings(rd, 0);
  atr.setWhitespaceBefore(s.ws === true ? ' ' : '');
  if (s.chunks !== undefined) atr.setChunkTags(s.chunks.map((c) => new ChunkTag(c)));
  return atr;
}

// Java: TokMatchOps#tokenMatch(JsonNode)
export function run(a) {
  const l = lang(a.lang);
  const lt = tool(l);
  const textInfo = [];
  const texts = [];
  for (const tn of a.texts) {
    try {
      const toks = typeof tn === 'object' ? tn.syn.map(synth) : // chunk tags are not read by the compared methods, so the unported EnglishChunker is replaced by a no-op
        withNoopAnalysis(l, true, () => lt.getRawAnalyzedSentence(tn).getTokens());
      texts.push(toks);
      textInfo.push(toks.map((t) => [t.getToken(), t.getReadings().length, t.isWhitespaceBefore()]));
    } catch (t) {
      texts.push(null);
      textInfo.push(err(t));
    }
  }
  const specs = [];
  for (const sp of a.specs) {
    try {
      const pt = resolve(sp.src);
      const per = [];
      for (const ti of sp.texts) {
        const toks = texts[ti];
        if (toks === null) { per.push(null); continue; }
        per.push(toks.map((atr) => {
          const row = [pt.isMatchedByPreviousException(atr) ? 1 : 0];
          for (const r of atr.getReadings()) {
            let m = 0;
            if (pt.isMatched(r)) m |= 1;
            if (pt.isExceptionMatched(r)) m |= 2;
            if (pt.isAndExceptionGroupMatched(r)) m |= 4;
            if (pt.isExceptionMatchedCompletely(r)) m |= 8;
            if (pt.isMatchedByScopeNextException(r)) m |= 16;
            if (pt.isMatchedByPreviousException(r)) m |= 32;
            if (pt.isWhitespaceBefore(r)) m |= 64;
            if (pt.hasAndGroup()) { let all = true; for (const x of pt.getAndGroup()) all &&= x.isMatched(r); if (all) m |= 128; }
            if (pt.hasOrGroup()) { let any = false; for (const x of pt.getOrGroup()) any ||= x.isMatched(r); if (any) m |= 256; }
            row.push(m);
          }
          return row;
        }));
      }
      specs.push(per);
    } catch (t) {
      specs.push(err(t));
    }
  }
  return { texts: textInfo, specs };
}
