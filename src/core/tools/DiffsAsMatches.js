// Java: org.languagetool.tools.DiffsAsMatches
import { DEFAULT_EQUALIZER, DeltaType, diff, SPLITTER_BY_WORD } from '../../lib/diff/MyersDiff.js';
import { listGet } from '../../lib/java/arrays.js';
import { substring } from '../../lib/java/strings.js';
import { isPunctuationMark, isWhitespace } from '../text/StringTools.js';
import { PseudoMatch } from './PseudoMatch.js';

const MAX_CONTIGUOUS_DISTANCE = 3;
const INSERT_LOOKBACK_MAX = 2;

// Java: DiffsAsMatches
export class DiffsAsMatches {
  static FQCN = 'org.languagetool.tools.DiffsAsMatches';

  constructor() {
    this.filterOutApostropheDiffs = true;
    this.joinContiguousMatches = true;
  }

  // Java: DiffsAsMatches#getPseudoMatches(String,String)
  getPseudoMatches(original, revised) {
    const originalTokens = SPLITTER_BY_WORD(original);
    const revisedTokens = SPLITTER_BY_WORD(revised);
    const deltas = diff(originalTokens, revisedTokens, DEFAULT_EQUALIZER);
    let matches = this.processDeltasIntoMatches(deltas, originalTokens, original);
    if (this.filterOutApostropheDiffs) {
      matches = this.filterOutApostropheDiffsOf(matches, original);
    }
    if (this.joinContiguousMatches) {
      matches = this.joinContiguousMatchesOf(matches, original);
    }
    return matches;
  }

  // Java: DiffsAsMatches#processDeltasIntoMatches(List,List,String)
  processDeltasIntoMatches(deltas, originalTokens, originalText) {
    const matches = [];
    let lastMatch = null;
    let lastDelta = null;

    for (const delta of deltas) {
      let replacement = delta.target.lines.join('');

      const errorIndex = delta.source.position;
      const indexCorrection = this.getIndexCorrectionForInserts(delta, errorIndex);
      let fromPos = this.getPositionFromTokenIndex(originalTokens, errorIndex - indexCorrection);

      const wasPreviousTokenWhitespace = this.isPreviousTokenWhitespace(originalTokens, errorIndex);
      const lastPunctuationStr = this.getPreviousPunctuationIfAny(originalTokens, errorIndex);

      let underlinedError = delta.source.lines.join('');
      let toPos = fromPos + underlinedError.length;

      const prefixReplacement = this.buildPrefixForInsert(originalTokens, errorIndex, indexCorrection);
      toPos += prefixReplacement.length;
      replacement = prefixReplacement + replacement;

      underlinedError = substring(originalText, fromPos, toPos);

      while (underlinedError.length > 0 && replacement.length > 0
        && isWhitespace(underlinedError.substring(0, 1))
        && isWhitespace(replacement.substring(0, 1))) {
        fromPos++;
        underlinedError = underlinedError.substring(1);
        replacement = replacement.substring(1);
      }

      if (fromPos === 0 && toPos === 0) {
        toPos = listGet(originalTokens, 0).length;
        replacement = replacement + listGet(originalTokens, 0);
      }

      while (underlinedError.length > 0 && replacement.length > 0
        && isWhitespace(underlinedError.substring(underlinedError.length - 1))
        && isWhitespace(replacement.substring(replacement.length - 1))) {
        toPos--;
        underlinedError = underlinedError.substring(0, underlinedError.length - 1);
        replacement = replacement.substring(0, replacement.length - 1);
      }

      let match;
      if (this.shouldMergeChangeWithInsert(delta, lastDelta, lastMatch, wasPreviousTokenWhitespace, lastPunctuationStr)) {
        const newReplacement = listGet(lastMatch.getReplacements(), 0)
          + lastPunctuationStr
          + substring(replacement, toPos - fromPos);
        match = new PseudoMatch(newReplacement, lastMatch.getFromPos(), toPos);
        matches.pop();
      } else if (this.shouldMergeWithDelete(delta, lastMatch, fromPos, wasPreviousTokenWhitespace)) {
        const newReplacement = listGet(lastMatch.getReplacements(), 0);
        match = new PseudoMatch(newReplacement, lastMatch.getFromPos(), toPos - 1);
        matches.pop();
      } else {
        match = new PseudoMatch(replacement, fromPos, toPos);
      }
      matches.push(match);
      lastMatch = match;
      lastDelta = delta;
    }
    return matches;
  }

  // Java: DiffsAsMatches#getIndexCorrectionForInserts(AbstractDelta,int)
  getIndexCorrectionForInserts(delta, errorIndex) {
    let correction = 0;
    if (delta.type === DeltaType.INSERT) {
      correction = INSERT_LOOKBACK_MAX;
      while (errorIndex - correction < 0 && correction > 0) {
        correction--;
      }
    }
    return correction;
  }

  // Java: DiffsAsMatches#isPreviousTokenWhitespace(List,int)
  isPreviousTokenWhitespace(tokens, errorIndex) {
    if (errorIndex - 1 >= 0 && errorIndex - 1 < tokens.length) {
      return isWhitespace(tokens[errorIndex - 1]);
    }
    return false;
  }

  // Java: DiffsAsMatches#getPreviousPunctuationIfAny(List,int)
  getPreviousPunctuationIfAny(tokens, errorIndex) {
    if (errorIndex - 1 >= 0 && errorIndex - 1 < tokens.length) {
      const token = tokens[errorIndex - 1];
      if (isPunctuationMark(token)) {
        return token;
      }
    }
    return '';
  }

  // Java: DiffsAsMatches#buildPrefixForInsert(List,int,int)
  buildPrefixForInsert(tokens, errorIndex, indexCorrection) {
    let prefix = '';
    for (let i = errorIndex - indexCorrection; i < errorIndex; i++) {
      prefix += tokens[i];
    }
    return prefix;
  }

  // Java: DiffsAsMatches#getPositionFromTokenIndex(List,int)
  getPositionFromTokenIndex(tokens, tokenIndex) {
    let position = 0;
    for (let i = 0; i < tokenIndex; i++) {
      position += tokens[i].length;
    }
    return position;
  }

  // Java: DiffsAsMatches#shouldMergeChangeWithInsert(AbstractDelta,AbstractDelta,PseudoMatch,boolean,String)
  shouldMergeChangeWithInsert(currentDelta, previousDelta, previousMatch, wasPreviousWhitespace, lastPunctuationStr) {
    if (previousMatch === null || previousDelta === null) {
      return false;
    }
    if (previousDelta.type !== DeltaType.CHANGE || currentDelta.type !== DeltaType.INSERT) {
      return false;
    }
    if (!wasPreviousWhitespace && lastPunctuationStr.length === 0) {
      return false;
    }
    const currentPosition = currentDelta.source.position;
    const previousEndPosition = previousDelta.source.position + previousDelta.source.lines.length;
    return currentPosition - 1 === previousEndPosition;
  }

  // Java: DiffsAsMatches#shouldMergeWithDelete(AbstractDelta,PseudoMatch,int,boolean)
  shouldMergeWithDelete(currentDelta, previousMatch, currentFromPos, wasPreviousWhitespace) {
    if (previousMatch === null) {
      return false;
    }
    if (currentDelta.type !== DeltaType.DELETE) {
      return false;
    }
    if (!wasPreviousWhitespace) {
      return false;
    }
    return previousMatch.getToPos() + 1 === currentFromPos;
  }

  // Java: DiffsAsMatches#getJoinedMatch(List,String,int,int)
  getJoinedMatch(pseudoMatches, originalSentence, patternFrom, patternTo) {
    if (pseudoMatches.length === 0) {
      return null;
    }
    let minFrom = -1;
    let maxTo = -1;
    let previousTo = -1;
    let suggestion = '';
    for (const match of pseudoMatches) {
      if ((minFrom !== -1 && maxTo === -1) || this.isMatchInRange(match, patternFrom, patternTo)) {
        if (minFrom === -1) {
          minFrom = match.getFromPos();
        } else if (match.getFromPos() > previousTo) {
          suggestion += substring(originalSentence, previousTo, match.getFromPos());
        }
        suggestion += listGet(match.getReplacements(), 0);
        maxTo = match.getToPos();
      }
      previousTo = match.getToPos();
    }
    if (minFrom > -1 && maxTo > 0) {
      return new PseudoMatch(suggestion, minFrom, maxTo);
    }
    return null;
  }

  // Java: DiffsAsMatches#isMatchInRange(PseudoMatch,int,int)
  isMatchInRange(match, patternFrom, patternTo) {
    return (match.getFromPos() >= patternFrom && match.getFromPos() <= patternTo)
      || (match.getToPos() >= patternFrom && match.getToPos() <= patternTo);
  }

  // Java: DiffsAsMatches#filterOutApostropheDiffs(List,String)
  filterOutApostropheDiffsOf(pseudoMatches, original) {
    const results = [];
    for (const match of pseudoMatches) {
      const originalPart = substring(original, match.getFromPos(), match.getToPos());
      const normalizedOriginal = this.normalizeApostrophes(originalPart);
      const normalizedReplacement = this.normalizeApostrophes(match.getReplacement());
      if (normalizedOriginal !== normalizedReplacement) {
        results.push(match);
      }
    }
    return results;
  }

  // Java: DiffsAsMatches#normalizeApostrophes(String)
  normalizeApostrophes(text) {
    return text.split('’').join("'");
  }

  // Java: DiffsAsMatches#joinContiguousMatches(List,String)
  joinContiguousMatchesOf(pseudoMatches, original) {
    const results = [];
    let previousEndPosition = -1;
    for (const match of pseudoMatches) {
      if (previousEndPosition > -1 && match.getFromPos() - previousEndPosition < MAX_CONTIGUOUS_DISTANCE) {
        const joinedMatch = this.joinWithPreviousMatch(match, listGet(results, results.length - 1), original);
        results[results.length - 1] = joinedMatch;
      } else {
        results.push(match);
      }
      previousEndPosition = match.getToPos();
    }
    return results;
  }

  // Java: DiffsAsMatches#joinWithPreviousMatch(PseudoMatch,PseudoMatch,String)
  joinWithPreviousMatch(currentMatch, previousMatch, original) {
    let replacementBuilder = previousMatch.getReplacement();
    if (previousMatch.getToPos() < currentMatch.getFromPos()) {
      replacementBuilder += substring(original, previousMatch.getToPos(), currentMatch.getFromPos());
    }
    replacementBuilder += currentMatch.getReplacement();
    return new PseudoMatch(replacementBuilder, previousMatch.getFromPos(), currentMatch.getToPos());
  }
}
