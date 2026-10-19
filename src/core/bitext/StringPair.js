// org.languagetool.bitext.StringPair (source/target sentence pair)
// Java: StringPair
export class StringPair {
  static FQCN = 'org.languagetool.bitext.StringPair';

  // Java: StringPair#StringPair(String,String)
  constructor(source, target) {
    this.sourceString = source;
    this.targetString = target;
  }

  // Java: StringPair#getSource()
  getSource() {
    return this.sourceString;
  }

  // Java: StringPair#getTarget()
  getTarget() {
    return this.targetString;
  }

  // Java: StringPair#toString()
  toString() {
    return `${this.sourceString} & ${this.targetString}`;
  }
}
