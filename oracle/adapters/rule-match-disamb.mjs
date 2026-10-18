// JS twin of harness op "rule-match-disamb" (DisambOps#ruleMatchDisamb): rule-match on XML-disambiguated sentences plus PatternRule#match.
import { lang, loadFile, inline, resetState } from './_unify-common.mjs';
import { xrd, fresh, err, disambiguate, sha1, resetDisamb } from './_disamb-common.mjs';
import { listGet } from '../../src/lib/java/arrays.js';
import { RuleWithMaxFilter } from '../../src/core/rules/RuleWithMaxFilter.js';
import { PatternRuleMatcher } from '../../src/core/patterns/PatternRuleMatcher.js';
import { PatternRule } from '../../src/core/patterns/PatternRule.js';
import { dump } from './rule-match.mjs';

export function beginCase() { resetState(); resetDisamb(); }

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

// Java: DisambOps#ruleMatchDisamb(JsonNode)
export async function run(a) {
  const l = lang(a.lang);
  const d = await xrd(l, a.global === true, a.dxml ?? null);
  const cache = new Map();
  const jobs = [];
  let inlineRules = null;
  const resolve = (src) => {
    let rs;
    if (src.file === undefined) { inlineRules ??= inline(l, a.xml); rs = inlineRules; } else rs = loadFile(l, l.getRuleFileNames()[src.file]);
    return listGet(rs, src.rule ?? 0);
  };
  for (const job of a.jobs) {
    try {
      const rule = resolve(job.src);
      const per = [];
      for (const ti of job.texts) {
        let s;
        try {
          s = cache.get(ti);
          if (s === undefined) { s = disambiguate(d, fresh(l, a.lang, a.texts[ti])); cache.set(ti, s); }
        } catch (t) { per.push(err(t)); continue; }
        try {
          const nulls = [0];
          const raw = rawMatches(rule, s, nulls);
          const kept = new RuleWithMaxFilter().filter([...raw]);
          per.push({
            raw: raw.map(dump), nulls: nulls[0], kept: kept.map((m) => raw.indexOf(m)), sugMatches: rule.getSuggestionMatches().length,
            full: rule.match(s).map(dump),
          });
        } catch (t) { per.push(err(t)); }
      }
      jobs.push(per);
    } catch (t) { jobs.push(err(t)); }
  }
  const texts = a.texts.map((_, i) => (cache.has(i) ? [cache.get(i).getTokensWithoutWhitespace().length, sha1(cache.get(i).toString())] : null));
  return { texts, jobs };
}
