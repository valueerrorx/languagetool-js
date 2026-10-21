// JS twin of harness op "pipe-check" (PipeOps#check, docs/review/F35-oracle.md).
import { Level, Mode, ParagraphHandling } from '../../src/core/JLanguageTool.js';
import { MultiThreadedJLanguageTool } from '../../src/core/MultiThreadedJLanguageTool.js';
import { annotated, errorOf, languageFor, matchDump, newTool, tones, withNoopAnalysis } from './_check-pipe-common.mjs';
import { floatToString } from '../../src/lib/java/toString.js';
import { buildAll, filter } from './_pipe-common.mjs';
import { ResultCache } from '../../src/core/ResultCache.js';
import { JLanguageTool } from '../../src/core/JLanguageTool.js';

// Java: PipeOps#ranges(CheckResults,Map)
function ranges(cr, res) {
  res.sentenceRanges = cr.getSentenceRanges().map((s) => [s.getFromPos(), s.getToPos()]);
  res.extendedSentenceRanges = cr.getExtendedSentenceRanges().map((s) => [s.getFromPos(), s.getToPos(), Object.fromEntries([...s.getLanguageConfidenceRates()].map(([k, v]) => [k, Number(floatToString(v))]))]);
  res.ignoredRanges = cr.getIgnoredRanges().map((s) => [s.getFromPos(), s.getToPos(), s.getLang()]);
}

// Java: PipeOps#cacheStats(ResultCache)
function cacheStats(c) {
  return { requestCount: c.requestCount(), hitCount: c.hitCount(), hitRate: c.hitRate(), matchesSize: c.getMatchesCache().size(), sentenceSize: c.getSentenceCache().size() };
}

// Java: PipeOps#check(JsonNode); rules read token text only (R4), so the real disambiguator/chunker is bypassed unless readings are observed
export function run(a) {
  const needsReadings = a.opts?.verbose === true || a.cases.some((c) => c.unknown === true);
  const l = languageFor(a.lang);
  if (needsReadings) return runWith(a, l);
  return withNoopAnalysis(l, true, () => runWith(a, l));
}

function runWith(a, l) {
  const o = a.opts ?? {};
  const cache = o.cache !== undefined && o.cache !== null ? new ResultCache(o.cache) : null;
  const mt = o.threads !== undefined && o.threads !== null;
  const lt = mt ? new MultiThreadedJLanguageTool(l, [], null, null, null, null, true, false, buildAll(a.rules)) : new JLanguageTool(l, [], null, cache, null, null, true, false, buildAll(a.rules));
  try {
    if (o.cleanOverlapping !== undefined) lt.setCleanOverlappingMatches(o.cleanOverlapping === true);
    if (o.maxErrorsPerWordRate !== undefined) lt.setMaxErrorsPerWordRate(o.maxErrorsPerWordRate);
    if (o.listUnknownWords !== undefined) lt.setListUnknownWords(o.listUnknownWords === true);
    for (const f of o.filters ?? []) lt.addMatchFilter(filter(f));
    const listener = [];
    const rl = o.listener === true ? { matchFound: (m) => listener.push(`${m.getRule().getFullId()}|${m.getFromPos()}|${m.getToPos()}`) } : null;
    const verbose = o.verbose === true;
    const cases = [];
    for (const c of a.cases) {
      const res = {};
      listener.length = 0;
      let out = '';
      let vout = '';
      const old = process.stdout.write;
      process.stdout.write = (chunk) => { out += String(chunk); return true; };
      try {
        if (verbose) lt.setOutput({ println: (s) => { vout += `${s}\n`; } });
        if (mt && c.shutdownBefore === true) lt.shutdown();
        if (mt && c.shutdownWhenDoneBefore === true) lt.shutdownWhenDone();
        const level = c.level !== undefined ? Level.valueOf(c.level) : Level.DEFAULT;
        const mode = c.mode !== undefined ? Mode.valueOf(c.mode) : Mode.ALL;
        const ph = c.paraMode !== undefined ? ParagraphHandling.valueOf(c.paraMode) : ParagraphHandling.NORMAL;
        const tokenize = c.tokenizeText === undefined || c.tokenizeText === true;
        const cr = lt.check2(annotated(c), tokenize, ph, rl, mode, level, tones(c), null);
        res.matches = cr.getRuleMatches().map(matchDump);
        ranges(cr, res);
      } catch (t) {
        Object.assign(res, errorOf(t));
      } finally {
        process.stdout.write = old;
        if (verbose) lt.setOutput(null);
      }
      res.stdout = out;
      if (verbose) res.verbose = vout;
      if (rl !== null) res.listener = [...listener];
      if (c.unknown === true) {
        try { res.unknownWords = lt.getUnknownWords(); } catch (t) { res.unknownError = errorOf(t).error; }
      }
      if (cache !== null) res.cache = cacheStats(cache);
      cases.push(res);
    }
    return { cases };
  } finally {
    if (mt) lt.shutdown();
  }
}
