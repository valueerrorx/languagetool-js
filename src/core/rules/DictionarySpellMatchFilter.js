// org.languagetool.rules.DictionarySpellMatchFilter
import { substring } from '../../lib/java/strings.js';
import { JavaHashMap } from '../../lib/java/collections/JavaHashMap.js';
import { AhoCorasickDoubleArrayTrie } from '../../lib/ahocorasick.js';
import { LocalCache } from '../../lib/guava/LocalCache.js';
import { TimeUnit } from '../../lib/java/TimeUnit.js';
import { LoggerFactory } from '../../lib/slf4j/Logger.js';

const log = LoggerFactory.getLogger('org.languagetool.rules.DictionarySpellMatchFilter');

const CACHE_SIZE = 100;
const CACHE_TTL_SECONDS = 600;

// Java: DictionarySpellMatchFilter.PhraseSearchLoader#load(UserConfig)
function loadPhraseSearcher(key) {
  const searcher = new AhoCorasickDoubleArrayTrie();
  const phrases = new JavaHashMap();
  for (const phrase of key.getAcceptedPhrases()) {
    phrases.put(phrase, phrase);
  }
  searcher.build(phrases.entrySet());
  return searcher;
}

// Java: CacheBuilder.newBuilder().recordStats().maximumSize(CACHE_SIZE).expireAfterAccess(CACHE_TTL_SECONDS, SECONDS)
const phraseSearcher = new LocalCache({
  maximumWeight: CACHE_SIZE,
  weigher: () => 1,
  expireAfterAccessNanos: TimeUnit.SECONDS.toNanos(CACHE_TTL_SECONDS),
});

export class DictionarySpellMatchFilter {
  static FQCN = 'org.languagetool.rules.DictionarySpellMatchFilter';

  // Java: DictionarySpellMatchFilter#DictionarySpellMatchFilter(UserConfig)
  constructor(userConfig) {
    this.userConfig = userConfig;
  }

  // Java: DictionarySpellMatchFilter#filter(List,AnnotatedText)
  filter(ruleMatches, text) {
    const dictionary = this.userConfig.getAcceptedPhrases();
    if (dictionary.size > 0) {
      const cleanMatches = [...ruleMatches];
      try {
        const searcher = phraseSearcher.get(this.userConfig, () => loadPhraseSearcher(this.userConfig));
        const phrases = searcher.parseText(text.getPlainText());
        for (const phrase of phrases) {
          for (let i = 0; i < cleanMatches.length;) {
            const match = cleanMatches[i];
            if (match.getRule().useDictionaryBasedFilterForMatches()
                && match.getFromPos() >= phrase.begin
                && match.getToPos() <= phrase.end) {
              // remove all spelling matches that are (subsets) of accepted phrases
              cleanMatches.splice(i, 1);
            } else {
              i++;
            }
          }
        }
        return cleanMatches;
      } catch (e) {
        // Java: ExecutionException from the loader
        log.error("Couldn't set up phrase search, accepted phrases won't work.", e);
        return ruleMatches;
      }
    }
    return ruleMatches;
  }

  // Java: DictionarySpellMatchFilter#getPhrases(List,AnnotatedText)
  getPhrases(ruleMatches, text) {
    const phraseToMatches = new JavaHashMap();
    let prevToPos = -2147483648;
    let collectedMatches = [];
    let collectedTerms = [];
    for (const match of ruleMatches) {
      if (match.getRule().useDictionaryBasedFilterForMatches()) {
        const covered = substring(text.getPlainText(), match.getFromPos(), match.getToPos());
        if (match.getFromPos() === ((prevToPos + 1) | 0)) {
          const key = `${collectedTerms.join(' ')} ${covered}`;
          const l = [...collectedMatches];
          l.push(match);
          phraseToMatches.put(key, l);
        } else {
          collectedTerms = [];
          collectedMatches = [];
        }
        collectedTerms.push(covered);
        collectedMatches.push(match);
        prevToPos = match.getToPos();
      }
    }
    return phraseToMatches;
  }
}
