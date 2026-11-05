// Java: org.languagetool.rules.spelling.morfologik.MorfologikMultiSpeller
import { CFSA2Serializer } from '../../../../lib/fsa/CFSA2Serializer.js';
import { Dictionary } from '../../../../lib/fsa/DictionaryLookup.js';
import { FSABuilder, LEXICAL_ORDERING } from '../../../../lib/fsa/FSABuilder.js';
import { decodeUtf8Java, getBytesUtf8 } from '../../../../lib/java/charset.js';
import { IllegalArgumentException, IllegalStateException, NullPointerException, Throwable } from '../../../../lib/java/errors.js';
import { BufferedReader } from '../../../../lib/java/io.js';
import { Objects } from '../../../../lib/java/Objects.js';
import { javaReplace, javaSplit, javaTrim } from '../../../../lib/java/strings.js';
import { DICTIONARY_FILENAME_EXTENSION } from '../../../JLanguageToolConstants.js';
import { getDataBroker } from '../../../resources/LtStatics.js';
import { LANGUAGETOOL, MorfologikSpeller, UncheckedExecutionException } from './MorfologikSpeller.js';

// Java: String.valueOf(Object) for a nullable boxed value
const str = (v) => (v === null || v === undefined ? 'null' : String(v));

// Java: List#toString() of strings
const listToString = (l) => `[${l.map(str).join(', ')}]`;

// Java: LoadingCache<BufferedReaderWithSource, List<byte[]>> (keys equal by readerPath and languageVariantPath)
const dictCache = new Map();
// Java: MorfologikMultiSpeller#dicPathToDict
const dicPathToDict = new Map();
// Java: MorfologikMultiSpeller#userDictCaches
const userDictCaches = new Map();
// Java: MorfologikMultiSpeller#userDictSizes
const userDictSizes = new Map();

// Java: LoadingCache#getUnchecked for the line cache loader (loader exceptions are wrapped)
function loadLines(key) {
  const cacheKey = JSON.stringify([key.readerPath, key.languageVariantPath]);
  if (!dictCache.has(cacheKey)) {
    try {
      dictCache.set(cacheKey, loadLinesOf(key));
    } catch (e) {
      if (e instanceof Throwable) throw new UncheckedExecutionException(e);
      throw e;
    }
  }
  return dictCache.get(cacheKey);
}

// Java: MorfologikMultiSpeller#dictCache CacheLoader#load(BufferedReaderWithSource)
function loadLinesOf(reader) {
  const lines = getLines(reader.reader, reader.readerPath, reader.language);
  if (reader.languageVariantReader !== null) {
    for (const l of getLines(reader.languageVariantReader, reader.readerPath, reader.language)) lines.push(l);
    lines.push(getBytesUtf8(LANGUAGETOOL)); // adding here so it's also used for suggestions
  }
  return lines;
}

// Java: MorfologikMultiSpeller#dictCache CacheLoader#getLines(BufferedReader,String,Language)
function getLines(br, path, lang) {
  const lines = [];
  let originalLine;
  while ((originalLine = br.readLine()) !== null) {
    let lineList;
    if (lang !== null && lang !== undefined) {
      lineList = lang.prepareLineForSpeller(originalLine);
    } else {
      lineList = [originalLine];
    }
    for (let line of lineList) {
      if (line.startsWith('#') || line.length === 0) {
        continue;
      }
      line = javaTrim(javaSplit(line, '#')[0]);
      if (line.length !== 0) {
        lines.push(getBytesUtf8(line));
      }
    }
  }
  return lines;
}

// Java: Guava Cache with maximumWeight, concurrencyLevel(1) and a weigher (LRU eviction; the 10 minute expiry is not observable)
class WeightedCache {
  // Java: CacheBuilder#maximumWeight(long)
  constructor(maximumWeight, weigher) {
    this.maximumWeight = maximumWeight;
    this.weigher = weigher;
    this.entries = new Map(); // access order: first = least recently used
    this.totalWeight = 0;
  }

  // Java: Cache#getIfPresent(Object)
  getIfPresent(key) {
    const e = this.entries.get(key);
    if (e === undefined) return null;
    this.entries.delete(key);
    this.entries.set(key, e);
    return e.value;
  }

  // Java: Cache#put(Object,Object)
  put(key, value) {
    const weight = this.weigher(key, value);
    const old = this.entries.get(key);
    if (old !== undefined) {
      this.totalWeight -= old.weight;
      this.entries.delete(key);
    }
    this.entries.set(key, { value, weight });
    this.totalWeight += weight;
    // Java: LocalCache$Segment#evictEntries(ReferenceEntry)
    if (weight > this.maximumWeight) {
      this.entries.delete(key);
      this.totalWeight -= weight;
    }
    while (this.totalWeight > this.maximumWeight) {
      let evicted = false;
      for (const [k, e] of this.entries) {
        if (e.weight > 0) {
          this.entries.delete(k);
          this.totalWeight -= e.weight;
          evicted = true;
          break;
        }
      }
      if (!evicted) break;
    }
  }
}

// Java: MorfologikMultiSpeller$BufferedReaderWithSource
class BufferedReaderWithSource {
  // Java: MorfologikMultiSpeller$BufferedReaderWithSource#BufferedReaderWithSource(BufferedReader,String,BufferedReader,String,Language)
  constructor(reader, readerPath, languageVariantReader, languageVariantPath, language) {
    this.reader = Objects.requireNonNull(reader);
    this.readerPath = Objects.requireNonNull(readerPath);
    this.languageVariantReader = languageVariantReader;
    this.languageVariantPath = languageVariantPath;
    this.language = language;
  }
}

// Java: MorfologikMultiSpeller
export class MorfologikMultiSpeller {
  static FQCN = 'org.languagetool.rules.spelling.morfologik.MorfologikMultiSpeller';

  // Java: MorfologikMultiSpeller#MorfologikMultiSpeller(String,List,String,int) / (String,List,String,UserConfig,int,Language) / (String,BufferedReader,List,BufferedReader,String,UserConfig,int,Language)
  constructor(...args) {
    this.defaultDictSuggestionsCache = new Map(); // Java: Cache maximumSize(2000)
    if (args.length === 4) {
      const [binaryDictPath, plainTextPaths, languageVariantPlainTextPath, maxEditDistance] = args;
      this.init6(binaryDictPath, plainTextPaths, languageVariantPlainTextPath, null, maxEditDistance, null);
    } else if (args.length === 6) {
      this.init6(...args);
    } else {
      this.init8(...args);
    }
  }

  // Java: MorfologikMultiSpeller#MorfologikMultiSpeller(String,List,String,UserConfig,int,Language)
  init6(binaryDictPath, plainTextPaths, languageVariantPlainTextPath, userConfig, maxEditDistance, lang) {
    const plainTextReader = MorfologikMultiSpeller.getBufferedReader(plainTextPaths);
    const variantReader = languageVariantPlainTextPath === null ? null
      : new BufferedReader(decodeUtf8Java(getDataBroker().getFromResourceDirAsStream(languageVariantPlainTextPath)));
    this.init8(binaryDictPath, plainTextReader, plainTextPaths, variantReader, languageVariantPlainTextPath, userConfig, maxEditDistance, lang);
    for (const plainTextPath of plainTextPaths) {
      if (plainTextPath !== null
        && (!plainTextPath.endsWith('.txt')
          || (languageVariantPlainTextPath !== null && !languageVariantPlainTextPath.endsWith('.txt')))) {
        throw new IllegalArgumentException(`Unsupported dictionary, plain text file needs to have suffix .txt: ${plainTextPath}`);
      }
    }
  }

  // Java: MorfologikMultiSpeller#MorfologikMultiSpeller(String,BufferedReader,List,BufferedReader,String,UserConfig,int,Language)
  init8(binaryDictPath, plainTextReader, plainTextReaderPath, languageVariantPlainTextReader, languageVariantPlainTextPath, userConfig, maxEditDistance, lang) {
    this.language = lang;
    if (userConfig === null || userConfig === undefined || userConfig.getAcceptedWords() === null || userConfig.getAcceptedWords().length === 0) {
      this.premiumUid = null;
      this.userDictName = null;
      this.userDictCacheSize = null;
    } else {
      this.premiumUid = userConfig.getPremiumUid();
      this.userDictName = userConfig.getUserDictName();
      this.userDictCacheSize = userConfig.getUserDictCacheSize();
    }
    if (this.premiumUid !== null && this.userDictCacheSize !== null) {
      this.userDictCacheKey = `${this.premiumUid}\u0000${binaryDictPath}`; // Java: UserDictCacheKey(premiumUid, binaryDictPath)
    } else {
      this.userDictCacheKey = null;
    }
    const speller = this.getBinaryDict(binaryDictPath, maxEditDistance);
    const spellers = [];
    const userDictSpeller = this.getUserDictSpellerOrNull(userConfig, binaryDictPath, maxEditDistance);
    if (userDictSpeller !== null) {
      // add this first, as otherwise suggestions from user's own dictionary might
      // drown in the mass of other suggestions
      spellers.push(userDictSpeller);
      this.userDictSpellers = [userDictSpeller];
    } else {
      this.userDictSpellers = [];
    }
    spellers.push(speller);
    this.convertsCase_ = speller.convertsCase();
    if (plainTextReader !== null) {
      const plainTextSpeller = this.getPlainTextDictSpellerOrNull(plainTextReader, plainTextReaderPath,
        languageVariantPlainTextReader, languageVariantPlainTextPath, binaryDictPath, maxEditDistance);
      if (plainTextSpeller !== null) {
        spellers.push(plainTextSpeller);
        this.defaultDictSpellers = [speller, plainTextSpeller];
      } else {
        this.defaultDictSpellers = [speller];
      }
    } else {
      this.defaultDictSpellers = [speller];
    }
    this.spellers = spellers;
  }

  // Java: MorfologikMultiSpeller#getBufferedReader(List)
  static getBufferedReader(plainTextPaths) {
    const streams = [];
    for (const plainTextPath of plainTextPaths) {
      streams.push(getDataBroker().getFromResourceDirAsStream(plainTextPath));
    }
    return new BufferedReader(() => decodeUtf8Java(Buffer.concat(streams))); // JS: decoded lazily
  }

  // all static caches of a fresh JVM (oracle adapters start each case file with empty caches)
  static clearStaticCaches() {
    dictCache.clear();
    dicPathToDict.clear();
    userDictCaches.clear();
    userDictSizes.clear();
  }

  // Java: MorfologikMultiSpeller#clearUserDictCache()
  static clearUserDictCache() {
    userDictCaches.clear();
    userDictSizes.clear();
  }

  // Java: MorfologikMultiSpeller#getUserDictCache()
  getUserDictCache() {
    if (this.premiumUid === null || this.userDictCacheSize === null || this.userDictName === null) {
      throw new IllegalStateException(`No user / dict caching / dict name configured: user = ${str(this.premiumUid)}, cache size = ${str(this.userDictCacheSize)}, dict name = ${str(this.userDictName)}`);
    }
    const key = this.userDictCacheKey;
    if (userDictCaches.has(key)) {
      return userDictCaches.get(key);
    }
    const cache = new WeightedCache(Number(this.userDictCacheSize), (k) => userDictSizes.get(key).get(k));
    userDictCaches.set(key, cache);
    return cache;
  }

  // Java: MorfologikMultiSpeller#getUserDictSpellerOrNull(UserConfig,String,int)
  getUserDictSpellerOrNull(userConfig, dictPath, maxEditDistance) {
    if (this.premiumUid === null) {
      return null;
    }
    if (userConfig.getAcceptedWords().length === 0) {
      return null;
    }
    const byteLinesSupplier = () => {
      const byteLines = [];
      for (const line of userConfig.getAcceptedWords()) {
        byteLines.push(getBytesUtf8(line));
      }
      return byteLines;
    };
    const dictionary = this.getDictionary(byteLinesSupplier, dictPath,
      javaReplace(dictPath, DICTIONARY_FILENAME_EXTENSION, '.info'),
      true, userConfig.getAcceptedWords().length);
    return new MorfologikSpeller(dictionary, maxEditDistance);
  }

  // Java: MorfologikMultiSpeller#getBinaryDict(String,int)
  getBinaryDict(binaryDictPath, maxEditDistance) {
    if (binaryDictPath.endsWith(DICTIONARY_FILENAME_EXTENSION)) {
      return new MorfologikSpeller(binaryDictPath, maxEditDistance);
    }
    throw new IllegalArgumentException(`Unsupported dictionary, binary Morfologik file needs to have suffix .dict: ${binaryDictPath}`);
  }

  // Java: MorfologikMultiSpeller#getPlainTextDictSpellerOrNull(BufferedReader,List,BufferedReader,String,String,int)
  getPlainTextDictSpellerOrNull(plainTextReader, plainTextReaderPaths, languageVariantPlainTextReader, languageVariantPlainTextPath, dictPath, maxEditDistance) {
    const lineSupplier = () => {
      const lines = [];
      for (const plainTextReaderPath of plainTextReaderPaths) {
        const l = loadLines(new BufferedReaderWithSource(plainTextReader, plainTextReaderPath,
          languageVariantPlainTextReader, languageVariantPlainTextPath, this.language));
        for (const x of l) lines.push(x);
      }
      if (lines.length === 0) {
        return null;
      }
      return lines;
    };
    const dictionary = this.getDictionary(lineSupplier, listToString(plainTextReaderPaths),
      javaReplace(dictPath, DICTIONARY_FILENAME_EXTENSION, '.info'), false, 0);
    if (dictionary === null) {
      return null;
    }
    return new MorfologikSpeller(dictionary, maxEditDistance);
  }

  // Java: MorfologikMultiSpeller#getDictionary(Supplier,String,String,boolean,int)
  getDictionary(lines, dictPath, infoPath, isUserDict, userDictSize) {
    // avoid reading data for dictionaries when we can just use the cached one
    // by passing in lines lazily
    const cacheKey = `${dictPath}|${infoPath}`;
    const dictFromCache = dicPathToDict.get(cacheKey);
    if (!isUserDict && dictFromCache !== undefined) {
      return dictFromCache;
    }
    if (isUserDict && this.userDictCacheSize !== null) {
      // for cache weigher, save dictionary sizes
      if (!userDictSizes.has(this.userDictCacheKey)) userDictSizes.set(this.userDictCacheKey, new Map());
      userDictSizes.get(this.userDictCacheKey).set(this.userDictName, userDictSize);
      const userDictCache = this.getUserDictCache();
      const userDict = userDictCache.getIfPresent(this.userDictName);
      if (userDict !== null) {
        return userDict;
      }
    }
    // Creating the dictionary at runtime can easily take 50ms for spelling.txt files that are ~50KB.
    // The result is cached: dicPathToDict for the standard dictionaries, a weighted cache for selected users.
    const linesCopy = lines();
    if (linesCopy === null) {
      throw new NullPointerException('Cannot invoke "java.util.List.isEmpty()" because "linesCopy" is null');
    }
    if (linesCopy.length === 0) {
      return null;
    }
    linesCopy.sort(LEXICAL_ORDERING);
    const fsa = FSABuilder.build(linesCopy);
    const fsaBytes = new CFSA2Serializer().serialize(fsa);
    const metadata = getDataBroker().getFromResourceDirAsStream(infoPath);
    const dict = Dictionary.readImages(fsaBytes, metadata);
    if (!isUserDict) {
      dicPathToDict.set(cacheKey, dict);
    } else if (this.userDictCacheSize !== null) {
      this.getUserDictCache().put(this.userDictName, dict);
    }
    return dict;
  }

  // Java: MorfologikMultiSpeller#isMisspelled(String)
  isMisspelled(word) {
    for (const speller of this.spellers) {
      if (!speller.isMisspelled(word)) {
        return false;
      }
    }
    return true;
  }

  // Java: MorfologikMultiSpeller#getFrequency(String)
  getFrequency(word) {
    for (const speller of this.spellers) {
      const freq = speller.getFrequency(word);
      if (freq > 0) {
        return freq;
      }
    }
    return 0;
  }

  // Java: MorfologikMultiSpeller#getSuggestionsFromSpellers(String,List)
  getSuggestionsFromSpellers(word, spellerList) {
    const result = [];
    const seenWords = new Set();
    for (const speller of spellerList) {
      const suggestions = speller.getSuggestions(word);
      for (const suggestion of suggestions) {
        if (!seenWords.has(suggestion.getWord()) && suggestion.getWord() !== word) {
          result.push(suggestion);
        }
        seenWords.add(suggestion.getWord());
      }
    }
    result.sort((a, b) => a.compareTo(b)); // Collections.sort (stable)
    return result.slice();
  }

  // Java: MorfologikMultiSpeller#getSuggestions(String)
  getSuggestions(word) {
    return this.getSuggestionsFromSpellers(word, this.spellers).map((s) => s.getWord());
  }

  // Java: MorfologikMultiSpeller#getSuggestionsFromUserDicts(String)
  getSuggestionsFromUserDicts(word) {
    return this.getWeightedSuggestionsFromUserDicts(word).map((s) => s.getWord());
  }

  // Java: MorfologikMultiSpeller#getWeightedSuggestionsFromUserDicts(String)
  getWeightedSuggestionsFromUserDicts(word) {
    return this.getSuggestionsFromSpellers(word, this.userDictSpellers);
  }

  // Java: MorfologikMultiSpeller#getSuggestionsFromDefaultDicts(String)
  getSuggestionsFromDefaultDicts(word) {
    return this.getWeightedSuggestionsFromDefaultDicts(word).map((s) => s.getWord());
  }

  // Java: MorfologikMultiSpeller#getWeightedSuggestionsFromDefaultDicts(String)
  getWeightedSuggestionsFromDefaultDicts(word) {
    const cache = this.defaultDictSuggestionsCache;
    if (cache.has(word)) return cache.get(word);
    let value;
    try {
      value = this.getSuggestionsFromSpellers(word, this.defaultDictSpellers);
    } catch (e) {
      // Cache#get(K,Callable): unchecked loader exceptions become UncheckedExecutionException
      if (e instanceof Throwable) throw new UncheckedExecutionException(e);
      throw e;
    }
    if (cache.size >= 2000) cache.delete(cache.keys().next().value);
    cache.set(word, value);
    return value;
  }

  // Java: MorfologikMultiSpeller#convertsCase()
  convertsCase() {
    return this.convertsCase_;
  }
}
