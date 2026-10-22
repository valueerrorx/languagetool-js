// org.languagetool.rules.spelling.SpellingCheckRule (abstract rule for spellchecking rules)
import { Rule } from '../model/Rule.js';
import { JLanguageTool } from '../../JLanguageTool.js';
import { RuleMatch } from '../model/RuleMatch.js';
import { ITSIssueType } from '../model/ITSIssueType.js';
import { SuggestedReplacement } from '../model/SuggestedReplacement.js';
import { CachingWordListLoader } from './CachingWordListLoader.js';
import { SuggestionsRanker } from './suggestions/SuggestionsRanker.js';
import { PatternToken } from '../../patterns/PatternToken.js';
import { PatternTokenBuilder } from '../../patterns/PatternTokenBuilder.js';
import { WordTokenizer } from '../../text/tokenizers/WordTokenizer.js';
import { SENTENCE_START_TAGNAME } from '../../JLanguageToolConstants.js';
import { getDataBroker } from '../../resources/LtStatics.js';
import { isMixedCase, uppercaseFirstChar } from '../../text/StringTools.js';
import { Pattern } from '../../../lib/java/regex/index.js';
import { Locale } from '../../../lib/java/Locale.js';
import { binarySearch, listGet } from '../../../lib/java/arrays.js';
import { commonPrefix } from '../../../lib/java/Strings.js';
import { AbstractMethodError, RuntimeException, IOException, IllegalStateException } from '../../../lib/java/errors.js';
import { CASE_INSENSITIVE_ORDER, javaCompare, javaSplit, javaTrim, toLowerCase } from '../../../lib/java/strings.js';

// Java: SpellingCheckRule#HIGH_CONFIDENCE
export const HIGH_CONFIDENCE = 0.99;
// Java: SpellingCheckRule#LANGUAGETOOL
export const LANGUAGETOOL = 'LanguageTool';
// Java: SpellingCheckRule#LANGUAGETOOLER
export const LANGUAGETOOLER = 'LanguageTooler';
// Java: SpellingCheckRule#MAX_TOKEN_LENGTH
export const MAX_TOKEN_LENGTH = 200;

const SPELLING_IGNORE_FILE = '/hunspell/ignore.txt';
const SPELLING_FILE = '/hunspell/spelling.txt';
const CUSTOM_SPELLING_FILE = '/hunspell/spelling_custom.txt';
export const GLOBAL_SPELLING_FILE = 'spelling_global.txt';
const SPELLING_PROHIBIT_FILE = '/hunspell/prohibit.txt';
const CUSTOM_SPELLING_PROHIBIT_FILE = '/hunspell/prohibit_custom.txt';
const SPELLING_FILE_VARIANT = null;

const pHasNoLetterLatin = Pattern.compile('^[^\\p{script=latin}]+$'); // Java: SpellingCheckRule#pHasNoLetterLatin
const pHasNoLetter = Pattern.compile('^[^\\p{L}]+$'); // Java: SpellingCheckRule#pHasNoLetter

// Java: Stream#distinct() (equals/hashCode based, first occurrence wins)
function distinct(list) {
  const out = [];
  for (const x of list) {
    if (!out.some((y) => y === x || (x !== null && typeof x.equals === 'function' && x.equals(y)))) out.push(x);
  }
  return out;
}

const NO_TOKENIZER = {}; // key of plans without tokenizing
const IGNORE_ROOT = { set: new Set(), sorted: null, sortedCI: null, children: new Map() }; // composition of plans: empty ignore set
const IGNORE_LIST_PLANS = new WeakMap(); // perf: cached word list -> tokenizer -> { single, multi }
const SINGLE_TOKEN_LINES = new WeakMap(); // perf: tokenizer -> memo of ignore lines (<= 1 token / token lists)

// Java: SpellingCheckRule (abstract: getId, getDescription, match, isMisspelled)
export class SpellingCheckRule extends Rule {
  static FQCN = 'org.languagetool.rules.spelling.SpellingCheckRule';
  static JAVA_ABSTRACT = true;
  static HIGH_CONFIDENCE = HIGH_CONFIDENCE;
  static LANGUAGETOOL = LANGUAGETOOL;
  static LANGUAGETOOLER = LANGUAGETOOLER;
  static MAX_TOKEN_LENGTH = MAX_TOKEN_LENGTH;
  static CUSTOM_SPELLING_FILE = CUSTOM_SPELLING_FILE;
  static GLOBAL_SPELLING_FILE = GLOBAL_SPELLING_FILE;

  // Java: SpellingCheckRule(ResourceBundle,Language,UserConfig[,List[,LanguageModel]])
  constructor(messages, language, userConfig, altLanguages = [], languageModel = null) {
    super(messages);
    this.language = language;
    this.languageModel = languageModel;
    this.wordListLoader = new CachingWordListLoader();
    this.wordsToBeProhibited = new Set();
    this.wordsToBeIgnoredDictionary = null;
    this.wordsToBeIgnoredDictionaryIgnoreCase = null;
    this.antiPatterns = [];
    this.considerIgnoreWords = true;
    this.convertsCase = false;
    this.wordsToBeIgnored = new Set();
    this.ignoreNode = IGNORE_ROOT; // JS: null as soon as wordsToBeIgnored is no composition of plans
    this.ignoreShared = false; // JS: wordsToBeIgnored is the Set of the memo node (copy on write)
    this.dictFromNode = false;
    this.dictFromNodeCI = false;
    this.ignoreWordsWithLength = 0;
    if (userConfig !== null && userConfig !== undefined) {
      for (const w of userConfig.getAcceptedWords()) this.wordsToBeIgnored.add(w);
      if (this.wordsToBeIgnored.size !== 0) this.ignoreNode = null;
    }
    this.setLocQualityIssueType(ITSIssueType.Misspelling);
  }

  // Java: SpellingCheckRule#addSuggestionsToRuleMatch(String,List,List,SuggestionsOrderer,RuleMatch)
  static addSuggestionsToRuleMatch(word, userCandidatesList, candidatesList, orderer, match) {
    const sentence = match.getSentence();
    const userCandidates = userCandidatesList.map((s) => s.getReplacement());
    const candidates = candidatesList.map((s) => s.getReplacement());
    const startPos = match.getFromPos();
    if (orderer !== null && orderer !== undefined && orderer.isMlAvailable()) {
      if (orderer instanceof SuggestionsRanker) {
        // don't rank words form user dictionary, assign confidence 0.0, but add at start
        // hard to ensure performance on unknown words
        const ranker = orderer;
        const defaultSuggestions = ranker.orderSuggestions(candidates, word, sentence, startPos);
        if (defaultSuggestions.length === 0) {
          // could not rank for some reason
        } else if (userCandidates.length === 0) {
          match.setAutoCorrect(ranker.shouldAutoCorrect(defaultSuggestions));
          match.setSuggestedReplacementObjects(defaultSuggestions);
        } else {
          const combinedSuggestions = [];
          for (const wordFromUserDict of userCandidates) {
            combinedSuggestions.push(new SuggestedReplacement(wordFromUserDict)); // confidence is null
          }
          combinedSuggestions.push(...defaultSuggestions);
          match.setSuggestedReplacementObjects(combinedSuggestions);
          // no auto correct when words from personal dictionaries are included
          match.setAutoCorrect(false);
        }
      } else if (orderer.computeFeatures !== undefined) {
        // Java: orderer instanceof SuggestionsOrdererFeatureExtractor (class not ported, CORE-0233 open; unreachable without an ML experiment)
        if (userCandidates.length !== 0) {
          throw new IllegalStateException('SuggestionsOrdererFeatureExtractor does not support suggestions from personal dictionaries at the moment.');
        }
        const suggestions = orderer.computeFeatures(candidates, word, sentence, startPos);
        match.setSuggestedReplacementObjects(suggestions[0]);
        match.setFeatures(suggestions[1]);
      } else {
        const combinedSuggestions = [];
        combinedSuggestions.push(...orderer.orderSuggestions(userCandidates, word, sentence, startPos));
        combinedSuggestions.push(...orderer.orderSuggestions(candidates, word, sentence, startPos));
        match.setSuggestedReplacementObjects(combinedSuggestions);
      }
    } else { // no reranking
      const combinedSuggestions = [...match.getSuggestedReplacementObjects()];
      combinedSuggestions.push(...userCandidatesList);
      combinedSuggestions.push(...candidatesList);
      match.setSuggestedReplacementObjects(combinedSuggestions);
    }
  }

  // Java: SpellingCheckRule#createWrongSplitMatch(AnalyzedSentence,List,int,String,String,String,int)
  createWrongSplitMatch(sentence, ruleMatchesSoFar, pos, coveredWord, suggestion1, suggestion2, prevPos) {
    if (ruleMatchesSoFar.length > 0) {
      const prevMatch = ruleMatchesSoFar[ruleMatchesSoFar.length - 1];
      if (prevMatch.getFromPos() === prevPos) {
        // we'll later create a new match that covers the previous misspelled word and the current one:
        ruleMatchesSoFar.splice(ruleMatchesSoFar.length - 1, 1);
      }
    }
    const ruleMatch = new RuleMatch(this, sentence, prevPos, pos + coveredWord.length,
      this.messages.getString('spelling'), this.messages.getString('desc_spelling_short'));
    ruleMatch.setType(RuleMatch.Type.UnknownWord);
    ruleMatch.setSuggestedReplacement(javaTrim(`${suggestion1} ${suggestion2}`));
    return ruleMatch;
  }

  // Java: SpellingCheckRule#getId() (abstract)
  getId() {
    throw new AbstractMethodError('org.languagetool.rules.spelling.SpellingCheckRule.getId()');
  }

  // Java: SpellingCheckRule#getDescription() (abstract)
  getDescription() {
    throw new AbstractMethodError('org.languagetool.rules.spelling.SpellingCheckRule.getDescription()');
  }

  // Java: SpellingCheckRule#match(AnalyzedSentence) (abstract)
  match() {
    throw new AbstractMethodError('org.languagetool.rules.spelling.SpellingCheckRule.match(org.languagetool.AnalyzedSentence)');
  }

  // Java: SpellingCheckRule#isMisspelled(String) (abstract)
  isMisspelled() {
    throw new AbstractMethodError('org.languagetool.rules.spelling.SpellingCheckRule.isMisspelled(java.lang.String)');
  }

  // Java: SpellingCheckRule#isDictionaryBasedSpellingRule()
  isDictionaryBasedSpellingRule() {
    return true;
  }

  // Java: SpellingCheckRule#addIgnoreTokens(List)
  addIgnoreTokens(tokens) {
    this.markIgnoreDirty();
    for (const t of tokens) this.wordsToBeIgnored.add(t);
  }

  // Java: SpellingCheckRule#updateIgnoredWordDictionary()
  updateIgnoredWordDictionary() {
    this.dictFromNode = false;
    this.dictFromNodeCI = false;
    this.wordsToBeIgnoredDictionaryIgnoreCase = null;
    this.wordsToBeIgnoredDictionary = null;
  }

  // Java: SpellingCheckRule#setConsiderIgnoreWords(boolean)
  setConsiderIgnoreWords(considerIgnoreWords) {
    this.considerIgnoreWords = considerIgnoreWords;
  }

  // Java: SpellingCheckRule#getAdditionalTopSuggestions(List,String)
  getAdditionalTopSuggestions(suggestions, word) {
    const moreSuggestions = [];
    if (('Languagetool' === word || 'languagetool' === word) && !suggestions.some((k) => k.getReplacement() === LANGUAGETOOL)) {
      moreSuggestions.push(LANGUAGETOOL);
    }
    if (('Languagetooler' === word || 'languagetooler' === word) && !suggestions.some((k) => k.getReplacement() === LANGUAGETOOLER)) {
      moreSuggestions.push(LANGUAGETOOLER);
    }
    return SuggestedReplacement.convert(moreSuggestions);
  }

  // Java: SpellingCheckRule#getOnlySuggestions(String)
  getOnlySuggestions() {
    return [];
  }

  // Java: SpellingCheckRule#getAdditionalSuggestions(List,String)
  getAdditionalSuggestions() {
    return [];
  }

  // Java: SpellingCheckRule#ignoreToken(AnalyzedTokenReadings[],int)
  ignoreToken(tokens, idx) {
    const words = [];
    for (const token of tokens) {
      words.push(token.getToken());
    }
    return this.ignoreWordAt(words, idx);
  }

  // Java: SpellingCheckRule#ignoreWord(String)
  ignoreWord(word) {
    if (word.length > MAX_TOKEN_LENGTH) {
      return true;
    }
    if (!this.considerIgnoreWords) {
      return false;
    }
    // Tokens with no letters cannot have spelling errors. So ignore them.
    let mHasNoLetter;
    if (this.isLatinScript()) {
      mHasNoLetter = pHasNoLetterLatin.matcher(word);
    } else {
      mHasNoLetter = pHasNoLetter.matcher(word);
    }
    if (mHasNoLetter.matches()) {
      return true;
    }
    if (word.endsWith('.') && !this.isInIgnoredSet(word)) {
      return this.isIgnoredNoCase(word.substring(0, word.length - 1)); // e.g. word at end of sentence
    }
    return this.isIgnoredNoCase(word);
  }

  // Java: SpellingCheckRule#ignoreWord(List,int) (JS name differs from the String overload)
  ignoreWordAt(words, idx) {
    return this.ignoreWord(listGet(words, idx));
  }

  // Java: SpellingCheckRule#isInIgnoredSet(String)
  isInIgnoredSet(word) {
    return this.wordsToBeIgnored.has(word);
  }

  // Java: SpellingCheckRule#isIgnoredNoCase(String)
  isIgnoredNoCase(word) {
    return this.isInIgnoredSet(word)
      || (!isMixedCase(word) && this.convertsCase && this.isInIgnoredSet(toLowerCase(word, this.language.getLocale())))
      || (this.ignoreWordsWithLength > 0 && word.length <= this.ignoreWordsWithLength);
  }

  // Java: SpellingCheckRule#ignorePotentiallyMisspelledWord(String)
  ignorePotentiallyMisspelledWord() {
    return false;
  }

  // Java: SpellingCheckRule#setConvertsCase(boolean)
  setConvertsCase(convertsCase) {
    this.convertsCase = convertsCase;
  }

  // Java: SpellingCheckRule#isUrl(String)
  isUrl(token) {
    return WordTokenizer.isUrl(token);
  }

  // Java: SpellingCheckRule#isEMail(String)
  isEMail(token) {
    return WordTokenizer.isEMail(token);
  }

  // Java: SpellingCheckRule#filterDupes(List)
  filterDupes(words) {
    return distinct(words);
  }

  // Java: SpellingCheckRule#init()
  init() {
    this.addIgnoreWordsList(this.wordListLoader.loadWords(this.getIgnoreFileName()));
    if (this.getSpellingFileName() !== null) {
      this.addIgnoreWordsList(this.wordListLoader.loadWords(this.getSpellingFileName()));
    }
    for (const fileName of this.getAdditionalSpellingFileNames()) {
      if (getDataBroker().resourceExists(fileName)) {
        this.addIgnoreWordsList(this.wordListLoader.loadWords(fileName));
      }
    }
    this.updateIgnoredWordDictionary();
    for (const prohibitedWord of this.wordListLoader.loadWords(this.getProhibitFileName())) {
      this.addProhibitedWords(this.expandLine(prohibitedWord));
    }
    for (const fileName of this.getAdditionalProhibitFileNames()) {
      for (const prohibitedWord of this.wordListLoader.loadWords(fileName)) {
        this.addProhibitedWords(this.expandLine(prohibitedWord));
      }
    }
  }

  // Java: SpellingCheckRule#getIgnoreFileName()
  getIgnoreFileName() {
    return this.language.getShortCode() + SPELLING_IGNORE_FILE;
  }

  // Java: SpellingCheckRule#getSpellingFileName()
  getSpellingFileName() {
    return this.language.getShortCode() + SPELLING_FILE;
  }

  // Java: SpellingCheckRule#getAdditionalSpellingFileNames()
  getAdditionalSpellingFileNames() {
    // NOTE: also add to GermanSpellerRule.getSpeller() when adding items here:
    return [this.language.getShortCode() + CUSTOM_SPELLING_FILE, GLOBAL_SPELLING_FILE];
  }

  // Java: SpellingCheckRule#getLanguageVariantSpellingFileName()
  getLanguageVariantSpellingFileName() {
    return SPELLING_FILE_VARIANT;
  }

  // Java: SpellingCheckRule#getProhibitFileName()
  getProhibitFileName() {
    return this.language.getShortCode() + SPELLING_PROHIBIT_FILE;
  }

  // Java: SpellingCheckRule#getAdditionalProhibitFileNames()
  getAdditionalProhibitFileNames() {
    return [this.language.getShortCode() + CUSTOM_SPELLING_PROHIBIT_FILE];
  }

  // Java: SpellingCheckRule#isProhibited(String)
  isProhibited(word) {
    return this.wordsToBeProhibited.has(word);
  }

  // Java: SpellingCheckRule#filterSuggestions(List)
  filterSuggestions(suggestions) {
    // Collection#removeIf modifies the argument list
    for (let i = suggestions.length - 1; i >= 0; i--) {
      if (this.isProhibited(suggestions[i].getReplacement())) suggestions.splice(i, 1);
    }
    let newSuggestions = [];
    for (const suggestion of suggestions) {
      const replacement = suggestion.getReplacement();
      const suggestionWithoutS = replacement.length > 3 ? replacement.substring(0, replacement.length - 2) : '';
      if (replacement.endsWith(' s') && this.isProperNoun(suggestionWithoutS)) {
        // "Michael s" -> "Michael's"
        const sugg1 = new SuggestedReplacement(suggestionWithoutS);
        sugg1.setType(SuggestedReplacement.SuggestionType.Curated);
        newSuggestions.unshift(sugg1);
        const sugg2 = new SuggestedReplacement(`${suggestionWithoutS}'s`);
        sugg2.setType(SuggestedReplacement.SuggestionType.Curated);
        newSuggestions.unshift(sugg2);
      } else {
        newSuggestions.push(suggestion);
      }
    }
    newSuggestions = this.filterDupes(newSuggestions);
    newSuggestions = this.filterNoSuggestWords(newSuggestions);
    return newSuggestions;
  }

  // Java: SpellingCheckRule#filterNoSuggestWords(List)
  filterNoSuggestWords(l) {
    return l;
  }

  // Java: SpellingCheckRule#isProperNoun(String)
  isProperNoun(wordWithoutS) {
    try {
      const tags = this.language.getTagger().tag([wordWithoutS]);
      return tags.some((k) => k.hasPosTag('NNP'));
    } catch (e) {
      if (e instanceof IOException) throw new RuntimeException(e);
      throw e;
    }
  }

  // JS: for (String line : lines) addIgnoreWords(line) over a (cached, immutable) list; lines are classified once per list
  addIgnoreWordsList(lines) {
    if (this.addIgnoreWords !== SpellingCheckRule.prototype.addIgnoreWords || lines.length < 64) {
      for (const line of lines) this.addIgnoreWords(line);
      return;
    }
    const plan = this.ignorePlanFor(lines, '', (addWord) => {
      for (const line of lines) addWord(line);
    });
    this.applyIgnorePlan(plan);
  }

  // JS: plan { single, multi, compounds } of the words fed by `feed(addWord, addCompound, addSingle)`; memo per list, tokenizer and variant key
  ignorePlanFor(lines, variantKey, feed) {
    const tokenize = this.tokenizeNewWords();
    const tokenizer = tokenize ? this.language.getWordTokenizer() : NO_TOKENIZER;
    let perList = IGNORE_LIST_PLANS.get(lines);
    if (perList === undefined) {
      perList = new Map();
      IGNORE_LIST_PLANS.set(lines, perList);
    }
    let perTokenizer = perList.get(tokenizer);
    if (perTokenizer === undefined) {
      perTokenizer = new Map();
      perList.set(tokenizer, perTokenizer);
    }
    let plan = perTokenizer.get(variantKey);
    if (plan === undefined) {
      // same classification as addIgnoreWords: single tokens (kept in order) and multi-token lines
      const single = new Set();
      const multi = [];
      const compounds = [];
      feed((word) => {
        if (!tokenize || tokenizer.tokenize(word).length <= 1) single.add(word);
        else multi.push(word);
      }, (word) => compounds.push(word), (word) => single.add(word));
      plan = { single, multi, compounds, antiPatterns: new Map() };
      perTokenizer.set(variantKey, plan);
    }
    return plan;
  }

  // JS: applies a plan; while the ignore set is exactly a known composition of plans, its content is copied from the memo
  applyIgnorePlan(plan) {
    const node = this.ignoreNode;
    if (node !== null) {
      let child = node.children.get(plan);
      if (child === undefined) {
        child = { set: null, sorted: null, sortedCI: null, children: new Map() };
        node.children.set(plan, child);
      }
      if (child.set === null) {
        const set = this.ignoreShared ? new Set(this.wordsToBeIgnored) : this.wordsToBeIgnored;
        for (const w of plan.single) set.add(w);
        child.set = set;
      }
      this.wordsToBeIgnored = child.set; // shared and never mutated: markIgnoreDirty copies it before the first change
      this.ignoreShared = true;
      this.ignoreNode = child;
    } else {
      for (const w of plan.single) this.wordsToBeIgnored.add(w);
    }
    for (const w of plan.compounds) this.wordsToBeIgnoredInCompounds.add(w);
    // multi-token lines are processed in list order relative to each other (single lines do not touch antiPatterns)
    if (plan.multi.length !== 0) {
      // the anti-pattern rules of multi-token lines are stateless: shared by all rules of the same language
      let rules = plan.antiPatterns.get(this.language);
      if (rules === undefined) {
        rules = [];
        const before = this.antiPatterns.length;
        for (const w of plan.multi) SpellingCheckRule.prototype.addIgnoreWords.call(this, w);
        for (let i = before; i < this.antiPatterns.length; i++) rules.push(this.antiPatterns[i]);
        plan.antiPatterns.set(this.language, rules);
      } else {
        for (const r of rules) this.antiPatterns.push(r);
      }
    }
  }

  // JS: wordsToBeIgnored is changed outside a plan; keeps the sorted dictionaries a Java rule would already hold
  markIgnoreDirty() {
    const node = this.ignoreNode;
    if (node === null) return;
    this.ignoreNode = null;
    if (this.ignoreShared) {
      this.wordsToBeIgnored = new Set(this.wordsToBeIgnored);
      this.ignoreShared = false;
    }
    if (this.dictFromNode) this.wordsToBeIgnoredDictionary = node.sorted;
    if (this.dictFromNodeCI) this.wordsToBeIgnoredDictionaryIgnoreCase = node.sortedCI;
    this.dictFromNode = false;
    this.dictFromNodeCI = false;
  }

  // Java: SpellingCheckRule#addIgnoreWords(String)
  addIgnoreWords(line) {
    if (!this.tokenizeNewWords()) {
      this.markIgnoreDirty();
      this.wordsToBeIgnored.add(line);
    } else {
      // if line consists of several words (separated by " "), a DisambiguationPatternRule
      // will be created where each words serves as a case-sensitive and non-inflected PatternToken
      // so that the entire multi-word entry is ignored by the spell checker
      // perf: lines known to give exactly one token for this (stateless, shared) tokenizer skip re-tokenizing
      const tokenizer = this.language.getWordTokenizer();
      let memo;
      if (tokenizer === this.ignoreMemoTokenizer) memo = this.ignoreMemo;
      else {
        memo = SINGLE_TOKEN_LINES.get(tokenizer);
        if (memo === undefined) {
          memo = { single: new Set(), multi: new Map() };
          SINGLE_TOKEN_LINES.set(tokenizer, memo);
        }
        this.ignoreMemoTokenizer = tokenizer;
        this.ignoreMemo = memo;
      }
      if (memo.single.has(line)) {
        this.markIgnoreDirty();
        this.wordsToBeIgnored.add(line);
        return;
      }
      let tokens = memo.multi.get(line);
      if (tokens === undefined) {
        tokens = tokenizer.tokenize(line);
        if (tokens.length <= 1) memo.single.add(line);
        else memo.multi.set(line, tokens);
      }
      if (tokens.length > 1) {
        const patternTokens = [];
        for (const token of tokens) {
          if (javaTrim(token).length === 0) {
            continue;
          }
          patternTokens.push(new PatternToken(token, true, false, false));
        }
        const DPR = Rule.disambiguationPatternRuleClass;
        if (DPR === null) throw Object.assign(new Error('not ported: DisambiguationPatternRule'), { notPorted: true });
        this.antiPatterns.push(new DPR('INTERNAL_ANTIPATTERN', '(no description)', this.language,
          patternTokens, null, null, DPR.DisambiguatorAction.IGNORE_SPELLING));
      } else {
        this.markIgnoreDirty();
        this.wordsToBeIgnored.add(line);
      }
    }
  }

  // Java: SpellingCheckRule#addProhibitedWords(List)
  addProhibitedWords(words) {
    for (const w of words) this.wordsToBeProhibited.add(w);
  }

  // Java: SpellingCheckRule#expandLine(String)
  expandLine(line) {
    return [line];
  }

  // Java: SpellingCheckRule#acceptPhrases(List)
  acceptPhrases(phrases) {
    const antiPatterns = [];
    for (const phrase of phrases) {
      const parts = javaSplit(phrase, ' ');
      const patternTokens = [];
      let i = 0;
      let startsLowercase = false;
      for (const part of parts) {
        if (i === 0 && part !== uppercaseFirstChar(part)) {
          startsLowercase = true;
        }
        patternTokens.push(new PatternTokenBuilder().csToken(part).build());
        i++;
      }
      antiPatterns.push(patternTokens);
      if (startsLowercase) {
        antiPatterns.push(getTokensForSentenceStart(parts));
      }
    }
    this.antiPatterns = Rule.makeAntiPatterns(antiPatterns, this.language);
  }

  // Java: SpellingCheckRule#getAntiPatterns()
  getAntiPatterns() {
    return this.antiPatterns;
  }

  // Java: SpellingCheckRule#startsWithIgnoredWord(String,boolean)
  startsWithIgnoredWord(word, caseSensitive) {
    if (word.length < 4) {
      return 0;
    }
    const comparator = caseSensitive ? javaCompare : CASE_INSENSITIVE_ORDER;
    let array = caseSensitive ? this.wordsToBeIgnoredDictionary : this.wordsToBeIgnoredDictionaryIgnoreCase;
    const node = this.ignoreNode;
    if (array === null && node !== null) {
      // JS: the sorted dictionary of a composition of plans is shared by all rules with the same ignore set
      array = caseSensitive ? node.sorted : node.sortedCI;
      if (array === null) {
        array = caseSensitive ? [...this.wordsToBeIgnored].sort() : [...this.wordsToBeIgnored].sort(comparator);
        if (caseSensitive) node.sorted = array;
        else node.sortedCI = array;
      }
      if (caseSensitive) this.dictFromNode = true;
      else this.dictFromNodeCI = true;
    } else if (array === null) {
      array = caseSensitive ? [...this.wordsToBeIgnored].sort() : [...this.wordsToBeIgnored].sort(comparator); // stable, as Stream#sorted; default sort = UTF-16 code unit order = String#compareTo
      if (caseSensitive) {
        this.wordsToBeIgnoredDictionary = array;
      } else {
        this.wordsToBeIgnoredDictionaryIgnoreCase = array;
      }
    }

    while (word.length !== 0) {
      const result = binarySearch(array, word, comparator);
      if (result >= 0) break;

      const prev = -result - 2;
      if (prev < 0) return 0;

      const prefix = caseSensitive
        ? commonPrefix(word, array[prev])
        : commonPrefix(toLowerCase(word, Locale.ROOT), toLowerCase(array[prev], Locale.ROOT));
      word = caseSensitive ? prefix : word.substring(0, prefix.length);
    }
    return word.length;
  }

  // Java: SpellingCheckRule#tokenizeNewWords()
  tokenizeNewWords() {
    return true;
  }

  // Java: SpellingCheckRule#isLatinScript()
  isLatinScript() {
    return true;
  }
}

// Java: SpellingCheckRule#getTokensForSentenceStart(String[]) (private static)
function getTokensForSentenceStart(parts) {
  const ucPatternTokens = [];
  let j = 0;
  for (const part of parts) {
    if (j === 0) {
      // at sentence start, we also need to accept a phrase that starts with an uppercase char:
      const uppercased = uppercaseFirstChar(part);
      ucPatternTokens.push(new PatternTokenBuilder().posRegex(SENTENCE_START_TAGNAME).build());
      ucPatternTokens.push(new PatternTokenBuilder().csToken(uppercased).build());
    } else {
      ucPatternTokens.push(new PatternTokenBuilder().csToken(part).build());
    }
    j++;
  }
  return ucPatternTokens;
}

JLanguageTool.spellingCheckRuleClass = SpellingCheckRule;
