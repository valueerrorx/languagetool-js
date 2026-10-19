// org.languagetool.rules.SpecificIdRule
import { Objects } from '../../lib/java/Objects.js';
import { Rule } from './model/Rule.js';
import { RuleMatch } from './model/RuleMatch.js';

// Java: SpecificIdRule
export class SpecificIdRule extends Rule {
  static FQCN = 'org.languagetool.rules.SpecificIdRule';

  // Java: SpecificIdRule(String,String,boolean,Category,ITSIssueType,List)
  constructor(id, desc, isPremium, category, issueType, tags) {
    super();
    this.id = Objects.requireNonNull(id);
    this.desc = Objects.requireNonNull(desc);
    this.setPremium(isPremium);
    this.setCategory(category);
    if (issueType !== null && issueType !== undefined) {
      this.setLocQualityIssueType(issueType);
    }
    this.setTags(tags);
  }

  // Java: SpecificIdRule#getId()
  getId() {
    return this.id;
  }

  // Java: SpecificIdRule#getDescription()
  getDescription() {
    return this.desc;
  }

  // Java: SpecificIdRule#match(AnalyzedSentence)
  match() {
    return RuleMatch.EMPTY_ARRAY;
  }
}
