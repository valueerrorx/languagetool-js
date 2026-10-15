// org.languagetool.rules.ITSIssueType
import { JavaEnum } from '../../../lib/java/JavaEnum.js';
import { IllegalArgumentException } from '../../../lib/java/errors.js';
import { toLowerCase } from '../../../lib/java/strings.js';
import { Locale } from '../../../lib/java/Locale.js';

export class ITSIssueType extends JavaEnum {
  static FQCN = 'org.languagetool.rules.ITSIssueType';

  // Java: ITSIssueType#ITSIssueType() / ITSIssueType(String)
  constructor(enumName, ordinal, name = enumName) {
    super(enumName, ordinal);
    this.itsName = name;
  }

  // Java: ITSIssueType#getIssueType(String)
  static getIssueType(name) {
    for (const issueType of ITSIssueType.values()) {
      if (issueType.toString() === name) {
        return issueType;
      }
    }
    throw new IllegalArgumentException(`No IssueType found for name '${name}'. Valid values: [${ITSIssueType.values().map((v) => v.toString()).join(', ')}]`);
  }

  // Java: ITSIssueType#toString()
  toString() {
    return toLowerCase(this.itsName, Locale.ENGLISH);
  }
}
[['Terminology'], ['Mistranslation'], ['Omission'], ['Untranslated'], ['Addition'], ['Duplication'], ['Inconsistency'], ['Grammar'],
  ['Legal'], ['Register'], ['LocaleSpecificContent', 'locale-specific-content'], ['LocaleViolation', 'locale-violation'],
  ['Style'], ['Characters'], ['Misspelling'], ['Typographical'], ['Formatting'], ['InconsistentEntities', 'inconsistent-entities'],
  ['Numbers'], ['Markup'], ['PatternProblem', 'pattern-problem'], ['Whitespace'], ['Internationalization'], ['Length'],
  ['NonConformance', 'non-conformance'], ['Uncategorized'], ['Other']]
  .forEach(([n, s], i) => { ITSIssueType[n] = new ITSIssueType(n, i, s); });
