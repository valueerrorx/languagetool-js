// org.languagetool.rules.AbstractCheckCaseRule
import { AbstractSimpleReplaceRule2 } from './AbstractSimpleReplaceRule2.js';
import { Categories } from './model/Category.js';
import { ITSIssueType } from './model/ITSIssueType.js';

// Java: AbstractCheckCaseRule
export class AbstractCheckCaseRule extends AbstractSimpleReplaceRule2 {
  static FQCN = 'org.languagetool.rules.AbstractCheckCaseRule';

  // Java: AbstractCheckCaseRule#isCheckingCase()
  isCheckingCase() {
    return true;
  }

  // Java: AbstractCheckCaseRule(ResourceBundle,Language)
  constructor(messages, language) {
    super(messages, language);
    this.setLocQualityIssueType(ITSIssueType.Typographical);
    this.setCategory(Categories.CASING.getCategory(messages));
  }
}
