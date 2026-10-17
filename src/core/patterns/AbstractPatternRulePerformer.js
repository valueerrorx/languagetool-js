// org.languagetool.rules.patterns.AbstractPatternRulePerformer (sequence matcher: skip, min/max, and-groups, start-index driver)
import { Objects } from '../../lib/java/Objects.js';
import { arrayGet } from '../../lib/java/arrays.js';
import { PatternTokenMatcher } from './PatternTokenMatcher.js';

// Java: AbstractPatternRulePerformer
export class AbstractPatternRulePerformer {
  static FQCN = 'org.languagetool.rules.patterns.AbstractPatternRulePerformer';

  // Java: AbstractPatternRulePerformer(AbstractTokenBasedRule,Unifier)
  constructor(rule, unifier) {
    this.prevMatched = false;
    this.unifiedTokens = null;
    this.rule = Objects.requireNonNull(rule);
    this.unifier = Objects.requireNonNull(unifier);
    this.patternTokenMatchers = this.createElementMatchers();
    this.patternSize = this.patternTokenMatchers.length;
    this.minOccurCorrection = this.getMinOccurrenceCorrection();
    this.toUnify = rule.isTestUnification() ? new Map() : null;
    this.neutralReadings = rule.isTestUnification() ? new Map() : null;
  }

  // Java: AbstractPatternRulePerformer#createElementMatchers()
  createElementMatchers() {
    const patternTokenMatchers = [];
    for (const pToken of this.rule.patternTokens) {
      patternTokenMatchers.push(new PatternTokenMatcher(pToken));
    }
    return patternTokenMatchers;
  }

  // Java: AbstractPatternRulePerformer#doMatch(AnalyzedSentence,AnalyzedTokenReadings[],MatchConsumer) / (..,int,int,MatchConsumer)
  doMatch(sentence, tokens, a, b, c) {
    let minStartIndex = 0;
    let maxStartIndex = 2147483647;
    let consumer = a;
    if (c !== undefined) {
      minStartIndex = a;
      maxStartIndex = b;
      consumer = c;
    }
    const anchor = this.rule.anchorHint;
    const anchorIndices = anchor === null || anchor === undefined || this.isInterpretPosTagsPreDisambiguation() ? null : anchor.getPossibleIndices(sentence);

    const tokenPositions = new Array(this.patternTokenMatchers.length).fill(0);
    const limit = this.rule.isSentStart() ? 1 : Math.max(0, tokens.length - this.patternSize + 1) + this.minOccurCorrection;
    if (anchorIndices !== null) {
      for (const anchorIndex of anchorIndices) {
        const i = anchorIndex - anchor.tokenIndex;
        if (i >= minStartIndex && i <= maxStartIndex && i >= 0 && i < limit) {
          this.matchFrom(i, tokens, consumer, tokenPositions);
        }
      }
    } else {
      const from = Math.max(0, minStartIndex);
      const to = Math.min(limit - 1, maxStartIndex);
      for (let i = from; i <= to; i++) {
        this.matchFrom(i, tokens, consumer, tokenPositions);
      }
    }
  }

  // Java: AbstractPatternRulePerformer#matchFrom(int,AnalyzedTokenReadings[],MatchConsumer,int[])
  matchFrom(startIndex, tokens, consumer, tokenPositions) {
    let pTokenMatcher = null;
    let skipShiftTotal = 0;
    let allElementsMatch = false;
    this.unifiedTokens = null;
    let matchingTokens = 0;
    let firstMatchToken = -1;
    let lastMatchToken = -1;
    let firstMarkerMatchToken = -1;
    let lastMarkerMatchToken = -1;
    let prevSkipNext = 0;
    if (this.toUnify !== null) {
      this.toUnify.clear();
      this.neutralReadings.clear();
    }
    let minOccurSkip = 0;
    for (let k = 0; k < this.patternSize; k++) {
      const prevTokenMatcher = pTokenMatcher;
      pTokenMatcher = this.patternTokenMatchers[k];
      pTokenMatcher.resolveReference(firstMatchToken, tokens, this.rule.getLanguage());
      const nextPos = startIndex + k + skipShiftTotal - minOccurSkip;
      this.prevMatched = false;
      if (prevSkipNext + nextPos >= tokens.length || prevSkipNext < 0) { // SENT_END?
        prevSkipNext = tokens.length - (nextPos + 1);
      }
      const maxTok = Math.min(nextPos + prevSkipNext, tokens.length - (this.patternSize - k) + this.minOccurCorrection);
      for (let m = nextPos; m <= maxTok; m++) {
        allElementsMatch = this.testAllReadings(tokens, pTokenMatcher, prevTokenMatcher, m, firstMatchToken, prevSkipNext);

        if (pTokenMatcher.getPatternToken().getMinOccurrence() === 0) {
          let foundNext = false;
          for (let k2 = k + 1; k2 < this.patternSize; k2++) {
            const nextElement = this.patternTokenMatchers[k2];
            const nextElementMatch = this.testAllReadings(tokens, nextElement, pTokenMatcher, m, firstMatchToken, prevSkipNext);
            if (nextElementMatch) {
              // this element doesn't match, but it's optional so accept this and continue
              allElementsMatch = true;
              minOccurSkip++;
              tokenPositions[matchingTokens++] = 0;
              foundNext = true;
              break;
            } else if (nextElement.getPatternToken().getMinOccurrence() > 0) {
              break;
            }
          }
          if (foundNext) {
            break;
          }
        }

        if (allElementsMatch) {
          const skipForMax = this.skipMaxTokens(tokens, pTokenMatcher, firstMatchToken, prevSkipNext,
            prevTokenMatcher, m, this.patternSize - k - 1);
          lastMatchToken = m + skipForMax;
          const skipShift = lastMatchToken - nextPos;
          tokenPositions[matchingTokens++] = skipShift + 1;
          prevSkipNext = this.translateElementNo(pTokenMatcher.getPatternToken().getSkipNext());
          skipShiftTotal += skipShift;
          if (firstMatchToken === -1) {
            firstMatchToken = lastMatchToken - skipForMax;
          }
          if (firstMarkerMatchToken === -1 && pTokenMatcher.getPatternToken().isInsideMarker()) {
            firstMarkerMatchToken = lastMatchToken - skipForMax;
          }
          if (pTokenMatcher.getPatternToken().isInsideMarker()) {
            lastMarkerMatchToken = lastMatchToken;
          }
          break;
        }
      }
      if (!allElementsMatch) {
        break;
      }
    }
    if (allElementsMatch && matchingTokens === this.patternSize && this.testUnification()) {
      consumer(tokenPositions, firstMatchToken, lastMatchToken, firstMarkerMatchToken, lastMarkerMatchToken);
    }
  }

  // Java: AbstractPatternRulePerformer#isInterpretPosTagsPreDisambiguation()
  isInterpretPosTagsPreDisambiguation() {
    return this.rule.isInterpretPosTagsPreDisambiguation(); // AbstractTokenBasedRule: false unless PatternRule
  }

  // Java: AbstractPatternRulePerformer#testAllReadings(AnalyzedTokenReadings[],PatternTokenMatcher,PatternTokenMatcher,int,int,int)
  testAllReadings(tokens, matcher, prevElement, tokenNo, firstMatchToken, prevSkipNext) {
    let anyMatched = false;
    const numberOfReadings = arrayGet(tokens, tokenNo).getReadingsLength();
    matcher.prepareAndGroup(firstMatchToken, tokens, this.rule.getLanguage());

    const readingsToUnify = this.toUnify === null ? null : [];

    for (let i = 0; i < numberOfReadings; i++) {
      const matchToken = tokens[tokenNo].getAnalyzedToken(i);
      this.prevMatched = this.prevMatched || (prevSkipNext > 0
          && prevElement !== null
          && prevElement.isMatchedByScopeNextException(matchToken));

      // a workaround to allow exception with scope="next" without "skip" in previous token
      // this allows to check for exception in the next token even if the current one is the last one in the sentence
      this.prevMatched = this.prevMatched || (prevSkipNext === 0
          && tokenNo <= tokens.length - 2
          && matcher.isMatchedByScopeNextException(tokens[tokenNo + 1].getAnalyzedToken(0)));

      if (this.prevMatched) {
        return false;
      }

      let readingTested = false;
      let readingMatches = false;

      if (!anyMatched) {
        anyMatched = readingMatches = matcher.isMatched(matchToken);
        readingTested = true;
      }

      // short-circuit when the search cannot possibly match
      if (!anyMatched && (prevElement === null || !prevElement.getPatternToken().hasCurrentOrNextExceptions())) {
        if (matcher.getPatternToken().getPOStag() === null) {
          if (matcher.getPatternToken().isInflected()) {
            if (tokens[tokenNo].hasSameLemmas()) {
              return false; // same lemmas everywhere
            }
          } else {
            return false; // the token is the same, we will not get a match
          }
        } else if (!matcher.getPatternToken().getPOSNegation() // postag =! null
            && !tokens[tokenNo].isTagged()) {
          return false; // we won't find any postag here anyway
        }
      }
      if (this.rule.isGroupsOrUnification()) {
        if (!readingTested) {
          readingMatches = matcher.isMatched(matchToken);
        }

        const isLastReading = i + 1 === numberOfReadings;
        const elem = matcher.getPatternToken();
        if (readingMatches && readingsToUnify !== null && elem.isUnified() && !elem.isUnificationNeutral()) {
          readingsToUnify.push(matchToken);
        }
        // non-short-circuit &= : testAndGroup has side effects and always runs
        anyMatched = AbstractPatternRulePerformer.testAndGroup(isLastReading, matchToken, matcher) && anyMatched;
      }
    }
    if (anyMatched) {
      for (let i = 0; i < numberOfReadings; i++) {
        if (matcher.isExceptionMatchedCompletely(tokens[tokenNo].getAnalyzedToken(i))) {
          return false;
        }
      }
      if (tokenNo > 0 && matcher.hasPreviousException()) {
        if (matcher.isMatchedByPreviousException(tokens[tokenNo - 1])) {
          return false;
        }
      }
      if (matcher.getPatternToken().isUnificationNeutral() && this.neutralReadings !== null) {
        const key = matcher.getPatternToken();
        if (!this.neutralReadings.has(key)) this.neutralReadings.set(key, []);
        this.neutralReadings.get(key).push(tokens[tokenNo]);
      }
    }
    const chunkTag = matcher.getPatternToken().getChunkTag();
    if (chunkTag !== null) {
      if (chunkTag.isRegexp()) {
        anyMatched = anyMatched && (tokens[tokenNo].getChunkTags().some((t) => chunkTag.matches(t))
                        !== matcher.getPatternToken().getNegation());
      } else {
        anyMatched = anyMatched && (tokens[tokenNo].getChunkTags().some((t) => chunkTag.equals(t))
                        !== matcher.getPatternToken().getNegation());
      }
    }
    if (matcher.getPatternToken().hasAndGroup()) {
      for (const e of matcher.getPatternToken().getAndGroup()) {
        if (e.getChunkTag() !== null) {
          anyMatched = anyMatched && (tokens[tokenNo].getChunkTags().some((t) => e.getChunkTag().equals(t))
              !== e.getNegation());
        }
      }
    }
    if (anyMatched && readingsToUnify !== null && readingsToUnify.length > 0) {
      const key = matcher.getPatternToken();
      if (!this.toUnify.has(key)) this.toUnify.set(key, []);
      this.toUnify.get(key).push(readingsToUnify);
    }
    return anyMatched;
  }

  // Java: AbstractPatternRulePerformer#testUnification()
  testUnification() {
    if (this.toUnify === null || this.neutralReadings === null) return true;

    this.unifier.reset();

    for (const matcher of this.patternTokenMatchers) {
      const patternToken = matcher.getPatternToken();
      const neutral = this.neutralReadings.get(patternToken);
      if (neutral !== undefined) {
        for (const atr of neutral) {
          this.unifier.addNeutralElement(atr);
        }
        continue;
      }

      const readingSets = this.toUnify.get(patternToken);
      if (readingSets === undefined) continue;

      for (const readings of readingSets) {
        let anyMatched = false;
        for (let i = 0; i < readings.length; i++) {
          // non-short-circuit |= : isUnified is always called
          anyMatched = this.unifier.isUnified(readings[i], patternToken.getUniFeatures(), i === readings.length - 1) || anyMatched;
        }
        if (patternToken.isUniNegated() && anyMatched) {
          return false;
        }
        if (patternToken.isLastInUnification() && readings === readingSets[readingSets.length - 1]) {
          if (!anyMatched && !patternToken.isUniNegated()) {
            return false;
          }
          if (this.rule.isGetUnified()) {
            this.unifiedTokens = this.unifier.getFinalUnified();
          }
          this.unifier.reset();
        }
      }
    }

    return true;
  }

  // Java: AbstractPatternRulePerformer#testAndGroup(boolean,AnalyzedToken,PatternTokenMatcher)
  static testAndGroup(lastReading, matchToken, elemMatcher) {
    elemMatcher.addMemberAndGroup(matchToken);
    return !lastReading || elemMatcher.checkAndGroup(true);
  }

  // Java: AbstractPatternRulePerformer#getMinOccurrenceCorrection()
  getMinOccurrenceCorrection() {
    let minOccurCorrection = 0;
    for (const patternToken of this.rule.getPatternTokens()) {
      if (patternToken.getMinOccurrence() === 0) {
        minOccurCorrection++;
      }
    }
    return minOccurCorrection;
  }

  // Java: AbstractPatternRulePerformer#skipMaxTokens(AnalyzedTokenReadings[],PatternTokenMatcher,int,int,PatternTokenMatcher,int,int)
  skipMaxTokens(tokens, elem, firstMatchToken, prevSkipNext, prevElement, m, remainingElems) {
    let maxSkip = 0;
    const maxOccurrences = elem.getPatternToken().getMaxOccurrence() === -1 ? 2147483647 : elem.getPatternToken().getMaxOccurrence();
    for (let j = 1; j < maxOccurrences && m + j < tokens.length - remainingElems; j++) {
      const nextAllElementsMatch = this.testAllReadings(tokens, elem, prevElement, m + j, firstMatchToken, prevSkipNext);
      if (nextAllElementsMatch) {
        maxSkip++;
      } else {
        break;
      }
    }
    return maxSkip;
  }

  // Java: AbstractPatternRulePerformer#translateElementNo(int)
  translateElementNo(i) {
    return i;
  }
}
