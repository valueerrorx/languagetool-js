// Shared code of the X-UNIFY adapters: JS twins of UnifyOps helpers (loading, sentences, dumps). Java: UnifyOps
import { existsSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { getDataBroker } from '../../src/core/resources/LtStatics.js';
import { PatternRuleLoader } from '../../src/core/patterns/PatternRuleLoader.js';
import { AnalyzedToken } from '../../src/core/AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../../src/core/AnalyzedTokenReadings.js';
import { AnalyzedSentence } from '../../src/core/AnalyzedSentence.js';
import { err, lang } from './_ruleload-common.mjs';
import { newTool, withNoopAnalysis } from './_check-pipe-common.mjs';
import { notPortedYet } from '../../src/core/language/components.js';
import { JavaConcurrentHashMap } from '../../src/lib/java/collections/JavaConcurrentHashMap.js';

export { lang, err };
const FILES = new Map();
const INLINE = new Map();
const DISAMB = new Map();
const TOOLS = new Map();
const LOADER = path.resolve(import.meta.dirname, '../../src/core/disambiguation/DisambiguationRuleLoader.js');

// Java: RuleLoadOps#loadFile(Language,String)
export function loadFile(l, fileName) {
  const key = `${l.getShortCodeWithCountryAndVariant()}|${fileName}`;
  if (FILES.has(key)) return FILES.get(key);
  let is = getDataBroker().getAsStream(fileName);
  if (is === null) is = readFileSync(fileName);
  const rules = new PatternRuleLoader().getRules(is, fileName, l);
  FILES.set(key, rules);
  return rules;
}

// Java: UnifyOps#disambRules(Language)
export async function disambRules(l) {
  const key = l.getShortCodeWithCountryAndVariant();
  if (DISAMB.has(key)) return DISAMB.get(key);
  if (!existsSync(LOADER)) throw notPortedYet('DisambiguationRuleLoader (disambiguation.xml loading)');
  const { DisambiguationRuleLoader } = await import(pathToFileURL(LOADER).href);
  const loader = new DisambiguationRuleLoader();
  const nameWithLocale = `${l.getShortCode()}/disambiguation.xml`;
  const nameInResourceDir = `${getDataBroker().getResourceDir()}/${nameWithLocale}`;
  const r = loader.getRules(getDataBroker().getAsStream(nameInResourceDir), l, nameWithLocale);
  DISAMB.set(key, r);
  return r;
}

// Java: UnifyOps#preload(Language,boolean)
export async function preload(l, disamb) {
  for (const f of l.getRuleFileNames()) {
    try { loadFile(l, f); } catch (t) { if (t && t.notPorted === true) throw t; }
  }
  if (disamb) await disambRules(l);
}

// Java: UnifyOps#inline(Language,String)
export function inline(l, xml) {
  const key = `${l.getShortCodeWithCountryAndVariant()}|${xml}`;
  let rules = INLINE.get(key);
  if (rules === undefined) {
    rules = new PatternRuleLoader().getRules(Buffer.from(xml, 'utf8'), 'inline.xml', l);
    INLINE.set(key, rules);
  }
  return rules;
}

// Java: SeqMatchOps#synth(JsonNode,int)
function synth(s, startPos) {
  const rd = s.readings.map((r) => new AnalyzedToken(r[0], r[1], r[2]));
  const atr = new AnalyzedTokenReadings(rd, startPos);
  atr.setWhitespaceBefore(s.ws === true ? ' ' : '');
  return atr;
}

// Java: UnifyOps#sentences(Language,JsonNode,List)
export function sentences(l, code, texts, info) {
  if (!TOOLS.has(code)) TOOLS.set(code, newTool(l));
  const lt = TOOLS.get(code);
  const out = [];
  for (const tn of texts) {
    try {
      let s;
      if (typeof tn === 'object') {
        let pos = 0;
        s = new AnalyzedSentence(tn.syn.map((sy) => { const atr = synth(sy, pos); pos += atr.getToken() === null ? 0 : atr.getToken().length; return atr; }));
      } else {
        s = withNoopAnalysis(l, true, () => lt.getRawAnalyzedSentence(tn));
      }
      out.push(s);
      if (info) info.push(s.getTokensWithoutWhitespace().length);
    } catch (t) {
      out.push(null);
      if (info) info.push(err(t));
    }
  }
  return out;
}

// Java: UnifyOps#atrsDump(AnalyzedTokenReadings[])
export function atrsDump(arr) {
  if (arr === null || arr === undefined) return null;
  return Array.from(arr, (a) => a.getReadings().map((t) => [t.getToken(), t.getPOSTag(), t.getLemma()]));
}

// Each Java case file runs in its own JVM (unification configs are mutated by rule loading): drop caches and empty the language configs
export function resetState() {
  FILES.clear(); INLINE.clear(); DISAMB.clear();
  for (const code of ['de-DE', 'en-US', 'fr']) {
    const l = lang(code);
    for (const c of [l.getUnifierConfiguration(), l.getDefaultLanguageVariant().getDisambiguationUnifierConfiguration()]) {
      c.equivalenceTypes = new JavaConcurrentHashMap();
      c.equivalenceFeatures = new JavaConcurrentHashMap();
    }
  }
}
