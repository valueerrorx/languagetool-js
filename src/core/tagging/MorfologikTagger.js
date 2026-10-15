// Java: org.languagetool.tagging.MorfologikTagger (Dictionary constructor only)
import { DictionaryLookup } from '../../lib/fsa/DictionaryLookup.js';
import { TaggedWord } from './TaggedWord.js';

export class MorfologikTagger {
  static FQCN = 'org.languagetool.tagging.MorfologikTagger';

  // Java: MorfologikTagger#MorfologikTagger(Dictionary,boolean)
  constructor(dictionary, internTags = false) {
    this.dictionary = dictionary;
    this.internTags = internTags;
    this.dictLookup = null;
  }

  // Java: MorfologikTagger#tag(String)
  tag(word) {
    const result = [];
    if (this.dictLookup === null) this.dictLookup = new DictionaryLookup(this.dictionary);
    const lookup = this.dictLookup.lookup(word);
    for (const wordData of lookup) {
      let tag = wordData.getTag() === null ? null : String(wordData.getTag());
      if (this.dictionary.metadata.isFrequencyIncluded() && tag !== null && tag.length > 1) {
        tag = tag.substring(0, tag.length - 1);
      }
      const stem = wordData.getStem() === null ? null : String(wordData.getStem());
      result.push(new TaggedWord(stem, tag));
    }
    return result;
  }
}
