// org.languagetool.rules.SynonymsData
// Java: SynonymsData (package-private constructor, used by AbstractRepeatedWordsRule#loadWords)
export class SynonymsData {
  static FQCN = 'org.languagetool.rules.SynonymsData';

  // Java: SynonymsData(List,String,String)
  constructor(synonyms, postag, chunk) {
    this.synonyms = synonyms;
    this.postag = postag;
    this.chunk = chunk;
  }

  // Java: SynonymsData#getSynonyms()
  getSynonyms() {
    return this.synonyms;
  }

  // Java: SynonymsData#getPostag()
  getPostag() {
    return this.postag;
  }

  // Java: SynonymsData#getChunk()
  getChunk() {
    return this.chunk;
  }
}
