// org.languagetool.rules.AbstractFindSuggestionsFilter
import { AbstractMethodError } from '../../lib/java/errors.js';
import { Pattern } from '../../lib/java/regex/index.js';
import { equalsIgnoreCase, javaReplace, toLowerCase, toUpperCase } from '../../lib/java/strings.js';
import { arrayGet } from '../../lib/java/arrays.js';
import { isAllUppercase, isCapitalizedWord, removeDiacritics, uppercaseFirstChar } from '../text/StringTools.js';
import { AnalyzedToken } from '../AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../AnalyzedTokenReadings.js';
import { RuleFilter } from '../patterns/RuleFilter.js';
import { RuleMatch } from './model/RuleMatch.js';
import { EditDistance } from './spelling/symspell/implementation/EditDistance.js';

const MAX_CACHE_SIZE = 10000;

// Java: AbstractFindSuggestionsFilter.StringComparator
class StringComparator {
  // Java: StringComparator#StringComparator(String)
  constructor(word) {
    this.levenstheinDistance = new EditDistance(word, EditDistance.DistanceAlgorithm.Damerau);
    this.maxDistance = 4;
  }

  // Java: StringComparator#compare(String,String)
  compare(o1, o2) {
    let d1 = this.levenstheinDistance.compare(o1, this.maxDistance);
    let d2 = this.levenstheinDistance.compare(o2, this.maxDistance);
    if (d1 < 0) {
      d1 = 2 * this.maxDistance;
    }
    if (d2 < 0) {
      d2 = 2 * this.maxDistance;
    }
    return d1 - d2;
  }
}

// Java: AbstractFindSuggestionsFilter
export class AbstractFindSuggestionsFilter extends RuleFilter {
  static FQCN = 'org.languagetool.rules.AbstractFindSuggestionsFilter';
  static JAVA_ABSTRACT = true;
  static JAVA_CONSTRUCTORS = [{ params: [], text: 'public org.languagetool.rules.AbstractFindSuggestionsFilter()' }];
  static StringComparator = StringComparator;

  constructor() {
    super();
    this.MAX_SUGGESTIONS = 10;
    // Filters are singletons per class (see RuleFilterCreator), so this cache is shared by all rules using the filter (Guava cache, maximumSize 10000)
    this.spellingSuggestionsCache = new Map();
  }

  // Java: AbstractFindSuggestionsFilter#getTagger() (abstract)
  getTagger() {
    throw new AbstractMethodError('org.languagetool.rules.AbstractFindSuggestionsFilter.getTagger');
  }

  // Java: AbstractFindSuggestionsFilter#getSpellingSuggestions(AnalyzedTokenReadings) (abstract)
  getSpellingSuggestions() {
    throw new AbstractMethodError('org.languagetool.rules.AbstractFindSuggestionsFilter.getSpellingSuggestions');
  }

  // Java: AbstractFindSuggestionsFilter#acceptRuleMatch(RuleMatch,Map,int,AnalyzedTokenReadings[],List)
  acceptRuleMatch(match, arguments_, patternTokenPos, patternTokens) {
    // TODO (Java): remove suggestions that trigger the rule again.
    const replacements = [];
    const replacements2 = [];
    const wordFrom = this.getRequired('wordFrom', arguments_);
    const desiredPostag = this.getRequired('desiredPostag', arguments_);
    const priorityPostag = this.getOptional('priorityPostag', arguments_);
    const removeSuggestionsRegexp = this.getOptional('removeSuggestionsRegexp', arguments_);
    // suppress match if there are no suggestions
    const bSuppressMatch = equalsIgnoreCase(this.getOptional('suppressMatch', arguments_, 'false'), 'true');

    // diacriticsMode: return only changes in diacritics. If there is none, the match is removed.
    const mode = this.getOptional('Mode', arguments_);
    const diacriticsMode = (mode !== null) && mode === 'diacritics';
    const generateSuggestions = true;
    let regexpPattern = null;
    const synth = this.getSynthesizer();
    const usedLemmas = [];
    let stringComparator = new StringComparator('');

    if (wordFrom !== null && desiredPostag !== null) {
      let atrWord;
      if (wordFrom === 'inmarker') {
        match.setOriginalErrorStr();
        atrWord = new AnalyzedTokenReadings(new AnalyzedToken(this.preProcessWrongWord(match.getOriginalErrorStr()), '', ''));
      } else {
        atrWord = arrayGet(patternTokens, this.getPosition(wordFrom, patternTokens, match));
      }
      stringComparator = new StringComparator(atrWord.getToken());
      const isWordCapitalized = isCapitalizedWord(atrWord.getToken());
      const isWordAllupper = isAllUppercase(atrWord.getToken());

      // Check if the original token (before disambiguation) meets the requirements
      const originalWord = [atrWord.getToken()];
      const aOriginalWord = this.getTagger().tag(originalWord);
      for (const atr of aOriginalWord) {
        if (atr.matchesPosTagRegex(desiredPostag)) {
          if (diacriticsMode) {
            return null;
          }
        }
      }

      if (generateSuggestions) {
        if (removeSuggestionsRegexp !== null) {
          regexpPattern = Pattern.compile(removeSuggestionsRegexp, Pattern.UNICODE_CASE);
        }
        const suggestions = this.getSpellingSuggestionsCached(atrWord);
        let usedPriorityPostagPos = 0;
        if (suggestions.length > 0) {
          for (const suggestion of suggestions) {
            // TODO (Java): do not tag capitalized words with tags for lower case
            const analyzedSuggestions = this.getTagger().tag([this.cleanSuggestion(suggestion)]);
            for (const analyzedSuggestion of analyzedSuggestions) {
              if (this.isSuggestionException(analyzedSuggestion)) {
                continue;
              }
              if (replacements.length >= 2 * this.MAX_SUGGESTIONS) {
                break;
              }
              let used = false;
              if (suggestion !== atrWord.getToken() && analyzedSuggestion.matchesPosTagRegex(desiredPostag)) {
                if (!replacements.includes(suggestion)
                    && !replacements.includes(toLowerCase(suggestion))
                    && (!diacriticsMode || this.equalWithoutDiacritics(suggestion, atrWord.getToken()))) {
                  if (regexpPattern === null || !regexpPattern.matcher(suggestion).matches()) {
                    let replacement = suggestion;
                    if (isWordAllupper) {
                      replacement = toUpperCase(replacement);
                    }
                    if (isWordCapitalized) {
                      replacement = uppercaseFirstChar(replacement);
                    }
                    if (priorityPostag !== null && analyzedSuggestion.matchesPosTagRegex(priorityPostag)) {
                      replacements.splice(usedPriorityPostagPos, 0, replacement);
                      usedPriorityPostagPos++;
                      used = true;
                    } else {
                      replacements.push(replacement);
                      used = true;
                    }
                  }
                }
              }
              // try with the synthesizer
              if (!used && synth !== null && synth !== undefined) {
                const synthesizedSuggestions = [];
                for (const at of analyzedSuggestion) {
                  if (usedLemmas.includes(at.getLemma())) {
                    continue;
                  }
                  const synthesizedArray = synth.synthesize(at, desiredPostag, true);
                  usedLemmas.push(at.getLemma());
                  for (const synthesizedSuggestion of synthesizedArray) {
                    if (!synthesizedSuggestions.includes(synthesizedSuggestion)) {
                      synthesizedSuggestions.push(synthesizedSuggestion);
                    }
                  }
                  for (let replacement of synthesizedSuggestions) {
                    if (isWordAllupper) {
                      replacement = toUpperCase(replacement);
                    }
                    if (isWordCapitalized) {
                      replacement = uppercaseFirstChar(replacement);
                    }
                    replacements2.push(replacement);
                  }
                }
              }
            }
          }
        }
      }
    }
    const matchContainsSomeFinishedSuggestion = match.getSuggestedReplacements().some((k) => !toLowerCase(k).includes('{suggestion}'));
    if (diacriticsMode && replacements.length === 0 && !matchContainsSomeFinishedSuggestion) {
      return null;
    }
    if (replacements.length + replacements2.length === 0 && bSuppressMatch && !matchContainsSomeFinishedSuggestion) {
      return null;
    }
    const message = match.getMessage();
    const ruleMatch = new RuleMatch(match.getRule(), match.getSentence(), match.getFromPos(), match.getToPos(), message, match.getShortMessage());
    ruleMatch.setType(match.getType());

    const definitiveReplacements = [];
    let replacementsUsed = false;
    if (generateSuggestions) {
      for (const s of match.getSuggestedReplacements()) {
        if (s.includes('{suggestion}') || s.includes('{Suggestion}') || s.includes('{SUGGESTION}')) {
          replacementsUsed = true;
          for (const s2 of replacements) {
            if (definitiveReplacements.length >= this.MAX_SUGGESTIONS) {
              break;
            }
            if (s.includes('{suggestion}')) {
              if (!definitiveReplacements.includes(s2)) {
                definitiveReplacements.push(javaReplace(s, '{suggestion}', s2));
              }
            } else if (s.includes('{Suggestion}')) {
              if (!definitiveReplacements.includes(uppercaseFirstChar(s2))) {
                definitiveReplacements.push(javaReplace(s, '{Suggestion}', uppercaseFirstChar(s2)));
              }
            } else if (!definitiveReplacements.includes(toUpperCase(s2))) {
              definitiveReplacements.push(javaReplace(s, '{SUGGESTION}', toUpperCase(s2)));
            }
          }
        } else if (!definitiveReplacements.includes(s)) {
          definitiveReplacements.push(s);
        }
      }
      if (!replacementsUsed) {
        if (replacements.length === 0) {
          replacements2.sort((a, b) => stringComparator.compare(a, b));
          for (const replacement of replacements2) {
            if (!replacements.includes(replacement) && !definitiveReplacements.includes(replacement)) {
              replacements.push(replacement);
            }
          }
        }
        for (const replacement of replacements) {
          if (definitiveReplacements.length >= this.MAX_SUGGESTIONS) {
            break;
          }
          if (!definitiveReplacements.includes(replacement)) {
            definitiveReplacements.push(replacement);
          }
        }
      }
    }
    const removeIdx = definitiveReplacements.indexOf(match.getOriginalErrorStr()); // List#remove(Object)
    if (removeIdx >= 0) definitiveReplacements.splice(removeIdx, 1);
    if (definitiveReplacements.length !== 0) {
      ruleMatch.setSuggestedReplacements([...new Set(definitiveReplacements)]);
    }
    return ruleMatch;
  }

  // Java: AbstractFindSuggestionsFilter#isSuggestionException(AnalyzedTokenReadings)
  isSuggestionException() {
    return false;
  }

  // Java: AbstractFindSuggestionsFilter#getSpellingSuggestionsCached(AnalyzedTokenReadings)
  getSpellingSuggestionsCached(atr) {
    const key = atr.getToken() + '\u0000' + atr.isTagged();
    let cached = this.spellingSuggestionsCache.get(key);
    if (cached === undefined) {
      cached = this.getSpellingSuggestions(atr);
      if (this.spellingSuggestionsCache.size >= MAX_CACHE_SIZE) this.spellingSuggestionsCache.clear(); // eviction never changes results
      this.spellingSuggestionsCache.set(key, cached);
    }
    return cached;
  }

  // Java: AbstractFindSuggestionsFilter#equalWithoutDiacritics(String,String) (private)
  equalWithoutDiacritics(s, t) {
    return equalsIgnoreCase(removeDiacritics(s), removeDiacritics(t));
  }

  // Java: AbstractFindSuggestionsFilter#cleanSuggestion(String)
  cleanSuggestion(s) {
    return s;
  }

  // Java: AbstractFindSuggestionsFilter#getSynthesizer()
  getSynthesizer() {
    return null;
  }

  // Java: AbstractFindSuggestionsFilter#preProcessWrongWord(String)
  preProcessWrongWord(word) {
    return javaReplace(word, ' ', '');
  }
}
