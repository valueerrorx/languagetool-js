// org.languagetool.rules.AbstractAdvancedSynthesizerFilter
import { IllegalArgumentException } from '../../lib/java/errors.js';
import { Integer } from '../../lib/java/int.js';
import { Pattern } from '../../lib/java/regex/index.js';
import { javaReplace, toUpperCase } from '../../lib/java/strings.js';
import { arrayGet } from '../../lib/java/arrays.js';
import { isAllUppercase, isCapitalizedWord, uppercaseFirstChar } from '../text/StringTools.js';
import { AnalyzedToken } from '../AnalyzedToken.js';
import { RuleFilter } from '../patterns/RuleFilter.js';
import { RuleMatch } from './model/RuleMatch.js';

// Java: AbstractAdvancedSynthesizerFilter
export class AbstractAdvancedSynthesizerFilter extends RuleFilter {
  static FQCN = 'org.languagetool.rules.AbstractAdvancedSynthesizerFilter';
  static JAVA_ABSTRACT = true;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.AbstractAdvancedSynthesizerFilter()' }];

  // Java: AbstractAdvancedSynthesizerFilter#acceptRuleMatch(RuleMatch,Map,int,AnalyzedTokenReadings[],List)
  acceptRuleMatch(match, arguments_, patternTokenPos, patternTokens) {
    const postagSelect = this.getRequired('postagSelect', arguments_);
    const lemmaSelect = this.getRequired('lemmaSelect', arguments_);
    const postagFromStr = this.getRequired('postagFrom', arguments_);
    const lemmaFromStr = this.getRequired('lemmaFrom', arguments_);
    const newLemma = this.getOptional('newLemma', arguments_, '');

    let postagFrom = 0;
    if (postagFromStr.startsWith('marker')) {
      while (postagFrom < patternTokens.length && patternTokens[postagFrom].getStartPos() < match.getFromPos()) {
        postagFrom++;
      }
      postagFrom++;
      if (postagFromStr.length > 6) {
        postagFrom += Integer.parseInt(javaReplace(postagFromStr, 'marker', ''));
      }
    } else {
      postagFrom = Integer.parseInt(postagFromStr);
    }
    if (postagFrom < 1 || postagFrom > patternTokens.length) {
      throw new IllegalArgumentException('AdvancedSynthesizerFilter: Index out of bounds in '
          + match.getRule().getFullId() + ', value: ' + postagFromStr);
    }
    let lemmaFrom = 0;
    if (lemmaFromStr.startsWith('marker')) {
      while (lemmaFrom < patternTokens.length && patternTokens[lemmaFrom].getStartPos() < match.getFromPos()) {
        lemmaFrom++;
      }
      lemmaFrom++;
      if (lemmaFromStr.length > 6) {
        lemmaFrom += Integer.parseInt(javaReplace(lemmaFromStr, 'marker', ''));
      }
    } else {
      lemmaFrom = Integer.parseInt(lemmaFromStr);
    }
    if (lemmaFrom < 1 || lemmaFrom > patternTokens.length) {
      throw new IllegalArgumentException('AdvancedSynthesizerFilter: Index out of bounds in '
          + match.getRule().getFullId() + ', value: ' + lemmaFromStr);
    }

    const postagReplace = this.getOptional('postagReplace', arguments_);

    let desiredLemma = this.getAnalyzedToken(arrayGet(patternTokens, lemmaFrom - 1), lemmaSelect).getLemma();
    const originalPostag = this.getAnalyzedToken(arrayGet(patternTokens, lemmaFrom - 1), lemmaSelect).getPOSTag();
    let desiredPostag = this.getAnalyzedToken(arrayGet(patternTokens, postagFrom - 1), postagSelect).getPOSTag();
    if (newLemma.length !== 0) {
      if (newLemma.startsWith('_')) {
        desiredLemma = this.getNewLemma(desiredLemma, newLemma);
      } else {
        desiredLemma = newLemma;
      }
    }
    if (desiredLemma === null || desiredLemma === undefined) {
      return null;
    }

    if (desiredPostag === null || desiredPostag === undefined) {
      throw new IllegalArgumentException('AdvancedSynthesizerFilter: undefined POS tag for rule '
        + match.getRule().getFullId() + " with POS regex '" + postagSelect + "' for token: " + patternTokens[postagFrom - 1]);
    }

    if (postagReplace !== null) {
      desiredPostag = this.getCompositePostag(lemmaSelect, postagSelect, originalPostag, desiredPostag, postagReplace);
    }

    // take capitalization from the lemma (?)
    const isWordCapitalized = isCapitalizedWord(arrayGet(patternTokens, lemmaFrom - 1).getToken());
    const isWordAllupper = isAllUppercase(arrayGet(patternTokens, lemmaFrom - 1).getToken());
    const token = new AnalyzedToken('', desiredPostag, desiredLemma);
    const language = this.getLanguageFromRuleMatch(match);
    const synth = language.getSynthesizer();
    const replacements = synth.synthesize(token, desiredPostag, true);
    if (replacements.length > 0) {
      const newMatch = new RuleMatch(match.getRule(), match.getSentence(), match.getFromPos(), match.getToPos(), match.getMessage(), match.getShortMessage());
      newMatch.setType(match.getType());
      const replacementsList = [];

      let suggestionUsed = false;
      for (const r of match.getSuggestedReplacements()) {
        for (let nr of replacements) {
          if (this.isSuggestionException(nr, desiredPostag)) {
            continue;
          }
          if (r.includes('{suggestion}') || r.includes('{Suggestion}') || r.includes('{SUGGESTION}')) {
            suggestionUsed = true;
          }
          if (isWordCapitalized) {
            nr = uppercaseFirstChar(nr);
          }
          if (isWordAllupper) {
            nr = toUpperCase(nr);
          }
          let completeSuggestion = javaReplace(r, '{suggestion}', nr);
          completeSuggestion = javaReplace(completeSuggestion, '{Suggestion}', uppercaseFirstChar(nr));
          completeSuggestion = javaReplace(completeSuggestion, '{SUGGESTION}', toUpperCase(nr));
          if (!replacementsList.includes(completeSuggestion)) {
            replacementsList.push(completeSuggestion);
          }
        }
      }
      if (!suggestionUsed) {
        replacementsList.push(...replacements);
      }
      const adjustedReplacementsList = [];
      for (const replacement of replacementsList) {
        adjustedReplacementsList.push(language.adaptSuggestion(replacement, ''));
      }
      newMatch.setSuggestedReplacements(adjustedReplacementsList);
      return newMatch;
    }
    return match;
  }

  // Java: AbstractAdvancedSynthesizerFilter#getCompositePostag(String,String,String,String,String)
  getCompositePostag(lemmaSelect, postagSelect, originalPostag, desiredPostag, postagReplace) {
    const aPattern = Pattern.compile(lemmaSelect, Pattern.UNICODE_CASE);
    const bPattern = Pattern.compile(postagSelect, Pattern.UNICODE_CASE);
    const aMatcher = aPattern.matcher(originalPostag);
    const bMatcher = bPattern.matcher(desiredPostag);
    let result = postagReplace;
    if (aMatcher.matches() && bMatcher.matches()) {
      for (let i = 1; i <= aMatcher.groupCount(); i++) {
        const groupStr = aMatcher.group(i);
        if (groupStr !== null) {
          const toReplace = '\\a' + i;
          result = javaReplace(result, toReplace, groupStr);
        }
      }
      for (let i = 1; i <= bMatcher.groupCount(); i++) {
        const groupStr = bMatcher.group(i);
        if (groupStr !== null) {
          const toReplace = '\\b' + i;
          result = javaReplace(result, toReplace, groupStr);
        }
      }
    }
    return result;
  }

  // Java: AbstractAdvancedSynthesizerFilter#isSuggestionException(String,String)
  isSuggestionException() {
    return false;
  }

  // Java: AbstractAdvancedSynthesizerFilter#getAnalyzedToken(AnalyzedTokenReadings,String) (private)
  getAnalyzedToken(aToken, regexp) {
    const pattern = Pattern.compile(regexp);
    for (const analyzedToken of aToken) {
      let posTag = analyzedToken.getPOSTag();
      if (posTag === null || posTag === undefined) {
        posTag = 'UNKNOWN';
      }
      const m = pattern.matcher(posTag);
      if (m.matches()) {
        return analyzedToken;
      }
    }
    // Return the first one. Something is wrong, anyway
    return aToken.getAnalyzedToken(0);
  }

  // Java: AbstractAdvancedSynthesizerFilter#getNewLemma(String,String)
  getNewLemma() {
    return null;
  }
}
