// JS twin of harness op "bitext-tools" (BitextOps#tools, docs/review/F39-oracle.md).
import { File } from '../../src/lib/java/io/File.js';
import { checkBitext, getBitextRules, selectBitextRules } from '../../src/core/bitext/BitextTools.js';
import { JLanguageTool } from '../../src/core/JLanguageTool.js';
import { errorOf, inWorkDir, langFor, matchDump, notPorted, ruleInfo, writeFile } from './_bitext-common.mjs';

// Java: BitextOps#tools(JsonNode)
export function run(a) {
  return inWorkDir(() => {
    const res = {};
    const src = langFor(a.srcLang);
    const trg = langFor(a.trgLang);
    let rules;
    try {
      if (a.extContent !== undefined) {
        writeFile({ content: a.extContent }, 'ext-bitext.xml');
        rules = getBitextRules(src, trg, new File('ext-bitext.xml'));
      } else if (a.extMissing !== undefined) {
        rules = getBitextRules(src, trg, new File(String(a.extMissing)));
      } else {
        rules = getBitextRules(src, trg);
      }
    } catch (t) {
      res.error = errorOf(t);
      return res;
    }
    res.count = rules.length;
    res.rules = rules.map((r) => ({
      class: r.constructor.name,
      id: r.getId(),
      sourceLanguage: r.getSourceLanguage() === null ? null : r.getSourceLanguage().getShortCode(),
      category: r.getCategory() === null ? null : r.getCategory().getId().toString(),
    }));
    if (a.detail === true) res.detail = rules.map(ruleInfo);
    if (a.select !== undefined) {
      const sr = selectBitextRules(rules, a.select.disabled, a.select.enabled, a.select.enabledOnly);
      res.selected = sr.map((r) => r.getId());
      rules = sr;
    }
    if (a.pairs !== undefined) {
      const sl = new JLanguageTool(src);
      const tl = new JLanguageTool(trg);
      sl.setCleanOverlappingMatches(false);
      tl.setCleanOverlappingMatches(false);
      res.pairs = a.pairs.map((p) => {
        const r = { src: p[0], trg: p[1] };
        try {
          r.matches = checkBitext(p[0], p[1], sl, tl, rules).map(matchDump);
        } catch (t) {
          if (t && t.notPorted === true) throw t;
          r.error = errorOf(t);
        }
        return r;
      });
    }
    return res;
  });
}
