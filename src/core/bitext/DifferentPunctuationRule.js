// org.languagetool.rules.bitext.DifferentPunctuationRule
import { RuleMatch } from '../rules/model/RuleMatch.js';
import { ITSIssueType } from '../rules/model/ITSIssueType.js';
import { BitextRule } from './BitextRule.js';

// Java: DifferentPunctuationRule
export class DifferentPunctuationRule extends BitextRule {
  static FQCN = 'org.languagetool.rules.bitext.DifferentPunctuationRule';

  // Java: DifferentPunctuationRule#DifferentPunctuationRule()
  constructor() {
    super();
    this.setLocQualityIssueType(ITSIssueType.Typographical);
  }

  // Java: DifferentPunctuationRule#getDescription()
  getDescription() {
    return 'Check if translation has ending punctuation different from the source';
  }

  // Java: DifferentPunctuationRule#getId()
  getId() {
    return 'DIFFERENT_PUNCTUATION';
  }

  // Java: DifferentPunctuationRule#getMessage()
  getMessage() {
    return 'Source and target translation have different ending punctuation';
  }

  // Java: DifferentPunctuationRule#match(AnalyzedSentence,AnalyzedSentence)
  match(sourceText, targetText) {
    if (targetText === undefined) return super.match(sourceText);
    const translationTokens = targetText.getTokens();
    const sourceTokens = sourceText.getTokens();
    const lastTransTokenObj = translationTokens[translationTokens.length - 1];
    const lastTransToken = lastTransTokenObj.getToken();
    if ((lastTransToken === '.' || lastTransToken === '?' || lastTransToken === '!')
        && lastTransToken !== sourceTokens[sourceTokens.length - 1].getToken()) {
      const endPos = lastTransTokenObj.getEndPos();
      return [new RuleMatch(this, targetText, 1, endPos, this.getMessage())];
    }
    return RuleMatch.EMPTY_ARRAY;
  }
}
