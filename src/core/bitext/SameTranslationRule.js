// org.languagetool.rules.bitext.SameTranslationRule
import { RuleMatch } from '../rules/model/RuleMatch.js';
import { ITSIssueType } from '../rules/model/ITSIssueType.js';
import { BitextRule } from './BitextRule.js';

// Java: SameTranslationRule
export class SameTranslationRule extends BitextRule {
  static FQCN = 'org.languagetool.rules.bitext.SameTranslationRule';

  // Java: SameTranslationRule#SameTranslationRule()
  constructor() {
    super();
    this.setLocQualityIssueType(ITSIssueType.Untranslated);
  }

  // Java: SameTranslationRule#getDescription()
  getDescription() {
    return 'Check if translation is the same as source';
  }

  // Java: SameTranslationRule#getId()
  getId() {
    return 'SAME_TRANSLATION';
  }

  // Java: SameTranslationRule#getMessage()
  getMessage() {
    return 'Source and target translation are the same';
  }

  // Java: SameTranslationRule#match(AnalyzedSentence,AnalyzedSentence)
  match(sourceText, targetText) {
    if (targetText === undefined) return super.match(sourceText);
    // This is just heuristics, checking word count
    if (sourceText.getTokensWithoutWhitespace().length > 3 && sourceText.getText() === targetText.getText()) {
      const tokens = targetText.getTokens();
      const endPos = tokens[tokens.length - 1].getEndPos();
      return [new RuleMatch(this, targetText, 1, endPos, this.getMessage())];
    }
    return RuleMatch.EMPTY_ARRAY;
  }
}
