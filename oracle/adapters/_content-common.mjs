// Shared code of the content-level adapters (ops check, analyze, rules-list, rule-examples): JS twin of ContentOps helpers (docs/review/F50-oracle.md).
import '../../src/lang/register.js';
import { JLanguageTool, Level, Mode, ParagraphHandling } from '../../src/core/JLanguageTool.js';
import { selectRules } from '../../src/core/Tools.js';
import { AnnotatedTextBuilder } from '../../src/core/text/AnnotatedTextBuilder.js';
import { CategoryId } from '../../src/core/rules/model/Category.js';
import { ToneTag } from '../../src/core/rules/model/Tag.js';
import { getLanguageForShortCodeGuarded } from '../../src/core/language/javaLanguages.js';
import { matchDump } from './_check-pipe-common.mjs';

// JLanguageTool instances are cached per (lang, motherTongue, rule selection) like ContentOps#CACHE (one JVM per case file)
const CACHE = new Map();

// each case file is its own JVM in the oracle: the cache starts empty
export function beginCase() {
  CACHE.clear();
}

// Java: ContentOps#strs(JsonNode,String)
export const strs = (a, k) => (a && Array.isArray(a[k]) ? a[k].map(String) : []);

// Java: ContentOps#lang(String)
export const lang = (code) => getLanguageForShortCodeGuarded(code);

// Java: ContentOps#tool(JsonNode)
export function tool(a) {
  const code = a.lang;
  const mt = a.motherTongue !== undefined && a.motherTongue !== null ? a.motherTongue : null;
  const er = strs(a, 'enabledRules');
  const dr = strs(a, 'disabledRules');
  const ec = strs(a, 'enabledCategories');
  const dc = strs(a, 'disabledCategories');
  const only = a.enabledOnly === true;
  const tempOff = a.enableTempOff === true;
  const key = `${code}|${mt}|${JSON.stringify([er, dr, ec, dc])}${only}${tempOff}`;
  const fresh = a.fresh === true;
  let lt = fresh ? null : CACHE.get(key);
  if (lt === undefined || lt === null) {
    const l = lang(code);
    lt = mt === null ? new JLanguageTool(l) : new JLanguageTool(l, lang(mt));
    const dcs = new Map();
    const ecs = new Map();
    for (const s of dc) if (!dcs.has(s)) dcs.set(s, new CategoryId(s));
    for (const s of ec) if (!ecs.has(s)) ecs.set(s, new CategoryId(s));
    const old = process.stdout.write;
    process.stdout.write = () => true;
    try {
      selectRules(lt, [...dcs.values()], [...ecs.values()], new Set(dr), new Set(er), only, tempOff);
    } finally {
      process.stdout.write = old;
    }
    if (!fresh) CACHE.set(key, lt);
  }
  return lt;
}

// Java: ContentOps#match(RuleMatch)
export function match(m) {
  const o = matchDump(m);
  delete o.fullId;
  return o;
}

const mapObj = (m) => (m instanceof Map ? Object.fromEntries(m) : m);

// Java: ContentOps#results(CheckResults)
export function results(cr) {
  return {
    matches: cr.getRuleMatches().map(match),
    sentenceRanges: cr.getSentenceRanges().map((s) => [s.getFromPos(), s.getToPos()]),
    extendedSentenceRanges: cr.getExtendedSentenceRanges().map((s) => ({ fromPos: s.getFromPos(), toPos: s.getToPos(), languageConfidenceRates: mapObj(s.getLanguageConfidenceRates()) })),
    ignoredRanges: cr.getIgnoredRanges().map((s) => [s.getFromPos(), s.getToPos(), s.getLang()]),
  };
}

// Java: ContentOps#run(JLanguageTool,String,JsonNode)
export function run(lt, text, a) {
  const level = a.level !== undefined ? Level.valueOf(a.level) : Level.DEFAULT;
  const mode = a.mode !== undefined ? Mode.valueOf(a.mode) : Mode.ALL;
  const ph = a.paraMode !== undefined ? ParagraphHandling.valueOf(a.paraMode) : ParagraphHandling.NORMAL;
  const tokenize = a.tokenizeText === undefined || a.tokenizeText === true;
  const tones = new Set(strs(a, 'toneTags').map((s) => ToneTag.valueOf(s)));
  return lt.check2(new AnnotatedTextBuilder().addText(text).build(), tokenize, ph, null, mode, level, tones, null);
}
