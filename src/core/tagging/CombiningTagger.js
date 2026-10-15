// Java: org.languagetool.tagging.CombiningTagger
export class CombiningTagger {
  static FQCN = 'org.languagetool.tagging.CombiningTagger';

  // Java: CombiningTagger#CombiningTagger(WordTagger,WordTagger,WordTagger,boolean)
  constructor(tagger1, tagger2, removalTagger, overwriteWithSecondTagger) {
    this.tagger1 = tagger1;
    this.tagger2 = tagger2;
    this.removalTagger = removalTagger;
    this.overwriteWithSecondTagger = overwriteWithSecondTagger;
  }

  // Java: CombiningTagger#tag(String)
  tag(word) {
    let result = [];
    result.push(...this.tagger2.tag(word));
    if (!(this.overwriteWithSecondTagger && result.length > 0)) {
      result.push(...this.tagger1.tag(word));
    }
    if (this.removalTagger !== null) {
      const removalTags = this.removalTagger.tag(word);
      result = result.filter((r) => !removalTags.some((x) => r.equals(x)));
    }
    return result;
  }

  // Java: CombiningTagger#getRemovalTagger()
  getRemovalTagger() {
    return this.removalTagger;
  }
}
