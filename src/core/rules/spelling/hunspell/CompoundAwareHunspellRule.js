// org.languagetool.rules.spelling.hunspell.CompoundAwareHunspellRule (hunspell + morfologik speller for compounds)
import { HunspellRule } from './HunspellRule.js';
import { getDataBroker } from '../../../resources/LtStatics.js';
import { isAllUppercase, lowercaseFirstChar, startsWithUppercase, uppercaseFirstChar } from '../../../text/StringTools.js';
import { AbstractMethodError } from '../../../../lib/java/errors.js';
import { removeChar, removeEnd, splitByChar } from '../../../../lib/java/StringUtils.js';
import { toLowerCase } from '../../../../lib/java/strings.js';

const MAX_SUGGESTIONS = 20; // Java: CompoundAwareHunspellRule#MAX_SUGGESTIONS

// Java: CompoundAwareHunspellRule (abstract: filterForLanguage)
export class CompoundAwareHunspellRule extends HunspellRule {
  static FQCN = 'org.languagetool.rules.spelling.hunspell.CompoundAwareHunspellRule';
  static JAVA_ABSTRACT = true;

  // Java: CompoundAwareHunspellRule#getSpellingFilePaths(String)
  static getSpellingFilePaths(langCode) {
    return [
      `/${langCode}/hunspell/spelling.txt`,
      `/${langCode}/hunspell/spelling_custom.txt`,
      `/${langCode}/multitoken-suggest.txt`,
      'spelling_global.txt',
    ];
  }

  // Java: CompoundAwareHunspellRule#getStreams(List); the streams are returned as byte arrays (SequenceInputStream concatenates them)
  static getStreams(paths) {
    const streams = [];
    for (const path of paths) {
      // add separation between streams so that missing newlines at the end don't join the last & first line from two files
      const separation = `# Start of file ${path.split('\n').join('')}\n`;
      // Java: Charset.defaultCharset().encode(separation).array() is the whole backing array of the encoder output buffer:
      // (int)(chars * 1.1f) bytes, so the encoded text is followed by zero bytes
      const encoded = Buffer.from(separation, 'utf8');
      const capacity = Math.trunc(Math.fround(separation.length * Math.fround(1.1)));
      const separationStream = capacity > encoded.length ? Buffer.concat([encoded, Buffer.alloc(capacity - encoded.length)]) : encoded;
      streams.push(separationStream);
      streams.push(getDataBroker().getFromResourceDirAsStream(path));
      streams.push(Buffer.from('\n', 'utf8')); // don't crash if input doesn't end with newline
    }
    return streams;
  }

  // Java: CompoundAwareHunspellRule(ResourceBundle,Language,CompoundWordTokenizer,MorfologikMultiSpeller|Supplier,UserConfig[,List[,LanguageModel]])
  constructor(messages, language, compoundSplitter, morfoSpeller, userConfig, altLanguages = [], languageModel = null) {
    super(messages, language, userConfig, altLanguages, languageModel);
    this.compoundSplitter = compoundSplitter;
    const supplier = typeof morfoSpeller === 'function' ? morfoSpeller : () => morfoSpeller;
    let memo = null;
    let done = false;
    this.morfoSpeller = () => { // Java: Suppliers.memoize
      if (!done) {
        memo = supplier();
        done = true;
      }
      return memo;
    };
  }

  // Java: CompoundAwareHunspellRule#filterForLanguage(List) (abstract)
  filterForLanguage() {
    throw new AbstractMethodError('org.languagetool.rules.spelling.hunspell.CompoundAwareHunspellRule.filterForLanguage(java.util.List)');
  }

  // Java: CompoundAwareHunspellRule#getSuggestions(String)
  getSuggestions(word) {
    this.ensureInitialized();
    const candidates = this.getCandidates(word);
    let simpleSuggestions = this.getCorrectWords(candidates);
    simpleSuggestions = this.getFilteredSuggestions(simpleSuggestions);

    const morfoSpeller = this.morfoSpeller();
    const noSplitSuggestions = morfoSpeller.getSuggestions(word); // after getCorrectWords() so spelling.txt is considered
    handleWordEndPunctuation('.', word, noSplitSuggestions, morfoSpeller);
    handleWordEndPunctuation('...', word, noSplitSuggestions, morfoSpeller);
    let noSplitLowercaseSuggestions = [];
    if (startsWithUppercase(word) && !isAllUppercase(word)) {
      // almost all words can be uppercase because they can appear at the start of a sentence:
      noSplitLowercaseSuggestions = morfoSpeller.getSuggestions(toLowerCase(word));
    }
    // We don't know about the quality of the results here, so mix both lists together,
    // taking elements from both lists on a rotating basis:
    let suggestions = [];
    const max = Math.max(simpleSuggestions.length, noSplitSuggestions.length, noSplitLowercaseSuggestions.length);
    for (let i = 0; i < max; i++) {
      if (i < noSplitSuggestions.length) {
        suggestions.push(noSplitSuggestions[i]);
      }
      if (i < noSplitLowercaseSuggestions.length) {
        suggestions.push(uppercaseFirstChar(noSplitLowercaseSuggestions[i]));
      }
      // put these behind suggestions by Morfologik, often low-quality / made-up words
      if (i < simpleSuggestions.length) {
        suggestions.push(simpleSuggestions[i]);
      }
    }

    suggestions = this.filterDupes(suggestions);
    this.filterForLanguage(suggestions);

    const sortedSuggestions = this.sortSuggestionByQuality(word, suggestions);
    return sortedSuggestions.slice(0, Math.min(MAX_SUGGESTIONS, sortedSuggestions.length));
  }

  // Java: CompoundAwareHunspellRule#getCandidates(String) (protected)
  getCandidates(word) {
    return this.compoundSplitter.tokenize(word);
  }

  // Java: CompoundAwareHunspellRule#getCandidates(List) (protected)
  getCandidatesForParts(parts) {
    let partCount = 0;
    const candidates = [];
    for (const part of parts) {
      if (!this.hunspell.spell(part)) {
        // assume noun, so use uppercase:
        const morfoSpeller = this.morfoSpeller();
        const doUpperCase = partCount > 0 && !startsWithUppercase(part);
        let suggestions = morfoSpeller.getSuggestions(doUpperCase ? uppercaseFirstChar(part) : part);
        if (suggestions.length === 0) {
          suggestions = morfoSpeller.getSuggestions(doUpperCase ? lowercaseFirstChar(part) : part);
        }
        let appendS = false;
        if (doUpperCase && part.endsWith('s')) { // maybe infix-s as in "Dampfschiffahrtskapitän" -> "Dampfschifffahrtskapitän"
          suggestions.push(...morfoSpeller.getSuggestions(removeEnd(part, 's')));
          appendS = true;
        }
        for (let suggestion of suggestions) {
          const partsCopy = [...parts];
          if (appendS) {
            suggestion += 's';
          }
          if (partCount > 0 && parts[partCount].startsWith('-') && parts[partCount].length > 1) {
            partsCopy[partCount] = `-${uppercaseFirstChar(suggestion.substring(1))}`;
          } else if (partCount > 0 && !parts[partCount - 1].endsWith('-')) {
            partsCopy[partCount] = toLowerCase(suggestion);
          } else {
            partsCopy[partCount] = suggestion;
          }
          const candidate = partsCopy.join('');
          if (!this.isMisspelled(candidate)) {
            candidates.push(candidate);
          }
          // Arbeidszimmer -> Arbeitszimmer:
          if (partCount < parts.length - 1 && part.endsWith('s') && suggestion.endsWith('-')) {
            partsCopy[partCount] = suggestion.substring(0, suggestion.length - 1);
            const infixCandidate = partsCopy.join('');
            if (!this.isMisspelled(infixCandidate)) {
              candidates.push(infixCandidate);
            }
          }
        }
      }
      // What if there's no misspelled parts like for Arbeitamt = Arbeit+Amt ??
      // -> morfologik must be extended to return similar words even for known words
      // But GermanSpellerRule.getCandidates() has a solution for the cases with infix "s".
      partCount++;
    }
    return candidates;
  }

  // Java: CompoundAwareHunspellRule#sortSuggestionByQuality(String,List)
  sortSuggestionByQuality(misspelling, suggestions) {
    const result = [];
    for (const suggestion of suggestions) {
      if (removeChar(suggestion, ' ') === misspelling
        && splitByChar(suggestion, ' ').every((k) => k.length !== 1)) {
        // prefer run-on words unless a single letter is split off:
        result.unshift(suggestion);
      } else {
        result.push(suggestion);
      }
    }
    return result;
  }

  // avoid over-accepting words, as the Morfologik approach above might construct
  // compound words with parts that are correct but the compound is not correct (e.g. "Arbeit + Amt = Arbeitamt"):
  // Java: CompoundAwareHunspellRule#getCorrectWords(List)
  getCorrectWords(wordsOrPhrases) {
    const result = [];
    for (const wordOrPhrase of wordsOrPhrases) {
      // this might be a phrase like "aufgrund dessen", so it needs to be split:
      const words = this.tokenizeText(wordOrPhrase);
      let wordIsOkay = true;
      for (const word of words) {
        if (!this.hunspell.spell(word)) {
          wordIsOkay = false;
          break;
        }
      }
      if (wordIsOkay) {
        result.push(wordOrPhrase);
      }
    }
    return result;
  }

  // Java: CompoundAwareHunspellRule#getFilteredSuggestions(List)
  getFilteredSuggestions(wordsOrPhrases) {
    return wordsOrPhrases;
  }
}

// Java: CompoundAwareHunspellRule#handleWordEndPunctuation(String,String,List,MorfologikMultiSpeller)
function handleWordEndPunctuation(punct, word, noSplitSuggestions, morfoSpeller) {
  if (word.endsWith(punct)) {
    // e.g. "informationnen." - the dot is a word char in hunspell, so it needs special treatment here
    const tmp = morfoSpeller.getSuggestions(word.substring(0, word.length - punct.length));
    for (const s of tmp) {
      noSplitSuggestions.push(s + punct);
    }
  }
}
