// org.languagetool.rules.RuleMatch
import { JavaEnum } from '../../../lib/java/JavaEnum.js';
import { IllegalArgumentException, RuntimeException } from '../../../lib/java/errors.js';
import { Objects } from '../../../lib/java/Objects.js';
import { toUpperCase } from '../../../lib/java/strings.js';
import { MatchPosition } from '../../text/SmallTypes.js';
import { isMixedCase, uppercaseFirstChar, isAllWhitespace } from '../../text/StringTools.js';
import { SuggestedReplacement } from './SuggestedReplacement.js';

// Java: PatternRuleMatcher#MISTAKE
const MISTAKE = '<mistake/>';

// Java: RuleMatch.Type
export class Type extends JavaEnum {
  static FQCN = 'org.languagetool.rules.RuleMatch.Type';
}
Type.UnknownWord = new Type('UnknownWord', 0);
Type.Hint = new Type('Hint', 1);
Type.Other = new Type('Other', 2);

// Java: RuleMatch.PatternPosition / OffsetPosition / SentencePosition / LinePosition / ColumnPosition
class PatternPosition extends MatchPosition {}
class OffsetPosition extends MatchPosition {}
class SentencePosition extends MatchPosition {}
class LinePosition extends MatchPosition {}
class ColumnPosition extends MatchPosition {}

const EMPTY_FEATURES = Object.freeze(new Map()); // Java: Collections.emptySortedMap()

// Java: Suppliers#ofInstance(Object)
const ofInstance = (v) => () => v;

// Java: Suppliers#memoize(Supplier)
function memoize(fn) {
  let done = false;
  let value;
  return () => {
    if (!done) {
      value = fn();
      done = true;
    }
    return value;
  };
}

export class RuleMatch {
  static FQCN = 'org.languagetool.rules.RuleMatch';
  static EMPTY_ARRAY = Object.freeze([]);
  static SUGGESTION_START_TAG = '<suggestion>';
  static SUGGESTION_END_TAG = '</suggestion>';
  static Type = Type;
  // set by the PatternRule port: class used for `rule instanceof PatternRule` in toString()
  static patternRuleClass = null;

  // Java: all RuleMatch constructors, dispatched on argument count/types:
  // (Rule,int,int,String) (Rule,AnalyzedSentence,int,int,String) (Rule,AnalyzedSentence,int,int,String,String)
  // (Rule,AnalyzedSentence,int,int,int,int,String,String) (Rule,AnalyzedSentence,int,int,String,String,List)
  // (Rule,int,int,String,String,boolean,String) (Rule,AnalyzedSentence,int,int,int,int,String,String,boolean,String)
  // (Rule,AnalyzedSentence,int,int,int,int,String,String,boolean,boolean,String,boolean) (RuleMatch) (RuleMatch,List[,boolean])
  constructor(...a) {
    this.sentencePosition = new SentencePosition(-1, -1);
    this.linePosition = new LinePosition(-1, -1);
    this.columnPosition = new ColumnPosition(-1, -1);
    this.suggestionsComputed = true;
    this.url = null;
    this.type = Type.Other;
    this.features = EMPTY_FEATURES;
    this.autoCorrect = false;
    this.newLanguageMatches = new Map();
    this.specificRuleId = '';
    this.originalErrorStr = '';
    if (a[0] instanceof RuleMatch) {
      this.#initCopy(a[0]);
      if (a.length >= 2) this.setSuggestedReplacementObjects(a[1]);
      return;
    }
    const [rule] = a;
    switch (a.length) {
      case 4: this.#init(rule, null, a[1], a[2], a[1], a[2], a[3], null, false, false, null, false); break;
      case 5: this.#init(rule, a[1], a[2], a[3], a[2], a[3], a[4], null, false, false, null, false); break;
      case 6: this.#init(rule, a[1], a[2], a[3], a[2], a[3], a[4], a[5], false, false, null, false); break;
      case 7:
        if (typeof a[1] === 'number') {
          this.#init(rule, null, a[1], a[2], a[1], a[2], a[3], a[4], a[5], false, a[6], false);
        } else {
          this.#init(rule, a[1], a[2], a[3], a[2], a[3], a[4], a[5], false, false, null, false);
          this.setSuggestedReplacements(a[6]);
        }
        break;
      case 8: this.#init(rule, a[1], a[2], a[3], a[4], a[5], a[6], a[7], false, false, null, false); break;
      case 10: this.#init(rule, a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], false, a[9], false); break;
      case 12: this.#init(rule, ...a.slice(1)); break;
      default: throw new IllegalArgumentException(`no RuleMatch constructor with ${a.length} arguments`);
    }
  }

  // Java: RuleMatch#RuleMatch(Rule,AnalyzedSentence,int,int,int,int,String,String,boolean,boolean,String,boolean)
  #init(rule, sentence, fromPos, toPos, patternFromPos, patternToPos, message, shortMessage, startWithUppercase, isAllUppercase,
    suggestionsOutMsg, setOriginalErrorStr) {
    this.rule = Objects.requireNonNull(rule);
    if (toPos <= fromPos) {
      throw new IllegalArgumentException(`fromPos (${fromPos}) must be less than toPos (${toPos})`);
    }
    this.patternPosition = new PatternPosition(patternFromPos, patternToPos);
    this.offsetPosition = new OffsetPosition(fromPos, toPos);
    this.message = Objects.requireNonNull(message);
    this.shortMessage = shortMessage;
    this.sentence = sentence;
    if (setOriginalErrorStr) {
      this.setOriginalErrorStr();
    }
    const replacements = new Map(); // LinkedHashSet<SuggestedReplacement>, deduplicated by equals/hashCode (replacement + shortDescription null)
    const suggestion = message + (suggestionsOutMsg !== null && suggestionsOutMsg !== undefined ? suggestionsOutMsg : '');
    let pos = suggestion.indexOf(RuleMatch.SUGGESTION_START_TAG);
    while (pos !== -1) {
      const end = suggestion.indexOf(RuleMatch.SUGGESTION_END_TAG, pos);
      if (end === -1) {
        break;
      }
      let replacement = suggestion.substring(pos + RuleMatch.SUGGESTION_START_TAG.length, end);
      pos = end + RuleMatch.SUGGESTION_END_TAG.length;
      if (replacement.includes(MISTAKE)) {
        continue;
      }
      if (isAllUppercase && !(isMixedCase(replacement) && !replacement.includes(' '))) {
        if (this.getOriginalErrorStr() !== toUpperCase(replacement)) {
          replacement = toUpperCase(replacement);
        }
      } else if (startWithUppercase) {
        replacement = uppercaseFirstChar(replacement);
      }
      if (!replacements.has(replacement)) replacements.set(replacement, new SuggestedReplacement(replacement));
      pos = suggestion.indexOf(RuleMatch.SUGGESTION_START_TAG, pos);
    }
    this.suggestedReplacements = ofInstance([...replacements.values()]);
  }

  // Java: RuleMatch#RuleMatch(RuleMatch)
  #initCopy(clone) {
    this.rule = clone.getRule();
    this.sentence = clone.getSentence();
    this.setOffsetPosition(clone.getFromPos(), clone.getToPos());
    this.message = clone.getMessage();
    this.shortMessage = clone.getShortMessage();
    this.setPatternPosition(clone.getPatternFromPos(), clone.getPatternToPos());
    this.suggestedReplacements = clone.suggestedReplacements;
    this.setAutoCorrect(clone.isAutoCorrect());
    this.setFeatures(clone.getFeatures());
    this.setUrl(clone.getUrl());
    this.setType(clone.getType());
    this.setLine(clone.getLine());
    this.setEndLine(clone.getEndLine());
    this.setColumn(clone.getColumn());
    this.setEndColumn(clone.getEndColumn());
    this.setSpecificRuleId(clone.getSpecificRuleId());
    this.setOriginalErrorStr(clone.getOriginalErrorStr());
    this.setSentencePosition(clone.getFromPosSentence(), clone.getToPosSentence());
  }

  // Java: RuleMatch#getFeatures()
  getFeatures() {
    return this.features;
  }

  // Java: RuleMatch#setFeatures(SortedMap)
  setFeatures(features) {
    this.features = features;
  }

  // Java: RuleMatch#isAutoCorrect()
  isAutoCorrect() {
    return this.autoCorrect;
  }

  // Java: RuleMatch#setAutoCorrect(boolean)
  setAutoCorrect(autoCorrect) {
    this.autoCorrect = autoCorrect;
  }

  // Java: RuleMatch#getRule()
  getRule() {
    return this.rule;
  }

  // Java: RuleMatch#getLine()
  getLine() {
    return this.linePosition.getStart();
  }

  // Java: RuleMatch#setLine(int)
  setLine(fromLine) {
    this.linePosition = new LinePosition(fromLine, this.linePosition.getEnd());
  }

  // Java: RuleMatch#getEndLine()
  getEndLine() {
    return this.linePosition.getEnd();
  }

  // Java: RuleMatch#setEndLine(int)
  setEndLine(endLine) {
    this.linePosition = new LinePosition(this.linePosition.getStart(), endLine);
  }

  // Java: RuleMatch#getColumn()
  getColumn() {
    return this.columnPosition.getStart();
  }

  // Java: RuleMatch#setColumn(int)
  setColumn(column) {
    this.columnPosition = new ColumnPosition(column, this.columnPosition.getEnd());
  }

  // Java: RuleMatch#getEndColumn()
  getEndColumn() {
    return this.columnPosition.getEnd();
  }

  // Java: RuleMatch#setEndColumn(int)
  setEndColumn(endColumn) {
    this.columnPosition = new ColumnPosition(this.columnPosition.getStart(), endColumn);
  }

  // Java: RuleMatch#getPatternFromPos()
  getPatternFromPos() {
    return this.patternPosition.getStart();
  }

  // Java: RuleMatch#getPatternToPos()
  getPatternToPos() {
    return this.patternPosition.getEnd();
  }

  // Java: RuleMatch#setPatternPosition(int,int)
  setPatternPosition(fromPos, toPos) {
    if (toPos <= fromPos) {
      throw new RuntimeException(`fromPos (${fromPos}) must be less than toPos (${toPos})`);
    }
    this.patternPosition = new PatternPosition(fromPos, toPos);
  }

  // Java: RuleMatch#getFromPos()
  getFromPos() {
    return this.offsetPosition.getStart();
  }

  // Java: RuleMatch#getToPos()
  getToPos() {
    return this.offsetPosition.getEnd();
  }

  // Java: RuleMatch#getFromPosSentence()
  getFromPosSentence() {
    if (this.sentencePosition.getStart() > -1) {
      return this.sentencePosition.getStart();
    }
    return this.getFromPos();
  }

  // Java: RuleMatch#getToPosSentence()
  getToPosSentence() {
    if (this.sentencePosition.getEnd() > -1) {
      return this.sentencePosition.getEnd();
    }
    return this.getToPos();
  }

  // Java: RuleMatch#setOffsetPosition(int,int)
  setOffsetPosition(fromPos, toPos) {
    if (toPos <= fromPos) {
      throw new RuntimeException(`fromPos (${fromPos}) must be less than toPos (${toPos}) for match: <sentcontent>${this}</sentcontent>`);
    }
    this.offsetPosition = new OffsetPosition(fromPos, toPos);
  }

  // Java: RuleMatch#setSentencePosition(int,int)
  setSentencePosition(fromPos, toPos) {
    if (toPos > -1 && fromPos > -1 && toPos <= fromPos) {
      throw new RuntimeException(`fromPos (${fromPos}) must be less than toPos (${toPos}) for match: <sentcontent>${this}</sentcontent>`);
    }
    this.sentencePosition = new SentencePosition(fromPos, toPos);
  }

  // Java: RuleMatch#getMessage()
  getMessage() {
    return this.message;
  }

  // Java: RuleMatch#setMessage(String)
  setMessage(msg) {
    this.message = msg;
  }

  // Java: RuleMatch#getShortMessage()
  getShortMessage() {
    if (this.shortMessage === null || this.shortMessage === undefined) {
      return ''; // just because this is what we have documented
    }
    return this.shortMessage;
  }

  // Java: RuleMatch#setShortMessage(String)
  setShortMessage(msg) {
    this.shortMessage = msg;
  }

  // Java: RuleMatch#setSuggestedReplacement(String)
  setSuggestedReplacement(replacement) {
    Objects.requireNonNull(replacement, 'replacement may be empty but not null');
    this.setSuggestedReplacements([replacement]);
  }

  // Java: RuleMatch#addSuggestedReplacement(String)
  addSuggestedReplacement(replacement) {
    Objects.requireNonNull(replacement, 'replacement may be empty but not null');
    this.addSuggestedReplacements([replacement]);
  }

  // Java: RuleMatch#addSuggestedReplacements(List)
  addSuggestedReplacements(replacements) {
    Objects.requireNonNull(replacements, 'replacements may be empty but not null');
    const prev = this.suggestedReplacements;
    this.setLazySuggestedReplacements(() => [...prev(), ...replacements.map((r) => new SuggestedReplacement(r))]);
  }

  // Java: RuleMatch#getSuggestedReplacements()
  getSuggestedReplacements() {
    return this.suggestedReplacements().map((r) => r.getReplacement());
  }

  // Java: RuleMatch#getLazySuggestedReplacements()
  getLazySuggestedReplacements() {
    return this.suggestedReplacements;
  }

  // Java: RuleMatch#setSuggestedReplacements(List)
  setSuggestedReplacements(replacements) {
    Objects.requireNonNull(replacements, 'replacements may be empty but not null');
    this.suggestionsComputed = true;
    this.suggestedReplacements = ofInstance(replacements.map((r) => new SuggestedReplacement(r)));
  }

  // Java: RuleMatch#getSuggestedReplacementObjects()
  getSuggestedReplacementObjects() {
    return this.suggestedReplacements();
  }

  // Java: RuleMatch#setSuggestedReplacementObjects(List)
  setSuggestedReplacementObjects(replacements) {
    Objects.requireNonNull(replacements, 'replacements may be empty but not null');
    this.suggestedReplacements = ofInstance(replacements);
    this.suggestionsComputed = true;
  }

  // Java: RuleMatch#setLazySuggestedReplacements(Supplier)
  setLazySuggestedReplacements(replacements) {
    Objects.requireNonNull(replacements, 'replacements may not be null');
    this.suggestedReplacements = memoize(replacements);
    this.suggestionsComputed = false;
  }

  // Java: RuleMatch#computeLazySuggestedReplacements()
  computeLazySuggestedReplacements() {
    this.suggestedReplacements = ofInstance(this.suggestedReplacements());
    this.suggestionsComputed = true;
  }

  // Java: RuleMatch#discardLazySuggestedReplacements()
  discardLazySuggestedReplacements() {
    if (!this.suggestionsComputed) {
      this.setSuggestedReplacementObjects([]);
    }
  }

  // Java: RuleMatch#getUrl()
  getUrl() {
    return this.url;
  }

  // Java: RuleMatch#setUrl(URL)
  setUrl(url) {
    this.url = url;
  }

  // Java: RuleMatch#getSentence()
  getSentence() {
    return this.sentence;
  }

  // Java: RuleMatch#getType()
  getType() {
    return this.type;
  }

  // Java: RuleMatch#setType(Type)
  setType(type) {
    this.type = Objects.requireNonNull(type);
  }

  // Java: RuleMatch#toString()
  toString() {
    if (RuleMatch.patternRuleClass !== null && this.rule instanceof RuleMatch.patternRuleClass) {
      return `${this.rule.getFullId()}:${this.offsetPosition}:${this.message}`;
    }
    return `${this.rule.getId()}:${this.offsetPosition}:${this.message}`;
  }

  // Java: RuleMatch#compareTo(RuleMatch)
  compareTo(other) {
    Objects.requireNonNull(other);
    const a = this.getFromPos();
    const b = other.getFromPos();
    return a < b ? -1 : a === b ? 0 : 1;
  }

  // Java: RuleMatch#equals(Object)
  equals(o) {
    if (this === o) return true;
    if (o === null || o === undefined || this.constructor !== o.constructor) return false;
    return Objects.equals(this.rule.getId(), o.rule.getId())
      && Objects.equals(this.patternPosition, o.patternPosition)
      && Objects.equals(this.offsetPosition, o.offsetPosition)
      && Objects.equals(this.message, o.message)
      && Objects.equals(this.sentence, o.sentence)
      && Objects.equals(this.type, o.type);
  }

  // Java: RuleMatch#hashCode()
  hashCode() {
    return Objects.hash(this.rule.getId(), this.offsetPosition, this.patternPosition, this.message, this.sentence, this.type);
  }

  // Java: RuleMatch#getNewLanguageMatches()
  getNewLanguageMatches() {
    return this.newLanguageMatches;
  }

  // Java: RuleMatch#setNewLanguageMatches(Map)
  setNewLanguageMatches(newLanguageMatches) {
    this.newLanguageMatches = newLanguageMatches;
  }

  // Java: RuleMatch#setSpecificRuleId(String)
  setSpecificRuleId(ruleId) {
    this.specificRuleId = ruleId;
  }

  // Java: RuleMatch#getSpecificRuleId()
  getSpecificRuleId() {
    if (this.specificRuleId.length === 0) {
      return this.getRule().getId();
    }
    return this.specificRuleId;
  }

  // Java: RuleMatch#setOriginalErrorStr() / setOriginalErrorStr(String)
  setOriginalErrorStr(originalErrorStr) {
    if (originalErrorStr !== undefined) {
      this.originalErrorStr = originalErrorStr;
      return;
    }
    if (this.originalErrorStr.length !== 0) {
      return;
    }
    if (this.getSentence() === null || this.getSentence() === undefined) {
      return;
    }
    const sentenceStr = this.getSentence().getText();
    if (sentenceStr.length === 0) {
      return;
    }
    const fromPos = this.getFromPosSentence();
    const toPos = this.getToPosSentence();
    if (fromPos > -1 && toPos > -1 && toPos <= sentenceStr.length && fromPos < toPos) {
      this.originalErrorStr = sentenceStr.substring(fromPos, toPos);
    }
  }

  // Java: RuleMatch#getOriginalErrorStr()
  getOriginalErrorStr() {
    return this.originalErrorStr;
  }

  // Java: RuleMatch#trimMatchEnds()
  trimMatchEnds() {
    let replacements = [...this.getSuggestedReplacementObjects()];
    if (replacements.length === 0) {
      return this;
    }
    let errorStr = this.getOriginalErrorStr();
    if (errorStr.length === 0) {
      this.setOriginalErrorStr();
      errorStr = this.getOriginalErrorStr();
    }
    if (errorStr.length === 0) {
      return this;
    }
    if (isAllWhitespace(errorStr)) {
      return this;
    }
    let fromPos = this.getFromPos();
    let toPos = this.getToPos();
    let fromPosSentence = this.getFromPosSentence();
    let toPosSentence = this.getToPosSentence();
    let changed = true;
    while (changed) {
      changed = false;
      const lastSpaceIdx = errorStr.lastIndexOf(' ');
      if (lastSpaceIdx > 0) {
        const lastToken = errorStr.substring(lastSpaceIdx + 1);
        const endSuffix = ` ${lastToken}`;
        const allEndWith = replacements.every((r) => r.getReplacement().endsWith(endSuffix));
        if (allEndWith) {
          const errorTrimLen = errorStr.length - lastSpaceIdx;
          const trimmed = [];
          for (const r of replacements) {
            const newR = new SuggestedReplacement(r);
            newR.setReplacement(r.getReplacement().substring(0, r.getReplacement().length - endSuffix.length));
            trimmed.push(newR);
          }
          replacements = trimmed;
          toPos -= errorTrimLen;
          if (toPosSentence >= 0) {
            toPosSentence -= errorTrimLen;
          }
          errorStr = errorStr.substring(0, lastSpaceIdx);
          changed = true;
        }
      }
      const firstSpaceIdx = errorStr.indexOf(' ');
      if (firstSpaceIdx > 0) {
        const firstToken = errorStr.substring(0, firstSpaceIdx);
        const startPrefix = `${firstToken} `;
        const allStartWith = replacements.every((r) => r.getReplacement().startsWith(startPrefix));
        if (allStartWith) {
          const errorTrimLen = firstSpaceIdx + 1;
          const trimmed = [];
          for (const r of replacements) {
            const newR = new SuggestedReplacement(r);
            newR.setReplacement(r.getReplacement().substring(startPrefix.length));
            trimmed.push(newR);
          }
          replacements = trimmed;
          fromPos += errorTrimLen;
          if (fromPosSentence >= 0) {
            fromPosSentence += errorTrimLen;
          }
          errorStr = errorStr.substring(errorTrimLen);
          changed = true;
        }
      }
    }
    if (fromPos === this.getFromPos() && toPos === this.getToPos()) {
      return this;
    }
    const newMatch = new RuleMatch(this, replacements);
    newMatch.setOffsetPosition(fromPos, toPos);
    newMatch.setSentencePosition(fromPosSentence, toPosSentence);
    newMatch.setOriginalErrorStr(errorStr);
    return newMatch;
  }

  // Java: RuleMatch#getStartEndTokenIndices()
  #getStartEndTokenIndices() {
    const fromChar = this.getFromPosSentence();
    const toChar = this.getToPosSentence();
    const tokens = this.sentence.getTokens();
    let fromToken = -1;
    let toToken = -1;
    for (let i = 0; i < tokens.length; i++) {
      const tokenStart = tokens[i].getStartPos();
      const tokenEnd = tokenStart + tokens[i].getToken().length;
      if (fromToken === -1 && tokenEnd > fromChar) {
        fromToken = i;
      }
      if (tokenStart < toChar) {
        toToken = i;
      } else {
        break;
      }
    }
    if (fromToken === -1 || toToken === -1) {
      throw new IllegalArgumentException(`No tokens found for sentencePosition [${fromChar}, ${toChar}]`);
    }
    return [fromToken, toToken];
  }

  // Java: RuleMatch#isUnderlinedErrorSingleToken()
  isUnderlinedErrorSingleToken() {
    const indices = this.#getStartEndTokenIndices();
    if (indices !== null && indices.length === 2) {
      return indices[0] === indices[1];
    }
    return false;
  }
}
