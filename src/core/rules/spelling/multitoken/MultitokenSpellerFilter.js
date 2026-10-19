// org.languagetool.rules.spelling.multitoken.MultitokenSpellerFilter (provides suggestions for misspelled multitoken expressions, usually proper nouns)
import { NullPointerException } from '../../../../lib/java/errors.js';
import { isLetter } from '../../../../lib/java/Character.js';
import { toLowerCase, toUpperCase } from '../../../../lib/java/strings.js';
import { isAllUppercase, isNotWordString, isPunctuationMark, uppercaseFirstChar } from '../../../text/StringTools.js';
import { RuleFilter } from '../../../patterns/RuleFilter.js';
import { castToPatternRule } from '../../filterCasts.js';

const MAX_UNDERLINED_LENGTH = 50;

// Cheaply discard inputs for which the (expensive) multitoken speller search cannot yield a suggestion.
// Java: MultitokenSpellerFilter#isClearlyUnsuitable(String) (private static)
function isClearlyUnsuitable(s) {
  if (s.length > MAX_UNDERLINED_LENGTH) {
    return true;
  }
  let letters = 0;
  for (let i = 0; i < s.length; i++) {
    if (isLetter(s.charCodeAt(i))) {
      letters++;
    }
  }
  // a multiword expression needs at least two letters (e.g. the two tokens of a proper noun)
  return letters < 2;
}

// Java: MultitokenSpellerFilter
export class MultitokenSpellerFilter extends RuleFilter {
  static FQCN = 'org.languagetool.rules.spelling.multitoken.MultitokenSpellerFilter';

  // Java: MultitokenSpellerFilter#acceptRuleMatch(RuleMatch,Map,int,AnalyzedTokenReadings[],List)
  acceptRuleMatch(match, arguments_, patternTokenPos, patternTokens) {
    if (patternTokens.every((x) => x.isIgnoredBySpeller())) {
      return null;
    }
    const underlinedError = match.getOriginalErrorStr();
    if (isClearlyUnsuitable(underlinedError)) {
      return null;
    }
    let lang = castToPatternRule(match.getRule()).getLanguage();
    // check the spelling for some languages in a different way
    let areTokensAcceptedBySpeller = false;
    if (lang.getShortCode() === 'en' || lang.getShortCode() === 'de' || lang.getShortCode() === 'pt'
      || lang.getShortCode() === 'nl') {
      if (lang.getShortCodeWithCountryAndVariant().length === 2) {
        // needed in testing
        lang = lang.getDefaultLanguageVariant();
      }
      areTokensAcceptedBySpeller = !this.isMisspelled(underlinedError, lang);
    }
    const speller = lang.getMultitokenSpeller();
    if (speller === null || speller === undefined) throw new NullPointerException();
    let replacements = speller.getSuggestions(underlinedError, areTokensAcceptedBySpeller);
    if (replacements.length === 0) {
      return null;
    }
    // all upper-case suggestions
    if (underlinedError.length > 4 && isAllUppercase(underlinedError)) {
      const allupercaseReplacements = [];
      for (const replacement of replacements) {
        const newReplacement = toUpperCase(replacement);
        if (!allupercaseReplacements.includes(newReplacement) && underlinedError !== newReplacement) {
          allupercaseReplacements.push(newReplacement);
        }
      }
      replacements = allupercaseReplacements;
    } else {
      // capitalize suggestion at sentence start
      let wordsStartPos = 1;
      // ignore punctuation marks at the sentence start to do the capitalization
      const tokens = match.getSentence().getTokensWithoutWhitespace();
      while (wordsStartPos < tokens.length && (isPunctuationMark(tokens[wordsStartPos].getToken())
        || isNotWordString(tokens[wordsStartPos].getToken()))) {
        wordsStartPos++;
      }
      if (patternTokenPos === wordsStartPos) {
        const capitalizedReplacements = [];
        for (const replacement of replacements) {
          let newReplacement = replacement;
          if (replacement === toLowerCase(replacement)) {
            // do not capitalize iPad
            newReplacement = uppercaseFirstChar(replacement);
          }
          if (!capitalizedReplacements.includes(newReplacement) && underlinedError !== newReplacement) {
            capitalizedReplacements.push(newReplacement);
          }
        }
        replacements = capitalizedReplacements;
      }
    }
    if (replacements.length === 0) {
      return null;
    }
    match.setSuggestedReplacements(replacements);
    return match;
  }

  // Java: MultitokenSpellerFilter#isMisspelled(String,Language)
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
