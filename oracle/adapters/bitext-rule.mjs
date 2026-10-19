// JS twin of harness op "bitext-rule" (BitextOps#rule, docs/review/F39-oracle.md).
import { BitextRule } from '../../src/core/bitext/BitextRule.js';
import { DifferentLengthRule } from '../../src/core/bitext/DifferentLengthRule.js';
import { DifferentPunctuationRule } from '../../src/core/bitext/DifferentPunctuationRule.js';
import { SameTranslationRule } from '../../src/core/bitext/SameTranslationRule.js';
import { NoopChunker } from '../../src/core/noop/NoopChunker.js';
import { withNoopAnalysis } from './_check-pipe-common.mjs';
import { bitextMatches, errorOf, langFor, lt, ruleInfo } from './_bitext-common.mjs';

const RULES = { DifferentLengthRule, DifferentPunctuationRule, SameTranslationRule };

// Java: BitextOps#rule(JsonNode)
export function run(a) {
  const res = {};
  const rule = new RULES[a.rule]();
  res.rule = ruleInfo(rule);
  const sLang = langFor(a.srcLang);
  const tLang = langFor(a.trgLang);
  // the rules read token text and positions only: no-op disambiguation/chunking keeps unported analysis steps out (R4)
  const noop1 = (l, fn) => withNoopAnalysis(l, true, () => {
    const pc = l.getPostDisambiguationChunker();
    l.setPostDisambiguationChunker(new NoopChunker());
    try {
      return fn();
    } finally {
      l.setPostDisambiguationChunker(pc);
    }
  });
  const noop = (l, fn) => {
    const v = l.getDefaultLanguageVariant();
    return noop1(l, () => (v === null || v === undefined ? fn() : noop1(v, fn)));
  };
  return noop(tLang, () => noop(sLang, () => {
    res.monolingualMatch = rule.match(lt(a.trgLang, null).getAnalyzedSentence('Test.'));
    res.relevant = BitextRule.getRelevantRules().map((c) => c.FQCN);
    const sl = lt(a.srcLang, null);
    const tl = lt(a.trgLang, null);
    res.pairs = a.pairs.map((p) => {
      const r = { src: p[0], trg: p[1] };
      try { r.matches = bitextMatches(rule, p[0], p[1], sl, tl); } catch (t) { r.error = errorOf(t); }
      return r;
    });
    return res;
  }));
}
