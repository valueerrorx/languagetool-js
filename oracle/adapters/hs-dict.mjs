// JS twin of harness op "hs-dict" (HunspellOps#dict, docs/review/F43-oracle.md).
import { Hunspell } from '../../src/core/rules/spelling/hunspell/Hunspell.js';
import { beginCase as sbc, err, strs } from './_spellrule-common.mjs';

export function beginCase() {
  sbc();
  Hunspell.clearCaches();
}

// Java: HunspellOps#dict(JsonNode)
export function run(a) {
  const res = {};
  let d;
  try {
    const lang = a.language === null ? 'null' : String(a.language); // JsonNode#asText of null
    d = a.dic !== undefined ? Hunspell.forDictionaryInResources(lang, a.dic, a.aff)
      : a.prefix !== undefined ? Hunspell.forDictionaryInResources(lang, a.prefix) : Hunspell.forDictionaryInResources(lang);
  } catch (t) {
    res.error = err(t);
    return res;
  }
  res.closed = d.isClosed();
  if (a.add !== undefined) {
    for (const w of strs(a, 'add')) {
      try { d.add(w); } catch (t) { res.addError = err(t); }
    }
  }
  const sugg = a.sugg === undefined || a.sugg === true;
  const out = [];
  for (const w of strs(a, 'words')) {
    const o = { w };
    try { o.spell = d.spell(w); } catch (t) { o.spellError = err(t); }
    if (sugg) try { o.suggest = d.suggest(w); } catch (t) { o.suggestError = err(t); }
    out.push(o);
  }
  res.results = out;
  return res;
}
