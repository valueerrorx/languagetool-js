// org.languagetool.tools.RuleMatchesAsJsonSerializer and ConfidenceKey
import { NullPointerException } from '../lib/java/errors.js';
import { Objects } from '../lib/java/Objects.js';
import { Pattern } from '../lib/java/regex/index.js';
import { Float } from '../lib/java/float.js';
import { javaTrim } from '../lib/java/strings.js';
import { replaceOnce } from '../lib/java/StringUtils.js';
import { ContextTools } from './text/ContextTools.js';
import { AnnotatedTextBuilder } from './text/AnnotatedTextBuilder.js';
import { CheckResults } from './rules/model/CheckResults.js';
import { Premium } from './rules/model/Premium.js';
import { SuggestionType } from './rules/model/SuggestedReplacement.js';
import { VERSION, BUILD_DATE } from './LtBuildInfo.js';

const API_VERSION = 1;
const STATUS = '';
const PREMIUM_HINT = 'You might be missing errors only the Premium version can find. Contact us at support<at>languagetoolplus.com.';
const START_MARKER = '__languagetool_start_marker';
const SUGGESTION = '<suggestion>';
const SUGGESTION_END = '</suggestion>';
const ANYTHING_SLASH_PATTERN = Pattern.compile('.*/');

// Java: Jackson writeNumber(float): shortest float text; NaN/Infinity are written as quoted strings
class FloatNum {
  constructor(v) {
    this.v = v;
  }

  toJson() {
    return Number.isFinite(this.v) ? Float.toString(this.v) : JSON.stringify(Float.toString(this.v));
  }
}

// Java: JsonGenerator output of nested objects/arrays (insertion order = write order)
function toJson(v) {
  if (v instanceof FloatNum) return v.toJson();
  if (v === null || v === undefined) return 'null';
  if (Array.isArray(v)) return `[${v.map(toJson).join(',')}]`;
  if (typeof v === 'object') return `{${Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}:${toJson(x)}`).join(',')}}`;
  return JSON.stringify(v);
}

export class ConfidenceKey {
  static FQCN = 'org.languagetool.tools.ConfidenceKey';

  // Java: ConfidenceKey#ConfidenceKey(Language,String)
  constructor(lang, ruleId) {
    this.lang = Objects.requireNonNull(lang);
    this.ruleId = Objects.requireNonNull(ruleId);
  }

  // Java: ConfidenceKey#equals(Object)
  equals(o) {
    if (this === o) return true;
    if (o === null || o === undefined || this.constructor !== o.constructor) return false;
    return Objects.equals(this.lang, o.lang) && Objects.equals(this.ruleId, o.ruleId);
  }

  // Java: ConfidenceKey#toString()
  toString() {
    return `${this.lang.getShortCodeWithCountryAndVariant()}/${this.ruleId}`;
  }
}

export class RuleMatchesAsJsonSerializer {
  static FQCN = 'org.languagetool.tools.RuleMatchesAsJsonSerializer';

  // Java: RuleMatchesAsJsonSerializer#RuleMatchesAsJsonSerializer() / (int) / (int,Language)
  constructor(compactMode = 0, lang = null) {
    this.compactMode = compactMode;
    this.lang = lang;
    this.confidenceMap = null;
  }

  // Java: RuleMatchesAsJsonSerializer#ruleMatchesToJson(List,String,int,DetectedLanguage)
  ruleMatchesToJson(matches, text, contextSize, detectedLang) {
    return this.ruleMatchesToJsonHidden(matches, [], text, contextSize, detectedLang, null);
  }

  // Java: RuleMatchesAsJsonSerializer#ruleMatchesToJson(List,List,String,int,DetectedLanguage,String)
  ruleMatchesToJsonHidden(matches, hiddenMatches, text, contextSize, detectedLang, incompleteResultsReason) {
    return this.ruleMatchesToJsonAnnotated(matches, hiddenMatches, new AnnotatedTextBuilder().addText(text).build(), contextSize, detectedLang, incompleteResultsReason, false);
  }

  // Java: RuleMatchesAsJsonSerializer#ruleMatchesToJson(List,List,AnnotatedText,int,DetectedLanguage,String,boolean)
  ruleMatchesToJsonAnnotated(matches, hiddenMatches, text, contextSize, detectedLang, incompleteResultsReason, showPremiumHint) {
    return this.ruleMatchesToJson2([new CheckResults(matches, [])], hiddenMatches, text, contextSize, detectedLang, incompleteResultsReason, showPremiumHint, null);
  }

  // Java: RuleMatchesAsJsonSerializer#ruleMatchesToJson2(List,List,AnnotatedText,int,DetectedLanguage,String,boolean,Mode)
  ruleMatchesToJson2(res, hiddenMatches, text, contextSize, detectedLang, incompleteResultsReason, showPremiumHint, mode) {
    const contextTools = new ContextTools();
    contextTools.setEscapeHtml(false);
    contextTools.setContextSize(contextSize);
    contextTools.setErrorMarker(START_MARKER, '');
    const g = {};
    this.writeSoftwareSection(g, showPremiumHint);
    this.writeWarningsSection(g, incompleteResultsReason);
    this.writeLanguageSection(g, detectedLang);
    this.writeMatchesSection('matches', g, res, text, contextTools);
    if (hiddenMatches !== null && hiddenMatches !== undefined && hiddenMatches.length > 0) {
      this.writeMatchesSection('hiddenMatches', g, [new CheckResults(hiddenMatches, [])], text, contextTools);
    }
    this.writeIgnoreRanges(g, res);
    this.writeSentenceRanges(g, res);
    this.writeExtendedSentenceRanges(g, res);
    return toJson(g);
  }

  // Java: RuleMatchesAsJsonSerializer#writeSoftwareSection(JsonGenerator,boolean)
  writeSoftwareSection(g, showPremiumHint) {
    if (this.compactMode === 1) return;
    const s = {};
    s.name = 'LanguageTool';
    s.version = VERSION;
    s.buildDate = BUILD_DATE;
    s.apiVersion = API_VERSION;
    s.premium = Premium.isPremiumVersion();
    if (showPremiumHint) s.premiumHint = PREMIUM_HINT;
    s.status = STATUS;
    g.software = s;
  }

  // Java: RuleMatchesAsJsonSerializer#writeWarningsSection(JsonGenerator,String)
  writeWarningsSection(g, incompleteResultsReason) {
    if (this.compactMode === 1 && (incompleteResultsReason === null || incompleteResultsReason === undefined)) return;
    const w = {};
    if (incompleteResultsReason !== null && incompleteResultsReason !== undefined) {
      w.incompleteResults = true;
      w.incompleteResultsReason = incompleteResultsReason;
    } else {
      w.incompleteResults = false;
    }
    g.warnings = w;
  }

  // Java: RuleMatchesAsJsonSerializer#writeLanguageSection(JsonGenerator,DetectedLanguage)
  writeLanguageSection(g, detectedLang) {
    const l = {};
    l.name = detectedLang.getGivenLanguage().getName();
    l.code = detectedLang.getGivenLanguage().getShortCodeWithCountryAndVariant();
    if (detectedLang.getGivenLanguage().isSpellcheckOnlyLanguage()) l.spellCheckOnly = true;
    const d = {};
    d.name = detectedLang.getDetectedLanguage().getName();
    d.code = detectedLang.getDetectedLanguage().getShortCodeWithCountryAndVariant();
    d.confidence = new FloatNum(detectedLang.getDetectionConfidence());
    if (detectedLang.getDetectedLanguage().isSpellcheckOnlyLanguage()) d.spellCheckOnly = true;
    d.source = detectedLang.getDetectionSource();
    l.detectedLanguage = d;
    g.language = l;
  }

  // Java: RuleMatchesAsJsonSerializer#writeMatchesSection(String,JsonGenerator,List,AnnotatedText,ContextTools)
  writeMatchesSection(sectionName, g, res, text, contextTools) {
    const arr = [];
    g[sectionName] = arr;
    for (const r of res) {
      for (const match of r.getRuleMatches()) {
        const m = {};
        arr.push(m);
        m.message = this.cleanSuggestion(match.getMessage());
        if (match.getShortMessage() !== null && match.getShortMessage() !== undefined) {
          m.shortMessage = this.cleanSuggestion(match.getShortMessage());
        }
        this.writeReplacements(m, match);
        m.offset = match.getFromPos();
        m.length = match.getToPos() - match.getFromPos();
        this.writeContext(m, match, text, contextTools);
        m.type = { typeName: match.getType().toString() };
        this.writeRule(m, match);
        // 3 is a guess - key 'ignoreForIncompleteSentence' isn't official and can hopefully be removed in the future
        const contextEstimate = match.getRule().estimateContextForSureMatch();
        m.ignoreForIncompleteSentence = contextEstimate === -1 || contextEstimate > 3;
        m.contextForSureMatch = contextEstimate;
      }
    }
  }

  // Java: RuleMatchesAsJsonSerializer#writeIgnoreRanges(JsonGenerator,List)
  writeIgnoreRanges(g, res) {
    if (res.every((k) => k.getIgnoredRanges().length === 0)) return;
    const arr = [];
    for (const r of res) {
      for (const range of r.getIgnoredRanges()) {
        arr.push({ from: range.getFromPos(), to: range.getToPos(), language: { code: range.getLang() } });
      }
    }
    g.ignoreRanges = arr;
  }

  // Java: RuleMatchesAsJsonSerializer#writeSentenceRanges(JsonGenerator,List)
  writeSentenceRanges(g, res) {
    const arr = [];
    for (const r of res) {
      for (const range of r.getSentenceRanges()) arr.push([range.getFromPos(), range.getToPos()]);
    }
    g.sentenceRanges = arr;
  }

  // Java: RuleMatchesAsJsonSerializer#writeExtendedSentenceRanges(JsonGenerator,List)
  writeExtendedSentenceRanges(g, res) {
    const arr = [];
    for (const r of res) {
      for (const range of r.getExtendedSentenceRanges()) {
        const langs = [];
        for (const [language, rate] of range.getLanguageConfidenceRates()) {
          langs.push({ language, rate: new FloatNum(rate) });
        }
        arr.push({ from: range.getFromPos(), to: range.getToPos(), detectedLanguages: langs });
      }
    }
    g.extendedSentenceRanges = arr;
  }

  // Java: RuleMatchesAsJsonSerializer#cleanSuggestion(String)
  cleanSuggestion(s) {
    if (this.lang !== null && this.lang !== undefined) {
      return this.lang.toAdvancedTypography(s);
    }
    if (s === null || s === undefined) throw new NullPointerException('Cannot invoke "String.replace(java.lang.CharSequence, java.lang.CharSequence)" because "s" is null');
    return s.split(SUGGESTION).join('"').split(SUGGESTION_END).join('"');
  }

  // Java: RuleMatchesAsJsonSerializer#writeReplacements(JsonGenerator,RuleMatch)
  writeReplacements(g, match) {
    const arr = [];
    g.replacements = arr;
    let autoCorrect = match.isAutoCorrect();
    let i = 0;
    for (const replacement of match.getSuggestedReplacementObjects()) {
      i++;
      if (this.compactMode === 1 && i > 5) break; // these clients only show up to 5 suggestions anyway
      const o = {};
      arr.push(o);
      o.value = replacement.getReplacement();
      if (replacement.getShortDescription() !== null && replacement.getShortDescription() !== undefined) o.shortDescription = replacement.getShortDescription();
      if (replacement.getSuffix() !== null && replacement.getSuffix() !== undefined) o.suffix = replacement.getSuffix();
      if (replacement.getType() !== SuggestionType.Default) o.type = replacement.getType().name();
      if (autoCorrect) {
        o.autoCorrect = true;
        autoCorrect = false; // only for first replacement
      }
      if (replacement.getConfidence() !== null && replacement.getConfidence() !== undefined) o.confidence = new FloatNum(replacement.getConfidence());
    }
  }

  // Java: RuleMatchesAsJsonSerializer#writeContext(JsonGenerator,RuleMatch,AnnotatedText,ContextTools)
  writeContext(g, match, text, contextTools) {
    if (this.compactMode !== 1) {
      let context = contextTools.getContext(match.getFromPos(), match.getToPos(), text.getTextWithMarkup());
      const contextOffset = context.indexOf(START_MARKER);
      context = replaceOnce(context, START_MARKER, '');
      g.context = { text: context, offset: contextOffset, length: match.getToPos() - match.getFromPos() };
      if (match.getSentence() !== null && match.getSentence() !== undefined) {
        g.sentence = javaTrim(match.getSentence().getText());
      }
    }
  }

  // Java: RuleMatchesAsJsonSerializer#writeRule(JsonGenerator,RuleMatch)
  writeRule(g, match) {
    const o = {};
    g.rule = o;
    const rule = match.getRule();
    o.id = match.getSpecificRuleId();
    if (rule.getSubId() !== null && rule.getSubId() !== undefined) o.subId = rule.getSubId();
    if (rule.getSourceFile() !== null && rule.getSourceFile() !== undefined && this.compactMode !== 1) {
      o.sourceFile = ANYTHING_SLASH_PATTERN.matcher(rule.getSourceFile()).replaceFirst('');
    }
    o.description = rule.getDescription();
    o.issueType = rule.getLocQualityIssueType().toString();
    if (rule.isDefaultTempOff()) o.tempOff = true;
    const mUrl = match.getUrl();
    const rUrl = rule.getUrl();
    if ((mUrl !== null && mUrl !== undefined) || (rUrl !== null && rUrl !== undefined)) {
      const u = {};
      if (mUrl !== null && mUrl !== undefined) u.value = mUrl.toString();
      else if (rUrl !== null && rUrl !== undefined) u.value = rUrl.toString();
      o.urls = [u]; // currently only one, but keep it extensible
    }
    this.writeCategory(o, rule.getCategory());
    if (Premium.isPremiumVersion()) o.isPremium = Premium.get().isPremiumRule(rule);
    if (rule.getTags().length > 0) o.tags = rule.getTags().map((t) => t.name());
    if (this.confidenceMap !== null && this.confidenceMap !== undefined) {
      const key = new ConfidenceKey(this.lang, rule.getId());
      let confidence = null;
      for (const [k, v] of this.confidenceMap) {
        if (key.equals(k)) confidence = v;
      }
      if (confidence !== null) o.confidence = new FloatNum(confidence);
    }
  }

  // Java: RuleMatchesAsJsonSerializer#writeCategory(JsonGenerator,Category)
  writeCategory(g, category) {
    const catId = category.getId();
    g.category = { id: catId.toString(), name: category.getName() };
  }

  // Java: RuleMatchesAsJsonSerializer#setRuleIdToConfidenceMap(Map)
  setRuleIdToConfidenceMap(confidenceMap) {
    this.confidenceMap = confidenceMap;
  }
}
