// org.languagetool.rules.patterns.PatternRuleMatcher (match driver, immunization, createRuleMatch, message/suggestion formatting)
import { Exception, IOException, NullPointerException, RuntimeException } from '../../lib/java/errors.js';
import { notPortedYet } from '../language/components.js';
import { arrayGet, arraySet, listGet } from '../../lib/java/arrays.js';
import { Integer } from '../../lib/java/int.js';
import { Character } from '../../lib/java/Character.js';
import { Pattern } from '../../lib/java/regex/index.js';
import { charAt, javaReplace, substring } from '../../lib/java/strings.js';
import { RuleMatch } from '../rules/model/RuleMatch.js';
import { RuleWithMaxFilter } from '../rules/RuleWithMaxFilter.js';
import { isAllUppercase as stringToolsIsAllUppercase, startsWithUppercase as stringToolsStartsWithUppercase, isPositiveNumber, isEmpty, addSpace } from '../text/StringTools.js';
import { AbstractPatternRulePerformer } from './AbstractPatternRulePerformer.js';

const PLEASE_SPELL_ME = '<pleasespellme/>'; // Java: PatternRuleHandler.PLEASE_SPELL_ME (import would be circular)
const MISTAKE = '<mistake/>';
const allowedChars = '[^<>()]*?';
const SUGGESTION_PATTERN_SUPPRESS = Pattern
  .compile(RuleMatch.SUGGESTION_START_TAG + PLEASE_SPELL_ME
    + allowedChars + '(\\(' + allowedChars + '\\)|' + MISTAKE + ')' + allowedChars
    + RuleMatch.SUGGESTION_END_TAG);
const WHITESPACE_OR_PUNCT = Pattern.compile('[\\s,:;.!?].*');
const TAG_AND_PLEASE_SPELL_ME = Pattern.compile(RuleMatch.SUGGESTION_START_TAG + PLEASE_SPELL_ME);

// Java: PatternRuleMatcher
export class PatternRuleMatcher extends AbstractPatternRulePerformer {
  static FQCN = 'org.languagetool.rules.patterns.PatternRuleMatcher';
  static MISTAKE = MISTAKE;

  // Java: PatternRuleMatcher(AbstractTokenBasedRule,boolean) / (AbstractTokenBasedRule,boolean,Unifier)
  constructor(rule, useList, unifier = rule.getLanguage().getUnifier()) {
    super(rule, unifier);
    this.useList = useList;
  }

  // Java: PatternRuleMatcher#match(AnalyzedSentence) / match(AnalyzedSentence,int,int)
  match(sentence, minStartIndex = 0, maxStartIndex = 2147483647) {
    const ruleMatches = [];
    try {
      const tokens = this.isInterpretPosTagsPreDisambiguation()
        ? sentence.getPreDisambigTokensWithoutWhitespace()
        : sentence.getTokensWithoutWhitespace();
      this.doMatch(sentence, tokens, minStartIndex, maxStartIndex, (tokenPositions, firstMatchToken, lastMatchToken, firstMarkerMatchToken, lastMarkerMatchToken) => {
        const ruleMatch = this.createRuleMatch(tokenPositions, tokens, firstMatchToken, lastMatchToken, firstMarkerMatchToken, lastMarkerMatchToken, sentence);
        if (ruleMatch !== null) {
          ruleMatches.push(ruleMatch);
        }
      });
      const maxFilter = new RuleWithMaxFilter();
      const filteredMatches = maxFilter.filter(ruleMatches);
      return filteredMatches.slice();
    } catch (e0) {
      let e = e0;
      if (e instanceof TypeError) e = new NullPointerException(); // JS TypeError stands for a Java NPE
      if (!(e instanceof Exception)) throw e0; // Errors, notPorted and internal errors pass through unwrapped
      if (e instanceof IOException) {
        throw new IOException(`Error analyzing sentence: '${sentence}'`, e);
      }
      throw new RuntimeException(`Error analyzing sentence: '${sentence}' with rule ${this.rule.getFullId()}`, e);
    }
  }

  // Java: PatternRuleMatcher#testAllReadings(AnalyzedTokenReadings[],PatternTokenMatcher,PatternTokenMatcher,int,int,int)
  testAllReadings(tokens, matcher, prevElement, tokenNo, firstMatchToken, prevSkipNext) {
    if (arrayGet(tokens, tokenNo).isImmunized()) return false;

    return super.testAllReadings(tokens, matcher, prevElement, tokenNo, firstMatchToken, prevSkipNext);
  }

  // Java: PatternRuleMatcher#createRuleMatch(int[],AnalyzedTokenReadings[],int,int,int,int,AnalyzedSentence)
  createRuleMatch(tokenPositions, tokens, firstMatchToken, lastMatchToken, firstMarkerMatchToken, lastMarkerMatchToken, sentence) {
    const rule = this.rule;
    const errMessage = this.formatMatches(tokens, tokenPositions,
      firstMatchToken, rule.getMessage(), rule.getSuggestionMatches());
    const shortErrMessage = this.formatMatches(tokens, tokenPositions,
      firstMatchToken, rule.getShortMessage(), rule.getSuggestionMatches());
    const suggestionsOutMsg = this.formatMatches(tokens, tokenPositions,
      firstMatchToken, rule.getSuggestionsOutMsg(), rule.getSuggestionMatchesOutMsg());
    let correctedStPos = 0;
    if (rule.startPositionCorrection > 0) {
      for (let l = 0; l <= Math.min(rule.startPositionCorrection, tokenPositions.length - 1); l++) {
        correctedStPos += arrayGet(tokenPositions, l);
      }
      correctedStPos--;
    }
    let idx = firstMatchToken + correctedStPos;
    if (idx >= tokens.length) {
      // TODO: hacky workaround, find a proper solution. See EnglishPatternRuleTest.testBug()
      // This is important when the reference points to a token with min="0", which has not been
      // matched... the subsequent match elements need to be renumbered, I guess, and that one
      // silently discarded
      idx = tokens.length - 1;
    }
    let firstMatchTokenObj = arrayGet(tokens, idx);
    const inputTokens = [];
    for (let i = idx; i <= lastMatchToken; i++) {
      inputTokens.push(arrayGet(tokens, i).getToken());
    }
    const isInputAllUppercase = stringToolsIsAllUppercase(inputTokens);
    // one-character words (A, J', L') are not enough to consider it an all-uppercase word
    let isAllUppercase = isInputAllUppercase
      && (javaReplace(firstMatchTokenObj.getToken(), "'", '').length > 1 || lastMatchToken > idx)
      && this.matchPreservesCase(rule.getSuggestionMatches(), rule.getMessage())
      && this.matchPreservesCase(rule.getSuggestionMatchesOutMsg(), rule.getSuggestionsOutMsg());
    isAllUppercase = isAllUppercase && rule.isAdjustSuggestionCase();

    let startsWithUppercase = stringToolsStartsWithUppercase(firstMatchTokenObj.getToken())
      && this.matchPreservesCase(rule.getSuggestionMatches(), rule.getMessage())
      && this.matchPreservesCase(rule.getSuggestionMatchesOutMsg(), rule.getSuggestionsOutMsg());

    if (firstMatchTokenObj.isSentenceStart() && tokens.length > firstMatchToken + correctedStPos + 1) {
      // make uppercasing work also at sentence start:
      firstMatchTokenObj = tokens[firstMatchToken + correctedStPos + 1];
      startsWithUppercase = stringToolsStartsWithUppercase(firstMatchTokenObj.getToken());
    }
    startsWithUppercase = startsWithUppercase && rule.isAdjustSuggestionCase();
    if (firstMarkerMatchToken === -1) {
      firstMarkerMatchToken = firstMatchToken;
    }
    let fromPos = arrayGet(tokens, firstMarkerMatchToken).getStartPos();
    // FIXME: this is fishy, assumes that comma should always come before whitespace:
    if (firstMarkerMatchToken >= 1 && (errMessage.includes(RuleMatch.SUGGESTION_START_TAG + ',')
        || suggestionsOutMsg.includes(RuleMatch.SUGGESTION_START_TAG + ','))) {
      fromPos = arrayGet(tokens, firstMarkerMatchToken - 1).getStartPos()
        + tokens[firstMarkerMatchToken - 1].getToken().length;
    }
    if (lastMarkerMatchToken === -1) {
      lastMarkerMatchToken = lastMatchToken;
    }
    const token = arrayGet(tokens, Math.min(lastMarkerMatchToken, tokens.length - 1));
    const toPos = token.getEndPos();
    if (fromPos < toPos) { // this can happen with some skip="-1" when the last token is not matched
      // if the message is "suppress_misspelled" and there are no suggestions,
      // then do not create the rule match
      if (!(errMessage.includes(PLEASE_SPELL_ME) && !errMessage.includes(RuleMatch.SUGGESTION_START_TAG)
          && !suggestionsOutMsg.includes(RuleMatch.SUGGESTION_START_TAG))) {
        let clearMsg = javaReplace(errMessage, PLEASE_SPELL_ME, '');
        clearMsg = javaReplace(clearMsg, MISTAKE, '');
        const ruleMatch = new RuleMatch(rule, sentence, fromPos, toPos, arrayGet(tokens, firstMatchToken).getStartPos(), arrayGet(tokens, lastMatchToken).getEndPos(),
          clearMsg, shortErrMessage, startsWithUppercase, isAllUppercase, suggestionsOutMsg, true);
        ruleMatch.setType(rule.getType());
        if (rule.getFilter() !== null) {
          // Java: new RuleFilterEvaluator(rule.getFilter()).runFilter(rule.getFilterArguments(), ruleMatch, Arrays.copyOfRange(tokens, firstMatchToken, lastMatchToken + 1), firstMatchToken, Ints.asList(tokenPositions))
          throw notPortedYet('RuleFilterEvaluator (F30)');
        } else {
          return ruleMatch;
        }
      }
    } // failed to create any rule match...
    return null;
  }

  // Java: PatternRuleMatcher#matchPreservesCase(List,String)
  matchPreservesCase(suggestionMatches, msg) {
    if (suggestionMatches !== null && suggestionMatches.length !== 0) {
      //FIXME: this only considers properly the first match in first suggestion.
      let sugStart = msg.indexOf(RuleMatch.SUGGESTION_START_TAG) + RuleMatch.SUGGESTION_START_TAG.length;
      if (msg.includes(PLEASE_SPELL_ME)) {
        sugStart += PLEASE_SPELL_ME.length;
      }
      for (const sMatch of suggestionMatches) {
        if (!sMatch.isInMessageOnly() && sMatch.convertsCase()
            && charAt(msg, sugStart) === 0x5c) {
          return false;
        }
      }
    }
    return true;
  }

  // Java: PatternRuleMatcher#translateElementNo(int)
  translateElementNo(i) {
    if (!this.useList || i < 0) {
      return i;
    }
    let j = 0;
    const rule = this.rule;
    for (let k = 0; k < i; k++) {
      j += listGet(rule.getElementNo(), k);
    }
    return j;
  }

  // Java: PatternRuleMatcher#formatMatches(AnalyzedTokenReadings[],int[],int,String,List)
  formatMatches(tokenReadings, positions, firstMatchTok, errorMsg, suggestionMatches) {
    if (errorMsg === null || errorMsg === undefined) throw new NullPointerException(); // errorMsg.length()
    let errorMessage = errorMsg;
    let matchCounter = 0;
    const numbersToMatches = new Array(errorMsg.length).fill(0);
    let newWay = false;
    let errLen = errorMessage.length;
    /*
    track position of already replaced text to avoid recursion
    otherwise, if we insert user matches into text and these contain backslashes
    we will try to interpret these as well -> this can lead to array index violations, etc.
     */
    let errorMessageProcessed = 0;
    let errMarker = errorMessage.indexOf('\\', errorMessageProcessed);
    let numberFollows = false;
    if (errMarker >= 0 && errMarker < errLen - 1) {
      numberFollows = isPositiveNumber(errorMessage.charCodeAt(errMarker + 1));
    }
    while (errMarker >= 0 && numberFollows) {
      const backslashPos = errorMessage.indexOf('\\', errorMessageProcessed);
      if (backslashPos >= 0 && isPositiveNumber(charAt(errorMessage, backslashPos + 1))) {
        let numLen = 1;
        while (backslashPos + numLen < errorMessage.length
            && Character.isDigit(errorMessage.charCodeAt(backslashPos + numLen))) {
          numLen++;
        }
        const j = Integer.parseInt(substring(errorMessage, backslashPos + 1, backslashPos
          + numLen)) - 1;
        let repTokenPos = 0;
        let nextTokenPos = 0;
        for (let l = 0; l <= Math.min(j, positions.length - 1); l++) {
          repTokenPos += positions[l];
        }
        if (j + 1 < positions.length) {
          nextTokenPos = firstMatchTok + repTokenPos + positions[j + 1];
        }

        if (suggestionMatches !== null && suggestionMatches.length > 0) {
          if (matchCounter < suggestionMatches.length) {
            arraySet(numbersToMatches, j, matchCounter);
            // if token is optional remove it from suggestions:
            let matches;
            if (j >= positions.length) {
              matches = this.concatMatches(matchCounter, j, firstMatchTok + repTokenPos, tokenReadings, nextTokenPos, suggestionMatches);
            } else if (positions[j] !== 0) {
              matches = this.concatMatches(matchCounter, j, firstMatchTok + repTokenPos, tokenReadings, nextTokenPos, suggestionMatches);
            } else {
              matches = [''];
            }
            const leftSide = substring(errorMessage, 0, backslashPos);
            const rightSide = substring(errorMessage, backslashPos + numLen);
            if (matches.length === 1) {
              // if we removed optional token from suggestion then remove leading space from the next word
              if (matches[0].length === 0) {
                errorMessage = PatternRuleMatcher.concatWithoutExtraSpace(leftSide, rightSide);
                errorMessageProcessed = leftSide.length;
              } else {
                errorMessage = leftSide + matches[0] + rightSide;
                errorMessageProcessed = leftSide.length + matches[0].length;
              }
            } else {
              // TODO compute/return errorMessageProcessed here as well
              errorMessage = PatternRuleMatcher.formatMultipleSynthesis(matches, leftSide, rightSide);
            }
            //TODO keep the previous matches length and handle it appropriately
            matchCounter++;
            newWay = true;
          } else {
            // FIXME: is this correct? this is how we deal with multiple matches
            suggestionMatches.push(listGet(suggestionMatches, arrayGet(numbersToMatches, j)));
          }
        }
        if (!newWay) {
          // in case <match> elements weren't used (yet)
          const newErrorMessageProcessed = errorMessage.lastIndexOf('\\' + (j + 1))
            + arrayGet(tokenReadings, firstMatchTok + repTokenPos - 1).getToken().length;
          errorMessage = substring(errorMessage, 0, errorMessageProcessed)
            + javaReplace(substring(errorMessage, errorMessageProcessed), '\\' + (j + 1),
              arrayGet(tokenReadings, firstMatchTok + repTokenPos - 1).getToken());
          errorMessageProcessed = newErrorMessageProcessed;
        }
      }
      errMarker = errorMessage.indexOf('\\', errorMessageProcessed);
      numberFollows = false;
      errLen = errorMessage.length;
      if (errMarker >= 0 && errMarker < errLen - 1) {
        numberFollows = isPositiveNumber(errorMessage.charCodeAt(errMarker + 1));
      }
    }
    return PatternRuleMatcher.removeSuppressMisspelled(errorMessage);
  }

  // Java: PatternRuleMatcher#concatWithoutExtraSpace(String,String)
  static concatWithoutExtraSpace(leftSide, rightSide) {
    // can't do \\p{Punct} as it catches \2 placeholder
    if ((leftSide.endsWith(' ') && rightSide.startsWith('</suggestion>'))
      || (leftSide.endsWith(' ') && WHITESPACE_OR_PUNCT.matcher(rightSide).matches())) {
      return leftSide.substring(0, leftSide.length - 1) + rightSide;
    }
    if (leftSide.endsWith('suggestion>') && rightSide.startsWith(' ')) {
      return leftSide + rightSide.substring(1);
    }
    return leftSide + rightSide;
  }

  // Java: PatternRuleMatcher#removeSuppressMisspelled(String)
  static removeSuppressMisspelled(s) {
    let result = s;
    // remove suggestions not synthesized: <suggestion><pleasespellme/>...(...)...</suggestion>
    // remove misspelled words: <suggestion><pleasespellme/>...<mistake/>...</suggestion>
    const matcher = SUGGESTION_PATTERN_SUPPRESS.matcher(result);
    result = matcher.replaceAll('');
    // remove the remaining tags <pleasespellme/> in suggestions but not in the message
    result = TAG_AND_PLEASE_SPELL_ME.matcher(result).replaceAll(RuleMatch.SUGGESTION_START_TAG);
    return result;
  }

  // Java: PatternRuleMatcher#formatMultipleSynthesis(String[],String,String)
  static formatMultipleSynthesis(matches, leftSide, rightSide) {
    let errorMessage;
    let suggestionLeft = '';
    let suggestionRight = '';
    let rightSideNew = rightSide;
    const sPos = leftSide.lastIndexOf(RuleMatch.SUGGESTION_START_TAG);
    if (sPos >= 0) {
      suggestionLeft = leftSide.substring(sPos + RuleMatch.SUGGESTION_START_TAG.length);
    }
    if (isEmpty(suggestionLeft)) {
      errorMessage = leftSide;
    } else {
      errorMessage = leftSide.substring(0, leftSide.lastIndexOf(RuleMatch.SUGGESTION_START_TAG)) + RuleMatch.SUGGESTION_START_TAG;
    }
    const rPos = rightSide.indexOf(RuleMatch.SUGGESTION_END_TAG);
    if (rPos >= 0) {
      suggestionRight = rightSide.substring(0, rPos);
    }
    if (!isEmpty(suggestionRight)) {
      rightSideNew = rightSide.substring(rightSide.indexOf(RuleMatch.SUGGESTION_END_TAG));
    }
    const lastLeftSugEnd = leftSide.indexOf(RuleMatch.SUGGESTION_END_TAG);
    const lastLeftSugStart = leftSide.lastIndexOf(RuleMatch.SUGGESTION_START_TAG);
    let sb = '';
    sb += errorMessage;
    for (let z = 0; z < matches.length; z++) {
      sb += suggestionLeft;
      sb += matches[z];
      sb += suggestionRight;
      if (z < matches.length - 1 && lastLeftSugEnd < lastLeftSugStart) {
        sb += RuleMatch.SUGGESTION_END_TAG;
        sb += ', ';
        sb += RuleMatch.SUGGESTION_START_TAG;
      }
    }
    sb += rightSideNew;
    return sb;
  }

  // Java: PatternRuleMatcher#concatMatches(int,int,int,AnalyzedTokenReadings[],int,List)
  concatMatches(start, index, tokenIndex, tokens, nextTokenPos, suggestionMatches) {
    let finalMatch;
    const len = this.phraseLen(index);
    const language = this.rule.language;
    if (len === 1) {
      const skippedTokens = nextTokenPos - tokenIndex;
      const matchState = listGet(suggestionMatches, start).createState(language.getSynthesizer(), tokens, tokenIndex - 1, skippedTokens);
      finalMatch = matchState.toFinalString(language);
    } else {
      const matchList = [];
      for (let i = 0; i < len; i++) {
        const skippedTokens = nextTokenPos - (tokenIndex + i);
        const matchState = listGet(suggestionMatches, start).createState(language.getSynthesizer(), tokens, tokenIndex - 1 + i, skippedTokens);
        matchList.push(matchState.toFinalString(language));
      }
      return PatternRuleMatcher.combineLists(matchList,
        new Array(matchList.length).fill(null), 0, language);
    }
    return finalMatch;
  }

  // Java: PatternRuleMatcher#phraseLen(int)
  phraseLen(i) {
    const elementNo = this.rule.getElementNo();
    if (!this.useList || i > elementNo.length - 1) {
      return 1;
    }
    return elementNo[i];
  }

  // Java: PatternRuleMatcher#combineLists(String[][],String[],int,Language)
  static combineLists(input, output, r, lang) {
    const outputList = [];
    if (r === input.length) {
      let sb = '';
      for (let k = 0; k < output.length; k++) {
        sb += output[k];
        if (k < output.length - 1) {
          sb += addSpace(arrayGet(output, k + 1), lang);
        }
      }
      outputList.push(sb);
    } else {
      for (let c = 0; c < input[r].length; c++) {
        output[r] = input[r][c];
        const sList = PatternRuleMatcher.combineLists(input, output, r + 1, lang);
        outputList.push(...sList);
      }
    }
    return outputList;
  }
}
