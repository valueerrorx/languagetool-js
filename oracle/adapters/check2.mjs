// JS twin of harness op "check2" (CheckPipeOps#check2, docs/review/F15-oracle.md).
import { JLanguageTool, Level, Mode, ParagraphHandling } from '../../src/core/JLanguageTool.js';
import { SameRuleGroupFilter } from '../../src/core/rules/SameRuleGroupFilter.js';
import { makeAll } from './_synth-rules.mjs';
import { CancelAfter, annotated, errorOf, languageFor, matchDump, newTool, select, tones, withNoopAnalysis } from './_check-pipe-common.mjs';

// Java: CheckPipeOps#ranges(CheckResults,Map)
function ranges(cr, res) {
  res.sentenceRanges = cr.getSentenceRanges().map((s) => [s.getFromPos(), s.getToPos()]);
  res.extendedSentenceRanges = cr.getExtendedSentenceRanges().map((s) => [s.getFromPos(), s.getToPos()]);
  res.ignoredRanges = cr.getIgnoredRanges().map((s) => [s.getFromPos(), s.getToPos(), s.getLang()]);
  return res;
}

// Java: CheckPipeOps.HarnessLT#performCheck: records the match list before the language-dependent filters (opt-in via recordPreLanguageFilter)
export function recordPreLanguageFilter(lt) {
  if (lt.preLanguageFilterInstalled === true) return;
  lt.preLanguageFilterInstalled = true;
  const orig = lt.performCheck.bind(lt);
  lt.performCheck = (analyzedSentences, sentenceTexts, ruleSet, paraMode, annotatedText, listener, mode, level, checkRemoteRules, toneTags) => {
    const res = orig(analyzedSentences, sentenceTexts, ruleSet, paraMode, annotatedText, listener, mode, level, checkRemoteRules, toneTags);
    let f = [];
    for (const m of res.getRuleMatches()) {
      if (lt.ignoreRule(m.getRule())) continue;
      if (!JLanguageTool.isRuleActiveForLevelAndToneTags(m.getRule(), level, toneTags)) continue;
      f.push(m);
    }
    f = new SameRuleGroupFilter().filter(f);
    lt.preLanguageFilter = f.map(matchDump);
    return res;
  };
}

// Java: CheckPipeOps#runCase(HarnessLT,JsonNode); languageFilterChanged/matchesBeforeLanguageFilter only after recordPreLanguageFilter(lt), else false
export function runCase(lt, c) {
  const res = {};
  const cb = c.cancelAfter !== undefined && c.cancelAfter !== null ? new CancelAfter(c.cancelAfter) : null;
  try {
    lt.setCheckCancelledCallback(cb);
    lt.preLanguageFilter = null;
    const level = c.level !== undefined ? Level.valueOf(c.level) : Level.DEFAULT;
    const mode = c.mode !== undefined ? Mode.valueOf(c.mode) : Mode.ALL;
    const ph = c.paraMode !== undefined ? ParagraphHandling.valueOf(c.paraMode) : ParagraphHandling.NORMAL;
    const tokenize = c.tokenizeText === undefined || c.tokenizeText === true;
    const cr = lt.check2(annotated(c), tokenize, ph, null, mode, level, tones(c), null);
    res.matches = cr.getRuleMatches().map(matchDump);
    if (lt.preLanguageFilterInstalled === true) {
      const pre = lt.preLanguageFilter === null || lt.preLanguageFilter === undefined ? [] : lt.preLanguageFilter;
      const changed = JSON.stringify(pre) !== JSON.stringify(res.matches);
      if (changed) res.matchesBeforeLanguageFilter = pre;
      res.languageFilterChanged = changed;
    } else {
      res.languageFilterChanged = false;
    }
    ranges(cr, res);
  } catch (t) {
    Object.assign(res, errorOf(t));
  } finally {
    lt.setCheckCancelledCallback(null);
  }
  if (cb !== null) res.cancelCalls = cb.calls;
  return res;
}

// Java: CheckPipeOps#check2(JsonNode)
export function run(a) {
  const l = languageFor(a.lang);
  const mt = a.motherTongue !== undefined && a.motherTongue !== null ? languageFor(a.motherTongue) : null;
  return withNoopAnalysis(l, true, () => {
    const lt = newTool(l, mt);
    lt.setCleanOverlappingMatches(false);
    for (const r of makeAll(a.rules)) lt.addRule(r);
    select(lt, a.selection, null);
    return { cases: a.cases.map((c) => runCase(lt, c)) };
  });
}
