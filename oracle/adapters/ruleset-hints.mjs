// JS twin of harness op "ruleset-hints" (RuleLoadOps#rulesetHints, docs/review/F25-oracle.md).
import { AnalyzedToken } from '../../src/core/AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../../src/core/AnalyzedTokenReadings.js';
import { AnalyzedSentence } from '../../src/core/AnalyzedSentence.js';
import { PatternRule } from '../../src/core/patterns/PatternRule.js';
import { RuleSet } from '../../src/core/patterns/RuleSet.js';
import { buildToken, lang, str } from './_ruleload-common.mjs';

// Java: RuleLoadOps#rulesetHints(JsonNode)
export function run(a) {
  const l = lang(a.lang !== undefined ? a.lang : 'en-US');
  const rules = [];
  for (const spec of a.rules) {
    const toks = [];
    if (!Array.isArray(spec)) for (const t of spec.tokens) toks.push(buildToken(t));
    else toks.push(buildToken(spec));
    rules.push(new PatternRule('', l, toks, '', '', ''));
  }
  if (a.dump !== undefined) return hintOrder(rules);
  let rs;
  switch (a.kind) {
    case 'text': rs = RuleSet.textHinted(rules); break;
    case 'lemma': rs = RuleSet.textLemmaHinted(rules); break;
    default: rs = RuleSet.plain(rules); break;
  }
  const atr = [];
  for (const t of a.sentence) {
    atr.push(new AnalyzedTokenReadings(new AnalyzedToken(String(t.t), str(t.pos), str(t.lemma))));
  }
  const s = new AnalyzedSentence(atr);
  const idx = [];
  for (const r of rs.rulesForSentence(s)) {
    for (let i = 0; i < rules.length; i++) if (rules[i] === r) { idx.push(i); break; }
  }
  return { indices: idx };
}

const vals = (set) => (set === null || set === undefined ? null : [...set]);

const hintDump = (th) => (th === null ? null : { inflected: th.inflected, tokenIndex: th.tokenIndex, lowerCaseValues: [...th.lowerCaseValues] });

// Java: RuleLoadOps#hintOrder(List)
function hintOrder(rules) {
  const out = [];
  for (const r of rules) {
    const toks = r.getPatternTokens().map((t) => ({
      possibleValues: vals(t.textMatcher.getPossibleValues()),
      formHints: vals(t.calcFormHints()),
      lemmaHints: vals(t.calcLemmaHints()),
    }));
    out.push({ tokens: toks, tokenHints: r.tokenHints === null ? null : r.tokenHints.map(hintDump), anchorHint: hintDump(r.anchorHint) });
  }
  return { rules: out };
}
