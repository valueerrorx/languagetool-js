// Java: org.languagetool.tagging.TaggedWord
export class TaggedWord {
  static FQCN = 'org.languagetool.tagging.TaggedWord';

  // Java: TaggedWord#TaggedWord(String,String)
  constructor(lemma, posTag) {
    this.lemma = lemma;
    this.posTag = posTag;
  }

  // Java: TaggedWord#getLemma()
  getLemma() {
    return this.lemma;
  }

  // Java: TaggedWord#getPosTag()
  getPosTag() {
    return this.posTag;
  }

  // Java: TaggedWord#toString()
  toString() {
    return `${this.lemma}/${this.posTag}`;
  }

  // Java: TaggedWord#equals(Object)
  equals(o) {
    if (this === o) return true;
    if (o === null || o === undefined || o.constructor !== this.constructor) return false;
    return this.lemma === o.lemma && this.posTag === o.posTag;
  }
}
