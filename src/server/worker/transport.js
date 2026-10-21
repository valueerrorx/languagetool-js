// JS: structured-clone transport between the main thread and check workers (no Java counterpart; mirrors what the Java pool shares by reference)
import { Languages, getDynamicLanguageSpecs } from '../../core/Languages.js';
import { AnnotatedText, MetaDataKey } from '../../core/text/AnnotatedText.js';
import { TextPart, Type } from '../../core/text/TextPart.js';
import { MappingValue } from '../../core/text/MappingValue.js';
import { CategoryId, Category } from '../../core/rules/model/Category.js';
import { UserConfig } from '../../core/rules/model/UserConfig.js';
import { GlobalConfig } from '../../core/rules/model/GlobalConfig.js';
import { RuleOption } from '../../core/rules/model/RuleOption.js';
import { CheckResults } from '../../core/rules/model/CheckResults.js';
import { ToneTag, Tag } from '../../core/rules/model/Tag.js';
import { Rule } from '../../core/rules/model/Rule.js';
import { RuleMatch, Type as MatchType } from '../../core/rules/model/RuleMatch.js';
import { ITSIssueType } from '../../core/rules/model/ITSIssueType.js';
import { SuggestedReplacement, SuggestionType } from '../../core/rules/model/SuggestedReplacement.js';
import { Range } from '../../core/check/Range.js';
import { ExtendedSentenceRange } from '../../core/check/ExtendedSentenceRange.js';
import { SentenceRange } from '../../core/rules/model/SentenceRange.js';
import { Level, Mode } from '../../core/JLanguageTool.js';
import * as errors from '../../lib/java/errors.js';
import { URL } from '../../lib/java/URL.js';
import { isThrowable, RuntimeException } from '../../lib/java/errors.js';
import { notPortedYet } from '../../core/language/components.js';
import { QueryParams } from '../QueryParams.js';
import { BadRequestException } from '../BadRequestException.js';
import * as serverExceptions from '../exceptions.js';
import { ErrorRateTooHighException } from '../../core/check/ErrorRateTooHighException.js';

// Language <-> index in the registered language list (same registration order in every thread)
export function languageToDto(lang) {
  if (lang === null || lang === undefined) return null;
  return Languages.getWithDemoLanguage().indexOf(lang);
}

export function languageFromDto(dto) {
  return dto === null ? null : Languages.getWithDemoLanguage()[dto];
}

// AnnotatedText <-> plain data
export function annotatedTextToDto(t) {
  return {
    parts: t.getParts().map((p) => [p.getPart(), p.getType().name()]),
    mapping: [...t.mapping].map(([k, v]) => [k, v.getTotalPosition(), v.getFakeMarkupLength()]),
    metaData: [...t.metaData].map(([k, v]) => [k.name(), v]),
    customMetaData: [...t.customMetaData],
  };
}

export function annotatedTextFromDto(d) {
  return new AnnotatedText(d.parts.map(([p, ty]) => new TextPart(p, Type.valueOf(ty))),
    new Map(d.mapping.map(([k, tp, fl]) => [k, new MappingValue(tp, fl)])),
    new Map(d.metaData.map(([k, v]) => [MetaDataKey.valueOf(k), v])), new Map(d.customMetaData));
}

// QueryParams <-> plain data
export function queryParamsToDto(q) {
  return {
    altLanguages: q.altLanguages.map(languageToDto), enabledRules: q.enabledRules, disabledRules: q.disabledRules,
    enabledCategories: q.enabledCategories.map((c) => c.toString()), disabledCategories: q.disabledCategories.map((c) => c.toString()),
    useEnabledOnly: q.useEnabledOnly, useQuerySettings: q.useQuerySettings, allowIncompleteResults: q.allowIncompleteResults,
    enableHiddenRules: q.enableHiddenRules, premium: q.premium, enableTempOffRules: q.enableTempOffRules,
    mode: q.mode.name(), level: q.level.name(), toneTags: q.toneTags === null || q.toneTags === undefined ? null : [...q.toneTags].map((t) => t.name()),
    callback: q.callback, inputLogging: q.inputLogging,
  };
}

export function queryParamsFromDto(d) {
  return new QueryParams(d.altLanguages.map(languageFromDto), d.enabledRules, d.disabledRules,
    d.enabledCategories.map((c) => new CategoryId(c)), d.disabledCategories.map((c) => new CategoryId(c)),
    d.useEnabledOnly, d.useQuerySettings, d.allowIncompleteResults, d.enableHiddenRules, d.premium, d.enableTempOffRules,
    Mode.valueOf(d.mode), Level.valueOf(d.level), d.toneTags === null ? null : new Set(d.toneTags.map((n) => ToneTag.valueOf(n))),
    d.callback, d.inputLogging);
}

// UserConfig <-> plain data (rule values travel in their RuleOption string form; Long = BigInt is cloneable)
export function userConfigToDto(u) {
  if (u.userSpecificRules.length > 0) throw notPortedYet('user rules of database users');
  return {
    words: u.userSpecificSpellerWords, ruleValues: [...u.configurableRuleValues].map(([k, v]) => [k, RuleOption.objectsToString(v)]),
    maxSpellingSuggestions: u.maxSpellingSuggestions, premiumUid: u.premiumUid, userDictName: u.userDictName, userDictCacheSize: u.userDictCacheSize,
    filterDictionaryMatches: u.filterDictionaryMatches_, abTest: u.abTest, textSessionId: u.textSessionId, hidePremiumMatches: u.hidePremiumMatches,
    preferredLanguages: u.preferredLanguages === '' ? [] : u.preferredLanguages.split(','), trustedSource: u.trustedSource,
    optInThirdPartyAI: u.optInThirdPartyAI, isPremium: u.premium, tokenType: u.tokenType.name(), suggestionsEnabled: u.suggestionsEnabled,
  };
}

export function userConfigFromDto(d) {
  const rv = new Map(d.ruleValues.map(([k, s]) => [k, RuleOption.stringToObjects(s)]));
  return new UserConfig(d.words, [], rv, d.maxSpellingSuggestions, d.premiumUid, d.userDictName, d.userDictCacheSize, null,
    d.filterDictionaryMatches, d.abTest, d.textSessionId, d.hidePremiumMatches, d.preferredLanguages, d.trustedSource,
    d.optInThirdPartyAI, d.isPremium, UserConfig.TokenType.valueOf(d.tokenType), d.suggestionsEnabled);
}

export function globalConfigToDto(g) {
  return { grammalecteServer: g.grammalecteServer, grammalecteUser: g.grammalecteUser, grammalectePassword: g.grammalectePassword,
    beolingusFile: g.beolingusFile === null ? null : String(g.beolingusFile), nerUrl: g.nerUrl };
}

export function globalConfigFromDto(d) {
  const g = new GlobalConfig();
  g.grammalecteServer = d.grammalecteServer;
  g.grammalecteUser = d.grammalecteUser;
  g.grammalectePassword = d.grammalectePassword;
  g.beolingusFile = d.beolingusFile;
  g.nerUrl = d.nerUrl;
  return g;
}

// the subset of HTTPServerConfig that pipeline creation, the result cache and prewarming read
export function configToDto(c) {
  return {
    cacheSize: c.getCacheSize(), cacheTTLSeconds: c.getCacheTTLSeconds(), maxPipelinePoolSize: c.getMaxPipelinePoolSize(),
    pipelineCaching: c.isPipelineCachingEnabled(), disabledRuleIds: [...c.getDisabledRuleIds()], maxErrorsPerWordRate: c.getMaxErrorsPerWordRate(),
    languageModelDir: c.getLanguageModelDir() === null ? null : String(c.getLanguageModelDir()),
    rulesConfigFile: c.getRulesConfigFile() === null ? null : String(c.getRulesConfigFile()),
    remoteRulesConfigFile: c.getRemoteRulesConfigFile() === null ? null : String(c.getRemoteRulesConfigFile()),
    globalConfig: globalConfigToDto(c.globalConfig),
    dynamicLanguages: getDynamicLanguageSpecs(), // JS: HTTPServerConfig#addDynamicLanguages ran on the main thread
  };
}

// config view for the worker side (same getter names as HTTPServerConfig)
export class WorkerConfig {
  constructor(d) {
    this.d = d;
    this.globalConfig = globalConfigFromDto(d.globalConfig);
  }

  getCacheSize() { return this.d.cacheSize; }
  getCacheTTLSeconds() { return this.d.cacheTTLSeconds; }
  getMaxPipelinePoolSize() { return this.d.maxPipelinePoolSize; }
  isPipelineCachingEnabled() { return this.d.pipelineCaching; }
  getDisabledRuleIds() { return this.d.disabledRuleIds; }
  getMaxErrorsPerWordRate() { return this.d.maxErrorsPerWordRate; }
  getLanguageModelDir() { return this.d.languageModelDir; }
  getRulesConfigFile() { return this.d.rulesConfigFile; }
  getRemoteRulesConfigFile() { return this.d.remoteRulesConfigFile; }
}

// Rule restored in the main thread from a match of a worker (the part of Rule that RuleMatchesAsJsonSerializer and TextChecker read)
class SnapshotRule extends Rule {
  constructor(d) {
    super();
    this.d = d;
    this.setLocQualityIssueType(ITSIssueType.valueOf(d.issueType));
    if (d.tempOff) this.setDefaultTempOff();
    this.setCategory(new Category(new CategoryId(d.categoryId), d.categoryName));
    this.setPremium(d.premium);
    this.setTags(d.tags.map((t) => Tag.valueOf(t)));
    if (d.toneTags.length > 0) this.setToneTags(d.toneTags.map((t) => ToneTag.valueOf(t)));
    this.setUrl(d.url === null ? null : new URL(d.url));
  }

  getId() { return this.d.id; }
  getSubId() { return this.d.subId; }
  getSourceFile() { return this.d.sourceFile; }
  getDescription() { return this.d.description; }
  estimateContextForSureMatch() { return this.d.estimateContext; }
  match() { throw new errors.UnsupportedOperationException('Not implemented; rule snapshot of a check worker'); }
}

// RuleMatch <-> plain data (lazy suggestions that were never computed are dropped as discardLazySuggestedReplacements does)
export function ruleMatchToDto(m) {
  const r = m.getRule();
  return {
    rule: {
      id: r.getId(), subId: r.getSubId() ?? null, sourceFile: r.getSourceFile() ?? null, description: r.getDescription(),
      estimateContext: r.estimateContextForSureMatch(), issueType: r.getLocQualityIssueType().name(), tempOff: r.isDefaultTempOff(),
      categoryId: r.getCategory().getId().toString(), categoryName: r.getCategory().getName(), premium: r.isPremium(),
      tags: r.getTags().map((t) => t.name()), toneTags: r.getToneTags().map((t) => t.name()), url: r.getUrl() === null ? null : r.getUrl().toString(),
    },
    from: m.getFromPos(), to: m.getToPos(), message: m.getMessage(), shortMessage: m.shortMessage ?? null,
    suggestions: (m.suggestionsComputed ? m.getSuggestedReplacementObjects() : []).map((s) => ({
      replacement: s.getReplacement(), shortDescription: s.getShortDescription(), suffix: s.getSuffix(), type: s.getType().name(), confidence: s.getConfidence(),
    })),
    url: m.getUrl() === null || m.getUrl() === undefined ? null : m.getUrl().toString(), type: m.getType().name(), autoCorrect: m.isAutoCorrect(),
    patternFrom: m.getPatternFromPos(), patternTo: m.getPatternToPos(), sentenceFrom: m.getFromPosSentence(), sentenceTo: m.getToPosSentence(),
    line: m.getLine(), endLine: m.getEndLine(), column: m.getColumn(), endColumn: m.getEndColumn(),
    specificRuleId: m.getSpecificRuleId(), originalErrorStr: m.getOriginalErrorStr(),
    newLanguageMatches: [...m.getNewLanguageMatches()], sentenceText: m.getSentence() === null || m.getSentence() === undefined ? null : m.getSentence().getText(),
  };
}

export function ruleMatchFromDto(d) {
  const sentence = d.sentenceText === null ? null : { getText: () => d.sentenceText };
  const m = new RuleMatch(new SnapshotRule(d.rule), sentence, d.from, d.to, d.message, d.shortMessage);
  m.setSuggestedReplacementObjects(d.suggestions.map((s) => {
    const sr = new SuggestedReplacement(s.replacement, s.shortDescription, s.suffix);
    sr.setType(SuggestionType.valueOf(s.type));
    sr.setConfidence(s.confidence);
    return sr;
  }));
  m.setUrl(d.url === null ? null : new URL(d.url));
  m.setType(MatchType.valueOf(d.type));
  m.setAutoCorrect(d.autoCorrect);
  m.setPatternPosition(d.patternFrom, d.patternTo);
  m.setSentencePosition(d.sentenceFrom, d.sentenceTo);
  m.setLine(d.line);
  m.setEndLine(d.endLine);
  m.setColumn(d.column);
  m.setEndColumn(d.endColumn);
  m.setSpecificRuleId(d.specificRuleId);
  m.setOriginalErrorStr(d.originalErrorStr);
  m.setNewLanguageMatches(new Map(d.newLanguageMatches));
  return m;
}

// CheckResults <-> plain data
export function checkResultsToDto(cr) {
  return {
    matches: cr.getRuleMatches().map(ruleMatchToDto),
    ignoredRanges: cr.getIgnoredRanges().map((r) => [r.getFromPos(), r.getToPos(), r.getLang()]),
    sentenceRanges: cr.getSentenceRanges().map((r) => [r.getFromPos(), r.getToPos()]),
    extendedSentenceRanges: cr.getExtendedSentenceRanges().map((r) => [r.getFromPos(), r.getToPos(), [...r.getLanguageConfidenceRates()]]),
  };
}

export function checkResultsFromDto(d) {
  const cr = new CheckResults(d.matches.map(ruleMatchFromDto), d.ignoredRanges.map(([f, t, l]) => new Range(f, t, l)),
    d.extendedSentenceRanges.map(([f, t, rates]) => new ExtendedSentenceRange(f, t, new Map(rates))));
  cr.addSentenceRanges(d.sentenceRanges.map(([f, t]) => new SentenceRange(f, t)));
  return cr;
}

// Throwable chain <-> plain data (class by FQCN, message, causes)
export function errorToDto(e) {
  if (e !== null && typeof e === 'object' && e.notPorted === true) return { notPorted: true, message: e.message };
  if (!isThrowable(e)) return { fqcn: 'java.lang.RuntimeException', message: String(e?.stack ?? e), cause: null, js: true };
  const c = e.getCause();
  return { fqcn: e.javaClass, message: e.getMessage(), cause: c === null || c === undefined || c === e ? null : errorToDto(c) };
}

const registry = new Map();
for (const mod of [errors, serverExceptions, { BadRequestException, ErrorRateTooHighException }]) {
  for (const v of Object.values(mod)) if (typeof v === 'function' && typeof v.FQCN === 'string') registry.set(v.FQCN, v);
}

export function reviveError(d) {
  if (d.notPorted) return Object.assign(new Error(d.message), { notPorted: true });
  let Cls = registry.get(d.fqcn);
  if (Cls === undefined) {
    Cls = class extends RuntimeException {};
    Cls.FQCN = d.fqcn;
    registry.set(d.fqcn, Cls);
  }
  const e = new Cls(d.message);
  if (d.cause !== null) {
    e._cause = reviveError(d.cause);
    e._causeSet = true;
  }
  return e;
}
