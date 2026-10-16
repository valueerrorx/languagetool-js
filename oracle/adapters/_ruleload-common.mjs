// Shared helpers of the X-RULELOAD adapters (JS twins of RuleLoadOps token dumps and builders).
import '../../src/lang/register.js';
import { Languages } from '../../src/core/Languages.js';
import { PatternTokenBuilder } from '../../src/core/patterns/PatternTokenBuilder.js';

// Java: RuleLoadOps#err(Throwable)
export function err(t) {
  if (t && t.notPorted === true) throw t;
  const causes = [];
  for (let c = t.getCause?.() ?? null; c && causes.length < 20; c = c.getCause?.() ?? null) {
    causes.push({ class: c.javaClass ?? c.constructor.name, message: c.message ?? null });
  }
  return { error: { class: t.javaClass ?? `js:${t.constructor.name}`, message: t.message ?? null, causes } };
}

// Java: RuleLoadOps#str(JsonNode)
export const str = (n) => (n === undefined || n === null ? null : String(n));

// Java: RuleLoadOps#lang(String)
export const lang = (code) => Languages.getLanguageForShortCode(code);

const FLAG_NAMES = ['inflected', 'negation', 'testWhitespace', 'whitespaceBefore', 'insideMarker',
  'exceptionValidNext', 'mayBeOmitted', 'testString', 'unificationNeutral', 'uniNegation', 'lastUnified'];

// Java: RuleLoadOps#matchDump(Match)
export function matchDump(m) {
  if (m === null) return null;
  return {
    posTag: m.getPosTag(),
    suppressMisspelled: m.suppressMisspelled,
    regexMatch: m.getRegexMatch() === null ? null : m.getRegexMatch().pattern(),
    regexMatchFlags: m.getRegexMatch() === null ? null : m.getRegexMatch().flags(),
    regexReplace: m.getRegexReplace(),
    posRegexMatch: m.getPosRegexMatch() === null ? null : m.getPosRegexMatch().pattern(),
    postagRegexp: m.isPostagRegexp(),
    posTagReplace: m.getPosTagReplace(),
    caseConversion: m.getCaseConversionType() === null ? null : m.getCaseConversionType().name(),
    includeSkipped: m.getIncludeSkipped() === null ? null : m.getIncludeSkipped().name(),
    setsPos: m.setsPos(),
    staticLemma: m.isStaticLemma(),
    lemma: m.getLemma(),
    tokenRef: m.getTokenRef(),
    inMessageOnly: m.isInMessageOnly(),
  };
}

// Java: RuleLoadOps#tokenDump(PatternToken)
export function tokenDump(t) {
  const o = {};
  o.string = t.getString();
  o.caseSensitive = t.isCaseSensitive();
  o.regexp = t.isRegularExpression();
  o.inflected = t.isInflected();
  o.negation = t.getNegation();
  if (t.getPOStag() !== null || t.isPOStagRegularExpression() || t.getPOSNegation()) {
    o.pos = { tag: t.getPOStag(), regexp: t.isPOStagRegularExpression(), negation: t.getPOSNegation() };
  } else {
    o.pos = null;
  }
  o.chunk = t.getChunkTag() === null ? null : t.getChunkTag().getChunkTag();
  o.skip = t.getSkipNext();
  o.min = t.getMinOccurrence();
  o.max = t.getMaxOccurrence();
  o.flags = FLAG_NAMES.filter((n, i) => (t.flags & (1 << i)) !== 0);
  o.sentenceStart = t.isSentenceStart();
  o.referenceElement = t.isReferenceElement();
  o.phrase = t.getPhraseName();
  o.partOfPhrase = t.isPartOfPhrase();
  o.unified = t.isUnified();
  o.uniFeatures = t.getUniFeatures() === null ? null : Object.fromEntries([...t.getUniFeatures().entries()]);
  o.uniNegated = t.isUniNegated();
  o.lastInUnification = t.isLastInUnification();
  o.unificationNeutral = t.isUnificationNeutral();
  o.insideMarker = t.isInsideMarker();
  o.match = matchDump(t.getMatch());
  const rare = t.rareFields;
  const ex = [];
  if (rare !== null) {
    for (const pt of rare.currentAndNextExceptions) {
      ex.push({ scope: (pt.flags & 0x20) !== 0 ? 'next' : 'current', token: tokenDump(pt) });
    }
    for (const pt of rare.previousExceptions) {
      ex.push({ scope: 'previous', token: tokenDump(pt) });
    }
  }
  o.exceptions = ex;
  o.and = t.hasAndGroup() ? dumpTokens(t.getAndGroup()) : null;
  o.or = t.hasOrGroup() ? dumpTokens(t.getOrGroup()) : null;
  o.text = t.toString();
  return o;
}

// Java: RuleLoadOps#dumpTokens(List)
export function dumpTokens(l) {
  return l.map((t) => tokenDump(t));
}

// Java: RuleLoadOps#buildToken(JsonNode)
export function buildToken(calls) {
  const b = new PatternTokenBuilder();
  for (const c of calls) {
    const name = String(c[0]);
    const arg = c.length > 1 && c[1] !== null ? String(c[1]) : null;
    switch (name) {
      case 'token': b.token(arg); break;
      case 'csToken': b.csToken(arg); break;
      case 'tokenRegex': b.tokenRegex(arg); break;
      case 'csTokenRegex': b.csTokenRegex(arg); break;
      case 'pos': b.pos(arg); break;
      case 'posRegex': b.posRegex(arg); break;
      case 'posRegexWithStringException': b.posRegexWithStringException(arg, String(c[2])); break;
      case 'min': b.min(c[1]); break;
      case 'max': b.max(c[1]); break;
      case 'mark': b.mark(c[1]); break;
      case 'negate': b.negate(); break;
      case 'setSkip': b.setSkip(c[1]); break;
      case 'setIsWhiteSpaceBefore': b.setIsWhiteSpaceBefore(c[1]); break;
      case 'matchInflectedForms': b.matchInflectedForms(); break;
      case 'nullToken': b.token(null); break;
      default: throw new Error(`unknown builder call: ${name}`);
    }
  }
  return b.build();
}
