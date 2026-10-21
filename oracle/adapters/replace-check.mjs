// JS twin of harness op "replace-check" (ReplaceOps#check, docs/review/F37-oracle.md).
import { javaCompare } from '../../src/lib/java/strings.js';
import { JavaHashMap } from '../../src/lib/java/collections/JavaHashMap.js';
import { AhoCorasickDoubleArrayTrie } from '../../src/lib/ahocorasick.js';
import { ShortDescriptionProvider } from '../../src/core/ShortDescriptionProvider.js';
import { ConfusionSetLoader } from '../../src/core/rules/ConfusionSetLoader.js';
import { errorOf, languageFor } from './_check-pipe-common.mjs';
import { run as styleRun } from './style-check.mjs';

// Java: ReplaceOps#check(JsonNode)
export function run(a) {
  const mode = a.mode ?? 'rules';
  switch (mode) {
    case 'rules': return styleRun(a);
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
