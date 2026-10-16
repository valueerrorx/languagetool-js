// org.languagetool.rules.patterns.PatternToken (the 'token' element of grammar.xml)
import { IllegalArgumentException, IllegalStateException } from '../../lib/java/errors.js';
import { Objects, valueOf } from '../../lib/java/Objects.js';
import { JavaHashSet } from '../../lib/java/collections/JavaHashSet.js';
import { unmodifiableList, unmodifiableSet, emptyList, asList } from '../../lib/java/collections/Collections.js';
import { isEmpty, trimWhitespace } from '../text/StringTools.js';
import { SENTENCE_START_TAGNAME } from '../JLanguageToolConstants.js';
import { AnalyzedTokenReadings } from '../AnalyzedTokenReadings.js';
import { StringMatcher } from './StringMatcher.js';
import { javaReplace } from '../../lib/java/strings.js';

const INFLECTED_MASK = 1;
const NEGATION_MASK = 2;
const TEST_WHITESPACE_MASK = 4;
const WHITESPACE_BEFORE_MASK = 8;
const INSIDE_MARKER_MASK = 0x10;
/** True if scope=="next". */
const EXCEPTION_VALID_NEXT_MASK = 0x20;
const MAY_BE_OMITTED_MASK = 0x40;
/** Determines if calling setStringElement makes sense. */
const TEST_STRING_MASK = 0x80;
/** Determines whether the element should be ignored when doing unification. */
const UNIFICATION_NEUTRAL_MASK = 0x100;
const UNI_NEGATION_MASK = 0x200;
/** Set to true on tokens that close the unification block. */
const LAST_UNIFIED_MASK = 0x400;

const BYTE_MAX = 127;
const UNKNOWN_TAG = 'UNKNOWN';

// Java: PatternToken.PosToken
export class PosToken {
  // Java: PosToken(String,boolean,boolean) -> this(posTag, negation, regExp ? StringMatcher.regexp(posTag) : null)
  constructor(posTag, regExp, negation) {
    PosToken.init(this, posTag, negation, regExp ? StringMatcher.regexp(posTag) : null);
  }

  // Java: PosToken(String,boolean,StringMatcher) (package-private)
  static withMatcher(posTag, negation, matcher) {
    const t = Object.create(PosToken.prototype);
    PosToken.init(t, posTag, negation, matcher);
    return t;
  }

  // Java: PosToken(String,boolean,StringMatcher) body
  static init(t, posTag, negation, matcher) {
    t.posTag = posTag;
    t.negation = negation;
    t.posPattern = matcher;
    t.posUnknown = t.posPattern !== null ? t.posPattern.matches(UNKNOWN_TAG) : UNKNOWN_TAG === posTag;
  }

  // Java: PosToken#toString()
  toString() {
    return this.posTag;
  }
}

// Java: PatternToken.RareFields
class RareFields {
  constructor() {
    /** exceptions valid for the current token and / or some next tokens */
    this.currentAndNextExceptions = [];
    /** exceptions valid for a previous token */
    this.previousExceptions = [];
    this.unificationFeatures = null;
    /** String ID of the phrase the element is in */
    this.phraseName = null;
    this.andGroupList = null;
    this.orGroupList = null;
    /** the reference to another element in the pattern */
    this.tokenReference = null;
    this.chunkTag = null;
  }

  // Java: RareFields#addException(PatternToken,boolean)
  addException(pToken, scopePrevious) {
    if (scopePrevious) {
      this.previousExceptions = this.previousExceptions.concat([pToken]);
    } else {
      this.currentAndNextExceptions = this.currentAndNextExceptions.concat([pToken]);
    }
  }
}

// Java: PatternToken
export class PatternToken {
  static FQCN = 'org.languagetool.rules.patterns.PatternToken';
  /** Matches only tokens without any POS tag. */
  static UNKNOWN_TAG = UNKNOWN_TAG;
  static PosToken = PosToken;

  // Java: PatternToken(String,boolean,boolean,boolean) / package-private PatternToken(boolean,StringMatcher) (2 arguments)
  constructor(...args) {
    let inflected;
    let textMatcher;
    if (args.length === 2) {
      [inflected, textMatcher] = args;
    } else {
      const [token, caseSensitive, regExp] = args;
      inflected = args[3];
      textMatcher = StringMatcher.create(PatternToken.normalizeTextPattern(token), regExp, caseSensitive);
    }
    this.flags = INSIDE_MARKER_MASK | (inflected ? INFLECTED_MASK : 0);
    this.textMatcher = null;
    this.posToken = null;
    this.rareFields = null;
    this.skip = 0;
    this.maxOccurrence = 1;
    this.setTextMatcher(textMatcher);
  }

  // Java: PatternToken#clone() (shallow copy, rareFields shared)
  clone() {
    return Object.assign(Object.create(Object.getPrototypeOf(this)), this);
  }

  // Java: PatternToken#isMatched(AnalyzedToken)
  isMatched(token) {
    if (this.hasFlag(TEST_WHITESPACE_MASK) && !this.isWhitespaceBefore(token)) {
      return false;
    }
    const posNegation = this.posToken !== null && this.posToken.negation;
    if (this.hasFlag(TEST_STRING_MASK)) {
      return (this.textMatcher.matches(this.getTestToken(token)) !== this.getNegation())
        && (this.isPosTokenMatched(token) !== posNegation);
    }
    return !this.getNegation() && (this.isPosTokenMatched(token) !== posNegation);
  }

  // Java: PatternToken#hasFlag(int)
  hasFlag(mask) {
    return (this.flags & mask) !== 0;
  }

  // Java: PatternToken#setFlag(int,boolean)
  setFlag(mask, value) {
    if (value) {
      this.flags |= mask;
    } else {
      this.flags &= ~mask;
    }
  }

  // Java: PatternToken#isExceptionMatched(AnalyzedToken)
  isExceptionMatched(token) {
    if (this.rareFields !== null && this.rareFields.currentAndNextExceptions.length > 0) {
      for (const testException of this.rareFields.currentAndNextExceptions) {
        if (!testException.hasNextException() && testException.isMatched(token)) {
          return true;
        }
      }
    }
    return false;
  }

  // Java: PatternToken#isAndExceptionGroupMatched(AnalyzedToken)
  isAndExceptionGroupMatched(token) {
    const andGroupList = this.rareFields === null ? null : this.rareFields.andGroupList;
    if (andGroupList === null) return false;
    for (const testAndGroup of andGroupList) {
      if (testAndGroup.isExceptionMatched(token)) {
        return true;
      }
    }
    return false;
  }

  // Java: PatternToken#isExceptionMatchedCompletely(AnalyzedToken)
  isExceptionMatchedCompletely(token) {
    // note: short-circuiting possible
    return this.isExceptionMatched(token) || this.isAndExceptionGroupMatched(token);
  }

  // Java: PatternToken#setAndGroupElement(PatternToken)
  setAndGroupElement(andToken) {
    const rareFields = this.initRareFields();
    if (rareFields.andGroupList === null) {
      rareFields.andGroupList = [];
    }
    rareFields.andGroupList.push(Objects.requireNonNull(andToken));
  }

  // Java: PatternToken#hasAndGroup()
  hasAndGroup() {
    return this.rareFields !== null && this.rareFields.andGroupList !== null;
  }

  // Java: PatternToken#getAndGroup()
  getAndGroup() {
    const andGroupList = this.rareFields === null ? null : this.rareFields.andGroupList;
    return andGroupList === null ? emptyList() : unmodifiableList(andGroupList);
  }

  // Java: PatternToken#setOrGroupElement(PatternToken)
  setOrGroupElement(orToken) {
    const rareFields = this.initRareFields();
    if (rareFields.orGroupList === null) {
      rareFields.orGroupList = [];
    }
    rareFields.orGroupList.push(Objects.requireNonNull(orToken));
  }

  // Java: PatternToken#hasOrGroup()
  hasOrGroup() {
    return this.rareFields !== null && this.rareFields.orGroupList !== null;
  }

  // Java: PatternToken#getOrGroup()
  getOrGroup() {
    const orGroupList = this.rareFields === null ? null : this.rareFields.orGroupList;
    return orGroupList === null ? emptyList() : unmodifiableList(orGroupList);
  }

  // Java: PatternToken#isMatchedByScopeNextException(AnalyzedToken)
  isMatchedByScopeNextException(token) {
    if (this.rareFields !== null) {
      for (const testException of this.rareFields.currentAndNextExceptions) {
        if (testException.hasNextException() && testException.isMatched(token)) {
          return true;
        }
      }
    }
    return false;
  }

  // Java: PatternToken#isMatchedByPreviousException(AnalyzedToken) / isMatchedByPreviousException(AnalyzedTokenReadings)
  isMatchedByPreviousException(token) {
    if (token instanceof AnalyzedTokenReadings) {
      for (const analyzedToken of token) {
        if (this.isMatchedByPreviousException(analyzedToken)) {
          return true;
        }
      }
      return false;
    }
    if (this.hasPreviousException()) {
      for (const testException of this.rareFields.previousExceptions) {
        if (!testException.hasNextException() && testException.isMatched(token)) {
          return true;
        }
      }
    }
    return false;
  }

  // Java: PatternToken#isSentenceStart()
  isSentenceStart() {
    return this.posToken !== null && SENTENCE_START_TAGNAME === this.posToken.posTag && !this.posToken.negation;
  }

  // Java: PatternToken#setPosToken(PosToken)
  setPosToken(posToken) {
    this.posToken = posToken;
  }

  // Java: PatternToken#setChunkTag(ChunkTag)
  setChunkTag(chunkTag) {
    this.initRareFields().chunkTag = chunkTag;
  }

  // Java: PatternToken#getString()
  getString() {
    return this.textMatcher.pattern;
  }

  // Java: PatternToken#setStringElement(String)
  setStringElement(token) {
    this.setTextMatcher(StringMatcher.create(PatternToken.normalizeTextPattern(token), this.isRegularExpression(), this.isCaseSensitive()));
  }

  // Java: PatternToken#setTextMatcher(StringMatcher)
  setTextMatcher(matcher) {
    this.textMatcher = Objects.requireNonNull(matcher); // @NotNull parameter
    this.setFlag(TEST_STRING_MASK, !isEmpty(matcher.pattern));
  }

  // Java: PatternToken#normalizeTextPattern(String)
  static normalizeTextPattern(token) {
    return token === null || token === undefined ? '' : trimWhitespace(token);
  }

  // Java: PatternToken#setStringPosException(String,boolean,boolean,boolean,boolean,boolean,String,boolean,boolean,Boolean)
  setStringPosException(token, regExp, inflected, negation, scopeNext, scopePrevious, posToken, posRegExp, posNegation, caseSensitivity) {
    const exception = new PatternToken(token, caseSensitivity === null || caseSensitivity === undefined ? this.isCaseSensitive() : caseSensitivity, regExp, inflected);
    exception.setNegation(negation);
    exception.setPosToken(new PosToken(posToken, posRegExp, posNegation));
    this.addException(scopeNext, scopePrevious, exception);
  }

  // Java: PatternToken#addException(boolean,boolean,PatternToken)
  addException(scopeNext, scopePrevious, exception) {
    exception.setFlag(EXCEPTION_VALID_NEXT_MASK, scopeNext);
    this.initRareFields().addException(exception, scopePrevious);
  }

  // Java: PatternToken#initRareFields()
  initRareFields() {
    if (this.rareFields === null) {
      this.rareFields = new RareFields();
    }
    return this.rareFields;
  }

  // Java: PatternToken#isPosTokenMatched(AnalyzedToken)
  isPosTokenMatched(token) {
    const pos = this.posToken;
    if (pos === null || pos.posTag === null || pos.posTag === undefined || (pos.posUnknown && token.hasNoTag())) {
      return true;
    }
    const tokenPos = token.getPOSTag();
    if (tokenPos === null || tokenPos === undefined) {
      return false;
    }
    return pos.posPattern !== null ? pos.posPattern.matches(tokenPos) : pos.posTag === tokenPos;
  }

  // Java: PatternToken#getTestToken(AnalyzedToken)
  getTestToken(token) {
    // enables using words with lemmas and without lemmas in the same regexp with inflected="yes"
    if (this.hasFlag(INFLECTED_MASK)) {
      if (token.getLemma() !== null && token.getLemma() !== undefined) {
        return token.getLemma();
      }
      return token.getToken();
    }
    return token.getToken();
  }

  // Java: PatternToken#getSkipNext()
  getSkipNext() {
    return this.skip;
  }

  // Java: PatternToken#getMinOccurrence()
  getMinOccurrence() {
    return this.hasFlag(MAY_BE_OMITTED_MASK) ? 0 : 1;
  }

  // Java: PatternToken#getMaxOccurrence()
  getMaxOccurrence() {
    return this.maxOccurrence;
  }

  // Java: PatternToken#setSkipNext(int)
  setSkipNext(i) {
    if (i < -1 || i > BYTE_MAX) {
      throw new IllegalArgumentException(`'skip' should be between -1 and ${BYTE_MAX}`);
    }
    this.skip = i; // (byte) i
  }

  // Java: PatternToken#setMinOccurrence(int)
  setMinOccurrence(i) {
    if (i !== 0 && i !== 1) {
      throw new IllegalArgumentException(`minOccurrences must be 0 or 1: ${i}`);
    }
    this.setFlag(MAY_BE_OMITTED_MASK, i === 0);
  }

  // Java: PatternToken#setMaxOccurrence(int)
  setMaxOccurrence(i) {
    if (i === 0) {
      throw new IllegalArgumentException('maxOccurrences may not be 0');
    }
    if (i < -1 || i > BYTE_MAX) {
      throw new IllegalArgumentException(`maxOccurrences should be between -1 and ${BYTE_MAX} but was: ${i}`);
    }
    this.maxOccurrence = i; // (byte) i
  }

  // Java: PatternToken#hasPreviousException()
  hasPreviousException() {
    return this.rareFields !== null && this.rareFields.previousExceptions.length > 0;
  }

  // Java: PatternToken#hasNextException()
  hasNextException() {
    return this.hasFlag(EXCEPTION_VALID_NEXT_MASK);
  }

  // Java: PatternToken#setNegation(boolean)
  setNegation(negation) {
    this.setFlag(NEGATION_MASK, negation);
  }

  // Java: PatternToken#getNegation()
  getNegation() {
    return this.hasFlag(NEGATION_MASK);
  }

  // Java: PatternToken#isReferenceElement()
  isReferenceElement() {
    return this.getMatch() !== null;
  }

  // Java: PatternToken#setMatch(Match)
  setMatch(match) {
    this.initRareFields().tokenReference = Objects.requireNonNull(match);
  }

  // Java: PatternToken#getMatch()
  getMatch() {
    return this.rareFields === null ? null : this.rareFields.tokenReference;
  }

  // Java: PatternToken#compile(AnalyzedTokenReadings,Synthesizer)
  compile(token, synth) {
    const compiledPatternToken = this.clone();
    compiledPatternToken.doCompile(token, synth);
    return compiledPatternToken;
  }

  // Java: PatternToken#doCompile(AnalyzedTokenReadings,Synthesizer)
  doCompile(token, synth) {
    const tokenReference = this.rareFields.tokenReference;
    const matchState = tokenReference.createState(synth, token);
    const reference = '\\' + tokenReference.getTokenRef();
    if (tokenReference.setsPos()) {
      const posReference = matchState.getTargetPosTag();
      if (posReference !== null && posReference !== undefined) {
        this.setPosToken(new PosToken(posReference, tokenReference.posRegExp(), this.getNegation()));
      }
      this.setStringElement(javaReplace(this.getString(), reference, ''));
    } else {
      this.setStringElement(javaReplace(this.getString(), reference, matchState.toTokenString()));
    }
  }

  // Java: PatternToken#setPhraseName(String)
  setPhraseName(id) {
    this.initRareFields().phraseName = id;
  }

  // Java: PatternToken#isPartOfPhrase()
  isPartOfPhrase() {
    return this.rareFields !== null && this.rareFields.phraseName !== null;
  }

  // Java: PatternToken#isCaseSensitive()
  isCaseSensitive() {
    return this.textMatcher.caseSensitive;
  }

  // Java: PatternToken#isRegularExpression()
  isRegularExpression() {
    return this.textMatcher.isRegExp;
  }

  // Java: PatternToken#isPOStagRegularExpression()
  isPOStagRegularExpression() {
    return this.posToken !== null && this.posToken.posPattern !== null;
  }

  // Java: PatternToken#getPOStag()
  getPOStag() {
    return this.posToken !== null ? this.posToken.posTag : null;
  }

  // Java: PatternToken#getChunkTag()
  getChunkTag() {
    return this.rareFields === null ? null : this.rareFields.chunkTag;
  }

  // Java: PatternToken#getPOSNegation()
  getPOSNegation() {
    return this.posToken !== null && this.posToken.negation;
  }

  // Java: PatternToken#isInflected()
  isInflected() {
    return this.hasFlag(INFLECTED_MASK);
  }

  // Java: PatternToken#getPhraseName()
  getPhraseName() {
    return this.rareFields === null ? null : this.rareFields.phraseName;
  }

  // Java: PatternToken#isUnified()
  isUnified() {
    return this.rareFields !== null && this.rareFields.unificationFeatures !== null;
  }

  // Java: PatternToken#setUnification(Map)
  setUnification(uniFeatures) {
    this.initRareFields().unificationFeatures = Objects.requireNonNull(uniFeatures);
  }

  // Java: PatternToken#getUniFeatures()
  getUniFeatures() {
    return this.rareFields === null ? null : this.rareFields.unificationFeatures;
  }

  // Java: PatternToken#setUniNegation()
  setUniNegation() {
    this.setFlag(UNI_NEGATION_MASK, true);
  }

  // Java: PatternToken#isUniNegated()
  isUniNegated() {
    return this.hasFlag(UNI_NEGATION_MASK);
  }

  // Java: PatternToken#isLastInUnification()
  isLastInUnification() {
    return this.hasFlag(LAST_UNIFIED_MASK);
  }

  // Java: PatternToken#setLastInUnification()
  setLastInUnification() {
    this.setFlag(LAST_UNIFIED_MASK, true);
  }

  // Java: PatternToken#isUnificationNeutral()
  isUnificationNeutral() {
    return this.hasFlag(UNIFICATION_NEUTRAL_MASK);
  }

  // Java: PatternToken#setUnificationNeutral()
  setUnificationNeutral() {
    this.setFlag(UNIFICATION_NEUTRAL_MASK, true);
  }

  // Java: PatternToken#setWhitespaceBefore(boolean)
  setWhitespaceBefore(isWhite) {
    this.setFlag(WHITESPACE_BEFORE_MASK, isWhite);
    this.setFlag(TEST_WHITESPACE_MASK, true);
  }

  // Java: PatternToken#isInsideMarker()
  isInsideMarker() {
    return this.hasFlag(INSIDE_MARKER_MASK);
  }

  // Java: PatternToken#setInsideMarker(boolean)
  setInsideMarker(isInsideMarker) {
    this.setFlag(INSIDE_MARKER_MASK, isInsideMarker);
  }

  // Java: PatternToken#setExceptionSpaceBefore(boolean)
  setExceptionSpaceBefore(isWhite) {
    if (this.rareFields !== null) {
      const array = this.hasPreviousException() ? this.rareFields.previousExceptions : this.rareFields.currentAndNextExceptions;
      if (array.length > 0) {
        array[array.length - 1].setWhitespaceBefore(isWhite);
      }
    }
  }

  // Java: PatternToken#isWhitespaceBefore(AnalyzedToken)
  isWhitespaceBefore(token) {
    return this.hasFlag(WHITESPACE_BEFORE_MASK) === token.isWhitespaceBefore();
  }

  // Java: PatternToken#getExceptionList()
  getExceptionList() {
    const array = this.rareFields === null ? [] : this.rareFields.currentAndNextExceptions;
    return array.length === 0 ? emptyList() : asList(array);
  }

  // Java: PatternToken#hasCurrentOrNextExceptions()
  hasCurrentOrNextExceptions() {
    return this.rareFields !== null && this.rareFields.currentAndNextExceptions.length > 0;
  }

  // Java: PatternToken#hasExceptionList()
  hasExceptionList() {
    return this.rareFields !== null
      && (this.rareFields.currentAndNextExceptions.length > 0 || this.rareFields.previousExceptions.length > 0);
  }

  // Java: PatternToken#calcFormHints()
  calcFormHints() {
    return this.calcStringHints(false);
  }

  // Java: PatternToken#calcLemmaHints()
  calcLemmaHints() {
    return this.calcStringHints(true);
  }

  // Java: PatternToken#calcPosHints()
  calcPosHints() {
    if (this.posToken === null || this.posToken.negation || this.posToken.posUnknown) {
      return null;
    }
    if (this.hasFlag(MAY_BE_OMITTED_MASK) || this.isReferenceElement()) {
      return null;
    }
    if (this.posToken.posPattern !== null) {
      const possibleValues = this.posToken.posPattern.getPossibleValues();
      return possibleValues === null || possibleValues.isEmpty() ? null : possibleValues;
    }
    if (this.posToken.posTag === null || this.posToken.posTag === undefined) return null;
    const single = new JavaHashSet();
    single.add(this.posToken.posTag);
    return unmodifiableSet(single); // Java: Collections.singleton
  }

  // Java: PatternToken#calcStringHints(boolean)
  calcStringHints(inflected) {
    let result = inflected !== this.isInflected() ? null : this.calcOwnPossibleStringValues();
    if (result === null) return null;

    const andGroupList = this.rareFields === null ? null : this.rareFields.andGroupList;
    const orGroupList = this.rareFields === null ? null : this.rareFields.orGroupList;
    if (andGroupList !== null) {
      result = new JavaHashSet(result);

      for (const token of andGroupList) {
        const hints = token.calcStringHints(inflected);
        if (hints !== null) {
          result.retainAll(hints);
        }
      }
    } else if (orGroupList !== null) {
      result = new JavaHashSet(result);

      for (const token of orGroupList) {
        const hints = token.calcStringHints(inflected);
        if (hints === null) return null;

        result.addAll(hints);
      }
    }

    return result.isEmpty() ? null : result;
  }

  // Java: PatternToken#calcOwnPossibleStringValues()
  calcOwnPossibleStringValues() {
    if (this.getNegation() || !this.hasStringThatMustMatch()) {
      return null;
    }
    return this.textMatcher.getPossibleValues();
  }

  // Java: PatternToken#hasStringThatMustMatch()
  hasStringThatMustMatch() {
    return !this.isReferenceElement() && !this.hasFlag(MAY_BE_OMITTED_MASK) && this.getString().length !== 0;
  }

  // Java: PatternToken#toString()
  toString() {
    let sb = '';
    if (this.getNegation()) {
      sb += '!';
    }
    sb += this.getString();
    const phraseName = this.getPhraseName();
    if (phraseName !== null) {
      sb += ' {';
      sb += phraseName;
      sb += '}';
    }
    if (this.posToken !== null) {
      sb += '/';
      sb += valueOf(this.posToken.toString());
    }
    const chunkTag = this.getChunkTag();
    if (chunkTag !== null) {
      sb += '/';
      sb += valueOf(chunkTag);
    }
    const exceptionList = this.getExceptionList();
    if (exceptionList.length !== 0) {
      sb += '/exceptions=';
      sb += `[${exceptionList.map((e) => e.toString()).join(', ')}]`;
    }
    return sb;
  }
}
