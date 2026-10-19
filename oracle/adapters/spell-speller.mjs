// JS twin of harness op "spell-speller" (SpellOps#speller, docs/review/F41-oracle.md).
import { MorfologikSpeller } from '../../src/core/rules/spelling/morfologik/MorfologikSpeller.js';
import { notPorted, open } from './fsa-common.mjs';
import { b, err, ws } from './_spell-common.mjs';

// Java: SpellOps#speller(JsonNode)
export function run(a) {
  if (a.dict === '') throw notPorted('the empty resource name is the Java class path root: its URL is the jar directory of the Java run');
  const out = {};
  const dist = a.dist !== undefined ? a.dist : 1;
  let sp;
  try {
    if (a.info !== undefined) {
      const d = open(a);
      sp = new MorfologikSpeller(d, dist);
    } else {
      sp = new MorfologikSpeller(a.dict, dist);
    }
  } catch (t) {
    out.error = err(t);
    return out;
  }
  out.toString = sp.toString();
  out.convertsCase = sp.convertsCase();
  const res = [];
  for (const word of a.words) {
    const r = { w: word };
    try { r.mis = sp.isMisspelled(word); } catch (t) { r.misErr = err(t); }
    try { r.freq = sp.getFrequency(word); } catch (t) { r.freqErr = err(t); }
    if (!b(a, 'noSugg')) try { r.sugg = ws(sp.getSuggestions(word)); } catch (t) { r.suggErr = err(t); }
    if (b(a, 'extra')) {
      try { r.repl = sp.findReplacements(word); } catch (t) { r.replErr = err(t); }
      try { r.similar = sp.findSimilarWords(word); } catch (t) { r.similarErr = err(t); }
    }
    res.push(r);
  }
  out.results = res;
  return out;
}
