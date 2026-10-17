// JS twin of harness op "rule-match" (RuleMatchOps#ruleMatch): createRuleMatch hits before RuleWithMaxFilter + kept indices; createRuleMatch/RuleWithMaxFilter are F29, until then notPorted per request.
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { resetState, lang, loadFile, inline, sentences } from './_unify-common.mjs';
import { notPortedYet } from '../../src/core/language/components.js';
import { PatternRuleMatcher } from '../../src/core/patterns/PatternRuleMatcher.js';
import { PatternRule } from '../../src/core/patterns/PatternRule.js';

const MAXF = path.resolve(import.meta.dirname, '../../src/core/rules/RuleWithMaxFilter.js');

export function beginCase() { resetState(); }

// Java: RuleMatchOps#err(Throwable)
export function err(t) {
  if (t && t.notPorted === true) throw t;
  const cls = t.javaClass ?? `js:${t.constructor.name}`;
  return { error: { class: cls, message: cls === 'java.lang.NullPointerException' ? null : (t.message ?? null) } };
}

// Java: RuleMatchOps#dump(RuleMatch)
function dump(m) {
  const url = (u) => (u === null || u === undefined ? null : u.toString());
  return {
    from: m.getFromPos(), to: m.getToPos(), patFrom: m.getPatternFromPos(), patTo: m.getPatternToPos(),
    line: m.getLine(), column: m.getColumn(), endLine: m.getEndLine(), endColumn: m.getEndColumn(),
    message: m.getMessage(), shortMessage: m.getShortMessage(), suggestions: [...m.getSuggestedReplacements()],
    replObjects: m.getSuggestedReplacementObjects().map((s) => [s.getReplacement(), s.getShortDescription(), s.getSuffix()]),
    url: url(m.getUrl()), ruleUrl: url(m.getRule().getUrl()),
    fullId: m.getRule().getFullId !== undefined ? m.getRule().getFullId() : m.getRule().getId(),
    type: m.getType() === null || m.getType() === undefined ? null : m.getType().name(),
    fromSent: m.getFromPosSentence(), toSent: m.getToPosSentence(), original: m.getOriginalErrorStr(),
  };
}

// Java: RuleMatchOps#rawMatches(AbstractTokenBasedRule,AnalyzedSentence,int[])
function rawMatches(rule, sentence, nulls) {
  const useList = rule instanceof PatternRule && rule.useList === true;
  const matcher = new PatternRuleMatcher(rule, useList);
  const tokens = rule.isInterpretPosTagsPreDisambiguation() ? sentence.getPreDisambigTokensWithoutWhitespace() : sentence.getTokensWithoutWhitespace();
  const out = [];
  matcher.doMatch(sentence, tokens, 0, 2147483647, (tp, first, last, fm, lm) => {
    const rm = matcher.createRuleMatch(tp, tokens, first, last, fm, lm, sentence);
    if (rm === null || rm === undefined) nulls[0]++; else out.push(rm);
  });
  return out;
}

// Java: RuleMatchOps#ruleMatch(JsonNode)
export async function run(a) {
  const l = lang(a.lang);
  const info = [];
  const texts = sentences(l, a.lang, a.texts, info);
  let inlineRules = null;
  const resolve = (src) => {
    let rules;
    if (src.file === undefined) { inlineRules ??= inline(l, a.xml); rules = inlineRules; } else rules = loadFile(l, l.getRuleFileNames()[src.file]);
    return rules[src.rule ?? 0];
  };
  const jobs = [];
  for (const job of a.jobs) {
    try {
      const rule = resolve(job.src);
      const per = [];
      for (const ti of job.texts) {
        const s = texts[ti];
        if (s === null) { per.push(null); continue; }
        try {
          const nulls = [0];
          const raw = rawMatches(rule, s, nulls);
          if (!existsSync(MAXF)) throw notPortedYet('RuleWithMaxFilter (F29)');
          const { RuleWithMaxFilter } = await import(pathToFileURL(MAXF).href);
          const kept = new RuleWithMaxFilter().filter([...raw]);
          per.push({ raw: raw.map(dump), nulls: nulls[0], kept: kept.map((m) => raw.indexOf(m)), sugMatches: rule.getSuggestionMatches().length });
        } catch (t) { per.push(err(t)); }
      }
      jobs.push(per);
    } catch (t) { jobs.push(err(t)); }
  }
  return { texts: info, jobs };
}
