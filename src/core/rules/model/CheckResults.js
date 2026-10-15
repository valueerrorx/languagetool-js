// org.languagetool.CheckResults
import { Objects } from '../../../lib/java/Objects.js';

export class CheckResults {
  static FQCN = 'org.languagetool.CheckResults';

  // Java: CheckResults#CheckResults(List,List[,List])
  constructor(ruleMatches, ignoredRanges, extendedSentenceRanges = []) {
    this.sentenceRanges = [];
    this.ruleMatches = Objects.requireNonNull(ruleMatches);
    this.ignoredRanges = Objects.requireNonNull(ignoredRanges);
    this.extendedSentenceRanges = Objects.requireNonNull(extendedSentenceRanges.slice().sort((a, b) => a.compareTo(b)));
  }

  // Java: CheckResults#getRuleMatches() (lombok @Getter)
  getRuleMatches() {
    return this.ruleMatches;
  }

  // Java: CheckResults#getIgnoredRanges() (lombok @Getter)
  getIgnoredRanges() {
    return this.ignoredRanges;
  }

  // Java: CheckResults#getExtendedSentenceRanges() (lombok @Getter)
  getExtendedSentenceRanges() {
    return this.extendedSentenceRanges;
  }

  // Java: CheckResults#getSentenceRanges()
  getSentenceRanges() {
    return Object.freeze(this.sentenceRanges.slice());
  }

  // Java: CheckResults#addSentenceRanges(List)
  addSentenceRanges(sentenceRanges) {
    this.sentenceRanges.push(...sentenceRanges);
  }

  // Java: CheckResults#setRuleMatches(List)
  setRuleMatches(ruleMatches) {
    this.ruleMatches = Objects.requireNonNull(ruleMatches);
  }
}
