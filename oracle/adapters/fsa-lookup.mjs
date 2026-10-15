// JS twin of harness op "fsa-lookup" (FsaOps#lookup).
import { Dictionary, DictionaryLookup } from '../../src/lib/fsa/DictionaryLookup.js';
import { getDataBroker } from '../../src/core/resources/LtStatics.js';
import { err, open, tag } from './fsa-common.mjs';

// Java: FsaOps#lookup(JsonNode)
export function run(a) {
  const d = open(a);
  const mode = a.mode ?? 'lookup';
  let words = [...a.words];
  if (a.keysFromTagger !== undefined) {
    const td = Dictionary.read(getDataBroker().getFromResourceDirAsUrl(a.keysFromTagger.dict));
    const keys = new Set();
    for (const w of words) for (const t of tag(td, w)) if (t.posTag !== null) keys.add(`${t.lemma}|${t.posTag}`);
    words = [...keys];
  }
  if (a.extraKeys !== undefined) for (const k of a.extraKeys) words.push(k);
  const tagDict = mode === 'tagger' ? Dictionary.read(getDataBroker().getFromResourceDirAsUrl(a.dict)) : null;
  const out = {};
  out.dict = a.dict;
  out.mode = mode;
  if (a.keysFromTagger !== undefined) out.words = words;
  const results = [];
  for (const w of words) {
    try {
      const r = [];
      if (tagDict !== null) {
        for (const t of tag(tagDict, w)) r.push([t.lemma, t.posTag]);
      } else {
        for (const wd of new DictionaryLookup(d).lookup(w)) r.push([wd.getWord(), wd.getStem(), wd.getTag()]);
      }
      results.push(r);
    } catch (t) {
      results.push({ error: err(t) });
    }
  }
  out.results = results;
  return out;
}
