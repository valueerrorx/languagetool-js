// Java: org.languagetool.tagging.MorfologikTagger
import { Dictionary, DictionaryLookup } from '../../lib/fsa/DictionaryLookup.js';import { IOException, NullPointerException, RuntimeException } from '../../lib/java/errors.js';
import { getDataBroker } from '../resources/LtStatics.js';
import { TaggedWord } from './TaggedWord.js';

export class MorfologikTagger {
  static FQCN = 'org.languagetool.tagging.MorfologikTagger';

  // Java: MorfologikTagger#MorfologikTagger(String) / (URL) / (Dictionary) / (Dictionary,boolean); the overload is chosen by static type
  constructor(source, internTags = false) {
    if (source === null || source === undefined) throw new NullPointerException();
    this.internTags = false;
    this.dictionary = null;
    this.dictUrl = null;
    if (typeof source === 'string') {
      this.dictUrl = getDataBroker().getFromResourceDirAsUrl(source);
      if (this.dictUrl === null || this.dictUrl === undefined) throw new NullPointerException();
    } else if (typeof source.getPath === 'function') {
      this.dictUrl = source;
    } else {
      this.dictionary = source;
      this.internTags = internTags;
    }
  }

  // Java: MorfologikTagger#getDictionary()
  getDictionary() {
    if (this.dictionary === null) {
      this.dictionary = Dictionary.read(this.dictUrl);
    }
    return this.dictionary;
  }

  // Java: MorfologikTagger#getInternTags()
  getInternTags() {
    return this.internTags;
  }

  // Java: MorfologikTagger#setInternTags(boolean)
  setInternTags(enabled) {
    this.internTags = enabled;
  }

  // Java: MorfologikTagger#tag(String)
  tag(word) {
    const result = [];
    try {
      const dictLookup = this.dictLookupFor(this.getDictionary());
      const lookup = dictLookup.lookup(word);
      for (const wordData of lookup) {
        let tag = wordData.getTag() === null ? null : String(wordData.getTag());
        // Remove frequency data from tags (if exists)
        if (this.dictionary.metadata.isFrequencyIncluded() && tag !== null && tag.length > 1) {
          tag = tag.substring(0, tag.length - 1);
        }
        const stem = wordData.getStem() === null ? null : String(wordData.getStem());
        result.push(new TaggedWord(stem, tag));
      }
    } catch (e) {
      if (e instanceof IOException) throw new RuntimeException(`Could not tag word '${word}'`, e);
      throw e;
    }
    return result;
  }

  // Java: new DictionaryLookup(Dictionary), reused per dictionary (the lookup is stateless between calls)
  dictLookupFor(dictionary) {
    if (this.dictLookup === undefined || this.dictLookupDict !== dictionary) {
      this.dictLookup = new DictionaryLookup(dictionary);
      this.dictLookupDict = dictionary;
    }
    return this.dictLookup;
  }
}
