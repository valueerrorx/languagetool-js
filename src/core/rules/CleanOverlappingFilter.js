// Java: org.languagetool.rules.CleanOverlappingFilter (removes overlapping matches by language priorities; input sorted by start position)
import { IllegalArgumentException } from '../../lib/java/errors.js';
import { isLetterOrDigit } from '../../lib/java/Character.js';
import { javaSplit } from '../../lib/java/strings.js';
import { Premium } from './model/Premium.js';
import { Tag } from './model/Tag.js';

const INT_MIN = -2147483648;
const negativeConstant = INT_MIN + 10000; // Java: Integer.MIN_VALUE + 10000

// Java: CleanOverlappingFilter
export class CleanOverlappingFilter {
  static FQCN = 'org.languagetool.rules.CleanOverlappingFilter';

  // Java: CleanOverlappingFilter#CleanOverlappingFilter(Language,boolean)
  constructor(lang, hidePremiumMatches) {
    this.language = lang;
    this.hidePremiumMatches = hidePremiumMatches;
  }

  // Java: CleanOverlappingFilter#filter(List)
  filter(ruleMatches) {
    const cleanList = [];
    let prevRuleMatch = null;
    for (const ruleMatch of ruleMatches) {
      if (prevRuleMatch === null) { // first item
        prevRuleMatch = ruleMatch;
        continue;
      }
      if (ruleMatch.getFromPos() < prevRuleMatch.getFromPos()) {
        throw new IllegalArgumentException('The list of rule matches is not ordered. Make sure it is sorted by start position. RuleMatch: '
          + `${ruleMatch}; previous RuleMatch: ${prevRuleMatch}`);
      }

      let isDuplicateSuggestion = false;
      if (ruleMatch.getSuggestedReplacements().length > 0
        && prevRuleMatch.getSuggestedReplacements().length > 0) {
        const suggestion = ruleMatch.getSuggestedReplacements()[0];
        const prevSuggestion = prevRuleMatch.getSuggestedReplacements()[0];
        // juxtaposed errors adding a comma in the same place
        if (ruleMatch.getFromPos() === prevRuleMatch.getToPos()) {
          if (prevSuggestion.endsWith(',') && suggestion.startsWith(', ')) {
            isDuplicateSuggestion = true;
          }
        }
        // duplicate suggestion for the same position
        if (suggestion.indexOf(' ') > 0 && prevSuggestion.indexOf(' ') > 0
          && ruleMatch.getFromPos() === prevRuleMatch.getToPos() + 1) {
          const parts = javaSplit(suggestion, ' ');
          const partsPrev = javaSplit(prevSuggestion, ' ');
          if (partsPrev.length > 1 && parts.length > 1 && partsPrev[1] === parts[0]) {
            isDuplicateSuggestion = true;
          }
        }
      }

      // no overlapping (juxtaposed errors are not removed)
      if (ruleMatch.getFromPos() >= prevRuleMatch.getToPos() && !isDuplicateSuggestion) {
        cleanList.push(prevRuleMatch);
        prevRuleMatch = ruleMatch;
        continue;
      }
      // overlapping
      let currentPriority = this.language.getRulePriority(ruleMatch.getRule());
      if (this.isPremiumRule(ruleMatch) && this.hidePremiumMatches) {
        // non-premium match should win, so the premium match does *not* become a hidden match
        currentPriority = INT_MIN;
      }
      if (ruleMatch.getRule().getTags().includes(Tag.picky) && currentPriority !== INT_MIN) {
        currentPriority = (currentPriority + negativeConstant) | 0;
      }
      let prevPriority = this.language.getRulePriority(prevRuleMatch.getRule());
      if (this.isPremiumRule(prevRuleMatch) && this.hidePremiumMatches) {
        prevPriority = INT_MIN;
      }
      if (prevRuleMatch.getRule().getTags().includes(Tag.picky) && prevPriority !== INT_MIN) {
        prevPriority = (prevPriority + negativeConstant) | 0;
      }
      // If both matches only change punctuation,
      // prefer the rule that participates in "correct all errors at once".
      const currentIsPunctuationOnly = this.isPunctuationOnlyChange(ruleMatch);
      const prevIsPunctuationOnly = this.isPunctuationOnlyChange(prevRuleMatch);
      if (currentIsPunctuationOnly && prevIsPunctuationOnly) {
        const currentIncludedAllAtOnce = ruleMatch.getRule().isIncludedInErrorsCorrectedAllAtOnce();
        const prevIncludedAllAtOnce = prevRuleMatch.getRule().isIncludedInErrorsCorrectedAllAtOnce();
        if (currentIncludedAllAtOnce !== prevIncludedAllAtOnce) {
          if (currentIncludedAllAtOnce) {
            if (currentPriority < prevPriority) {
              currentPriority = (prevPriority + 1) | 0;
            }
          } else if (prevPriority < currentPriority) {
            prevPriority = (currentPriority + 1) | 0;
          }
        }
      }
      if (currentPriority === prevPriority) {
        // take the longest error:
        currentPriority = ruleMatch.getToPos() - ruleMatch.getFromPos();
        prevPriority = prevRuleMatch.getToPos() - prevRuleMatch.getFromPos();
      }
      if (currentPriority === prevPriority) {
        currentPriority = (currentPriority + 1) | 0; // take the last one (to keep the current results in the web UI)
      }
      if (currentPriority > prevPriority) {
        prevRuleMatch = ruleMatch;
      }
    }
    // last match
    if (prevRuleMatch !== null) {
      cleanList.push(prevRuleMatch);
    }
    return cleanList;
  }

  // Java: CleanOverlappingFilter#isPremiumRule(RuleMatch)
  isPremiumRule(ruleMatch) {
    return Premium.get().isPremiumRule(ruleMatch.getRule());
  }

  // Java: CleanOverlappingFilter#isPunctuationOnlyChange(RuleMatch)
  isPunctuationOnlyChange(match) {
    if (match === null) {
      return false;
    }
    const suggestions = match.getSuggestedReplacements();
    if (suggestions === null || suggestions.length === 0) {
      return false;
    }
    const replacement = suggestions[0];
    if (replacement === null) {
      return false;
    }
    let original = match.getOriginalErrorStr();
    if (original === null || original === undefined || original.length === 0) {
      const sentenceStr = match.getSentence() !== null && match.getSentence() !== undefined ? match.getSentence().getText() : null;
      if (sentenceStr === null || sentenceStr.length === 0) {
        return false;
      }
      let from = match.getFromPosSentence();
      let to = match.getToPosSentence();
      if (from > -1 && to > -1 && to <= sentenceStr.length && from < to) {
        original = sentenceStr.substring(from, to);
      } else {
        from = match.getFromPos();
        to = match.getToPos();
        if (from > -1 && to > -1 && to <= sentenceStr.length && from < to) {
          original = sentenceStr.substring(from, to);
        } else {
          return false;
        }
      }
    }
    // if strings are identical, it's not a change at all
    if (replacement === original) {
      return false;
    }
    const normalizedOriginal = this.keepLettersAndDigits(original);
    const normalizedReplacement = this.keepLettersAndDigits(replacement);
    return normalizedOriginal === normalizedReplacement;
  }

  // Java: CleanOverlappingFilter#keepLettersAndDigits(String)
  keepLettersAndDigits(s) {
    let sb = '';
    for (let i = 0; i < s.length; i++) {
      const ch = s.charCodeAt(i);
      if (isLetterOrDigit(ch)) {
        sb += String.fromCharCode(ch);
      }
    }
    return sb;
  }
}
