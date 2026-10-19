// JS twin of harness op "ff-load" (BitextOps#ff, docs/review/F39-oracle.md).
import { inWorkDir, lt, matchDump, ruleInfo, s, writeFile } from './_bitext-common.mjs';
import { errorOf } from './_bitext-common.mjs';

// Java: BitextOps#ff(JsonNode)
export function run(a) {
  return inWorkDir(() => {
    const res = {};
    const t = lt(a.lang, s(a, 'motherTongue'));
    const filename = String(a.filename);
    if (a.content !== undefined) writeFile(a, filename);
    let rules;
    try {
      rules = a.kind === 'pattern' ? t.loadPatternRules(filename) : t.loadFalseFriendRules(filename);
    } catch (e) {
      res.error = errorOf(e);
      return res;
    }
    res.count = rules.length;
    const brief = a.brief === true;
    res.rules = rules.map((r) => (brief ? `${r.getFullId()}|${r.constructor.name}|${r.getMessage()}` : ruleInfo(r)));
    if (a.texts !== undefined) {
      res.texts = a.texts.map((x) => {
        const r = { text: x };
        const ms = [];
        const as = t.getAnalyzedSentence(x);
        for (const pr of rules) for (const m of pr.match(as)) { const d = matchDump(m); d.fullId = pr.getFullId(); ms.push(d); }
        r.matches = ms;
        return r;
      });
    }
    return res;
  });
}
