// JS twin of harness op "replace-check" (ReplaceOps#check, docs/review/F37-oracle.md).
import { javaCompare } from '../../src/lib/java/strings.js';
import { JavaHashMap } from '../../src/lib/java/collections/JavaHashMap.js';
import { AhoCorasickDoubleArrayTrie } from '../../src/lib/ahocorasick.js';
import { ShortDescriptionProvider } from '../../src/core/ShortDescriptionProvider.js';
import { ConfusionSetLoader } from '../../src/core/rules/ConfusionSetLoader.js';
import { errorOf, languageFor } from './_check-pipe-common.mjs';
import { run as styleRun } from './style-check.mjs';
import { notPorted } from './_pipe-common.mjs';
import { UppercaseSentenceStartRule } from '../../src/core/rules/UppercaseSentenceStartRule.js';
import { Example } from '../../src/core/rules/model/Examples.js';
import { getUrl } from '../../src/core/Tools.js';
import { ConsistentApostrophesRule } from '../../src/lang/en/rules/ConsistentApostrophesRule.js';
import { EnglishUnpairedBracketsRule } from '../../src/lang/en/rules/EnglishUnpairedBracketsRule.js';
import { EnglishUnpairedQuotesRule } from '../../src/lang/en/rules/EnglishUnpairedQuotesRule.js';
import { EnglishWordRepeatRule } from '../../src/lang/en/rules/EnglishWordRepeatRule.js';
import { AvsAnRule } from '../../src/lang/en/rules/AvsAnRule.js';
import { EnglishWordRepeatBeginningRule } from '../../src/lang/en/rules/EnglishWordRepeatBeginningRule.js';
import { EnglishSpecificCaseRule } from '../../src/lang/en/rules/EnglishSpecificCaseRule.js';
import { CompoundRule } from '../../src/lang/en/rules/CompoundRule.js';
import { ContractionSpellingRule } from '../../src/lang/en/rules/ContractionSpellingRule.js';
import { EnglishWrongWordInContextRule } from '../../src/lang/en/rules/EnglishWrongWordInContextRule.js';
import { EnglishDashRule } from '../../src/lang/en/rules/EnglishDashRule.js';
import { WordCoherencyRule as EnWordCoherencyRule } from '../../src/lang/en/rules/WordCoherencyRule.js';
import { EnglishDiacriticsRule } from '../../src/lang/en/rules/EnglishDiacriticsRule.js';
import { EnglishPlainEnglishRule } from '../../src/lang/en/rules/EnglishPlainEnglishRule.js';
import { EnglishRedundancyRule } from '../../src/lang/en/rules/EnglishRedundancyRule.js';
import { SimpleReplaceRule as EnSimpleReplaceRule } from '../../src/lang/en/rules/SimpleReplaceRule.js';
import { SimpleReplaceProfanityRule } from '../../src/lang/en/rules/SimpleReplaceProfanityRule.js';
import { UnitConversionRuleUS } from '../../src/lang/en/rules/UnitConversionRuleUS.js';
import { UnitConversionRuleImperial } from '../../src/lang/en/rules/UnitConversionRuleImperial.js';
import { AmericanReplaceRule } from '../../src/lang/en/rules/AmericanReplaceRule.js';
import { BritishReplaceRule } from '../../src/lang/en/rules/BritishReplaceRule.js';
import { NewZealandReplaceRule } from '../../src/lang/en/rules/NewZealandReplaceRule.js';
import { GermanCompoundRule } from '../../src/lang/de/rules/GermanCompoundRule.js';
import { SimpleReplaceRule as DeSimpleReplaceRule } from '../../src/lang/de/rules/SimpleReplaceRule.js';
import { GermanWrongWordInContextRule } from '../../src/lang/de/rules/GermanWrongWordInContextRule.js';
import { WordCoherencyRule as DeWordCoherencyRule } from '../../src/lang/de/rules/WordCoherencyRule.js';

// Java: ReplaceOps#check(JsonNode)
export function run(a) {
  const mode = a.mode ?? 'rules';
  switch (mode) {
    case 'rules': return styleRun(a, f37Rules, a.lang !== undefined && a.lang.startsWith('en'));
    case 'aho': return aho(a);
    case 'confusion': return confusion(a);
    case 'shortdesc': return shortdesc(a);
    default: throw new Error(`mode ${mode}`);
  }
}

// Java: ReplaceOps#aho(JsonNode); entries are put into a TreeMap/LinkedHashMap/HashMap, the trie gets the map's iteration order
function aho(a) {
  const res = {};
  const kind = a.map;
  let pairs;
  if (kind === 'hash') {
    const m = new JavaHashMap();
    for (const [k, v] of a.entries) m.put(k, v);
    pairs = m.entrySet();
  } else {
    const m = new Map();
    for (const [k, v] of a.entries) m.set(k, v);
    pairs = [...m.entries()];
    if (kind !== 'linked') pairs.sort((x, y) => javaCompare(x[0], y[0]));
  }
  const trie = new AhoCorasickDoubleArrayTrie();
  try {
    trie.build(pairs);
  } catch (t) {
    res.buildError = errorOf(t);
    return res;
  }
  res.size = trie.size();
  const all = [];
  for (const t of a.texts) {
    const r = {};
    try {
      r.hits = trie.parseText(t).map((h) => [h.begin, h.end, h.value]);
      r.matches = trie.matches(t);
      const f = trie.findFirst(t);
      r.first = f === null ? null : [f.begin, f.end, f.value];
    } catch (x) {
      delete r.hits;
      r.error = errorOf(x);
    }
    all.push(r);
  }
  res.texts = all;
  res.get = (a.get ?? []).map((k) => trie.get(k));
  return res;
}

// Java: ReplaceOps#shortdesc(JsonNode)
function shortdesc(a) {
  let l;
  try {
    l = languageFor(a.lang);
  } catch (e) {
    l = { getShortCode: () => a.lang }; // ShortDescriptionProvider reads only the short code of the language
  }
  const p = new ShortDescriptionProvider();
  return { descs: a.words.map((w) => p.getShortDescription(w, l)) };
}

// Java: ReplaceOps#confusion(JsonNode)
function confusion(a) {
  const res = {};
  let l;
  try {
    l = languageFor(a.lang);
  } catch (e) {
    l = { getShortCode: () => a.lang }; // the loader passes the language only to ShortDescriptionProvider
  }
  try {
    const m = new ConfusionSetLoader(l).loadConfusionPairs(Buffer.from(a.file, 'utf8'));
    const out = {};
    for (const key of [...m.keys()].sort(javaCompare)) {
      out[key] = m.get(key).map((p) => ({
        str: p.toString(),
        factor: Number(p.getFactor()),
        bidi: p.isBidirectional(),
        terms: p.getTerms().map((s) => [s.getString(), s.getDescription()]),
        upper: p.getUppercaseFirstCharTerms().map((s) => [s.getString(), s.getDescription()]),
      }));
    }
    res.pairs = out;
  } catch (t) {
    res.error = errorOf(t);
  }
  return res;
}

// Java: English#getRelevantRules / German#getRelevantRules and the variant classes' getRelevantRules (F37 rules merged into the F36 list, Java order)
export function f37Rules(l, m, uc, natives) {
  const code = l.getShortCode();
  const full = l.getShortCodeWithCountryAndVariant();
  const at = (pred) => natives.findIndex(pred);
  const isReadability = (r) => r.constructor?.name === 'ReadabilityRule';
  const out = natives.slice();
  if (code === 'en') {
    out.splice(0, out.length, ...out.filter((r) => !(r instanceof EnglishWordRepeatBeginningRule))); // re-inserted at its Java position below
    const rest = [
      new ConsistentApostrophesRule(m), new EnglishSpecificCaseRule(m), new EnglishUnpairedBracketsRule(m, l), new EnglishUnpairedQuotesRule(m, l),
      new EnglishWordRepeatRule(m, l), new AvsAnRule(m), new EnglishWordRepeatBeginningRule(m, l), new CompoundRule(m, l, uc), new ContractionSpellingRule(m, l), new EnglishWrongWordInContextRule(m, l), new EnglishDashRule(m),
      new EnWordCoherencyRule(m), new EnglishDiacriticsRule(m), new EnglishPlainEnglishRule(m), new EnglishRedundancyRule(m), new EnSimpleReplaceRule(m, l),
      new SimpleReplaceProfanityRule(m, l),
    ];
    const i = Math.max(0, out.findIndex(isReadability));
    out.splice(i, 0, ...rest);
    out.unshift(new UppercaseSentenceStartRule(m, l,
      Example.wrong('This house is old. <marker>it</marker> was built in 1950.'),
      Example.fixed('This house is old. <marker>It</marker> was built in 1950.'),
      getUrl('https://languagetool.org/insights/post/spelling-capital-letters/')));
    if (full === 'en-US') out.push(new AmericanReplaceRule(m, '/en/en-US/replace.txt'), new UnitConversionRuleUS(m));
    else if (full === 'en-GB') out.push(new BritishReplaceRule(m, '/en/en-GB/replace.txt'), new UnitConversionRuleImperial(m));
    else if (full === 'en-NZ') out.push(new NewZealandReplaceRule(m, '/en/en-NZ/replace.txt'), new UnitConversionRuleImperial(m));
    else if (full === 'en-CA' || full === 'en-AU') out.push(new UnitConversionRuleImperial(m));
    return out;
  }
  if (code === 'de') {
    out.push(new GermanCompoundRule(m, l, uc), new DeSimpleReplaceRule(m, l), new GermanWrongWordInContextRule(m, l), new DeWordCoherencyRule(m));
    return out;
  }
  throw notPorted(`replace-check: rule list of ${code}`);
}
