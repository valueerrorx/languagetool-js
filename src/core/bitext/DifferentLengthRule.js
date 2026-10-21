// org.languagetool.rules.bitext.DifferentLengthRule
import { RuleMatch } from '../rules/model/RuleMatch.js';
import { ITSIssueType } from '../rules/model/ITSIssueType.js';
import { BitextRule } from './BitextRule.js';

const MAX_SKEW = 250;
const MIN_SKEW = 30;

// Java: DifferentLengthRule
export class DifferentLengthRule extends BitextRule {
  static FQCN = 'org.languagetool.rules.bitext.DifferentLengthRule';

  // Java: DifferentLengthRule#DifferentLengthRule()
  constructor() {
    super();
    this.setLocQualityIssueType(ITSIssueType.Length);
  }

  // Java: DifferentLengthRule#getDescription()
  getDescription() {
    return 'Check if translation length is similar to source length';
  }

  // Java: DifferentLengthRule#getId()
  getId() {
    return 'TRANSLATION_LENGTH';
  }

  // Java: DifferentLengthRule#getMessage()
  getMessage() {
    return 'Source and target translation lengths are very different';
  }

  // Java: DifferentLengthRule#match(AnalyzedSentence,AnalyzedSentence)
  match(sourceText, targetText) {
    if (targetText === undefined) return super.match(sourceText);
    // DEV-014: empty target text: nothing to check (Java throws fromPos 0 / toPos 0)
    if (targetText.getText().length === 0 || targetText.getTokens().length === 0) return RuleMatch.EMPTY_ARRAY;
    if (this.isLengthDifferent(sourceText.getText(), targetText.getText())) {
      const tokens = targetText.getTokens();
      const endPos = tokens[tokens.length - 1].getStartPos() + tokens[tokens.length - 1].getToken().length;
      return [new RuleMatch(this, targetText, 0, endPos, this.getMessage())];
    }
    return RuleMatch.EMPTY_ARRAY;
  }

  // Java: DifferentLengthRule#isLengthDifferent(String,String)
  isLengthDifferent(src, trg) {
    const skew = (src.length / trg.length) * 100.00;
    return skew > MAX_SKEW || skew < MIN_SKEW;
  }
}
