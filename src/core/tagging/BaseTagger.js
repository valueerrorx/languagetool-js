// Java: org.languagetool.tagging.BaseTagger (implements Tagger; WordTagger is a duck-typed interface: tag(String) -> List<TaggedWord>)
import { IOException, NullPointerException, RuntimeException } from '../../lib/java/errors.js';
import { toLowerCase } from '../../lib/java/strings.js';
import { AnalyzedToken } from '../AnalyzedToken.js';
import { AnalyzedTokenReadings } from '../AnalyzedTokenReadings.js';
import { getDictionaryWithCaching } from '../rules/spelling/morfologik/MorfologikSpeller.js';
import { asString, isMixedCase, uppercaseFirstChar } from '../text/StringTools.js';
import { getDataBroker } from '../resources/LtStatics.js';
import { CombiningTagger } from './CombiningTagger.js';
import { ManualTagger } from './ManualTagger.js';
import { MorfologikTagger } from './MorfologikTagger.js';

const MANUAL_ADDITIONS_FILE = '/added.txt';
const CUSTOM_MANUAL_ADDITIONS_FILE = '/added_custom.txt';
const MANUAL_REMOVALS_FILE = '/removed.txt';
const CUSTOM_MANUAL_REMOVALS_FILE = '/removed_custom.txt';

// Java: BaseTagger
export class BaseTagger {
  static FQCN = 'org.languagetool.tagging.BaseTagger';

  // Java: BaseTagger#BaseTagger(String,Locale,boolean,boolean)
  constructor(filename, locale, tagLowercaseWithUppercase = true, internTags = false) {
    this.dictionaryPath = filename;
    this.locale = locale;
    this.tagLowercaseWithUppercase = tagLowercaseWithUppercase;
    this.dictionary = getDictionaryWithCaching(filename);
    this.wordTagger = this.initWordTagger(internTags);
  }

  // Java: BaseTagger#getManualAdditionsFileNames()
  getManualAdditionsFileNames() {
    return [this.locale.getLanguage() + MANUAL_ADDITIONS_FILE, this.locale.getLanguage() + CUSTOM_MANUAL_ADDITIONS_FILE];
  }

  // Java: BaseTagger#getManualRemovalsFileNames()
  getManualRemovalsFileNames() {
    return [this.locale.getLanguage() + MANUAL_REMOVALS_FILE, this.locale.getLanguage() + CUSTOM_MANUAL_REMOVALS_FILE];
  }

  // Java: BaseTagger#getDictionaryPath()
  getDictionaryPath() {
    return this.dictionaryPath;
  }

  // Java: BaseTagger#overwriteWithManualTagger()
  overwriteWithManualTagger() {
    return false;
  }

  // Java: BaseTagger#getWordTagger()
  getWordTagger() {
    return this.wordTagger;
  }

  // Java: BaseTagger#initWordTagger(boolean)
  initWordTagger(internTags) {
    const morfologikTagger = new MorfologikTagger(this.dictionary, internTags);
    // SequenceInputStream over the matching resources: plain byte concatenation
    const concat = (files) => {
      const parts = [];
      for (const file of files) {
        for (const url of getDataBroker().getFromResourceDirAsUrls(file)) parts.push(url.openStream());
      }
      return parts.length === 0 ? null : Buffer.concat(parts);
    };
    try {
      let removalTagger = null;
      let stream = concat(this.getManualRemovalsFileNames());
      if (stream !== null) removalTagger = new ManualTagger(stream, internTags);
      stream = concat(this.getManualAdditionsFileNames());
      if (stream !== null) {
        const manualTagger = new ManualTagger(stream, internTags);
        return new CombiningTagger(morfologikTagger, manualTagger, removalTagger, this.overwriteWithManualTagger());
      }
      return morfologikTagger;
    } catch (e) {
      if (e instanceof IOException) {
        throw new RuntimeException(`Could not load manual tagger data from [${this.getManualAdditionsFileNames().join(', ')}]`, e);
      }
      throw e;
    }
  }

  // Java: BaseTagger#getDictionary()
  getDictionary() {
    return this.dictionary;
  }

  // Java: BaseTagger#tag(List)
  tag(sentenceTokens) {
    const tokenReadings = [];
    let pos = 0;
    for (const word of sentenceTokens) {
      const l = this.getAnalyzedTokens(word);
      tokenReadings.push(new AnalyzedTokenReadings(l, pos));
      pos += word.length;
    }
    return tokenReadings;
  }

  // Java: BaseTagger#getAnalyzedTokens(String)
  getAnalyzedTokens(word) {
    const result = [];
    if (word === null || word === undefined) throw new NullPointerException('Cannot invoke "String.toLowerCase(java.util.Locale)" because "word" is null');
    const lowerWord = toLowerCase(word, this.locale);
    const isLowercase = word === lowerWord;
    const isMixedCase_ = isMixedCase(word);
    const taggerTokens = this.asAnalyzedTokenListForTaggedWords(word, this.getWordTagger().tag(word));
    const lowerTaggerTokens = !isLowercase
      ? this.asAnalyzedTokenListForTaggedWords(word, this.getWordTagger().tag(lowerWord))
      : taggerTokens;
    // normal case:
    this.addTokens(taggerTokens, result);
    // tag non-lowercase (alluppercase or startuppercase), but not mixedcase word with lowercase word tags:
    if (!isLowercase && !isMixedCase_) {
      this.addTokens(lowerTaggerTokens, result);
    }
    // tag lowercase word with startuppercase word tags:
    if (this.tagLowercaseWithUppercase && lowerTaggerTokens.length === 0 && taggerTokens.length === 0 && isLowercase) {
      const upperTaggerTokens = this.asAnalyzedTokenListForTaggedWords(word, this.getWordTagger().tag(uppercaseFirstChar(word)));
      if (upperTaggerTokens.length > 0) {
        this.addTokens(upperTaggerTokens, result);
      }
    }
    // Additional language-dependent-tagging:
    if (result.length === 0) {
      const additionalTaggedTokens = this.additionalTags(word, this.getWordTagger());
      this.addTokens(additionalTaggedTokens, result);
    }
    if (result.length === 0) {
      result.push(new AnalyzedToken(word, null, null));
    }
    return result;
  }

  // Java: BaseTagger#asAnalyzedTokenList(String,List)
  asAnalyzedTokenList(word, wdList) {
    const aTokenList = [];
    for (const wd of wdList) {
      aTokenList.push(this.asAnalyzedToken(word, wd));
    }
    return aTokenList;
  }

  // Java: BaseTagger#asAnalyzedTokenListForTaggedWords(String,List)
  asAnalyzedTokenListForTaggedWords(word, taggedWords) {
    const aTokenList = [];
    for (const taggedWord of taggedWords) {
      aTokenList.push(new AnalyzedToken(word, taggedWord.getPosTag(), taggedWord.getLemma()));
    }
    return aTokenList;
  }

  // Java: BaseTagger#asAnalyzedToken(String,WordData)
  asAnalyzedToken(word, wd) {
    let tag = asString(wd.getTag());
    // Remove frequency data from tags (if exists)
    if (this.dictionary.metadata.isFrequencyIncluded()) {
      if (tag === null) throw new NullPointerException('Cannot invoke "String.length()" because "tag" is null');
      if (tag.length > 1) tag = tag.substring(0, tag.length - 1);
    }
    return new AnalyzedToken(word, tag, asString(wd.getStem()));
  }

  // Java: BaseTagger#addTokens(List,List)
  addTokens(taggedTokens, l) {
    if (taggedTokens !== null) {
      for (const at of taggedTokens) l.push(at);
    }
  }

  // Java: BaseTagger#createNullToken(String,int)
  createNullToken(token, startPos) {
    return new AnalyzedTokenReadings(new AnalyzedToken(token, null, null), startPos);
  }

  // Java: BaseTagger#createToken(String,String)
  createToken(token, posTag) {
    return new AnalyzedToken(token, posTag, null);
  }

  // Java: BaseTagger#additionalTags(String,WordTagger)
  additionalTags() {
    return null;
  }
}

