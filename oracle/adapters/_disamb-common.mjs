// Shared code of the X-DISAMB adapters: JS twins of DisambOps helpers (dumps, XmlRuleDisambiguator factory, xx Demo language, sentences).
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { Languages, resetDynamicLanguages } from '../../src/core/Languages.js';
import { Language } from '../../src/core/Language.js';
import { Locale } from '../../src/lib/java/Locale.js';
import { getDataBroker } from '../../src/core/resources/LtStatics.js';
import { registerClass } from '../../src/core/resources/ClassBroker.js';
import { RuleFilter } from '../../src/core/patterns/RuleFilter.js';
import { NoopDisambiguator } from '../../src/core/noop/NoopDisambiguator.js';
import { sharedComponent, notPortedYet } from '../../src/core/language/components.js';
import { AnalyzedSentence } from '../../src/core/AnalyzedSentence.js';
import { AnalyzedToken } from '../../src/core/AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../../src/core/AnalyzedTokenReadings.js';
import { DisambiguationRuleLoader } from '../../src/core/disambiguation/DisambiguationRuleLoader.js';
import { ClassNotFoundException } from '../../src/lib/java/errors.js';
import { lang as plainLang } from './_ruleload-common.mjs';
import { newTool, withNoopAnalysis } from './_check-pipe-common.mjs';
import { disambRules } from './_unify-common.mjs';
import { ROOT } from '../lib/env.mjs';
import { JavaConcurrentHashMap } from '../../src/lib/java/collections/JavaConcurrentHashMap.js';

const XRD_FILE = path.resolve(import.meta.dirname, '../../src/core/disambiguation/XmlRuleDisambiguator.js');
const XX_XML = path.join(ROOT, 'oracle/java-src/languagetool-core/src/test/resources/org/languagetool/resource/xx/disambiguation.xml');
const XX_PATH = '/org/languagetool/resource/xx/disambiguation.xml';

// Java: org.languagetool.language.Demo (core test class, short code xx); disambiguator is not used (XmlRuleDisambiguator is built directly)
class DemoLanguage extends Language {
  static FQCN = 'org.languagetool.language.Demo';
  getLocale() { return new Locale('en'); }
  createDefaultDisambiguator() { return new NoopDisambiguator(); }
  getName() { return 'Testlanguage'; }
  getShortCode() { return 'xx'; }
  getCountries() { return ['XX']; }
  createDefaultTagger() { return sharedComponent('org.languagetool.tagging.xx.DemoTagger'); }
  createDefaultChunker() { return null; }
  getMaintainers() { return null; }
  getRelevantRules() { return []; }
}

// Java: org.languagetool.tagging.disambiguation.rules.xx.DemoDisambiguationFilter
class DemoDisambiguationFilter extends RuleFilter {
  static FQCN = 'org.languagetool.tagging.disambiguation.rules.xx.DemoDisambiguationFilter';
  acceptRuleMatch(match, args, patternTokenPos, patternTokens) {
    return patternTokens[0].getToken() === 'X9' ? match : null;
  }
}

let xxInstalled = false;
let xxRestore = null;
// serves the Java core test resource xx/disambiguation.xml and registers the Demo language (the Java run has the core tests jar on the classpath)
export function installXx() {
  if (xxInstalled) return;
  xxInstalled = true;
  registerClass(DemoLanguage.FQCN, DemoLanguage);
  registerClass(DemoDisambiguationFilter.FQCN, DemoDisambiguationFilter);
  Languages.getOrAddLanguageByClassName(DemoLanguage.FQCN);
  const broker = getDataBroker();
  const orig = broker.getAsStream.bind(broker);
  const origUrl = broker.getAsURL.bind(broker);
  xxRestore = () => { delete broker.getAsStream; delete broker.getAsURL; };
  broker.getAsStream = (p) => (p === XX_PATH ? readFileSync(XX_XML) : orig(p));
  broker.getAsURL = (p) => (p === XX_PATH ? { file: XX_XML, openStream: () => readFileSync(XX_XML), toString: () => XX_XML, getPath: () => XX_XML } : origUrl(p));
}

// undoes installXx so that other cases of the same parity process see the normal language list
export function releaseXx() {
  if (!xxInstalled) return;
  xxRestore();
  resetDynamicLanguages();
  // the class registry has no remove: re-register tombstones that fail like Class.forName on a missing class
  for (const fqcn of [DemoLanguage.FQCN, DemoDisambiguationFilter.FQCN]) {
    registerClass(fqcn, class Missing { constructor() { throw new ClassNotFoundException(fqcn); } });
  }
  xxInstalled = false;
  XRD.clear(); INLINE_RULES.clear();
}

// Java: RuleLoadOps#lang(String)
export function lang(code) {
  if (code === 'xx') installXx();
  return plainLang(code);
}

let XRD_CLASS = null;
const XRD = new Map();
const INLINE_RULES = new Map();

// Java: DisambOps#xrd(Language,boolean,String)
export async function xrd(l, global, xml) {
  const key = `${l.getShortCodeWithCountryAndVariant()}|${global}|${xml}`;
  let d = XRD.get(key);
  if (d === undefined) {
    if (!existsSync(XRD_FILE)) throw notPortedYet('XmlRuleDisambiguator');
    if (XRD_CLASS === null) {
      const { XmlRuleDisambiguator } = await import(pathToFileURL(XRD_FILE).href);
      // Java: DisambOps.InlineXrd (loadPatternRules is overridden, the XML text is passed through a holder)
      XRD_CLASS = class InlineXrd extends XmlRuleDisambiguator {
        static XML = null;
        loadPatternRules(filename, language) {
          if (InlineXrd.XML !== null && filename === `${language.getShortCode()}/disambiguation.xml`) {
            return new DisambiguationRuleLoader().getRules(Buffer.from(InlineXrd.XML, 'utf8'), language, 'inline.xml');
          }
          return super.loadPatternRules(filename, language);
        }
      };
    }
    XRD_CLASS.XML = xml;
    try { d = new XRD_CLASS(l, global); } finally { XRD_CLASS.XML = null; }
    XRD.set(key, d);
  }
  return d;
}

// Java: DisambOps#rules(Language,String)
export async function rules(l, xml) {
  if (xml === null) return disambRules(l);
  const key = `${l.getShortCodeWithCountryAndVariant()}|${xml}`;
  let r = INLINE_RULES.get(key);
  if (r === undefined) {
    r = new DisambiguationRuleLoader().getRules(Buffer.from(xml, 'utf8'), l, 'inline.xml');
    INLINE_RULES.set(key, r);
  }
  return r;
}

// each Java case file is its own JVM: drop caches and empty the xx disambiguation unifier configuration
export function resetDisamb() {
  XRD.clear(); INLINE_RULES.clear();
  if (xxInstalled) {
    const c = plainLang('xx').getDefaultLanguageVariant().getDisambiguationUnifierConfiguration();
    c.equivalenceTypes = new JavaConcurrentHashMap();
    c.equivalenceFeatures = new JavaConcurrentHashMap();
  }
}

const TOOLS = new Map();
// Java: RuleMatchOps#sentence(Language,JsonNode) (raw tagger output, no-op chunker; synthetic {syn:[..]} tokens)
export function fresh(l, code, tn) {
  if (typeof tn === 'object' && tn !== null) {
    let pos = 0;
    return new AnalyzedSentence(tn.syn.map((sy) => {
      const atr = new AnalyzedTokenReadings(sy.readings.map((r) => new AnalyzedToken(r[0], r[1], r[2])), pos);
      atr.setWhitespaceBefore(sy.ws === true ? ' ' : '');
      pos += atr.getToken() === null ? 0 : atr.getToken().length;
      return atr;
    }));
  }
  if (!TOOLS.has(code)) TOOLS.set(code, newTool(l));
  const lt = TOOLS.get(code);
  return withNoopAnalysis(l, true, () => lt.getRawAnalyzedSentence(tn));
}

// Java: DisambOps#errc(Throwable)
export function err(t) {
  if (t && t.notPorted === true) throw t;
  const cls = t.javaClass ?? `js:${t.constructor.name}`;
  const causes = [];
  for (let c = t.getCause?.() ?? null; c && causes.length < 20; c = c.getCause?.() ?? null) {
    const cc = c.javaClass ?? `js:${c.constructor.name}`;
    causes.push({ class: cc, message: cc === 'java.lang.NullPointerException' ? null : (c.message ?? null) });
  }
  return { error: { class: cls, message: cls === 'java.lang.NullPointerException' ? null : (t.message ?? null), causes } };
}

export const sha1 = (s) => createHash('sha1').update(s, 'utf8').digest('hex');

// Java: DisambOps#tok(AnalyzedTokenReadings)
export function tok(t) {
  return [
    t.getToken(), t.getStartPos(), t.getEndPos(), t.getPosFix(), t.getCleanToken(), t.getWhitespaceBefore(),
    (t.isImmunized() ? 1 : 0) | (t.isIgnoredBySpeller() ? 2 : 0) | (t.isSentenceStart() ? 4 : 0) | (t.isSentenceEnd() ? 8 : 0)
      | (t.isParagraphEnd() ? 16 : 0) | (t.isWhitespace() ? 32 : 0) | (t.isLinebreak() ? 64 : 0) | (t.isTagged() ? 128 : 0)
      | (t.hasTypographicApostrophe() ? 256 : 0) | (t.isWhitespaceBefore() ? 512 : 0),
    t.getReadings().map((r) => {
      const x = [r.getToken(), r.getLemma(), r.getPOSTag()];
      const rf = (r.isWhitespaceBefore() ? 1 : 0) | (r.hasNoTag() ? 2 : 0);
      if (rf !== 0) x.push(rf);
      return x;
    }),
    t.getChunkTags().map((c) => c.getChunkTag()),
  ];
}

const toks = (a) => a.map(tok);
const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sortedStrings = (set) => [...set].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

// Java: DisambOps#dumpSentence(AnalyzedSentence)
export function dumpSentence(s) {
  const t = toks(s.getTokens());
  const p = toks(s.getPreDisambigTokens());
  const o = { t };
  if (sameJson(p, t)) o.p = null;
  else if (p.length === t.length) {
    const d = [];
    for (let i = 0; i < p.length; i++) if (!sameJson(p[i], t[i])) d.push([i, p[i]]);
    o.p = { d };
  } else o.p = { full: p };
  const n = s.getTokensWithoutWhitespace().length;
  o.w = Array.from({ length: n }, (_, i) => s.getOriginalPosition(i));
  o.pw = s.getPreDisambigTokensWithoutWhitespace().length;
  o.pos = sortedStrings(s.getPosTagSet());
  o.lem = sortedStrings(s.getLemmaSet());
  o.dg = sha1(s.toString());
  return o;
}

// Java: DisambOps#canon(Object)
export function canon(o) {
  if (o === null || o === undefined) return 'N';
  if (typeof o === 'string') return `S${Array.from({ length: o.length }, (_, i) => o.charCodeAt(i)).join(',')};`;
  if (Array.isArray(o)) return `[${o.map((x) => `${canon(x)},`).join('')}]`;
  if (typeof o === 'object') return `{${Object.entries(o).map(([k, v]) => `${k}=${canon(v)}|`).join('')}}`;
  return String(o);
}

// Java: DisambOps#disambiguate(XmlRuleDisambiguator,AnalyzedSentence) (JLanguageTool#getAnalyzedSentence without the post chunker)
export function disambiguate(d, raw) {
  const pre = AnalyzedSentence.copyReadings(raw.getTokens());
  const dis = d.disambiguate(raw, null);
  return new AnalyzedSentence(dis.getTokens(), pre);
}
