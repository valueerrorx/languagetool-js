// org.languagetool.rules.bitext.IncorrectBitextExample
import { unmodifiableList } from '../../lib/java/collections/Collections.js';
import { Objects } from '../../lib/java/Objects.js';
import { abstractCollectionToString } from '../../lib/java/toString.js';

// Java: IncorrectBitextExample
export class IncorrectBitextExample {
  static FQCN = 'org.languagetool.rules.bitext.IncorrectBitextExample';

  // Java: IncorrectBitextExample#IncorrectBitextExample(StringPair[,List])
  constructor(example, corrections = []) {
    this.example = Objects.requireNonNull(example);
    this.corrections = unmodifiableList(corrections);
  }

  // Java: IncorrectBitextExample#getExample()
  getExample() {
    return this.example;
  }

  // Java: IncorrectBitextExample#getCorrections()
  getCorrections() {
    return this.corrections;
  }

  // Java: IncorrectBitextExample#toString()
  toString() {
    return `${this.example.getSource()}/ ${this.example.getTarget()} ${abstractCollectionToString(this.corrections)}`;
  }
}
