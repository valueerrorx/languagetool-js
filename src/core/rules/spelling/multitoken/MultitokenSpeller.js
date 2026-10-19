// org.languagetool.rules.spelling.multitoken.MultitokenSpeller (ultra-naive speller for multitoken words from a list of words)
import { WeightedSuggestion } from '../morfologik/WeightedSuggestion.js';
import { UncheckedExecutionException } from '../morfologik/MorfologikSpeller.js';
import { getDataBroker } from '../../../resources/LtStatics.js';
import { convertToTitleCaseIteratingChars, isAnagram, isCapitalizedWord, removeDiacritics } from '../../../text/StringTools.js';
import { Pattern } from '../../../../lib/java/regex/index.js';
import { JavaHashMap } from '../../../../lib/java/collections/JavaHashMap.js';
import { BufferedReader, decodeUtf8 } from '../../../../lib/java/io.js';
import { IOException, RuntimeException, Throwable } from '../../../../lib/java/errors.js';
import { levenshteinDistance } from '../../../../lib/java/LevenshteinDistance.js';
import { splitByChar, substringBefore } from '../../../../lib/java/StringUtils.js';
import { charAt, javaReplace, javaSplit, javaTrim, toLowerCase, toUpperCase } from '../../../../lib/java/strings.js';

const MAX_LENGTH_DIFF = 3;
const WHITESPACE_AND_SEP = Pattern.compile('\\p{Zs}+'); // Java: MultitokenSpeller#WHITESPACE_AND_SEP

// Java: MultitokenSpeller#splitBySpace(String)
function splitBySpace(underlinedError) {
  return splitByChar(underlinedError, ' ');
}

// Java: MultitokenSpeller#getNormalizeKey(String)
function getNormalizeKey(word) {
  return javaReplace(removeDiacritics(toLowerCase(word)), '-', ' ');
}

// Java: MultitokenSpeller#addToMap(Map,String,String)
function addToMap(map, key, value) {
  let list = map.get(key);
  if (list === undefined || list === null) {
    list = [];
    map.put(key, list);
  }
  if (!list.includes(value)) {
    list.push(value);
  }
}

// Java: MultitokenSpeller#normalizeSimilarChars(String)
function normalizeSimilarChars(s) {
  return javaReplace(javaReplace(javaReplace(s, 'y', 'i'), 'ko', 'co'), 'ka', 'ca');
}

// Java: MultitokenSpeller#charDistance(char,char); returns a Java float
function charDistance(a, b) {
  // TODO: full keyboard distances
  if (a === b) {
    return 0;
  }
  if (a === 's' && b === 'z' || a === 'z' && b === 's') {
    return Math.fround(0.2);
  }
  if (a === 'b' && b === 'v' || a === 'v' && b === 'b') {
    return Math.fround(0.2);
  }
  if (a === 'i' && b === 'y' || a === 'y' && b === 'i') {
    return 0;
  }
  return 1;
}

// Java: MultitokenSpeller#levenshteinDistance(String,String)
function levenshteinDistanceOf(s1, s2) {
  if (javaReplace(s1, ' ', '') === javaReplace(s2, ' ', '')) {
    return 0;
  }
  let distance = levenshteinDistance(s1, s2);
  const ns1 = normalizeSimilarChars(s1);
  const ns2 = normalizeSimilarChars(s2);
  if (s1 !== ns1 || s2 !== ns2) {
    distance = Math.min(distance, levenshteinDistance(ns1, ns2));
  }
  const anagram = isAnagram(s1, s2);
  // consider transpositions without having a Damerau-Levenshtein method
  if (distance > 1 && anagram) {
    distance--;
  }
  if (distance > 0 && s1.length === s2.length && anagram) {
    distance = 1;
  }
  return distance;
}

// Java: MultitokenSpeller#numberOfCorrectChars(String,String)
function numberOfCorrectChars(s1, s2) {
  const parts1 = javaSplit(s1, ' ');
  const parts2 = javaSplit(s2, ' ');
  let correctTokens = 0;
  if (parts1.length === parts2.length && parts1.length > 1) {
    for (let i = 0; i < parts1.length; i++) {
      if (parts1[i] === parts2[i]) {
        correctTokens += parts1[i].length;
      }
    }
  }
  return correctTokens;
}

// Java: MultitokenSpeller#firstCharacterDistances(String,String); Java Float values
function firstCharacterDistances(s1, s2) {
  const distances = [];
  const parts1 = splitBySpace(s1);
  const parts2 = splitBySpace(s2);
  // for now, only phrase with two tokens
  if (parts1.length === parts2.length && parts1.length === 2) {
    for (let i = 0; i < parts1.length; i++) {
      distances.push(charDistance(parts1[i].charAt(0), parts2[i].charAt(0)));
    }
  } else {
    distances.push(0);
  }
  return distances;
}

// Java: MultitokenSpeller#distancesPerWord(String[],String[],String,String)
function distancesPerWord(parts1, parts2, s1, s2) {
  const distances = [];
  if (parts1.length === parts2.length && parts1.length > 1) {
    for (let i = 0; i < parts1.length; i++) {
      distances.push(levenshteinDistanceOf(parts1[i], parts2[i]));
    }
  } else {
    distances.push(levenshteinDistanceOf(s1, s2));
  }
  return distances;
}

// Java: MultitokenSpeller#maxEditDistance(String,String)
function maxEditDistance(normalizedCandidate, normalizedWord) {
  const totalLength = normalizedWord.length;
  const correctLength = totalLength - numberOfCorrectChars(normalizedCandidate, normalizedWord);
  // reduce((float) 0, Float::sum)
  const firstCharWrong = firstCharacterDistances(normalizedCandidate, normalizedWord).reduce((a, b) => Math.fround(a + b), 0);
  if (correctLength <= 7) {
    return Math.trunc(Math.fround(2 - firstCharWrong)); // (int) (2 - firstCharWrong), float arithmetic
  }
  return Math.trunc(2 + 0.25 * (correctLength - 7) - 0.6 * firstCharWrong); // (int) (double arithmetic)
}

// Java: MultitokenSpeller
export class MultitokenSpeller {
  static FQCN = 'org.languagetool.rules.spelling.multitoken.MultitokenSpeller';

  // Java: MultitokenSpeller(Language,List)
  constructor(lang, filePaths) {
    this.language = lang;
    this.spellingRule = lang.getDefaultSpellingRule();
    this.suggestionsMap = null; // Java: HashMap<Character,HashMap<String,List<String>>>
    this.suggestionsMapNoSpacesKey = null;
    this.candidatePartsByKey = null;
    this.initMultitokenSpeller(filePaths);
  }

  // Java: MultitokenSpeller#getSuggestions(String) / getSuggestions(String,boolean); the Guava cache (maximumSize 20000) returns what a fresh computation returns
  getSuggestions(originalWord, areTokensAcceptedBySpeller = false) {
    originalWord = WHITESPACE_AND_SEP.matcher(originalWord).replaceAll(' ');
    const normalizedWord = originalWord;
    const accepted = areTokensAcceptedBySpeller;
    try {
      return this.computeSuggestions(normalizedWord, accepted);
    } catch (e) {
      // Cache#get(K,Callable): checked exceptions -> ExecutionException (rethrown as RuntimeException), unchecked -> UncheckedExecutionException
      if (e instanceof IOException) throw new RuntimeException(`Error generating suggestions for: ${normalizedWord}`, e);
      if (e instanceof Throwable) throw new UncheckedExecutionException(e);
      throw e;
    }
  }

  // Java: MultitokenSpeller#computeSuggestions(String,boolean)
  computeSuggestions(originalWord, areTokensAcceptedBySpeller) {
    const word = javaReplace(javaReplace(originalWord, '- ', '-'), ' -', '-');
    if (this.discardRunOnWords(word)) {
      return [];
    }
    const normalizedWord = getNormalizeKey(word);
    const weightedCandidates = [];
    // try searching the key
    const normalizedWordNoSpaces = javaReplace(normalizedWord, ' ', '');
    if (this.suggestionsMapNoSpacesKey.has(normalizedWordNoSpaces)) {
      const candidates = this.suggestionsMapNoSpacesKey.get(normalizedWordNoSpaces);
      if (this.stopSearching(candidates, originalWord)) {
        return [];
      }
      for (const candidate of candidates) {
        weightedCandidates.push(new WeightedSuggestion(candidate, 0));
      }
    }
    const firstChar = String.fromCharCode(charAt(normalizedWord, 0));
    const candidatesByKey = this.suggestionsMap.get(firstChar);
    if (weightedCandidates.length === 0 && candidatesByKey !== undefined) {
      const wordParts = splitBySpace(normalizedWord);
      const minLength = word.length - MAX_LENGTH_DIFF;
      const maxLength = word.length + MAX_LENGTH_DIFF;
      for (const normalizedCandidate of candidatesByKey.keySet()) {
        const candidateLength = normalizedCandidate.length;
        if (candidateLength < minLength || candidateLength > maxLength) {
          continue;
        }
        const candidates = candidatesByKey.get(normalizedCandidate);
        if (this.stopSearching(candidates, originalWord)) {
          return [];
        }
        const candidateParts = this.candidatePartsByKey.get(normalizedCandidate);
        const distances = distancesPerWord(candidateParts, wordParts, normalizedCandidate, normalizedWord);
        const totalDistance = distances.reduce((a, b) => (a + b) | 0, 0);
        if (totalDistance < 1) {
          for (const candidate of candidates) {
            weightedCandidates.push(new WeightedSuggestion(candidate, 0));
          }
          // "continue" allows several candidates with different casing
          if (weightedCandidates.length === 2) {
            break;
          }
          continue;
        }
        // for very short candidates, allow only distance=0 (casing and diacritics differences)
        if (candidateLength < 7) {
          continue;
        }
        let exceedsMaxDistancePerToken = false;
        for (let i = 0; i < distances.length; i++) {
          // usually 2, but 1 for short words
          const maxDistance = (wordParts[i].length > 5 && candidateParts[i].length > 4 ? 2 : 1);
          if (distances[i] > maxDistance) {
            exceedsMaxDistancePerToken = true;
            break;
          }
        }
        if (exceedsMaxDistancePerToken) {
          continue;
        }
        if (totalDistance <= maxEditDistance(normalizedCandidate, normalizedWord)) {
          for (const candidate of candidates) {
            weightedCandidates.push(new WeightedSuggestion(candidate, totalDistance));
          }
        }
      }
    }
    for (const additionalSuggestion of this.getAdditionalSuggestions(word)) {
      if (additionalSuggestion.getWord() !== originalWord) {
        weightedCandidates.push(additionalSuggestion);
      } else {
        return [];
      }
    }
    if (weightedCandidates.length === 0) {
      return [];
    }
    weightedCandidates.sort((a, b) => a.compareTo(b));
    const results = [];
    const weightFirstCandidate = weightedCandidates[0].getWeight();
    if (areTokensAcceptedBySpeller && toUpperCase(weightedCandidates[0].getWord()) === originalWord) {
      // don't correct all-upper case words accepted by the speller
      return [];
    }
    if (areTokensAcceptedBySpeller && weightFirstCandidate > 1) {
      return [];
    }
    for (const weightedCandidate of weightedCandidates) {
      // keep only cadidates with the distance of the first candidate
      if (weightedCandidate.getWeight() - weightFirstCandidate < 1
        && !results.includes(weightedCandidate.getWord())) {
        results.push(weightedCandidate.getWord());
      }
    }
    return results;
  }

  // Java: MultitokenSpeller#stopSearching(List,String)
  stopSearching(candidates, originalWord) {
    for (const candidate of candidates) {
      if (this.isException(originalWord, candidate)) {
        return true;
      }
      if (candidate === originalWord) {
        return true;
      }
    }
    for (const candidate of candidates) {
      if (candidate === toLowerCase(candidate)
        && convertToTitleCaseIteratingChars(candidate) === originalWord) {
        return true;
      }
    }
    return false;
  }

  // Java: MultitokenSpeller#initMultitokenSpeller(List)
  initMultitokenSpeller(filePaths) {
    if (this.suggestionsMap !== null) {
      return;
    }
    this.suggestionsMap = new Map();
    this.suggestionsMapNoSpacesKey = new Map();
    this.candidatePartsByKey = new Map();
    for (const filePath of filePaths) {
      const reader = new BufferedReader(decodeUtf8(getDataBroker().getFromResourceDirAsStream(filePath)));
      let lineOriginal;
      while ((lineOriginal = reader.readLine()) !== null) {
        if (lineOriginal.length === 0 || lineOriginal.charAt(0) === '#') { // ignore comments
          continue;
        }
        for (const line of this.language.prepareLineForSpeller(javaTrim(substringBefore(lineOriginal, '#')))) {
          if (line.length === 0) {
            continue;
          }
          const normalizedKey = getNormalizeKey(line);
          if (!normalizedKey.includes(' ')) {
            // Ignore one-token suggestions. They are provided by the spelling rule, or other rules
            continue;
          }
          const firstChar = normalizedKey.charAt(0);
          let suggestionsMapByChar = this.suggestionsMap.get(firstChar);
          if (suggestionsMapByChar === undefined) {
            suggestionsMapByChar = new JavaHashMap();
            this.suggestionsMap.set(firstChar, suggestionsMapByChar);
          }
          if (!suggestionsMapByChar.containsKey(normalizedKey)) {
            this.candidatePartsByKey.set(normalizedKey, splitBySpace(normalizedKey));
          }
          addToMap(suggestionsMapByChar, normalizedKey, line);
          const noSpaces = javaReplace(normalizedKey, ' ', '');
          let l = this.suggestionsMapNoSpacesKey.get(noSpaces);
          if (l === undefined) {
            l = [];
            this.suggestionsMapNoSpacesKey.set(noSpaces, l);
          }
          if (!l.includes(line)) l.push(line);
        }
      }
    }
  }

  // Java: MultitokenSpeller#discardRunOnWords(String)
  discardRunOnWords(underlinedError) {
    const parts = splitBySpace(underlinedError);
    if (parts.length === 2) {
      if (isCapitalizedWord(parts[1])) {
        return false;
      }
      if (parts[0].length === 0 || parts[1].length === 0) {
        // probably emojis, or mal-formed chars
        return true;
      }
      const sugg1a = parts[0].substring(0, parts[0].length - 1);
      const sugg1b = parts[0].substring(parts[0].length - 1) + parts[1];
      if (!this.spellingRule.isMisspelled(sugg1a) && !this.spellingRule.isMisspelled(sugg1b)) {
        return true;
      }
      const sugg2a = parts[0] + parts[1].charAt(0);
      const sugg2b = parts[1].substring(1);
      return !this.spellingRule.isMisspelled(sugg2a) && !this.spellingRule.isMisspelled(sugg2b);
    }
    return false;
  }

  // Java: MultitokenSpeller#isException(String,String)
  isException() {
    return false;
  }

  // Java: MultitokenSpeller#getAdditionalSuggestions(String)
  getAdditionalSuggestions() {
    return [];
  }
}
