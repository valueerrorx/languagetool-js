// JS twin of harness op "match-state" (RuleMatchOps#matchState): Match/MatchState direct; MatchState is F29, until then every request is notPorted.
import { lang, sentences } from './_unify-common.mjs';
import { err } from './rule-match.mjs';
import { Match, CaseConversion, IncludeRange } from '../../src/core/patterns/Match.js';
import { IllegalArgumentException } from '../../src/lib/java/errors.js';

// Java: RuleMatchOps#buildMatch(JsonNode)
function buildMatch(s) {
  const cc = CaseConversion.valueOf(s.caseConv);
  const inc = IncludeRange.valueOf(s.includeSkipped);
  const m = new Match(s.posTag ?? null, s.posTagReplace ?? null, s.postagRegexp, s.regexMatch ?? null, s.regexReplace ?? null, cc, s.setPos, s.suppressMisspelled, inc);
  if (s.lemma !== undefined && s.lemma !== null) m.setLemmaString(s.lemma);
  if (s.inMessageOnly !== undefined) m.setInMessageOnly(s.inMessageOnly);
  if (s.tokenRef !== undefined) m.setTokenRef(s.tokenRef);
  return m;
}

// Java: RuleMatchOps#readings(AnalyzedTokenReadings)
function readings(r) {
  if (r === null || r === undefined) return null;
  return {
    token: r.getToken(),
    readings: r.getReadings().map((t) => [t.getToken(), t.getPOSTag(), t.getLemma(), t.isWhitespaceBefore()]),
    startPos: r.getStartPos(), ws: r.getWhitespaceBefore(),
    chunkTags: `[${r.getChunkTags().map((c) => String(c)).join(', ')}]`,
    immunized: r.isImmunized(),
  };
}

// Java: RuleMatchOps#callOne(Match,Synthesizer,Language,AnalyzedSentence,JsonNode,String,int,int,boolean)
function callOne(m, synth, lg, sent, method, idx, next, single) {
  const toks = sent.getTokensWithoutWhitespace();
  const st = single ? m.createState(synth, toks[idx]) : m.createState(synth, toks, idx, next);
  try {
    switch (method) {
      case 'toFinalString': return [...st.toFinalString(lg)];
      case 'toFinalStringNoLang': return [...st.toFinalString(null)];
      case 'getTargetPosTag': return st.getTargetPosTag();
      case 'filterReadings': return readings(st.filterReadings());
      case 'toTokenString': return st.toTokenString();
      default: throw new IllegalArgumentException(`unknown method: ${method}`);
    }
  } catch (t) {
    return err(t);
  }
}

// Java: RuleMatchOps#matchState(JsonNode)
export async function run(a) {
  const l = lang(a.lang);
  const fresh = (ti) => { const info = []; const s = sentences(l, a.lang, [a.texts[ti]], info)[0]; return { s, info: info[0] }; };
  const cases = [];
  for (const cs of a.cases) {
    try {
      const m = buildMatch(cs.spec);
      const synth = cs.synth ? l.getSynthesizer() : null;
      const lg = cs.withLang ? l : null;
      const { s: sent, info } = fresh(cs.text);
      if (sent === null) { cases.push(info); continue; }
      const n = sent.getTokensWithoutWhitespace().length;
      const calls = [];
      if (cs.sweep !== undefined) for (const nx of cs.sweep) for (let i = 0; i < n; i++) calls.push([i, nx, false]);
      if (cs.calls !== undefined) for (const c of cs.calls) calls.push([c[0], c[1], c.length > 2 && c[2] === true]);
      const o = { n };
      for (const mn of cs.methods) {
        const res = [];
        for (const c of calls) {
          const s2 = mn === 'filterReadings' ? fresh(cs.text).s : sent;
          try { res.push(callOne(m, synth, lg, s2, mn, c[0], c[1], c[2])); } catch (t) { res.push(err(t)); }
        }
        o[mn] = res;
      }
      cases.push(o);
    } catch (t) { cases.push(err(t)); }
  }
  return { cases };
}
