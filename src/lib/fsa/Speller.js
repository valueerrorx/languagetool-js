// morfologik-speller 2.x Speller, HMatrix (port of the pinned morfologik-speller jar, checked against its bytecode).
import { ArrayIndexOutOfBoundsException, IllegalArgumentException } from '../java/errors.js';
import { getType, isDigit, isLetter, isLowerCase, isUpperCase, toLowerCase as charToLowerCase, toUpperCase as charToUpperCase } from '../java/Character.js';
import { toLowerCase, toUpperCase } from '../java/strings.js';
import { JavaHashMap } from '../java/collections/JavaHashMap.js';
import { Normalizer } from '../java/Normalizer.js';
import { ByteSequenceIterator, FSATraversal, MatchResult } from './FSA.js';
import { applyReplacements } from './DictionaryLookup.js';

const MAX_WORD_LENGTH = 120; // Java: Speller#MAX_WORD_LENGTH
const FREQ_RANGES = 26; // Java: Speller#FREQ_RANGES
const FIRST_RANGE_CODE = 65; // Java: Speller#FIRST_RANGE_CODE
const UPPER_SEARCH_LIMIT = 15; // Java: Speller#UPPER_SEARCH_LIMIT
const MIN_WORD_LENGTH = 4; // Java: Speller#MIN_WORD_LENGTH
const MAX_RECURSION_LEVEL = 6; // Java: Speller#MAX_RECURSION_LEVEL
const EMPTY_BYTES = new Uint8Array(0);

// Java: ArrayIndexOutOfBoundsException text of a failed array access
function aioobe(index, length) {
  return new ArrayIndexOutOfBoundsException(`Index ${index} out of bounds for length ${length}`);
}

// Java: morfologik.speller.HMatrix
export class HMatrix {
  // Java: HMatrix#HMatrix(int,int)
  constructor(distance, maxLength) {
    this.rowLength = maxLength + 2;
    this.columnHeight = 2 * distance + 3;
    this.editDistance = distance;
    this.p = new Int32Array(this.rowLength * this.columnHeight);
    this.init();
  }

  // Java: HMatrix#init()
  init() {
    const p = this.p;
    const length = p.length;
    for (let i = 0; i < this.rowLength - this.editDistance - 1; i++) {
      p[i] = this.editDistance + 1;
      p[length - i - 1] = this.editDistance + 1;
    }
    for (let i = 0; i < this.editDistance + 2; i++) {
      p[i * this.rowLength] = this.editDistance + 1 - i;
      p[(i + this.editDistance + 1) * this.rowLength + i] = i;
    }
  }

  // Java: HMatrix#reset()
  reset() {
    this.p.fill(0);
    this.init();
  }

  // Java: HMatrix#get(int,int)
  get(i, j) {
    const idx = (j - i + this.editDistance + 1) * this.rowLength + j;
    if (idx < 0 || idx >= this.p.length) throw aioobe(idx, this.p.length);
    return this.p[idx];
  }

  // Java: HMatrix#set(int,int,int)
  set(i, j, val) {
    const idx = (j - i + this.editDistance + 1) * this.rowLength + j;
    if (idx < 0 || idx >= this.p.length) throw aioobe(idx, this.p.length);
    this.p[idx] = val;
  }
}

// Java: Speller$Pattern
class Pattern {
  // Java: Speller$Pattern#Pattern(char[],boolean,boolean)
  constructor(chars, startAnchor, endAnchor) {
    this.chars = chars;
    this.startAnchor = startAnchor;
    this.endAnchor = endAnchor;
  }
}

// Java: Speller$CandidateData
export class CandidateData {
  // Java: Speller$CandidateData#CandidateData(String,int)
  constructor(speller, word, distance) {
    this.word = word;
    this.origDistance = distance;
    this.distance = distance * FREQ_RANGES + FREQ_RANGES - speller.getFrequency(word) - 1;
  }

  // Java: Speller$CandidateData#getWord()
  getWord() {
    return this.word;
  }

  // Java: Speller$CandidateData#getDistance()
  getDistance() {
    return this.distance;
  }

  // Java: Speller$CandidateData#compareTo(CandidateData) (Integer.compare)
  compareTo(other) {
    return this.distance < other.distance ? -1 : (this.distance === other.distance ? 0 : 1);
  }

  // Java: Speller$CandidateData#toString()
  toString() {
    return `${this.word}/${this.distance}`;
  }
}

// Java: Speller#isStartAnchored(String)
function isStartAnchored(s) {
  return s.startsWith('^');
}

// Java: Speller#isEndAnchored(String)
function isEndAnchored(s) {
  return s.endsWith('$');
}

// Java: Speller#stripAnchors(String)
function stripAnchors(s) {
  const start = s.startsWith('^') ? 1 : 0;
  const end = s.endsWith('$') ? s.length - 1 : s.length;
  return s.substring(start, end);
}

// Java: Speller#min(int,int,int)
function min3(a, b, c) {
  return Math.min(a, Math.min(b, c));
}

// Java: Speller#isAlphabetic(int)
function isAlphabetic(codePoint) {
  return ((1086 >> getType(codePoint)) & 1) !== 0;
}

// Java: Speller#containsNoDigit(String)
function containsNoDigit(word) {
  for (let i = 0; i < word.length; i++) {
    if (isDigit(word.charCodeAt(i))) return false;
  }
  return true;
}

// Java: Speller#isNotEmpty(String)
function isNotEmpty(str) {
  return str !== null && str !== undefined && str.length !== 0;
}

// Java: Speller#isAllUppercase(String)
function isAllUppercase(str) {
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (isLetter(c) && isLowerCase(c)) return false;
  }
  return true;
}

// Java: Speller#isNotAllLowercase(String)
function isNotAllLowercase(str) {
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (isLetter(c) && !isLowerCase(c)) return true;
  }
  return false;
}

// Java: Speller#isNotCapitalizedWord(String)
function isNotCapitalizedWord(str) {
  if (isNotEmpty(str) && isUpperCase(str.charCodeAt(0))) {
    for (let i = 1; i < str.length; i++) {
      const c = str.charCodeAt(i);
      if (isLetter(c) && !isLowerCase(c)) return true;
    }
    return false;
  }
  return true;
}

// Java: Speller#isMixedCase(String)
function isMixedCase(str) {
  return !isAllUppercase(str) && isNotCapitalizedWord(str) && isNotAllLowercase(str);
}

// Java: Speller#isCamelCase(String)
function isCamelCase(str) {
  return isNotEmpty(str) && !isAllUppercase(str) && isNotCapitalizedWord(str) && isUpperCase(str.charCodeAt(0))
    && (str.length <= 1 || isLowerCase(str.charCodeAt(1))) && isNotAllLowercase(str);
}

// charset kinds whose bytes below 0x80 are the chars of the same code
const ASCII_KINDS = new Set(['utf8', 'latin1', 'ascii', 'cp1252']);

// Java: morfologik.speller.Speller
export class Speller {
  static MAX_WORD_LENGTH = MAX_WORD_LENGTH;

  static CandidateData = CandidateData;

  // Java: Speller#Speller(Dictionary) / Speller(Dictionary,int)
  constructor(dictionary, editDistance = 1) {
    this.replacementsAnyToOne = new Map();
    this.replacementsAnyToTwo = new Map();
    this.replacementsTheRest = new JavaHashMap();
    this.containsSeparators = true;
    this.scratch = new Uint8Array(MAX_WORD_LENGTH * 4);
    this.matchResult = { kind: MatchResult.NO_MATCH, index: 0, node: 0 };
    this.editDistance = editDistance;
    this.hMatrix = new HMatrix(editDistance, MAX_WORD_LENGTH);
    this.effectEditDistance = 0;
    this.candidate = null;
    this.candLen = 0;
    this.wordLen = 0;
    this.wordProcessed = null;
    this.dictionaryMetadata = dictionary.metadata;
    this.rootNode = dictionary.fsa.getRootNode();
    this.fsa = dictionary.fsa;
    this.matcher = new FSATraversal(this.fsa);
    this.finalStatesIterator = new ByteSequenceIterator(this.fsa, this.rootNode);
    if (this.rootNode === 0) throw new IllegalArgumentException('Dictionary must have at least the root node.');
    if (this.dictionaryMetadata === null || this.dictionaryMetadata === undefined) throw new IllegalArgumentException('Dictionary metadata must not be null.');
    this.charset = this.dictionaryMetadata.charset;
    this.separator = this.dictionaryMetadata.getSeparator(); // unsigned byte value
    this.separatorSigned = (this.separator << 24) >> 24; // Java byte
    this.separatorChar = this.dictionaryMetadata.getSeparatorAsChar().charCodeAt(0);
    this.createReplacementsMaps();
  }

  // Java: Speller#createReplacementsMaps()
  createReplacementsMaps() {
    for (const [key, values] of this.dictionaryMetadata.getReplacementPairs()) {
      const startAnchor = isStartAnchored(key);
      const endAnchor = isEndAnchored(key);
      const stripped = stripAnchors(key);
      for (const to of values) {
        if (to.length === 1) {
          const pattern = new Pattern(toChars(stripped), startAnchor, endAnchor);
          const c = to.charCodeAt(0);
          if (!this.replacementsAnyToOne.has(c)) this.replacementsAnyToOne.set(c, [pattern]);
          else this.replacementsAnyToOne.get(c).push(pattern);
        } else if (to.length === 2) {
          const pattern = new Pattern(toChars(stripped), startAnchor, endAnchor);
          if (!this.replacementsAnyToTwo.has(to)) this.replacementsAnyToTwo.set(to, [pattern]);
          else this.replacementsAnyToTwo.get(to).push(pattern);
        } else if (!this.replacementsTheRest.containsKey(key)) {
          this.replacementsTheRest.put(key, [to]);
        } else {
          this.replacementsTheRest.get(key).push(to);
        }
      }
    }
  }

  // Java: Speller#charSequenceToBytes(CharSequence); returns the byte count in this.scratch or -1 (UnmappableInputException)
  charSequenceToBytes(word) {
    const need = Math.trunc(Math.fround(word.length * this.charset.maxBytesPerChar));
    if (this.scratch.length < need) this.scratch = new Uint8Array(need);
    try {
      return this.charset.encodeInto(word, this.scratch);
    } catch (e) {
      if (e.javaClass !== 'java.nio.charset.MalformedInputException' && e.javaClass !== 'java.nio.charset.UnmappableCharacterException') throw e;
      return -1;
    }
  }

  // Java: Speller#isMisspelled(String)
  isMisspelled(word) {
    const md = this.dictionaryMetadata;
    let wordToCheck = word;
    if (md.getInputConversionPairs().size > 0) wordToCheck = applyReplacements(word, md.getInputConversionPairs());
    const isAlpha = wordToCheck.length !== 1 || isAlphabetic(wordToCheck.charCodeAt(0));
    return wordToCheck.length > 0
      && (!md.isIgnoringPunctuation() || isAlpha)
      && (!md.isIgnoringNumbers() || containsNoDigit(wordToCheck))
      && !(md.isIgnoringCamelCase() && this.isCamelCase(wordToCheck))
      && !(md.isIgnoringAllUppercase() && isAlpha && this.isAllUppercase(wordToCheck))
      && !this.isInDictionary(wordToCheck)
      && (!md.isConvertingCase()
        || this.isMixedCase(wordToCheck)
        || (!this.isInDictionary(toLowerCase(wordToCheck, md.getLocale()))
          && (!this.isAllUppercase(wordToCheck) || !this.isInDictionary(this.initialUppercase(wordToCheck)))));
  }

  // Java: Speller#initialUppercase(String)
  initialUppercase(wordToCheck) {
    return wordToCheck.substring(0, 1) + toLowerCase(wordToCheck.substring(1), this.dictionaryMetadata.getLocale());
  }

  // Java: Speller#isInDictionary(CharSequence)
  isInDictionary(word) {
    const n = this.charSequenceToBytes(word);
    if (n < 0) return false;
    const matchResult = this.matcher.match(this.matchResult, this.scratch, 0, n, this.rootNode);
    if (this.containsSeparators && matchResult.kind === MatchResult.EXACT_MATCH) {
      this.containsSeparators = false;
      for (let i = 0; i < word.length; i++) {
        if (word.charCodeAt(i) === this.separatorSigned) {
          this.containsSeparators = true;
          break;
        }
      }
    }
    if (matchResult.kind === MatchResult.EXACT_MATCH && !this.containsSeparators) return true;
    return this.containsSeparators && matchResult.kind === MatchResult.SEQUENCE_IS_A_PREFIX && n > 0
      && this.fsa.getArc(matchResult.node, this.separator) !== 0;
  }

  // Java: Speller#getFrequency(CharSequence)
  getFrequency(word) {
    if (!this.dictionaryMetadata.isFrequencyIncluded()) return 0;
    const n = this.charSequenceToBytes(word);
    if (n < 0) return 0;
    const match = this.matcher.match(this.matchResult, this.scratch, 0, n, this.rootNode);
    if (match.kind === MatchResult.SEQUENCE_IS_A_PREFIX) {
      const arc = this.fsa.getArc(match.node, this.separator);
      if (arc !== 0 && !this.fsa.isArcFinal(arc)) {
        // there is such word and it's frequency is not zero
        const it = this.finalStatesIterator.restartFrom(this.fsa.getEndNode(arc));
        if (it.hasNext()) {
          const len = it.next();
          return ((it.buffer[len - 1] << 24) >> 24) - FIRST_RANGE_CODE;
        }
      }
    }
    return 0;
  }

  // Java: Speller#replaceRunOnWordCandidates(String)
  replaceRunOnWordCandidates(original) {
    const candidates = [];
    const md = this.dictionaryMetadata;
    let word = original;
    if (md.getInputConversionPairs().size > 0) word = applyReplacements(original, md.getInputConversionPairs());
    if (!this.isInDictionary(word) && md.isSupportingRunOnWords()) {
      const locale = md.getLocale();
      for (let i = 1; i < word.length; i++) {
        // chop from left to right
        const prefix = word.substring(0, i);
        const suffix = word.substring(i);
        if (this.isInDictionary(suffix) || (!this.isNotCapitalizedWord(suffix) && this.isInDictionary(toLowerCase(suffix, locale)))) {
          if (this.isInDictionary(prefix)) {
            this.addReplacement(candidates, `${prefix} ${suffix}`);
          } else if (isUpperCase(prefix.charCodeAt(0)) && this.isInDictionary(toLowerCase(prefix, locale))) {
            this.addReplacement(candidates, `${prefix} ${suffix}`);
          }
        }
      }
    }
    return candidates;
  }

  // Java: Speller#replaceRunOnWords(String)
  replaceRunOnWords(original) {
    return this.replaceRunOnWordCandidates(original).map((cd) => cd.word);
  }

  // Java: Speller#addReplacement(List,String)
  addReplacement(candidates, str) {
    const md = this.dictionaryMetadata;
    if (md.getOutputConversionPairs().size === 0) candidates.push(new CandidateData(this, str, 1));
    else candidates.push(new CandidateData(this, applyReplacements(str, md.getOutputConversionPairs()), 1));
  }

  // Java: Speller#findSimilarWordCandidates(String)
  findSimilarWordCandidates(word) {
    return this.findReplacementCandidatesImpl(word, true);
  }

  // Java: Speller#findSimilarWords(String)
  findSimilarWords(word) {
    return this.findSimilarWordCandidates(word).map((cd) => cd.getWord());
  }

  // Java: Speller#findReplacements(String)
  findReplacements(w) {
    return this.findReplacementCandidates(w).map((cd) => cd.getWord());
  }

  // Java: Speller#findReplacementCandidates(String)
  findReplacementCandidates(w) {
    return this.findReplacementCandidatesImpl(w, false);
  }

  // Java: Speller#findReplacementCandidates(String,boolean)
  findReplacementCandidatesImpl(word, includeExact) {
    const md = this.dictionaryMetadata;
    this.hMatrix.reset();
    if (md.getInputConversionPairs().size > 0) word = applyReplacements(word, md.getInputConversionPairs());
    const candidates = [];
    if (word.length > 0 && word.length < MAX_WORD_LENGTH && (!this.isInDictionary(word) || includeExact)) {
      const wordsToCheck = [];
      if (this.replacementsTheRest !== null && word.length > 1) {
        for (const wordChecked of this.getAllReplacements(word, 0, 0)) {
          if (this.isInDictionary(wordChecked)) {
            candidates.push(new CandidateData(this, wordChecked, 0));
          } else {
            const lowerWord = toLowerCase(wordChecked, md.getLocale());
            const upperWord = toUpperCase(wordChecked, md.getLocale());
            if (this.isInDictionary(lowerWord)) {
              candidates.push(new CandidateData(this, lowerWord, 0));
            }
            if (this.isInDictionary(upperWord)) {
              candidates.push(new CandidateData(this, upperWord, 0));
            }
            if (lowerWord.length > 1) {
              const firstupperWord = String.fromCharCode(charToUpperCase(lowerWord.charCodeAt(0))) + lowerWord.substring(1);
              if (this.isInDictionary(firstupperWord)) {
                candidates.push(new CandidateData(this, firstupperWord, 0));
              }
            }
          }
          wordsToCheck.push(wordChecked);
        }
      } else {
        wordsToCheck.push(word);
      }
      let i = 1;
      for (const wordChecked of wordsToCheck) {
        i++;
        if (i > UPPER_SEARCH_LIMIT) break; // for performance reasons, do not search too deeply
        this.wordProcessed = toChars(wordChecked);
        this.wordLen = this.wordProcessed.length;
        if (this.wordLen < MIN_WORD_LENGTH && i > 2) break; // three-letter replacements make little sense
        this.candidate = new Uint16Array(MAX_WORD_LENGTH);
        this.candLen = this.candidate.length;
        this.effectEditDistance = this.wordLen <= this.editDistance ? this.wordLen - 1 : this.editDistance;
        this.findRepl(candidates, 0, this.fsa.getRootNode(), EMPTY_BYTES, 0, 0, -1, null, 0);
      }
    }
    candidates.sort((a, b) => a.compareTo(b)); // Collections.sort (stable)
    const candidateSet = new Set();
    const outputCandidates = [];
    for (const cd of candidates) {
      const wordToAdd = applyReplacements(cd.getWord(), md.getOutputConversionPairs());
      if (!candidateSet.has(wordToAdd)) {
        candidateSet.add(wordToAdd);
        if (wordToAdd !== word) outputCandidates.push(new CandidateData(this, wordToAdd, cd.origDistance));
      }
    }
    return outputCandidates;
  }

  // Java: Speller#findRepl(List,int,int,byte[],int,int,int,String,char)
  findRepl(candidates, depth, node, prevBytes, wordIndex, candIndex, lastIdx, lastWord, lastChar) {
    let dist = 0;
    const fsa = this.fsa;
    const charset = this.charset;
    const asciiKind = ASCII_KINDS.has(charset.kind);
    const prevLen = prevBytes.length;
    let bytes = null;
    for (let arc = fsa.getFirstArc(node); arc !== 0; arc = fsa.getNextArc(arc)) {
      const label = fsa.getArcLabel(arc);
      const bufPos = prevLen + 1;
      let decoded = null; // decoded text, or null if malformed; undefined = unmappable (silently discarded)
      if (bufPos === 1 && label < 0x80 && asciiKind) {
        decoded = String.fromCharCode(label);
      } else {
        if (bytes === null || bytes.length < bufPos) bytes = new Uint8Array(bufPos);
        bytes.set(prevBytes, 0);
        bytes[prevLen] = label;
        try {
          decoded = charset.kind === 'utf8' ? charset.decodeUtf8OrNull(bytes, 0, bufPos) : charset.decode(bytes, 0, bufPos);
        } catch (e) {
          if (e.javaClass === 'java.nio.charset.MalformedInputException') decoded = null;
          else if (e.javaClass === 'java.nio.charset.UnmappableCharacterException') decoded = undefined;
          else throw e;
        }
      }
      if (decoded === null) { // assume that only valid encodings are there
        const prev = new Uint8Array(bufPos);
        prev.set(prevBytes, 0);
        prev[prevLen] = label;
        if (!fsa.isArcTerminal(arc)) {
          this.findRepl(candidates, depth, fsa.getEndNode(arc), prev, wordIndex, candIndex, lastIdx, lastWord, lastChar);
        }
      } else if (decoded !== undefined) { // unmappable characters are silently discarded
        if (candIndex >= this.candidate.length) throw aioobe(candIndex, this.candidate.length);
        this.candidate[candIndex] = decoded.charCodeAt(0);
        // replacement "any to two"
        let lengthReplacement = this.matchAnyToTwo(wordIndex, candIndex, lastIdx, lastWord, lastChar);
        if (lengthReplacement > 0) {
          // the replacement takes place at the end of the candidate
          if (this.isEndOfCandidate(arc, wordIndex) && (dist = this.hMatrix.get(depth - 1, depth - 1)) <= this.effectEditDistance) {
            if (Math.abs(this.wordLen - 1 - (wordIndex + lengthReplacement - 2)) > 0) {
              dist += Math.abs(this.wordLen - 1 - (wordIndex + lengthReplacement - 2));
            }
            if (dist <= this.effectEditDistance) {
              candidates.push(new CandidateData(this, this.candidateString(candIndex + 1), dist));
            }
          }
          if (this.isArcNotTerminal(arc, candIndex)) {
            const x = this.hMatrix.get(depth, depth);
            this.hMatrix.set(depth, depth, this.hMatrix.get(depth - 1, depth - 1));
            this.findRepl(candidates, Math.max(0, depth), fsa.getEndNode(arc), EMPTY_BYTES, wordIndex + lengthReplacement - 1, candIndex + 1, lastIdx, lastWord, lastChar);
            this.hMatrix.set(depth, depth, x);
          }
        }
        // replacement "any to one"
        lengthReplacement = this.matchAnyToOne(wordIndex, candIndex);
        if (lengthReplacement > 0) {
          if (this.isEndOfCandidate(arc, wordIndex) && (dist = this.hMatrix.get(depth, depth)) <= this.effectEditDistance) {
            if (Math.abs(this.wordLen - 1 - (wordIndex + lengthReplacement - 1)) > 0) {
              dist += Math.abs(this.wordLen - 1 - (wordIndex + lengthReplacement - 1));
            }
            if (dist <= this.effectEditDistance) {
              candidates.push(new CandidateData(this, this.candidateString(candIndex + 1), dist));
            }
          }
          if (this.isArcNotTerminal(arc, candIndex)) {
            const sh = String.fromCharCode.apply(null, this.wordProcessed.subarray(wordIndex, wordIndex + lengthReplacement));
            this.findRepl(candidates, depth, fsa.getEndNode(arc), EMPTY_BYTES, wordIndex + lengthReplacement, candIndex + 1, wordIndex + lengthReplacement, sh, this.candidate[candIndex]);
          }
        }
        // general
        if (this.cuted(depth, wordIndex, candIndex) <= this.effectEditDistance) {
          if (this.isEndOfCandidate(arc, wordIndex)
            && (dist = this.ed(this.wordLen - 1 - (wordIndex - depth), depth, this.wordLen - 1, candIndex)) <= this.effectEditDistance) {
            candidates.push(new CandidateData(this, this.candidateString(candIndex + 1), dist));
          }
          if (this.isArcNotTerminal(arc, candIndex)) {
            this.findRepl(candidates, depth + 1, fsa.getEndNode(arc), EMPTY_BYTES, wordIndex + 1, candIndex + 1, lastIdx, lastWord, lastChar);
          }
        }
      }
    }
  }

  // Java: String#valueOf(char[],int,int) for candidate[0,len)
  candidateString(len) {
    return String.fromCharCode.apply(null, this.candidate.subarray(0, len));
  }

  // Java: Speller#isArcNotTerminal(int,int)
  isArcNotTerminal(arc, candIndex) {
    return !this.fsa.isArcTerminal(arc) && (!this.containsSeparators || this.candidate[candIndex] !== this.separatorChar);
  }

  // Java: Speller#isEndOfCandidate(int,int)
  isEndOfCandidate(arc, wordIndex) {
    return (this.fsa.isArcFinal(arc) || this.isBeforeSeparator(arc)) && Math.abs(this.wordLen - 1 - wordIndex) <= this.effectEditDistance;
  }

  // Java: Speller#isBeforeSeparator(int)
  isBeforeSeparator(arc) {
    if (this.containsSeparators) {
      const arc2 = this.fsa.getArc(this.fsa.getEndNode(arc), this.separator);
      return arc2 !== 0 && !this.fsa.isArcTerminal(arc2);
    }
    return false;
  }

  // Java: Speller#ed(int,int,int,int)
  ed(i, j, k, l) {
    let result;
    const h = this.hMatrix;
    if (this.areEqual(this.wordProcessed[k], this.candidate[l])) {
      // last characters are the same
      result = h.get(i, j);
    } else if (k > 0 && l > 0 && this.wordProcessed[k] === this.candidate[l - 1] && this.wordProcessed[k - 1] === this.candidate[l]) {
      // last two characters are transposed
      const a = h.get(i - 1, j - 1); // transposition, e.g. ababab, ababba
      const b = h.get(i + 1, j); // deletion, e.g. abab, aba
      const c = h.get(i, j + 1); // insertion e.g. aba, abab
      result = 1 + min3(a, b, c);
    } else {
      // otherwise
      const a = h.get(i, j); // replacement, e.g. ababa, ababb
      const b = h.get(i + 1, j); // deletion, e.g. ab, a
      const c = h.get(i, j + 1); // insertion e.g. a, ab
      result = 1 + min3(a, b, c);
    }
    h.set(i + 1, j + 1, result);
    return result;
  }

  // Java: Speller#areEqual(char,char)
  areEqual(x, y) {
    if (x === y) return true;
    // not Java: the result depends on the two chars and the (fixed) metadata only, memoised
    if (this.eqCache === undefined) this.eqCache = new Map();
    const key = ((x & 0xffff) * 65536) + (y & 0xffff);
    let r = this.eqCache.get(key);
    if (r === undefined) {
      r = this.areEqualUncached(x, y);
      this.eqCache.set(key, r);
    }
    return r;
  }

  // Java: Speller#areEqual(char,char)
  areEqualUncached(x, y) {
    if (x === y) return true;
    const md = this.dictionaryMetadata;
    const equivalentChars = md.getEquivalentChars();
    if (equivalentChars !== null && equivalentChars !== undefined) {
      const chars = equivalentChars.get(String.fromCharCode(x));
      if (chars !== undefined && chars.includes(String.fromCharCode(y))) return true;
    }
    if (md.isIgnoringDiacritics()) {
      const xn0 = this.nfdFirst(x);
      const yn0 = this.nfdFirst(y);
      if (xn0 === yn0) return true;
      if (md.isConvertingCase() && isLetter(xn0)) {
        // case-insensitive match ignoring diacritics
        const diffCase = isLowerCase(xn0) !== isLowerCase(yn0);
        if (diffCase) return charToLowerCase(xn0) === charToLowerCase(yn0);
      }
      return xn0 === yn0;
    }
    return false;
  }

  // not Java: first char of Normalizer.normalize(String.valueOf(c), NFD), memoised per char
  nfdFirst(c) {
    if (this.nfdCache === undefined) this.nfdCache = new Int32Array(65536).fill(-1);
    const k = c & 0xffff;
    let r = this.nfdCache[k];
    if (r < 0) {
      r = Normalizer.normalize(String.fromCharCode(k), Normalizer.Form.NFD).charCodeAt(0);
      this.nfdCache[k] = r;
    }
    return r;
  }

  // Java: Speller#cuted(int,int,int)
  cuted(depth, wordIndex, candIndex) {
    const l = Math.max(0, depth - this.effectEditDistance); // min edit distance from 0
    const u = Math.min(this.wordLen - 1 - (wordIndex - depth), depth + this.effectEditDistance); // max edit distance from 0
    let minEd = this.effectEditDistance + 1; // what is the minimum edit distance so far
    let wi = wordIndex + l - depth;
    for (let lIdx = l; lIdx <= u; lIdx++, wi++) {
      const d = this.ed(lIdx, depth, wi, candIndex);
      if (d < minEd) minEd = d;
    }
    return minEd;
  }

  // Java: Speller#matchAnyToOne(int,int)
  matchAnyToOne(wordIndex, candIndex) {
    const patterns = this.replacementsAnyToOne.get(this.candidate[candIndex]);
    if (patterns !== undefined) {
      for (const p of patterns) {
        if (p.startAnchor && wordIndex !== 0) continue;
        let i = 0;
        while (i < p.chars.length && (wordIndex + i) < this.wordLen && p.chars[i] === this.wordProcessed[wordIndex + i]) i++;
        if (i === p.chars.length) {
          if (p.endAnchor && (wordIndex + i) !== this.wordLen) continue;
          return i;
        }
      }
    }
    return 0;
  }

  // Java: Speller#matchAnyToTwo(int,int,int,String,char)
  matchAnyToTwo(wordIndex, candIndex, lastIdx, lastWord, lastChar) {
    if (candIndex > 0 && candIndex < this.candidate.length && wordIndex > 0) {
      // not Java: lookup by numeric key (the map is fixed after construction)
      if (this.anyToTwoCodes === undefined || this.anyToTwoSource !== this.replacementsAnyToTwo) {
        this.anyToTwoSource = this.replacementsAnyToTwo;
        this.anyToTwoCodes = new Map();
        for (const [k, v] of this.replacementsAnyToTwo) if (k.length === 2) this.anyToTwoCodes.set(k.charCodeAt(0) * 65536 + k.charCodeAt(1), v);
      }
      const patterns = this.anyToTwoCodes.size === 0 ? undefined : this.anyToTwoCodes.get(this.candidate[candIndex - 1] * 65536 + this.candidate[candIndex]);
      if (patterns !== undefined) {
        const twoCharString = String.fromCharCode(this.candidate[candIndex - 1], this.candidate[candIndex]);
        for (const p of patterns) {
          if (p.startAnchor && (wordIndex - 1) !== 0) continue;
          if (p.chars.length === 2 && wordIndex < this.wordLen && this.candidate[candIndex - 1] === this.wordProcessed[wordIndex - 1]
            && this.candidate[candIndex] === this.wordProcessed[wordIndex]) {
            return 0;
          }
          let i = 0;
          while (i < p.chars.length && (wordIndex - 1 + i) < this.wordLen && p.chars[i] === this.wordProcessed[wordIndex - 1 + i]) i++;
          if (i === p.chars.length) {
            if (p.endAnchor && (wordIndex - 1 + i) !== this.wordLen) continue;
            if (wordIndex - 1 < lastIdx && lastWord !== null && p.chars.length === 1 && p.chars[0] === lastChar && twoCharString === lastWord) continue;
            return i;
          }
        }
      }
    }
    return 0;
  }

  // Java: Speller#isAllUppercase(String)
  isAllUppercase(str) {
    return isAllUppercase(str);
  }

  // Java: Speller#isNotAllLowercase(String)
  isNotAllLowercase(str) {
    return isNotAllLowercase(str);
  }

  // Java: Speller#isNotCapitalizedWord(String)
  isNotCapitalizedWord(str) {
    return isNotCapitalizedWord(str);
  }

  // Java: Speller#isMixedCase(String)
  isMixedCase(str) {
    return isMixedCase(str);
  }

  // Java: Speller#isCamelCase(String)
  isCamelCase(str) {
    return isCamelCase(str);
  }

  // Java: Speller#convertsCase()
  convertsCase() {
    return this.dictionaryMetadata.isConvertingCase();
  }

  // Java: Speller#getAllReplacements(String,int,int)
  getAllReplacements(str, fromIndex, level) {
    const replaced = [];
    if (level > MAX_RECURSION_LEVEL) { // Stop searching at some point
      replaced.push(str);
      return replaced;
    }
    let sb = str;
    let index = MAX_WORD_LENGTH;
    let key = '';
    let keyLength = 0;
    let found = false;
    let keyStripped = '';
    // find first possible replacement after fromIndex position
    for (const auxKey of this.replacementsTheRest.keySet()) {
      const startAnchored = isStartAnchored(auxKey);
      const endAnchored = isEndAnchored(auxKey);
      const auxKeyStripped = startAnchored || endAnchored ? stripAnchors(auxKey) : auxKey;
      if (startAnchored && fromIndex > 0) continue;
      let auxIndex;
      if (startAnchored) {
        auxIndex = sb.indexOf(auxKeyStripped, 0) === 0 ? 0 : -1;
      } else if (endAnchored) {
        const endIdx = sb.length - auxKeyStripped.length;
        auxIndex = endIdx >= fromIndex && sb.indexOf(auxKeyStripped, endIdx) === endIdx ? endIdx : -1;
      } else {
        auxIndex = sb.indexOf(auxKey, fromIndex);
      }
      if (auxIndex > -1 && (auxIndex < index || (auxIndex === index && auxKeyStripped.length >= keyLength))) {
        index = auxIndex;
        key = auxKey;
        keyLength = auxKeyStripped.length;
        keyStripped = auxKeyStripped;
      }
    }
    // check if the key was found
    if (index < MAX_WORD_LENGTH) {
      for (const rep of this.replacementsTheRest.get(key)) {
        if (!found) {
          for (const r of this.getAllReplacements(str, index + keyStripped.length, level + 1)) replaced.push(r);
          found = true;
        }
        const ind = sb.indexOf(rep, fromIndex - rep.length + 1);
        // avoid unnecessary replacements (we call recursively)
        if (rep.length > keyStripped.length && ind > -1 && (ind === index || ind === index - rep.length + 1)) continue;
        sb = sb.substring(0, index) + rep + sb.substring(Math.min(index + keyStripped.length, sb.length));
        for (const r of this.getAllReplacements(sb, index + rep.length, level + 1)) replaced.push(r);
        sb = str;
      }
    }
    if (!found) replaced.push(sb);
    return replaced;
  }

  // Java: Speller#setWordAndCandidate(String,String)
  setWordAndCandidate(word, candidate) {
    this.wordProcessed = toChars(word);
    this.wordLen = this.wordProcessed.length;
    this.candidate = toChars(candidate);
    this.candLen = this.candidate.length;
    this.effectEditDistance = this.wordLen <= this.editDistance ? this.wordLen - 1 : this.editDistance;
  }

  // Java: Speller#getWordLen()
  getWordLen() {
    return this.wordLen;
  }

  // Java: Speller#getCandLen()
  getCandLen() {
    return this.candLen;
  }

  // Java: Speller#getEffectiveED()
  getEffectiveED() {
    return this.effectEditDistance;
  }
}

// Java: String#toCharArray()
function toChars(s) {
  const a = new Uint16Array(s.length);
  for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
  return a;
}
