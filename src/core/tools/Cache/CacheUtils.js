// org.languagetool.tools.Cache.CacheUtils (RuleMatch <-> ProtoResultCache.CachedResultMatch; the message is a plain object with protobuf defaults)
import { NullPointerException } from '../../../lib/java/errors.js';
import { Premium } from '../../rules/model/Premium.js';
import { RuleMatch, Type } from '../../rules/model/RuleMatch.js';
import { SuggestedReplacement, SuggestionType } from '../../rules/model/SuggestedReplacement.js';
import { MalformedURLException, URL } from '../../../lib/java/URL.js';
import { RuleData } from '../grpc/RuleData.js';
import { emptyAsNull, getUrl, nullAsEmpty } from '../grpc/ProtoHelper.js';

// protobuf setters reject null
const nn = (v) => {
  if (v === null || v === undefined) throw new NullPointerException();
  return v;
};

// Java: GRPCUtils#toGRPC(SuggestedReplacement)
function suggestionToGRPC(s) {
  const o = {
    replacement: nn(s.getReplacement()),
    description: nullAsEmpty(s.getShortDescription()),
    suffix: nullAsEmpty(s.getSuffix()),
    type: s.getType().name(),
    confidence: 0,
  };
  if (s.getConfidence() !== null && s.getConfidence() !== undefined) o.confidence = Math.fround(s.getConfidence());
  return o;
}

// Java: GRPCUtils#fromGRPC(MLServerProto.SuggestedReplacement)
function suggestionFromGRPC(s) {
  const sb = new SuggestedReplacement(s.replacement, emptyAsNull(s.description), emptyAsNull(s.suffix));
  sb.setType(SuggestionType.valueOf(s.type));
  if (s.confidence !== 0) sb.setConfidence(s.confidence);
  return sb;
}

export class CacheUtils {
  static FQCN = 'org.languagetool.tools.Cache.CacheUtils';

  // Java: CacheUtils#serializeResultMatch(RuleMatch)
  static serializeResultMatch(ruleMatch) {
    const rule = ruleMatch.getRule();
    return {
      rule: {
        id: nn(rule.getId()),
        subId: nullAsEmpty(rule.getSubId()),
        description: nullAsEmpty(rule.getDescription()),
        estimateContextForSureMatch: rule.estimateContextForSureMatch(),
        sourceFile: nullAsEmpty(rule.getSourceFile()),
        issueType: rule.getLocQualityIssueType().name(),
        tempOff: rule.isDefaultTempOff(),
        category: { id: rule.getCategory().getId().toString(), name: nn(rule.getCategory().getName()) },
        isPremium: Premium.get().isPremiumRule(rule),
        tags: rule.getTags().map((t) => t.name()),
      },
      message: nn(ruleMatch.getMessage()),
      shortMessage: nn(ruleMatch.getShortMessage()),
      offsetPosition: { start: ruleMatch.getFromPos(), end: ruleMatch.getToPos() },
      patternPosition: { start: ruleMatch.getPatternFromPos(), end: ruleMatch.getPatternToPos() },
      sentencePosition: { start: ruleMatch.getFromPosSentence(), end: ruleMatch.getToPosSentence() },
      suggestedReplacements: ruleMatch.getSuggestedReplacementObjects().map(suggestionToGRPC),
      url: getUrl(ruleMatch),
      type: ruleMatch.getType().name(),
      autoCorrect: ruleMatch.isAutoCorrect(),
      newLanguageMatches: [...ruleMatch.getNewLanguageMatches()].map(([k, v]) => ({ languageCode: k, confidence: Math.fround(v) })),
      specificRuleId: nn(ruleMatch.getSpecificRuleId()),
      originalErrorString: nn(ruleMatch.getOriginalErrorStr()),
    };
  }

  // Java: CacheUtils#deserializeResultMatch(CachedResultMatch,AnalyzedSentence)
  static deserializeResultMatch(cachedResultMatch, analyzedSentence) {
    const rule = new RuleData(cachedResultMatch.rule);
    const ruleMatch = new RuleMatch(rule, analyzedSentence, cachedResultMatch.offsetPosition.start, cachedResultMatch.offsetPosition.end,
      cachedResultMatch.message, cachedResultMatch.shortMessage);
    ruleMatch.setSuggestedReplacementObjects(cachedResultMatch.suggestedReplacements.map(suggestionFromGRPC));
    ruleMatch.setAutoCorrect(cachedResultMatch.autoCorrect);
    ruleMatch.setType(Type.valueOf(cachedResultMatch.type));
    ruleMatch.setSentencePosition(cachedResultMatch.sentencePosition.start, cachedResultMatch.sentencePosition.end);
    ruleMatch.setPatternPosition(cachedResultMatch.patternPosition.start, cachedResultMatch.patternPosition.end);
    ruleMatch.setOriginalErrorStr(cachedResultMatch.originalErrorString);
    if (cachedResultMatch.url !== '') {
      try {
        ruleMatch.setUrl(new URL(cachedResultMatch.url));
      } catch (e) {
        if (!(e instanceof MalformedURLException)) throw e;
        // log.warn("Got invalid URL from ProtoResultCache.CachedResultMatch: {}", e) (F71)
      }
    }
    return ruleMatch;
  }
}
