// org.languagetool.rules.patterns.XMLRuleHandler (SAX handler base: token/exception/phrase/match bookkeeping shared by the rule loaders)
import { IndexOutOfBoundsException, NullPointerException, RuntimeException, SAXException } from '../../lib/java/errors.js';
import { listGet } from '../../lib/java/arrays.js';
import { Integer } from '../../lib/java/int.js';
import { Character } from '../../lib/java/Character.js';
import { Locale } from '../../lib/java/Locale.js';
import { StringBuilder, charAt, javaReplace, javaTrim, toUpperCase } from '../../lib/java/strings.js';
import { ChunkTag } from '../chunking/ChunkTag.js';
import { isEmpty } from '../text/StringTools.js';
import { DisambiguationPatternRule } from '../disambiguation/DisambiguationPatternRule.js';
import { Match } from './Match.js';
import { PatternToken } from './PatternToken.js';
import { StringMatcher } from './StringMatcher.js';
import { PatternRule } from './PatternRule.js';
import { RegexPatternRule } from './RegexPatternRule.js';
import { RuleFilterCreator } from './RuleFilterCreator.js';
import { RegexRuleFilterCreator } from './RegexRuleFilterCreator.js';

// Java: XMLRuleHandler.RegexpMode
export const RegexpMode = Object.freeze({ SMART: 'SMART', EXACT: 'EXACT' });

// Java: XMLRuleHandler (also holds the string constants, protected static final in Java)
export class XMLRuleHandler {
  static FQCN = 'org.languagetool.rules.patterns.XMLRuleHandler';
  static RegexpMode = RegexpMode;

  static ID = 'id';
  static NAME = 'name';

  // Definitions of values in XML files.
  static PREMIUM = 'premium';
  static YES = 'yes';
  static OFF = 'off';
  static GOAL_SPECIFIC = 'is_goal_specific';
  static TRUE = 'true';
  static FALSE = 'false';
  static TEMP_OFF = 'temp_off';
  static ON = 'on';
  static POSTAG = 'postag';
  static CHUNKTAG = 'chunk';
  static CHUNKTAG_REGEXP = 'chunk_re';
  static POSTAG_REGEXP = 'postag_regexp';
  static REGEXP = 'regexp';
  static NEGATE = 'negate';
  static INFLECTED = 'inflected';
  static NEGATE_POS = 'negate_pos';
  static MARKER = 'marker';
  static DEFAULT = 'default';
  static TYPE = 'type';
  static SPACEBEFORE = 'spacebefore';
  static EXAMPLE = 'example';
  static SCOPE = 'scope';
  static IGNORE = 'ignore';
  static SKIP = 'skip';
  static MIN = 'min';
  static MAX = 'max';
  static TOKEN = 'token';
  static FEATURE = 'feature';
  static UNIFY = 'unify';
  static UNIFY_IGNORE = 'unify-ignore';
  static AND = 'and';
  static OR = 'or';
  static EXCEPTION = 'exception';
  static CASE_SENSITIVE = 'case_sensitive';
  static MARK = 'mark';
  static PATTERN = 'pattern';
  static ANTIPATTERN = 'antipattern';
  static MATCH = 'match';
  static UNIFICATION = 'unification';
  static RULE = 'rule';
  static RULES = 'rules';
  static RULEGROUP = 'rulegroup';
  static NO = 'no';
  static PHRASES = 'phrases';
  static MESSAGE = 'message';
  static SUGGESTION = 'suggestion';
  static TABNAME = 'tab';
  static MINPREVMATCHES = 'min_prev_matches';
  static DISTANCETOKENS = 'distance_tokens';
  static PRIO = 'prio';

  // Java: XMLRuleHandler#XMLRuleHandler() (field initializers)
  constructor() {
    this.rules = [];
    this.language = null;
    this.messages = null;

    this.correctExample = new StringBuilder();
    this.antiPatternExample = new StringBuilder();
    this.antiPatternForRuleGroupExample = new StringBuilder();
    this.incorrectExample = new StringBuilder();
    this.errorTriggerExample = new StringBuilder();
    this.exampleCorrection = null;
    this.message = new StringBuilder();
    this.suggestionsOutMsg = new StringBuilder();
    this.match = new StringBuilder();
    this.elements = null;
    this.exceptions = null;

    this.correctExamples = [];
    this.antipatternExamples = [];
    this.antipatternForRuleGroupsExamples = [];
    this.incorrectExamples = [];
    this.errorTriggeringExamples = [];

    this.inPattern = false;
    this.inCorrectExample = false;
    this.inIncorrectExample = false;
    this.inErrorTriggerExample = false;
    this.inAntiPatternExample = false;
    this.inAntiPatternForRuleGroupExample = false;
    this.inMessage = false;
    this.inSuggestion = false;
    this.inMatch = false;
    this.inRuleGroup = false;
    this.inToken = false;
    this.inException = false;
    this.inPhrases = false;
    this.inAndGroup = false;
    this.inOrGroup = false;

    this.tokenSpaceBefore = false;
    this.tokenSpaceBeforeSet = false;
    this.posToken = null;
    this.chunkTag = null;
    this.posNegation = false;
    this.posRegExp = false;

    this.caseSensitive = false;
    this.regExpression = false;
    this.tokenNegated = false;
    this.tokenInflected = false;
    this.premiumRuleGroupAttribute = null;
    this.premiumCategoryAttribute = null;
    this.premiumFileAttribute = null;
    this.isPremiumRule = false;
    this.categoryTags = [];
    this.ruleGroupTags = [];
    this.ruleGroupToneTags = [];
    this.categoryToneTags = [];
    this.ruleTags = [];
    this.ruleToneTags = [];
    this.isGoalSpecificCategoryAttribute = null;
    this.isGoalSpecificRuleGroupAttribute = null;
    this.isGoalSpecific = false;
    this.prioCategoryAttribute = 0;
    this.prioRuleGroupAttribute = 0;
    this.prioRuleAttribute = 0;

    this.tokenLevelCaseSensitive = false;
    this.tokenLevelCaseSet = false;

    this.exceptionPosToken = null;
    this.exceptionStringRegExp = false;
    this.exceptionStringNegation = false;
    this.exceptionStringInflected = false;
    this.exceptionPosNegation = false;
    this.exceptionPosRegExp = false;
    this.exceptionValidNext = false;
    this.exceptionValidPrev = false;
    this.exceptionSet = false;
    this.exceptionSpaceBefore = false;
    this.exceptionSpaceBeforeSet = false;

    this.exceptionLevelCaseSensitive = null; // Java Boolean
    this.exceptionLevelCaseSet = false;

    /** List of elements as specified by tokens. */
    this.patternTokens = [];

    /** true when phraseref is the last element in the rule. */
    this.lastPhrase = false;

    /** ID reference to the phrase. */
    this.phraseIdRef = null;

    /** Current phrase ID. */
    this.phraseId = null;
    this.skipPos = 0;
    this.minOccurrence = 1;
    this.maxOccurrence = 1;
    this.ruleGroupId = null;
    this.id = null;
    this.patternToken = null;
    this.tokenReference = null;
    this.suggestionMatches = [];
    this.suggestionMatchesOutMsg = [];
    this.pLocator = null;
    this.xmlLineNumber = -1;
    this.xmlLineNumberAntiPattern = -1;

    this.startPositionCorrection = 0;
    this.endPositionCorrection = 0;
    this.tokenCounter = 0;

    /** Phrase store - elementLists keyed by phraseIds. */
    this.phraseMap = null;

    /** Logically forking element list, used for including multiple phrases in the current one. */
    this.phrasePatternTokens = [];

    this.andGroupCounter = 0;
    this.orGroupCounter = 0;

    this.inUrl = false;
    this.inUrlForRuleGroup = false;
    this.url = new StringBuilder();
    this.urlForRuleGroup = new StringBuilder();

    this.inRegex = false;
    this.regex = new StringBuilder();
    this.regexMode = RegexpMode.SMART;
    this.regexCaseSensitive = false;
    this.regexpMark = 0;

    this.inShortMessage = false;
    this.inShortMessageForRuleGroup = false;
    this.shortMessage = new StringBuilder();
    this.shortMessageForRuleGroup = new StringBuilder();

    this.inUnification = false;
    this.inMarker = false;
    this.inUnificationDef = false;
    this.uniNegation = false;
    this.inUnificationNeutral = false;

    this.uFeature = null;
    this.uType = '';

    this.uTypeList = [];
    this.equivalenceFeatures = new Map();

    this.internedMatchers = new Map();
    this.internedPos = new Map();
    this.knownPostagsSupplier = null;
  }

  // Java: XMLRuleHandler#getRules()
  getRules() {
    return this.rules;
  }

  // Java: XMLRuleHandler#warning(SAXParseException)
  warning(e) {
    throw e;
  }

  // Java: XMLRuleHandler#error(SAXParseException)
  error(e) {
    throw e;
  }

  // Java: XMLRuleHandler#setDocumentLocator(Locator)
  setDocumentLocator(locator) {
    this.pLocator = locator;
  }

  // Java: XMLRuleHandler#resetToken()
  resetToken() {
    this.posNegation = false;
    this.posRegExp = false;
    this.inToken = false;
    this.tokenSpaceBefore = false;
    this.tokenSpaceBeforeSet = false;
    this.resetException();
    this.exceptionSet = false;
    this.tokenReference = null;
  }

  // Java: XMLRuleHandler#resetException()
  resetException() {
    this.exceptionStringNegation = false;
    this.exceptionStringInflected = false;
    this.exceptionPosNegation = false;
    this.exceptionPosRegExp = false;
    this.exceptionStringRegExp = false;
    this.exceptionValidNext = false;
    this.exceptionValidPrev = false;
    this.exceptionSpaceBefore = false;
    this.exceptionSpaceBeforeSet = false;
  }

  // Java: XMLRuleHandler#preparePhrase(Attributes)
  preparePhrase(attrs) {
    this.phraseIdRef = attrs.getValue('idref');
    if (this.phraseMap === null) {
      throw new NullPointerException('Cannot invoke "java.util.Map.containsKey(Object)" because "this.phraseMap" is null');
    }
    if (this.phraseMap.has(this.phraseIdRef)) {
      for (const curPhrTokens of this.phraseMap.get(this.phraseIdRef)) {
        for (const pToken of curPhrTokens) {
          pToken.setPhraseName(this.phraseIdRef);
        }
        const copy = curPhrTokens.slice(); // ObjectUtils.clone(ArrayList)
        for (const patternToken of copy) {
          patternToken.setInsideMarker(this.inMarker);
        }
        if (this.patternTokens.length === 0) {
          this.phrasePatternTokens.push(copy.slice());
        } else {
          const prevList = this.patternTokens.slice();
          prevList.push(...copy);
          this.phrasePatternTokens.push(prevList.slice());
          prevList.length = 0;
        }
      }
      this.lastPhrase = true;
    }
  }

  // Java: XMLRuleHandler#finalizePhrase()
  finalizePhrase() {
    // lazy init
    if (this.phraseMap === null) {
      this.phraseMap = new Map();
    }
    for (const patternToken of this.patternTokens) {
      patternToken.setInsideMarker(this.inMarker);
    }
    if (this.phrasePatternTokens.length === 0) {
      this.phrasePatternTokens.push(this.patternTokens.slice());
    } else {
      for (const ph of this.phrasePatternTokens) {
        ph.push(...this.patternTokens);
      }
    }

    this.phraseMap.set(this.phraseId, this.phrasePatternTokens.slice());
    this.patternTokens.length = 0;

    this.phrasePatternTokens.length = 0;
  }

  // Java: XMLRuleHandler#startPattern(Attributes)
  startPattern(attrs) {
    this.tokenCounter = 0;
    this.inPattern = true;
    this.caseSensitive = XMLRuleHandler.YES === attrs.getValue(XMLRuleHandler.CASE_SENSITIVE);
  }

  /**
   * Calculates the offset of the match reference (if any) in case the match
   * element has been used in the group.
   */
  // Java: XMLRuleHandler#processElement(List)
  processElement(patternTokens) {
    let counter = 0;
    for (const pToken of patternTokens) {
      if (pToken.getPhraseName() !== null && counter > 0 && pToken.isReferenceElement()) {
        const tokRef = pToken.getMatch().getTokenRef();
        pToken.getMatch().setTokenRef(tokRef + counter - 1);
        const offsetToken = javaReplace(pToken.getString(), `\\${tokRef}`, `\\${tokRef + counter - 1}`);
        pToken.setStringElement(offsetToken);
      }
      counter++;
    }
  }

  // Java: XMLRuleHandler#setMatchElement(Attributes,boolean)
  setMatchElement(attrs, isSuppressMisspelled) {
    this.inMatch = true;
    this.match = new StringBuilder();
    let caseConversion = Match.CaseConversion.NONE;
    if (attrs.getValue('case_conversion') !== null) {
      caseConversion = Match.CaseConversion.valueOf(toUpperCase(attrs.getValue('case_conversion'), Locale.ENGLISH));
    }
    let includeRange = Match.IncludeRange.NONE;
    if (attrs.getValue('include_skipped') !== null) {
      includeRange = Match.IncludeRange.valueOf(toUpperCase(attrs.getValue('include_skipped'), Locale.ENGLISH));
    }
    const mWorker = new Match(attrs.getValue(XMLRuleHandler.POSTAG), attrs.getValue('postag_replace'),
      XMLRuleHandler.YES === attrs.getValue(XMLRuleHandler.POSTAG_REGEXP),
      attrs.getValue('regexp_match'), attrs.getValue('regexp_replace'),
      caseConversion, XMLRuleHandler.YES === attrs.getValue('setpos'),
      isSuppressMisspelled,
      includeRange);
    mWorker.setInMessageOnly(!this.inSuggestion);
    if (this.inMessage) {
      this.suggestionMatches.push(mWorker);
      // add incorrect XML character for simplicity
      this.message.append('\u0001\\');
      this.message.append(attrs.getValue('no'));
      this.checkNumber(attrs);
    } else if (this.inSuggestion) {
      this.suggestionMatchesOutMsg.push(mWorker);
      // add incorrect XML character for simplicity
      this.suggestionsOutMsg.append('\u0001\\');
      this.suggestionsOutMsg.append(attrs.getValue('no'));
      this.checkNumber(attrs);
    } else if (this.inToken && attrs.getValue('no') !== null) {
      const refNumber = Integer.parseInt(attrs.getValue('no'));
      this.checkRefNumber(refNumber);
      mWorker.setTokenRef(refNumber);
      this.tokenReference = mWorker;
      this.elements.append('\\');
      this.elements.append(refNumber);
    }
  }

  // Java: XMLRuleHandler#checkNumber(Attributes)
  checkNumber(attrs) {
    if (isEmpty(attrs.getValue('no'))) {
      throw new SAXException('References cannot be empty: ' + '\n Line: '
        + this.pLocator.getLineNumber() + ', column: '
        + this.pLocator.getColumnNumber() + '.');
    } else if (Integer.parseInt(attrs.getValue('no')) < 1 && this.regex.length() === 0) {
      throw new SAXException('References must be larger than 0: '
        + attrs.getValue('no') + '\n Line: ' + this.pLocator.getLineNumber()
        + ', column: ' + this.pLocator.getColumnNumber() + '.');
    }
  }

  // Java: XMLRuleHandler#checkRefNumber(int)
  checkRefNumber(refNumber) {
    if (refNumber > this.patternTokens.length) {
      throw new SAXException('Only backward references in match elements are possible, tried to specify token '
        + refNumber + '\n' + 'Line: ' + this.pLocator.getLineNumber()
        + ', column: ' + this.pLocator.getColumnNumber() + '.');
    }
  }

  // Java: XMLRuleHandler#setExceptions(Attributes)
  setExceptions(attrs) {
    const { YES, NEGATE, SCOPE, INFLECTED, POSTAG, POSTAG_REGEXP, NEGATE_POS, REGEXP, SPACEBEFORE, IGNORE, CASE_SENSITIVE } = XMLRuleHandler;
    this.inException = true;
    this.exceptions = new StringBuilder();
    this.resetException();

    this.exceptionStringNegation = YES === attrs.getValue(NEGATE);
    this.exceptionValidNext = 'next' === attrs.getValue(SCOPE);
    this.exceptionValidPrev = 'previous' === attrs.getValue(SCOPE);
    this.exceptionStringInflected = YES === attrs.getValue(INFLECTED);

    if (attrs.getValue(POSTAG) !== null) {
      this.exceptionPosToken = attrs.getValue(POSTAG);
      this.exceptionPosRegExp = YES === attrs.getValue(POSTAG_REGEXP);
      this.exceptionPosNegation = YES === attrs.getValue(NEGATE_POS);
    }
    this.exceptionStringRegExp = YES === attrs.getValue(REGEXP);
    if (attrs.getValue(SPACEBEFORE) !== null) {
      this.exceptionSpaceBefore = YES === attrs.getValue(SPACEBEFORE);
      this.exceptionSpaceBeforeSet = IGNORE !== attrs.getValue(SPACEBEFORE);
    }

    if (attrs.getValue(CASE_SENSITIVE) !== null) {
      this.exceptionLevelCaseSet = true;
      this.exceptionLevelCaseSensitive = YES === attrs.getValue(CASE_SENSITIVE);
    } else {
      this.exceptionLevelCaseSet = false;
    }
  }

  // Java: XMLRuleHandler#finalizeExceptions()
  finalizeExceptions() {
    this.inException = false;
    if (!this.exceptionSet) {
      let tokenCase = this.caseSensitive;
      if (this.tokenLevelCaseSet) {
        tokenCase = this.tokenLevelCaseSensitive;
      }
      if (this.elements === null) {
        throw new NullPointerException('Cannot invoke "java.lang.StringBuilder.toString()" because "this.elements" is null');
      }
      this.patternToken = new PatternToken(this.tokenInflected, this.internMatcher(javaTrim(this.elements.toString()), this.regExpression, tokenCase));
      this.exceptionSet = true;
    }
    this.patternToken.setNegation(this.tokenNegated);
    if (!isEmpty(this.exceptions.toString()) || this.exceptionPosToken !== null) {
      if (this.hasPosixCharacterClass(this.exceptions.toString())) {
        this.exceptionLevelCaseSensitive = true;
      }
      const caseSensitive = this.exceptionLevelCaseSensitive === null ? this.patternToken.isCaseSensitive() : this.exceptionLevelCaseSensitive;
      const exception = new PatternToken(this.exceptionStringInflected, this.internMatcher(javaTrim(this.exceptions.toString()), this.exceptionStringRegExp, caseSensitive));
      exception.setNegation(this.exceptionStringNegation);
      exception.setPosToken(this.obtainPosToken(this.exceptionPosToken, this.exceptionPosRegExp, this.exceptionPosNegation));
      this.patternToken.addException(this.exceptionValidNext, this.exceptionValidPrev, exception);
      this.exceptionPosToken = null;
      this.exceptionLevelCaseSensitive = null;
    }
    if (this.exceptionSpaceBeforeSet) {
      this.patternToken.setExceptionSpaceBefore(this.exceptionSpaceBefore);
    }
    this.resetException();
  }

  // To be compatible with Java 15, we make p{Lu} and p{Ll} imply case-sensitivity,
  // see https://github.com/languagetool-org/languagetool/issues/4061
  // Java: XMLRuleHandler#hasPosixCharacterClass(String)
  hasPosixCharacterClass(s) {
    const res = s.includes('\\p{Lu}') || s.includes('\\p{Ll}');
    if (res && s.includes('(?i')) {
      throw new RuntimeException('Contradicting regex contains both \'?i\' (case-insensitive) and \\p{Lu}/\\p{Ll} (case-sensitive): '
        + s + ' in rule ' + this.id);
    }
    return res;
  }

  // Java: XMLRuleHandler#setToken(Attributes)
  setToken(attrs) {
    const { YES, NEGATE, INFLECTED, SKIP, MIN, MAX, POSTAG, POSTAG_REGEXP, NEGATE_POS, CHUNKTAG, CHUNKTAG_REGEXP, REGEXP, SPACEBEFORE, IGNORE, CASE_SENSITIVE } = XMLRuleHandler;
    this.inToken = true;
    if (this.lastPhrase) {
      this.patternTokens.length = 0;
    }
    this.lastPhrase = false;
    this.tokenNegated = YES === attrs.getValue(NEGATE);
    this.tokenInflected = YES === attrs.getValue(INFLECTED);
    if (attrs.getValue(SKIP) !== null) {
      this.skipPos = Integer.parseInt(attrs.getValue(SKIP));
    }
    if (attrs.getValue(MIN) !== null) {
      this.minOccurrence = Integer.parseInt(attrs.getValue(MIN));
    }
    if (attrs.getValue(MAX) !== null) {
      this.maxOccurrence = Integer.parseInt(attrs.getValue(MAX));
    }
    this.elements = new StringBuilder();
    if (attrs.getValue(POSTAG) !== null) {
      this.posToken = attrs.getValue(POSTAG);
      this.posRegExp = YES === attrs.getValue(POSTAG_REGEXP);
      this.posNegation = YES === attrs.getValue(NEGATE_POS);
    }
    if (attrs.getValue(CHUNKTAG) !== null && attrs.getValue(CHUNKTAG_REGEXP) !== null) {
      throw new SAXException('You cannot set both \'chunk\' and \'chunk_re\' for ' + this.id);
    }
    if (attrs.getValue(CHUNKTAG) !== null) {
      this.chunkTag = new ChunkTag(attrs.getValue(CHUNKTAG));
    } else if (attrs.getValue(CHUNKTAG_REGEXP) !== null) {
      this.chunkTag = new ChunkTag(attrs.getValue(CHUNKTAG_REGEXP), true);
    }
    this.regExpression = YES === attrs.getValue(REGEXP);
    if (attrs.getValue(SPACEBEFORE) !== null) {
      this.tokenSpaceBefore = YES === attrs.getValue(SPACEBEFORE);
      this.tokenSpaceBeforeSet = IGNORE !== attrs.getValue(SPACEBEFORE);
    }
    if (!this.inAndGroup && !this.inOrGroup) {
      this.tokenCounter++;
    }
    if (attrs.getValue(CASE_SENSITIVE) !== null) {
      this.tokenLevelCaseSet = true;
      this.tokenLevelCaseSensitive = YES === attrs.getValue(CASE_SENSITIVE);
    } else {
      this.tokenLevelCaseSensitive = false;
      this.tokenLevelCaseSet = false;
    }
  }

  /**
   * Adds Match objects for all references to tokens
   * (including '\1' and the like).
   */
  // Java: XMLRuleHandler#addLegacyMatches(List,String,boolean)
  addLegacyMatches(existingSugMatches, messageStr, inMessage) {
    const sugMatch = [];
    let pos = 0;
    let ind = 0;
    let matchCounter = 0;
    while (pos !== -1) {
      pos = messageStr.indexOf('\\', ind);
      if (pos !== -1 && messageStr.length > pos && Character.isDigit(charAt(messageStr, pos + 1))) {
        if (pos === 0 || messageStr.charAt(pos - 1) !== '\u0001') {
          const mWorker = new Match(null, null, false, null,
            null, Match.CaseConversion.NONE, false, false, Match.IncludeRange.NONE);
          mWorker.setInMessageOnly(true);
          sugMatch.push(mWorker);
        } else if (messageStr.charAt(pos - 1) === '\u0001') { // real suggestion marker
          sugMatch.push(listGet(existingSugMatches, matchCounter));
          if (inMessage) {
            this.message.deleteCharAt(pos - 1 - matchCounter);
          } else {
            this.suggestionsOutMsg.deleteCharAt(pos - 1 - matchCounter);
          }
          matchCounter++;
        }
      }
      ind = pos + 1;
    }

    if (sugMatch.length === 0) {
      return existingSugMatches;
    }
    return sugMatch;
  }

  // Java: XMLRuleHandler#finalizeTokens(UnifierConfiguration)
  finalizeTokens(unifierConfiguration) {
    if (!this.exceptionSet || this.patternToken === null) {
      let tokenCase = this.caseSensitive || this.hasPosixCharacterClass(this.elements.toString());
      if (this.tokenLevelCaseSet) {
        tokenCase = this.tokenLevelCaseSensitive;
      }
      this.patternToken = new PatternToken(this.tokenInflected, this.internMatcher(javaTrim(this.elements.toString()), this.regExpression, tokenCase));
      this.patternToken.setNegation(this.tokenNegated);
    } else {
      const caseSensitive = this.patternToken.isCaseSensitive() || this.hasPosixCharacterClass(this.elements.toString());
      this.patternToken.setTextMatcher(this.internMatcher(javaTrim(this.elements.toString()), this.patternToken.isRegularExpression(), caseSensitive));
    }
    if (this.skipPos !== 0) {
      this.patternToken.setSkipNext(this.skipPos);
      this.skipPos = 0;
    }
    if (this.minOccurrence === 0) {
      this.patternToken.setMinOccurrence(0);
    }
    if (this.maxOccurrence !== 1) {
      this.patternToken.setMaxOccurrence(this.maxOccurrence);
      this.maxOccurrence = 1;
    }
    if (this.posToken !== null) {
      this.patternToken.setPosToken(this.obtainPosToken(this.posToken, this.posRegExp, this.posNegation));
      this.posToken = null;
    }
    if (this.chunkTag !== null) {
      this.patternToken.setChunkTag(this.chunkTag);
      this.chunkTag = null;
    }
    if (this.tokenReference !== null) {
      this.patternToken.setMatch(this.tokenReference);
    }
    if (this.inAndGroup && this.andGroupCounter > 0) {
      listGet(this.patternTokens, this.patternTokens.length - 1).setAndGroupElement(this.patternToken);
      if (this.minOccurrence !== 1 || this.maxOccurrence !== 1) {
        throw new SAXException('Please set min and max attributes on the '
          + 'first token in the AND group.\n You attempted to set these '
          + 'attributes on the token no. ' + (this.andGroupCounter + 1) + '.' + '\n Line: '
          + this.pLocator.getLineNumber() + ', column: '
          + this.pLocator.getColumnNumber() + '.');
      }
    } else if (this.inOrGroup && this.orGroupCounter > 0) {
      listGet(this.patternTokens, this.patternTokens.length - 1).setOrGroupElement(this.patternToken);
    } else {
      if (this.minOccurrence < 1) {
        this.patternTokens.push(this.patternToken);
      }
      for (let i = 1; i <= this.minOccurrence; i++) {
        this.patternTokens.push(this.patternToken);
      }
      this.minOccurrence = 1;
    }
    if (this.inAndGroup) {
      this.andGroupCounter++;
    }
    if (this.inOrGroup) {
      this.orGroupCounter++;
    }
    if (this.inUnification) {
      this.patternToken.setUnification(this.equivalenceFeatures);
    }
    if (this.inUnificationNeutral) {
      this.patternToken.setUnificationNeutral();
    }
    this.patternToken.setInsideMarker(this.inMarker);
    if (this.inUnificationDef) {
      unifierConfiguration.setEquivalence(this.uFeature, this.uType, this.patternToken);
      this.patternTokens.length = 0;
    }
    if (this.tokenSpaceBeforeSet) {
      this.patternToken.setWhitespaceBefore(this.tokenSpaceBefore);
    }
    this.resetToken();
  }

  // Java: XMLRuleHandler#obtainPosToken(String,boolean,boolean)
  obtainPosToken(posToken, regExp, negated) {
    const key = `${posToken === null ? 'N' : 'S'}${regExp ? 1 : 0}${negated ? 1 : 0}${posToken}`; // Triple.of(posToken, regExp, negated)
    let t = this.internedPos.get(key);
    if (t === undefined) {
      const matcher = regExp
        ? StringMatcher.createWithKnownValues(posToken, true, true, this.getKnownPostagsSupplier())
        : null;
      t = PatternToken.PosToken.withMatcher(posToken, negated, matcher);
      this.internedPos.set(key, t);
    }
    return t;
  }

  // Java: XMLRuleHandler#setRuleFilter(String,String,AbstractPatternRule)
  static setRuleFilter(filterClassName, filterArgs, rule) {
    if (filterClassName !== null && filterArgs !== null) {
      if (rule instanceof RegexPatternRule) {
        const creator = new RegexRuleFilterCreator();
        const filter = creator.getFilter(filterClassName);
        rule.setRegexFilter(filter);
        rule.setFilterArguments(filterArgs);
      } else if (rule instanceof PatternRule || rule instanceof DisambiguationPatternRule) {
        const filter = RuleFilterCreator.getInstance().getFilter(filterClassName);
        rule.setFilter(filter);
        rule.setFilterArguments(filterArgs);
      } else {
        throw new RuntimeException('Rule ' + rule.getFullId() + ' of type class ' + rule.constructor.FQCN + ' cannot have a filter (' + filterClassName + ')');
      }
    }
  }

  // Java: XMLRuleHandler#internMatcher(String,boolean,boolean)
  internMatcher(text, regexp, caseSensitive) {
    text = PatternToken.normalizeTextPattern(text);
    const key = `${regexp ? 1 : 0}${caseSensitive ? 1 : 0}${text}`; // Triple.of(text, regexp, caseSensitive)
    let m = this.internedMatchers.get(key);
    if (m === undefined) {
      m = StringMatcher.create(text, regexp, caseSensitive);
      this.internedMatchers.set(key, m);
    }
    return m;
  }

  // Java: XMLRuleHandler#getKnownPostagsSupplier()
  getKnownPostagsSupplier() {
    if (this.knownPostagsSupplier === null) {
      // Java: memoize(...); the computed value may itself be null
      let computed = false;
      let cache = null;
      this.knownPostagsSupplier = () => {
        if (!computed) {
          if (this.language === null) {
            cache = null;
          } else {
            const tags = this.language.getAllPossibleTags();
            cache = tags === null ? null : new Set(tags);
          }
          computed = true;
        }
        return cache;
      };
    }
    return this.knownPostagsSupplier;
  }
}
