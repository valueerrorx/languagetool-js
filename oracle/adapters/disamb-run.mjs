// JS twin of harness op "disamb-run" (DisambOps#run): XmlRuleDisambiguator or one DisambiguationPatternRule#replace on fresh raw sentences.
import { Tally } from './_partial.mjs';
import { lang, xrd, rules, fresh, err, dumpSentence, canon, sha1, disambiguate, resetDisamb } from './_disamb-common.mjs';
import { releaseXx } from './_disamb-common.mjs';
import { listGet } from '../../src/lib/java/arrays.js';
import { resetState } from './_unify-common.mjs';

export function beginCase() { resetState(); resetDisamb(); }

// Java: DisambOps#run(JsonNode)
export async function run(a) {
  try { return await runImpl(a); } finally { if (a.lang === 'xx') releaseXx(); }
}

async function runImpl(a) {
  const l = lang(a.lang);
  const global = a.global === true;
  const xml = a.xml ?? null;
  const jobs = [];
  const T = new Tally();
  for (const job of a.jobs) {
    const per = [];
    let jobSkip = null;
    try {
      const whole = job.rule === undefined || job.rule === null;
      const d = whole ? await xrd(l, global, xml) : null;
      const rule = whole ? null : listGet(await rules(l, xml), job.rule);
      for (const ti of job.texts) {
        try {
          const raw = fresh(l, a.lang, a.texts[ti]);
          const o = {};
          if (whole) {
            const res = disambiguate(d, raw);
            if (job.digest === true) {
              const ds = dumpSentence(res);
              o.n = res.getTokensWithoutWhitespace().length;
              o.ch = ds.p !== null;
              o.dg2 = sha1(canon(ds));
            } else o.s = dumpSentence(res);
          } else {
            const res = rule.replace(raw);
            o.same = res === raw;
            if (res !== raw) o.s = dumpSentence(res);
          }
          per.push(T.ok(o));
        } catch (t) { per.push(t && t.notPorted === true ? T.skip(t) : err(t)); }
      }
    } catch (t) { if (t && t.notPorted === true) jobSkip = T.skip(t); else per.push(err(t)); }
    jobs.push(jobSkip ?? per);
  }
  return T.finish({ jobs });
}
