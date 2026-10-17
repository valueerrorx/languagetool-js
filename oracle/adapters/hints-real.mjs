// JS twin of harness op "hints-real" (RuleInfraOps#hintsReal): RuleSet text/lemma hints vs plain on real rules and raw tagger sentences.
import { resetState, sentences } from './_unify-common.mjs';
import { err, lang, rules } from './_ruleinfra-common.mjs';
import { RuleSet } from '../../src/core/patterns/RuleSet.js';

const CACHE = new Map();
export function beginCase() { resetState(); CACHE.clear(); }

// Java: RuleInfraOps#matchSummary(List,List,AnalyzedSentence)
function matchSummary(all, idx, s) {
  const out = [];
  for (const i of idx) {
    try {
      for (const m of all[i].match(s)) out.push([i, m.getFromPos(), m.getToPos(), m.getMessage(), [...m.getSuggestedReplacements()]]);
    } catch (t) {
      if (t && t.notPorted === true) throw t;
      const cls = t.javaClass ?? `js:${t.constructor.name}`;
      out.push([i, 'error', cls, cls === 'java.lang.NullPointerException' ? null : (t.message ?? null)]);
    }
  }
  return out;
}

// Java: RuleInfraOps#hintsReal(JsonNode)
export async function run(a) {
  const l = lang(a.lang);
  const key = `${a.lang}|${JSON.stringify(a.files ?? null)}`;
  let c = CACHE.get(key);
  if (c === undefined) {
    const all = [...rules(a)];
    c = { all, th: RuleSet.textHinted(all), lh: RuleSet.textLemmaHinted(all) };
    CACHE.set(key, c);
  }
  const { all, th, lh } = c;
  const s = sentences(l, a.lang, [a.text], null)[0];
  if (s === null) { try { sentences(l, a.lang, [a.text], []); } catch (t) { return err(t); } }
  const everything = all.map((_, i) => i);
  const o = { n: all.length, tokens: s.getTokensWithoutWhitespace().length };
  const plain = matchSummary(all, everything, s);
  o.plain = plain;
  const pos = new Map(all.map((r, i) => [r, i]));
  for (const [k, rs] of [['text', th], ['lemma', lh]]) {
    const idx = rs.rulesForSentence(s).map((r) => pos.get(r));
    const ms = matchSummary(all, idx, s);
    o[k] = { idx, matches: ms, equal: JSON.stringify(ms) === JSON.stringify(plain) };
  }
  return o;
}
