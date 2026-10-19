// JS twin of harness op "bitext-load" (BitextOps#load, docs/review/F39-oracle.md).
import { BitextPatternRuleLoader } from '../../src/core/bitext/BitextPatternRuleLoader.js';
import { getDataBroker } from '../../src/core/resources/LtStatics.js';
import { isUnportedJavaLanguage } from '../../src/core/language/javaLanguages.js';
import { bitextMatches, errorOf, lt, notPorted, ruleInfo, s } from './_bitext-common.mjs';

// Java: BitextOps#load(JsonNode)
export function run(a) {
  const res = {};
  const loader = new BitextPatternRuleLoader();
  let rules;
  const filename = s(a, 'filename') === null ? 'inline-bitext.xml' : s(a, 'filename');
  try {
    if (a.mode === 'resource') {
      const m = /^\/([a-z]+)\/bitext\.xml$/.exec(a.name);
      if (m !== null && isUnportedJavaLanguage(m[1])) throw notPorted(`bitext.xml of ${m[1]}`); // the resource of a language module that is not ported
      const is = getDataBroker().getFromRulesDirAsStream(a.name);
      rules = loader.getRules(is, a.name);
    } else {
      rules = loader.getRules(Buffer.from(a.xml, 'utf8'), filename);
    }
  } catch (t) {
    res.error = errorOf(t);
    return res;
  }
  res.count = rules.length;
  res.rules = rules.map(ruleInfo);
  if (a.pairs !== undefined) {
    const sl = lt(a.srcLang, null);
    const tl = lt(a.trgLang, null);
    res.pairs = a.pairs.map((p) => {
      const r = { src: p[0], trg: p[1] };
      r.perRule = rules.map((br) => {
        try { return [br.getId(), bitextMatches(br, p[0], p[1], sl, tl)]; } catch (t) { return [br.getId(), errorOf(t)]; }
      });
      return r;
    });
  }
  return res;
}
