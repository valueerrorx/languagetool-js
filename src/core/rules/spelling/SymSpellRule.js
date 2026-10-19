// org.languagetool.rules.spelling.SymSpellRule (experimental spell checking rule using the SymSpell algorithm)
import { SpellingCheckRule } from './SpellingCheckRule.js';
import { UncheckedExecutionException } from './morfologik/MorfologikSpeller.js';
import { SymSpell } from './symspell/implementation/SymSpell.js';
import { SuggestionStage } from './symspell/implementation/SuggestionStage.js';
import { RuleMatch } from '../model/RuleMatch.js';
import { SuggestedReplacement } from '../model/SuggestedReplacement.js';
import { getDataBroker } from '../../resources/LtStatics.js';
import { BufferedReader, decodeUtf8 } from '../../../lib/java/io.js';
import { IOException, IllegalArgumentException, RuntimeException, Throwable } from '../../../lib/java/errors.js';
import { replaceOnce } from '../../../lib/java/StringUtils.js';

const INITIAL_CAPACITY = 50000; // Java: SymSpellRule#INITIAL_CAPACITY

// Java: HashMap<Language,...> keys (Language#equals: same class and same shortCodeWithCountryAndVariant)
const langKey = (lang) => `${lang.constructor.FQCN ?? lang.constructor.name}|${lang.getShortCodeWithCountryAndVariant()}`;

// Java: LoadingCache#getUnchecked(K): loader exceptions are wrapped in UncheckedExecutionException (expiry is not observable)
function getUnchecked(cache, lang, load) {
  const key = langKey(lang);
  if (!cache.has(key)) {
    try {
      cache.set(key, load(lang));
    } catch (e) {
      if (e instanceof Throwable) throw new UncheckedExecutionException(e);
      throw e;
    }
  }
  return cache.get(key);
}

const spellerCache = new Map(); // Java: SymSpellRule#spellerCache
const ignoredWordsCache = new Map(); // Java: SymSpellRule#ignoredWordsCache
const prohibitedWordsCache = new Map(); // Java: SymSpellRule#prohibitedWordsCache

// Java: SymSpellRule#getSpellingDictBaseDir(Language)
function getSpellingDictBaseDir(lang) {
  return `${lang.getShortCode()}/hunspell/`;
}

// Java: SymSpellRule#forEachLineInResources(List,Consumer)
function forEachLineInResources(resources, fn) {
  const broker = getDataBroker();
  for (const resource of resources) {
    if (broker.resourceExists(resource)) {
      try {
        const reader = new BufferedReader(decodeUtf8(broker.getFromResourceDirAsStream(resource)));
        let line;
        while ((line = reader.readLine()) !== null) {
          fn(line);
        }
      } catch (e) {
        if (e instanceof IOException) throw new RuntimeException(`Could not read resource ${resource}`, e);
        throw e;
      }
    }
  }
}

// Java: SymSpellRule#getWordList(Language,String)
function getWordList(lang, file) {
  const base = getSpellingDictBaseDir(lang);
  const paths = [base + file];
  const words = new Set();
  forEachLineInResources(paths, (w) => words.add(w));
  return words;
}

// Java: SymSpellRule#initDefaultDictSpeller(Language)
function initDefaultDictSpeller(lang) {
  const speller = new SymSpell(INITIAL_CAPACITY, 3, -1, 0);
  process.stdout.write('Initializing symspell\n');
  const prohibitedWords = getUnchecked(prohibitedWordsCache, lang, (l) => getWordList(l, 'probibit.txt'));
  const startTime = Date.now();

  const base = getSpellingDictBaseDir(lang);
  const additional = [`${base}spelling.txt`, `${base}spelling_${lang.getShortCodeWithCountryAndVariant()}.txt`];
  const dict = [`${base}${replaceOnce(lang.getShortCodeWithCountryAndVariant(), '-', '_')}.dic`];

  const stage = new SuggestionStage(100000);
  forEachLineInResources(additional, (word) => {
    if (!prohibitedWords.has(word)) {
      speller.createDictionaryEntry(word, 1, stage);
    }
  });
  let dictWords = 0;
  forEachLineInResources(dict, (line) => {
    const split = line.lastIndexOf('+');
    if (split === -1 || line.length <= split + 1) {
      throw new IllegalArgumentException(`Could not parse frequency dictionary line '${line}'.`);
    }
    const word = line.substring(0, split);
    const freqClass = line.charCodeAt(split + 1);
    const freq = 1 + (freqClass - 'A'.charCodeAt(0)); // A - least frequent, Z - most frequent
    // exact frequencies don't matter, only used as tiebreaker for sorting

    if (!prohibitedWords.has(word)) {
      speller.createDictionaryEntry(word, freq, stage);
      dictWords++;
    }
  });
  process.stdout.write(`Loaded ${dictWords} words from dictionary.\n`);
  speller.commitStaged(stage);
  const delta = Date.now() - startTime;
  process.stdout.write(`Reading dictionaries took ${(delta / 1000.0).toFixed(6)} seconds.\n`);
  return speller;
}

// Java: SymSpellRule (@Experimental)
export class SymSpellRule extends SpellingCheckRule {
  static FQCN = 'org.languagetool.rules.spelling.SymSpellRule';
  static INITIAL_CAPACITY = INITIAL_CAPACITY;

  // Java: SymSpellRule#initUserDictSpeller(UserConfig); null if no custom speller is needed
  static initUserDictSpeller(config) {
    if (config !== null && config !== undefined && config.getAcceptedWords() !== null && config.getAcceptedWords().length !== 0) {
      const dict = config.getAcceptedWords();
      const speller = new SymSpell(0, 3, -1, 0);
      const stage = new SuggestionStage(dict.length);
      dict.forEach((word) => {
        speller.createDictionaryEntry(word, 1, stage);
      });
      speller.commitStaged(stage);
      return speller;
    }
    return null;
  }

  // Java: SymSpellRule#initDefaultDictSpeller(Language)
  static initDefaultDictSpeller(lang) {
    return initDefaultDictSpeller(lang);
  }

  // Java: SymSpellRule#getSpellingDictBaseDir(Language)
  static getSpellingDictBaseDir(lang) {
    return getSpellingDictBaseDir(lang);
  }

  // Java: SymSpellRule(ResourceBundle,Language,UserConfig[,List[,LanguageModel]])
  constructor(messages, language, userConfig, altLanguages = [], languageModel = null) {
    super(messages, language, userConfig, altLanguages, languageModel);
    this.editDistance = 3;
    this.verbosity = SymSpell.Verbosity.Closest;
    this.orderer = null;
    this.initParameters();
    this.defaultDictSpeller = getUnchecked(spellerCache, language, initDefaultDictSpeller);
    this.userDictSpeller = SymSpellRule.initUserDictSpeller(userConfig);
  }

  // Java: SymSpellRule#initParameters(); SuggestionsChanges.getInstance() is null outside of ML experiments (init is package-private, CORE-0233 open)
  initParameters() {
  }

  // Java: SymSpellRule#getId()
  getId() {
    return 'SYMSPELL_RULE';
  }

  // Java: SymSpellRule#getDescription()
  getDescription() {
    return 'Spell checking rule using SymSpell algorithm';
  }

  // Java: SymSpellRule#match(AnalyzedSentence)
  match(sentence) {
    const matches = [];
    const ignoredWords = getUnchecked(ignoredWordsCache, this.language, (l) => getWordList(l, 'ignore.txt'));
    for (const token of sentence.getTokensWithoutWhitespace()) {
      if (token.isSentenceStart() || token.isImmunized() || token.isIgnoredBySpeller() || token.isNonWord()) {
        continue;
      }
      const word = token.getToken();
      if (ignoredWords.has(word)) {
        continue;
      }
      const candidates = SuggestedReplacement.convert(this.filterCandidates(this.getSpellerMatches(word, this.defaultDictSpeller)));
      const userCandidates = SuggestedReplacement.convert(this.getSpellerMatches(word, this.userDictSpeller));
      // TODO: messages
      let match = null;
      if (candidates.length === 0 && userCandidates.length === 0) {
        match = new RuleMatch(this, sentence, token.getStartPos(), token.getEndPos(), 'Misspelling or unknown word!');
      } else if (!(candidates.length > 0 && candidates[0].getReplacement() === word
        || userCandidates.length > 0 && userCandidates[0].getReplacement() === word)) {
        match = new RuleMatch(this, sentence, token.getStartPos(), token.getEndPos(), 'Misspelling!');

        SpellingCheckRule.addSuggestionsToRuleMatch(token.getToken(), userCandidates, candidates, this.orderer, match);
      }
      if (match !== null) {
        matches.push(match);
      }
    }
    return matches;
  }

  // Java: SymSpellRule#isMisspelled(String)
  isMisspelled() {
    throw new RuntimeException('not implemented');
  }

  // Java: SymSpellRule#filterCandidates(List)
  filterCandidates(candidates) {
    const ignoredWords = getUnchecked(ignoredWordsCache, this.language, (l) => getWordList(l, 'ignore.txt'));
    const prohibitedWords = getUnchecked(prohibitedWordsCache, this.language, (l) => getWordList(l, 'probibit.txt'));
    return candidates
      .filter((c) => !ignoredWords.has(c))
      .filter((c) => !prohibitedWords.has(c));
  }

  // Java: SymSpellRule#getSpellerMatches(String,SymSpell)
  getSpellerMatches(word, speller) {
    if (speller === null) {
      return [];
    }
    const candidatesData = speller.lookup(word, this.verbosity, this.editDistance);
    return candidatesData.map((candidate) => candidate.term);
  }
}
