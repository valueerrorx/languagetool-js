// Shared helpers of the X-RULELOAD adapters (JS twins of RuleLoadOps token dumps and builders).
import '../../src/lang/register.js';
import { Languages } from '../../src/core/Languages.js';
import { PatternTokenBuilder } from '../../src/core/patterns/PatternTokenBuilder.js';
import { PatternRule } from '../../src/core/patterns/PatternRule.js';
import { RegexPatternRule } from '../../src/core/patterns/RegexPatternRule.js';

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
  o.uniFeatures = t.getUniFeatures() === null ? null : Object.fromEntries(t.getUniFeatures().entrySet());
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

const enm = (e) => (e === null || e === undefined ? null : e.toString());

// Java: RuleLoadOps#ruleDump(AbstractPatternRule,Map,boolean)
export function ruleDump(r, groupSize, detail) {
  const o = {};
  o.class = r.constructor.name;
  o.id = r.getId();
  o.subId = r.getSubId();
  o.fullId = r.getFullId();
  o.groupSize = groupSize === null ? null : (groupSize.get(r.getId()) ?? null);
  o.description = r.getDescription();
  const c = r.getCategory();
  o.category = c === null ? null : [c.getId().toString(), c.getName(), c.isDefaultOff(), c.getLocation().name(), c.getTabName()];
  o.defaultOff = r.isDefaultOff();
  o.defaultTempOff = r.isDefaultTempOff();
  o.officeDefaultOn = r.isOfficeDefaultOn();
  o.officeDefaultOff = r.isOfficeDefaultOff();
  o.useInOffice = r.useInOffice();
  o.tags = r.getTags().map((t) => t.name());
  o.toneTags = r.getToneTags().map((t) => t.name());
  o.priority = r.getPriority();
  o.sourceFile = r.getSourceFile();
  o.premium = r.isPremium();
  o.goalSpecific = r.isGoalSpecific();
  o.url = r.getUrl() === null ? null : r.getUrl().toString();
  o.issueType = enm(r.getLocQualityIssueType());
  o.minPrevMatches = r.getMinPrevMatches();
  o.distanceTokens = r.getDistanceTokens();
  o.includedInHiddenMatches = r.isIncludedInHiddenMatches();
  o.includedInErrorsCorrectedAllAtOnce = r.isIncludedInErrorsCorrectedAllAtOnce();
  o.line = r.getXmlLineNumber();
  o.start = r.getStartPositionCorrection();
  o.end = r.getEndPositionCorrection();
  o.message = r.getMessage();
  o.suggestionsOutMsg = r.getSuggestionsOutMsg();
  o.suggestionMatches = r.getSuggestionMatches() === null ? null : r.getSuggestionMatches().length;
  o.suggestionMatchesOutMsg = Array.isArray(r.suggestionMatchesOutMsg) ? r.suggestionMatchesOutMsg.length : null;
  o.shortMessage = r.getShortMessage();
  const f = r.getFilter();
  o.filterClass = f === null ? null : f.constructor.FQCN;
  o.filterArgs = r.getFilterArguments();
  o.matchType = enm(r.getType());
  o.adjustSuggestionCase = r.isAdjustSuggestionCase();
  o.sentStart = r.isSentStart();
  o.testUnification = r.isTestUnification();
  o.getUnified = r.isGetUnified();
  o.groupsOrUnification = r.isGroupsOrUnification();
  o.tokenCount = r.getPatternTokens() === null ? null : r.getPatternTokens().length;
  const aps = r.getAntiPatterns();
  o.antiPatterns = aps.length;
  const corr = r.getCorrectExamples().map((e) => e.getExample());
  const inc = r.getIncorrectExamples().map((e) => [e.getExample(), e.getCorrections()]);
  const trg = r.getErrorTriggeringExamples().map((e) => e.getExample());
  o.examples = [corr, inc, trg];
  o.maxSpanTokens = r.getPatternTokens() === null ? null : r.maxSpanTokens;
  o.minTokenCount = r.getPatternTokens() === null ? null : r.minTokenCount;
  if (r instanceof PatternRule) {
    o.elementNo = r.elementNo;
    o.useList = r.useList;
    o.complexPhrase = r.isWithComplexPhrase();
    o.interpretPosTagsPreDisambiguation = r.interpretPosTagsPreDisambiguation;
    o.memberOfDisjunctiveSet = r.isMemberOfDisjunctiveSet;
    o.patternString = r.toPatternString();
    o.estimateContext = r.estimateContextForSureMatch();
  }
  if (r instanceof RegexPatternRule) {
    o.regex = r.getPattern().pattern();
    o.regexFlags = r.getPattern().flags();
    o.markGroup = r.markGroup;
    o.regexCaseSensitive = r.caseSensitive;
    o.regexFilterClass = r.regexFilter === null ? null : r.regexFilter.constructor.FQCN;
    o.requiredSubstrings = r.requiredSubstrings === null ? null : r.requiredSubstrings.toString();
    o.estimateContext = r.estimateContextForSureMatch();
  }
  if (detail) {
    if (r.getPatternTokens() !== null) o.tokens = dumpTokens(r.getPatternTokens());
    const ad = [];
    for (const a of aps) {
      ad.push({
        id: a.getId(),
        description: a.getDescription(),
        start: a.getStartPositionCorrection(),
        end: a.getEndPositionCorrection(),
        action: enm(a.getAction()),
        tokens: dumpTokens(a.getPatternTokens()),
        untouchedExamples: a.getUntouchedExamples().slice(),
      });
    }
    o.antiPatternRules = ad;
    o.suggestionMatchList = r.getSuggestionMatches() === null ? [] : r.getSuggestionMatches().map((m) => matchDump(m));
    o.suggestionMatchOutMsgList = Array.isArray(r.suggestionMatchesOutMsg) ? r.suggestionMatchesOutMsg.map((m) => matchDump(m)) : [];
    if (r instanceof PatternRule) {
      try {
        o.toXML = r.toXML();
      } catch (t) {
        o.toXML = err(t);
      }
    }
  }
  return o;
}

// Java: RuleLoadOps#compactDump(AbstractPatternRule,Map)
export function compactDump(r) {
  return {
    fullId: r.getFullId(),
    class: r.constructor.name,
    category: r.getCategory() === null ? null : r.getCategory().getId().toString(),
    defaultOff: r.isDefaultOff(),
    defaultTempOff: r.isDefaultTempOff(),
    premium: r.isPremium(),
    priority: r.getPriority(),
    tokenCount: r.getPatternTokens() === null ? null : r.getPatternTokens().length,
    antiPatterns: r.getAntiPatterns().length,
    sourceFile: r.getSourceFile(),
    message: r.getMessage(),
  };
}

// Java: RuleLoadOps#groupSizes(List)
export function groupSizes(rules) {
  const m = new Map();
  for (const r of rules) m.set(r.getId(), (m.get(r.getId()) ?? 0) + 1);
  return m;
}

// Java: RuleLoadOps#features(AbstractPatternRule)
function features(r) {
  const f = new Set();
  if (r.getFilter() !== null) f.add('filter');
  if (r instanceof RegexPatternRule) f.add('regexRule');
  if (r.getAntiPatterns().length !== 0) f.add('antipattern');
  if (r.isDefaultOff()) f.add('defaultOff');
  if (r.isDefaultTempOff()) f.add('defaultTempOff');
  if (r.getTags().length !== 0) f.add('tags');
  if (r.getToneTags().length !== 0) f.add('toneTags');
  if (r.isPremium()) f.add('premium');
  if (r.getPriority() !== 0) f.add('prio');
  if (r.getMinPrevMatches() !== 0) f.add('minPrev');
  if (r.getSuggestionMatches() !== null && r.getSuggestionMatches().length !== 0) f.add('suggestionMatch');
  if (r.getSuggestionsOutMsg() !== null && r.getSuggestionsOutMsg().length !== 0) f.add('outMsg');
  if (r.getErrorTriggeringExamples().length !== 0) f.add('triggersError');
  if (r.getStartPositionCorrection() !== 0) f.add('startCorr');
  if (r.getEndPositionCorrection() !== 0) f.add('endCorr');
  if (r instanceof PatternRule) {
    if (r.isWithComplexPhrase()) f.add('complexPhrase');
    if (r.isTestUnification()) f.add('unification');
    if (r.isSentStart()) f.add('sentStart');
    for (const t of r.getPatternTokens()) tokenFeatures(t, f);
  }
  return f;
}

// Java: RuleLoadOps#tokenFeatures(PatternToken,Set)
function tokenFeatures(t, f) {
  if (t.isRegularExpression()) f.add('tokRegexp');
  if (t.isInflected()) f.add('tokInflected');
  if (t.getNegation()) f.add('tokNegation');
  if (t.getPOStag() !== null) f.add(t.isPOStagRegularExpression() ? 'posRegexp' : 'posPlain');
  if (t.getPOSNegation()) f.add('posNegation');
  if (t.getChunkTag() !== null) f.add('chunk');
  if (t.getSkipNext() !== 0) f.add('skip');
  if (t.getMinOccurrence() !== 1) f.add('min');
  if (t.getMaxOccurrence() !== 1) f.add('max');
  if (t.isPartOfPhrase()) f.add('phrase');
  if (t.isUnified()) f.add('tokUnified');
  if (t.isUnificationNeutral()) f.add('unificationNeutral');
  if (t.getMatch() !== null) f.add('tokMatch');
  if (t.hasAndGroup()) f.add('and');
  if (t.hasOrGroup()) f.add('or');
  if (t.isSentenceStart()) f.add('sentenceStart');
  if (t.isCaseSensitive()) f.add('caseSensitive');
  if (!t.isInsideMarker()) f.add('outsideMarker');
  if (t.hasExceptionList()) {
    const rare = t.rareFields;
    if (rare !== null) {
      for (const e of rare.currentAndNextExceptions) {
        f.add((e.flags & 0x20) !== 0 ? 'exNext' : 'exCurrent');
        tokenFeatures(e, new Set());
      }
      if (rare.previousExceptions.length > 0) f.add('exPrevious');
    }
  }
  return f;
}

export { features };
