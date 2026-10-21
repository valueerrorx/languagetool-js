// org.languagetool.rules.patterns.RegexPatternRule (matches 'regexp' elements from XML rules against sentences)
import { checkInterrupted } from '../tools/InterruptibleCharSequence.js';
import { Pattern } from '../../lib/java/regex/index.js';
import { Exception, IndexOutOfBoundsException, RuntimeException } from '../../lib/java/errors.js';
import { listGet } from '../../lib/java/arrays.js';
import { Integer } from '../../lib/java/int.js';
import { Character } from '../../lib/java/Character.js';
import { StringBuilder, charAt, javaSplit, substring } from '../../lib/java/strings.js';
import { RuleMatch } from '../rules/model/RuleMatch.js';
import { AbstractPatternRule } from './AbstractPatternRule.js';
import { StringMatcher } from './StringMatcher.js';
import { convertCase } from './CaseConversionHelper.js';
import { RegexRuleFilterEvaluator } from './RegexRuleFilterEvaluator.js';

const suggestionPattern = Pattern.compile('<suggestion>(.*?)</suggestion>'); // TODO in Java: this needs to be cleaned up
const matchPattern = Pattern.compile('\\\\\\d');

// in suggestions tokens are numbered from 1, anywhere else tokens are numbered from 0.
const MATCHES_IN_SUGGESTIONS_NUMBERED_FROM = 0;

// Java: RegexPatternRule
export class RegexPatternRule extends AbstractPatternRule {
  static FQCN = 'org.languagetool.rules.patterns.RegexPatternRule';
  static MAX_SENT_LENGTH = 2000;

  // Java: RegexPatternRule(String,String,String,String,String,Language,Pattern,int)
  constructor(id, description, message, shortMessage, suggestionsOutMsg, language, regex, regexpMark) {
    super(id, description, language);
    this.message = message;
    this.pattern = regex;
    this.requiredSubstrings = StringMatcher.getRequiredSubstrings(regex.toString());
    this.caseSensitive = (regex.flags() & Pattern.CASE_INSENSITIVE) === 0;
    this.shortMessage = shortMessage === null || shortMessage === undefined ? '' : shortMessage;
    this.suggestionsOutMsg = suggestionsOutMsg.length === 0 ? '' : suggestionsOutMsg;
    this.markGroup = regexpMark;
    this.regexFilter = null;
  }

  // Java: RegexPatternRule#getPattern()
  getPattern() {
    return this.pattern;
  }

  // Java: RegexPatternRule#setRegexFilter(RegexRuleFilter) (package-private)
  setRegexFilter(filter) {
    this.regexFilter = filter;
  }

  // Java: RegexPatternRule#match(AnalyzedSentence)
  match(sentenceObj) {
    const text = sentenceObj.getText();
    const startPos = this.requiredSubstrings === null ? 0 : this.requiredSubstrings.find(text, this.caseSensitive);
    if (startPos < 0) return RuleMatch.EMPTY_ARRAY;
    return this.doMatch(sentenceObj, text, this.requiredSubstrings !== null && !this.requiredSubstrings.mustStart ? 0 : startPos);
  }

  // Java: RegexPatternRule#doMatch(AnalyzedSentence,String,int)
  doMatch(sentenceObj, text, startPos) {
    const suggestionsInMessage = this.getClausePositionsInMessage(suggestionPattern, this.message);
    const backReferencesInMessage = this.getClausePositionsInMessage(matchPattern, this.message);

    const suggestionsInSuggestionsOutMsg = this.getClausePositionsInMessage(suggestionPattern, this.suggestionsOutMsg);
    const backReferencesInSuggestionsOutMsg = this.getClausePositionsInMessage(matchPattern, this.suggestionsOutMsg);

    const matches = [];
    if (text.length > RegexPatternRule.MAX_SENT_LENGTH) {
      return matches;
    }
    const patternMatcher = this.pattern.matcher(text);

    while ((checkInterrupted(text), patternMatcher.find(startPos))) {
      try {
        const markStart = patternMatcher.start(this.markGroup);
        const markEnd = patternMatcher.end(this.markGroup);

        const processedMessage = this.processMessage(patternMatcher, this.message, backReferencesInMessage, suggestionsInMessage, this.getSuggestionMatches());
        const processedSuggestionsOutMsg = this.processMessage(patternMatcher, this.suggestionsOutMsg, backReferencesInSuggestionsOutMsg,
          suggestionsInSuggestionsOutMsg, this.getSuggestionMatchesOutMsg());

        const startsWithUpperCase = patternMatcher.start() === 0 && Character.isUpperCase(charAt(text, patternMatcher.start()));
        const ruleMatch = new RuleMatch(this, sentenceObj, markStart, markEnd, patternMatcher.start(), patternMatcher.end(),
          processedMessage, this.shortMessage, startsWithUpperCase, false, processedSuggestionsOutMsg, true);
        if (this.regexFilter !== null) {
          const ruleFilterEvaluator = new RegexRuleFilterEvaluator(this.regexFilter);
          const filteredMatch = ruleFilterEvaluator.runFilter(this.getFilterArguments(), ruleMatch, sentenceObj, patternMatcher);
          if (filteredMatch !== null) {
            matches.push(ruleMatch);
          }
        } else {
          matches.push(ruleMatch);
        }

        startPos = patternMatcher.end();
      } catch (e) {
        if (e.notPorted === true || !(e instanceof Exception)) throw e; // Java: catch (Exception) does not catch Errors
        if (e instanceof IndexOutOfBoundsException) {
          throw new RuntimeException(`Unexpected reference to capturing group in rule with id ${this.getFullId()}.`, e);
        }
        throw new RuntimeException(`Unexpected exception when processing regexp in rule with id ${this.getFullId()}.`, e);
      }
    }
    return matches;
  }

  // Java: RegexPatternRule#getClausePositionsInMessage(Pattern,String)
  getClausePositionsInMessage(pattern, message) {
    const matcher = pattern.matcher(message);
    const clausePositionsInMessage = [];
    while (matcher.find()) {
      clausePositionsInMessage.push([matcher.start(), matcher.end()]);
    }
    return clausePositionsInMessage;
  }

  // Java: RegexPatternRule#processMessage(Matcher,String,List,List,List)
  processMessage(matcher, message, backReferences, suggestions, matches) {
    let closestSuggestionPosition = -1;
    let allSuggestionsPassed = suggestions.length === 0;
    if (suggestions.length !== 0) {
      closestSuggestionPosition = 0;
    }

    let insideSuggestion;
    const processedMessage = new StringBuilder();
    let startOfProcessingPart = 0;
    for (let i = 0; i < backReferences.length; i++) {
      const reference = backReferences[i];

      while (!allSuggestionsPassed && (reference[0] > suggestions[closestSuggestionPosition][1])) {
        closestSuggestionPosition += 1;
        if (closestSuggestionPosition === suggestions.length) {
          allSuggestionsPassed = true;
        }
      }

      insideSuggestion = !allSuggestionsPassed && reference[0] >= suggestions[closestSuggestionPosition][0];

      const inXMLMatchReferenceNo = Integer.parseInt(javaSplit(substring(message, reference[0], reference[1]), '\\\\')[1]);
      const actualMatchReferenceNo = inXMLMatchReferenceNo - (insideSuggestion ? MATCHES_IN_SUGGESTIONS_NUMBERED_FROM : 0);

      let matchReferenceStringValue = matcher.group(actualMatchReferenceNo);
      if (matchReferenceStringValue === null) {
        matchReferenceStringValue = '';
      }

      const currentProcessingMatch = listGet(matches, i);
      const regexReplace = currentProcessingMatch.getRegexReplace();
      let suggestion;
      if (regexReplace !== null && regexReplace !== undefined) {
        suggestion = currentProcessingMatch.getRegexMatch().matcher(matchReferenceStringValue).replaceFirst(regexReplace);
        suggestion = convertCase(currentProcessingMatch.getCaseConversionType(), suggestion, matchReferenceStringValue, this.getLanguage());
      } else {
        suggestion = matchReferenceStringValue;
      }
      processedMessage.append(substring(message, startOfProcessingPart, reference[0])).append(suggestion);

      startOfProcessingPart = reference[1];
    }
    processedMessage.append(substring(message, startOfProcessingPart));

    return processedMessage.toString();
  }

  // Java: RegexPatternRule#estimateContextForSureMatch()
  estimateContextForSureMatch() {
    return -1;
  }

  // Java: RegexPatternRule#toString()
  toString() {
    return `${this.pattern}/flags:${this.pattern.flags()}`;
  }

  // Java: RegexPatternRule#getShortMessage()
  getShortMessage() {
    return this.shortMessage;
  }
}
