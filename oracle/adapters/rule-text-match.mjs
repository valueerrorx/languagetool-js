// JS twin of harness op "rule-text-match" (RuleInfraOps#ruleTextMatch): text-level match of transformed rules over sentence lists.
import { Tally } from './_partial.mjs';
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
    const T = new Tally();
    for (const job of a.jobs) {
      try {
        const r = listGet(trans, job.rule);
        const jo = { id: r.getId() };
        const per = [];
        for (const ti of job.texts) {
          const ss = texts[ti];
          if (ss === null) { per.push(null); continue; }
          try { per.push(T.ok({ matches: [...r.match(ss)].map(dump) })); } catch (t) { per.push(t && t.notPorted === true ? T.skip(t) : err(t)); }
        }
        jo.per = per;
        jobs.push(jo);
      } catch (t) { jobs.push(t && t.notPorted === true ? T.skip(t) : err(t)); }
    }
    return T.finish({ nTransformed: trans.length, sentences: counts, jobs });
  } catch (t) { return err(t); }
}
