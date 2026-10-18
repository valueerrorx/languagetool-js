// JS twin of harness op "unify-match" (UnifyOps#match): raw performer hits + unified tokens; real Unifier (F28), disambiguation rules need DisambiguationRuleLoader.
import { Tally } from './_partial.mjs';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { resetState, lang, err, preload, disambRules, loadFile, inline, sentences } from './_unify-common.mjs';
import { atrsDump } from './_unify-common.mjs';
import { notPortedYet } from '../../src/core/language/components.js';

const PERFORMER = path.resolve(import.meta.dirname, '../../src/core/patterns/AbstractPatternRulePerformer.js');

// Java: UnifyOps.Capture#run(AnalyzedSentence)
function capture(Performer, rule, unifier, sentence) {
  class Capture extends Performer {
    run() {
      const hits = [];
      const pre = this.isInterpretPosTagsPreDisambiguation();
      const tokens = pre ? sentence.getPreDisambigTokensWithoutWhitespace() : sentence.getTokensWithoutWhitespace();
      this.doMatch(sentence, tokens, (tp, first, last, fm, lm) => {
        hits.push([Array.from(tp), first, last, fm, lm,
          first >= 0 ? tokens[first].getStartPos() : null, last >= 0 ? tokens[last].getEndPos() : null,
          fm >= 0 ? tokens[fm].getStartPos() : null, lm >= 0 ? tokens[lm].getEndPos() : null, atrsDump(this.unifiedTokens)]);
      });
      return hits;
    }
  }
  return new Capture(rule, unifier).run();
}

// Java: UnifyOps#match(JsonNode)
export async function run(a) {
  if (!existsSync(PERFORMER)) throw notPortedYet('AbstractPatternRulePerformer (F27)');
  const { AbstractPatternRulePerformer } = await import(pathToFileURL(PERFORMER).href);
  const l = lang(a.lang);
  const pre = a.preload ?? '';
  if (a.xml === undefined && pre !== '') await preload(l, pre === 'disamb');
  const info = [];
  const texts = sentences(l, a.lang, a.texts, info);
  const jobs = [];
  const T = new Tally();
  for (const job of a.jobs) {
    try {
      const src = job.src;
      let rule;
      let u;
      if (src.disamb !== undefined) {
        rule = (await disambRules(l))[src.disamb];
        u = l.getDefaultLanguageVariant().getDisambiguationUnifier();
      } else {
        const rules = src.file !== undefined ? loadFile(l, l.getRuleFileNames()[src.file]) : inline(l, a.xml);
        const ar = rules[src.rule ?? 0];
        if (src.anti !== undefined) {
          rule = ar.getAntiPatterns()[src.anti];
          u = l.getDefaultLanguageVariant().getDisambiguationUnifier();
        } else {
          rule = ar;
          u = l.getUnifier();
        }
      }
      const per = [];
      for (const ti of job.texts) {
        const s = texts[ti];
        if (s === null) { per.push(null); continue; }
        try { per.push(T.ok(capture(AbstractPatternRulePerformer, rule, u, s))); } catch (t) { per.push(t && t.notPorted === true ? T.skip(t) : err(t)); }
      }
      jobs.push(per);
    } catch (t) {
      jobs.push(t && t.notPorted === true ? T.skip(t) : err(t));
    }
  }
  return T.finish({ texts: info, jobs });
}

// parity hook: fresh state per case file (Java: one JVM per case)
export function beginCase() { resetState(); }
