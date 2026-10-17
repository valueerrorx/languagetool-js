// org.languagetool.rules.patterns.PatternRule (a rule described by a pattern of tokens)
import { Objects } from '../../lib/java/Objects.js';
import { RuleMatch } from '../rules/model/RuleMatch.js';
import { SENTENCE_END_TAGNAME } from '../JLanguageToolConstants.js';
import { isEmpty } from '../text/StringTools.js';
import { AbstractTokenBasedRule } from './AbstractTokenBasedRule.js';
import { PatternRuleId } from './PatternRuleId.js';
import { PatternRuleMatcher } from './PatternRuleMatcher.js';
import { PatternRuleXmlCreator } from './PatternRuleXmlCreator.js';

// Java: PatternRule
export class PatternRule extends AbstractTokenBasedRule {
  static FQCN = 'org.languagetool.rules.patterns.PatternRule';

  // Java: PatternRule(String,Language,List,String,String,String[,String[,boolean[,boolean]]])
  constructor(id, language, patternTokens, description, message, shortMessage, suggestionsOutMsg = '', isMember = false, interpretPosTagsPreDisambiguation = false) {
    super(id, description, language, patternTokens, false);
    this.message = Objects.requireNonNull(message);
    this.shortMessage = Objects.requireNonNull(shortMessage);
    // A list of elements as they appear in XML file (phrases count as single tokens in case of matches or skipping).
    this.elementNo = [];
    Objects.requireNonNull(suggestionsOutMsg);
    this.suggestionsOutMsg = suggestionsOutMsg.length === 0 ? '' : suggestionsOutMsg;
    let prevName = '';
    let curName;
    let cnt = 0;
    let loopCnt = 0;
    let tempUseList = false;

    for (const pToken of patternTokens) {
      if (pToken.isPartOfPhrase()) {
        curName = pToken.getPhraseName();
        if (isEmpty(prevName) || prevName === curName) {
          cnt++;
          tempUseList = true;
        } else {
          this.elementNo.push(cnt);
          curName = '';
          cnt = 0;
        }
        prevName = curName;
        loopCnt++;
        if (loopCnt === this.patternTokens.length && !isEmpty(prevName)) {
          this.elementNo.push(cnt);
        }
      } else {
        if (cnt > 0) {
          this.elementNo.push(cnt);
        }
        this.elementNo.push(1);
        loopCnt++;
      }
    }
    // This property is used for short-circuiting evaluation of the elementNo list order:
    this.useList = tempUseList;
    // Marks whether the rule is a member of a disjunctive set (in case of OR operation on phraserefs).
    this.isMemberOfDisjunctiveSet = isMember;
    this.interpretPosTagsPreDisambiguation = interpretPosTagsPreDisambiguation;
  }

  // Java: PatternRule#estimateContextForSureMatch()
  estimateContextForSureMatch() {
    let extendAfterMarker = 0;
    let markerSeen = false;
    for (const pToken of this.patternTokens) {
      if (markerSeen && !pToken.isInsideMarker()) {
        extendAfterMarker++;
      }
      if (SENTENCE_END_TAGNAME === pToken.getPOStag()) {
        // e.g. for DT_JJ_NO_NOUN and all rules that match the sentence end
        extendAfterMarker++;
      }
      if (pToken.isInsideMarker()) {
        markerSeen = true;
      }
      if (pToken.getSkipNext() === -1) {
        return -1;
      }
      extendAfterMarker += pToken.getSkipNext();
    }
    const antiPatternLengths = this.getAntiPatterns().map((p) => p.patternTokens.length);
    const longestAntiPattern = antiPatternLengths.length === 0 ? 0 : antiPatternLengths.reduce((a, b) => (b > a ? b : a));
    let longestSkip = 0;
    for (const antiPattern of this.getAntiPatterns()) {
      for (const token of antiPattern.getPatternTokens()) {
        if (token.getSkipNext() === -1) {
          return -1;
        } else if (token.getSkipNext() > longestSkip) {
          longestSkip = token.getSkipNext();
        }
      }
    }
    return extendAfterMarker + Math.max(longestAntiPattern, longestAntiPattern + longestSkip);
  }

  // Java: PatternRule#isInterpretPosTagsPreDisambiguation()
  isInterpretPosTagsPreDisambiguation() {
    return this.interpretPosTagsPreDisambiguation;
  }

  // Java: PatternRule#isWithComplexPhrase()
  isWithComplexPhrase() {
    return this.isMemberOfDisjunctiveSet;
  }

  // Java: PatternRule#notComplexPhrase()
  notComplexPhrase() {
    this.isMemberOfDisjunctiveSet = false;
  }

  // Java: PatternRule#toPatternString()
  toPatternString() {
    const strList = [];
    for (const patternPatternToken of this.patternTokens) {
      strList.push(patternPatternToken.toString());
    }
    return strList.join(', ');
  }

  // Java: PatternRule#toXML()
  toXML() {
    return new PatternRuleXmlCreator().toXML(new PatternRuleId(this.getId(), this.getSubId()), this.getLanguage());
  }

  // Java: PatternRule#match(AnalyzedSentence)
  match(sentence) {
    if (this.canBeIgnoredFor(sentence)) return RuleMatch.EMPTY_ARRAY;

    const matcher = new PatternRuleMatcher(this, this.useList);
    return this.checkForAntiPatterns(sentence, matcher, matcher.match(sentence));
  }

  // Java: PatternRule#checkForAntiPatterns(AnalyzedSentence,RuleMatcher,RuleMatch[])
  checkForAntiPatterns(sentence, matcher, matches) {
    if (matches !== null && matches.length > 0 && this.getAntiPatterns().length !== 0) {
      const immunized = this.getSentenceWithImmunization(sentence);
      if (immunized.getTokens().some((t) => t.isImmunized())) {
        return matcher.match(immunized);
      }
    }
    return matches;
  }

  // Java: PatternRule#getElementNo()
  getElementNo() {
    return this.elementNo;
  }

  // Java: PatternRule#getShortMessage()
  getShortMessage() {
    return this.shortMessage;
  }
}

RuleMatch.patternRuleClass = PatternRule;
