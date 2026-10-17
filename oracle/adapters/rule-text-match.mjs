// JS twin of harness op "rule-text-match" (RuleInfraOps#ruleTextMatch): text-level match of transformed rules over sentence lists.
import { resetState } from './_unify-common.mjs';
import { dump } from './rule-match.mjs';
import { err, lang, rules, splitSentences } from './_ruleinfra-common.mjs';
import { makeTransformer } from './rule-transform.mjs';
import { listGet } from '../../src/lib/java/arrays.js';

export function beginCase() { resetState(); }

// Java: RuleInfraOps#ruleTextMatch(JsonNode)
export async function run(a) {
  try {
    const l = lang(a.lang);
    const rs = rules(a);
    const trans = (await makeTransformer(a.transformer, l)).apply([...rs]).getTransformedRules();
    const texts = [];
    const counts = [];
    for (const t of a.texts) {
      try {
        const ss = splitSentences(l, a.lang, t);
        texts.push(ss);
        counts.push(ss.length);
      } catch (e) { texts.push(null); counts.push(err(e)); }
    }
    const jobs = [];
    for (const job of a.jobs) {
      try {
        const r = listGet(trans, job.rule);
        const jo = { id: r.getId() };
        const per = [];
        for (const ti of job.texts) {
          const ss = texts[ti];
          if (ss === null) { per.push(null); continue; }
          try { per.push({ matches: [...r.match(ss)].map(dump) }); } catch (t) { per.push(err(t)); }
        }
        jo.per = per;
        jobs.push(jo);
      } catch (t) { jobs.push(err(t)); }
    }
    return { nTransformed: trans.length, sentences: counts, jobs };
  } catch (t) { return err(t); }
}
