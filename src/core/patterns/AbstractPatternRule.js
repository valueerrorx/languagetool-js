// org.languagetool.rules.patterns.AbstractPatternRule (base of PatternRule, RegexPatternRule, DisambiguationPatternRule)
import { unmodifiableList, emptyList } from '../../lib/java/collections/Collections.js';
import { Objects } from '../../lib/java/Objects.js';
import { Rule } from '../rules/model/Rule.js';
import { RuleMatch } from '../rules/model/RuleMatch.js';
import { ITSIssueType } from '../rules/model/ITSIssueType.js';
import { PatternRuleId } from './PatternRuleId.js';

// Java: List#toString() of a list of objects
function listToString(list) {
  return list === null || list === undefined ? 'null' : `[${list.map((e) => (e === null || e === undefined ? 'null' : e.toString())).join(', ')}]`;
}

// Java: AbstractPatternRule
export class AbstractPatternRule extends Rule {
  static FQCN = 'org.languagetool.rules.patterns.AbstractPatternRule';

  // Java: AbstractPatternRule(String,String,Language) [protected] / (String,String,Language,List,boolean,String) / (String,String,Language,List,boolean)
  constructor(id, description, language, patternTokens = null, getUnified = false, message = undefined) {
    super();
    this.suggestionMatches = null;
    this.adjustSuggestionCase = true;
    this.suggestionMatchesOutMsg = null;
    this.antiPatterns = null;
    this.subId = null; // because there can be more than one rule in a rule group
    this.startPositionCorrection = 0;
    this.endPositionCorrection = 0;
    this.suggestionsOutMsg = null; // extra suggestions outside message
    this.filter = null;
    this.filterArgs = null;
    this.message = null;
    this.sourceFile = null;
    this.type = null; // allow setting custom match types without relying on IssueType
    this.lineNumber = -1;

    this.id = Objects.requireNonNull(id, 'id cannot be null');
    this.description = Objects.requireNonNull(description, `description ('name' in XML) cannot be null ruleID: ${id}`);
    this.language = Objects.requireNonNull(language, 'language cannot be null');
    this.getUnified = getUnified;
    if (patternTokens !== null && patternTokens !== undefined) {
      this.patternTokens = patternTokens.slice();
      this.testUnification = this.initUnifier();
      this.sentStart = this.patternTokens.length > 0 && this.patternTokens[0].isSentenceStart();
      if (!this.testUnification) {
        let found = false;
        for (const elem of this.patternTokens) {
          if (elem.hasAndGroup()) {
            found = true;
            break;
          }
        }
        this.groupsOrUnification = found;
      } else {
        this.groupsOrUnification = true;
      }
    } else {
      this.patternTokens = null;
      this.groupsOrUnification = false;
      this.sentStart = false;
      this.testUnification = false;
    }
    if (message !== undefined) {
      this.message = message;
    }
  }

  // Java: AbstractPatternRule#supportsLanguage(Language)
  supportsLanguage(language) {
    return language.equalsConsiderVariantsIfSpecified(this.language);
  }

  // Java: AbstractPatternRule#initUnifier()
  initUnifier() {
    for (const pToken of this.patternTokens) {
      if (pToken.isUnified()) {
        return true;
      }
    }
    return false;
  }

  // Java: AbstractPatternRule#toString()
  toString() {
    return `${this.id}[${this.subId}]${this.sourceFile !== null ? '@' + this.sourceFile : ''}:${listToString(this.patternTokens)}:${this.description}`;
  }

  // Java: AbstractPatternRule#getDescription()
  getDescription() {
    return this.description;
  }

  // Java: AbstractPatternRule#getSourceFile()
  getSourceFile() {
    return this.sourceFile;
  }

  // Java: AbstractPatternRule#setSourceFile(String) (package-private)
  setSourceFile(sourceFile) {
    this.sourceFile = sourceFile;
  }

  // Java: AbstractPatternRule#getId()
  getId() {
    return this.id;
  }

  // Java: AbstractPatternRule#match(AnalyzedSentence)
  match() {
    return null;
  }

  // Java: AbstractPatternRule#getLanguage()
  getLanguage() {
    return this.language;
  }

  // Java: AbstractPatternRule#setStartPositionCorrection(int)
  setStartPositionCorrection(startPositionCorrection) {
    this.startPositionCorrection = startPositionCorrection;
  }

  // Java: AbstractPatternRule#getStartPositionCorrection()
  getStartPositionCorrection() {
    return this.startPositionCorrection;
  }

  // Java: AbstractPatternRule#setEndPositionCorrection(int)
  setEndPositionCorrection(endPositionCorrection) {
    this.endPositionCorrection = endPositionCorrection;
  }

  // Java: AbstractPatternRule#getEndPositionCorrection()
  getEndPositionCorrection() {
    return this.endPositionCorrection;
  }

  // Java: AbstractPatternRule#getFullId()
  getFullId() {
    if (this.subId !== null) {
      return `${this.id}[${this.subId}]`;
    }
    return this.id;
  }

  // Java: AbstractPatternRule#getPatternRuleId()
  getPatternRuleId() {
    if (this.subId !== null) {
      return new PatternRuleId(this.id, this.subId);
    }
    return new PatternRuleId(this.id);
  }

  // Java: AbstractPatternRule#getSubId()
  getSubId() {
    return this.subId;
  }

  // Java: AbstractPatternRule#setSubId(String)
  setSubId(subId) {
    this.subId = subId;
  }

  // Java: AbstractPatternRule#isGroupsOrUnification()
  isGroupsOrUnification() {
    return this.groupsOrUnification;
  }

  // Java: AbstractPatternRule#isGetUnified()
  isGetUnified() {
    return this.getUnified;
  }

  // Java: AbstractPatternRule#isSentStart()
  isSentStart() {
    return this.sentStart;
  }

  // Java: AbstractPatternRule#isTestUnification()
  isTestUnification() {
    return this.testUnification;
  }

  // Java: AbstractPatternRule#getPatternTokens()
  getPatternTokens() {
    return this.patternTokens;
  }

  // Java: AbstractPatternRule#addSuggestionMatch(Match)
  addSuggestionMatch(m) {
    if (this.suggestionMatches === null) {
      this.suggestionMatches = [];
    }
    this.suggestionMatches.push(m);
  }

  // Java: AbstractPatternRule#addSuggestionMatchOutMsg(Match)
  addSuggestionMatchOutMsg(m) {
    if (this.suggestionMatchesOutMsg === null) {
      this.suggestionMatchesOutMsg = [];
    }
    this.suggestionMatchesOutMsg.push(m);
  }

  // Java: AbstractPatternRule#getSuggestionMatches()
  getSuggestionMatches() {
    return this.suggestionMatches === null ? [] : this.suggestionMatches;
  }

  // Java: AbstractPatternRule#getSuggestionMatchesOutMsg() (package-private)
  getSuggestionMatchesOutMsg() {
    return this.suggestionMatchesOutMsg === null ? [] : this.suggestionMatchesOutMsg;
  }

  // Java: AbstractPatternRule#getSuggestionsOutMsg()
  getSuggestionsOutMsg() {
    return this.suggestionsOutMsg;
  }

  // Java: AbstractPatternRule#getMessage()
  getMessage() {
    return this.message;
  }

  // Java: AbstractPatternRule#setMessage(String)
  setMessage(message) {
    this.message = message;
  }

  // Java: AbstractPatternRule#setFilter(RuleFilter)
  setFilter(filter) {
    this.filter = filter;
  }

  // Java: AbstractPatternRule#getFilter()
  getFilter() {
    return this.filter;
  }

  // Java: AbstractPatternRule#setFilterArguments(String)
  setFilterArguments(filterArgs) {
    this.filterArgs = filterArgs;
  }

  // Java: AbstractPatternRule#getFilterArguments()
  getFilterArguments() {
    return this.filterArgs;
  }

  // Java: AbstractPatternRule#setAntiPatterns(List)
  setAntiPatterns(antiPatterns) {
    if (this.antiPatterns === null) {
      this.antiPatterns = [];
    }
    this.antiPatterns.push(...antiPatterns);
  }

  // Java: AbstractPatternRule#getAntiPatterns()
  getAntiPatterns() {
    return this.antiPatterns === null ? emptyList() : unmodifiableList(this.antiPatterns);
  }

  // Java: AbstractPatternRule#getShortMessage() (package-private)
  getShortMessage() {
    return '';
  }

  // Java: AbstractPatternRule#getType()
  getType() {
    if (this.type === null) {
      const issueType = this.getLocQualityIssueType();
      if (issueType === ITSIssueType.Style || issueType === ITSIssueType.LocaleViolation || issueType === ITSIssueType.Register) {
        // interpret the issue type - this is what the clients have done so far before there was RuleMatch.Type
        return RuleMatch.Type.Hint;
      }
      // default type as defined in RuleMatch
      return RuleMatch.Type.Other;
    }
    return this.type;
  }

  // Java: AbstractPatternRule#setType(RuleMatch.Type)
  setType(type) {
    this.type = type;
  }

  // Java: AbstractPatternRule#isAdjustSuggestionCase()
  isAdjustSuggestionCase() {
    return this.adjustSuggestionCase;
  }

  // Java: AbstractPatternRule#setAdjustSuggestionCase(boolean)
  setAdjustSuggestionCase(adjustSuggestionCase) {
    this.adjustSuggestionCase = adjustSuggestionCase;
  }

  // Java: AbstractPatternRule#setXmlLineNumber(int)
  setXmlLineNumber(lineNumber) {
    this.lineNumber = lineNumber;
  }

  // Java: AbstractPatternRule#getXmlLineNumber()
  getXmlLineNumber() {
    return this.lineNumber;
  }
}
