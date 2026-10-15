// Shared helpers of the X-FSA adapters (twins of FsaOps#open and MorfologikTagger#tag).
import { getDataBroker } from '../../src/core/resources/LtStatics.js';
import { Dictionary, DictionaryLookup } from '../../src/lib/fsa/DictionaryLookup.js';

const CACHE = new Map();

export function notPorted(why) {
  return Object.assign(new Error(why), { notPorted: true });
}

// Java: FsaOps#open(JsonNode); "info" text is encoded ISO-8859-1 like the harness
export function open(a) {
  const dict = a.dict;
  const info = a.info === undefined ? null : a.info;
  const noInfo = a.noInfo === true;
  const key = `${dict}\u0000${info}\u0000${noInfo}`;
  let d = CACHE.get(key);
  if (d !== undefined) return d;
  if (noInfo) throw notPorted('error message carries a random temp directory name');
  if (info !== null) {
    const stream = getDataBroker().getFromResourceDirAsStream(dict);
    const bytes = Buffer.alloc(info.length);
    for (let i = 0; i < info.length; i++) bytes[i] = info.charCodeAt(i) > 255 ? 63 : info.charCodeAt(i);
    d = Dictionary.readImages(stream, bytes);
  } else {
    d = Dictionary.read(getDataBroker().getFromResourceDirAsUrl(dict));
  }
  CACHE.set(key, d);
  return d;
}

// Java: MorfologikTagger#tag(String) -> [{lemma,posTag}]
export function tag(dictionary, word) {
  const result = [];
  const lookup = new DictionaryLookup(dictionary).lookup(word);
  for (const wordData of lookup) {
    let t = wordData.getTag();
    if (dictionary.metadata.isFrequencyIncluded() && t !== null && t.length > 1) t = t.substring(0, t.length - 1);
    result.push({ lemma: wordData.getStem(), posTag: t });
  }
  return result;
}

// Java: FsaOps#err(Throwable)
export function err(t) {
  return { class: t.javaClass ?? t.constructor.name, message: t.message ?? null };
}
