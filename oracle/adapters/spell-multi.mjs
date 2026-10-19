// JS twin of harness op "spell-multi" (SpellOps#multi, docs/review/F41-oracle.md).
import '../../src/lang/register.js';
import { Languages } from '../../src/core/Languages.js';
import { UserConfig } from '../../src/core/rules/model/UserConfig.js';
import { MorfologikMultiSpeller } from '../../src/core/rules/spelling/morfologik/MorfologikMultiSpeller.js';
import { BufferedReader } from '../../src/lib/java/io.js';
import { err, ws } from './_spell-common.mjs';

// each case file is its own JVM in the oracle: the static caches start empty
export function beginCase() {
  MorfologikMultiSpeller.clearStaticCaches();
}

// Java: SpellOps#multi(JsonNode)
export function run(a) {
  const out = {};
  const dist = a.dist !== undefined ? a.dist : 1;
  const lang = a.lang !== undefined ? Languages.getLanguageForShortCode(a.lang) : null;
  let uc = null;
  if (a.userWords !== undefined) {
    const uw = [...a.userWords];
    const cache = a.userCache !== undefined ? BigInt(a.userCache) : null;
    uc = new UserConfig(uw, [], new Map(), 0, 1n, a.userName !== undefined ? a.userName : null, cache, null, false, null, null, false, [], false, false, false);
  }
  let ms;
  try {
    const bin = a.binary;
    if (a.lists !== undefined) {
      const paths = [];
      let sb = '';
      for (const l of a.lists) {
        paths.push(l.path);
        for (const x of l.lines) sb += `${x}\n`;
      }
      const rd = new BufferedReader(sb);
      let vr = null;
      let vp = null;
      if (a.variantLines !== undefined) {
        let vb = '';
        for (const x of a.variantLines) vb += `${x}\n`;
        vr = new BufferedReader(vb);
        vp = a.variant;
      }
      ms = new MorfologikMultiSpeller(bin, rd, paths, vr, vp, uc, dist, lang);
    } else {
      const paths = [...a.paths];
      ms = new MorfologikMultiSpeller(bin, paths, a.variant !== undefined ? a.variant : null, uc, dist, lang);
    }
  } catch (t) {
    out.error = err(t);
    return out;
  }
  out.convertsCase = ms.convertsCase();
  const res = [];
  for (const word of a.words) {
    const r = { w: word };
    try { r.mis = ms.isMisspelled(word); } catch (t) { r.misErr = err(t); }
    try { r.freq = ms.getFrequency(word); } catch (t) { r.freqErr = err(t); }
    try { r.sugg = ms.getSuggestions(word); } catch (t) { r.suggErr = err(t); }
    try { r.def = ws(ms.getWeightedSuggestionsFromDefaultDicts(word)); } catch (t) { r.defErr = err(t); }
    try { r.user = ws(ms.getWeightedSuggestionsFromUserDicts(word)); } catch (t) { r.userErr = err(t); }
    res.push(r);
  }
  out.results = res;
  return out;
}
