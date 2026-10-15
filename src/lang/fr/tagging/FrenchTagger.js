// Java: org.languagetool.tagging.fr.FrenchTagger (tag(List) path; the rest of the tagger API follows with F13)
import { Locale } from '../../../lib/java/Locale.js';
import { Pattern } from '../../../lib/java/regex/index.js';
import { toLowerCase } from '../../../lib/java/strings.js';
import { AnalyzedToken } from '../../../core/AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../../../core/AnalyzedTokenReadings.js';
import { ChunkTag } from '../../../core/chunking/ChunkTag.js';
import { registerComponent } from '../../../core/language/components.js';
import { BaseTagger } from '../../../core/tagging/BaseTagger.js';
import { convertToTitleCaseIteratingChars, isAllUppercase, isCapitalizedWord, isEmoji } from '../../../core/text/StringTools.js';

const VERB = Pattern.compile('V .+');
const PREFIXES_FOR_VERBS = Pattern.compile(
  '(auto|auto-|re-|sur-)([^-].*[aeiouêàéèíòóïü].+[aeiouêàéèíòóïü].*)', Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
const NOUN_ADJ = Pattern.compile('[NJ] .+|V ppa.*');
const PREFIXES_NOUN_ADJ = Pattern.compile(
  '(post-|sur-|mini-|méga-|demi-|péri-|anti-|géo-|nord-|sud-|néo-|méga-|ultra-|pro-|inter-|micro-|macro-|sous-|haut-|auto-|ré-|pré-|super-|vice-|hyper-|proto-|grand-|pseudo-)(.+)',
  Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
const PREFIXES_FOR_NOUN_ADJ = Pattern.compile(
  '(mini|méga)([^-].*[aeiouêàéèíòóïü].+[aeiouêàéèíòóïü].*)', Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);

const AMBIGOUS_TOKENS = ['-Le', '-Les', '-La', '-Elle', '-Elles', '-On', '-Tu', '-Vous', '-Il', '-Ils', '-Ce'];

// Java: FrenchTagger
export class FrenchTagger extends BaseTagger {
  static FQCN = 'org.languagetool.tagging.fr.FrenchTagger';

  // Java: FrenchTagger#FrenchTagger()
  constructor() {
    super('/fr/french.dict', Locale.FRENCH, false);
  }

  // Java: FrenchTagger#overwriteWithManualTagger()
  overwriteWithManualTagger() {
    return false;
  }

  // Java: FrenchTagger#tag(List)
  tag(sentenceTokens) {
    const tokenReadings = [];
    let pos = 0;
    for (let word of sentenceTokens) {
      let containsTypewriterApostrophe = false;
      let containsTypographicApostrophe = false;
      if (word.length > 1) {
        if (word.includes("'")) {
          containsTypewriterApostrophe = true;
        }
        if (word.includes('’')) {
          containsTypographicApostrophe = true;
          word = word.replaceAll('’', "'");
        }
      }
      let l = this.tagWord(word, word);
      if (l.length === 0 && toLowerCase(word).includes('oe')) {
        l = this.tagWord(word.replaceAll('oe', 'œ').replaceAll('OE', 'Œ'), word);
      }
      if (l.length === 0 && isEmoji(word)) {
        l.push(new AnalyzedToken(word, '_emoji_', '_emoji_'));
      }
      if (l.length === 0) {
        l.push(new AnalyzedToken(word, null, null));
      }
      const atr = new AnalyzedTokenReadings(l, pos);
      if (containsTypewriterApostrophe) {
        atr.setChunkTags([new ChunkTag('containsTypewriterApostrophe')]);
      }
      if (containsTypographicApostrophe) {
        atr.setChunkTags([new ChunkTag('containsTypographicApostrophe')]);
      }
      tokenReadings.push(atr);
      pos += word.length;
    }
    return tokenReadings;
  }

  // Java: FrenchTagger#tagWord(String,String)
  tagWord(word, originalWord) {
    const l = [];
    const lowerWord = toLowerCase(word, this.locale);
    const isStartUpper = isCapitalizedWord(word);
    const isAllUpper = isAllUppercase(word);
    const isHyphenatedTitleCase = !AMBIGOUS_TOKENS.includes(originalWord)
      && originalWord.includes('-') && originalWord === convertToTitleCaseIteratingChars(lowerWord);
    l.push(...this.asAnalyzedTokenListForTaggedWords(originalWord, this.getWordTagger().tag(word)));
    if (isAllUpper || isStartUpper || isHyphenatedTitleCase) {
      l.push(...this.asAnalyzedTokenListForTaggedWords(originalWord, this.getWordTagger().tag(lowerWord)));
    }
    if (l.length === 0 && isAllUpper) {
      const firstUpper = convertToTitleCaseIteratingChars(lowerWord);
      l.push(...this.asAnalyzedTokenListForTaggedWords(originalWord, this.getWordTagger().tag(firstUpper)));
    }
    if (l.length === 0) {
      const add = this.additionalTags(word);
      if (add !== null) l.push(...add);
    }
    return l;
  }

  // Java: FrenchTagger#additionalTags(String)
  additionalTags(word) {
    let additionalTaggedTokens = [];
    let matcher = PREFIXES_FOR_VERBS.matcher(word);
    if (matcher.matches()) {
      const possibleVerb = toLowerCase(matcher.group(2));
      const taggerTokens = this.asAnalyzedTokenListForTaggedWords(word, this.getWordTagger().tag(possibleVerb));
      for (const taggerToken of taggerTokens) {
        const posTag = taggerToken.getPOSTag();
        if (posTag !== null) {
          if (VERB.matcher(posTag).matches()) {
            const lemma = toLowerCase(matcher.group(1)) + taggerToken.getLemma();
            additionalTaggedTokens.push(new AnalyzedToken(word, posTag, lemma));
          }
        }
      }
      if (additionalTaggedTokens.length > 0) {
        return additionalTaggedTokens;
      }
    }
    matcher = PREFIXES_FOR_NOUN_ADJ.matcher(word);
    if (matcher.matches()) {
      const possibleNoun = toLowerCase(matcher.group(2));
      const taggerTokens = this.asAnalyzedTokenListForTaggedWords(word, this.getWordTagger().tag(possibleNoun));
      for (const taggerToken of taggerTokens) {
        const posTag = taggerToken.getPOSTag();
        if (posTag !== null) {
          if (NOUN_ADJ.matcher(posTag).matches()) {
            const lemma = toLowerCase(matcher.group(1)) + taggerToken.getLemma();
            additionalTaggedTokens.push(new AnalyzedToken(word, posTag, lemma));
          }
        }
      }
      if (additionalTaggedTokens.length > 0) {
        return additionalTaggedTokens;
      }
    }
    matcher = PREFIXES_NOUN_ADJ.matcher(word);
    if (matcher.matches()) {
      const possibleNoun = toLowerCase(matcher.group(2));
      let taggerTokens = this.asAnalyzedTokenListForTaggedWords(word, this.getWordTagger().tag(possibleNoun));
      for (const taggerToken of taggerTokens) {
        const posTag = taggerToken.getPOSTag();
        if (posTag !== null) {
          if (NOUN_ADJ.matcher(posTag).matches()) {
            const lemma = toLowerCase(matcher.group(1)) + taggerToken.getLemma();
            additionalTaggedTokens.push(new AnalyzedToken(word, posTag, lemma));
          }
        }
      }
      if (additionalTaggedTokens.length === 0) {
        taggerTokens = this.asAnalyzedTokenListForTaggedWords(word, this.getWordTagger().tag(toLowerCase(possibleNoun)));
        for (const taggerToken of taggerTokens) {
          const posTag = taggerToken.getPOSTag();
          if (posTag !== null) {
            if (NOUN_ADJ.matcher(posTag).matches()) {
              const lemma = toLowerCase(matcher.group(1)) + taggerToken.getLemma();
              additionalTaggedTokens.push(new AnalyzedToken(word, posTag, lemma));
            }
          }
        }
      }
      return additionalTaggedTokens;
    }
    additionalTaggedTokens = null;
    return additionalTaggedTokens;
  }
}

registerComponent(FrenchTagger.FQCN, () => new FrenchTagger());
