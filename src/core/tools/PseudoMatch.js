// Java: org.languagetool.tools.PseudoMatch
import { valueOf } from '../../lib/java/Objects.js';
import { abstractCollectionToString } from '../../lib/java/toString.js';

// Java: PseudoMatch
export class PseudoMatch {
  static FQCN = 'org.languagetool.tools.PseudoMatch';

  // Java: PseudoMatch#PseudoMatch(String,int,int)
  constructor(replacement, fromPos, toPos) {
    this.replacements = [];
    this.replacements.push(replacement);
    this.fromPos = fromPos;
    this.toPos = toPos;
  }

  // Java: PseudoMatch#getReplacements()
  getReplacements() {
    return this.replacements;
  }

  // Java: PseudoMatch#getReplacement()
  getReplacement() {
    if (this.replacements !== null && this.replacements.length > 0) {
      return this.replacements[0];
    }
    return null;
  }

  // Java: PseudoMatch#getFromPos()
  getFromPos() {
    return this.fromPos;
  }

  // Java: PseudoMatch#getToPos()
  getToPos() {
    return this.toPos;
  }

  // Java: PseudoMatch#toString()
  toString() {
    return `${valueOf(this.fromPos)}-${valueOf(this.toPos)}-${abstractCollectionToString(this.replacements)}`;
  }
}
