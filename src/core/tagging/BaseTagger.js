// Java: org.languagetool.tagging.BaseTagger (word tagger construction and helpers; getAnalyzedTokens path follows with F13)
import { Dictionary } from '../../lib/fsa/DictionaryLookup.js';
import { AnalyzedToken } from '../AnalyzedToken.js';
import { getDataBroker } from '../resources/LtStatics.js';
import { CombiningTagger } from './CombiningTagger.js';
import { ManualTagger } from './ManualTagger.js';
import { MorfologikTagger } from './MorfologikTagger.js';

const MANUAL_ADDITIONS_FILE = '/added.txt';
const CUSTOM_MANUAL_ADDITIONS_FILE = '/added_custom.txt';
const MANUAL_REMOVALS_FILE = '/removed.txt';
const CUSTOM_MANUAL_REMOVALS_FILE = '/removed_custom.txt';

const DICT_CACHE = new Map(); // Java: MorfologikSpeller#getDictionaryWithCaching(String)

// Java: BaseTagger
export class BaseTagger {
  static FQCN = 'org.languagetool.tagging.BaseTagger';

  // Java: BaseTagger#BaseTagger(String,Locale,boolean,boolean)
  constructor(filename, locale, tagLowercaseWithUppercase = true, internTags = false) {
    this.dictionaryPath = filename;
    this.locale = locale;
    this.tagLowercaseWithUppercase = tagLowercaseWithUppercase;
    if (!DICT_CACHE.has(filename)) DICT_CACHE.set(filename, Dictionary.read(getDataBroker().getFromResourceDirAsUrl(filename)));
    this.dictionary = DICT_CACHE.get(filename);
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
    let removalTagger = null;
    let stream = concat(this.getManualRemovalsFileNames());
    if (stream !== null) removalTagger = new ManualTagger(stream, internTags);
    stream = concat(this.getManualAdditionsFileNames());
    if (stream !== null) {
      const manualTagger = new ManualTagger(stream, internTags);
      return new CombiningTagger(morfologikTagger, manualTagger, removalTagger, this.overwriteWithManualTagger());
    }
    return morfologikTagger;
  }

  // Java: BaseTagger#asAnalyzedTokenListForTaggedWords(String,List)
  asAnalyzedTokenListForTaggedWords(word, taggedWords) {
    const aTokenList = [];
    for (const taggedWord of taggedWords) {
      aTokenList.push(new AnalyzedToken(word, taggedWord.getPosTag(), taggedWord.getLemma()));
    }
    return aTokenList;
  }
}

