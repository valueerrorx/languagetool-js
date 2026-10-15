// JS twin of harness op "srx-rules" (SrxOps#srxRules): the parsed SrxDocument (cascade, language maps, rule lists per code).
import { createSrxDocument } from '../../src/core/text/tokenizers/SrxTools.js';
import { safe } from './_text-common.mjs';

// Java: SrxOps#srxRules(JsonNode)
export function run(a) {
  let d;
  try {
    d = createSrxDocument(a.srx);
  } catch (t) {
    if (t && t.notPorted === true) throw t;
    return safe(() => { throw t; });
  }
  const out = {};
  out.cascade = d.getCascade();
  out.languageMaps = d.getLanguageMapList().map((lm) => [lm.getLanguagePattern().pattern(), lm.getLanguagePattern().flags(), lm.getLanguageRule().getName()]);
  const byCode = {};
  for (const c of a.codes) {
    byCode[c] = safe(() => d.getLanguageRuleList(c).map((lr) => ({
      name: lr.getName(),
      rules: lr.getRuleList().map((r) => [r.isBreak(), r.getBeforePattern(), r.getAfterPattern()]),
    })));
  }
  out.byCode = byCode;
  return out;
}
