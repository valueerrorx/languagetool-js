// JS twin of harness op "hs-rule" (HunspellOps#rule, docs/review/F43-oracle.md).
import { HunspellRule } from '../../src/core/rules/spelling/hunspell/HunspellRule.js';
import { getLanguageForShortCodeGuarded as languageFor } from '../../src/core/language/javaLanguages.js';
import { beginCase, err, spellingRules, strs, userConfig } from './_spellrule-common.mjs';

export { beginCase };

// Java: HunspellOps#rule(JsonNode)
export function run(a) {
  const l = languageFor(a.lang);
  const res = {};
  let r;
  try {
    r = spellingRules(l, userConfig(a)).find((x) => x.getId() === a.id) ?? null;
  } catch (t) {
    res.buildError = err(t);
    return res;
  }
  if (r === null) {
    res.noRule = true;
    return res;
  }
  res.class = r.constructor.FQCN;
  const sugg = a.sugg === true;
  const out = [];
  for (const w of strs(a, 'words')) {
    const o = { w };
    try { o.misspelled = r.isMisspelled(w); } catch (t) { o.misspelledError = err(t); }
    if (sugg && r instanceof HunspellRule) {
      try { o.suggestions = r.getSuggestions(w); } catch (t) { o.suggestionsError = err(t); }
    }
    out.push(o);
  }
  res.results = out;
  return res;
}
