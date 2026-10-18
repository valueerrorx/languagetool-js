// JS twin of harness op "seq-match" (SeqMatchOps#seqMatch); needs AbstractPatternRulePerformer (F27), until then every request is NOT PORTED.
import { Tally } from './_partial.mjs';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { getDataBroker } from '../../src/core/resources/LtStatics.js';
import { PatternRuleLoader } from '../../src/core/patterns/PatternRuleLoader.js';
import { AnalyzedToken } from '../../src/core/AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../../src/core/AnalyzedTokenReadings.js';
import { AnalyzedSentence } from '../../src/core/AnalyzedSentence.js';
import { err, lang } from './_ruleload-common.mjs';
import { newTool, withNoopAnalysis } from './_check-pipe-common.mjs';
import { notPortedYet } from '../../src/core/language/components.js';

const FILES = new Map();
const INLINE = new Map();
const TOOLS = new Map();
const PERFORMER = path.resolve(import.meta.dirname, '../../src/core/patterns/AbstractPatternRulePerformer.js');

// Java: RuleLoadOps#loadFile(Language,String)
function loadFile(l, fileName) {
  const key = `${l.getShortCodeWithCountryAndVariant()}|${fileName}`;
  if (FILES.has(key)) return FILES.get(key);
  let is = getDataBroker().getAsStream(fileName);
  if (is === null) is = readFileSync(fileName);
  const rules = new PatternRuleLoader().getRules(is, fileName, l);
  FILES.set(key, rules);
  return rules;
}

// Java: SeqMatchOps#resolve(JsonNode)
function resolve(src, a) {
  const l = lang(a.lang);
  let rules;
  if (src.file === undefined) {
    const key = `${l.getShortCodeWithCountryAndVariant()}|${a.xml}`;
    rules = INLINE.get(key);
    if (rules === undefined) {
      rules = new PatternRuleLoader().getRules(Buffer.from(a.xml, 'utf8'), 'inline.xml', l);
      INLINE.set(key, rules);
    }
  } else {
    rules = loadFile(l, l.getRuleFileNames()[src.file]);
  }
  return rules[src.rule ?? 0];
}

// Java: SeqMatchOps#synth(JsonNode,int)
function synth(s, startPos) {
  const rd = s.readings.map((r) => new AnalyzedToken(r[0], r[1], r[2]));
  const atr = new AnalyzedTokenReadings(rd, startPos);
  atr.setWhitespaceBefore(s.ws === true ? ' ' : '');
  return atr;
}

// Java: SeqMatchOps.Capture#run(AnalyzedSentence)
function capture(Performer, rule, sentence) {
  class Capture extends Performer {
    run() {
      const hits = [];
      const pre = this.isInterpretPosTagsPreDisambiguation();
      const tokens = pre ? sentence.getPreDisambigTokensWithoutWhitespace() : sentence.getTokensWithoutWhitespace();
      this.doMatch(sentence, tokens, (tp, first, last, fm, lm) => {
        hits.push([Array.from(tp), first, last, fm, lm,
          first >= 0 ? tokens[first].getStartPos() : null, last >= 0 ? tokens[last].getEndPos() : null,
          fm >= 0 ? tokens[fm].getStartPos() : null, lm >= 0 ? tokens[lm].getEndPos() : null]);
      });
      return hits;
    }
  }
  return new Capture(rule, rule.getLanguage().getUnifier()).run();
}

// Java: SeqMatchOps#seqMatch(JsonNode)
export async function run(a) {
  if (!existsSync(PERFORMER)) throw notPortedYet('AbstractPatternRulePerformer / PatternRuleMatcher (F27)');
  const { AbstractPatternRulePerformer } = await import(pathToFileURL(PERFORMER).href);
  const l = lang(a.lang);
  if (!TOOLS.has(a.lang)) TOOLS.set(a.lang, newTool(l));
  const lt = TOOLS.get(a.lang);
  const textInfo = [];
  const texts = [];
  for (const tn of a.texts) {
    try {
      let s;
      if (typeof tn === 'object') {
        let pos = 0;
        s = new AnalyzedSentence(tn.syn.map((sy) => { const atr = synth(sy, pos); pos += atr.getToken() === null ? 0 : atr.getToken().length; return atr; }));
      } else {
        s = withNoopAnalysis(l, true, () => lt.getRawAnalyzedSentence(tn));
      }
      texts.push(s);
      textInfo.push(s.getTokensWithoutWhitespace().length);
    } catch (t) {
      texts.push(null);
      textInfo.push(err(t));
    }
  }
  const jobs = [];
  const T = new Tally();
  for (const job of a.jobs) {
    try {
      const rule = resolve(job.src, a);
      const per = [];
      for (const ti of job.texts) {
        const s = texts[ti];
        if (s === null) { per.push(null); continue; }
        try { per.push(T.ok(capture(AbstractPatternRulePerformer, rule, s))); } catch (t) { per.push(t && t.notPorted === true ? T.skip(t) : err(t)); }
      }
      jobs.push(per);
    } catch (t) {
      jobs.push(t && t.notPorted === true ? T.skip(t) : err(t));
    }
  }
  return T.finish({ texts: textInfo, jobs });
}
