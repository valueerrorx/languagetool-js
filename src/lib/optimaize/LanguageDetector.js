// Java: com.optimaize.langdetect.{LanguageDetectorBuilder,LanguageDetectorImpl,NgramFrequencyData,DetectedLanguage}, cybozu.util.Util#normalizeProb
import { JavaHashMap } from '../java/collections/JavaHashMap.js';
import { IllegalArgumentException, IllegalStateException } from '../java/errors.js';
import { Random } from '../java/Random.js';
import { doubleToString } from '../java/toString.js';

const ALPHA_DEFAULT = 0.5;
const ALPHA_WIDTH = 0.05;
const ITERATION_LIMIT = 1000;
const CONV_THRESHOLD = 0.99999;
const BASE_FREQ = 10000;
const N_TRIAL = 7;
const DEFAULT_SEED = 41;

// Java: com.optimaize.langdetect.cybozu.util.Util#normalizeProb(double[])
export function normalizeProb(prob) {
  let maxp = 0;
  let sump = 0;
  for (let i = 0; i < prob.length; ++i) sump += prob[i];
  for (let i = 0; i < prob.length; ++i) {
    const p = prob[i] / sump;
    if (maxp < p) maxp = p;
    prob[i] = p;
  }
  return maxp;
}

// Java: com.optimaize.langdetect.DetectedLanguage
export class DetectedLanguage {
  static FQCN = 'com.optimaize.langdetect.DetectedLanguage';

  // Java: DetectedLanguage#DetectedLanguage(LdLocale,double)
  constructor(locale, probability) {
    if (probability < 0) throw new IllegalArgumentException(`Probability must be >= 0 but was ${doubleToString(probability)}`);
    if (probability > 1) throw new IllegalArgumentException(`Probability must be <= 1 but was ${doubleToString(probability)}`);
    this.locale = locale;
    this.probability = probability;
  }

  // Java: DetectedLanguage#getLocale()
  getLocale() {
    return this.locale;
  }

  // Java: DetectedLanguage#getProbability()
  getProbability() {
    return this.probability;
  }

  // Java: DetectedLanguage#toString()
  toString() {
    return `DetectedLanguage[${this.locale}:${doubleToString(this.probability)}]`;
  }
}

// Java: com.optimaize.langdetect.NgramFrequencyData
export class NgramFrequencyData {
  // Java: NgramFrequencyData#NgramFrequencyData(Map,List)
  constructor(wordLangProbMap, langlist) {
    this.wordLangProbMap = wordLangProbMap;
    this.langlist = langlist;
  }

  // Java: NgramFrequencyData#create(Collection<LanguageProfile>,Collection<Integer>) (profiles in the collection's iteration order)
  static create(languageProfiles, gramLengths) {
    if (languageProfiles.length === 0) throw new IllegalArgumentException('No languageProfiles provided!');
    if (gramLengths.length === 0) throw new IllegalArgumentException('No gramLengths provided!');
    const wordLangProbMap = new Map();
    const langlist = [];
    const langsize = languageProfiles.length;
    let index = -1;
    for (const profile of languageProfiles) {
      index++;
      langlist.push(profile.getLocale());
      for (const gramLength of gramLengths) {
        if (!profile.getGramLengths().includes(gramLength)) {
          throw new IllegalArgumentException(`The language profile for ${profile.getLocale()} does not contain ${gramLength}-grams!`);
        }
        for (const [ngram, frequency] of profile.iterateGrams(gramLength)) {
          let arr = wordLangProbMap.get(ngram);
          if (arr === undefined) {
            arr = new Float64Array(langsize);
            wordLangProbMap.set(ngram, arr);
          }
          arr[index] = frequency / profile.getNumGramOccurrences(ngram.length);
        }
      }
    }
    return new NgramFrequencyData(wordLangProbMap, langlist);
  }

  // Java: NgramFrequencyData#getLanguageList()
  getLanguageList() {
    return this.langlist;
  }

  // Java: NgramFrequencyData#getLanguage(int)
  getLanguage(pos) {
    return this.langlist[pos];
  }

  // Java: NgramFrequencyData#getProbabilities(String)
  getProbabilities(ngram) {
    return this.wordLangProbMap.get(ngram) ?? null;
  }
}

// Java: LanguageDetectorImpl#PROBABILITY_SORTING_COMPARATOR (Double.compare(b, a); values are >= 0.1, no NaN)
const PROBABILITY_SORTING_COMPARATOR = (a, b) => (b.probability < a.probability ? -1 : (b.probability > a.probability ? 1 : 0));

// Java: com.optimaize.langdetect.LanguageDetectorImpl (no priorMap: langWeightingMap is never set by LT)
export class LanguageDetectorImpl {
  // Java: LanguageDetectorImpl#LanguageDetectorImpl(NgramFrequencyData,double,Optional,int,double,double,double,double,Map,NgramExtractor)
  constructor(ngramFrequencyData, alpha, seed, shortTextAlgorithm, prefixFactor, suffixFactor, probabilityThreshold, minimalConfidence, ngramExtractor) {
    if (alpha < 0 || alpha > 1) throw new IllegalArgumentException(`alpha must be between 0 and 1, but was: ${doubleToString(alpha)}`);
    if (prefixFactor < 0 || prefixFactor > 10) throw new IllegalArgumentException(`prefixFactor must be between 0 and 10, but was: ${doubleToString(prefixFactor)}`);
    if (suffixFactor < 0 || suffixFactor > 10) throw new IllegalArgumentException(`suffixFactor must be between 0 and 10, but was: ${doubleToString(suffixFactor)}`);
    if (probabilityThreshold < 0 || probabilityThreshold > 1) throw new IllegalArgumentException(`probabilityThreshold must be between 0 and 1, but was: ${doubleToString(probabilityThreshold)}`);
    if (minimalConfidence < 0 || minimalConfidence > 1) throw new IllegalArgumentException(`minimalConfidence must be between 0 and 1, but was: ${doubleToString(minimalConfidence)}`);
    this.ngramFrequencyData = ngramFrequencyData;
    this.alpha = alpha;
    this.seed = seed;
    this.shortTextAlgorithm = shortTextAlgorithm;
    this.prefixFactor = prefixFactor;
    this.suffixFactor = suffixFactor;
    this.probabilityThreshold = probabilityThreshold;
    this.minimalConfidence = minimalConfidence;
    this.ngramExtractor = ngramExtractor;
  }

  // Java: LanguageDetectorImpl#detect(CharSequence) (LdLocale or null for Optional.absent())
  detect(text) {
    const probabilities = this.getProbabilities(text);
    if (probabilities.length === 0) return null;
    const best = probabilities[0];
    return best.getProbability() >= this.minimalConfidence ? best.getLocale() : null;
  }

  // Java: LanguageDetectorImpl#getProbabilities(CharSequence) (mutable list, as ArrayList)
  getProbabilities(text) {
    const langprob = this.detectBlock(text);
    if (langprob === null) return [];
    return this.sortProbability(langprob);
  }

  // Java: LanguageDetectorImpl#detectBlock(CharSequence)
  detectBlock(text) {
    if (text.length <= this.shortTextAlgorithm) {
      const ngrams = this.ngramExtractor.extractCountedGrams(text);
      if (ngrams.size === 0) return null;
      return this.detectBlockShortText(ngrams);
    }
    const strings = this.ngramExtractor.extractGrams(text);
    if (strings.length === 0) return null;
    return this.detectBlockLongText(strings);
  }

  // Java: LanguageDetectorImpl#detectBlockShortText(Map)
  detectBlockShortText(ngrams) {
    const prob = this.initProbability();
    const alpha = this.alpha;
    for (const [gram, count] of ngrams) {
      this.updateLangProb(prob, gram, count, alpha);
      if (normalizeProb(prob) > CONV_THRESHOLD) break; // quit the loop before all probabilities reach 0
    }
    normalizeProb(prob);
    return prob;
  }

  // Java: LanguageDetectorImpl#detectBlockLongText(List)
  detectBlockLongText(ngrams) {
    const langprob = new Float64Array(this.ngramFrequencyData.getLanguageList().length);
    const rand = new Random(this.seed ?? DEFAULT_SEED);
    for (let t = 0; t < N_TRIAL; ++t) {
      const prob = this.initProbability();
      const alpha = this.alpha + (rand.nextGaussian() * ALPHA_WIDTH);
      for (let i = 0; i < ITERATION_LIMIT; i++) {
        const r = rand.nextInt(ngrams.length);
        this.updateLangProb(prob, ngrams[r], 1, alpha);
        if (i % 5 === 0) {
          if (normalizeProb(prob) > CONV_THRESHOLD) break; // quit the loop before all probabilities reach 0
        }
      }
      for (let j = 0; j < langprob.length; ++j) langprob[j] += prob[j] / N_TRIAL;
    }
    return langprob;
  }

  // Java: LanguageDetectorImpl#initProbability()
  initProbability() {
    const n = this.ngramFrequencyData.getLanguageList().length;
    const prob = new Float64Array(n);
    for (let i = 0; i < n; ++i) prob[i] = 1.0 / n;
    return prob;
  }

  // Java: LanguageDetectorImpl#updateLangProb(double[],String,int,double)
  updateLangProb(prob, ngram, count, alpha) {
    const langProbMap = this.ngramFrequencyData.getProbabilities(ngram);
    if (langProbMap === null) return false;
    let weight = alpha / BASE_FREQ;
    if (ngram.length > 1) {
      if (this.prefixFactor !== 1.0 && ngram.charCodeAt(0) === 0x20) {
        weight *= this.prefixFactor;
      } else if (this.suffixFactor !== 1.0 && ngram.charCodeAt(ngram.length - 1) === 0x20) {
        weight *= this.suffixFactor;
      }
    }
    for (let i = 0; i < prob.length; ++i) {
      for (let amount = 0; amount < count; amount++) prob[i] *= (weight + langProbMap[i]);
    }
    return true;
  }

  // Java: LanguageDetectorImpl#sortProbability(double[])
  sortProbability(prob) {
    const list = [];
    for (let j = 0; j < prob.length; ++j) {
      const p = prob[j];
      if (p >= this.probabilityThreshold) list.push(new DetectedLanguage(this.ngramFrequencyData.getLanguage(j), p));
    }
    if (list.length >= 2) list.sort(PROBABILITY_SORTING_COMPARATOR); // stable, as Collections.sort
    return list;
  }
}

// Java: com.optimaize.langdetect.LanguageDetectorBuilder
export class LanguageDetectorBuilder {
  // Java: LanguageDetectorBuilder#LanguageDetectorBuilder(NgramExtractor)
  constructor(ngramExtractor) {
    this.ngramExtractor = ngramExtractor;
    this.alpha_ = ALPHA_DEFAULT;
    this.seed_ = null;
    this.shortTextAlgorithm_ = 50;
    this.prefixFactor_ = 1.0;
    this.suffixFactor_ = 1.0;
    this.probabilityThreshold_ = 0.1;
    this.minimalConfidence_ = 0.9999;
    this.languageProfiles = new JavaHashMap(); // Java: HashSet<LanguageProfile> (iteration order = language index order)
    this.langsAdded = new JavaHashMap(); // Java: HashSet<LdLocale>
  }

  // Java: LanguageDetectorBuilder#create(NgramExtractor)
  static create(ngramExtractor) {
    return new LanguageDetectorBuilder(ngramExtractor);
  }

  // Java: LanguageDetectorBuilder#shortTextAlgorithm(int)
  shortTextAlgorithm(shortTextAlgorithm) {
    this.shortTextAlgorithm_ = shortTextAlgorithm;
    return this;
  }

  // Java: LanguageDetectorBuilder#minimalConfidence(double)
  minimalConfidence(minimalConfidence) {
    this.minimalConfidence_ = minimalConfidence;
    return this;
  }

  // Java: LanguageDetectorBuilder#withProfile(LanguageProfile)
  withProfile(languageProfile) {
    if (this.langsAdded.containsKey(languageProfile.getLocale())) {
      throw new IllegalStateException(`A language profile for language ${languageProfile.getLocale()} was added already!`);
    }
    for (const gramLength of this.ngramExtractor.getGramLengths()) {
      if (!languageProfile.getGramLengths().includes(gramLength)) {
        throw new IllegalArgumentException(`The NgramExtractor is set to handle ${gramLength}-grams but the given language profile for ${languageProfile.getLocale()} does not support this!`);
      }
    }
    this.langsAdded.put(languageProfile.getLocale(), true);
    this.languageProfiles.put(languageProfile, true);
    return this;
  }

  // Java: LanguageDetectorBuilder#withProfiles(Iterable)
  withProfiles(languageProfiles) {
    for (const p of languageProfiles) this.withProfile(p);
    return this;
  }

  // Java: LanguageDetectorBuilder#build()
  build() {
    if (this.languageProfiles.size() === 0) throw new IllegalStateException();
    const profiles = this.languageProfiles.entrySet().map(([k]) => k);
    return new LanguageDetectorImpl(
      NgramFrequencyData.create(profiles, this.ngramExtractor.getGramLengths()),
      this.alpha_, this.seed_, this.shortTextAlgorithm_,
      this.prefixFactor_, this.suffixFactor_,
      this.probabilityThreshold_, this.minimalConfidence_,
      this.ngramExtractor,
    );
  }
}
