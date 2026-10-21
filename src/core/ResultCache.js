// org.languagetool.ResultCache (Guava caches of analysed sentences and serialised rule matches)
import { IllegalArgumentException } from '../lib/java/errors.js';
import { TimeUnit } from '../lib/java/TimeUnit.js';
import { LocalCache } from '../lib/guava/LocalCache.js';
import { InputSentence } from './InputSentence.js';
import { CacheUtils } from './tools/Cache/CacheUtils.js';

// Java: ResultCache.MatchesWeigher (rough guess so that the cacheSize is very roughly the number of average sentences)
const matchesWeigher = (sentence, matches) => 1 + Math.trunc(sentence.getAnalyzedSentence().getText().length / 75) + matches.length;
// Java: ResultCache.RemoteMatchesWeigher
const remoteMatchesWeigher = (sentence) => 1 + Math.trunc(sentence.getAnalyzedSentence().getText().length / 75);
// Java: ResultCache.SentenceWeigher
const sentenceWeigher = (sentence) => 1 + Math.trunc(sentence.getText().length / 75);

export class ResultCache {
  static FQCN = 'org.languagetool.ResultCache';

  // Java: ResultCache#ResultCache(long) / (long,long,TimeUnit)
  constructor(maxSize, expireAfter = 5, timeUnit = TimeUnit.MINUTES) {
    if (maxSize < 0) {
      throw new IllegalArgumentException(`Result cache size must be >= 0: ${maxSize}`);
    }
    const expireAfterAccessNanos = timeUnit.toNanos(expireAfter);
    const maximumWeight = Math.trunc(maxSize / 2);
    this.matchesCache = new LocalCache({ maximumWeight, weigher: matchesWeigher, expireAfterAccessNanos });
    this.remoteMatchesCache = new LocalCache({ maximumWeight, weigher: remoteMatchesWeigher, expireAfterAccessNanos });
    this.sentenceCache = new LocalCache({ maximumWeight, weigher: sentenceWeigher, expireAfterAccessNanos });
  }

  // Java: ResultCache#hitRate()
  hitRate() {
    return (this.matchesCache.stats().hitRate() + this.sentenceCache.stats().hitRate()) / 2.0;
  }

  // Java: ResultCache#requestCount()
  requestCount() {
    return this.matchesCache.stats().requestCount() + this.sentenceCache.stats().requestCount();
  }

  // Java: ResultCache#hitCount()
  hitCount() {
    return this.matchesCache.stats().hitCount() + this.sentenceCache.stats().hitCount();
  }

  // Java: ResultCache#getIfPresent(InputSentence) / (SimpleInputSentence); null when absent
  getIfPresent(key) {
    if (key instanceof InputSentence) {
      const serializedMatches = this.matchesCache.getIfPresent(key);
      return serializedMatches !== null ? serializedMatches.map((match) => CacheUtils.deserializeResultMatch(match, key.getAnalyzedSentence())) : null;
    }
    return this.sentenceCache.getIfPresent(key);
  }

  // Java: ResultCache#put(InputSentence,List) / (SimpleInputSentence,AnalyzedSentence)
  put(key, value) {
    if (key instanceof InputSentence) {
      this.matchesCache.put(key, value.map((m) => CacheUtils.serializeResultMatch(m)));
    } else {
      this.sentenceCache.put(key, value);
    }
  }

  // Java: ResultCache#getMatchesCache()
  getMatchesCache() {
    return this.matchesCache;
  }

  // Java: ResultCache#getRemoteMatchesCache()
  getRemoteMatchesCache() {
    return this.remoteMatchesCache;
  }

  // Java: ResultCache#getSentenceCache()
  getSentenceCache() {
    return this.sentenceCache;
  }
}
