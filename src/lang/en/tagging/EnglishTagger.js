// Java: org.languagetool.tagging.en.EnglishTagger
import { NullPointerException } from '../../../lib/java/errors.js';
import { Locale } from '../../../lib/java/Locale.js';
import { toLowerCase } from '../../../lib/java/strings.js';
import { AnalyzedToken } from '../../../core/AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../../../core/AnalyzedTokenReadings.js';
import { registerComponent, sharedComponent } from '../../../core/language/components.js';
import { BaseTagger } from '../../../core/tagging/BaseTagger.js';
import { isAllUppercase, isMixedCase, uppercaseFirstChar } from '../../../core/text/StringTools.js';

// Java: EnglishTagger
export class EnglishTagger extends BaseTagger {
  static FQCN = 'org.languagetool.tagging.en.EnglishTagger';

  // Java: EnglishTagger#INSTANCE
  static get INSTANCE() {
    return sharedComponent(EnglishTagger.FQCN);
  }

  // Java: EnglishTagger#EnglishTagger()
  constructor() {
    super('/en/english.dict', Locale.ENGLISH, false, true);
  }

  // Java: EnglishTagger#tag(List)
  tag(sentenceTokens) {
    const tokenReadings = [];
    let pos = 0;
    for (let word of sentenceTokens) {
      if (word === null || word === undefined) throw new NullPointerException('Cannot invoke "String.length()" because "word" is null');
      let containsTypographicApostrophe = false;
      if (word.length > 1) {
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
      l.push(...taggerTokens);
      if (!isLowercase && !isMixedCase_) {
        l.push(...this.asAnalyzedTokenListForTaggedWords(word, this.getWordTagger().tag(lowerWord)));
      }
      if (l.length === 0 && isAllUpper) {
        const firstUpper = uppercaseFirstChar(lowerWord);
        l.push(...this.asAnalyzedTokenListForTaggedWords(word, this.getWordTagger().tag(firstUpper)));
      }
      if (l.length === 0 && lowerWord.endsWith("in'")) {
        let correctedWord = word;
        if (isAllUpper) {
          correctedWord = correctedWord.substring(0, correctedWord.length - 1) + 'G';
        } else {
          correctedWord = correctedWord.substring(0, correctedWord.length - 1) + 'g';
        }
        l.push(...this.asAnalyzedTokenListForTaggedWords(word, this.getWordTagger().tag(correctedWord)));
        if (!isLowercase && !isMixedCase_) {
          l.push(...this.asAnalyzedTokenListForTaggedWords(word, this.getWordTagger().tag(toLowerCase(correctedWord))));
        }
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
}

registerComponent(EnglishTagger.FQCN, () => new EnglishTagger());
