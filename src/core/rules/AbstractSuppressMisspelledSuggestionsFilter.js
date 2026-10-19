// org.languagetool.rules.AbstractSuppressMisspelledSuggestionsFilter
import { equalsIgnoreCase } from '../../lib/java/strings.js';
import { listGet } from '../../lib/java/arrays.js';
import { RuleFilter } from '../patterns/RuleFilter.js';
import { castToPatternRule } from './filterCasts.js';

// Java: AbstractSuppressMisspelledSuggestionsFilter
export class AbstractSuppressMisspelledSuggestionsFilter extends RuleFilter {
  static FQCN = 'org.languagetool.rules.AbstractSuppressMisspelledSuggestionsFilter';
  static JAVA_ABSTRACT = true;
  static JAVA_CONSTRUCTORS = []; // the only constructor is protected

  // Java: AbstractSuppressMisspelledSuggestionsFilter#acceptRuleMatch(RuleMatch,Map,int,AnalyzedTokenReadings[],List)
  acceptRuleMatch(match, arguments_) {
    const ruleMatch = match;
    const language = castToPatternRule(match.getRule()).getLanguage();
    const tagger = language.getTagger();
    const replacements = match.getSuggestedReplacements();
    const newReplacements = [];
    const suppressMatch = this.getRequired('suppressMatch', arguments_);
    const suppressPostag = this.getOptional('SuppressPostag', arguments_);
    const filterPostag = this.getOptional('FilterPostag', arguments_);
    const checkPostag = tagger !== null && tagger !== undefined && (suppressPostag !== null || filterPostag !== null);
    for (let i = 0; i < replacements.length; i++) {
      const replacement = replacements[i];
      if (!this.isMisspelled(replacement, language)) {
        let addReplacement = true;
        // Tag only replacements that are not misspelled (the postag is only needed for them).
        if (checkPostag) {
          const atr = listGet(tagger.tag([replacement]), 0);
          if (suppressPostag !== null && atr.matchesPosTagRegex(suppressPostag)) {
            addReplacement = false;
          }
          if (filterPostag !== null && !atr.matchesPosTagRegex(filterPostag)) {
            addReplacement = false;
          }
        }
        if (addReplacement) {
          newReplacements.push(replacement);
        }
      }
    }
    let bSuppressMatch = true;
    if (suppressMatch !== null && equalsIgnoreCase(suppressMatch, 'false')) {
      bSuppressMatch = false;
    }
    if (newReplacements.length === 0 && bSuppressMatch) {
      return null;
    }
    ruleMatch.setSuggestedReplacements(newReplacements);
    return ruleMatch;
  }

  // Java: AbstractSuppressMisspelledSuggestionsFilter#isMisspelled(String,Language)
  isMisspelled(s, language) {
    const spellerRule = language.getDefaultSpellingRule();
    if (spellerRule === null || spellerRule === undefined) {
      return false;
    }
    const tokens = language.getWordTokenizer().tokenize(s);
    for (const token of tokens) {
      if (spellerRule.isMisspelled(token)) {
        return true;
      }
    }
    return false;
  }
}
