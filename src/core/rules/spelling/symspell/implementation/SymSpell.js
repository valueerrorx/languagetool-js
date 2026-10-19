// org.languagetool.rules.spelling.symspell.implementation.SymSpell (MIT, Hampus Londogard; counts are Java longs = BigInt)
import { readFileSync, existsSync } from 'node:fs';
import { EditDistance } from './EditDistance.js';
import { SuggestItem } from './SuggestItem.js';
import { SuggestionStage } from './SuggestionStage.js';
import { arrayGet } from '../../../../../lib/java/arrays.js';
import { BufferedReader } from '../../../../../lib/java/io.js';
import { decodeUtf8Java } from '../../../../../lib/java/charset.js';
import { IllegalArgumentException, IOException, NullPointerException, NumberFormatException } from '../../../../../lib/java/errors.js';
import { JavaEnum } from '../../../../../lib/java/JavaEnum.js';
import { Long } from '../../../../../lib/java/long.js';
import { log10, pow } from '../../../../../lib/java/libm.js';
import { Pattern } from '../../../../../lib/java/regex/index.js';
import { isWhitespace } from '../../../../../lib/java/Character.js';
import { javaReplace, javaReplaceAll, javaSplit, toLowerCase } from '../../../../../lib/java/strings.js';

// Java: SymSpell.Verbosity
export class Verbosity extends JavaEnum {
  static FQCN = 'org.languagetool.rules.spelling.symspell.implementation.SymSpell.Verbosity';

  // Java: Verbosity.values()
  static values() {
    return [Verbosity.Top, Verbosity.Closest, Verbosity.All];
  }

  // Java: Verbosity.valueOf(String)
  static valueOf(name) {
    const v = Verbosity.values().find((x) => x.name() === name);
    if (v === undefined) throw new IllegalArgumentException(`No enum constant ${Verbosity.FQCN}.${name}`);
    return v;
  }
}
Verbosity.Top = new Verbosity('Top', 0);
Verbosity.Closest = new Verbosity('Closest', 1);
Verbosity.All = new Verbosity('All', 2);

const defaultMaxEditDistance = 2;
const defaultPrefixLength = 7;
const defaultCountThreshold = 1;
const defaultInitialCapacity = 16;
const defaultCompactLevel = 5;

// Java: SymSpell#N (number of all words in the corpus used to generate the frequency dictionary)
const N = 1024908267229n;

// Java: SymSpell#parseWords(String) pattern
const WORD_PATTERN = Pattern.compile("['’\\p{L}-[_]]+");

// Java: SymSpell.SegmentedSuggestion
export class SegmentedSuggestion {
  // Java: SegmentedSuggestion()
  constructor() {
    this.segmentedString = '';
    this.correctedString = '';
    this.distanceSum = 0;
    this.probabilityLogSum = 0.0;
  }
}

// Java: SymSpell
export class SymSpell {
  static FQCN = 'org.languagetool.rules.spelling.symspell.implementation.SymSpell';
  static Verbosity = Verbosity;
  static SegmentedSuggestion = SegmentedSuggestion;

  // Java: SymSpell(int,int,int,int)
  constructor(initialCapacity, maxDictionaryEditDistance, prefixLength, countThreshold) {
    if (initialCapacity < 0) {
      initialCapacity = defaultInitialCapacity;
    }
    if (maxDictionaryEditDistance < 0) {
      maxDictionaryEditDistance = defaultMaxEditDistance;
    }
    if (prefixLength < 1 || prefixLength <= maxDictionaryEditDistance) {
      prefixLength = defaultPrefixLength;
    }
    if (countThreshold < 0) {
      countThreshold = defaultCountThreshold;
    }
    this.distanceAlgorithm = EditDistance.DistanceAlgorithm.Damerau;
    this.maxLength = 0;
    this.deletes = null; // Java: Map<Integer,String[]>
    this.belowThresholdWords = new Map(); // Java: Map<String,Long>
    this.initialCapacity = initialCapacity;
    this.words = new Map(); // Java: Map<String,Long>
    this.maxDictionaryEditDistance = maxDictionaryEditDistance;
    this.prefixLength = prefixLength;
    this.countThreshold = BigInt(countThreshold);
    this.compactMask = (0xffffffff >> (3 + defaultCompactLevel)) << 2;
  }

  // Java: SymSpell#createDictionaryEntry(String,long,SuggestionStage)
  createDictionaryEntry(key, count, staging) {
    count = BigInt(count);
    if (count <= 0n) {
      if (this.countThreshold > 0n) {
        return false; // no point doing anything if count is zero, as it can't change anything
      }
      count = 0n;
    }
    let countPrevious;

    // look first in below threshold words, update count, and allow promotion to correct spelling word if count reaches threshold
    // threshold must be >1 for there to be the possibility of low threshold words
    if (this.countThreshold > 1n && this.belowThresholdWords.has(key)) {
      countPrevious = this.belowThresholdWords.get(key);
      // calculate new count for below threshold word
      count = (Long.MAX_VALUE - countPrevious > count) ? countPrevious + count : Long.MAX_VALUE;
      // has reached threshold - remove from below threshold collection (it will be added to correct words below)
      if (count >= this.countThreshold) {
        this.belowThresholdWords.delete(key);
      } else {
        this.belowThresholdWords.set(key, count);
        return false;
      }
    } else if (this.words.has(key)) {
      countPrevious = this.words.get(key);
      // just update count if it's an already added above threshold word
      count = (Long.MAX_VALUE - countPrevious > count) ? countPrevious + count : Long.MAX_VALUE;
      this.words.set(key, count);
      return false;
    } else if (count < this.countThreshold) {
      // new or existing below threshold word
      this.belowThresholdWords.set(key, count);
      return false;
    }

    // what we have at this point is a new, above threshold word
    this.words.set(key, count);
    if (key === "can't") {
      process.stdout.write('Added to words..!\n');
    }

    // edits/suggestions are created only once, no matter how often word occurs
    // edits/suggestions are created only as soon as the word occurs in the corpus,
    // even if the same term existed before in the dictionary as an edit from another word
    if (key.length > this.maxLength) {
      this.maxLength = key.length;
    }

    // create deletes
    const edits = this.editsPrefix(key);

    // if not staging suggestions, put directly into main data structure
    if (staging !== null && staging !== undefined) {
      edits.forEach((del) => staging.add(this.getStringHash(del), key));
    } else {
      if (this.deletes === null) {
        this.deletes = new Map();
      }
      edits.forEach((del) => {
        const deleteHash = this.getStringHash(del);
        let suggestions;
        if (this.deletes.has(deleteHash)) {
          suggestions = this.deletes.get(deleteHash);
          const newSuggestions = suggestions.slice();
          newSuggestions.push(null); // Arrays.copyOf(suggestions, length + 1)
          this.deletes.set(deleteHash, newSuggestions);
          suggestions = newSuggestions;
        } else {
          suggestions = new Array(1).fill(null);
          this.deletes.set(deleteHash, suggestions);
        }
        suggestions[suggestions.length - 1] = key;
      });
    }
    return true;
  }

  // Java: SymSpell#loadDictionary(String,int,int) / (InputStream,int,int) / (BufferedReader,int,int)
  loadDictionary(corpus, termIndex, countIndex) {
    if (typeof corpus === 'string') {
      if (!existsSync(corpus)) {
        return false;
      }
      let br = null;
      try {
        br = new BufferedReader(decodeUtf8Java(readFileSync(corpus)));
      } catch (ex) {
        if (!(ex instanceof IOException)) throw ex;
        process.stdout.write(`${ex.message}\n`);
      }
      if (br === null) {
        return false;
      }
      return this.loadDictionary(br, termIndex, countIndex);
    }
    if (corpus === null || corpus === undefined) {
      return false;
    }
    if (typeof corpus.readLine !== 'function') {
      // InputStream: wrapped in a UTF-8 reader
      return this.loadDictionary(new BufferedReader(decodeUtf8Java(corpus)), termIndex, countIndex);
    }
    const br = corpus;
    const staging = new SuggestionStage(16384);
    try {
      for (let line; (line = br.readLine()) !== null;) {
        const lineParts = javaSplit(line, '\\s');
        if (lineParts.length >= 2) {
          const key = arrayGet(lineParts, termIndex);
          let count;
          try {
            count = Long.parseLong(arrayGet(lineParts, countIndex));
            this.createDictionaryEntry(key, count, staging);
          } catch (ex) {
            if (!(ex instanceof NumberFormatException)) throw ex;
            process.stdout.write(`${ex.message}\n`);
          }
        }
      }
    } catch (ex) {
      if (!(ex instanceof IOException)) throw ex;
      process.stdout.write(`${ex.message}\n`);
    }
    if (this.deletes === null) {
      this.deletes = new Map();
    }
    this.commitStaged(staging);
    return true;
  }

  // Java: SymSpell#createDictionary(String)
  createDictionary(corpus) {
    if (!existsSync(corpus)) {
      return false;
    }
    const staging = new SuggestionStage(16384);
    try {
      const br = new BufferedReader(decodeUtf8Java(readFileSync(corpus)));
      for (let line; (line = br.readLine()) !== null;) {
        this.parseWords(line).forEach((key) => this.createDictionaryEntry(key, 1, staging));
      }
    } catch (ex) {
      if (!(ex instanceof IOException)) throw ex;
      process.stdout.write(`${ex.message}\n`);
    }
    if (this.deletes === null) {
      this.deletes = new Map();
    }
    this.commitStaged(staging);
    return true;
  }

  // Java: SymSpell#purgeBelowThresholdWords()
  purgeBelowThresholdWords() {
    this.belowThresholdWords = new Map();
  }

  // Java: SymSpell#commitStaged(SuggestionStage)
  commitStaged(staging) {
    if (this.deletes === null) {
      this.deletes = new Map();
    }
    staging.commitTo(this.deletes);
  }

  // Java: SymSpell#lookup(String,Verbosity) / lookup(String,Verbosity,int)
  lookup(input, verbosity, maxEditDistance = this.maxDictionaryEditDistance) {
    // verbosity=Top: the suggestion with the highest term frequency of the suggestions of smallest edit distance found
    // verbosity=Closest: all suggestions of smallest edit distance found, the suggestions are ordered by term frequency
    // verbosity=All: all suggestions <= maxEditDistance, the suggestions are ordered by edit distance, then by term frequency (slower, no early termination)

    // maxEditDistance used in lookup can't be bigger than the maxDictionaryEditDistance
    // used to construct the underlying dictionary structure.
    if (maxEditDistance > this.maxDictionaryEditDistance) {
      throw new IllegalArgumentException(`Dist to big: ${maxEditDistance}`);
    }

    const suggestions = [];
    const inputLen = input.length;

    // early exit - word is too big to possibly match any words
    if (inputLen - maxEditDistance > this.maxLength) {
      return suggestions;
    }

    // deletes we've considered already
    const consideredDeletes = new Set();
    // suggestions we've considered already
    const consideredSuggestions = new Set();
    let suggestionCount;

    // quick look for exact match
    if (this.words.has(input)) {
      suggestionCount = this.words.get(input);
      suggestions.push(new SuggestItem(input, 0, suggestionCount));
      // early exit - return exact match, unless caller wants all matches
      if (verbosity !== Verbosity.All) {
        return suggestions;
      }
    }
    consideredSuggestions.add(input); // input considered in above.

    let maxEditDistance2 = maxEditDistance;
    let candidatePointer = 0;
    const candidates = [];

    // add original prefix
    let inputPrefixLen = inputLen;
    if (inputPrefixLen > this.prefixLength) {
      inputPrefixLen = this.prefixLength;
      candidates.push(input.substring(0, inputPrefixLen));
    } else {
      candidates.push(input);
    }

    const distanceComparer = new EditDistance(input, this.distanceAlgorithm);
    while (candidatePointer < candidates.length) {
      const candidate = candidates[candidatePointer++];
      const candidateLen = candidate.length;
      const lengthDiff = inputPrefixLen - candidateLen;

      // early termination if distance higher than suggestion distance
      if (lengthDiff > maxEditDistance2) {
        // skip to next candidate if Verbosity.All, look no further if Verbosity.Top or Closest
        // (candidates are ordered by delete distance, so none are closer than current)
        if (verbosity === Verbosity.All) {
          continue;
        }
        break;
      }

      // read candidate entry from dictionary
      if (this.deletes === null) {
        throw new NullPointerException('Cannot invoke "java.util.Map.containsKey(Object)" because "this.deletes" is null');
      }
      if (this.deletes.has(this.getStringHash(candidate))) {
        const dictSuggestions = this.deletes.get(this.getStringHash(candidate));
        // iterate through suggestions (to other correct dictionary items) of delete item and add them to suggestion list
        for (const suggestion of dictSuggestions) {
          if (suggestion === input) {
            continue;
          }
          const suggestionLen = suggestion.length;

          if ((Math.abs(suggestionLen - inputLen) > maxEditDistance2) // input/suggestion diff > allowed/current best distance
            || (suggestionLen < candidateLen) // sugg must be for a different delete String, in same bin only because of hash collision
            || (suggestionLen === candidateLen && suggestion !== candidate)) { // if sugg len = delete len, then it either equals delete or is in same bin only because of hash collision
            continue;
          }

          const suggPrefixLen = Math.min(suggestionLen, this.prefixLength);
          if (suggPrefixLen > inputPrefixLen && (suggPrefixLen - candidateLen) > maxEditDistance2) {
            continue;
          }

          // True Damerau-Levenshtein Edit Distance: adjust distance, if both distances > 0
          // We allow simultaneous edits (deletes) of maxEditDistance on on both the dictionary and the input term.
          // For replaces and adjacent transposes the resulting edit distance stays <= maxEditDistance.
          // For inserts and deletes the resulting edit distance might exceed maxEditDistance.
          // To prevent suggestions of a higher edit distance, we need to calculate the resulting edit distance, if there are simultaneous edits on both sides.
          // Example: (bank==bnak and bank==bink, but bank!=kanb and bank!=xban and bank!=baxn for maxEditDistance=1)
          // Two deletes on each side of a pair makes them all equal, but the first two pairs have edit distance=1, the others edit distance=2.
          let distance;
          let min = 0;
          if (candidateLen === 0) {
            // suggestions which have no common chars with input (inputLen<=maxEditDistance && suggestionLen<=maxEditDistance)
            distance = Math.max(inputLen, suggestionLen);
            if (distance > maxEditDistance2 || !addIfAbsent(consideredSuggestions, suggestion)) {
              continue;
            }
          } else if (suggestionLen === 1) {
            if (input.indexOf(suggestion.charAt(0)) < 0) {
              distance = inputLen;
            } else {
              distance = inputLen - 1;
            }
            if (distance > maxEditDistance2 || !addIfAbsent(consideredSuggestions, suggestion)) {
              continue;
            }
          } else if (
            // number of edits in prefix == maxeditdistance  && no identical suffix
            // , then editdistance > maxEditDistance and no need for Levenshtein calculation
            //      (inputLen >= prefixLength) && (suggestionLen >= prefixLength)
            ((this.prefixLength - maxEditDistance === candidateLen)
              && (((min = Math.min(inputLen, suggestionLen) - this.prefixLength) > 1)
                && !(input.substring(inputLen + 1 - min) === suggestion.substring(suggestionLen + 1 - min))))
            || ((min > 0) && (input.charAt(inputLen - min) !== suggestion.charAt(suggestionLen - min))
              && ((input.charAt(inputLen - min - 1) !== suggestion.charAt(suggestionLen - min))
                || (input.charAt(inputLen - min) !== suggestion.charAt(suggestionLen - min - 1))))) {
            continue;
          } else {
            // deleteInSuggestionPrefix is somewhat expensive, and only pays off when verbosity is Top or Closest.
            if ((verbosity !== Verbosity.All && !this.deleteInSuggestionPrefix(candidate, candidateLen, suggestion, suggestionLen))
              || !addIfAbsent(consideredSuggestions, suggestion)) {
              continue;
            }
            distance = distanceComparer.compare(suggestion, maxEditDistance2);
            if (distance < 0) {
              continue;
            }
          }

          // save some time
          // do not process higher distances than those already found, if verbosity<All (note: maxEditDistance2 will always equal maxEditDistance when Verbosity.All)
          if (distance <= maxEditDistance2) {
            suggestionCount = this.words.get(suggestion);
            const si = new SuggestItem(suggestion, distance, suggestionCount);
            if (suggestions.length > 0) {
              if (verbosity === Verbosity.Closest) {
                // we will calculate DamLev distance only to the smallest found distance so far
                if (distance < maxEditDistance2) {
                  suggestions.length = 0;
                }
              } else if (verbosity === Verbosity.Top) {
                if (distance < maxEditDistance2 || suggestionCount > suggestions[0].count) {
                  maxEditDistance2 = distance;
                  suggestions[0] = si;
                }
                continue;
              }
            }
            if (verbosity !== Verbosity.All) {
              maxEditDistance2 = distance;
            }
            suggestions.push(si);
          }
        }
      }

      // add edits
      // derive edits (deletes) from candidate (input) and add them to candidates list
      // this is a recursive process until the maximum edit distance has been reached
      if ((lengthDiff < maxEditDistance) && (candidateLen <= this.prefixLength)) {
        // save some time
        // do not create edits with edit distance smaller than suggestions already found
        if (verbosity !== Verbosity.All && lengthDiff >= maxEditDistance2) {
          continue;
        }

        for (let i = 0; i < candidateLen; i++) {
          const del = candidate.substring(0, i) + candidate.substring(i + 1);
          if (addIfAbsent(consideredDeletes, del)) {
            candidates.push(del);
          }
        }
      }
    }

    // sort by ascending edit distance, then by descending word frequency
    if (suggestions.length > 1) {
      suggestions.sort((a, b) => a.compareTo(b));
    }
    return suggestions;
  }

  // Java: SymSpell#lookupCompound(String,int) / lookupCompound(String)
  lookupCompound(input, maxEditDistance = this.maxDictionaryEditDistance) {
    // parse input String into single terms
    if (maxEditDistance > this.maxDictionaryEditDistance) {
      throw new IllegalArgumentException(`Dist to big ${maxEditDistance}`);
    }
    const termList1 = this.parseWords(input);

    let suggestions; // suggestions for a single term
    const suggestionParts = []; // 1 line with separate parts
    let suggestionsCombi;
    let editDistance;

    // translate every term to its best suggestion, otherwise it remains unchanged
    let lastCombi = false;
    for (let i = 0; i < termList1.length; i++) { // For each term do loop
      suggestions = this.lookup(termList1[i], Verbosity.Top, maxEditDistance); // Get the normal suggestions,
      // combi check, always before split. i > 0 because we can't split on zero obviously.
      if ((i > 0) && !lastCombi) {
        suggestionsCombi = this.lookup(termList1[i - 1] + termList1[i], Verbosity.Top, maxEditDistance);

        if (suggestionsCombi.length !== 0) {
          const best1 = suggestionParts[suggestionParts.length - 1]; // Grabbing the currently last part of sentence (i-1)
          let best2;
          if (suggestions.length !== 0) {
            best2 = suggestions[0]; // Getting the best suggestion of term (i)
          } else {
            best2 = new SuggestItem(termList1[i], maxEditDistance + 1, 0n); // No suggestion -> it might be correct? (i)
          }

          editDistance = new EditDistance(`${termList1[i - 1]} ${termList1[i]}`, EditDistance.DistanceAlgorithm.Damerau);
          if (suggestionsCombi[0].distance + 1 < editDistance.DamerauLevenshteinDistance(`${best1.term} ${best2.term}`, maxEditDistance)) {
            suggestionsCombi[0].distance++;
            suggestionParts[suggestionParts.length - 1] = suggestionsCombi[0]; // Replacing value.
            lastCombi = true;
            continue;
          }
        }
      }

      lastCombi = false;

      // always split terms without suggestion / never split terms with suggestion ed=0 / never split single char terms
      if (suggestions.length !== 0 && ((suggestions[0].distance === 0) || (termList1[i].length === 1))) {
        // choose best suggestion
        suggestionParts.push(suggestions[0]);
      } else {
        // if no perfect suggestion, split word into pairs
        const suggestionsSplit = [];

        // add original term
        if (suggestions.length !== 0) {
          suggestionsSplit.push(suggestions[0]);
        }

        if (termList1[i].length > 1) {
          for (let j = 1; j < termList1[i].length; j++) { // Begin splitting! j=1 -> last. Shouldnt it be j.size - 1?
            const part1 = termList1[i].substring(0, j);
            const part2 = termList1[i].substring(j);
            let suggestionSplit;
            const suggestions1 = this.lookup(part1, Verbosity.Top, maxEditDistance);

            if (suggestions1.length !== 0) {
              if (suggestions.length !== 0 && suggestions[0].equals(suggestions1[0])) {
                continue; // suggestion top = split_1 suggestion top
              }
              const suggestions2 = this.lookup(part2, Verbosity.Top, maxEditDistance);

              if (suggestions2.length !== 0) {
                if (suggestions.length !== 0 && suggestions[0].equals(suggestions2[0])) {
                  continue; // suggestion top = split_2 suggestion top
                }

                // select best suggestion for split pair
                const split = `${suggestions1[0].term} ${suggestions2[0].term}`;
                editDistance = new EditDistance(termList1[i], EditDistance.DistanceAlgorithm.Damerau);
                suggestionSplit = new SuggestItem(split,
                  editDistance.DamerauLevenshteinDistance(split, maxEditDistance),
                  suggestions1[0].count < suggestions2[0].count ? suggestions1[0].count : suggestions2[0].count);
                if (suggestionSplit.distance >= 0) {
                  suggestionsSplit.push(suggestionSplit);
                }

                // early termination of split
                if (suggestionSplit.distance === 1) {
                  break;
                }
              }
            }
          }

          if (suggestionsSplit.length !== 0) {
            // select best suggestion for split pair
            suggestionsSplit.sort((a, b) => a.compareTo(b));
            suggestionParts.push(suggestionsSplit[0]);
          } else {
            suggestionParts.push(new SuggestItem(termList1[i], 0, BigInt(maxEditDistance + 1)));
          }
        } else {
          suggestionParts.push(new SuggestItem(termList1[i], 0, BigInt(maxEditDistance + 1)));
        }
      }
    }

    const suggestion = new SuggestItem('', 2147483647, Long.MAX_VALUE);

    let s = '';
    for (const si of suggestionParts) {
      s += `${si.term} `;
      suggestion.count = suggestion.count < si.count ? suggestion.count : si.count;
    }

    suggestion.term = javaReplaceAll(s, '\\s+$', '');
    editDistance = new EditDistance(suggestion.term, EditDistance.DistanceAlgorithm.Damerau);
    suggestion.distance = editDistance.DamerauLevenshteinDistance(input, this.maxDictionaryEditDistance);

    return [suggestion];
  }

  // Java: SymSpell#deleteInSuggestionPrefix(String,int,String,int)
  deleteInSuggestionPrefix(del, deleteLen, suggestion, suggestionLen) {
    if (deleteLen === 0) {
      return true;
    }
    if (this.prefixLength < suggestionLen) {
      suggestionLen = this.prefixLength;
    }
    let j = 0;
    for (let i = 0; i < deleteLen; i++) {
      const delChar = del.charAt(i);
      while (j < suggestionLen && delChar !== suggestion.charAt(j)) {
        j++;
      }
      if (j === suggestionLen) {
        return false;
      }
    }
    return true;
  }

  // Java: SymSpell#parseWords(String)
  parseWords(text) {
    // \p{L} UTF-8 characters, plus "_", does not split words at apostrophes.
    const match = WORD_PATTERN.matcher(toLowerCase(text));
    const matches = [];
    while (match.find()) {
      matches.push(match.group());
    }
    return matches;
  }

  // Java: SymSpell#edits(String,int,HashSet)
  edits(word, editDistance, deleteWords) {
    editDistance++;
    if (word.length > 1) {
      for (let i = 0; i < word.length; i++) {
        const del = word.substring(0, i) + word.substring(i + 1);
        if (addIfAbsent(deleteWords, del)) {
          // recursion, if maximum edit distance not yet reached
          if (editDistance < this.maxDictionaryEditDistance) {
            this.edits(del, editDistance, deleteWords);
          }
        }
      }
    }
    return deleteWords;
  }

  // Java: SymSpell#editsPrefix(String)
  editsPrefix(key) {
    const hashSet = new Set();
    if (key.length <= this.maxDictionaryEditDistance) {
      hashSet.add('');
    }
    if (key.length > this.prefixLength) {
      key = key.substring(0, this.prefixLength);
    }
    hashSet.add(key);
    return this.edits(key, 0, hashSet);
  }

  // Java: SymSpell#getStringHash(String); the long arithmetic is reduced to its low 32 bits (cast to int at the end)
  getStringHash(s) {
    const len = s.length;
    let lenMask = len;
    if (lenMask > 3) {
      lenMask = 3;
    }

    let hash = 2166136261 | 0;
    for (let i = 0; i < len; i++) {
      hash ^= s.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }

    hash &= this.compactMask;
    hash |= lenMask;
    return hash | 0;
  }

  // Java: SymSpell#wordSegmentation(String) / (String,int) / (String,int,int)
  wordSegmentation(input, maxEditDistance = this.maxDictionaryEditDistance, maxSegmentationWordLength = this.maxLength) {
    if (input.length === 0) {
      return new SegmentedSuggestion();
    }
    const arraySize = Math.min(maxSegmentationWordLength, input.length);
    const compositions = new Array(arraySize);
    for (let i = 0; i < arraySize; i++) {
      compositions[i] = new SegmentedSuggestion();
    }

    let circularIndex = -1;

    // outer loop (column): all possible part start positions
    for (let j = 0; j < input.length; j++) {
      // inner loop (row): all possible part lengths (from start position): part can't be bigger than longest word in dictionary (other than long unknown word)
      const imax = Math.min(input.length - j, maxSegmentationWordLength);
      for (let i = 1; i <= imax; i++) {
        // get top spelling correction/ed for part
        let part = input.substring(j, j + i);
        let separatorLength = 0;
        let topEd = 0;
        let topProbabilityLog;
        let topResult;

        if (isWhitespace(part.charCodeAt(0))) {
          // remove space for levensthein calculation
          part = part.substring(1);
        } else {
          // add ed+1: space did not exist, had to be inserted
          separatorLength = 1;
        }

        // remove space from part1, add number of removed spaces to topEd
        topEd += part.length;
        // remove space
        part = javaReplace(part, ' ', ''); // =System.Text.RegularExpressions.Regex.Replace(part1, @"\s+", "");
        // add number of removed spaces to ed
        topEd -= part.length;

        const results = this.lookup(part, Verbosity.Top, maxEditDistance);
        if (results.length > 0) {
          topResult = results[0].term;
          topEd += results[0].distance;
          // Naive Bayes Rule
          // we assume the word probabilities of two words to be independent
          // therefore the resulting probability of the word combination is the product of the two word probabilities

          // instead of computing the product of probabilities we are computing the sum of the logarithm of probabilities
          // because the probabilities of words are about 10^-10, the product of many such small numbers could exceed (underflow) the floating number range and become zero
          // log(ab)=log(a)+log(b)
          topProbabilityLog = log10(Number(results[0].count) / Number(N));
        } else {
          topResult = part;
          // default, if word not found
          // otherwise long input text would win as long unknown word (with ed=edmax+1 ), although there there should many spaces inserted
          topEd += part.length;
          topProbabilityLog = log10(10.0 / (Number(N) * pow(10.0, part.length)));
        }

        const destinationIndex = ((i + circularIndex) % arraySize);

        // set values in first loop
        if (j === 0) {
          compositions[destinationIndex].segmentedString = part;
          compositions[destinationIndex].correctedString = topResult;
          compositions[destinationIndex].distanceSum = topEd;
          compositions[destinationIndex].probabilityLogSum = topProbabilityLog;
        } else if ((i === maxSegmentationWordLength)
          // replace values if better probabilityLogSum, if same edit distance OR one space difference
          || (((compositions[circularIndex].distanceSum + topEd === compositions[destinationIndex].distanceSum) || (compositions[circularIndex].distanceSum + separatorLength + topEd === compositions[destinationIndex].distanceSum)) && (compositions[destinationIndex].probabilityLogSum < compositions[circularIndex].probabilityLogSum + topProbabilityLog))
          // replace values if smaller edit distance
          || (compositions[circularIndex].distanceSum + separatorLength + topEd < compositions[destinationIndex].distanceSum)) {
          compositions[destinationIndex].segmentedString = `${compositions[circularIndex].segmentedString} ${part}`;
          compositions[destinationIndex].correctedString = `${compositions[circularIndex].correctedString} ${topResult}`;
          compositions[destinationIndex].distanceSum = compositions[circularIndex].distanceSum + topEd;
          compositions[destinationIndex].probabilityLogSum = compositions[circularIndex].probabilityLogSum + topProbabilityLog;
        }
      }
      circularIndex++;
      if (circularIndex >= arraySize) {
        circularIndex = 0;
      }
    }
    return arrayGet(compositions, circularIndex);
  }
}

// Java: HashSet#add(E) (true when the element was absent)
function addIfAbsent(set, e) {
  if (set.has(e)) return false;
  set.add(e);
  return true;
}
