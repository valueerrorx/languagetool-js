// JS twin of harness op "sr-word" (SpellRuleOps#word, docs/review/F42-oracle.md).
import { SuggestedReplacement } from '../../src/core/rules/model/SuggestedReplacement.js';
import { getLanguageForShortCodeGuarded as languageFor } from '../../src/core/language/javaLanguages.js';
import { beginCase, err, safe, spellingRules, strs, userConfig } from './_spellrule-common.mjs';

export { beginCase };

// Java: SpellRuleOps#word(JsonNode)
export function run(a) {
  const l = languageFor(a.lang);
  const res = {};
  let r;
  try {
    const uc = userConfig(a);
    r = spellingRules(l, uc).find((x) => x.getId() === a.id && typeof x.ignoreWord === 'function') ?? null;
  } catch (t) {
    res.buildError = err(t);
    return res;
  }
  if (r === null) {
    res.noRule = true;
    return res;
  }
  res.class = r.constructor.FQCN;
  res.meta = safe(() => ({
    desc: r.getDescription(),
    dictBased: r.isDictionaryBasedSpellingRule(),
    spellingFile: r.getSpellingFileName(),
    additionalSpellingFiles: r.getAdditionalSpellingFileNames(),
    variantFile: r.getLanguageVariantSpellingFileName(),
    ignoreFile: r.getIgnoreFileName(),
    prohibitFile: r.getProhibitFileName(),
    addProhibitFiles: r.getAdditionalProhibitFileNames(),
    latin: r.isLatinScript(),
    tokenizeNew: r.tokenizeNewWords(),
  }));
  try {
    if (a.ignoreTokens !== undefined) r.addIgnoreTokens(strs(a, 'ignoreTokens'));
    if (a.acceptPhrases !== undefined) r.acceptPhrases(strs(a, 'acceptPhrases'));
    if (a.considerIgnore !== undefined) r.setConsiderIgnoreWords(a.considerIgnore === true);
  } catch (t) {
    res.setupError = err(t);
  }
  const ws = [];
  const sugg = a.sugg === true;
  for (const w of strs(a, 'words')) {
    const o = { w };
    o.ignoreWord = safe(() => r.ignoreWord(w));
    o.prohibited = safe(() => r.isProhibited(w));
    o.inIgnoredSet = safe(() => r.isInIgnoredSet(w));
    o.ignoredNoCase = safe(() => r.isIgnoredNoCase(w));
    o.potentially = safe(() => r.ignorePotentiallyMisspelledWord(w));
    o.startsCS = safe(() => r.startsWithIgnoredWord(w, true));
    o.startsCI = safe(() => r.startsWithIgnoredWord(w, false));
    o.url = safe(() => r.isUrl(w));
    o.email = safe(() => r.isEMail(w));
    o.misspelled = safe(() => r.isMisspelled(w));
    if (sugg) {
      o.suggestions = safe(() => (typeof r.getSpellingSuggestions === 'function' ? r.getSpellingSuggestions(w) : r.getSuggestions(w)));
    }
    ws.push(o);
  }
  res.words = ws;
  const ls = [];
  if (a.lists !== undefined) {
    for (const lst of a.lists) {
      const words = lst.words.map(String);
      const o = { words };
      const rs = [];
      for (let i = -1; i <= words.length; i++) rs.push(safe(() => r.ignoreWordAt(words, i)));
      o.ignoreWordIdx = rs;
      ls.push(o);
    }
  }
  res.lists = ls;
  if (a.expand !== undefined) {
    res.expand = strs(a, 'expand').map((s) => safe(() => r.expandLine(s)));
  }
  if (a.filter !== undefined) {
    const fs = [];
    for (const lst of a.filter) {
      const input = lst.map((n) => new SuggestedReplacement(String(n)));
      fs.push(safe(() => r.filterSuggestions(input).map((x) => x.getReplacement())));
      fs.push(safe(() => r.filterNoSuggestWords(input).map((x) => x.getReplacement())));
    }
    res.filter = fs;
  }
  return res;
}
