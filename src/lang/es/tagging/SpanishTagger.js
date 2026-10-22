// Java: org.languagetool.tagging.es.SpanishTagger
import { DictionaryLookup } from '../../../lib/fsa/DictionaryLookup.js';
import { Locale } from '../../../lib/java/Locale.js';
import { Pattern } from '../../../lib/java/regex/index.js';
import { equalsIgnoreCase, javaReplaceAll, toLowerCase } from '../../../lib/java/strings.js';
import { registerComponent, sharedComponent } from '../../../core/language/components.js';
import { AnalyzedToken } from '../../../core/AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../../../core/AnalyzedTokenReadings.js';
import { BaseTagger } from '../../../core/tagging/BaseTagger.js';
import { isAllUppercase, isEmoji, isMixedCase, uppercaseFirstChar } from '../../../core/text/StringTools.js';

const CI = Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE;
const ADJ_PART_FS = Pattern.compile('VMP00SF|A[QO].[FC]S.');
const VERB = Pattern.compile('V.+');
const PREFIXES_FOR_VERBS = Pattern.compile('(auto)([^r]...+)', CI);
const PREFIXES_FOR_VERBS2 = Pattern.compile('(autor)(r...+)', CI);
const PREFIXES_FOR_ADJ = Pattern.compile('(.+)-(.+)', CI);
const ADJ = Pattern.compile('AQ.+');
const ADJ_MS = Pattern.compile('AQ.MS.|AQ.CS.|AQ.MN.');
const NO_PREFIXES_FOR_ADJ = Pattern.compile('(anti|pre|ex|pro|afro|ultra|super|súper)', CI);
// adjectives with prefix + more than two syllables
const PREFIXES_FOR_ADJECTIVES = Pattern.compile('(super)(.*[aeiouàéèíòóïü].+[aeiouàéèíòóïü].*)', CI);
const ADJ_VP = Pattern.compile('AQ.*|V.P.*');

// Java: SpanishTagger
export class SpanishTagger extends BaseTagger {
  static FQCN = 'org.languagetool.tagging.es.SpanishTagger';

  // Java: SpanishTagger#INSTANCE
  static get INSTANCE() {
    return sharedComponent(SpanishTagger.FQCN);
  }

  // Java: SpanishTagger#SpanishTagger()
  constructor() {
    super('/es/es-ES.dict', new Locale('es'));
    this.dictLookup = new DictionaryLookup(this.getDictionary()); // Java: new DictionaryLookup per call; stateless between calls
  }

  // Java: SpanishTagger#tag(List)
  tag(sentenceTokens) {
    const tokenReadings = [];
    let pos = 0;

    for (let i = 0; i < sentenceTokens.length; i++) {
      let word = sentenceTokens[i];
      let previousWord = '';
      let nextWord = '';
      if (i > 0) {
        previousWord = sentenceTokens[i - 1];
      }
      if (i < sentenceTokens.length - 1) {
        nextWord = sentenceTokens[i + 1];
      }
      let containsTypographicApostrophe = false;
      if (word.length > 1 || equalsIgnoreCase(previousWord, 'l') || equalsIgnoreCase(previousWord, 'd')
        || equalsIgnoreCase(nextWord, 's')) {
        if (word.includes('’')) {
          containsTypographicApostrophe = true;
          word = word.replaceAll('’', "'");
        }
      }
      const l = [];
      const lowerWord = toLowerCase(word, this.locale);
      const isLowercase = word === lowerWord;
      const isMixedCase_ = isMixedCase(word);
      const isAllUpper = isAllUppercase(word);
      const taggerTokens = this.asAnalyzedTokenListForTaggedWords(word, this.getWordTagger().tag(word));

      // normal case:
      this.addTokens(taggerTokens, l);
      // tag non-lowercase (alluppercase or startuppercase), but not mixedcase
      // word with lowercase word tags:
      if (!isLowercase && !isMixedCase_) {
        const lowerTaggerTokens = this.asAnalyzedTokenListForTaggedWords(word, this.getWordTagger().tag(lowerWord));
        this.addTokens(lowerTaggerTokens, l);
      }
      // tag all-uppercase proper nouns (ex. FRANCIA)
      if (isAllUpper) {
        const firstUpper = uppercaseFirstChar(lowerWord);
        const firstupperTaggerTokens = this.asAnalyzedTokenListForTaggedWords(word, this.getWordTagger().tag(firstUpper));
        this.addTokens(firstupperTaggerTokens, l);
      }

      // additional tagging with prefixes
      if (l.length === 0 && !isMixedCase_) {
        this.addTokens(this.esAdditionalTags(word), l);
      }
      // emoji
      if (l.length === 0 && isEmoji(word)) {
        l.push(new AnalyzedToken(word, '_emoji_', '_emoji_'));
      }
      if (l.length === 0) {
        l.push(new AnalyzedToken(word, null, null));
      }
      const atr = new AnalyzedTokenReadings(l, pos);
      if (containsTypographicApostrophe) {
        atr.setTypographicApostrophe();
      }
      tokenReadings.push(atr);
      pos += word.length;
    }

    return tokenReadings;
  }

  // Java: SpanishTagger#additionalTags(String,IStemmer) (IStemmer argument dropped: always the tagger's own dictionary)
  esAdditionalTags(word) {
    const dictLookup = this.dictLookup;
    const additionalTaggedTokens = [];
    // Any well-formed adverb with suffix -mente is tagged as an adverb (RG)
    // adjective o participle feminine singular + -mente
    const lowerWord = toLowerCase(word, this.locale);
    if (lowerWord.endsWith('mente')) {
      const possibleAdj = javaReplaceAll(lowerWord, '^(.+)mente$', '$1');
      const taggerTokens = this.asAnalyzedTokenList(possibleAdj, dictLookup.lookup(possibleAdj));
      for (const taggerToken of taggerTokens) {
        const posTag = taggerToken.getPOSTag();
        if (posTag !== null) {
          const m = ADJ_PART_FS.matcher(posTag);
          if (m.matches()) {
            additionalTaggedTokens.push(new AnalyzedToken(word, 'RG', lowerWord));
            return additionalTaggedTokens;
          }
        }
      }
    }
    // Any well-formed verb with prefixes is tagged as a verb copying the original tags
    let matcher = PREFIXES_FOR_VERBS.matcher(word);
    if (matcher.matches()) {
      return this.prefixedTags(word, matcher, VERB, additionalTaggedTokens, dictLookup);
    }

    matcher = PREFIXES_FOR_VERBS2.matcher(word);
    if (matcher.matches()) {
      return this.prefixedTags(word, matcher, VERB, additionalTaggedTokens, dictLookup);
    }

    // Any well-formed adejctive with prefixes is tagged as a verb copying the original tags
    matcher = PREFIXES_FOR_ADJECTIVES.matcher(word);
    if (matcher.matches()) {
      return this.prefixedTags(word, matcher, ADJ_VP, additionalTaggedTokens, dictLookup);
    }

    matcher = PREFIXES_FOR_ADJ.matcher(word);
    if (matcher.matches()) {
      const possibleAdjPrefix = toLowerCase(matcher.group(1));
      const matcher2 = NO_PREFIXES_FOR_ADJ.matcher(possibleAdjPrefix);
      if (!matcher2.matches()) {
        const possibleAdj = toLowerCase(matcher.group(2));
        let prefixMatches = false;
        let adjMatches = false;
        let newPostag = '';
        let newLemma = '';
        let taggerTokens = this.asAnalyzedTokenList(possibleAdjPrefix, dictLookup.lookup(possibleAdjPrefix));
        for (const taggerToken of taggerTokens) {
          const posTag = taggerToken.getPOSTag();
          if (posTag !== null) {
            const m = ADJ_MS.matcher(posTag);
            if (m.matches()) {
              prefixMatches = true;
              break;
            }
          }
        }
        taggerTokens = this.asAnalyzedTokenList(possibleAdj, dictLookup.lookup(possibleAdj));
        for (const taggerToken of taggerTokens) {
          const posTag = taggerToken.getPOSTag();
          if (posTag !== null) {
            const m = ADJ.matcher(posTag);
            if (m.matches()) {
              adjMatches = true;
              newPostag = posTag;
              newLemma = `${possibleAdjPrefix}-${taggerToken.getLemma()}`;
              break;
            }
          }
        }
        if (adjMatches && prefixMatches) {
          additionalTaggedTokens.push(new AnalyzedToken(word, newPostag, newLemma));
          return additionalTaggedTokens;
        }
      }
    }

    return null;
  }

  // shared body of the three prefix blocks of additionalTags (possibleVerb = group 2, lemma = group 1 + lemma)
  prefixedTags(word, matcher, tagPattern, additionalTaggedTokens, dictLookup) {
    const possibleVerb = toLowerCase(matcher.group(2));
    const taggerTokens = this.asAnalyzedTokenList(possibleVerb, dictLookup.lookup(possibleVerb));
    for (const taggerToken of taggerTokens) {
      const posTag = taggerToken.getPOSTag();
      if (posTag !== null) {
        const m = tagPattern.matcher(posTag);
        if (m.matches()) {
          const lemma = toLowerCase(matcher.group(1)).concat(taggerToken.getLemma());
          additionalTaggedTokens.push(new AnalyzedToken(word, posTag, lemma));
        }
      }
    }
    return additionalTaggedTokens;
  }
}

registerComponent(SpanishTagger.FQCN, () => new SpanishTagger());
