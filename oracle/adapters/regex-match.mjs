// JS twin of harness op "regex-match" (RuleInfraOps#regexMatch): RegexPatternRule#match on raw tagger sentences.
import { resetState, sentences } from './_unify-common.mjs';
import { dump } from './rule-match.mjs';
import { err, lang, kind, resolve } from './_ruleinfra-common.mjs';
import { RegexPatternRule } from '../../src/core/patterns/RegexPatternRule.js';

export function beginCase() { resetState(); }

// Java: RuleInfraOps#regexRuleDump(AbstractPatternRule)
function regexRuleDump(r) {
  const o = {
    kind: kind(r), id: r.getId(), subId: r.getSubId(), fullId: r.getFullId(), description: r.getDescription(), message: r.getMessage(),
    suggestionsOutMsg: r.getSuggestionsOutMsg(), filterArgs: r.getFilterArguments(),
  };
  if (r instanceof RegexPatternRule) {
    o.pattern = r.getPattern().pattern();
    o.flags = r.getPattern().flags();
    o.markGroup = r.markGroup;
    o.caseSensitive = r.caseSensitive;
    o.shortMessage = r.shortMessage;
    o.regexFilter = r.regexFilter === null ? null : (r.regexFilter.constructor.FQCN ?? r.regexFilter.constructor.name);
    o.toString = r.toString();
    o.estimateContextForSureMatch = r.estimateContextForSureMatch();
  }
  return o;
}

// Java: RuleInfraOps#regexMatch(JsonNode)
export async function run(a) {
  const l = lang(a.lang);
  const info = [];
  const texts = sentences(l, a.lang, a.texts, info);
  const jobs = [];
  for (const job of a.jobs) {
    try {
      const rule = resolve(job.src, a);
      const jo = { rule: regexRuleDump(rule) };
      const per = [];
      for (const ti of job.texts) {
        const s = texts[ti];
        if (s === null) { per.push(null); continue; }
        try {
          const ms = rule.match(s);
          per.push({ matches: [...ms].map(dump), sug: rule.getSuggestionMatches().length, sugOut: rule.getSuggestionMatchesOutMsg().length });
        } catch (t) { per.push(err(t)); }
      }
      jo.per = per;
      jobs.push(jo);
    } catch (t) { jobs.push(err(t)); }
  }
  return { texts: info, jobs };
}
