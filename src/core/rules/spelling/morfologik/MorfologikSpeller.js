// Java: org.languagetool.rules.spelling.morfologik.MorfologikSpeller
import { Dictionary } from '../../../../lib/fsa/DictionaryLookup.js';
import { Speller } from '../../../../lib/fsa/Speller.js';
import { RuntimeException, Throwable } from '../../../../lib/java/errors.js';
import { toLowerCase, toUpperCase } from '../../../../lib/java/strings.js';
import { StringMatcher } from '../../../patterns/StringMatcher.js';
import { isAllUppercase, isMixedCase, startsWithUppercase, uppercaseFirstChar } from '../../../text/StringTools.js';
import { getDataBroker } from '../../../resources/LtStatics.js';
import { WeightedSuggestion } from './WeightedSuggestion.js';

// Java: SpellingCheckRule#LANGUAGETOOL (same value as the export of SpellingCheckRule.js; kept local so this module stays free of the rule/JLanguageTool imports)
export const LANGUAGETOOL = 'LanguageTool';
// Java: SpellingCheckRule#LANGUAGETOOLER
export const LANGUAGETOOLER = 'LanguageTooler';

// Java: com.google.common.util.concurrent.UncheckedExecutionException
export class UncheckedExecutionException extends RuntimeException {
  static FQCN = 'com.google.common.util.concurrent.UncheckedExecutionException';
}

const dictCache = new Map(); // Java: MorfologikSpeller#dictCache (expiry after 10 minutes is not observable)

// Java: MorfologikSpeller#dictCache CacheLoader#load(String)
function load(fileInClassPath) {
  const dataBroker = getDataBroker();
  if (dataBroker.resourceExists(fileInClassPath)) {
    return Dictionary.read(dataBroker.getFromResourceDirAsUrl(fileInClassPath));
  }
  return Dictionary.readPath(fileInClassPath);
}

// Java: MorfologikSpeller#getDictionaryWithCaching(String)
export function getDictionaryWithCaching(fileInClassPath) {
  if (!dictCache.has(fileInClassPath)) {
    try {
      dictCache.set(fileInClassPath, load(fileInClassPath));
    } catch (e) {
      // LoadingCache#getUnchecked: loader exceptions become UncheckedExecutionException(cause)
      if (e instanceof Throwable) throw new UncheckedExecutionException(e);
      throw e;
    }
  }
  return dictCache.get(fileInClassPath);
}

// Java: MorfologikSpeller
export class MorfologikSpeller {
  static FQCN = 'org.languagetool.rules.spelling.morfologik.MorfologikSpeller';

  // Java: MorfologikSpeller#MorfologikSpeller(String,int) / (String) / (Dictionary,int)
  constructor(fileOrDictionary, maxEditDistance = 1) {
    const dictionary = typeof fileOrDictionary === 'string' ? getDictionaryWithCaching(fileOrDictionary) : fileOrDictionary;
    if (maxEditDistance <= 0) {
      throw new RuntimeException(`maxEditDistance must be > 0: ${maxEditDistance}`);
    }
    this.dictionary = dictionary;
    this.maxEditDistance = maxEditDistance;
    this.speller = new Speller(dictionary, maxEditDistance);
  }

  // Java: MorfologikSpeller#getDictionaryWithCaching(String)
  static getDictionaryWithCaching(fileInClassPath) {
    return getDictionaryWithCaching(fileInClassPath);
  }

  // Java: MorfologikSpeller#isMisspelled(String)
  isMisspelled(word) {
    if (word.length === 0 || LANGUAGETOOL === word || LANGUAGETOOLER === word) {
      return false;
    }
    return this.speller.isMisspelled(word);
  }

  // Java: MorfologikSpeller#findReplacements(String)
  findReplacements(word) {
    return this.speller.findReplacements(word);
  }

  // Java: MorfologikSpeller#findSimilarWords(String)
  findSimilarWords(word) {
    return this.speller.findSimilarWords(word);
  }

  // Java: MorfologikSpeller#getSpeller()
  getSpeller() {
    return this.speller;
  }

  // Java: MorfologikSpeller#getSuggestions(String)
  getSuggestions(word) {
    const suggestions = [];
    if (word.length > StringMatcher.MAX_MATCH_LENGTH) {
      return suggestions;
    }
    // needs to be reset every time, possible bug: HMatrix for distance computation is not reset;
    // output changes when reused
    const speller = new Speller(this.dictionary, this.maxEditDistance);
    if (word.length < 50) { // slow for long words (the limit is arbitrary)
      const replacementCandidates = speller.findReplacementCandidates(word);
      for (const candidate of replacementCandidates) {
        suggestions.push(new WeightedSuggestion(candidate.getWord(), candidate.getDistance()));
      }
    }
    const runOnCandidates = speller.replaceRunOnWordCandidates(word);
    for (const runOnCandidate of runOnCandidates) {
      suggestions.push(new WeightedSuggestion(runOnCandidate.getWord(), runOnCandidate.getDistance()));
    }

    // all upper-case suggestions if necessary
    if (this.dictionary.metadata.isConvertingCase() && isAllUppercase(word)) {
      for (let i = 0; i < suggestions.length; i++) {
        const sugg = suggestions[i];
        let allUppercase = toUpperCase(sugg.getWord());
        // do not use capitalized word if it matches the original word or it's mixed case
        if (allUppercase === word || isMixedCase(suggestions[i].getWord())) {
          allUppercase = sugg.getWord();
        }
        // remove duplicates
        const auxIndex = this.getSuggestionIndex(suggestions, allUppercase);
        if (auxIndex > i) {
          suggestions.splice(auxIndex, 1);
        }
        if (auxIndex > -1 && auxIndex < i) {
          suggestions.splice(i, 1);
          i--;
        } else {
          suggestions[i] = new WeightedSuggestion(allUppercase, sugg.getWeight());
        }
      }
    // capitalize suggestions if necessary
    } else if (this.dictionary.metadata.isConvertingCase() && startsWithUppercase(word)) {
      for (let i = 0; i < suggestions.length; i++) {
        const sugg = suggestions[i];
        let uppercaseFirst = uppercaseFirstChar(sugg.getWord());
        // do not use capitalized word if it matches the original word or it's mixed case
        if (uppercaseFirst === word || isMixedCase(suggestions[i].getWord())) {
          uppercaseFirst = sugg.getWord();
        }
        // remove capitalized duplicates
        const auxIndex = this.getSuggestionIndex(suggestions, uppercaseFirst);
        if (auxIndex > i) {
          suggestions.splice(auxIndex, 1);
        }
        if (auxIndex > -1 && auxIndex < i) {
          suggestions.splice(i, 1);
          i--;
        } else {
          suggestions[i] = new WeightedSuggestion(uppercaseFirst, sugg.getWeight());
        }
      }
    }
    return suggestions;
  }

  // Java: MorfologikSpeller#getSuggestionIndex(List,String)
  getSuggestionIndex(suggestions, uppercaseFirst) {
    let i = 0;
    for (const suggestion of suggestions) {
      if (suggestion.getWord() === uppercaseFirst) {
        return i;
      }
      i++;
    }
    return -1;
  }

  // Java: MorfologikSpeller#convertsCase()
  convertsCase() {
    return this.speller.convertsCase();
  }

  // Java: MorfologikSpeller#toString()
  toString() {
    return `dist=${this.maxEditDistance}`;
  }

  // Java: MorfologikSpeller#getFrequency(String)
  getFrequency(word) {
    let freq = this.speller.getFrequency(word);
    if (freq === 0 && word !== toLowerCase(word)) {
      freq = this.speller.getFrequency(toLowerCase(word));
    }
    return freq;
  }
}
