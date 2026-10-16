// JS twin of harness op "json-serialize" (JsonOps#jsonSerialize, docs/review/F19-oracle.md).
// notPorted until src/core/RuleMatchesAsJsonSerializer.js (F19) exists; args.portLater marks requests for later steps (the German tagger marker is satisfied since F22).
import { existsSync } from 'node:fs';
import { Level, Mode, ParagraphHandling } from '../../src/core/JLanguageTool.js';
import { File } from '../../src/lib/java/io/File.js';
import { Languages, resetDynamicLanguages } from '../../src/core/Languages.js';
import { RuleMatch } from '../../src/core/rules/model/RuleMatch.js';
import { SuggestedReplacement, SuggestionType } from '../../src/core/rules/model/SuggestedReplacement.js';
import { CheckResults } from '../../src/core/rules/model/CheckResults.js';
import { SentenceRange } from '../../src/core/rules/model/SentenceRange.js';
import { DetectedLanguage } from '../../src/core/rules/model/DetectedLanguage.js';
import { makeAll, JavaURL, PREFIX } from './_synth-rules.mjs';
import { annotated, errorOf, languageFor, newTool, select, tones, withNoopAnalysis } from './_check-pipe-common.mjs';

const SER = new URL('../../src/core/RuleMatchesAsJsonSerializer.js', import.meta.url);
const s = (n, k) => (n[k] !== undefined && n[k] !== null ? String(n[k]) : null);
// DEV-006: languages outside the wave-1 modules are notPorted
const lang = (code) => {
  if (code === null || code === undefined) return null;
  if (!Languages.isLanguageSupported(code)) throw Object.assign(new Error(`language ${code} not ported (DEV-006)`), { notPorted: true });
  return Languages.getLanguageForShortCode(code);
};

// Java: JsonOps#param(JsonNode,JsonNode,String)
const param = (c, a, k) => (c.ser && k in c.ser ? c.ser[k] : k in a ? a[k] : undefined);

// Java: JsonOps#manualMatches(JsonNode,List,JLanguageTool)
function manualMatches(arr, rules, lt) {
  return arr.map((m) => {
    const r = rules.find((x) => x.getId() === String(m.rule) && x.getSubId() === s(m, 'subId'));
    if (!r) throw new Error(`no synthetic rule ${m.rule}/${s(m, 'subId')}`);
    const sent = s(m, 'sentence') !== null ? lt.getAnalyzedSentence(s(m, 'sentence')) : null;
    const rm = new RuleMatch(r, sent, m.from, m.to, String(m.message), s(m, 'shortMessage'));
    if (m.replacements !== undefined) {
      rm.setSuggestedReplacementObjects(m.replacements.map((x) => {
        const sr = new SuggestedReplacement(String(x.value), s(x, 'shortDescription'), s(x, 'suffix'));
        if (x.type !== undefined) sr.setType(SuggestionType.valueOf(String(x.type)));
        if (x.confidence !== undefined && x.confidence !== null) sr.setConfidence(Math.fround(x.confidence));
        return sr;
      }));
    }
    if (m.autoCorrect !== undefined) rm.setAutoCorrect(m.autoCorrect === true);
    if (s(m, 'url') !== null) rm.setUrl(new JavaURL(s(m, 'url')));
    if (s(m, 'specificRuleId') !== null) rm.setSpecificRuleId(s(m, 'specificRuleId'));
    if (s(m, 'type') !== null) rm.setType(s(m, 'type'));
    return rm;
  });
}

// Java: JsonOps#ranges / extended: duck-typed ranges (getFromPos, getToPos, getLang, getLanguageConfidenceRates)
const ranges = (arr) => (arr ?? []).map((r) => ({ getFromPos: () => r.from, getToPos: () => r.to, getLang: () => String(r.lang) }));
const extended = (arr) => (arr ?? []).map((r) => {
  const rates = new Map(r.rates.map((e) => [String(e.language), Math.fround(e.rate)]));
  return { getFromPos: () => r.from, getToPos: () => r.to, getLanguageConfidenceRates: () => rates, compareTo: (o) => (r.from - o.getFromPos() || r.to - o.getToPos()) };
});

// Java: JsonOps#manualResult(JsonNode,List,JLanguageTool)
function manualResult(c, rules, lt) {
  const cr = new CheckResults(manualMatches(c.matches, rules, lt), ranges(c.ignoredRanges), extended(c.extendedRanges));
  cr.addSentenceRanges((c.sentenceRanges ?? []).map((r) => new SentenceRange(r[0], r[1])));
  return cr;
}

// Java: JsonOps#checkResult(HarnessLT,JsonNode)
function checkResult(lt, c) {
  const level = c.level !== undefined ? Level.valueOf(c.level) : Level.DEFAULT;
  const mode = c.mode !== undefined ? Mode.valueOf(c.mode) : Mode.ALL;
  return lt.check2(annotated(c), true, ParagraphHandling.NORMAL, null, mode, level, tones(c), null);
}

// portLater markers whose dependency is ported (generator labels; the German tagger landed in F22)
const SATISFIED_PORT_LATER = new Set(['German tagger (F32)']);

// Java: JsonOps#jsonSerialize(JsonNode)
export async function run(a) {
  if (a.portLater && !SATISFIED_PORT_LATER.has(a.portLater)) throw Object.assign(new Error(`later: ${a.portLater}`), { notPorted: true });
  if (!existsSync(SER)) throw Object.assign(new Error('RuleMatchesAsJsonSerializer not ported'), { notPorted: true });
  const { RuleMatchesAsJsonSerializer, ConfidenceKey } = await import(SER.href);
  const l = languageFor(a.lang);
  try {
    return runCases(a, l, RuleMatchesAsJsonSerializer, ConfidenceKey);
  } finally {
    resetDynamicLanguages(); // each case file is its own JVM in the oracle
  }
}

// Java: JsonOps#jsonSerialize(JsonNode) body
function runCases(a, l, RuleMatchesAsJsonSerializer, ConfidenceKey) {
  for (const d of a.dynamic ?? []) Languages.addLanguage(String(d.name), String(d.code), new File(String(d.path)));
  return withNoopAnalysis(l, true, () => {
    const lt = newTool(l, null);
    lt.setCleanOverlappingMatches(false);
    for (const r of makeAll(a.rules)) lt.addRule(r);
    select(lt, a.selection, null);
    const synth = lt.getAllRules().filter((r) => r.getId().startsWith(PREFIX));
    const out = a.cases.map((c) => {
      try {
        const text = annotated(c);
        const results = [c.matches !== undefined ? manualResult(c, synth, lt) : checkResult(lt, c)];
        for (const m of c.more ?? []) results.push(m.matches !== undefined ? manualResult(m, synth, lt) : checkResult(lt, m));
        const hidden = c.hidden !== undefined ? manualMatches(c.hidden, synth, lt) : null;
        const p = (k) => param(c, a, k);
        const given = lang(p('given') ?? a.lang);
        const det = p('detected') === undefined || p('detected') === null ? given : lang(p('detected'));
        const dl = p('confidence') !== undefined && p('confidence') !== null ? new DetectedLanguage(given, det, Math.fround(p('confidence')), p('source') ?? null) : new DetectedLanguage(given, det);
        const ser = new RuleMatchesAsJsonSerializer(p('compactMode') ?? 0, lang(p('serLang') ?? null));
        if (p('confidenceMap')) ser.setRuleIdToConfidenceMap(new Map(p('confidenceMap').map((e) => [new ConfidenceKey(lang(e.lang), e.ruleId), Math.fround(e.value)])));
        const json = ser.ruleMatchesToJson2(results, hidden, text, p('contextSize') ?? 40, dl, p('incompleteReason') ?? null, p('showPremiumHint') === true, p('mode') ? Mode.valueOf(p('mode')) : null);
        return { json, parsed: JSON.parse(json) };
      } catch (t) {
        if (t && t.notPorted === true) return { notPorted: true, reason: t.message }; // case-level skip (comparator ignores it)
        return errorOf(t);
      }
    });
    return { cases: out };
  });
}
